const mongoose = require('mongoose');
const express = require('express');
const Faculty = require('../models/faculty');
const Announcement = require('../models/Announcement');
const Coder = require('../models/coding')
const getModel = require('../CommonServices/getModel');
const { studentSchema } = require('../models/Student');
const TimeTable = require('../models/timetable');


const EncDec_SECRET_KEY = process.env.SECRET_KEY;
require("dotenv").config();

const encryptData = (data) => {
  try {
    if (!data) return null;
    // Ensure we are encrypting a string
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
    const bytes = CryptoJS.AES.decrypt(ciphertext, EncDec_SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) return null;

    // Try to parse as JSON, otherwise return the raw string
    try {
      return JSON.parse(decryptedString);
    } catch (e) {
      return decryptedString;
    }
  } catch (err) {
    return null;
  }
};

async function getDashboardData(req, res) {
  try {
    // 1. Get Faculty ID from Auth Token
    const { userId } = req.user;

    if (!userId) {
      return res.status(400).json({ error: "facultyid is required in auth token" });
    }

    const facultyid = userId;

    // 2. Get Faculty Profile
    const faculty = await Faculty.findOne({
      facultyid: new RegExp(`^${facultyid}$`, "i")
    }).select("facultyid name designation batches_assigned subjects_assigned").lean();

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // 3. Parse Assigned Batches & Subjects for Querying
    // We combine both because subjects_assigned often contains specific batches (e.g., "VI,SN1:CSM601") 
    // that might not be explicitly listed in batches_assigned.
    let queryCriteria = [];
    const rawBatches = new Set();

    // Process batches_assigned (Format: "VI:SU1")
    if (faculty.batches_assigned) {
      faculty.batches_assigned.forEach(entry => {
        const parts = entry.split(':');
        if (parts.length === 2) {
          rawBatches.add(JSON.stringify({ sem: parts[0], batch: parts[1] }));
        }
      });
    }

    // Process subjects_assigned (Format: "VI,SN1:CSM601")
    if (faculty.subjects_assigned) {
      faculty.subjects_assigned.forEach(entry => {
        // Split by ':' to get "VI,SN1"
        const prefix = entry.split(':')[0];
        if (prefix) {
          const parts = prefix.split(',');
          if (parts.length === 2) {
            rawBatches.add(JSON.stringify({ sem: parts[0], batch: parts[1] }));
          }
        }
      });
    }

    // Convert Set back to Array of objects
    queryCriteria = Array.from(rawBatches).map(item => JSON.parse(item));

    // 4. Fetch TimeTables
    let timetables = [];
    if (queryCriteria.length > 0) {
      timetables = await TimeTable.find({
        $or: queryCriteria
      });
    }

    // 5. Get Today's Classes & Next Session
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDayName = days[now.getDay()];

    let todayClasses = [];

    // Iterate through all retrieved timetables
    timetables.forEach(tt => {
      // Find today's schedule in this timetable
      const daySchedule = tt.weekSchedule.find(d => d.day === currentDayName);

      if (daySchedule) {
        daySchedule.periods.forEach(period => {
          // Check if THIS faculty is assigned to this period
          const isAssigned = period.faculty && period.faculty.some(f =>
            f.id.toLowerCase() === facultyid.toLowerCase()
          );

          if (isAssigned) {
            todayClasses.push({
              ...period.toObject(),
              sem: tt.sem,      // Inject Sem context
              batch: tt.batch   // Inject Batch context
            });
          }
        });
      }
    });

    // Sort classes chronologically
    todayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Determine Next or Ongoing Session
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let nextSession = null;

    for (const cls of todayClasses) {
      const [startH, startM] = cls.startTime.split(':').map(Number);
      const [endH, endM] = cls.endTime.split(':').map(Number);

      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      // Logic: The first class that hasn't ended yet
      if (endTotal > currentMinutes) {
        nextSession = {
          ...cls,
          status: (currentMinutes >= startTotal) ? "Ongoing" : "Upcoming"
        };
        break; // Found the immediate next one
      }
    }

    // 6. Get Top 3 Coders (Leaderboard)
    const topCoders = await Coder.find()
      .sort({ totalScore: -1 })
      .limit(3)
      .select("rollno scores totalScore");

    res.json({
      faculty,
      topCoders,
      todayClasses,
      nextSession
    });

  } catch (err) {
    console.error("Error fetching faculty dashboard:", err);
    res.status(500).json({ error: "Server error" });
  }
}

async function getFacultyTimeTable(req, res) {
  try {
    const { userId } = req.user;
    if (!userId) return res.status(400).json({ error: "facultyid is required" });
    const facultyid = userId;

    // 1. Get Faculty Profile for batches/subjects
    const faculty = await Faculty.findOne({ facultyid: new RegExp(`^${facultyid}$`, "i") })
      .select("batches_assigned subjects_assigned").lean();

    if (!faculty) return res.status(404).json({ error: "Faculty not found" });

    // 2. Parse Assigned Batches & Subjects
    let queryCriteria = [];
    const rawBatches = new Set();

    // Process batches_assigned (Format: "VI:SU1")
    if (faculty.batches_assigned) {
      faculty.batches_assigned.forEach(entry => {
        const parts = entry.split(':');
        if (parts.length === 2) {
          rawBatches.add(JSON.stringify({ sem: parts[0], batch: parts[1] }));
        }
      });
    }

    // Process subjects_assigned (Format: "VI,SN1:CSM601")
    if (faculty.subjects_assigned) {
      faculty.subjects_assigned.forEach(entry => {
        const prefix = entry.split(':')[0];
        if (prefix) {
          const parts = prefix.split(',');
          if (parts.length === 2) {
            rawBatches.add(JSON.stringify({ sem: parts[0], batch: parts[1] }));
          }
        }
      });
    }

    queryCriteria = Array.from(rawBatches).map(item => JSON.parse(item));

    if (queryCriteria.length === 0) {
      return res.json({ facultyid, weekSchedule: {} });
    }

    // 3. Fetch timetables for ALL assigned batches
    const timetables = await TimeTable.find({
      $or: queryCriteria
    });

    // 4. Initialize weekly structure
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklySchedule = {};
    daysOrder.forEach(day => weeklySchedule[day] = []);

    // 5. Merge Logic
    timetables.forEach(tt => {
      tt.weekSchedule.forEach(dayData => {
        if (weeklySchedule[dayData.day]) {

          dayData.periods.forEach(period => {
            // Check if THIS faculty is teaching this period
            const isAssigned = period.faculty && period.faculty.some(f =>
              f.id.toLowerCase() === facultyid.toLowerCase()
            );

            if (isAssigned) {
              weeklySchedule[dayData.day].push({
                ...period.toObject(),
                sem: tt.sem,      // Inject Sem info
                batch: tt.batch   // Inject Batch info
              });
            }
          });
        }
      });
    });

    // 6. Sort each day by Start Time
    for (const day of daysOrder) {
      weeklySchedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    res.json({
      facultyid,
      weekSchedule: weeklySchedule
    });

  } catch (err) {
    console.error("Error fetching faculty timetable:", err);
    res.status(500).json({ error: "Server error" });
  }
}

async function getStudentData(req, res) {
  try {

    const { rollno } = req.params;
    if (!rollno) {
      return res.status(400).json({ error: "rollno is required" });
    }

    let student = null;
    const allCollections = await mongoose.connection.db.listCollections().toArray();
    const studentCollections = allCollections.map(c => c.name).filter(name => name.includes('-SEM-students'));

    for (const collectionName of studentCollections) {
      const StudentModel = getModel(collectionName, studentSchema);
      const found = await StudentModel.findOne({
        rollno: new RegExp(`^${rollno}$`, "i")
      }).lean();
      if (found) {
        student = found;
        break;
      }
    }
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student);

  } catch (err) {
    console.error("Error fetching Student data:", err);
    res.status(500).json({ error: "Server error" });
  }

}

async function getProfileData(req, res) {
  try {
    // const { facultyid } = req.params;
    const { userId } = req.user;
    if (!userId) {
      return res.status(400).json({ error: "facultyid is required" });
    }
    const facultyid = userId;
    const faculty = await Faculty.findOne({
      facultyid: new RegExp(`^${facultyid}$`, "i")
    }).select("name facultyid batches_assigned subjects_assigned email").lean();
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    res.json({ faculty });

  } catch (err) {
    console.error("Error fetching Faculty data:", err);
    res.status(500).json({ error: "Server error" });
  }
}

async function getAllAnnouncements(req, res) {
  try {
    // We just sort by newest first.
    const announcements = await Announcement.find({})
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: announcements.length,
      announcements
    });
  } catch (error) {
    console.error("❌ Error fetching all announcements:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = {
  getDashboardData,
  getStudentData,
  getProfileData,
  getAllAnnouncements,
  getFacultyTimeTable
}