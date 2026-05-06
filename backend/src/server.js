const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const StudentData = require('./models/StudentData');
const TeacherData = require('./models/TeacherData');
const StudentProfile = require('./models/StudentProfile');

const app = express();
const PORT = process.env.PORT || 2000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/archer_app';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==========================================
// STUDENT (ÖĞRENCİ) ROUTES
// ==========================================

// Öğrenci antrenman geçmişini getir
app.get('/api/student/sessions/:userId', async (req, res) => {
  try {
    const sessions = await StudentData.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Yeni öğrenci antrenmanı kaydet
app.post('/api/student/sessions', async (req, res) => {
  const session = new StudentData(req.body);
  try {
    const newSession = await session.save();
    res.status(201).json(newSession);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ==========================================
// TEACHER (ÖĞRETMEN) ROUTES
// ==========================================

// Öğretmenin kaydettiği öğrencileri getir
app.get('/api/teacher/students/:teacherId', async (req, res) => {
  try {
    const students = await StudentProfile.find({ teacherId: req.params.teacherId }).sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Yeni öğrenci ekle
app.post('/api/teacher/students', async (req, res) => {
  const student = new StudentProfile(req.body);
  try {
    const newStudent = await student.save();
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Öğretmenin başlattığı yarışmaları getir
app.get('/api/teacher/competitions/:teacherId', async (req, res) => {
  try {
    const competitions = await TeacherData.find({ teacherId: req.params.teacherId }).sort({ createdAt: -1 });
    res.json(competitions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Yeni bir yarışma (competition) kaydet
app.post('/api/teacher/competitions', async (req, res) => {
  const competition = new TeacherData(req.body);
  try {
    const newCompetition = await competition.save();
    res.status(201).json(newCompetition);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
