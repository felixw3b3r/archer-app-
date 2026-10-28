const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const mongoose = require('mongoose');
const { createApp } = require('../src/server');
const { hashPassword, verifyPassword, exactName } = require('../src/security');
const User = require('../src/models/User');
const Session = require('../src/models/Session');
const TeacherData = require('../src/models/TeacherData');

let mongod, databasePath, server, base, teacher, student, secondStudent;
const keys = ['TEACH', 'RETRY', 'RACED'].map(key => ({ key, isUsed: false }));
async function request(url, { token, body, method } = {}) {
  const response = await fetch(base + url, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
async function register(name, role = 'student', key) {
  return request('/api/auth/register', { body: { name, surname: 'Test', dob: '01/01/2000', password: 'pass1234', role, teacherKey: key } });
}
function training(owner, id = 'training_fixture') {
  return { userId: owner._id, clientId: id, date: 'Test date', totalScore: 9, totalSeries: 1, arrowsPerSeries: 5, seriesScores: [9] };
}

before(async () => {
  // Isolated mongod: never connect to or clear the developer's existing database.
  databasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'archer-tests-'));
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  mongod = spawn(process.env.MONGOD_BINARY || 'mongod', ['--dbpath', databasePath, '--port', String(port), '--bind_ip', '127.0.0.1'], { windowsHide: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Temporary MongoDB did not start.')), 30000);
    mongod.once('error', error => { clearTimeout(timer); reject(error); });
    mongod.once('exit', code => { clearTimeout(timer); reject(new Error(`Temporary MongoDB exited: ${code}`)); });
    mongod.stdout.on('data', data => {
      if (data.toString().includes('Waiting for connections')) { clearTimeout(timer); resolve(); }
    });
    mongod.stderr.resume();
  });
  await mongoose.connect(`mongodb://127.0.0.1:${port}/archer_test`);
  const app = createApp({ readKeys: () => keys });
  await Promise.all(mongoose.modelNames().map(name => mongoose.model(name).init()));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  teacher = (await register('Teacher', 'teacher', 'TEACH')).body;
  student = (await register('Student')).body;
  secondStudent = (await register('Second')).body;
  assert.ok(teacher.token);
  assert.ok(student.token);
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongod && mongod.exitCode === null) {
    const stopped = once(mongod, 'exit');
    mongod.kill();
    await stopped;
  }
  if (databasePath) {
    const resolved = path.resolve(databasePath);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('archer-tests-'));
    await fs.rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

test('hashes are salted and only the correct password verifies', async () => {
  const first = await hashPassword('pass1234');
  assert.notEqual(first, await hashPassword('pass1234'));
  assert.equal(await verifyPassword('pass1234', first), true);
  assert.equal(await verifyPassword('wrong', first), false);
  assert.equal(exactName('Ali.*').test('Alix'), false);
  assert.equal(exactName('Ali.*').test('Ali.*'), true);
});

test('anonymous and student callers cannot access teacher APIs or another student', async () => {
  assert.equal((await request('/api/teacher/all-students')).status, 401);
  assert.equal((await request('/api/teacher/all-students', { token: student.token })).status, 403);
  assert.equal((await request(`/api/student/sessions/${secondStudent._id}`, { token: student.token })).status, 403);
  assert.equal((await request('/api/student/sessions', { token: student.token, body: training(secondStudent) })).status, 403);
  assert.equal((await request(`/api/teacher/competitions/${student._id}`, { token: teacher.token })).status, 403);
  assert.equal((await request('/api/teacher/add-student', { token: student.token, body: { name: 'Fake' } })).status, 403);
});

test('credentials are hashed and omitted from registration, login, me and lists', async () => {
  const dbUser = await User.findById(student._id).select('+password +passwordHash');
  assert.equal(dbUser.password, undefined);
  assert.ok(dbUser.passwordHash.startsWith('scrypt:'));
  const login = await request('/api/auth/login', { body: { name: 'Student', surname: 'Test', password: 'pass1234', role: 'student' } });
  const me = await request('/api/auth/me', { token: student.token });
  const list = await request('/api/teacher/all-students', { token: teacher.token });
  for (const user of [student, teacher, login.body, me.body, ...list.body.students]) {
    for (const field of ['password', 'passwordHash', 'teacherKey', 'activationHash']) assert.equal(field in user, false);
  }
  assert.equal(me.body.needsActivation, false);
  const session = await Session.findOne({ userId: student._id });
  assert.notEqual(session.tokenHash, student.token);
});

test('legacy passwords still work and are migrated after verification', async () => {
  const legacy = await User.create({ name: 'Legacy', surname: 'Test', dob: '01/01/2000', role: 'student', password: 'old' });
  const body = { name: 'Legacy', surname: 'Test', role: 'student', password: 'bad' };
  assert.equal((await request('/api/auth/login', { body })).status, 401);
  const login = await request('/api/auth/login', { body: { ...body, password: 'old' } });
  assert.equal(login.status, 200);
  const saved = await User.findById(legacy._id).select('+password +passwordHash');
  assert.equal(saved.password, undefined);
  assert.equal(await verifyPassword('old', saved.passwordHash), true);
  assert.equal((await request('/api/auth/login', { body: { ...body, password: 'old' } })).status, 200);
  assert.equal((await request('/api/auth/login', { body: { ...body, password: 'old', role: 'teacher' } })).status, 403);
  assert.equal((await request('/api/auth/login', { body: { name: 'Teacher', surname: 'Test', password: 'pass1234', role: 'student' } })).status, 200);
});

test('teacher-created accounts need a single-use code, including existing passwordless accounts', async () => {
  const created = await request('/api/teacher/add-student', { token: teacher.token, body: { name: 'Invited', surname: 'Test', dob: '01/01/2000' } });
  assert.equal(created.status, 201);
  const body = { name: 'Invited', surname: 'Test', role: 'student', password: 'chosen1234' };
  assert.equal((await request('/api/auth/login', { body })).status, 403);
  const claim = await request('/api/auth/login', { body: { ...body, activationCode: created.body.activationCode } });
  assert.equal(claim.status, 200);
  assert.equal((await request('/api/auth/login', { body: { ...body, password: 'attacker', activationCode: created.body.activationCode } })).status, 401);
  assert.equal((await request(`/api/teacher/students/${created.body._id}/activation`, { token: teacher.token, body: {} })).status, 409);
  const legacy = await User.create({ name: 'Unclaimed', surname: 'Test', dob: '01/01/2000', role: 'student' });
  const code = await request(`/api/teacher/students/${legacy._id}/activation`, { token: teacher.token, body: {} });
  assert.equal(code.status, 200);
  assert.equal((await request('/api/auth/login', { body: { ...body, name: 'Unclaimed', activationCode: code.body.activationCode } })).status, 200);
});

test('failed registration does not consume a teacher key; concurrent reuse permits only one teacher', async () => {
  assert.equal((await register('Student', 'teacher', 'RETRY')).status, 400);
  assert.equal((await register('NewTeacher', 'teacher', 'RETRY')).status, 201);
  assert.equal((await register('AnotherTeacher', 'teacher', 'RETRY')).status, 400);
  const results = await Promise.all([register('RaceOne', 'teacher', 'RACED'), register('RaceTwo', 'teacher', 'RACED')]);
  assert.equal(results.filter(result => result.status === 201).length, 1);
  assert.equal(await User.countDocuments({ teacherKey: 'RACED' }), 1);
  assert.ok(keys.every(key => !key.isUsed));
});

test('training retries and edits update one record and validate score totals', async () => {
  const first = await request('/api/student/sessions', { token: student.token, body: training(student) });
  const updated = await request('/api/student/sessions', { token: student.token, body: { ...training(student), totalScore: 12, seriesScores: [12] } });
  assert.equal(first.status, 201);
  assert.equal(updated.body._id, first.body._id);
  const history = await request(`/api/student/sessions/${student._id}`, { token: student.token });
  assert.equal(history.body.totalRecords, 1);
  assert.equal(history.body.sessions[0].totalScore, 12);
  assert.equal((await request('/api/student/sessions', { token: student.token, body: { ...training(student), totalScore: 100 } })).status, 400);
  assert.equal((await request(`/api/student/sessions/${student._id}?limit=-1`, { token: student.token })).status, 400);
});

test('competition results use student IDs and appear in combined paginated history without duplicates', async () => {
  const body = { teacherId: teacher._id, clientId: 'competition_fixture', date: 'Competition date', rounds: '1', arrowsPerRound: '5', results: [
    { studentId: student._id, studentName: 'Incorrect name', totalScore: 15, seriesScores: [15], duration: '1dk' },
    { studentId: secondStudent._id, totalScore: 0, seriesScores: [], duration: '0dk' },
  ] };
  const first = await request('/api/teacher/competitions', { token: teacher.token, body });
  assert.equal(first.status, 201);
  assert.equal(first.body.results[0].studentName, 'Student Test');
  assert.equal((await request('/api/teacher/competitions', { token: teacher.token, body })).body._id, first.body._id);
  assert.equal(await TeacherData.countDocuments({ clientId: body.clientId }), 1);
  const firstPage = await request(`/api/student/sessions/${student._id}?limit=1`, { token: student.token });
  const secondPage = await request(`/api/student/sessions/${student._id}?limit=1&page=2`, { token: teacher.token });
  assert.equal(firstPage.body.totalRecords, 2);
  assert.equal(firstPage.body.sessions[0].type, 'competition');
  assert.equal(secondPage.body.sessions[0].type, 'training');
  const teacherHistory = await request(`/api/student/sessions/${teacher._id}`, { token: teacher.token });
  assert.equal(teacherHistory.body.totalRecords, 0);
});

test('expired and logged-out sessions are rejected', async () => {
  const body = { name: 'Student', surname: 'Test', role: 'student', password: 'pass1234' };
  const login = await request('/api/auth/login', { body });
  assert.equal((await request('/api/auth/logout', { token: login.body.token, body: {} })).status, 200);
  assert.equal((await request('/api/auth/me', { token: login.body.token })).status, 401);
  await Session.updateMany({ userId: secondStudent._id }, { $set: { expiresAt: new Date(0) } });
  assert.equal((await request('/api/auth/me', { token: secondStudent.token })).status, 401);
});
