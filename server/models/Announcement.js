const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  postedby: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  content: { type: String, required: true },
  batches: { type: [String], required: true },
  createdAt: { type: Date, default: Date.now },  // auto-set post date
});

module.exports = mongoose.model("Announcement", announcementSchema, "announcements");
