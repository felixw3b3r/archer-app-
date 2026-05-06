const mongoose = require('mongoose');

const studentDataSchema = new mongoose.Schema({
  type: { type: String, default: 'training' },
  userId: { type: String, required: true },
  date: { type: String, required: true },
  totalScore: { type: Number, required: true },
  totalSeries: { type: Number },
  arrowsPerSeries: { type: Number },
  seriesScores: [Number],
  average: { type: String },
  duration: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = studentDataSchema;
