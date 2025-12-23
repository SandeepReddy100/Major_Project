const mongoose = require("mongoose");

const codingSchema = new mongoose.Schema({
  rollno: String,
  branch: String,
  batch: String,
  handles: {
    leetcode: String,
    gfg: String,
    codechef: String,
    hackerank: String
  },
  scores: {
    leetcode: { type: Number, default: 0 },
    gfg: { type: Number, default: 0 },
    codechef: { type: Number, default: 0 },
    hackerank: { type: Number, default: 0 }
  },
  totalScore: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Coder", codingSchema, "leaderboard");
