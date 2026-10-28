const mongoose = require('mongoose');

const studentDataSchema = new mongoose.Schema({
  type: { type: String, default: 'training' },
  userId: { type: String, required: true },
  clientId: { type: String },
  date: { type: String, required: true },
  totalScore: { type: Number, required: true },
  totalSeries: { type: Number },
  arrowsPerSeries: { type: Number },
  seriesScores: [Number],
  average: { type: String },
  duration: { type: String },
  createdAt: { type: Date, default: Date.now }
});

studentDataSchema.index({ userId: 1, clientId: 1 }, {
  unique: true, partialFilterExpression: { clientId: { $type: 'string' } }
});
module.exports = studentDataSchema;
