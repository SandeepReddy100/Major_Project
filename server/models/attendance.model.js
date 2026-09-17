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
      date: String,
      course: String,
      status: { type: String, enum: ['present', 'absent'] }
    }
  ]
},{
  timestamps: true ,
  toObject: { retainKeyOrder: true }, 
  toJSON: { retainKeyOrder: true }
});

// Export correctly
module.exports = { attendanceSchema };
