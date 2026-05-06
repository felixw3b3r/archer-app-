const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  dob: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  password: { type: String }, // Sadece öğretmenler için zorunlu olabilir
  teacherKey: { type: String }, // Kayıtta kullanılan anahtar
  createdAt: { type: Date, default: Date.now }
});

// İsim ve Soyisim kombinasyonunu benzersiz yapmak için (Opsiyonel ama kod içinde kontrol edeceğiz)
userSchema.index({ name: 1, surname: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
