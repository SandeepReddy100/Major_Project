const Coder=require('../models/coding');
const Student = require('../models/student');
const Faculty = require('../models/faculty');
const Admin = require('../models/admin');
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');
const getAttendanceModel = require('./GetAttendanceModel');
const attendanceSchema = require('../models/attendance.model');
const ExcelJS = require('exceljs');
const PDFDocument = require("pdfkit");

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

function getShortBatchName(fullBatchName) {
  const parts = fullBatchName.toUpperCase().split(" ");
  let code =
    parts[0] === "SKILLUP"
      ? "SU"
      : parts[0] === "SKILLNEXT"
        ? "SN"
        : parts[0] === "SKILLBRIDGE"
          ? "SB"
          : "NA";

  const number =
    parts
      .find((p) => p.includes("-"))
      ?.split("-")
      .pop() || "";

  return `VI-${code}-${number}`;
};

async function getLeaderBoardData(req, res) {
  try {

    // Get all coders sorted by totalScore
    let AllCoders = await Coder.find()
      .sort({ totalScore: -1 })
      .select("rollno batch handles scores totalScore -_id")
      .lean(); // <-- use lean() so we can freely modify objects

    // Convert handles into URLs
    AllCoders = AllCoders.map(coder => {
      const h = coder.handles || {};
      return {
        ...coder,
        handles: {
          leetcode: h.leetcode ? `https://leetcode.com/u/${h.leetcode}` : null,
          gfg: h.gfg ? `https://www.geeksforgeeks.org/user/${h.gfg}/` : null,
          codechef: h.codechef ? `https://www.codechef.com/users/${h.codechef}` : null,
          hackerank: h.hackerank ? `https://www.hackerrank.com/profile/${h.hackerank}` : null
        }
      };
    });

    res.json({ AllCoders });

  } catch (err) {
    console.error("Error fetching leaderboard data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function HandleChangePassword(req, res) {
    try {
        const { username, role, oldPassword, newPassword } = req.body;

        // Pick correct model
        let Model, Check;
        if (role === "student") { Model = Student; Check = "rollno"; }
        else if (role === "faculty") { Model = Faculty; Check = "facultyid"; }
        else if (role === "admin") { Model = Admin; Check = "adminId"; }
        else return res.status(400).json({ error: "Invalid role" });

        const query = {};
        query[Check] = new RegExp(`^${username}$`, "i");
        const user = await Model.findOne(query);

        if (!user) return res.status(404).json({ error: "User not found" });

        // Check old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: "Old password is incorrect" });

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        res.json({ message: "Password updated successfully" });

    } catch (err) {
        console.error("Password change error:", err);
        res.status(500).json({ error: "Server error" });
    }
};

async function HandleResetPassword(req, res) {
  try {
    const { username, role } = req.body;

    if (!username || !role) {
      return res.status(400).json({ error: "Username and role are required" });
    }

    // ✅ Determine targetRole and default password
    const currentYear = new Date().getFullYear().toString();
    const lastTwoDigits = currentYear.slice(-2);

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
      Model = Student;
      Check = "rollno";
    } else {
      return res.status(400).json({ error: "Invalid username format" });
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
  try {
    // 1. Get all students
    let students = await Student.find()
      .select("rollno name batch -_id")
      .lean();

    // 2. For each student, fetch attendance
    const AllStudents = await Promise.all(
      students.map(async (student) => {
        try {
          // format batch name into collectionName
          const batchFormatted = student.batch
            .replace(/BATCH/gi, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase();

          const collectionName = `attendance_${batchFormatted}`;
          const AttendanceModel = mongoose.model(
            collectionName,
            attendanceSchema,
            collectionName
          );

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

async function HandleBatchAttendanceReportPDF(req, res) {
  try {
    const { batch, date } = req.query;
    if (!batch || !date) {
      return res.status(400).json({ message: "Missing batch or date parameter" });
    }

    const reportDate = date;
    const displayDate = new Date(date).toLocaleDateString("en-GB").split("/").join("-");

    const Attendance = getAttendanceModel(batch);
    const attendanceRecords = await Attendance.find({});
    const sampleStudent = await Student.findOne({ rollno: attendanceRecords[0]?.rollno });
    const batchName = sampleStudent?.batch || "UNKNOWN BATCH";
    const shortBatchName = getShortBatchName(batchName);

    const students = await Student.find({ batch: batchName }).sort({ branch: 1, rollno: 1 });

    // Compute presence for all students
    const allStudentData = students.map((student) => {
      const attendance = attendanceRecords.find((a) => a.rollno === student.rollno);
      const isPresent = attendance?.dailyLogs?.some((log) => log.date === reportDate && log.status === "present") || false;
      return { student, isPresent };
    });

    // Separate students into present and absent lists
    const absentStudents = allStudentData.filter((entry) => !entry.isPresent);
    const presentStudents = allStudentData.filter((entry) => entry.isPresent);

    const doc = new PDFDocument({ size: "A4", margin: 30 });
    const filename = `${shortBatchName}_${displayDate}.pdf`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // Main Document Header
    doc.fontSize(16).font("Helvetica-Bold").text("Institute of Aeronautical Engineering", { align: "center" });
    doc.fontSize(12).font("Helvetica").text("Career Development Center", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).font("Helvetica-Bold").text(`PAT Attendance Summary`, { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`Date: ${displayDate}`, { align: "center" });
    doc.moveDown(1);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(1);
    doc.fontSize(11).font("Helvetica-Bold").text(`Batch: ${shortBatchName}`);
    doc.moveDown(0.5);

    // --- Section 1: Complete Report ---
    const totalSummaryText = `Total Students: ${allStudentData.length}`;
    const presentSummaryText = `Present: ${presentStudents.length}`;
    const absentSummaryText = `Absent: ${absentStudents.length}`;
    drawTable(doc, allStudentData, {
      title: "Complete Report (Present & Absent)",
      totalSummary: totalSummaryText,
      presentSummary: presentSummaryText,
      absentSummary: absentSummaryText
    });

    // --- Section 2: Absent Only List ---
    if (absentStudents.length > 0) {
      doc.addPage();
      const absentSummary = `Total Absentees: ${absentStudents.length}`;
      drawTable(doc, absentStudents, {
        title: "Absenties Report",
        absentSummary: absentSummary
      });
    }

    // --- Section 3: Present Only List ---
    if (presentStudents.length > 0) {
      doc.addPage();
      const presentSummary = `Total Present: ${presentStudents.length}`;
      drawTable(doc, presentStudents, {
        title: "Presenties Report",
        presentSummary: presentSummary
      });
    }

    doc.end();
  } catch (err) {
    console.error("Error generating attendance PDF:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

async function HandleBatchAttendanceReportExcel(req, res) {
  try {
    const { batch, date } = req.query;
    if (!batch || !date) {
      return res.status(400).json({ message: "Missing batch or date parameter" });
    }

    const reportDate = date;
    const displayDate = new Date(date).toLocaleDateString("en-GB").split("/").join("-");

    const Attendance = getAttendanceModel(batch);
    const attendanceRecords = await Attendance.find({});

    // **FIXED: Correctly determine the full batch name from the requested batch**
    let batchName = "UNKNOWN BATCH";
    if (attendanceRecords.length > 0 && attendanceRecords[0].rollno) {
      // Find a sample student from the attendance records to get the full batch name
      const sampleStudent = await Student.findOne({ rollno: attendanceRecords[0].rollno });
      if (sampleStudent) {
        batchName = sampleStudent.batch;
      }
    } else {
      // Fallback if no attendance records exist for that day yet
      // We find a student whose batch name contains the requested batch identifier (e.g., "2021-2025")
      const studentInBatch = await Student.findOne({ batch: new RegExp(batch, "i") });
      if (studentInBatch) {
        batchName = studentInBatch.batch;
      } else {
        return res.status(404).json({ message: `No students or attendance data could be linked to the batch identifier: ${batch}` });
      }
    }
    
    const shortBatchName = getShortBatchName(batchName);
    const students = await Student.find({ batch: batchName }).sort({ branch: 1, rollno: 1 });

    const allStudentData = students.map((student) => {
      const attendance = attendanceRecords.find((a) => a.rollno === student.rollno);
      const isPresent = attendance?.dailyLogs?.some(
        (log) => log.date === reportDate && log.status === "present"
      ) || false;

      return {
        rollno: student.rollno,
        name: student.name || "UNKNOWN NAME",
        branch: student.branch || "UNKNOWN",
        status: isPresent ? "Present" : "Absent",
      };
    });

    const absentStudents = allStudentData.filter((s) => s.status === "Absent");
    const presentStudents = allStudentData.filter((s) => s.status === "Present");

    const workbook = new ExcelJS.Workbook();
    const filename = `${shortBatchName}_${displayDate}.xlsx`;

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

      sheet.mergeCells(currentRow, 1, currentRow, numColumns);
      const dateHeader = sheet.getCell(currentRow, 1);
      dateHeader.value = `PAT Attendance Summary - Date: ${displayDate}`;
      dateHeader.font = { bold: true, size: 14 };
      dateHeader.alignment = { horizontal: 'center' };
      currentRow += 2; // Add a space

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
      
      // **FIXED: Explicitly set the header cell values**
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
      "Complete Attendance Report", {
        total: `Total Students: ${allStudentData.length}`,
        present: `Present: ${presentStudents.length}`,
        absent: `Absent: ${absentStudents.length}`
      }
    );

    if (absentStudents.length > 0) {
      createWorksheet(
        "Absent Students",
        absentStudents,
        "Absenties Report", {
          single: `Total Absentees: ${absentStudents.length}`
        }
      );
    }

    if (presentStudents.length > 0) {
      createWorksheet(
        "Present Students",
        presentStudents,
        "Present Only Report", {
          single: `Total Present: ${presentStudents.length}`
        }
      );
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
        `${branch} Attendance Report`, {
          total: `Total: ${branchData.length}`,
          present: `Present: ${branchPresent}`,
          absent: `Absent: ${branchAbsent}`
        }
      );
    }

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Error generating attendance Excel:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

async function HandleMarkAttendance(req, res) {
  try {
    const { collectionName, date, course, presentMap } = req.body;

    // 🛡️ Input validation
    if (!collectionName || !date || !course || typeof presentMap !== "object") {
      return res.status(400).json({ message: "Missing or invalid input data" });
    }

    const batchFormatted = collectionName
      .replace(/BATCH/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    const Attendance = getAttendanceModel(batchFormatted);
    const now = new Date();

    // Normalize date
    const normalizeDate = (d) => new Date(d).toISOString().split("T")[0];
    const reqDate = normalizeDate(date);

    // Get attendance docs (for updating attendance collection)
    const attendanceDocs = await Attendance.find();

    // 🔍 Check if attendance already marked for this course & date
    const alreadyMarkedDocs = attendanceDocs.filter(doc =>
      doc.dailyLogs.some(log =>
        normalizeDate(log.date) === reqDate && log.course === course
      )
    );

    if (alreadyMarkedDocs.length > 0) {
      // Count present & absent from already marked logs
      let presentiesCount = 0;
      let absenteesCount = 0;

      for (const doc of alreadyMarkedDocs) {
        const log = doc.dailyLogs.find(
          l => normalizeDate(l.date) === reqDate && l.course === course
        );
        if (log) {
          if (log.status === "present") presentiesCount++;
          else absenteesCount++;
        }
      }

      return res.status(400).json({
        message: `Attendance already posted for this batch: ${course} on ${reqDate}`
      });
    }

    // 🎯 Validate QR hash using Student collection
    const rollnos = Object.keys(presentMap); // rollnos sent in request
    const students = await Student.find(
      { rollno: { $in: rollnos } },
      { rollno: 1, qrData: 1 }
    );

    // Build a set of rollnos validated by QR + track mismatches
    const validatedPresentSet = new Set();
    const mismatchedStudents = [];

    for (const student of students) {
      const expectedHash = student.qrData; // stored hash
      const providedHash = presentMap[student.rollno]; // hash from client
      if (expectedHash && providedHash && expectedHash === providedHash) {
        validatedPresentSet.add(student.rollno);
      } else {
        mismatchedStudents.push(student.rollno);
      }
    }

    const bulkUpdates = [];
    const updatedStudents = [];

    // 🚀 Process each student in attendance collection
    for (const doc of attendanceDocs) {
      const { rollno, dailyLogs } = doc;
      const isPresent = validatedPresentSet.has(rollno);

      const hasAnyMarkedToday = dailyLogs.some(
        log => normalizeDate(log.date) === reqDate
      );

      const newLog = {
        date,
        course,
        status: isPresent ? "present" : "absent"
      };

      const incOps = {
        [`courseAttendance.${course}.totalDays`]: 1
      };

      if (isPresent) {
        incOps[`courseAttendance.${course}.presentDays`] = 1;
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
            $set: { lastUpdated: now }
          }
        }
      });

      updatedStudents.push({ rollno, status: newLog.status });
    }

    if (bulkUpdates.length > 0) {
      await Attendance.bulkWrite(bulkUpdates);
    }

    // 📊 Count present & absent students
    const presentiesCount = updatedStudents.filter(s => s.status === "present").length;
    const absenteesCount = updatedStudents.filter(s => s.status === "absent").length;

    return res.status(200).json({
      message: `Attendance marked successfully for course: ${course} on ${reqDate}`,
      totalMarked: updatedStudents.length,
      presentiesCount,
      absenteesCount,
      mismatchedStudents
    });

  } catch (error) {
    console.error("Error marking attendance:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
};

async function HandleSessionPostAttendance(req, res) {
  try {
    const { course, students, batch, date, status } = req.body;

    if (!course || !Array.isArray(students) || !batch || !date || !status) {
      return res
        .status(400)
        .json({ message: "Missing course, students, batch, date, or status" });
    }

    if (!["present", "absent"].includes(status.toLowerCase())) {
      return res
        .status(400)
        .json({ message: "Invalid status. Must be 'present' or 'absent'." });
    }

    const targetDate = new Date(date).toISOString().split("T")[0];
    const courseKey = course.trim();
    const batchFormatted = batch
      .replace(/BATCH/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    const Attendance = getAttendanceModel(batchFormatted);

    // 🔍 Check if already marked
    const alreadyMarked = await Attendance.findOne({
      dailyLogs: { $elemMatch: { date: targetDate, course: courseKey } }
    });
    if (alreadyMarked) {
      return res.status(400).json({
        message: `Attendance already posted for this batch: ${courseKey} on ${targetDate}`
      });
    }

    // 🔍 Get all students in batch
    const allStudents = await Attendance.find({}, { rollno: 1, _id: 0 });
    const allRollnos = allStudents.map((s) => s.rollno);

    const inputSet = new Set(students);

    // ✅ Prepare bulk operations
    const bulkOps = [];
    let presentCount = 0;
    let absentCount = 0;

    allRollnos.forEach((rollno) => {
      let isPresent;

      if (status.toLowerCase() === "present") {
        // Input list = present
        isPresent = inputSet.has(rollno);
      } else {
        // Input list = absent
        isPresent = !inputSet.has(rollno);
      }

      if (isPresent) presentCount++;
      else absentCount++;

      const update = {
        $push: {
          dailyLogs: {
            date: targetDate,
            course: courseKey,
            status: isPresent ? "present" : "absent"
          }
        },
        $set: { lastUpdated: new Date() },
        $inc: {
          "overallAttendance.totalDays": 1,
          [`courseAttendance.${courseKey}.totalDays`]: 1
        }
      };

      if (isPresent) {
        update.$inc["overallAttendance.presentDays"] = 1;
        update.$inc[`courseAttendance.${courseKey}.presentDays`] = 1;
      }

      bulkOps.push({
        updateOne: {
          filter: { rollno },
          update
        }
      });
    });

    const result = await Attendance.bulkWrite(bulkOps, { ordered: false });

    res.status(200).json({
      message: `Attendance posted for ${courseKey} on ${targetDate}`,
      presentCount,
      absentCount,
      updatedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("❌ Error in HandleSessionPostAttendance:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


async function getStudentsByBatch(req, res) {
  try {
    const { batch } = req.params;

    // ✅ Validation
    if (!batch) {
      return res.status(400).json({ message: "Missing batch parameter" });
    }

    // ✅ Get Attendance Model
    let Attendance;
    try {
      Attendance = getAttendanceModel(batch);
    } catch (err) {
      return res
        .status(404)
        .json({ message: `Batch collection not found: ${batch}` });
    }

    // ✅ Fetch students in that batch
    const students = await Attendance.find({}, { rollno: 1, _id: 0 });

    if (!students || students.length === 0) {
      return res
        .status(404)
        .json({ message: `No students found for batch '${batch}'` });
    }

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
    const { date, batches } = req.body;

    // 🛡️ Input validation
    if (!date || typeof batches !== "object" || Object.keys(batches).length === 0) {
      return res.status(400).json({ message: "Missing or invalid input data" });
    }

    const now = new Date();
    const normalizeDate = (d) => new Date(d).toISOString().split("T")[0];
    const reqDate = normalizeDate(date);

    const results = [];

    // 🔁 Iterate over batches map
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

      const batchFormatted = batchName
        .replace(/BATCH/gi, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

      const Attendance = getAttendanceModel(batchFormatted);

      // If no map exists for this batch, skip
      if (Object.keys(presentMap).length === 0) {
        results.push({
          batch: batchFormatted,
          status: "skipped",
          message: "No present map provided"
        });
        continue;
      }

      // 📄 Fetch attendance docs
      const attendanceDocs = await Attendance.find();

      // 🔍 Check if already marked for this batch+course+date
      const alreadyMarkedDocs = attendanceDocs.filter(doc =>
        doc.dailyLogs.some(
          log => normalizeDate(log.date) === reqDate && log.course === course
        )
      );

      if (alreadyMarkedDocs.length > 0) {
        results.push({
          batch: batchFormatted,
          status: "skipped",
          message: `Attendance already marked for course ${course} on ${reqDate}`
        });
        continue;
      }

      // 🎯 Validate QR hashes
      const rollnos = Object.keys(presentMap);
      const students = await Student.find(
        { rollno: { $in: rollnos } },
        { rollno: 1, qrData: 1 }
      );

      const validatedPresentSet = new Set();
      const mismatchedStudents = [];

      for (const student of students) {
        const expectedHash = student.qrData;
        const providedHash = presentMap[student.rollno];
        if (expectedHash && providedHash && expectedHash === providedHash) {
          validatedPresentSet.add(student.rollno);
        } else {
          mismatchedStudents.push(student.rollno);
        }
      }

      const bulkUpdates = [];
      const updatedStudents = [];

      for (const doc of attendanceDocs) {
        const { rollno, dailyLogs } = doc;
        const isPresent = validatedPresentSet.has(rollno);

        const hasAnyMarkedToday = dailyLogs.some(
          log => normalizeDate(log.date) === reqDate
        );

        const newLog = {
          date,
          course,
          status: isPresent ? "present" : "absent"
        };

        const incOps = {
          [`courseAttendance.${course}.totalDays`]: 1
        };

        if (isPresent) {
          incOps[`courseAttendance.${course}.presentDays`] = 1;
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
              $set: { lastUpdated: now }
            }
          }
        });

        updatedStudents.push({ rollno, status: newLog.status });
      }

      if (bulkUpdates.length > 0) {
        await Attendance.bulkWrite(bulkUpdates);
      }

      const presentiesCount = updatedStudents.filter(s => s.status === "present").length;
      const absenteesCount = updatedStudents.filter(s => s.status === "absent").length;

      results.push({
        batch: batchFormatted,
        status: "updated",
        totalMarked: updatedStudents.length,
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
    console.error("Error marking attendance:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
};

async function getStudentsByBatches(req, res) {
  try {
    const { batches } = req.query;

    // ✅ Validation
    if (!batches) {
      return res.status(400).json({ message: "Missing 'batches' query parameter" });
    }

    // ✅ Split comma-separated string into array
    const batchList = batches.split(",").map((b) => b.trim());

    if (batchList.length === 0) {
      return res.status(400).json({ message: "No valid batches provided" });
    }

    const result = {};

    for (const batch of batchList) {
      try {
        const Attendance = getAttendanceModel(batch);

        const students = await Attendance.find({}, { rollno: 1, _id: 0 });

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


module.exports={
    getLeaderBoardData,
    HandleChangePassword,
    HandleResetPassword,
    getViewStudentData,
    HandleBatchAttendanceReportPDF,
    HandleBatchAttendanceReportExcel,
    HandleMarkAttendance,
    HandleSessionPostAttendance,
    getStudentsByBatch,
    HandleMarkAttendanceMultipleBatches,
    getStudentsByBatches
}