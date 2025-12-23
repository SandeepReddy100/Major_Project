const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  rollno: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  branch: String,
  batch: String,
  overallAttendance: {
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 }
  },
  courseAttendance: {
    type: Map,
    of: {
      totalDays: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 }
    },
    default: {}
  },
  dailyLogs: [
    {
      date: String, // format: "YYYY-MM-DD"
      course: String,
      status: { type: String, enum: ['present', 'absent'] }
    }
  ],
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = attendanceSchema;
