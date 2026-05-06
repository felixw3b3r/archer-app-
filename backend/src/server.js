const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const StudentData = require('./models/StudentData');
const TeacherData = require('./models/TeacherData');
const StudentProfile = require('./models/StudentProfile');
const User = require('./models/User');
const fs = require('fs');
const path = require('path');

const KEYS_FILE = path.join(__dirname, '..', 'data', 'teacher_keys.json');

const app = express();
const PORT = process.env.PORT || 2000;

// Renk Kodları
const PURPLE = '\x1b[35m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/archer_app';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// DİNAMİK KOLEKSİYON YARDIMCISI (ÖĞRENCİ TABLOLARI)
// ==========================================
const getStudentModel = async (userId, collectionType = 'Antrenman_Gecmisi') => {
  const user = await User.findById(userId);
  if (!user) throw new Error("Kullanıcı bulunamadı");
  
  const safeName = `${user.name}_${user.surname}`.replace(/[^a-zA-Z0-9]/g, '_');
  const collectionName = `${safeName}_${collectionType}`; 
  
  // Öğrencilerin karmaşık dosyalarını archer_app dışında ayrı bir veritabanında (klasörde) tutuyoruz
  const studentDb = mongoose.connection.useDb('studentData', { useCache: true });
  
  if (studentDb.models[collectionName]) {
    return studentDb.models[collectionName];
  }
  const schema = require('./models/StudentData');
  return studentDb.model(collectionName, schema, collectionName);
};

// ==========================================
// AUTH (KAYIT / GİRİŞ) ROUTES
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  const { name, surname, dob, role, password, teacherKey } = req.body;
  console.log(`${PURPLE}[AUTH]${RESET} Yeni kayit denemesi: ${name} ${surname} (${role})`);

  try {
    // 1. Öğretmen Kontrolleri
    if (role === 'teacher') {
      if (!password || password.length < 4) {
        return res.status(400).json({ message: 'Öğretmenler için en az 4 haneli bir şifre zorunludur.' });
      }
      if (!teacherKey) {
        return res.status(400).json({ message: 'Öğretmen kaydı için geçerli bir anahtar gereklidir.' });
      }

      // Anahtarları oku
      const keysData = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
      const keyIndex = keysData.findIndex(k => k.key === teacherKey);

      if (keyIndex === -1) {
        return res.status(400).json({ message: 'Geçersiz öğretmen anahtarı!' });
      }
      if (keysData[keyIndex].isUsed) {
        return res.status(400).json({ message: 'Bu anahtar daha önce kullanılmış!' });
      }

      // Anahtarı kullanıldı olarak işaretle
      keysData[keyIndex].isUsed = true;
      keysData[keyIndex].usedBy = `${name} ${surname}`;
      fs.writeFileSync(KEYS_FILE, JSON.stringify(keysData, null, 2));
    }

    // 2. Mevcut Kullanıcı Kontrolü
    const existingUser = await User.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }, 
      surname: { $regex: new RegExp(`^${surname}$`, 'i') } 
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Bu kullanıcı zaten kayıtlı!' });
    }

    const newUser = new User({ name, surname, dob, role, password, teacherKey });
    await newUser.save();
    
    console.log(`${PURPLE}[SUCCESS]${RESET} Yeni kullanici olusturuldu: ${newUser._id}`);
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { name, surname, role, password } = req.body;
  console.log(`${CYAN}[AUTH]${RESET} Giris denemesi: ${name} ${surname} (${role})`);

  try {
    // Önce ismiyle bul
    const user = await User.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }, 
      surname: { $regex: new RegExp(`^${surname}$`, 'i') }
    });

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı. Lütfen bilgilerinizi kontrol edin.' });
    }

    // Rol kontrolü
    // Eğer kullanıcı öğrenciyse ama öğretmen panelini istiyorsa: ENGELLE
    if (user.role === 'student' && role === 'teacher') {
      return res.status(403).json({ 
        message: `Erişim Kilitli! Öğrenci hesabı ile öğretmen paneline giriş yapamazsınız.` 
      });
    }
    // NOT: Eğer kullanıcı öğretmen ise ve öğrenci panelini istiyorsa: İZİN VER (Öğretmenler de ok atabilir)

    // Şifre kontrolü (Sadece öğretmen hesabı olanlar için şifre zorunlu olsun, hangi role girerse girsin)
    if (user.role === 'teacher') {
      if (!password || user.password !== password) {
        return res.status(401).json({ message: 'Öğretmen hesabınız için hatalı şifre!' });
      }
    }

    console.log(`${CYAN}[SUCCESS]${RESET} Giris basarili: ${user._id}`);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==========================================
// STUDENT (ÖĞRENCİ) ROUTES
// ==========================================

// Öğrenci antrenman geçmişini getir
app.get('/api/student/sessions/:userId', async (req, res) => {
  console.log(`${CYAN}[FETCH]${RESET} Ogrenci gecmisi isteniyor: ${req.params.userId}`);
  try {
    const StudentModel = await getStudentModel(req.params.userId, 'Antrenman_Gecmisi');
    const sessions = await StudentModel.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Yeni öğrenci antrenmanı kaydet
app.post('/api/student/sessions', async (req, res) => {
  console.log(`${PURPLE}[SAVE]${RESET} Yeni antrenman kaydediliyor: ${req.body.userId}`);
  try {
    const StudentModel = await getStudentModel(req.body.userId, 'Antrenman_Gecmisi');
    const session = new StudentModel(req.body);
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
  console.log(`${CYAN}[FETCH]${RESET} Ogretmenin ogrenci listesi isteniyor: ${req.params.teacherId}`);
  try {
    const students = await StudentProfile.find({ teacherId: req.params.teacherId }).sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Yeni öğrenci ekle
app.post('/api/teacher/students', async (req, res) => {
  console.log(`${PURPLE}[SAVE]${RESET} Yeni ogrenci profile ekleniyor: ${req.body.name}`);
  const student = new StudentProfile(req.body);
  try {
    const newStudent = await student.save();
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ==========================================
// TEACHER (ÖĞRETMEN) ÖĞRENCİ YÖNETİMİ
// ==========================================

// Tüm kayıtlı öğrencileri getir
app.get('/api/teacher/all-students', async (req, res) => {
  console.log(`${CYAN}[FETCH]${RESET} Tüm öğrenciler listeleniyor...`);
  try {
    const students = await User.find({ role: 'student' }).sort({ name: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Öğretmen tarafından yeni öğrenci kaydet
app.post('/api/teacher/add-student', async (req, res) => {
  const { name, surname, dob } = req.body;
  console.log(`${PURPLE}[TEACHER]${RESET} Yeni ogrenci ekleniyor: ${name} ${surname}`);

  try {
    const existingUser = await User.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }, 
      surname: { $regex: new RegExp(`^${surname}$`, 'i') } 
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Bu öğrenci zaten sisteme kayıtlı!' });
    }

    const newUser = new User({ name, surname, dob, role: 'student' });
    await newUser.save();
    
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Yeni bir yarışma (competition) kaydet
app.post('/api/teacher/competitions', async (req, res) => {
  console.log(`${PURPLE}[SAVE]${RESET} Yeni yarisma sonuclari kaydediliyor: ${req.body.teacherId}`);
  const competition = new TeacherData(req.body);
  try {
    const newCompetition = await competition.save();
    
    // YARIŞMA VERİSİNİ ÖĞRENCİLERİN KENDİ DOSYALARINA KOPYALA
    if (req.body.results && req.body.results.length > 0) {
      for (let result of req.body.results) {
        // Öğrencinin adını ve soyadını ayırarak User'ı bul
        const nameParts = result.studentName.split(' ');
        const surname = nameParts.pop();
        const name = nameParts.join(' ');
        
        const user = await User.findOne({ 
          name: { $regex: new RegExp(`^${name}$`, 'i') }, 
          surname: { $regex: new RegExp(`^${surname}$`, 'i') } 
        });

        if (user) {
          const CompModel = await getStudentModel(user._id, 'Yarisma_Gecmisi');
          const compData = new CompModel({
            type: 'competition',
            userId: user._id,
            date: req.body.date,
            totalScore: result.totalScore,
            totalSeries: parseInt(req.body.rounds),
            arrowsPerSeries: parseInt(req.body.arrowsPerRound),
            seriesScores: result.seriesScores,
            average: result.average,
            duration: result.duration
          });
          await compData.save().catch(e => console.log("Öğrenci dosyasına kaydedilemedi:", e.message));
        }
      }
    }

    res.status(201).json(newCompetition);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
