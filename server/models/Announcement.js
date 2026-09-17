const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  userId:{
    type:String,
    required:true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['GENERAL', 'FORMS', 'ASSESSMENTS', 'EVENTS', 'REGISTRATIONS'],
    default: 'GENERAL'
  },
  priority: {
    type: Number,
    default: 1
  },
  linkUrl: {
    type: String,
    default: ""
  },

  // --- TARGETING LOGIC ---
  targetBatches: [{
    type: String
  }],
  targetSemesters: [{
    type: String
  }],
  isGlobal: {
    type: Boolean,
    default: false
  },

  // --- MANDATORY / SYNC LOGIC ---
  isMandatory: {
    type: Boolean,
    default: false
  },
  // Deadline for the Cron Job to stop syncing
  deadline: {
    type: Date
  },
  // The Public Google Sheet URL to sync from
  googleSheetUrl: {
    type: String
  },
  // Array of Roll Numbers synced from the sheet
  // Used to freeze QR codes if student is missing from this list
  filledStudents: [{
    type: String
  }],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// --- INDEXES ---
// 1. Separate indexes for arrays to avoid "cannot index parallel arrays" error
announcementSchema.index({ targetBatches: 1 });
announcementSchema.index({ targetSemesters: 1 });

// 2. Standard indexes
announcementSchema.index({ isGlobal: 1 });
announcementSchema.index({ priority: -1, createdAt: -1 });

// 3. Index for the Sync Service (to quickly find active mandatory forms)
announcementSchema.index({ isMandatory: 1, deadline: 1 });

module.exports = mongoose.model('Announcement', announcementSchema, "announcements");