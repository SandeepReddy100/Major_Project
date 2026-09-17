const mongoose = require('mongoose');
const Coder = require('../models/coding')
const Announcement = require("../models/Announcement");
const getModel = require('../CommonServices/getModel');
const { studentSchema } = require('../models/Student');
const { attendanceSchema } = require('../models/attendance.model');
const TimeTable = require('../models/timetable');


const EncDec_SECRET_KEY = process.env.SECRET_KEY;
require("dotenv").config();

const encryptData = (data) => {
  try {
    if (!data) return null;
    const stringData = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return CryptoJS.AES.encrypt(stringData, EncDec_SECRET_KEY).toString();
  } catch (err) {
    console.error("Encryption Logic Error:", err.message);
    return null;
  }
};

const decryptData = (ciphertext) => {
  try {
    if (!ciphertext) return null;
    
    // Replace spaces with + in case of URL encoding issues
    const normalizedCiphertext = ciphertext.replace(/ /g, '+');
    
    const bytes = CryptoJS.AES.decrypt(normalizedCiphertext, EncDec_SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      console.error("❌ Decryption produced an empty string. Key mismatch or Corrupt Payload.");
      return null;
    }

    try {
      return JSON.parse(decryptedString);
    } catch (e) {
      return decryptedString;
    }
  } catch (err) {
    console.error("❌ Decryption Error:", err.message);
    return null;
  }
};

const checkHasValidHandles = (handles) => {
  if (!handles) return false;
  // Checks if at least one key in handles has a non-empty string value
  return Object.values(handles).every(val => val && val.toString().trim() !== "");
};

async function getDashboardData(req, res) { 
  try {
    const { userId, sem, batch } = req.user;
    const rollno = userId;

    if (!rollno || !sem || !batch) {
      return res.status(400).json({ error: "Incomplete user token data. Please log out and log in again." });
    }

    // 1. Fetch Student DIRECTLY
    const studentCollection = `${sem}-SEM-students`;
    const StudentModel = getModel(studentCollection, studentSchema);

    const student = await StudentModel.findOne({
      rollno: new RegExp(`^${rollno}$`, "i")
    }).select("rollno batch name branch sem email qrLink -_id").lean();

    if (!student) {
      return res.status(404).json({ error: "Student not found in collection" });
    }

    // 2. Get student's coding performance (ADDED 'handles' to select)
    const studentCoding = await Coder.findOne({
      rollno: new RegExp(`^${rollno}$`, "i")
    }).select("scores totalScore handles -_id").lean();

    // --- QR LOCK LOGIC ---
    // const hasHandles = checkHasValidHandles(studentCoding?.handles);
    // if (!hasHandles) {
    //   student.qrLink = null;
    //   student.isQrLocked = true; // Frontend can use this to show a lock message
    // } else {
    //   student.isQrLocked = false;
    // }
    // ---------------------

    // 3. Get top 3 coders
    const topCoders = await Coder.find()
      .sort({ totalScore: -1 })
      .limit(3)
      .select("rollno scores totalScore -_id").lean();

    // 4. Get Attendance Directly
    const batchFormatted = String(batch).trim().replace(/[^a-zA-Z0-9]/g, '');
    let attendance = {};
    if (attendanceSchema) {
      const attendanceCollection = `${sem}-SEM-attendance-${batchFormatted}`;
      const AttendanceModel = getModel(attendanceCollection, attendanceSchema);

      attendance = await AttendanceModel.findOne({ rollno: new RegExp(`^${rollno}$`, "i") })
        .select("overallAttendance courseAttendance -_id").lean();
    }

    // 5. Get Current Day's Timetable & Next Session
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDayName = days[now.getDay()];

    const timeTableDoc = await TimeTable.findOne({
      sem: sem,
      batch: batch
    }).lean();

    let todaySchedule = [];
    if (timeTableDoc) {
      const dayData = timeTableDoc.weekSchedule.find(d => d.day === currentDayName);
      if (dayData) {
        todaySchedule = dayData.periods;
      }
    }

    // Calculate Next Session
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let nextSession = null;

    if (todaySchedule.length > 0) {
      todaySchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (const cls of todaySchedule) {
        const [startH, startM] = cls.startTime.split(':').map(Number);
        const [endH, endM] = cls.endTime.split(':').map(Number);

        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        if (endTotal > currentMinutes) {
          nextSession = {
            ...cls,
            status: (currentMinutes >= startTotal) ? "Ongoing" : "Upcoming"
          };
          break;
        }
      }
    }

    // 6. Construct & Send Final Response
    res.json({
      sem: sem,
      student: student,
      todaySchedule: todaySchedule,
      nextSession: nextSession,
      // Remove handles from dashboard response if you don't need them there
      codingPerformance: studentCoding ? { scores: studentCoding.scores, totalScore: studentCoding.totalScore } : {},
      topCoders,
      attendance: attendance || {}
    });

  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};

async function getTimeTable(req, res) {
  try {
    const { userId, sem, batch } = req.user;

    if (!userId || !sem || !batch) {
      return res.status(400).json({ error: "Incomplete token data. Please re-login." });
    }

    // Look up directly via req.user token data (No student lookup required)
    const timeTableDoc = await TimeTable.findOne({
      sem: sem,
      batch: batch
    }).select("sem batch weekSchedule -_id").lean();

    if (!timeTableDoc) {
      return res.status(404).json({
        message: `TimeTable not found for ${sem} - ${batch}`
      });
    }

    // Return the response directly
    res.json(timeTableDoc || {
      timetable: timeTableDoc,
      message: "No schedule found for today"
    });

  } catch (error) {
    console.error("Error fetching timetable:", error);
    res.status(500).json({ error: "Server error" });
  }
};

async function getLogData(req, res) {
  try {
    const { userId, sem, batch } = req.user;
    if (!userId || !sem || !batch) {
      return res.status(400).json({ error: "Incomplete token data. Please re-login." });
    }

    let rollno = userId;

    const batchFormatted = String(batch).trim().replace(/[^a-zA-Z0-9]/g, '');
    const attendanceCollection = `${sem}-SEM-attendance-${batchFormatted}`;
    const AttendanceModel = getModel(attendanceCollection, attendanceSchema);
    
    const attendance = await AttendanceModel.findOne({ rollno: new RegExp(`^${rollno}$`, "i") })
      .select("rollno name branch batch courseAttendance  overallAttendance dailyLogs -_id").lean();

    res.json({ ...attendance });

  } catch (err) {
    console.error("Error fetching Log data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function getProfileData(req, res) {
  try {
    const { userId, sem, batch } = req.user;

    if (!userId || !sem || !batch) {
      return res.status(400).json({ error: "Incomplete token data. Please re-login." });
    }

    const rollno = userId;

    // 1. Find Student Directly
    const studentCollection = `${sem}-SEM-students`;
    const StudentModel = getModel(studentCollection, studentSchema);

    const student = await StudentModel.findOne({
      rollno: new RegExp(`^${rollno}$`, "i")
    }).select("rollno sem batch branch email qrLink qrData name -_id").lean();

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // 2. Fetch Coding Profile (Leaderboard)
    let codingProfile = await Coder.findOne({
      rollno: new RegExp(`^${rollno}$`, "i")
    }).select("handles scores totalScore -_id").lean();

    if (!codingProfile) {
      codingProfile = { handles: {}, scores: {}, totalScore: 0 };
    }

    // // --- QR LOCK LOGIC ---
    // const hasHandles = checkHasValidHandles(codingProfile.handles);
    // if (!hasHandles) {
    //   student.qrLink = null;
    //   student.isQrLocked = true;
    // } else {
    //   student.isQrLocked = false;
    // }
    // // ---------------------

    // 3. Calculate Ranks
    const globalrank = await Coder.countDocuments({
      totalScore: { $gt: codingProfile.totalScore }
    }) + 1;

    const batchrank = await Coder.countDocuments({
      totalScore: { $gt: codingProfile.totalScore },
      batch: batch
    }) + 1;

    // 4. Construct Response
    res.json({
      student,
      codingProfile,
      globalrank,
      batchrank
    });

  } catch (err) {
    console.error("Error fetching Student data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function updateCodingHandles(req, res) {
  try {
    const { userId, sem, batch } = req.user;
    const { handles } = req.body;

    if (!userId || !sem || !batch) {
      return res.status(400).json({ message: "Incomplete token data. Please re-login." });
    }
    if (!handles) {
      return res.status(400).json({ message: "Handles data is required" });
    }

    let rollno = userId;

    const studentCollection = `${sem}-SEM-students`;
    const StudentModel = getModel(studentCollection, studentSchema);
    const student = await StudentModel.findOne({
      rollno: new RegExp(`^${rollno}$`, "i")
    }).select("name rollno batch branch sem -_id").lean();
    if (!student) {
      return res.status(404).json({ message: "Student not found in collection" });
    }

    const updatedCoder = await Coder.findOneAndUpdate(
      { rollno: new RegExp(`^${rollno}$`, "i") },
      {
        $set: {
          handles: handles,
          lastUpdated: Date.now()
        }
      },
      { new: true, upsert: false } // We assume the student exists in leaderboard. Change to true if you want to create new entries.
    );

    if (!updatedCoder) {
      const newCoder = new Coder({
        name: student.name,
        rollno: rollno,
        batch: batch,
        branch: student.branch,
        sem: sem,
        handles: handles,
        scores: {},
        totalScore: 0,
        lastUpdated: Date.now()
      });
      await newCoder.save();
      return res.status(200).json({
        message: "Handles added and profile created successfully",
        codingProfile: newCoder
      });
    }

    res.status(200).json({
      message: "Handles updated successfully",
      codingProfile: updatedCoder
    });

  } catch (error) {
    console.error("Error updating handles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

async function HandleGetAnnouncements(req, res) {
  try {
    const { userId, batch, sem } = req.user;

    if (!userId || !sem || !batch) {
      return res.status(400).json({
        message: "Roll Number (from auth) and Semester (from params) are required."
      });
    }

    const announcements = await Announcement.find({
      $or: [
        { isGlobal: true },
        {
          targetSemesters: sem,
          targetBatches: batch
        }
      ]
    })
      // Sort by Priority (High/2 first), then by Date (Newest first)
      .sort({ priority: -1, createdAt: -1 });

    // console.log(`found ${announcements.length} announcements for ${rollno} in ${studentBatch}`);

    res.status(200).json({
      success: true,
      sem: sem,
      batch: batch, // Optional: useful for frontend debugging
      announcements
    });

  } catch (error) {
    console.error("❌ Error fetching announcements:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = {
  getDashboardData,
  HandleGetAnnouncements,
  getLogData,
  getProfileData,
  updateCodingHandles,
  getTimeTable
}
