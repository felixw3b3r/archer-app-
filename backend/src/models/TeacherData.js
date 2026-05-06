const mongoose = require('mongoose');

const teacherDataSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  rounds: String,
  arrowsPerRound: String,
  totalDuration: String,
  results: [{
    studentName: String,
    totalScore: Number,
    seriesScores: [Number],
    average: String,
    duration: String
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TeacherData', teacherDataSchema);
