const mongoose = require('mongoose');

const teacherDataSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, index: true },
  clientId: { type: String },
  date: { type: String, required: true },
  rounds: String,
  arrowsPerRound: String,
  totalDuration: String,
  results: [{
    studentId: String,
    studentName: String,
    totalScore: Number,
    seriesScores: [Number],
    average: String,
    duration: String
  }],
  createdAt: { type: Date, default: Date.now }
});

teacherDataSchema.index({ teacherId: 1, clientId: 1 }, {
  unique: true, partialFilterExpression: { clientId: { $type: 'string' } }
});
module.exports = mongoose.model('TeacherData', teacherDataSchema);
