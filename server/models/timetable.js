const mongoose = require('mongoose');
const { type } = require('os');

const timeTableSchema = new mongoose.Schema({
  sem: { type: String, required: true },    // e.g., "VI" or "III"
  batch: { type: String, required: true },  // e.g., "Batch-1"

  // The Schedule Structure
  weekSchedule: [
    {
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
      },
      periods: [
        {
          startTime: { type: String, required: true }, // "09:30"
          endTime: { type: String, required: true },   // "10:30"
          session: { type: String, required: true },    // "FN" OR "AN"
          subject: { type: String, required: true },   // "Data Structures"
          faculty: [{
            id: { type: String, required: true },
            name: { type: String, required: true }
          }],               
          roomNo: { type: String }                      // "Room 101"
        }
      ]
    }
  ]
}, {
  timestamps: true
});


module.exports = mongoose.model('TimeTable', timeTableSchema);