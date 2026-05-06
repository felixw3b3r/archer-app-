const mongoose = require('mongoose');

const studentDataSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  totalScore: { type: Number, required: true },
  totalSeries: { type: Number, required: true },
  arrowsPerSeries: { type: Number, required: true },
  seriesScores: [Number], // Her turun toplam puanını tutan dizi
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentData', studentDataSchema);
