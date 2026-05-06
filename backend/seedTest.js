const mongoose = require('mongoose');
const User = require('./src/models/User');
const StudentData = require('./src/models/StudentData');
const TeacherData = require('./src/models/TeacherData');
const StudentProfile = require('./src/models/StudentProfile');

mongoose.connect('mongodb://127.0.0.1:27017/archer_app')
  .then(async () => {
    console.log('Veritabanına bağlanıldı, test verileri oluşturuluyor...');
    
    // Eski verileri temizle
    await User.deleteMany({});
    await TeacherData.deleteMany({});
    await StudentProfile.deleteMany({});

    // 1 Öğretmen Oluştur
    const teacher = await new User({
      name: 'Test',
      surname: 'Teacher',
      dob: '01/01/1980',
      role: 'teacher',
      password: '1234',
      teacherKey: 'HOCA1'
    }).save();

    const students = [];
    
    // 10 Öğrenci Oluştur ve Antrenman Ekle
    for (let i = 1; i <= 10; i++) {
      const student = await new User({
        name: 'Test',
        surname: `User ${i}`,
        dob: `01/01/200${i % 10}`,
        role: 'student'
      }).save();
      students.push(student);

      // Öğretmen paneli için profil oluştur
      await new StudentProfile({
        teacherId: teacher._id,
        name: `Test User ${i}`,
        age: 15 + (i % 5)
      }).save();

      const safeName = `${student.name}_${student.surname}`.replace(/[^a-zA-Z0-9]/g, '_');
      const studentDb = mongoose.connection.useDb('studentData', { useCache: true });
      const TrainModel = studentDb.model(`${safeName}_Antrenman_Gecmisi`, StudentData, `${safeName}_Antrenman_Gecmisi`);
      
      // Her öğrenciye rastgele 2 Antrenman
      for (let j = 1; j <= 2; j++) {
        const seriesScores = [
          Math.floor(Math.random() * 15) + 15,
          Math.floor(Math.random() * 15) + 15,
          Math.floor(Math.random() * 15) + 15,
        ];
        const totalScore = seriesScores.reduce((a, b) => a + b, 0);

        await new TrainModel({
          type: 'training',
          userId: student._id,
          date: `0${j}/05/2026 14:00`,
          totalScore: totalScore,
          totalSeries: 3,
          arrowsPerSeries: 3,
          seriesScores: seriesScores
        }).save();
      }
    }

    // Herkesin katıldığı 3 Yarışma Ekle
    for (let c = 1; c <= 3; c++) {
      const results = students.map((student) => {
        // 5 Turluk bir yarışma
        const seriesScores = [
          Math.floor(Math.random() * 15) + 15,
          Math.floor(Math.random() * 15) + 15,
          Math.floor(Math.random() * 15) + 15,
          Math.floor(Math.random() * 15) + 15,
          Math.floor(Math.random() * 15) + 15,
        ];
        const totalScore = seriesScores.reduce((a, b) => a + b, 0);
        const average = (totalScore / 15).toFixed(2); // Toplam 15 ok atılmış gibi

        return {
          studentName: student.name + ' ' + student.surname,
          totalScore: totalScore,
          seriesScores: seriesScores,
          average: average,
          duration: `${Math.floor(Math.random() * 3) + 1}dk ${Math.floor(Math.random() * 59)}sn`
        };
      });

      // Puanlarına göre sırala (Birinci en üstte)
      results.sort((a, b) => b.totalScore - a.totalScore);

      await new TeacherData({
        teacherId: teacher._id,
        date: `0${c}/05/2026 15:00`,
        rounds: '5',
        arrowsPerRound: '3', // Tur başı 3 ok
        totalDuration: '15dk 30sn',
        results: results
      }).save();

      // Öğrencilerin kendi Yarisma_Gecmisi dosyalarına kaydet
      for (let result of results) {
        const student = students.find(s => (s.name + ' ' + s.surname) === result.studentName);
        if (student) {
          const safeName = `${student.name}_${student.surname}`.replace(/[^a-zA-Z0-9]/g, '_');
          const studentDb = mongoose.connection.useDb('studentData', { useCache: true });
          const CompModel = studentDb.model(`${safeName}_Yarisma_Gecmisi`, StudentData, `${safeName}_Yarisma_Gecmisi`);
          await new CompModel({
            type: 'competition',
            userId: student._id,
            date: `0${c}/05/2026 15:00`,
            totalScore: result.totalScore,
            totalSeries: 5,
            arrowsPerSeries: 3,
            seriesScores: result.seriesScores,
            average: result.average,
            duration: result.duration
          }).save();
        }
      }
    }

    console.log('✅ 1 Öğretmen, 10 Öğrenci, 20 Antrenman ve 3 Yarışma başarıyla oluşturuldu!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
