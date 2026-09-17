const mongoose = require("mongoose");

const codingSchema = new mongoose.Schema({
  rollno: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  branch: String,
  batch: String,
  
  handles: {
    type: Map,
    of: String,
    default: {}
  },
  sem:{ type: String },
  scores: {
    type: Map,
                of: Number,
    default: {}
  },

  totalScore: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Coder", codingSchema, "leaderboard");