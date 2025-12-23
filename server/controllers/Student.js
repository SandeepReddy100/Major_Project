const mongoose = require('mongoose');
const Student = require('../models/student');
const attendanceSchema = require('../models/attendance.model'); // export schema only, not model
const Coder=require('../models/coding')
const fetchLeetCode = require("../modules/leetcode");
const fetchGFG = require("../modules/gfg");
const fetchCodeChef = require("../modules/codechef");
const Announcement = require("../models/Announcement");


async function getDashboardData(req, res) {
  try {
    const { rollno } = req.body;
    if (!rollno) {
      return res.status(400).json({ error: "rollno is required" });
    }

    // 1. Get student profile (only rollno and batch)
    const student = await Student.findOne({ 
  rollno: new RegExp(`^${rollno}$`, "i")   // "i" = case-insensitive
})
      .select("rollno batch -_id");
    
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // 2. Get student's coding performance
    const studentCoding = await Coder.findOne({ rollno })
      .select("scores totalScore -_id"); // assuming performance field exists

    // 3. Get top 3 coders overall (sorted by performance)
    const topCoders = await Coder.find()
      .sort({ totalScore: -1 }) // descending
      .limit(3)
      .select("rollno scores totalScore -_id");

    // 4. Get attendance summary
    const batchFormatted = student.batch
      .replace(/BATCH/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    const collectionName = `attendance_${batchFormatted}`;
    const AttendanceModel = mongoose.model(collectionName, attendanceSchema, collectionName);

    const attendance = await AttendanceModel.findOne({ rollno: new RegExp(`^${rollno}$`, "i") })
      .select("overallAttendance courseAttendance -_id");

    res.json({
      student: student,
      codingPerformance: studentCoding || {},
      topCoders,
      attendance: attendance || {}
    });

  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function getLogData(req, res) {
  try {
    const { rollno } = req.params;
    if (!rollno) {
      return res.status(400).json({ error: "rollno is required" });
    }

    const student = await Student.findOne({ 
  rollno: new RegExp(`^${rollno}$`, "i")   // "i" = case-insensitive
});
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }


    const batchFormatted = student.batch
      .replace(/BATCH/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    const collectionName = `attendance_${batchFormatted}`;
    const AttendanceModel = mongoose.model(collectionName, attendanceSchema, collectionName);

    const attendance = await AttendanceModel.findOne({ rollno: new RegExp(`^${rollno}$`, "i") })
      .select("dailyLogs -_id");

      res.json({attendance});

  } catch (err) {
    console.error("Error fetching Log data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function getProfileData(req, res) {
  try {
    const { rollno } = req.body;
    if (!rollno) {
      return res.status(400).json({ error: "rollno is required" });
    }

    const student = await Student.findOne({ rollno }).select("name rollno branch batch email qrLink -_id");
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

      res.json({student});

  } catch (err) {
    console.error("Error fetching Student data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function HandleGetAnnouncements(req, res) {
  
  try {
    const studentBatch = req.params.batch;

    if (!studentBatch) {
      return res.status(400).json({ message: "Batch parameter is required." });
    }

    const announcements = await Announcement.find(
      { batches: studentBatch },
      "title subtitle content" // Only these fields
    )
      .sort({ createdAt: -1 }) // Latest first
      .limit(3); // Top 3 only

    res.status(200).json({ announcements });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports={
    getDashboardData,
    HandleGetAnnouncements,
    getLogData,
    getProfileData
}