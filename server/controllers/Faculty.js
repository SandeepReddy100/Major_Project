const express = require('express');
const Faculty = require('../models/faculty');
const Announcement = require('../models/Announcement');
const Student = require('../models/student');
const Coder = require('../models/coding')


async function getDashboardData(req, res) {
  try {
    const { facultyid } = req.params;
    if (!facultyid) {
      return res.status(400).json({ error: "facultyid is required" });
    }

    // 1. Get student profile (only rollno and batch)
    const faculty = await Faculty.findOne({
      facultyid: new RegExp(`^${facultyid}$`, "i")   // "i" = case-insensitive
    })
      .select("facultyid batches_assigned -_id");

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }


    // 2. Get top 3 coders overall (sorted by performance)
    const topCoders = await Coder.find()
      .sort({ totalScore: -1 }) // descending
      .limit(3)
      .select("rollno scores totalScore -_id");

    res.json({
      faculty: faculty,
      topCoders
    });

  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).json({ error: "Server error" });
  }
}

async function getStudentData(req, res) {
  try {

    const { rollno } = req.params;
    if (!rollno) {
      return res.status(400).json({ error: "rollno is required" });
    }

    // 1. Get student profile (only rollno and batch)
    const student = await Student.findOne({
      rollno: new RegExp(`^${rollno}$`, "i")   // "i" = case-insensitive
    })
      .select("rollno batch branch email -_id");

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student);

  } catch (error) {
    console.error("Error fetching Timetable data:", err);
    res.status(500).json({ error: "Server error" });
  }

}

async function getProfileData(req, res) {
  try {
    const { facultyid } = req.params;
    if (!facultyid) {
      return res.status(400).json({ error: "facultyid is required" });
    }

    const faculty = await Faculty.findOne({
      facultyid: new RegExp(`^${facultyid}$`, "i")
    }).select("name facultyid batches_assigned subjects_assigned email -_id");
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    res.json({ faculty });

  } catch (err) {
    console.error("Error fetching Faculty data:", err);
    res.status(500).json({ error: "Server error" });
  }
}

async function HandelPostAnnouncements(req, res) {

  try {
    const { postedby, title, subtitle, content, batches } = req.body;

    // Basic validation
    if (
      !postedby ||
      !title ||
      !subtitle ||
      !content ||
      !Array.isArray(batches) ||
      batches.length === 0
    ) {
      return res.status(400).json({ message: "All fields are required and batches must be a non-empty array." });
    }

    // Create and save announcement
    const newAnnouncement = new Announcement({
      postedby,
      title,
      subtitle,
      content,
      batches,
      createdAt: new Date(), // optional, auto-set by schema too
    });

    const saved = await newAnnouncement.save();
    res.status(201).json({
      message: "Announcement posted successfully",
      announcementId: saved._id,
    });

  } catch (error) {
    console.error("Error posting announcement:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}






module.exports = {
  getDashboardData,
  getStudentData,
  getProfileData,
  HandelPostAnnouncements,
  
}