const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  dob: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  password: { type: String, select: false }, // Legacy: migrated on successful login.
  passwordHash: { type: String, select: false },
  activationHash: { type: String, select: false },
  activationExpiresAt: { type: Date, select: false },
  teacherKey: { type: String, select: false },
  createdAt: { type: Date, default: Date.now }
});

// İsim ve Soyisim kombinasyonunu benzersiz yapmak için (Opsiyonel ama kod içinde kontrol edeceğiz)
userSchema.index({ name: 1, surname: 1 }, { unique: true });
userSchema.index({ teacherKey: 1 }, { unique: true, partialFilterExpression: { role: 'teacher', teacherKey: { $type: 'string' } } });

module.exports = mongoose.model('User', userSchema);
