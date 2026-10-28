import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://yusuftaha.space/api';
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
let onSessionExpired: (() => void) | undefined;
export const setSessionExpiredHandler = (handler?: () => void) => { onSessionExpired = handler; };

async function request(path: string, options: RequestInit = {}, authenticated = true) {
  const token = authenticated ? await AsyncStorage.getItem('@auth_token') : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && authenticated && token === await AsyncStorage.getItem('@auth_token')) onSessionExpired?.();
      throw new ApiError(data.message || 'İşlem tamamlanamadı.', response.status);
    }
    return data;
  } finally { clearTimeout(timeout); }
}
const post = (path: string, data: unknown, authenticated = true) => request(path, { method: 'POST', body: JSON.stringify(data) }, authenticated);

export const registerUser = (data: any) => post('/auth/register', data, false);
export const loginUser = (data: any) => post('/auth/login', data, false);
export const getCurrentUser = () => request('/auth/me');
export const logoutUser = () => post('/auth/logout', {});
export const getStudentSessions = (userId: string, page = 1, limit = 10) => request(`/student/sessions/${encodeURIComponent(userId)}?page=${page}&limit=${limit}`);
export const saveStudentSession = (data: any) => post('/student/sessions', data);
export const getTeacherStudents = (teacherId: string) => request(`/teacher/students/${encodeURIComponent(teacherId)}`);
export const addTeacherStudent = (data: any) => post('/teacher/students', data);
export const getAllStudents = (page = 1, limit = 10) => request(`/teacher/all-students?page=${page}&limit=${limit}`);
export const addStudentByTeacher = (data: { name: string; surname: string; dob: string }) => post('/teacher/add-student', data);
export const createStudentActivation = (userId: string) => post(`/teacher/students/${encodeURIComponent(userId)}/activation`, {});
export const getTeacherCompetitions = (teacherId: string) => request(`/teacher/competitions/${encodeURIComponent(teacherId)}`);
export const saveTeacherCompetition = (data: any) => post('/teacher/competitions', data);
