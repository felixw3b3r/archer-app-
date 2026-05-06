const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
