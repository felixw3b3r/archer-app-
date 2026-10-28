import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveStudentSession, saveTeacherCompetition } from './api';

type Kind = 'training' | 'competition';
export type CachedRecord = { id?: string; _id?: string; clientId?: string; pending?: boolean; revision?: string; [key: string]: any };
const locks = new Map<string, Promise<unknown>>();
const syncing = new Map<string, Promise<void>>();
const keyFor = (kind: Kind, userId: string) => `@${kind}_history:${userId}`;
export const newRecordId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
const recordKey = (record: CachedRecord) => record.clientId || record._id || record.id;

// Serialize storage read-modify-write operations, including replies to older requests.
function locked<T>(key: string, action: () => Promise<T>): Promise<T> {
  const task = (locks.get(key) || Promise.resolve()).catch(() => {}).then(action);
  locks.set(key, task);
  void task.finally(() => { if (locks.get(key) === task) locks.delete(key); }).catch(() => {});
  return task;
}
async function read(key: string): Promise<CachedRecord[]> {
  return JSON.parse(await AsyncStorage.getItem(key) || '[]');
}
export const readRecords = (kind: Kind, userId: string) => locked(keyFor(kind, userId), () => read(keyFor(kind, userId)));

export async function queueRecord(kind: Kind, userId: string, record: CachedRecord) {
  const key = keyFor(kind, userId);
  const pending = { ...record, clientId: record.clientId || newRecordId(), pending: true, revision: newRecordId() };
  await locked(key, async () => {
    const records = await read(key);
    await AsyncStorage.setItem(key, JSON.stringify([pending, ...records.filter(item => recordKey(item) !== recordKey(pending))]));
  });
  return pending;
}

export function syncRecords(kind: Kind, userId: string): Promise<void> {
  const key = keyFor(kind, userId);
  const active = syncing.get(key);
  if (active) return active;
  const task = (async () => {
    while (true) {
      const pending = (await readRecords(kind, userId)).find(record => record.pending);
      if (!pending) return;
      const user = JSON.parse(await AsyncStorage.getItem('@user_data') || 'null');
      if (user?._id !== userId) return;
      try {
        const { pending: ignoredPending, revision, id, _id, ...payload } = pending;
        const saved = await (kind === 'training' ? saveStudentSession(payload) : saveTeacherCompetition(payload));
        await locked(key, async () => {
          const records = await read(key);
          const updated = records.map(record => recordKey(record) === recordKey(pending) && record.revision === revision
            ? { ...saved, id: saved._id, pending: false } : record);
          await AsyncStorage.setItem(key, JSON.stringify(updated));
        });
      } catch {
        // Keep the durable queue intact for the next save, refresh, or app launch.
        return;
      }
    }
  })();
  syncing.set(key, task);
  void task.finally(() => { if (syncing.get(key) === task) syncing.delete(key); }).catch(() => {});
  return task;
}

export async function mergeRecords(kind: Kind, userId: string, incoming: CachedRecord[]) {
  const key = keyFor(kind, userId);
  return locked(key, async () => {
    const existing = await read(key);
    const merged = new Map(existing.map(item => [recordKey(item), item]));
    for (const item of incoming) {
      if (!merged.get(recordKey(item))?.pending) merged.set(recordKey(item), { ...item, id: item.id || item._id, pending: false });
    }
    const records = [...merged.values()].sort((a, b) => String(b.createdAt || b.id || '').localeCompare(String(a.createdAt || a.id || '')));
    await AsyncStorage.setItem(key, JSON.stringify(records));
    return records;
  });
}

// Only migrate records with a recorded owner; ambiguous legacy cache is kept untouched.
export async function migrateOwnedHistory(userId: string) {
  const raw = await AsyncStorage.getItem('@training_history');
  if (raw) await mergeRecords('training', userId, JSON.parse(raw).filter((record: CachedRecord) => record.userId === userId));
}
