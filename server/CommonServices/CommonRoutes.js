const Coder = require('../models/coding');
const Faculty = require('../models/faculty');
const Admin = require('../models/admin');
const { attendanceSchema } = require('../models/attendance.model');
const { studentSchema } = require('../models/Student');
const Announcement = require('../models/Announcement');
const BackupAttendance = require("../models/BackUp");
const MetaData = require('../models/metadata')
const TimeTable = require("../models/timetable");

const mongoose = require("mongoose");

const getModel = require('./getModel');
const bcrypt = require("bcryptjs");
const ExcelJS = require('exceljs');
const CryptoJS = require("crypto-js");
require("dotenv").config();

const EncDec_SECRET_KEY = process.env.SECRET_KEY;



const drawTable = (doc, data, { title, totalSummary, presentSummary, absentSummary }) => {
  doc.moveDown(1.5);

  // Section Title
  doc.font("Helvetica-Bold").fontSize(14).text(title, { align: "center" });
  doc.moveDown(0.5);

  const tableColumns = [
    { key: "sno", width: 40, align: "center" },
    { key: "rollno", width: 90, align: "center" },
    { key: "name", width: 200, align: "left" },
    { key: "branch", width: 100, align: "center" },
    { key: "status", width: 60, align: "center" }
  ];
  const rowHeight = 20;

  // Draw initial headers
  let y = drawTableHeaders(doc, doc.y);

  // Draw table data with alternating and conditional row colors
  doc.font("Helvetica").fontSize(10);
  let sno = 1;

  data.forEach((entry, index) => {
    const isPresent = entry.isPresent;
    const statusText = isPresent ? "Present" : "Absent";
    const statusColor = isPresent ? "#2E7D32" : "#C62828";
    const rowBgColor = index % 2 === 0 ? "#F5F5F5" : "#FFFFFF"; // Alternating row color

    // Check for new page and redraw headers if necessary
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top + 30;
      y = drawTableHeaders(doc, y);
    }

    // Draw row background
    doc.fillColor(rowBgColor).rect(doc.page.margins.left, y, 540, rowHeight).fill();

    const rowData = [
      sno.toString(),
      entry.student.rollno,
      entry.student.name,
      entry.student.branch || "UNKNOWN",
      statusText
    ];

    let currentX = doc.page.margins.left;
    rowData.forEach((text, i) => {
      // Apply conditional color and font for the status column
      if (tableColumns[i].key === "status") {
        doc.fillColor(statusColor).font("Helvetica-Bold");
      } else {
        doc.fillColor("#000000").font("Helvetica");
      }

      doc.text(text, currentX, y + 5, {
        width: tableColumns[i].width,
        align: tableColumns[i].align
      });
      currentX += tableColumns[i].width;
    });

    y += rowHeight;
    sno++;
  });

  // Draw summary section
  doc.moveDown(1.5);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const currentY = doc.y;

  if (totalSummary && presentSummary && absentSummary) {
    // Combined report summary
    doc.text(totalSummary, doc.page.margins.left, currentY, { width: pageWidth / 3, align: "left" });
    doc.fillColor("#2E7D32").text(presentSummary, doc.page.margins.left + pageWidth / 3, currentY, { width: pageWidth / 3, align: "center" });
    doc.fillColor("#C62828").text(absentSummary, doc.page.margins.left + (pageWidth * 2 / 3), currentY, { width: pageWidth / 3, align: "right" });
  } else if (absentSummary) {
    // Absent-only report summary
    doc.fillColor("#C62828").text(absentSummary, { align: "center" });
  } else if (presentSummary) {
    // Present-only report summary
    doc.fillColor("#2E7D32").text(presentSummary, { align: "center" });
  }
};

const drawTableHeaders = (doc, y) => {
  const tableColumns = [
    { label: "S.No", width: 40, align: "center" },
    { label: "Roll No", width: 90, align: "center" },
    { label: "Name", width: 200, align: "left" },
    { label: "Branch", width: 100, align: "center" },
    { label: "Status", width: 60, align: "center" }
  ];

  let currentX = doc.page.margins.left;
  const headerHeight = 20;

  // Draw a solid background for the header row
  doc.fillColor("#34495e").rect(currentX, y, 540, headerHeight).fill();

  // Draw header text
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#FFFFFF");
  tableColumns.forEach(column => {
    doc.text(column.label, currentX, y + 5, {
      width: column.width,
      align: column.align
    });
    currentX += column.width;
  });

  // Reset font and color for subsequent rows
  doc.font("Helvetica").fontSize(10).fillColor("#000000");

  return y + headerHeight;
};

async function getLeaderBoardData(req, res) {
  try {
    let allCoders = await Coder.find()
      .sort({ totalScore: -1 })
      .select("rollno name batch handles scores totalScore -_id")
      .lean();

    const uniqueBatches = new Set();
    let studentPosition = null;

    const transformedCoders = allCoders.map((coder, index) => {
      if (coder.batch) uniqueBatches.add(coder.batch);


      if (req.user && req.user.role === 'student' && coder.rollno === req.user.userId) {
        studentPosition = index + 1;
      }

      const h = coder.handles || {};
      return {
        ...coder,
        handles: {
          leetcode: h.leetcode ? `https://leetcode.com/u/${h.leetcode}` : null,
          gfg: h.gfg ? `https://www.geeksforgeeks.org/user/${h.gfg}/` : null,
          codechef: h.codechef ? `https://www.codechef.com/users/${h.codechef}` : null,
          hackerank: h.hackerank ? `https://www.hackerrank.com/profile/${h.hackerank}` : null,
          github: h.github ? `https://github.com/${h.github}` : null
        }
      };
    });

    const response = {
      success: true,
      batches: Array.from(uniqueBatches).sort(),
      AllCoders: transformedCoders
    };

    // Only add position field if the user is a student
    if (req.user && req.user.role === 'student') {
      response.myPosition = studentPosition;
    }

    res.status(200).json(response);

  } catch (err) {
    console.error("Error fetching leaderboard data:", err);
    res.status(500).json({
      success: false,
      error: "Server error while fetching leaderboard data"
    });
  }
};

async function HandleChangePassword(req, res) {
  try {
    const { semname, username, oldPassword, newPassword } = req.body;

    //-------------------------------
    // 1. Basic Validation
    //-------------------------------
    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({
        error: "username, oldPassword and newPassword are required",
      });
    }

    const role = req.user.role;

    if (role === "student" && !semname) {
      return res.status(400).json({
        error: "semname is required for student role",
      });
    }

    //-------------------------------
    // 2. Model Selection
    //-------------------------------
    let Model, CheckField;

    if (role === "student") {
      const sem = semname.toUpperCase(); // normalize SEM name
      Model = getModel(`${sem}-SEM-students`, studentSchema);
      CheckField = "rollno";
    } else if (role === "faculty") {
      Model = Faculty;
      CheckField = "facultyid";
    } else if (role === "admin") {
      Model = Admin;
      CheckField = "adminId";
    } else {
      return res.status(400).json({ error: "Invalid role" });
    }

    //-------------------------------
    // 3. Database Query
    //-------------------------------
    const query = {
      [CheckField]: {
        $regex: new RegExp(`^${username}$`, "i"),
      },
    };

    const user = await Model.findOne(query).select("+password");;

    if (!user) {
      return res.status(404).json({
        error: "User not found. Please check username/sem.",
      });
    }

    //-------------------------------
    // 4. Verify Old Password
    //-------------------------------
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        error: "Old password is incorrect",
      });
    }

    //-------------------------------
    // 5. Update New Password
    //-------------------------------
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;

    await user.save();

    //-------------------------------
    // 6. Success Response
    //-------------------------------
    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("⚠️ Change Password Error:", err);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
}

async function HandleResetPassword(req, res) {
  try {
    const { semname, username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username are required" });
    }

    const role = req.user.role;


    // ✅ Determine targetRole and default password
    const currentYear = new Date().getFullYear().toString();
    const lastTwoDigits = currentYear.slice(-2);
    let StudentModel;

    let targetRole, defaultPassword, Model, Check;

    if (username.toLowerCase().startsWith("iare")) {
      // Faculty
      targetRole = "faculty";
      defaultPassword = `${username}@${lastTwoDigits}`;
      Model = Faculty;
      Check = "facultyid";
    } else if (/^2\d+/.test(username)) {
      // Student
      targetRole = "student";
      defaultPassword = `pat@${currentYear}`;
      Model = StudentModel;
      Check = "rollno";
    } else {
      return res.status(400).json({ error: "Invalid username format" });
    }
    if (targetRole === 'student' && !semname) {
      return res.status(400).json({ error: "semname are required for student password reset" });
    }
    if (targetRole === 'student') {
      StudentModel = getModel(`${semname}-SEM-students`, studentSchema);
      Model = StudentModel;
    }
    // ✅ Permission checks
    if (role === "student") {
      return res.status(403).json({ error: "Students are not allowed to reset passwords" });
    }

    if (role === "faculty" && targetRole !== "student") {
      return res.status(403).json({ error: "Faculty can reset only student passwords" });
    }

    if (role === "admin" && !["student", "faculty"].includes(targetRole)) {
      return res.status(403).json({ error: "Admin can reset only student or faculty passwords" });
    }

    // ✅ Query the correct model
    const query = {};
    query[Check] = new RegExp(`^${username}$`, "i");

    const user = await Model.findOne(query);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Hash and update default password
    const hashedNewPassword = await bcrypt.hash(defaultPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.json({
      message: `Password reset successfully for ${targetRole} ${username}`,
      defaultPassword, // 👈 return default password to show admin/faculty what was set
    });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function getViewStudentData(req, res) {
  const { semname } = req.params;
  const StudentModel = getModel(`${semname}-SEM-students`, studentSchema);

  if (StudentModel === null) {
    return res.status(400).json({ error: "Invalid semester name or student model not found" });
  }
  try {
    // 1. Get all students
    let students = await StudentModel.find()
      .select("rollno name batch -_id")
      .lean();

    // 2. For each student, fetch attendance
    const AllStudents = await Promise.all(
      students.map(async (student) => {
        try {
          // format batch name into collectionName
          const batchFormatted = student.batch
          const collectionName = `${semname}-SEM-attendance-${batchFormatted}`;
          const AttendanceModel = getModel(collectionName, attendanceSchema);

          // find attendance by rollno
          let attendance = await AttendanceModel.findOne({
            rollno: new RegExp(`^${student.rollno}$`, "i"),
          })
            .select("overallAttendance courseAttendance dailyLogs -_id")
            .lean(); // <-- important: bypass schema casting


          // strip _id from dailyLogs
          if (attendance && attendance.dailyLogs) {
            attendance.dailyLogs = attendance.dailyLogs.map(({ _id, ...rest }) => rest);
          }

          // merge student + attendance
          return {
            ...student,
            ...(attendance || {}) // spread only if attendance exists
          };
        } catch (err) {
          console.error(`Error fetching attendance for ${student.rollno}:`, err);
          return student; // fallback to just student info
        }
      })
    );

    res.json({ AllStudents });
  } catch (err) {
    console.error("Error fetching Students data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

function getSafeDayFromDate(dateString) {
  const dateObj = new Date(dateString);

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid date string provided");
  }

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  return days[dateObj.getDay()];
};

async function HandleBatchAttendanceReportPDF(req, res) {
  try {
    const { semname, batch, date } = req.query;

    if (!semname || !batch || !date) {
      return res.status(400).json({ message: "Missing semname, batch, or date parameter" });
    }

    const reportDate = date;
    const displayDate = new Date(date).toLocaleDateString("en-GB").split("/").join("-");
    const cleanBatch = batch.trim();
    const cleanSem = semname.trim();

    // 1. Determine Session by current IST Time
    const currentISTHour = parseInt(
      new Date().toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "numeric",
      }),
      10
    );

    // Assuming 13:00 (1:00 PM) is the cutoff point between FN and AN
    const currentSession = currentISTHour < 13 ? "FN" : "AN";
    const Day = getSafeDayFromDate(date); // Ensure this helper exists in this file

    // 2. Fetch TimeTable to get target courses for the detected session
    const timetables = await TimeTable.find({
      sem: cleanSem,
      batch: cleanBatch,
      weekSchedule: {
        $elemMatch: {
          day: Day,
          periods: { $elemMatch: { session: currentSession } }
        }
      }
    });

    let targetCourses = [];
    if (timetables && timetables.length > 0) {
      const daySchedule = timetables[0].weekSchedule.find(d => d.day === Day);
      if (daySchedule) {
        targetCourses = daySchedule.periods
          .filter(p => p.session === currentSession)
          .map(p => p.subject)
          .filter(Boolean);
      }
    }

    // 3. Get Student Models
    const StudentModel = getModel(`${semname}-SEM-students`, studentSchema);
    const students = await StudentModel.find({ batch: cleanBatch })
      .sort({ branch: 1, rollno: 1 })
      .lean();

    if (!students || students.length === 0) {
      return res.status(404).json({ message: `No students found in batch ${batch}` });
    }

    const batchFormatted = `${semname}-SEM-attendance-${cleanBatch}`;
    const Attendance = getModel(batchFormatted, attendanceSchema);

    const attendanceRecords = await Attendance.find({
      dailyLogs: {
        $elemMatch: { date: reportDate }
      }
    }).lean();

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({
        message: `No attendance records found for batch ${batch} on ${displayDate}. Please take attendance first.`
      });
    }

    // 4. Map Data with Session Filtering
    const allStudentData = students.map((student) => {
      const record = attendanceRecords.find((a) => a.rollno === student.rollno);

      // Check presence ONLY for the courses in the current detected session
      const isPresent = record?.dailyLogs?.some(
        (log) =>
          log.date === reportDate &&
          targetCourses.includes(log.course) &&
          log.status.toLowerCase() === "present"
      ) || false;

      // Retained your AICML branch fix
      let branch = student.branch || "UNKNOWN";
      if (branch === "AICML") {
        branch = "AI&ML";
      }

      const updatedStudent = { ...student, branch };

      return { student: updatedStudent, isPresent };
    });

    const absentStudents = allStudentData.filter((entry) => !entry.isPresent);
    const presentStudents = allStudentData.filter((entry) => entry.isPresent);

    // --- PDF GENERATION STARTS HERE ---
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ size: "A4", margin: 30 });

    // Updated filename to include the detected session
    const filename = `CDC-${semname}-SEM-${cleanBatch}_${displayDate}_${currentSession}.pdf`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // Header
    doc.fontSize(16).font("Helvetica-Bold").text("Institute of Aeronautical Engineering", { align: "center" });
    doc.fontSize(12).font("Helvetica").text("Career Development Center", { align: "center" });
    doc.moveDown(0.5);
    // Updated header to display the session
    doc.fontSize(14).font("Helvetica-Bold").text(` ${semname} - SEM PAT Attendance Summary (${currentSession})`, { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`Date: ${displayDate}`, { align: "center" });
    doc.moveDown(1);
    doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke();
    doc.moveDown(1);
    doc.fontSize(11).font("Helvetica-Bold").text(`Batch: ${batch}`);
    doc.moveDown(0.5);

    // Section 1: Complete Report
    drawTable(doc, allStudentData, {
      title: `${cleanBatch} Report (Present & Absent) - ${currentSession}`,
      totalSummary: `Total Students: ${allStudentData.length}`,
      presentSummary: `Present: ${presentStudents.length}`,
      absentSummary: `Absent: ${absentStudents.length}`
    });

    // Section 2: Absentees
    if (absentStudents.length > 0) {
      doc.addPage();
      drawTable(doc, absentStudents, {
        title: `Absentees Report - ${currentSession}`,
        absentSummary: `Total Absentees: ${absentStudents.length}`
      });
    }

    // Section 3: Presenties
    if (presentStudents.length > 0) {
      doc.addPage();
      drawTable(doc, presentStudents, {
        title: `Presenties Report - ${currentSession}`,
        presentSummary: `Total Present: ${presentStudents.length}`
      });
    }

    doc.end();

  } catch (err) {
    console.error("Error generating PDF:", err);
    if (!res.headersSent) res.status(500).json({ message: "Server Error" });
  }
};

async function HandleBatchAttendanceReportExcel(req, res) {
  try {
    const { semname, batch, date } = req.query;
    if (!semname || !batch || !date) {
      return res.status(400).json({ message: "Missing semname, batch, or date parameter" });
    }

    const reportDate = date;
    const displayDate = new Date(date).toLocaleDateString("en-GB").split("/").join("-");

    const cleanSem = semname.trim();
    const cleanBatch = batch.trim();

    // 1. Determine Session by current IST Time (Background check)
    const currentISTHour = parseInt(
      new Date().toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "numeric",
      }),
      10
    );

    // 13:00 (1:00 PM) is the cutoff point between FN and AN
    const currentSession = currentISTHour < 13 ? "FN" : "AN";
    const Day = getSafeDayFromDate(date); // Ensure this helper function exists in your file

    // 2. Fetch TimeTable to get target courses for the detected session
    const timetables = await TimeTable.find({
      sem: cleanSem,
      batch: cleanBatch,
      weekSchedule: {
        $elemMatch: {
          day: Day,
          periods: { $elemMatch: { session: currentSession } }
        }
      }
    });

    let targetCourses = [];
    if (timetables && timetables.length > 0) {
      const daySchedule = timetables[0].weekSchedule.find(d => d.day === Day);
      if (daySchedule) {
        targetCourses = daySchedule.periods
          .filter(p => p.session === currentSession)
          .map(p => p.subject)
          .filter(Boolean);
      }
    }

    // 3. Database Queries
    const batchFormatted = `${cleanSem}-SEM-attendance-${cleanBatch}`;
    const StudentModel = getModel(`${cleanSem}-SEM-students`, studentSchema);
    const Attendance = getModel(batchFormatted, attendanceSchema);

    // Optimized: Only fetch attendance logs for the specific date
    const attendanceRecords = await Attendance.find({
      dailyLogs: { $elemMatch: { date: reportDate } }
    }).lean();

    let batchName = cleanBatch;
    const students = await StudentModel.find({ batch: batchName }).sort({ branch: 1, rollno: 1 }).lean();

    // 4. Map Data with Session Filtering
    const allStudentData = students.map((student) => {
      const attendance = attendanceRecords.find((a) => a.rollno === student.rollno);

      // Strict Check: Must be the right date, right course for the session, and "present"
      const isPresent = attendance?.dailyLogs?.some(
        (log) =>
          log.date === reportDate &&
          targetCourses.includes(log.course) &&
          log.status.toLowerCase() === "present"
      ) || false;

      // AICML Branch Fix
      let branch = student.branch || "UNKNOWN";
      if (branch === "AICML") {
        branch = "AI&ML";
      }

      return {
        rollno: student.rollno,
        name: student.name || "UNKNOWN NAME",
        branch: branch,
        status: isPresent ? "Present" : "Absent",
      };
    });

    const absentStudents = allStudentData.filter((s) => s.status === "Absent");
    const presentStudents = allStudentData.filter((s) => s.status === "Present");

    // --- EXCEL GENERATION STARTS HERE ---
    const ExcelJS = require('exceljs'); // Ensure this is required
    const workbook = new ExcelJS.Workbook();

    // Appended the currentSession to the filename
    const filename = `CDC-${cleanSem}-SEM-${batchName}_${displayDate}_${currentSession}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const createWorksheet = (sheetName, data, title, summary = {}) => {
      const sheet = workbook.addWorksheet(sheetName);
      const columns = [
        { header: "S.No", key: "sno", width: 8 },
        { header: "Roll No", key: "rollno", width: 18 },
        { header: "Name", key: "name", width: 35 },
        { header: "Branch", key: "branch", width: 15 },
        { header: "Status", key: "status", width: 12 },
      ];
      sheet.columns = columns;
      const numColumns = columns.length;
      let currentRow = 1;

      // Main Document Header
      sheet.mergeCells(currentRow, 1, currentRow, numColumns);
      const mainHeader = sheet.getCell(currentRow, 1);
      mainHeader.value = "Institute of Aeronautical Engineering";
      mainHeader.font = { bold: true, size: 16 };
      mainHeader.alignment = { horizontal: 'center' };
      currentRow++;

      sheet.mergeCells(currentRow, 1, currentRow, numColumns);
      const subHeader = sheet.getCell(currentRow, 1);
      subHeader.value = "Career Development Center";
      subHeader.font = { size: 12 };
      subHeader.alignment = { horizontal: 'center' };
      currentRow++;

      // Updated to show the session in the header
      sheet.mergeCells(currentRow, 1, currentRow, numColumns);
      const dateHeader = sheet.getCell(currentRow, 1);
      dateHeader.value = `${cleanSem}-SEM PAT Attendance Summary (${currentSession}) - Date: ${displayDate}`;
      dateHeader.font = { bold: true, size: 14 };
      dateHeader.alignment = { horizontal: 'center' };
      currentRow += 2;

      // Section Title
      sheet.mergeCells(currentRow, 1, currentRow, numColumns);
      const sectionTitle = sheet.getCell(currentRow, 1);
      sectionTitle.value = title;
      sectionTitle.font = { bold: true, size: 14 };
      sectionTitle.alignment = { horizontal: 'center' };
      currentRow++;

      // Summary Section
      if (summary.total) {
        sheet.mergeCells(currentRow, 1, currentRow, 2);
        const totalCell = sheet.getCell(currentRow, 1);
        totalCell.value = summary.total;
        totalCell.font = { bold: true, size: 11 };
        totalCell.alignment = { horizontal: 'left' };

        sheet.mergeCells(currentRow, 3, currentRow, 3);
        const presentCell = sheet.getCell(currentRow, 3);
        presentCell.value = summary.present;
        presentCell.font = { bold: true, size: 11, color: { argb: "FF2E7D32" } };
        presentCell.alignment = { horizontal: 'center' };

        sheet.mergeCells(currentRow, 4, currentRow, 5);
        const absentCell = sheet.getCell(currentRow, 4);
        absentCell.value = summary.absent;
        absentCell.font = { bold: true, size: 11, color: { argb: "FFC62828" } };
        absentCell.alignment = { horizontal: 'right' };
      } else if (summary.single) {
        sheet.mergeCells(currentRow, 1, currentRow, numColumns);
        const singleSummaryCell = sheet.getCell(currentRow, 1);
        singleSummaryCell.value = summary.single;
        singleSummaryCell.font = { bold: true, size: 11 };
        singleSummaryCell.alignment = { horizontal: 'center' };
      }
      currentRow += 2;

      // Table Headers
      const headerRow = sheet.getRow(currentRow);
      headerRow.height = 20;
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

      headerRow.values = columns.map(c => c.header);

      headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF34495E" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Table Data
      data.forEach((item, idx) => {
        const row = sheet.addRow({
          sno: idx + 1,
          ...item
        });

        const rowBgColor = (idx % 2 === 0) ? "FFF5F5F5" : "FFFFFFFF";

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { vertical: 'middle', horizontal: sheet.getColumn(colNumber).key === 'name' ? 'left' : 'center' };
          cell.font = { size: 10 };
        });

        const statusCell = row.getCell('status');
        if (item.status === 'Present') {
          statusCell.font = { bold: true, color: { argb: 'FF2E7D32' }, size: 10 };
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
        } else if (item.status === 'Absent') {
          statusCell.font = { bold: true, color: { argb: 'FFC62828' }, size: 10 };
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
        }
      });
    };

    // --- Create all necessary worksheets ---
    createWorksheet(
      "Complete Report",
      allStudentData,
      `${batch} Attendance Report - ${currentSession}`, {
      total: `Total Students: ${allStudentData.length}`,
      present: `Present: ${presentStudents.length}`,
      absent: `Absent: ${absentStudents.length}`
    });

    if (absentStudents.length > 0) {
      createWorksheet(
        "Absent Students",
        absentStudents,
        `Absenties Report - ${currentSession}`, {
        single: `Total Absentees: ${absentStudents.length}`
      });
    }

    if (presentStudents.length > 0) {
      createWorksheet(
        "Present Students",
        presentStudents,
        `Present Only Report - ${currentSession}`, {
        single: `Total Present: ${presentStudents.length}`
      });
    }

    const groupedByBranch = allStudentData.reduce((acc, student) => {
      acc[student.branch] = acc[student.branch] || [];
      acc[student.branch].push(student);
      return acc;
    }, {});

    for (const branch in groupedByBranch) {
      const branchData = groupedByBranch[branch];
      const branchPresent = branchData.filter(s => s.status === 'Present').length;
      const branchAbsent = branchData.length - branchPresent;

      createWorksheet(
        `${branch} Report`,
        branchData,
        `${branch} Attendance Report - ${currentSession}`, {
        total: `Total: ${branchData.length}`,
        present: `Present: ${branchPresent}`,
        absent: `Absent: ${branchAbsent}`
      });
    }

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Error generating attendance Excel:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// async function HandleMarkAttendanceByQR(req, res) {
//   try {
//     const { semname, batch, date, course, presentMap } = req.body;

//     if (!semname || !batch || !date || !course || typeof presentMap !== "object") {
//       return res.status(400).json({ message: "Missing or invalid input data" });
//     }

//     const batchFormatted = `${semname}-SEM-attendance-${batch}`;
//     const Attendance = getModel(batchFormatted, attendanceSchema);
//     const now = new Date();

//     const normalizeDate = (d) => new Date(d).toISOString().split("T")[0];
//     const reqDate = normalizeDate(date);

//     const attendanceDocs = await Attendance.find();

//     const alreadyMarkedDocs = attendanceDocs.filter(doc =>
//       doc.dailyLogs.some(log =>
//         normalizeDate(log.date) === reqDate && log.course === course
//       )
//     );

//     if (alreadyMarkedDocs.length > 0) {
//       return res.status(400).json({
//         message: `Attendance already posted for this batch: ${course} on ${reqDate}`
//       });
//     }

//     const studentModelName = `${semname}-SEM-students`;
//     const Student = getModel(studentModelName, studentSchema);

//     const allBatchStudents = await Student.find(

//       { batch: batch },
//       { rollno: 1, qrData: 1 }
//     );

//     if (allBatchStudents.length === 0) {
//       return res.status(404).json({ message: `No students found for batch ${batch} in ${semname}` });
//     }

//     const validatedPresentSet = new Set();
//     const mismatchedStudents = [];

//     for (const student of allBatchStudents) {
//       const expectedHash = student.qrData;
//       const providedHash = presentMap[student.rollno];

//       if (providedHash) {
//         if (expectedHash && expectedHash === providedHash) {
//           validatedPresentSet.add(student.rollno);
//         } else {
//           mismatchedStudents.push(student.rollno);
//         }
//       }
//     }

//     const bulkUpdates = [];
//     const updatedStudents = [];

//     for (const student of allBatchStudents) {
//       const rollno = student.rollno;
//       const isPresent = validatedPresentSet.has(rollno);

//       const existingDoc = attendanceDocs.find(d => d.rollno === rollno);
//       const dailyLogs = existingDoc ? existingDoc.dailyLogs : [];

//       const hasAnyMarkedToday = dailyLogs.some(
//         log => normalizeDate(log.date) === reqDate
//       );

//       const newLog = {
//         date,
//         course,
//         status: isPresent ? "present" : "absent"
//       };

//       const incOps = {
//         [`courseAttendance.${course}.totalDays`]: 1
//       };

//       if (isPresent) {
//         incOps[`courseAttendance.${course}.presentDays`] = 1;
//       }

//       if (!hasAnyMarkedToday) {
//         incOps["overallAttendance.totalDays"] = 1;
//         if (isPresent) {
//           incOps["overallAttendance.presentDays"] = 1;
//         }
//       }

//       bulkUpdates.push({
//         updateOne: {
//           filter: { rollno },
//           update: {
//             $push: { dailyLogs: newLog },
//             $inc: incOps,
//             $set: { lastUpdated: now },
//             $setOnInsert: { rollno }
//           },
//           upsert: true
//         }
//       });

//       updatedStudents.push({ rollno, status: newLog.status });
//     }

//     if (bulkUpdates.length > 0) {
//       await Attendance.bulkWrite(bulkUpdates);
//     }

//     const presentiesCount = updatedStudents.filter(s => s.status === "present").length;
//     const absenteesCount = updatedStudents.filter(s => s.status === "absent").length;

//     return res.status(200).json({
//       message: `Attendance marked successfully for course: ${course} on ${reqDate}`,
//       totalMarked: updatedStudents.length,
//       presentiesCount,
//       absenteesCount,
//       mismatchedStudents
//     });

//   } catch (error) {
//     console.error("Error marking attendance:", error);
//     if (!res.headersSent) {
//       return res.status(500).json({ message: "Internal server error" });
//     }
//   }
// };

async function HandleSessionPostAttendance(req, res) {

  try {
    const { semname, course, students, batch, date, status } = req.body;

    if (!semname || !course || !Array.isArray(students) || !batch || !date || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!["present", "absent"].includes(status.toLowerCase())) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const targetDate = new Date(date).toISOString().split("T")[0];
    const courseKey = course.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    const batchFormatted = `${semname}-SEM-attendance-${batch}`;

    // Get the Model using your dynamic loader
    const Attendance =
      mongoose.models[batchFormatted] ||
      mongoose.model(batchFormatted, attendanceSchema);

    const alreadyMarked = await Attendance.findOne({
      dailyLogs: { $elemMatch: { date: targetDate, course: courseKey } }
    });

    if (alreadyMarked) {
      return res.status(400).json({
        message: `Attendance already posted for ${courseKey} on ${targetDate}`
      });
    }

    const allStudents = await Attendance.find({}, { rollno: 1, _id: 0 }).lean();

    if (!allStudents || allStudents.length === 0) {
      return res.status(404).json({ message: "No student records found in this batch collection." });
    }

    const dbRollnos = allStudents.map((s) => {
      return s.rollno ? String(s.rollno).trim() : null;
    }).filter(r => r !== null); // Remove any nulls if data is corrupted

    const inputSet = new Set(students.map(s => String(s).trim()));

    let presentCount = 0;
    let absentCount = 0;

    const bulkOps = dbRollnos.map((rollno) => {

      const isPresent = status.toLowerCase() === "present"
        ? inputSet.has(rollno)
        : !inputSet.has(rollno);

      if (isPresent) presentCount++;
      else absentCount++;

      // Construct Atomic Updates
      const incObject = {
        "overallAttendance.totalDays": 1,
        [`courseAttendance.${courseKey}.totalDays`]: 1
      };

      if (isPresent) {
        incObject["overallAttendance.presentDays"] = 1;
        incObject[`courseAttendance.${courseKey}.presentDays`] = 1;
      }

      return {
        updateOne: {
          filter: { rollno: rollno }, // Filter by the sanitized rollno
          update: {
            $push: {
              dailyLogs: {
                date: targetDate,
                course: courseKey,
                status: isPresent ? "present" : "absent"
              }
            },
            $set: { lastUpdated: new Date() },
            $inc: incObject
          }
        }
      };
    });

    // console.log(`[DEBUG] Final Counts - Present: ${presentCount}, Absent: ${absentCount}`);

    if (bulkOps.length > 0) {
      // Use .collection.bulkWrite to bypass Mongoose validation entirely for speed
      const result = await Attendance.collection.bulkWrite(bulkOps, { ordered: false });

      res.status(200).json({
        message: `Attendance posted for ${courseKey}`,
        presentCount,
        absentCount,
        updatedCount: result.modifiedCount
      });
    } else {
      res.status(200).json({ message: "No students to update." });
    }

  } catch (err) {
    console.error("❌ Error in HandleSessionPostAttendance:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

async function HandleMarkAttendanceByQR(req, res) {
  try {
    const {
      semname,
      batch,
      date,
      course,
      presentMap
    } = req.body;

    // --------------------------------------------------
    // 1. Validate request
    // --------------------------------------------------

    if (
      !semname ||
      !batch ||
      !date ||
      !course ||
      !presentMap ||
      typeof presentMap !== "object" ||
      Array.isArray(presentMap)
    ) {
      return res.status(400).json({
        message: "Missing or invalid input data"
      });
    }

    // --------------------------------------------------
    // 2. Normalize date
    // --------------------------------------------------

    const normalizeDate = (value) => {
      const parsedDate = new Date(value);

      if (Number.isNaN(parsedDate.getTime())) {
        return null;
      }

      return parsedDate.toISOString().split("T")[0];
    };

    const reqDate = normalizeDate(date);

    if (!reqDate) {
      return res.status(400).json({
        message: "Invalid date"
      });
    }

    const normalizedCourse = String(course).trim();

    if (!normalizedCourse) {
      return res.status(400).json({
        message: "Course is required"
      });
    }

    // --------------------------------------------------
    // 3. Attendance model
    // --------------------------------------------------

    const batchFormatted =
      `${semname}-SEM-attendance-${batch}`;

    const Attendance = getModel(
      batchFormatted,
      attendanceSchema
    );

    // --------------------------------------------------
    // 4. Check duplicate attendance
    // --------------------------------------------------

    const alreadyPosted = await Attendance.exists({
      dailyLogs: {
        $elemMatch: {
          date: reqDate,
          course: normalizedCourse
        }
      }
    });

    if (alreadyPosted) {
      return res.status(400).json({
        message:
          `Attendance already posted for this batch: ${normalizedCourse} on ${reqDate}`
      });
    }

    // --------------------------------------------------
    // 5. Student model
    // --------------------------------------------------

    const studentModelName =
      `${semname}-SEM-students`;

    const Student = getModel(
      studentModelName,
      studentSchema
    );

    // --------------------------------------------------
    // 6. Get students
    // --------------------------------------------------

    const allBatchStudents = await Student.find(
      { batch },
      {
        rollno: 1,
        name: 1,
        batch: 1,
        branch: 1,
        qrData: 1
      }
    ).lean();

    if (allBatchStudents.length === 0) {
      return res.status(404).json({
        message:
          `No students found for batch ${batch} in ${semname}`
      });
    }

    // --------------------------------------------------
    // 7. Validate QR codes
    // --------------------------------------------------

    const validatedPresentSet = new Set();
    const mismatchedStudents = [];

    for (const student of allBatchStudents) {
      const rollno = student.rollno;

      if (!rollno) {
        continue;
      }

      const expectedHash = student.qrData;
      const providedHash = presentMap[rollno];

      if (!providedHash) {
        continue;
      }

      if (
        expectedHash &&
        expectedHash === providedHash
      ) {
        validatedPresentSet.add(rollno);
      } else {
        mismatchedStudents.push(rollno);
      }
    }

    // --------------------------------------------------
    // 8. Get existing attendance documents
    // --------------------------------------------------

    const existingAttendanceDocs =
      await Attendance.find(
        {
          rollno: {
            $in: allBatchStudents.map(
              student => student.rollno
            )
          }
        },
        {
          rollno: 1,
          courseAttendance: 1,
          overallAttendance: 1
        }
      ).lean();

    const existingAttendanceMap = new Map(
      existingAttendanceDocs.map(doc => [
        doc.rollno,
        doc
      ])
    );

    // --------------------------------------------------
    // 9. Prepare bulk operations
    // --------------------------------------------------

    const bulkUpdates = [];
    const updatedStudents = [];
    const now = new Date();

    for (const student of allBatchStudents) {
      const rollno = student.rollno;

      if (!rollno) {
        continue;
      }

      const isPresent =
        validatedPresentSet.has(rollno);

      const existingDoc =
        existingAttendanceMap.get(rollno);

      const courseAttendance =
        existingDoc?.courseAttendance || {};

      const existingCourseData =
        courseAttendance[normalizedCourse];

      const newLog = {
        date: reqDate,
        course: normalizedCourse,
        status: isPresent
          ? "present"
          : "absent"
      };

      // ------------------------------------------------
      // Existing student attendance document
      // ------------------------------------------------

      if (existingDoc) {
        const update = {
          $push: {
            dailyLogs: newLog
          },

          $set: {
            lastUpdated: now
          }
        };

        // ----------------------------------------------
        // Course attendance already exists
        // ----------------------------------------------

        if (existingCourseData) {
          update.$inc = {
            [`courseAttendance.${normalizedCourse}.totalDays`]: 1
          };

          if (isPresent) {
            update.$inc[
              `courseAttendance.${normalizedCourse}.presentDays`
            ] = 1;
          }
        }

        // ----------------------------------------------
        // Course attendance doesn't exist
        // ----------------------------------------------

        else {
          update.$set[
            `courseAttendance.${normalizedCourse}`
          ] = {
            totalDays: 1,
            presentDays: isPresent ? 1 : 0
          };
        }

        // ----------------------------------------------
        // Overall attendance
        // ----------------------------------------------

        update.$inc = update.$inc || {};

        update.$inc[
          "overallAttendance.totalDays"
        ] = 1;

        if (isPresent) {
          update.$inc[
            "overallAttendance.presentDays"
          ] = 1;
        }

        bulkUpdates.push({
          updateOne: {
            filter: {
              _id: existingDoc._id
            },
            update
          }
        });
      }

      // ------------------------------------------------
      // Student attendance document doesn't exist
      // ------------------------------------------------

      else {
        const newAttendanceDocument = {
          rollno,
          name: student.name || "needtoupdate",
          branch: student.branch || "",
          batch: student.batch || "",

          overallAttendance: {
            totalDays: 1,
            presentDays: isPresent ? 1 : 0
          },

          courseAttendance: {
            [normalizedCourse]: {
              totalDays: 1,
              presentDays: isPresent ? 1 : 0
            }
          },

          dailyLogs: [
            newLog
          ],

          createdAt: now,
          lastUpdated: now
        };

        bulkUpdates.push({
          insertOne: {
            document: newAttendanceDocument
          }
        });
      }

      updatedStudents.push({
        rollno,
        status: newLog.status
      });
    }

    // --------------------------------------------------
    // 10. Execute bulk operation
    // --------------------------------------------------

    if (bulkUpdates.length > 0) {
      await Attendance.bulkWrite(
        bulkUpdates,
        {
          ordered: false
        }
      );
    }

    // --------------------------------------------------
    // 11. Counts
    // --------------------------------------------------

    const presentiesCount =
      updatedStudents.filter(
        student => student.status === "present"
      ).length;

    const absenteesCount =
      updatedStudents.filter(
        student => student.status === "absent"
      ).length;

    // --------------------------------------------------
    // 12. Response
    // --------------------------------------------------

    return res.status(200).json({
      message:
        `Attendance marked successfully for course: ${normalizedCourse} on ${reqDate}`,

      totalMarked:
        updatedStudents.length,

      presentiesCount,

      absenteesCount,

      mismatchedStudents
    });

  } catch (error) {
    console.error(
      "Error marking attendance:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Internal server error"
      });
    }
  }
}

async function getStudentsByBatch(req, res) {
  try {
    const { semname, batch } = req.query;
    // ✅ Validation
    if (!semname || !batch) {
      return res.status(400).json({ message: "Missing semname or batch parameter" });
    }

    const batchFormatted = `${semname}-SEM-attendance-${batch}`;
    // ✅ Get Attendance Model
    let Attendance;
    try {
      Attendance = getModel(batchFormatted, attendanceSchema);
    } catch (err) {
      return res
        .status(404)
        .json({ message: `Batch collection not found: ${batch}` });
    }

    // ✅ Fetch students in that batch
    const students = await Attendance.find({}, { rollno: 1, _id: 0 }).lean();

    // if (students.length > 0) {
    //   // console.log("First Student Found:", students[0]);
    // } else {
    //   console.log("No students found matching query");
    // }

    if (!students || students.length === 0) {
      return res
        .status(404)
        .json({ message: `No students found for batch '${batch}'` });
    }
    // console.log(students);
    const rollnos = students.map((s) => s.rollno);

    res.status(200).json({
      batch,
      total: rollnos.length,
      students: rollnos
    });
  } catch (err) {
    console.error("❌ Error fetching students by batch:", err);
    res.status(500).json({ message: "Server error" });
  }
};

async function HandleMarkAttendanceMultipleBatches(req, res) {
  try {
    const { semname, date, batches } = req.body;

    if (!semname || !date || typeof batches !== "object" || Object.keys(batches).length === 0) {
      return res.status(400).json({ message: "Missing or invalid input data" });
    }

    const now = new Date();
    const normalizeDate = (d) => new Date(d).toISOString().split("T")[0];
    const reqDate = normalizeDate(date);

    const results = [];

    for (const [batchName, batchData] of Object.entries(batches)) {
      const { course, presentMap } = batchData;

      if (!course || !presentMap) {
        results.push({
          batch: batchName,
          status: "skipped",
          message: "Course or presentMap missing"
        });
        continue;
      }

      if (Object.keys(presentMap).length === 0) {
        results.push({
          batch: batchName,
          status: "skipped",
          message: "No present map provided"
        });
        continue;
      }

      const batchFormatted = `${semname}-SEM-attendance-${batchName}`;
      const StudentModel = mongoose.models[`${semname}-SEM-students`] || mongoose.model(`${semname}-SEM-students`, studentSchema);

      const Attendance =
        mongoose.models[batchFormatted] ||
        mongoose.model(batchFormatted, attendanceSchema);

      const attendanceDocs = await Attendance.find(
        {},
        {
          rollno: 1,
          dailyLogs: 1
        }
      );

      const attendanceMap = new Map(
        attendanceDocs.map(doc => [doc.rollno, doc])
      );

      const cleanCourse = course.trim().toUpperCase();

      const alreadyMarked = attendanceDocs.some(doc =>
        doc.dailyLogs.some(
          log =>
            normalizeDate(log.date) === reqDate &&
            (log.course || "").trim().toUpperCase() === cleanCourse
        )
      );

      if (alreadyMarked) {
        results.push({
          batch: batchFormatted,
          status: "skipped",
          message: `Attendance already marked for course ${cleanCourse} on ${reqDate}`
        });
        continue;
      }

      const allBatchStudents = await StudentModel.find(
        { batch: batchName },
        { rollno: 1, qrData: 1 }
      );

      if (allBatchStudents.length === 0) {
        results.push({
          batch: batchFormatted,
          status: "skipped",
          message: `No students found for batch ${batchName} in ${semname}`
        });
        continue;
      }

      const validatedPresentSet = new Set();
      const mismatchedStudents = [];

      for (const student of allBatchStudents) {
        const expectedHash = student.qrData;
        const providedHash = presentMap[student.rollno];

        if (providedHash) {
          if (expectedHash && expectedHash === providedHash) {
            validatedPresentSet.add(student.rollno);
          } else {
            mismatchedStudents.push(student.rollno);
          }
        }
      }

      const bulkUpdates = [];
      const updatedStudents = [];

      for (const student of allBatchStudents) {
        const rollno = student.rollno;
        const isPresent = validatedPresentSet.has(rollno);

        const existingDoc = attendanceMap.get(rollno);
        const dailyLogs = existingDoc ? existingDoc.dailyLogs : [];

        const hasAnyMarkedToday = dailyLogs.some(
          log => normalizeDate(log.date) === reqDate
        );

        const newLog = {
          date: reqDate,
          course: cleanCourse,
          status: isPresent ? "present" : "absent"
        };

        const incOps = {
          [`courseAttendance.${cleanCourse}.totalDays`]: 1
        };

        if (isPresent) {
          incOps[`courseAttendance.${cleanCourse}.totalDays`] = 1;
        }

        if (!hasAnyMarkedToday) {
          incOps["overallAttendance.totalDays"] = 1;
          if (isPresent) {
            incOps["overallAttendance.presentDays"] = 1;
          }
        }

        bulkUpdates.push({
          updateOne: {
            filter: { rollno },
            update: {
              $push: { dailyLogs: newLog },
              $inc: incOps,
              $set: { lastUpdated: now },
              $setOnInsert: { rollno }
            },
            upsert: true
          }
        });

        updatedStudents.push({ rollno, status: newLog.status });
      }

      if (bulkUpdates.length > 0) {
        await Attendance.bulkWrite(bulkUpdates);
      }



      results.push({
        batch: batchFormatted,
        status: "updated",
        totalMarked: presentiesCount + absenteesCount,
        presentiesCount,
        absenteesCount,
        mismatchedStudents
      });
    }

    return res.status(200).json({
      message: `Attendance processing completed on ${reqDate}`,
      results
    });

  } catch (error) {
    console.error("Error marking multiple batch attendance:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

async function getStudentsByBatches(req, res) {
  try {
    const { semname, batches } = req.query;

    // ✅ Validation
    if (!semname || !batches) {
      return res.status(400).json({ message: "Missing 'semname' or 'batches' query parameter" });
    }

    // ✅ Split comma-separated string into array
    const batchList = batches.split(",").map((b) => b.trim());

    if (batchList.length === 0) {
      return res.status(400).json({ message: "No valid batches provided" });
    }

    const result = {};

    for (const batch of batchList) {
      try {

        const batchFormatted = `${semname}-SEM-attendance-${batch}`;
        const Attendance = getModel(batchFormatted, attendanceSchema);

        const students = await Attendance.find({}, { rollno: 1, _id: 0 }).lean();

        if (!students || students.length === 0) {
          result[batch] = {
            total: 0,
            students: [],
            message: `No students found for batch '${batch}'`,
          };
        } else {
          const rollnos = students.map((s) => s.rollno);
          result[batch] = {
            total: rollnos.length,
            students: rollnos,
          };
        }
      } catch (err) {
        result[batch] = {
          total: 0,
          students: [],
          message: `Batch collection not found: ${batch}`,
        };
      }
    }

    res.status(200).json({ batches: result });
  } catch (err) {
    console.error("❌ Error fetching students by batches:", err);
    res.status(500).json({ message: "Server error" });
  }
};

async function getSemesterDetails(req, res) {

  const { semname } = req.params;

  try {

    await syncMetaData()

    const doc = await MetaData.findOne({ semesterName: semname }).lean();

    if (!doc) {
      // console.log(`No metadata found for semester: ${semname}`);
      return res.status(404).json({
        success: false,
        message: "Semester not found",
        data: {
          semester: semname,
          batches: [],
          courses: []
        }
      });
    }

    // 1. Extract and Sort Batches Alphabetically
    const batches = doc.batches
      ? doc.batches.map(b => b.batchName).sort((a, b) => a.localeCompare(b))
      : [];

    // 2. Extract, Deduplicate, and Sort Courses Alphabetically
    const courses = doc.batches
      ? [...new Set(doc.batches.flatMap(b => b.courses))].sort((a, b) => a.localeCompare(b))
      : [];

    return res.status(200).json({
      success: true,
      data: {
        semester: doc.semesterName,
        batches,
        courses,
        isActive: doc.isActive
      }
    });

  } catch (error) {
    console.error("Error fetching semester details:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching semester details"
    });
  }
};

async function getAttendanceConfigurations(req, res) {
  try {
    const { semname } = req.params;

    await syncMetaData();

    const result = await MetaData.findOne({ semesterName: semname }).lean(); // Added .lean() for better performance

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No configurations found for semester: ${semname}`
      });
    }

    // Sort the batches (config) alphabetically by name
    const sortedConfig = result.batches
      .map(batch => ({
        name: batch.batchName,
        totalCourses: batch.courses.length,
        // Sort the courses inside each batch alphabetically
        availableCourses: batch.courses.sort((a, b) => a.localeCompare(b))
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      success: true,
      data: {
        semester: result.semesterName,
        active: result.isActive,
        lastUpdated: result.updatedAt,
        config: sortedConfig
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

async function logout(req, res) {
  try {

    res.clearCookie('webToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully. Cookie destroyed."
    });

  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

async function createAnnouncement(req, res) {
  try {
    const {
      title,
      description,
      category,
      priority,
      deadline,
      linkUrl,         // <--- 1. The Form Link
      googleSheetUrl,  // <--- 2. The Sheet Link (for sync)
      targetBatches,
      targetSemesters,
      isGlobal,
      isMandatory
    } = req.body;

    const userId = req.user ? req.user.userId : null;

    // 1. Basic Validation
    if (!title || !description || !userId) {
      return res.status(400).json({ msg: "Title, Description, and User are required." });
    }

    // 2. Validate Category
    const validCategories = ['GENERAL', 'FORMS', 'ASSESSMENTS', 'EVENTS', 'REGISTRATIONS'];

    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Allowed: ${validCategories.join(', ')}` });
    }

    // 3. Construct the Object
    const newAnnouncement = new Announcement({
      title,
      userId,
      description,
      category: category || 'GENERAL',
      priority: priority || 1,
      deadline: deadline ? new Date(deadline) : null,

      // Save both links
      linkUrl: linkUrl || "",
      googleSheetUrl: googleSheetUrl || "",

      isGlobal: isGlobal || false,
      isMandatory: isMandatory || false,
      targetBatches: targetBatches || [],
      targetSemesters: targetSemesters || [],
      filledStudents: []
    });

    // 4. Save to DB
    const savedAnnouncement = await newAnnouncement.save();

    res.status(201).json({
      msg: "Announcement posted successfully!",
      data: savedAnnouncement
    });

  } catch (err) {
    console.error("❌ Error creating announcement:", err);
    res.status(500).json({ msg: err });
  }
};

async function getAllAnnouncements(req, res) {
  try {
    // Assuming req.user contains the current logged-in admin's ID
    const currentUserId = req.user ? (req.user.userId || req.user.id) : null;

    // Fetch all docs, sorted by priority (High first) and then by creation date (Newest first)
    const allDocs = await Announcement.find({}).sort({ priority: -1, createdAt: -1 });

    const groupedData = {
      global: [],
      yourPosts: [],
      semesters: {}
    };

    allDocs.forEach((doc) => {
      // 1. Check if it belongs to the current user's "yourPosts"
      // Note: Ensure your Announcement model has a 'postedby' field if you want to use this feature.
      // If not, this check will just be skipped or always false.
      if (doc.postedby && currentUserId && doc.postedby.toString() === currentUserId.toString()) {
        groupedData.yourPosts.push(doc);
      }

      // 2. Check if it is Global
      if (doc.isGlobal) {
        groupedData.global.push(doc);
      } else {
        // 3. Group by Semester and Batch
        if (doc.targetSemesters && doc.targetSemesters.length > 0) {
          doc.targetSemesters.forEach((sem) => {
            if (!groupedData.semesters[sem]) {
              groupedData.semesters[sem] = {};
            }

            if (doc.targetBatches && doc.targetBatches.length > 0) {
              // If specific batches are targeted, add to each batch list
              doc.targetBatches.forEach((batch) => {
                if (!groupedData.semesters[sem][batch]) {
                  groupedData.semesters[sem][batch] = [];
                }
                // Avoid duplicates if logic allows adding same doc multiple times
                // Here we just push it.
                groupedData.semesters[sem][batch].push(doc);
              });
            } else {
              // Semester-wide announcements (Target Sem exists, but Target Batches is empty)
              if (!groupedData.semesters[sem]["ALL_BATCHES"]) {
                groupedData.semesters[sem]["ALL_BATCHES"] = [];
              }
              groupedData.semesters[sem]["ALL_BATCHES"].push(doc);
            }
          });
        } else {
          // Fallback: If not global and no semester targeting, maybe put in 'General' or ignore
          // For now, let's treat them as essentially global or uncategorized if needed
          // groupedData.global.push(doc); 
        }
      }
    });

    res.status(200).json(groupedData);

  } catch (error) {
    console.error("❌ Error fetching announcements:", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

async function modifyAnnouncement(req, res) {
  try {
    const {
      id, // The MongoDB _id of the announcement
      title,
      description,
      category,
      deadline,
      priority,
      linkUrl,         // <--- New field
      googleSheetUrl,
      targetBatches,
      targetSemesters,
      isGlobal,
      isMandatory      // <--- New field
    } = req.body;

    const { userId } = req.user || {};
    if (!id) {
      return res.status(400).json({ msg: "Announcement ID is required in the body." });
    }

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ msg: "Announcement not found." });
    }

    // Optional: Check if the user is the one who posted it
    if (announcement.postedby && announcement.postedby.toString() !== userId) {
      return res.status(403).json({ msg: "Unauthorized: You do not have permission to edit this post." });
    }

    // Validate Category if provided
    const validCategories = ['GENERAL', 'FORMS', 'ASSESSMENTS', 'EVENTS', 'REGISTRATIONS'];

    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Allowed: ${validCategories.join(', ')}` });
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      {
        $set: {
          title: title || announcement.title,
          description: description || announcement.description,
          category: category || announcement.category,
          deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : announcement.deadline,
          priority: priority !== undefined ? priority : announcement.priority,
          linkUrl: linkUrl !== undefined ? linkUrl : announcement.linkUrl,
          googleSheetUrl: googleSheetUrl !== undefined ? googleSheetUrl : announcement.googleSheetUrl,
          targetBatches: targetBatches || announcement.targetBatches,
          targetSemesters: targetSemesters || announcement.targetSemesters,
          isGlobal: isGlobal !== undefined ? isGlobal : announcement.isGlobal,
          isMandatory: isMandatory !== undefined ? isMandatory : announcement.isMandatory
        }
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      msg: "Announcement updated successfully",
      data: updatedAnnouncement
    });

  } catch (error) {
    console.error("❌ Error modifying announcement:", error);
    res.status(500).json({ msg: "Internal Server Error", error: error.message });
  }
};

async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Announcement.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("Error deleting announcement:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function getMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: user not found in request" });
    }
    const payload = {
      role: req.user.role,
      sem: req.user.sem,
      batch: req.user.batch,
      userId: req.user.userId
    };
    return res.status(200).json({
      data: encryptData(payload)
    });

  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


async function backup(req, res) {
  try {
    const {
      studentRolls,
      batch,
      sem,
      session,
      date
    } = req.body;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (
      !Array.isArray(studentRolls) ||
      studentRolls.length === 0 ||
      !batch ||
      !sem ||
      !session ||
      !date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "sem, batch, session, date and studentRolls are required."
      });
    }

    const normalizedSem = sem.trim().toUpperCase();
    const normalizedBatch = batch.trim().toUpperCase();
    const normalizedSession = session.trim().toUpperCase();

    // ==========================================
    // VALIDATE SESSION
    // ==========================================

    if (!["FN", "AN"].includes(normalizedSession)) {
      return res.status(400).json({
        success: false,
        message: "Session must be either FN or AN."
      });
    }

    // ==========================================
    // VALIDATE DATE
    // ==========================================

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date. Use YYYY-MM-DD."
      });
    }

    // ==========================================
    // CLEAN ROLL NUMBERS
    // ==========================================

    const cleanedRolls = [
      ...new Set(
        studentRolls
          .filter(Boolean)
          .map((roll) =>
            String(roll)
              .trim()
              .toUpperCase()
          )
          .filter(Boolean)
      )
    ];

    if (cleanedRolls.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No valid student roll numbers provided."
      });
    }

    // ==========================================
    // CHECK IF BACKUP ALREADY EXISTS
    // ==========================================

    const existingBackup =
      await BackupAttendance.findOne({
        sem: normalizedSem,
        batch: normalizedBatch,

        [`attendanceRecords.${normalizedSession}.${date}`]: {
          $exists: true
        }
      });

    if (existingBackup) {
      return res.status(409).json({
        success: false,
        message:
          `Backup already exists for ${normalizedSem}-${normalizedBatch} ${normalizedSession} on ${date}.`
      });
    }

    // ==========================================
    // CREATE BACKUP
    // ==========================================

    const attendancePath =
      `attendanceRecords.${normalizedSession}.${date}`;

    await BackupAttendance.findOneAndUpdate(
      {
        sem: normalizedSem,
        batch: normalizedBatch
      },
      {
        $set: {
          [attendancePath]: cleanedRolls
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(201).json({
      success: true,
      message:
        "Attendance backup created successfully.",
      data: {
        sem: normalizedSem,
        batch: normalizedBatch,
        session: normalizedSession,
        date,
        studentsRecorded: cleanedRolls.length
      }
    });

  } catch (error) {
    console.error(
      "❌ Backup Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create attendance backup."
    });
  }
}



// --------------------------------------- Helper Function's Start---------------------------------------

async function syncMetaData() {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    const attendanceCollections = collectionNames.filter(name => name.includes("-SEM-attendance-"));


    const semGroups = {};
    attendanceCollections.forEach(name => {
      const parts = name.split("-");
      const semLabel = parts[0];
      if (!semGroups[semLabel]) semGroups[semLabel] = [];
      semGroups[semLabel].push(name);
    });

    const activeSemLabels = Object.keys(semGroups);

    for (const semLabel of activeSemLabels) {
      const batchDataArray = [];
      let allCoursesInSem = new Set(); // To keep track of all unique courses in the entire semester

      for (const collectionName of semGroups[semLabel]) {
        const parts = collectionName.split("-");
        const batchName = parts[3];

        const AttendanceModel = getModel(collectionName, attendanceSchema);
        // Find one document to extract the course keys
        const sampleDoc = await AttendanceModel.findOne({}, { courseAttendance: 1 }).lean();

        let batchCourses = [];
        if (sampleDoc && sampleDoc.courseAttendance) {
          batchCourses = Object.keys(sampleDoc.courseAttendance);
          // Add these courses to the semester-wide list
          batchCourses.forEach(course => allCoursesInSem.add(course));
        }

        batchDataArray.push({
          batchName: batchName,
          courses: batchCourses
        });
      }

      // Upsert: This will update existing or create new if it doesn't exist
      await MetaData.findOneAndUpdate(
        { semesterName: semLabel },
        {
          $set: {
            batches: batchDataArray,
            courses: Array.from(allCoursesInSem), // Stores all unique courses in this semester
            isActive: true
          }
        },
        { upsert: true, new: true }
      );
      // console.log(`Updated MetaData for Semester: ${semLabel}`);
    }

    // 4. Handle Deletions (Stale Data)
    // Find all semesters in MetaData that are NOT in our current active list
    await MetaData.updateMany(
      { semesterName: { $nin: activeSemLabels } },
      { $set: { batches: [], courses: [], isActive: false } }
    );

    // Optional: If you want to delete them entirely instead of just marking inactive:
    // await MetaData.deleteMany({ semesterName: { $nin: activeSemLabels } });

    console.log("✅ Metadata Synchronization Complete");
  } catch (error) {
    console.error("❌ Metadata Sync Error:", error);
  }
};

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

// --------------------------------------------------- Helper Function's End-----------------------------


module.exports = {
  getLeaderBoardData,
  HandleChangePassword,
  HandleResetPassword,
  getViewStudentData,
  HandleBatchAttendanceReportPDF,
  HandleBatchAttendanceReportExcel,
  HandleMarkAttendanceByQR,
  HandleSessionPostAttendance,
  getStudentsByBatch,
  HandleMarkAttendanceMultipleBatches,
  getStudentsByBatches,
  getSemesterDetails,
  logout,
  getAttendanceConfigurations,
  createAnnouncement,
  getAllAnnouncements,
  syncMetaData,
  getMe,
  modifyAnnouncement,
  deleteAnnouncement,
  backup
}

