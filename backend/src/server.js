const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
const { digest, newToken, exactName, validPassword, hashPassword, verifyPassword, publicUser } = require('./security');

const credentials = '+password +passwordHash +activationHash +activationExpiresAt';
const fail = (status, message) => Object.assign(new Error(message), { status });
const route = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const pagination = query => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw fail(400, 'Geçersiz sayfalama.');
  }
  return { page, limit, skip: (page - 1) * limit };
};
function identity(body) {
  const { name, surname, dob } = body;
  if (![name, surname, dob].every(value => typeof value === 'string' && value.trim() && value.length <= 100)) {
    throw fail(400, 'Ad, soyad ve doğum tarihi zorunludur.');
  }
  return { name: name.trim(), surname: surname.trim(), dob: dob.trim() };
}
function scoreData(body) {
  const { date, totalScore, totalSeries, arrowsPerSeries, seriesScores } = body;
  if (typeof date !== 'string' || !date || !Number.isInteger(totalSeries) || totalSeries < 1 || totalSeries > 1000 ||
      !Number.isInteger(arrowsPerSeries) || arrowsPerSeries < 1 || arrowsPerSeries > 1000 ||
      !Array.isArray(seriesScores) || seriesScores.length > totalSeries ||
      seriesScores.some(score => !Number.isInteger(score) || score < 0 || score > arrowsPerSeries * 3) ||
      totalScore !== seriesScores.reduce((sum, score) => sum + score, 0)) {
    throw fail(400, 'Puanlar ve antrenman ayarları geçersiz.');
  }
  return { date, totalScore, totalSeries, arrowsPerSeries, seriesScores };
}
function clientId(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(value)) throw fail(400, 'Geçerli bir kayıt kimliği gereklidir.');
  return value;
}

function createApp(dependencies = {}) {
  const User = dependencies.User || require('./models/User');
  const Session = dependencies.Session || require('./models/Session');
  const TeacherData = dependencies.TeacherData || require('./models/TeacherData');
  const StudentProfile = dependencies.StudentProfile || require('./models/StudentProfile');
  const readKeys = dependencies.readKeys || (() => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'teacher_keys.json'), 'utf8')));
  const getStudentModel = dependencies.getStudentModel || (async (userId, collectionType = 'Antrenman_Gecmisi') => {
    const user = await User.findById(userId);
    if (!user) throw fail(404, 'Kullanıcı bulunamadı.');
    // Keep existing collection names so historical records remain accessible.
    const safeName = `${user.name}_${user.surname}`.replace(/[^a-zA-Z0-9]/g, '_');
    const collectionName = `${safeName}_${collectionType}`;
    const db = mongoose.connection.useDb('studentData', { useCache: true });
    const model = db.models[collectionName] || db.model(collectionName, require('./models/StudentData'), collectionName);
    await model.init();
    return model;
  });

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  async function issueSession(user) {
    const token = newToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await Session.create({ tokenHash: digest(token), userId: user._id, expiresAt });
    return { ...publicUser(user), token, expiresAt };
  }
  const requireAuth = route(async (req, res, next) => {
    const token = (req.get('Authorization') || '').match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) throw fail(401, 'Lütfen tekrar giriş yapın.');
    const session = await Session.findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } });
    if (!session) throw fail(401, 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
    const user = await User.findById(session.userId).select(credentials);
    if (!user) throw fail(401, 'Kullanıcı bulunamadı.');
    req.user = user;
    req.session = session;
    next();
  });
  const requireTeacher = (req, res, next) => req.user.role === 'teacher' ? next() : next(fail(403, 'Öğretmen yetkisi gereklidir.'));
  const requireOwner = (req, id) => {
    if (String(req.user._id) !== String(id)) throw fail(403, 'Bu kayıt için yetkiniz yok.');
  };

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.post('/api/auth/register', route(async (req, res) => {
    const details = identity(req.body);
    const { role, password, teacherKey } = req.body;
    if (!['student', 'teacher'].includes(role) || !validPassword(password)) throw fail(400, 'Geçerli rol ve en az 4 karakterli şifre gereklidir.');
    const existing = await User.findOne({ name: exactName(details.name), surname: exactName(details.surname) });
    if (existing) throw fail(400, 'Bu kullanıcı zaten kayıtlı!');
    if (role === 'teacher') {
      if (typeof teacherKey !== 'string') throw fail(400, 'Öğretmen anahtarı gereklidir.');
      const key = readKeys().find(item => item.key === teacherKey);
      if (!key || key.isUsed || await User.findOne({ teacherKey })) throw fail(400, 'Öğretmen anahtarı geçersiz veya kullanılmış.');
    }
    const user = await User.create({ ...details, role, passwordHash: await hashPassword(password), ...(role === 'teacher' ? { teacherKey } : {}) });
    res.status(201).json(await issueSession(user));
  }));

  app.post('/api/auth/login', route(async (req, res) => {
    const { name, surname, role, password, activationCode } = req.body;
    if (typeof name !== 'string' || typeof surname !== 'string' || !name.trim() || !surname.trim() ||
        !['student', 'teacher'].includes(role) || typeof password !== 'string' || !password || password.length > 256) {
      throw fail(400, 'Giriş bilgilerini kontrol edin.');
    }
    let user = await User.findOne({ name: exactName(name.trim()), surname: exactName(surname.trim()) }).select(credentials);
    if (!user) throw fail(401, 'Ad, soyad veya şifre hatalı.');
    if (user.role === 'student' && role === 'teacher') throw fail(403, 'Öğrenci hesabı öğretmen paneline giremez.');
    if (user.passwordHash) {
      if (!await verifyPassword(password, user.passwordHash)) throw fail(401, 'Ad, soyad veya şifre hatalı.');
    } else if (user.password) {
      if (user.password !== password) throw fail(401, 'Ad, soyad veya şifre hatalı.');
      // Existing passwords continue to work; plaintext is removed on successful login.
      user.passwordHash = await hashPassword(password);
      user.password = undefined;
      await user.save();
    } else {
      if (!validPassword(password) || typeof activationCode !== 'string' || !user.activationHash ||
          digest(activationCode.trim().toUpperCase()) !== user.activationHash || !(user.activationExpiresAt > new Date())) {
        throw fail(403, 'İlk giriş için öğretmeninizden etkinleştirme kodu alın ve yeni şifrenizi girin.');
      }
      // One-time claim, including under concurrent requests.
      user = await User.findOneAndUpdate({ _id: user._id, activationHash: user.activationHash, activationExpiresAt: { $gt: new Date() } }, {
        $set: { passwordHash: await hashPassword(password) },
        $unset: { activationHash: 1, activationExpiresAt: 1, password: 1 },
      }, { new: true }).select(credentials);
      if (!user) throw fail(409, 'Kod zaten kullanılmış. Lütfen giriş yapın.');
    }
    res.json(await issueSession(user));
  }));

  app.use('/api', requireAuth);
  app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)));
  app.post('/api/auth/logout', route(async (req, res) => {
    await Session.deleteOne({ _id: req.session._id });
    res.json({ ok: true });
  }));

  app.get('/api/student/sessions/:userId', route(async (req, res) => {
    if (req.user.role !== 'teacher') requireOwner(req, req.params.userId);
    const { page, limit, skip } = pagination(req.query);
    const training = await getStudentModel(req.params.userId);
    const competition = await getStudentModel(req.params.userId, 'Yarisma_Gecmisi');
    const match = { userId: req.params.userId };
    const [result] = await training.aggregate([
      { $match: match },
      { $unionWith: { coll: competition.collection.name, pipeline: [{ $match: match }] } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $facet: { sessions: [{ $skip: skip }, { $limit: limit }], count: [{ $count: 'total' }] } },
    ]);
    const total = result.count[0]?.total || 0;
    res.json({ sessions: result.sessions, currentPage: page, totalPages: Math.ceil(total / limit), totalRecords: total });
  }));

  app.post('/api/student/sessions', route(async (req, res) => {
    requireOwner(req, req.body.userId);
    const data = scoreData(req.body);
    const model = await getStudentModel(req.user._id);
    const filter = { userId: String(req.user._id), clientId: clientId(req.body.clientId) };
    const session = await model.findOneAndUpdate(filter, { $set: { ...data, type: 'training' } }, { upsert: true, new: true, runValidators: true });
    res.status(201).json(session);
  }));

  app.use('/api/teacher', requireTeacher);
  app.get('/api/teacher/students/:teacherId', route(async (req, res) => {
    requireOwner(req, req.params.teacherId);
    res.json(await StudentProfile.find({ teacherId: String(req.user._id) }).sort({ createdAt: -1 }));
  }));
  app.post('/api/teacher/students', route(async (req, res) => {
    requireOwner(req, req.body.teacherId);
    res.status(201).json(await StudentProfile.create({ teacherId: String(req.user._id), name: req.body.name, age: req.body.age }));
  }));
  app.get('/api/teacher/all-students', route(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const students = await User.find({ role: 'student' }).select(credentials).sort({ name: 1, _id: 1 }).skip(skip).limit(limit);
    const total = await User.countDocuments({ role: 'student' });
    res.json({ students: students.map(publicUser), currentPage: page, totalPages: Math.ceil(total / limit), totalRecords: total });
  }));
  app.get('/api/teacher/competitions/:teacherId', route(async (req, res) => {
    requireOwner(req, req.params.teacherId);
    res.json(await TeacherData.find({ teacherId: String(req.user._id) }).sort({ createdAt: -1 }));
  }));

  function activation() {
    const code = newToken().slice(0, 16).toUpperCase();
    return { code, activationHash: digest(code), activationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
  }
  app.post('/api/teacher/add-student', route(async (req, res) => {
    const details = identity(req.body);
    if (await User.findOne({ name: exactName(details.name), surname: exactName(details.surname) })) throw fail(400, 'Bu öğrenci zaten sisteme kayıtlı!');
    const { code, ...fields } = activation();
    const user = await User.create({ ...details, role: 'student', ...fields });
    res.status(201).json({ ...publicUser(user), activationCode: code });
  }));
  app.post('/api/teacher/students/:userId/activation', route(async (req, res) => {
    const user = await User.findById(req.params.userId).select(credentials);
    if (!user || user.role !== 'student') throw fail(404, 'Öğrenci bulunamadı.');
    if (user.password || user.passwordHash) throw fail(409, 'Bu hesabın şifresi zaten belirlenmiş.');
    const { code, ...fields } = activation();
    const updated = await User.findOneAndUpdate({ _id: user._id, $or: [{ password: { $exists: false } }, { password: '' }, { password: null }], passwordHash: { $exists: false } }, { $set: fields }, { new: true });
    if (!updated) throw fail(409, 'Hesap zaten etkinleştirilmiş.');
    res.json({ activationCode: code });
  }));

  app.post('/api/teacher/competitions', route(async (req, res) => {
    requireOwner(req, req.body.teacherId);
    const id = clientId(req.body.clientId);
    const rounds = Number(req.body.rounds);
    const arrows = Number(req.body.arrowsPerRound);
    if (!Array.isArray(req.body.results) || !req.body.results.length) throw fail(400, 'Yarışmaya öğrenci ekleyin.');
    const seen = new Set();
    const results = [];
    for (const result of req.body.results) {
      if (typeof result.studentId !== 'string' || seen.has(result.studentId)) throw fail(400, 'Geçerli ve benzersiz öğrenci kimlikleri gereklidir.');
      seen.add(result.studentId);
      const user = await User.findById(result.studentId);
      if (!user || user.role !== 'student') throw fail(400, 'Yarışma öğrencisi bulunamadı.');
      const scores = scoreData({ ...result, date: req.body.date, totalSeries: rounds, arrowsPerSeries: arrows });
      results.push({ studentId: String(user._id), studentName: `${user.name} ${user.surname}`, totalScore: scores.totalScore,
        seriesScores: scores.seriesScores, average: (scores.totalScore / (rounds * arrows)).toFixed(2), duration: String(result.duration || '') });
    }
    const competition = await TeacherData.findOneAndUpdate({ teacherId: String(req.user._id), clientId: id }, {
      $set: { date: req.body.date, rounds: String(rounds), arrowsPerRound: String(arrows), totalDuration: String(req.body.totalDuration || ''), results },
    }, { upsert: true, new: true, runValidators: true });
    // Retrying an interrupted fan-out updates the same competition and student records.
    for (const result of results) {
      const model = await getStudentModel(result.studentId, 'Yarisma_Gecmisi');
      await model.findOneAndUpdate({ userId: result.studentId, clientId: `competition_${competition._id}` }, {
        $set: { type: 'competition', date: req.body.date, totalScore: result.totalScore, totalSeries: rounds,
          arrowsPerSeries: arrows, seriesScores: result.seriesScores, average: result.average, duration: result.duration },
      }, { upsert: true, new: true, runValidators: true });
    }
    res.status(201).json(competition);
  }));
  app.use((err, req, res, next) => {
    const status = err.status || (err.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(err.name) ? 400 : 500);
    if (status === 500) console.error(err);
    res.status(status).json({ message: status === 500 ? 'Sunucu işlemi tamamlayamadı. Lütfen tekrar deneyin.' : err.code === 11000 ? 'Kullanıcı veya kayıt zaten mevcut. Lütfen tekrar deneyin.' : err.message });
  });
  return app;
}

if (require.main === module) {
  const app = createApp();
  mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/archer_app')
    .then(() => Promise.all(mongoose.modelNames().map(name => mongoose.model(name).init())))
    .then(() => app.listen(process.env.PORT || 2000, () => console.log('Archer API hazır.')))
    .catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = { createApp };
