const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");
const Student = require("../models/student");
const getAttendanceModel = require("../services/GetAttendanceModel");
const Faculty = require("../models/faculty");
const Admin = require("../models/admin")
const ExcelJS = require("exceljs");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const Announcement = require("../models/Announcement");
const mongoose = require('mongoose');
const Coder = require('../models/coding');
const bcrypt = require("bcryptjs");

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
}

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

async function HandleSessionAttendanceReportExcel(req, res) {
  const { batch, date, session, format = "excel" } = req.query;

  if (!batch || !date || !session || format !== "excel") {
    return res.status(400).json({
      message: "batch (array), date, session (FN/AN), and format=excel are required",
    });
  }

  const batches = Array.isArray(batch) ? batch : [batch];
  const allSummaries = [];
  const allAbsentees = [];
  const branchWiseSummary = {}; // New object to track branch-wise data

  try {
    for (const b of batches) {
      const collectionName = b;

      const Attendance = getAttendanceModel(collectionName);
      const students = await Attendance.find();

      const branchData = {};

      for (const student of students) {
        const branch = student.branch || "UNKNOWN";
        const shortBatch = getShortBatchName(student.batch);

        if (!branchData[branch]) {
          branchData[branch] = {
            batch: shortBatch,
            branch,
            strength: 0,
            presenties: 0,
            absenties: 0,
            absenteesList: []
          };
        }

        // Initialize branch-wise summary
        if (!branchWiseSummary[branch]) {
          branchWiseSummary[branch] = {
            branch,
            batches: new Set(),
            totalStrength: 0,
            totalPresent: 0,
            totalAbsent: 0,
            absenteesList: []
          };
        }

        const logsForDate = student.dailyLogs?.filter(
          (log) => log.date === date
        );

        const wasPresent = logsForDate?.some(
          (log) => log.status.toLowerCase() === "present"
        );

        branchData[branch].strength++;
        branchWiseSummary[branch].totalStrength++;
        branchWiseSummary[branch].batches.add(shortBatch);

        if (wasPresent) {
          branchData[branch].presenties++;
          branchWiseSummary[branch].totalPresent++;
        } else {
          branchData[branch].absenties++;
          branchWiseSummary[branch].totalAbsent++;
          branchData[branch].absenteesList.push({
            rollno: student.rollno,
            name: student.name,
            branch: student.branch || "UNKNOWN",
            batch: shortBatch
          });
          branchWiseSummary[branch].absenteesList.push({
            rollno: student.rollno,
            name: student.name,
            branch: student.branch || "UNKNOWN",
            batch: shortBatch
          });
        }
      }

      allSummaries.push(...Object.values(branchData));

      // Add absentees for this batch
      Object.values(branchData).forEach(branchInfo => {
        if (branchInfo.absenteesList.length > 0) {
          allAbsentees.push({
            batch: branchInfo.batch,
            branch: branchInfo.branch,
            absentees: branchInfo.absenteesList.sort((a, b) => a.rollno.localeCompare(b.rollno))
          });
        }
      });
    }

    // Convert branchWiseSummary to array and format batches
    const branchWiseData = Object.values(branchWiseSummary).map(branch => ({
      ...branch,
      batches: Array.from(branch.batches).sort().join(', ')
    })).sort((a, b) => a.branch.localeCompare(b.branch));

    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();

    const formatDateForDisplay = (dateString) => {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) return dateString;
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const displayDate = formatDateForDisplay(date);

    const styleHeaders = (sheet, title) => {
      sheet.views = [{ state: 'normal' }];

      const headerRows = [
        ["Institute of Aeronautical Engineering", "1f4e79", 16, "FFFFFF"],
        [`${session} Attendance Summary - ${displayDate}`, "2e75b6", 14, "FFFFFF"],
        ["Career Development Center", "3d85c6", 12, "FFFFFF"],
        [title, "4a90e2", 11, "FFFFFF"],
      ];

      headerRows.forEach(([text, bgColor, fontSize, textColor], i) => {
        const row = sheet.addRow([text, "", "", "", "", ""]);
        sheet.mergeCells(`A${i + 1}:F${i + 1}`);

        row.getCell(1).font = {
          bold: true,
          size: fontSize,
          color: { argb: textColor },
          name: "Calibri"
        };
        row.getCell(1).alignment = {
          horizontal: "center",
          vertical: "middle"
        };
        row.height = fontSize + 8;

        row.eachCell(cell => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bgColor }
          };
          cell.border = {
            top: { style: "medium", color: { argb: "000000" } },
            left: { style: "medium", color: { argb: "000000" } },
            bottom: { style: "medium", color: { argb: "000000" } },
            right: { style: "medium", color: { argb: "000000" } },
          };
        });
      });

      const spacingRow = sheet.addRow(["", "", "", "", "", ""]);
      spacingRow.height = 5;
      spacingRow.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8F9FA" } };
      });
    };

    // Sheet 1: Attendance Summary
    const summarySheet = workbook.addWorksheet("Attendance Summary");
    styleHeaders(summarySheet, "B.Tech VI Semester Attendance Summary");

    const headerRow = summarySheet.addRow(["BATCH", "BRANCH", "Total Strength", "Present", "Absent"]);
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "34495e" } };
      cell.font = { bold: true, size: 12, color: { argb: "FFFFFF" }, name: "Calibri" };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "medium", color: { argb: "000000" } },
        left: { style: "medium", color: { argb: "000000" } },
        bottom: { style: "medium", color: { argb: "000000" } },
        right: { style: "medium", color: { argb: "000000" } },
      };
    });

    summarySheet.columns = [
      { width: 25 },
      { width: 25 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    // Group by batch and sort
    const batchGroups = {};
    allSummaries.forEach(item => {
      if (!batchGroups[item.batch]) batchGroups[item.batch] = [];
      batchGroups[item.batch].push(item);
    });

    // Sort batches and branches
    Object.keys(batchGroups).forEach(batch => {
      batchGroups[batch].sort((a, b) => a.branch.localeCompare(b.branch));
    });

    let totalPresent = 0;
    let totalAbsent = 0;

    Object.entries(batchGroups).sort().forEach(([batchName, rows]) => {
      const groupStartRow = summarySheet.lastRow.number + 1;

      rows.forEach((item, index) => {
        const batchCellValue = index === 0 ? batchName : "";
        const row = summarySheet.addRow([batchCellValue, item.branch, item.strength, item.presenties, item.absenties]);
        totalPresent += item.presenties;
        totalAbsent += item.absenties;
        row.height = 22;

        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Calibri", size: 11 };
          cell.alignment = { vertical: "middle", horizontal: colNumber === 2 ? "left" : "center" };
          cell.border = {
            top: { style: "thin", color: { argb: "CCCCCC" } },
            left: { style: "thin", color: { argb: "CCCCCC" } },
            bottom: { style: "thin", color: { argb: "CCCCCC" } },
            right: { style: "thin", color: { argb: "CCCCCC" } },
          };

          if (colNumber === 4) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D4F3D0" } };
            cell.font = { ...cell.font, color: { argb: "2E7D32" }, bold: true };
          } else if (colNumber === 5) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEBEE" } };
            cell.font = { ...cell.font, color: { argb: "C62828" }, bold: true };
          } else {
            const bgColor = (summarySheet.lastRow.number - groupStartRow) % 2 === 0 ? "F8F9FA" : "FFFFFF";
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          }
        });
      });

      if (rows.length > 1) {
        const groupEndRow = summarySheet.lastRow.number;
        summarySheet.mergeCells(`A${groupStartRow}:A${groupEndRow}`);
        const mergedCell = summarySheet.getCell(`A${groupStartRow}`);
        mergedCell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });

    // Add total summary
    summarySheet.addRow(["", "", "", "", ""]);
    const summaryHeaderRow = summarySheet.addRow(["", "SUMMARY", "", "", ""]);
    summarySheet.mergeCells(`B${summaryHeaderRow.number}:E${summaryHeaderRow.number}`);
    summaryHeaderRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3498DB" } };
    summaryHeaderRow.getCell(2).font = { bold: true, size: 12, color: { argb: "FFFFFF" }, name: "Calibri" };
    summaryHeaderRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };

    const totalRow = summarySheet.addRow([
      "TOTAL",
      `Total Students: ${totalPresent + totalAbsent}`,
      totalPresent + totalAbsent,
      totalPresent,
      totalAbsent,
    ]);

    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 11, color: { argb: "FFFFFF" }, name: "Calibri" };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      const colors = ["34495e", "3498DB", "9B59B6", "27AE60", "E74C3C"];
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors[colNumber - 1] } };
      cell.border = {
        top: { style: "medium", color: { argb: "000000" } },
        left: { style: "medium", color: { argb: "000000" } },
        bottom: { style: "medium", color: { argb: "000000" } },
        right: { style: "medium", color: { argb: "000000" } },
      };
    });

    // Sheet 2: Branch-wise Summary
    const branchSummarySheet = workbook.addWorksheet("Branch-wise Summary");
    styleHeaders(branchSummarySheet, "B.Tech VI Semester Branch-wise Summary");

    const branchHeaderRow = branchSummarySheet.addRow(["VI SEM BRANCH (BATCHES)", "Total Strength", "Present", "Absent"]);
    branchHeaderRow.eachCell((cell, colNumber) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "34495e" } };
      cell.font = { bold: true, size: 12, color: { argb: "FFFFFF" }, name: "Calibri" };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "medium", color: { argb: "000000" } },
        left: { style: "medium", color: { argb: "000000" } },
        bottom: { style: "medium", color: { argb: "000000" } },
        right: { style: "medium", color: { argb: "000000" } },
      };
    });

    branchSummarySheet.columns = [
      { width: 40 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    let branchTotalPresent = 0;
    let branchTotalAbsent = 0;

    branchWiseData.forEach((item, index) => {
      branchTotalPresent += item.totalPresent;
      branchTotalAbsent += item.totalAbsent;

      const row = branchSummarySheet.addRow([
        `${item.branch} (${item.batches})`,
        item.totalStrength,
        item.totalPresent,
        item.totalAbsent
      ]);
      row.height = 22;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 11 };
        cell.alignment = { vertical: "middle", horizontal: colNumber === 1 ? "left" : "center" };
        cell.border = {
          top: { style: "thin", color: { argb: "CCCCCC" } },
          left: { style: "thin", color: { argb: "CCCCCC" } },
          bottom: { style: "thin", color: { argb: "CCCCCC" } },
          right: { style: "thin", color: { argb: "CCCCCC" } },
        };

        if (colNumber === 3) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D4F3D0" } };
          cell.font = { ...cell.font, color: { argb: "2E7D32" }, bold: true };
        } else if (colNumber === 4) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEBEE" } };
          cell.font = { ...cell.font, color: { argb: "C62828" }, bold: true };
        } else {
          const bgColor = index % 2 === 0 ? "F8F9FA" : "FFFFFF";
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        }
      });
    });

    // Add branch-wise total summary
    branchSummarySheet.addRow(["", "", "", ""]);
    const branchSummaryHeaderRow = branchSummarySheet.addRow(["BRANCH-WISE TOTAL SUMMARY", "", "", ""]);
    branchSummarySheet.mergeCells(`A${branchSummaryHeaderRow.number}:D${branchSummaryHeaderRow.number}`);
    branchSummaryHeaderRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3498DB" } };
    branchSummaryHeaderRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FFFFFF" }, name: "Calibri" };
    branchSummaryHeaderRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

    const branchTotalRow = branchSummarySheet.addRow([
      "TOTAL",
      branchTotalPresent + branchTotalAbsent,
      branchTotalPresent,
      branchTotalAbsent,
    ]);

    branchTotalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 11, color: { argb: "FFFFFF" }, name: "Calibri" };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      const colors = ["34495e", "9B59B6", "27AE60", "E74C3C"];
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors[colNumber - 1] } };
      cell.border = {
        top: { style: "medium", color: { argb: "000000" } },
        left: { style: "medium", color: { argb: "000000" } },
        bottom: { style: "medium", color: { argb: "000000" } },
        right: { style: "medium", color: { argb: "000000" } },
      };
    });

    // Create branch-wise absentee sheets
    const sortedBranches = Object.keys(branchWiseSummary).sort();

    sortedBranches.forEach(branch => {
      const branchData = branchWiseSummary[branch];
      if (branchData.absenteesList.length > 0) {
        // Sort absentees by roll number
        const sortedAbsentees = branchData.absenteesList.sort((a, b) => a.rollno.localeCompare(b.rollno));

        // Create sheet with branch name
        const sheetName = branch.replace(/[\\\/\?\*\[\]]/g, "").slice(0, 31);
        const sheet = workbook.addWorksheet(sheetName);

        // Get unique batches for this branch
        const branchBatches = [...new Set(sortedAbsentees.map(student => student.batch))].sort();

        styleHeaders(sheet, `VI SEM ${branch} - Absentees List`);

        const absenteeHeaderRow = sheet.addRow(["S.No", "Roll No", "Name", "Branch", "Batch"]);
        absenteeHeaderRow.height = 25;

        absenteeHeaderRow.eachCell((cell, colNumber) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "34495e" } };
          cell.font = { bold: true, size: 12, color: { argb: "FFFFFF" }, name: "Calibri" };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "medium", color: { argb: "000000" } },
            left: { style: "medium", color: { argb: "000000" } },
            bottom: { style: "medium", color: { argb: "000000" } },
            right: { style: "medium", color: { argb: "000000" } },
          };
        });

        sheet.columns = [
          { width: 10 },
          { width: 18 },
          { width: 35 },
          { width: 20 },
          { width: 25 },
        ];

        sortedAbsentees.forEach((student, index) => {
          const row = sheet.addRow([
            index + 1,
            student.rollno,
            student.name,
            student.branch,
            student.batch,
          ]);

          row.height = 22;
          row.eachCell((cell, colNumber) => {
            cell.font = { name: "Calibri", size: 11 };
            cell.alignment = { vertical: "middle", horizontal: colNumber === 3 ? "left" : "center" };
            cell.border = {
              top: { style: "thin", color: { argb: "CCCCCC" } },
              left: { style: "thin", color: { argb: "CCCCCC" } },
              bottom: { style: "thin", color: { argb: "CCCCCC" } },
              right: { style: "thin", color: { argb: "CCCCCC" } },
            };

            const bgColor = (index % 2 === 0) ? "F8F9FA" : "FFFFFF";
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          });
        });

        // Add absentee count summary
        const spacingRow = sheet.addRow(["", "", "", "", ""]);
        spacingRow.height = 10;

        const summaryRow = sheet.addRow(["", "", "", "", `Total Absent: ${sortedAbsentees.length}`]);
        summaryRow.height = 22;

        summaryRow.getCell(5).font = {
          bold: true,
          size: 11,
          color: { argb: "FFFFFF" },
          name: "Calibri"
        };
        summaryRow.getCell(5).alignment = {
          horizontal: "center",
          vertical: "middle"
        };
        summaryRow.getCell(5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "E74C3C" }
        };
        summaryRow.getCell(5).border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        };
      }
    });

    const fileName = `VI-SEM: ${session}-${displayDate}_Attendance_Report.xlsx`;
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("Error generating attendance report:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

async function HandleSessionAttendanceReportPDF(req, res) {
  const { batch, date, session } = req.query;

  if (!batch || !date || !session) {
    return res.status(400).json({
      message: "batch (array), date, and session (FN/AN) are required",
    });
  }

  const batches = Array.isArray(batch) ? batch : [batch];
  const allSummaries = [];
  const allAbsentees = [];
  const branchWiseSummary = {}; // New object to track branch-wise data

  try {
    for (const b of batches) {
      const collectionName = b

      const Attendance = getAttendanceModel(collectionName);
      const students = await Attendance.find();

      const branchData = {};

      for (const student of students) {
        const branch = student.branch || "UNKNOWN";
        const shortBatch = getShortBatchName(student.batch);

        if (!branchData[branch]) {
          branchData[branch] = {
            batch: shortBatch,
            branch,
            strength: 0,
            presenties: 0,
            absenties: 0,
            absenteesList: []
          };
        }

        // Initialize branch-wise summary
        if (!branchWiseSummary[branch]) {
          branchWiseSummary[branch] = {
            branch,
            batches: new Set(),
            totalStrength: 0,
            totalPresent: 0,
            totalAbsent: 0
          };
        }

        const logsForDate = student.dailyLogs?.filter(
          (log) => log.date === date
        );

        const wasPresent = logsForDate?.some(
          (log) => log.status.toLowerCase() === "present"
        );

        branchData[branch].strength++;
        branchWiseSummary[branch].totalStrength++;
        branchWiseSummary[branch].batches.add(shortBatch);

        if (wasPresent) {
          branchData[branch].presenties++;
          branchWiseSummary[branch].totalPresent++;
        } else {
          branchData[branch].absenties++;
          branchWiseSummary[branch].totalAbsent++;
          branchData[branch].absenteesList.push({
            rollno: student.rollno,
            name: student.name,
            branch: student.branch || "UNKNOWN",
            batch: shortBatch
          });
        }
      }

      allSummaries.push(...Object.values(branchData));

      // Add absentees for this batch
      Object.values(branchData).forEach(branchInfo => {
        if (branchInfo.absenteesList.length > 0) {
          allAbsentees.push({
            batch: branchInfo.batch,
            branch: branchInfo.branch,
            absentees: branchInfo.absenteesList.sort((a, b) => a.rollno.localeCompare(b.rollno))
          });
        }
      });
    }

    // Convert branchWiseSummary to array and format batches
    const branchWiseData = Object.values(branchWiseSummary).map(branch => ({
      ...branch,
      batches: Array.from(branch.batches).sort().join(', ')
    })).sort((a, b) => a.branch.localeCompare(b.branch));

    // Format date
    const formatDateForDisplay = (dateString) => {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) return dateString;
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const displayDate = formatDateForDisplay(date);

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const fileName = `VI-SEM-${session}-${displayDate}-AttendanceReport.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`
    );

    doc.pipe(res);

    // Helper function to add headers
    const addHeaders = (doc, title) => {
      let yPos = 50;

      const headerSections = [
        { text: "Institute of Aeronautical Engineering", color: "#1f4e79", fontSize: 16 },
        { text: `${session} Attendance Summary - ${displayDate}`, color: "#2e75b6", fontSize: 14 },
        { text: "Career Development Center", color: "#3d85c6", fontSize: 12 },
        { text: title, color: "#4a90e2", fontSize: 11 },
      ];

      headerSections.forEach(section => {
        const headerHeight = section.fontSize + 8;
        doc.rect(50, yPos, 495, headerHeight)
          .fillAndStroke(section.color, '#000000')
          .fillColor('#ffffff')
          .fontSize(section.fontSize)
          .font('Helvetica-Bold')
          .text(section.text, 50, yPos + (headerHeight - section.fontSize) / 2, {
            width: 495,
            align: 'center'
          });
        yPos += headerHeight;
      });

      return yPos + 20;
    };

    // Generate Summary Report (First Sheet)
    let currentY = addHeaders(doc, "B.Tech VI Semester Attendance Summary");

    // Summary table
    const summaryTableHeaders = ['BATCH', 'BRANCH', 'Total Strength', 'Present', 'Absent'];
    const colWidths = [99, 99, 99, 99, 99]; // 495/5 = 99 each
    let yPos = currentY;

    // Table header
    let xPos = 50;
    doc.rect(50, yPos, 495, 25).fillAndStroke('#34495e', '#000000');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');

    summaryTableHeaders.forEach((header, i) => {
      doc.text(header, xPos + 5, yPos + 8, { width: colWidths[i] - 10, align: 'center' });
      xPos += colWidths[i];
    });

    yPos += 25;

    // Sort summaries by batch and branch
    allSummaries.sort((a, b) => {
      if (a.batch === b.batch) {
        return a.branch.localeCompare(b.branch);
      }
      return a.batch.localeCompare(b.batch);
    });

    let totalPresent = 0;
    let totalAbsent = 0;

    allSummaries.forEach((item, index) => {
      totalPresent += item.presenties;
      totalAbsent += item.absenties;

      if (yPos + 20 > 750) {
        doc.addPage();
        yPos = addHeaders(doc, "B.Tech VI Semester Attendance Summary");
        // Re-add table header
        xPos = 50;
        doc.rect(50, yPos, 495, 25).fillAndStroke('#34495e', '#000000');
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
        summaryTableHeaders.forEach((header, i) => {
          doc.text(header, xPos + 5, yPos + 8, { width: colWidths[i] - 10, align: 'center' });
          xPos += colWidths[i];
        });
        yPos += 25;
      }

      const fillColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(50, yPos, 495, 20).fillAndStroke(fillColor, '#cccccc');

      const rowData = [item.batch, item.branch, item.strength.toString(), item.presenties.toString(), item.absenties.toString()];

      xPos = 50;
      rowData.forEach((data, colIndex) => {
        let textColor = '#000000';
        let bgColor = fillColor;

        if (colIndex === 3) {
          bgColor = '#d4f3d0';
          textColor = '#2e7d32';
          doc.rect(xPos, yPos, colWidths[colIndex], 20).fillAndStroke(bgColor, '#cccccc');
        } else if (colIndex === 4) {
          bgColor = '#ffebee';
          textColor = '#c62828';
          doc.rect(xPos, yPos, colWidths[colIndex], 20).fillAndStroke(bgColor, '#cccccc');
        }

        doc.fillColor(textColor).fontSize(9).font(colIndex >= 3 ? 'Helvetica-Bold' : 'Helvetica');
        const align = colIndex === 1 ? 'left' : 'center';
        const padding = align === 'center' ? 0 : 5;
        doc.text(data, xPos + padding, yPos + 6, { width: colWidths[colIndex] - (padding * 2), align });
        xPos += colWidths[colIndex];
      });

      yPos += 20;
    });

    // Add summary totals
    yPos += 20;
    doc.rect(50, yPos, 495, 30).fillAndStroke('#3498db', '#000000');
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL SUMMARY', 50, yPos + 10, { width: 495, align: 'center' });
    yPos += 30;

    // Create total row with TOTAL spanning first two columns
    const totalRowHeight = 25;

    // TOTAL cell spanning first two columns (BATCH + BRANCH)
    const totalCellWidth = colWidths[0] + colWidths[1]; // 198
    doc.rect(50, yPos, totalCellWidth, totalRowHeight).fillAndStroke('#34495e', '#000000');
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL', 50, yPos + 8, { width: totalCellWidth, align: 'center' });

    // Remaining cells
    let currentX = 50 + totalCellWidth;
    const remainingData = [
      (totalPresent + totalAbsent).toString(),
      totalPresent.toString(),
      totalAbsent.toString()
    ];
    const remainingColors = ['#9b59b6', '#27ae60', '#e74c3c'];

    remainingData.forEach((data, i) => {
      doc.rect(currentX, yPos, colWidths[i + 2], totalRowHeight).fillAndStroke(remainingColors[i], '#000000');
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
      doc.text(data, currentX, yPos + 8, { width: colWidths[i + 2], align: 'center' });
      currentX += colWidths[i + 2];
    });

    // Generate Branch-wise Summary (Second Sheet)
    doc.addPage();
    currentY = addHeaders(doc, "B.Tech VI Semester Branch-wise Summary");

    // Branch-wise summary table
    const branchTableHeaders = ['VI SEM BRANCH (BATCHES)', 'Total Strength', 'Present', 'Absent'];
    const branchColWidths = [247, 83, 83, 82]; // Adjusted widths for better fit
    yPos = currentY;

    // Table header
    xPos = 50;
    doc.rect(50, yPos, 495, 25).fillAndStroke('#34495e', '#000000');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');

    branchTableHeaders.forEach((header, i) => {
      doc.text(header, xPos + 5, yPos + 8, { width: branchColWidths[i] - 10, align: 'center' });
      xPos += branchColWidths[i];
    });

    yPos += 25;

    let branchTotalPresent = 0;
    let branchTotalAbsent = 0;

    branchWiseData.forEach((item, index) => {
      branchTotalPresent += item.totalPresent;
      branchTotalAbsent += item.totalAbsent;

      if (yPos + 20 > 750) {
        doc.addPage();
        yPos = addHeaders(doc, "B.Tech VI Semester Branch-wise Summary");
        // Re-add table header
        xPos = 50;
        doc.rect(50, yPos, 495, 25).fillAndStroke('#34495e', '#000000');
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
        branchTableHeaders.forEach((header, i) => {
          doc.text(header, xPos + 5, yPos + 8, { width: branchColWidths[i] - 10, align: 'center' });
          xPos += branchColWidths[i];
        });
        yPos += 25;
      }

      const fillColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(50, yPos, 495, 20).fillAndStroke(fillColor, '#cccccc');

      const rowData = [
        `${item.branch} (${item.batches})`,
        item.totalStrength.toString(),
        item.totalPresent.toString(),
        item.totalAbsent.toString()
      ];

      xPos = 50;
      rowData.forEach((data, colIndex) => {
        let textColor = '#000000';
        let bgColor = fillColor;

        if (colIndex === 2) {
          bgColor = '#d4f3d0';
          textColor = '#2e7d32';
          doc.rect(xPos, yPos, branchColWidths[colIndex], 20).fillAndStroke(bgColor, '#cccccc');
        } else if (colIndex === 3) {
          bgColor = '#ffebee';
          textColor = '#c62828';
          doc.rect(xPos, yPos, branchColWidths[colIndex], 20).fillAndStroke(bgColor, '#cccccc');
        }

        doc.fillColor(textColor).fontSize(9).font(colIndex >= 2 ? 'Helvetica-Bold' : 'Helvetica');
        const align = colIndex === 0 ? 'left' : 'center';
        const padding = align === 'center' ? 0 : 5;
        doc.text(data, xPos + padding, yPos + 6, { width: branchColWidths[colIndex] - (padding * 2), align });
        xPos += branchColWidths[colIndex];
      });

      yPos += 20;
    });

    // Add branch-wise totals
    yPos += 20;
    doc.rect(50, yPos, 495, 30).fillAndStroke('#3498db', '#000000');
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
    doc.text('BRANCH-WISE TOTAL SUMMARY', 50, yPos + 10, { width: 495, align: 'center' });
    yPos += 30;

    // Create total row for branch-wise summary
    doc.rect(50, yPos, branchColWidths[0], totalRowHeight).fillAndStroke('#34495e', '#000000');
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL', 50, yPos + 8, { width: branchColWidths[0], align: 'center' });

    // Remaining cells for branch totals
    currentX = 50 + branchColWidths[0];
    const branchRemainingData = [
      (branchTotalPresent + branchTotalAbsent).toString(),
      branchTotalPresent.toString(),
      branchTotalAbsent.toString()
    ];

    branchRemainingData.forEach((data, i) => {
      doc.rect(currentX, yPos, branchColWidths[i + 1], totalRowHeight).fillAndStroke(remainingColors[i], '#000000');
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
      doc.text(data, currentX, yPos + 8, { width: branchColWidths[i + 1], align: 'center' });
      currentX += branchColWidths[i + 1];
    });

    // Generate Branch-wise Absentee Pages (Third sheet onwards) - Group by Branch
    const branchWiseAbsentees = {};

    // Group absentees by branch
    allAbsentees.forEach(({ batch, branch, absentees }) => {
      if (!branchWiseAbsentees[branch]) {
        branchWiseAbsentees[branch] = [];
      }
      branchWiseAbsentees[branch].push(...absentees);
    });

    // Sort branches alphabetically
    const sortedBranches = Object.keys(branchWiseAbsentees).sort();

    sortedBranches.forEach(branch => {
      const branchAbsentees = branchWiseAbsentees[branch];
      // Sort absentees by roll number
      branchAbsentees.sort((a, b) => a.rollno.localeCompare(b.rollno));

      // Get unique batches for this branch
      const branchBatches = [...new Set(branchAbsentees.map(student => student.batch))].sort();

      doc.addPage();
      const title = `VI SEM ${branch} - Absentees List`;
      currentY = addHeaders(doc, title);

      // Absentee table
      const absenteeHeaders = ['S.No', 'Roll No', 'Name', 'Branch', 'Batch'];
      const absenteeColWidths = [40, 70, 180, 100, 105];

      yPos = currentY;
      xPos = 50;
      doc.rect(50, yPos, 495, 25).fillAndStroke('#34495e', '#000000');
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');

      absenteeHeaders.forEach((header, i) => {
        doc.text(header, xPos + 5, yPos + 8, { width: absenteeColWidths[i] - 10, align: 'center' });
        xPos += absenteeColWidths[i];
      });

      yPos += 25;

      branchAbsentees.forEach((student, index) => {
        if (yPos + 25 > 750) {
          doc.addPage();
          yPos = addHeaders(doc, title);
          // Re-add table header
          xPos = 50;
          doc.rect(50, yPos, 495, 25).fillAndStroke('#34495e', '#000000');
          doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
          absenteeHeaders.forEach((header, i) => {
            doc.text(header, xPos + 5, yPos + 8, { width: absenteeColWidths[i] - 10, align: 'center' });
            xPos += absenteeColWidths[i];
          });
          yPos += 25;
        }

        const fillColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
        doc.rect(50, yPos, 495, 25).fillAndStroke(fillColor, '#cccccc');

        const rowData = [
          (index + 1).toString(),
          student.rollno,
          student.name,
          student.branch,
          student.batch
        ];

        xPos = 50;
        rowData.forEach((data, colIndex) => {
          doc.fillColor('#000000').fontSize(9).font('Helvetica');
          const align = colIndex === 2 ? 'left' : 'center';
          const padding = align === 'center' ? 0 : 5;
          doc.text(data, xPos + padding, yPos + 8, { width: absenteeColWidths[colIndex] - (padding * 2), align });
          xPos += absenteeColWidths[colIndex];
        });

        yPos += 25;
      });

      // Add absentee count
      yPos += 20;
      doc.rect(50, yPos, 495, 25).fillAndStroke('#e74c3c', '#000000');
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
      doc.text(`Total Absent: ${branchAbsentees.length}`, 50, yPos + 8, { width: 495, align: 'center' });
    });

    doc.end();

  } catch (err) {
    console.error("Error generating PDF report:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};



//--------- Attendace Monthly Report Analysis Code Start -------------------------------//

// =========================================================================
// CONSTANTS & STYLES
// =========================================================================
const dayjs = require("dayjs");
const COLLECTION_PREFIX = "attendance_"; // e.g., attendance_skillup-1

const COLORS = {
  primary: "FF2C3E50",     // Dark blue-gray
  secondary: "FF34495E",   // Slightly lighter blue-gray
  white: "FFFFFFFF",
  lightGray: "FFF8F9FA",
  excellent: "FF27AE60",   // Green (>75%)
  good: "FFF39C12",        // Orange (65-75%)
  poor: "FFE74C3C",        // Red (<65%)
  excellentBg: "FFD5F4E6", // Light green
  goodBg: "FFFEF9E7",      // Light orange
  poorBg: "FFFDEAEA",      // Light red
  present: "FF27AE60",     // Green
  absent: "FFE74C3C",       // Red
  border: "FFD5DBDB"
};

const styles = {
  titleStyle: {
    font: { bold: true, size: 18, color: { argb: COLORS.white }, name: "Arial" },
    alignment: { vertical: "middle", horizontal: "center" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primary } },
    border: {
      top: { style: "medium", color: { argb: COLORS.primary } },
      left: { style: "medium", color: { argb: COLORS.primary } },
      bottom: { style: "medium", color: { argb: COLORS.primary } },
      right: { style: "medium", color: { argb: COLORS.primary } }
    }
  },
  headerStyle: {
    font: { bold: true, size: 11, color: { argb: COLORS.white }, name: "Arial" },
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.secondary } },
    border: {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } }
    }
  },
  dataCell: {
    font: { size: 10, name: "Arial", color: { argb: COLORS.primary } },
    alignment: { vertical: "middle", horizontal: "left", indent: 1 },
    border: {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } }
    }
  },
  numericCell: {
    font: { size: 10, name: "Arial", color: { argb: COLORS.primary } },
    alignment: { vertical: "middle", horizontal: "center" },
    border: {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } }
    }
  },
  presentCell: {
    font: { bold: true, size: 10, color: { argb: COLORS.present }, name: "Arial" },
    alignment: { vertical: "middle", horizontal: "center" },
    border: {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } }
    }
  },
  absentCell: {
    font: { bold: true, size: 10, color: { argb: COLORS.absent }, name: "Arial" },
    alignment: { vertical: "middle", horizontal: "center" },
    border: {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } }
    }
  },
  holidayCell: {
    font: { bold: true, size: 50, color: { argb: COLORS.white }, name: "Arial" },
    alignment: { vertical: "middle", horizontal: "center", textRotation: 90 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.absent } },
    border: {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } }
    }
  }
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

function toISO(s) {
  return dayjs(s, ["YYYY-MM-DD", "YYYY/MM/DD"]).format("YYYY-MM-DD");
}

function getPercentageStyle(percentage) {
  const baseStyle = {
    font: { size: 10, bold: true, name: "Arial" },
    alignment: { vertical: "middle", horizontal: "center" },
    border: {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } }
    }
  };

  if (percentage > 75) {
    return { ...baseStyle, font: { ...baseStyle.font, color: { argb: COLORS.excellent } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.excellentBg } } };
  } else if (percentage >= 65) {
    return { ...baseStyle, font: { ...baseStyle.font, color: { argb: COLORS.good } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.goodBg } } };
  } else {
    return { ...baseStyle, font: { ...baseStyle.font, color: { argb: COLORS.poor } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.poorBg } } };
  }
}

function buildDateRange(from, to) {
  const days = [];
  let cursor = dayjs(from);
  const end = dayjs(to);
  while (cursor.isSame(end) || cursor.isBefore(end)) {
    days.push(cursor.format("YYYY-MM-DD"));
    cursor = cursor.add(1, "day");
  }
  return days;
}

async function getAllCourses(collectionName) {
  const Attendance = getAttendanceModel(collectionName);
  const docs = await Attendance.find({}).lean();
  const coursesSet = new Set();
  docs.forEach(doc => { (doc.dailyLogs || []).forEach(log => { if (log.course) { coursesSet.add(log.course); } }); });
  return Array.from(coursesSet).sort();
}

function summarizeStudent(doc, dates, allCourses) {
  const logsInRange = (doc.dailyLogs || []).filter((x) => dates.has(x.date));
  const totalDays = logsInRange.length;
  const presentDays = logsInRange.reduce((acc, x) => acc + (x.status === "present" ? 1 : 0), 0);
  const perCourse = {};
  for (const course of allCourses) { perCourse[course] = { present: 0, total: 0 }; }
  for (const lg of logsInRange) {
    if (!lg.course) continue;
    if (perCourse[lg.course]) {
      perCourse[lg.course].total += 1;
      if (lg.status === "present") perCourse[lg.course].present += 1;
    }
  }
  const calendarMap = {};
  for (const d of dates) calendarMap[d] = "H";
  for (const lg of logsInRange) { calendarMap[lg.date] = lg.status === "present" ? "P" : "A"; }
  return { totalDays, presentDays, perCourse, calendarMap };
}

function findCommonHolidays(docs, dates, allCourses) {
  const holidayDates = [];
  const dateArray = Array.from(dates);

  for (const date of dateArray) {
    let isCommonHoliday = true;
    if (docs.length === 0) {
      isCommonHoliday = false;
    } else {
      for (const doc of docs) {
        const { calendarMap } = summarizeStudent(doc, dates, allCourses);
        if (calendarMap[date] !== "H") {
          isCommonHoliday = false;
          break;
        }
      }
    }
    if (isCommonHoliday) {
      holidayDates.push(date);
    }
  }
  return holidayDates;
}

async function listAttendanceCollections() {
  const all = await mongoose.connection.db.listCollections().toArray();
  return all.map((x) => x.name).filter((n) => n.startsWith(COLLECTION_PREFIX));
}

// =========================================================================
// EXCEL SHEET BUILDERS
// =========================================================================

async function buildSheetForCollection(workbook, collectionName, fromISO, toISO) {
  const Attendance = getAttendanceModel(collectionName);
  const allCourses = await getAllCourses(collectionName);
  const ws = workbook.addWorksheet(collectionName.replace(COLLECTION_PREFIX, "").toUpperCase());
  const dateList = buildDateRange(fromISO, toISO);
  const dateSet = new Set(dateList);

  const baseColumns = 6;
  const courseColumns = allCourses.length;
  const totalColumns = baseColumns + courseColumns + dateList.length;

  ws.views = [{ state: "frozen", xSplit: baseColumns + courseColumns, ySplit: 3, topLeftCell: `${String.fromCharCode(65 + baseColumns + courseColumns)}4` }];

  ws.mergeCells(1, 1, 1, totalColumns);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `ATTENDANCE REPORT`;
  titleCell.style = styles.titleStyle;
  ws.getRow(1).height = 35;

  ws.mergeCells(2, 1, 2, totalColumns);
  const subtitleCell = ws.getCell(2, 1);
  subtitleCell.value = `Period: ${dayjs(fromISO).format("DD MMM YYYY")} → ${dayjs(toISO).format("DD MMM YYYY")} | Batch: ${collectionName.replace(COLLECTION_PREFIX, "").toUpperCase()}`;
  subtitleCell.font = { bold: true, size: 12, color: { argb: COLORS.primary }, name: "Arial" };
  subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightGray } };
  ws.getRow(2).height = 25;

  const headerRow = ws.addRow(["S.No", "Roll No", "Name", "Branch", "Batch", "Overall (%)", ...allCourses.map(c => `${c} (%)`), ...dateList.map(d => dayjs(d).format("DD MMM"))]);
  headerRow.height = 40;
  headerRow.eachCell((cell) => { cell.style = styles.headerStyle; });

  const widths = [8, 18, 40, 18, 28, 15, ...Array(courseColumns).fill(18), ...Array(dateList.length).fill(10)];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  const docs = await Attendance.find({}).lean().sort({ rollno: 1 });
  const batchSummary = { totalStudents: 0, totalPercentage: 0 };
  const commonHolidays = findCommonHolidays(docs, dateSet, allCourses);

  const firstDataRow = 4;
  const lastDataRow = firstDataRow + docs.length - 1;

  docs.forEach((doc, index) => {
    const { totalDays, presentDays, perCourse, calendarMap } = summarizeStudent(doc, dateSet, allCourses);
    const overallPct = totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : 0;
    batchSummary.totalStudents++;
    batchSummary.totalPercentage += overallPct;

    const coursePercentages = allCourses.map(c => {
      const data = perCourse[c];
      return !data || data.total === 0 ? "N/A" : Math.round((data.present / data.total) * 1000) / 10;
    });

    const row = ws.addRow([index + 1, doc.rollno || "N/A", doc.name || "Unknown", doc.branch || "N/A", doc.batch || "N/A", overallPct, ...coursePercentages, ...dateList.map(d => calendarMap[d] || "")]);
    row.height = 25;

    row.eachCell((cell, colNumber) => {
      if (colNumber <= baseColumns) {
        if (colNumber === 1) cell.style = styles.numericCell;
        else if (colNumber === baseColumns) {
          cell.style = getPercentageStyle(overallPct);
          cell.value = `${overallPct}%`;
        } else cell.style = styles.dataCell;
      } else if (colNumber <= baseColumns + courseColumns) {
        if (cell.value !== "N/A") {
          cell.style = getPercentageStyle(cell.value);
          cell.value = `${cell.value}%`;
        } else {
          cell.style = styles.dataCell;
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightGray } };
        }
      } else {
        const value = cell.value;
        if (value === "P") { cell.style = styles.presentCell; }
        else if (value === "A") { cell.style = styles.absentCell; }
        else if (value === "H") {
          const currentDate = dateList[colNumber - baseColumns - courseColumns - 1];
          cell.style = styles.holidayCell;
          cell.value = commonHolidays.includes(currentDate) ? "" : "No Classes Sheduled";
        } else {
          cell.style = styles.dataCell;
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      }
    });
  });

  for (const holiday of commonHolidays) {
    const dateIndex = dateList.indexOf(holiday);
    if (dateIndex !== -1) {
      const col = baseColumns + courseColumns + 1 + dateIndex;
      if (docs.length > 0) {
        ws.mergeCells(firstDataRow, col, lastDataRow, col);
        const mergedCell = ws.getCell(firstDataRow, col);
        mergedCell.value = "HOLIDAY";
        mergedCell.style = styles.holidayCell;
      }
    }
  }

  workbook.batchSummaries = workbook.batchSummaries || [];
  workbook.batchSummaries.push({
    batchName: collectionName.replace(COLLECTION_PREFIX, "").toUpperCase(),
    averagePercentage: batchSummary.totalStudents > 0 ? Math.round((batchSummary.totalPercentage / batchSummary.totalStudents) * 10) / 10 : 0,
    totalStudents: batchSummary.totalStudents
  });
}

function createSummarySheet(workbook, fromISO, toISO) {
  const ws = workbook.addWorksheet("SUMMARY", { properties: { tabColor: { argb: COLORS.primary } } });

  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = `ATTENDANCE SUMMARY REPORT`;
  ws.getCell('A1').style = styles.titleStyle;
  ws.getRow(1).height = 35;

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = `Period: ${dayjs(fromISO).format("DD MMM YYYY")} → ${dayjs(toISO).format("DD MMM YYYY")}`;
  ws.getCell('A2').font = { bold: true, size: 12, color: { argb: COLORS.primary }, name: "Arial" };
  ws.getCell('A2').alignment = { vertical: "middle", horizontal: "center" };
  ws.getCell('A2').fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightGray } };
  ws.getRow(2).height = 25;

  const headerRow = ws.addRow(["S.No", "Batch Name", "Total Students", "Average Percentage"]);
  headerRow.height = 30;
  headerRow.eachCell(cell => cell.style = styles.headerStyle);

  ws.columns = [{ width: 8 }, { width: 30 }, { width: 18 }, { width: 20 }];

  const grandTotal = { students: 0, percentage: 0 };
  (workbook.batchSummaries || []).forEach((batch, index) => {
    const row = ws.addRow([index + 1, batch.batchName, batch.totalStudents, batch.averagePercentage]);
    row.height = 25;
    row.getCell(1).style = styles.numericCell;
    row.getCell(2).style = styles.dataCell;
    row.getCell(3).style = styles.numericCell;
    row.getCell(4).style = getPercentageStyle(batch.averagePercentage);
    row.getCell(4).value = `${batch.averagePercentage}%`;
    grandTotal.students += batch.totalStudents;
    grandTotal.percentage += batch.averagePercentage;
  });

  const avgPercentage = workbook.batchSummaries.length > 0 ? Math.round((grandTotal.percentage / workbook.batchSummaries.length) * 10) / 10 : 0;
  const totalRow = ws.addRow(["", "OVERALL AVERAGE", grandTotal.students, `${avgPercentage}%`]);
  totalRow.height = 30;
  ['B', 'C', 'D'].forEach(col => {
    const cell = totalRow.getCell(col);
    cell.style = styles.dataCell; // Base style
    cell.font = { ...cell.font, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightGray } };
    if (col === 'C') cell.alignment = styles.numericCell.alignment;
    if (col === 'D') cell.style = getPercentageStyle(avgPercentage);
  });
}

// =========================================================================
// MAIN CONTROLLER
// =========================================================================

const HandleMonthlyAttendanceReportExcel = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: "Missing required query parameters: from, to (YYYY-MM-DD)" });
    }

    const fromISO = toISO(from);
    const toISODate = toISO(to);
    if (!dayjs(fromISO).isValid() || !dayjs(toISODate).isValid() || dayjs(fromISO).isAfter(toISODate)) {
      return res.status(400).json({ message: "Invalid date range." });
    }

    const collections = await listAttendanceCollections();
    if (collections.length === 0) {
      return res.status(404).json({ message: "No attendance collections found." });
    }
    collections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const wb = new ExcelJS.Workbook();
    wb.creator = "Attendance Management System";
    wb.created = new Date();

    for (const colName of collections) {
      console.log(`Building sheet for: ${colName}`);
      await buildSheetForCollection(wb, colName, fromISO, toISODate);
    }

    createSummarySheet(wb, fromISO, toISODate);

    const fileName = `Attendance_Report_${dayjs(fromISO).format("DD-MMM-YYYY")}_to_${dayjs(toISODate).format("DD-MMM-YYYY")}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await wb.xlsx.write(res);
    res.end();
    console.log(`✅ Successfully generated report: ${fileName}`);

  } catch (err) {
    console.error("❌ Excel generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate attendance report", error: err.message });
    }
  }
};

//--------- Attendace Monthly Excel Report Analysis Code End -------------------------------//



async function getDashboardData(req, res) {
  try {
    const today = new Date().toISOString().split("T")[0];

    // --- DYNAMICALLY GET COLLECTION NAMES ---
    const collections = await mongoose.connection.db.listCollections().toArray();

    const batchCollectionNames = collections
      .map((collection) => collection.name)
      .filter((name) => name.startsWith("attendance"));

    // ✅ If no attendance collections
    if (batchCollectionNames.length === 0) {
      const totalStudents = await Student.countDocuments();
      const totalFaculty = await Faculty.countDocuments();

      return res.status(200).json({
        success: true,
        message: "No attendance collections found.",
        data: {
          attendanceSummary: [],
          totalStudents,
          totalFaculty,
        },
      });
    }

    const attendanceSummary = [];

    // ✅ Attendance summary per batch
    for (const collectionName of batchCollectionNames) {
      const AttendanceModel = getAttendanceModel(collectionName);

      // Count present students for today
      const presentCount = await AttendanceModel.countDocuments({
        dailyLogs: {
          $elemMatch: {
            date: today,
            status: "present",
          },
        },
      });

      // Count total students in the batch
      const totalCount = await AttendanceModel.countDocuments();

      attendanceSummary.push({
        batch: collectionName,
        presentCount,
        totalCount,
        date: today,
      });
    }

    // ✅ Separate counts from Student and Faculty models
    const totalStudents = await Student.countDocuments();
    const totalFaculty = await Faculty.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        attendanceSummary,
        totalStudents,
        totalFaculty,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard data.",
    });
  }
};

async function getProfileData(req, res) {
  try {
    const { adminId } = req.params;
    if (!adminId) {
      return res.status(400).json({ error: "adminId is required" });
    }

    const admin = await Admin.findOne({
      adminId: new RegExp(`^${adminId}$`, "i")
    }).select("name adminId email -_id");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({ admin });

  } catch (err) {
    console.error("Error fetching Admin data:", err);
    res.status(500).json({ error: "Server error" });
  }
};


//-------------------------------   Manage Faculty Routes  Start    ----------------------------//

async function getViewFaculty(req, res) {
  try {
    const faculty = await Faculty.find({})
      .select('name facultyid designation subjects_assigned batches_assigned email -_id');

    if (faculty.length === 0) {
      return res.status(404).json({ msg: 'No faculty found' });
    }

    res.status(200).json(faculty);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};


async function addFaculty(req, res) {

  const { name, facultyid, email, designation, subjects_assigned, batches_assigned } = req.body;

  // Basic validation
  if (!name || !facultyid || !email) {
    return res.status(400).json({ message: 'Name, Faculty ID, and Email are required.' });
  }

  try {
    // Check if faculty with the same ID or email already exists
    const existingFaculty = await Faculty.findOne({ $or: [{ facultyid }, { email }] });
    if (existingFaculty) {
      return res.status(409).json({ message: 'Faculty with this ID or email already exists.' });
    }

    // Generate the default password as "facultyid@<last_two_digits_of_year>"
    // For 2025, this will be "facultyid@25"
    const yearLastTwoDigits = new Date().getFullYear().toString().slice(-2);
    const password = `${facultyid}@${yearLastTwoDigits}`;

    // Create a new faculty instance
    const newFaculty = new Faculty({
      name,
      facultyid,
      password, // The generated default password
      email,
      designation,
      subjects_assigned,
      batches_assigned,
    });

    // Save the new faculty to the database
    const savedFaculty = await newFaculty.save();

    res.status(201).json({ message: 'Faculty added successfully!', faculty: savedFaculty });
  } catch (error) {
    // Handle potential errors, like validation errors from the model
    res.status(500).json({ message: 'Error adding faculty.', error: error.message });
  }
};

async function deleteFaculty(req, res) {
  // Get the facultyid from the request body
  const { facultyid } = req.body;

  if (!facultyid) {
    return res.status(400).json({ message: 'Faculty ID is required to delete.' });
  }

  try {
    // Find the faculty by their unique facultyid and remove them
    const deletedFaculty = await Faculty.findOneAndDelete({ facultyid: facultyid });

    if (!deletedFaculty) {
      return res.status(404).json({ message: 'Faculty not found.' });
    }

    res.status(200).json({ message: `Faculty with ID ${facultyid} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting faculty.', error: error.message });
  }
};

async function updateFaculty(req, res) {
  // The facultyid is used to find the document, the rest are the fields to update
  const { facultyid, password, ...updateData } = req.body; // 🚫 Extract and ignore password

  if (!facultyid) {
    return res.status(400).json({ message: 'Faculty ID is required for updates.' });
  }

  try {
    // Ensure password never gets updated through this endpoint
    if (password) {
      return res.status(403).json({ message: 'Password updates are not allowed through this Updation Use Reset Password.' });
    }

    const updatedFaculty = await Faculty.findOneAndUpdate(
      { facultyid: facultyid },
      { $set: updateData }, // Only update allowed fields
      { new: true, runValidators: true }
    );

    if (!updatedFaculty) {
      return res.status(404).json({ message: 'Faculty not found.' });
    }

    res.status(200).json({ message: 'Faculty updated successfully!', faculty: updatedFaculty });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    res.status(500).json({ message: 'Error updating faculty.', error: error.message });
  }
}

//-------------------------------   Manage Faculty Routes  End      ----------------------------//


//-------------------------------   Manage Student Routes  Start    ----------------------------//

async function getViewStudents(req, res) {
  try {
    // 1. Get all students
    let students = await Student.find()
      .select("rollno name batch branch -_id") // also fetch branch
      .lean();

    // 2. For each student, fetch attendance + handles
    const AllStudents = await Promise.all(
      students.map(async (student) => {
        try {


          // --- Coder Handles ---
          let coderData = await Coder.findOne({
            rollno: new RegExp(`^${student.rollno}$`, "i"),
          })
            .select("handles -_id")
            .lean();

          // --- Merge all ---
          return {
            ...student,
            ...(coderData || {})
          };
        } catch (err) {
          console.error(`Error fetching data for ${student.rollno}:`, err);
          return student; // fallback
        }
      })
    );

    res.json({ AllStudents });
  } catch (err) {
    console.error("Error fetching Students data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function addStudent(req, res) {
  const { rollno, name, branch, batch, handles } = req.body;

  if (!rollno || !name || !branch || !batch || !handles) {
    return res.status(400).json({ message: 'Roll No, Name, Branch, and Batch are required.' });
  }

  try {
    const existingStudent = await Student.findOne({ rollno });
    if (existingStudent) {
      return res.status(409).json({ message: 'A student with this Roll No already exists.' });
    }

    const currentYear = new Date().getFullYear(); // e.g., 2025
    const defaultPassword = `pat@${currentYear}`;
    const hashedNewPassword = await bcrypt.hash(defaultPassword, 10);
    const email = `${rollno.toLowerCase()}@iare.ac.in`;
    const batchFormatted = batch
      .replace(/BATCH/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();


    // --- Create documents for all three collections ---
    const newStudent = new Student({ name, rollno, password: hashedNewPassword, branch, batch, email });
    const newCoder = new Coder({ rollno, branch, batch, handles });

    // Get the dynamic attendance model for the student's batch
    const Editbatch = `attendance_${batchFormatted}`
    const Attendance = getAttendanceModel(Editbatch);
    const newAttendanceRecord = new Attendance({ rollno, name, branch, batch });

    // --- Save all documents ---
    const savedStudent = await newStudent.save();
    await newCoder.save();
    await newAttendanceRecord.save();

    res.status(201).json({ message: 'Student added successfully to all systems!', student: savedStudent });
  } catch (error) {
    res.status(500).json({ message: 'Error adding student.', error: error.message });
  }
};

async function deleteStudent(req, res) {
  const { rollno } = req.body;

  if (!rollno) {
    return res.status(400).json({ message: 'Roll No is required.' });
  }

  try {
    // 1. Find the student first to get their batch
    const studentToDelete = await Student.findOne({ rollno });
    if (!studentToDelete) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const batchFormatted = "attendance_" + studentToDelete.batch
      .replace(/BATCH/gi, "")      // remove "BATCH" word
      .replace(/\s+/g, "-")        // replace spaces with "-"
      .replace(/-+/g, "-")         // collapse multiple "-"
      .replace(/^-|-$/g, "")       // trim leading/trailing "-"
      .toLowerCase();

    // 2. Get the dynamic attendance model using the student's batch
    const Attendance = getAttendanceModel(batchFormatted);

    // 3. Delete the student from all three collections
    await Student.deleteOne({ rollno });
    await Coder.deleteOne({ rollno });
    await Attendance.deleteOne({ rollno });

    res.status(200).json({ message: `Student ${rollno} deleted successfully from all systems.` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting student.', error: error.message });
  }
};

async function updateStudent(req, res) {
  // Explicitly remove password from updates
  const { rollno, password, ...updateData } = req.body;

  if (!rollno) {
    return res.status(400).json({ message: 'Roll No is required for updates.' });
  }

  try {
    // 1. Find the original student document
    const originalStudent = await Student.findOne({ rollno });
    if (!originalStudent) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    const oldBatch = originalStudent.batch;
    const newBatch = updateData.batch;

    // 🚫 Block password update attempt
    if (password) {
      return res.status(403).json({ message: 'Password updates are not allowed through this Section.' });
    }

    // 2. Update the main Student document
    const updatedStudent = await Student.findOneAndUpdate(
      { rollno },
      updateData,
      { new: true }
    );

    // 3. Prepare and apply updates for Coder and Attendance models
    const sharedUpdateData = {};
    if (updateData.name) sharedUpdateData.name = updateData.name;
    if (updateData.branch) sharedUpdateData.branch = updateData.branch;
    if (updateData.batch) sharedUpdateData.batch = updateData.batch;
    if (updateData.handles) {
      const handleUpdates = {};
      for (const [platform, username] of Object.entries(updateData.handles)) {
        handleUpdates[`handles.${platform}`] = username;
      }
      await Coder.updateOne({ rollno }, { $set: handleUpdates });
    }
    await Coder.updateOne(
      { rollno },
      { $set: { branch: updatedStudent.branch, batch: updatedStudent.batch } }
    );


    // 4. Attendance updates
    if (newBatch && newBatch !== oldBatch) {
      const OldAttendanceModel = getAttendanceModel(`attendance_${oldBatch.toLowerCase()}`);
      const NewAttendanceModel = getAttendanceModel(`attendance_${newBatch.toLowerCase()}`);

      const attendanceRecord = await OldAttendanceModel.findOne({ rollno }).lean();
      console.log("Attendance record before delete:", attendanceRecord);

      if (attendanceRecord) {
        await OldAttendanceModel.deleteOne({ rollno }); // safer, explicit delete
        delete attendanceRecord._id;
        attendanceRecord.batch = newBatch;
        if (updateData.name) attendanceRecord.name = updateData.name;
        if (updateData.branch) attendanceRecord.branch = updateData.branch;

        await NewAttendanceModel.create(attendanceRecord);
        console.log("Moved student to new batch collection:", newBatch);
      } else {
        console.log("No attendance record found for rollno", rollno, "in", oldBatch);
      }

    }

    res.status(200).json({
      message: 'Student updated successfully across all systems!',
      student: updatedStudent
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating student.',
      error: error.message
    });
  }
}


//-------------------------------   Manage Student Routes  End      ----------------------------//


//-------------------------------   Manage Attendance Routes  Start -----------------------------//

async function getStudentsForAttendanceUpdation(req, res) {
  try {
    const { batch, date, course, status } = req.query;

    // ✅ Validation
    if (!batch || !date || !course || !status) {
      return res
        .status(400)
        .json({ message: "Missing batch, date, course, or status" });
    }

    // ✅ Ensure valid status
    if (!["present", "absent"].includes(status.toLowerCase())) {
      return res
        .status(400)
        .json({ message: "Invalid status. Must be 'present' or 'absent'." });
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

    // ✅ First check if ANY dailyLogs exist for that course+date
    const hasLogs = await Attendance.exists({
      dailyLogs: {
        $elemMatch: {
          date: String(date),
          course: course.trim()
        }
      }
    });

    if (!hasLogs) {
      return res.status(200).json({
        message: `No attendance logs found for course '${course}' on date '${date}'.`
      });
    }

    // ✅ Query students by status
    const students = await Attendance.find(
      {
        dailyLogs: {
          $elemMatch: {
            date: String(date),
            course: course.trim(),
            status: status.toLowerCase(),
          },
        },
      },
      { rollno: 1, _id: 0 }
    );

    const rollnos = students.map((s) => s.rollno);

    res.status(200).json({
      batch,
      date,
      course,
      status: status.toLowerCase(),
      students: rollnos
    });
  } catch (err) {
    console.error("Error fetching students by status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

async function HandleUpdateAttendance(req, res) {
  try {
    const { course, students, batch, date, status } = req.body;

    // ✅ Validation
    if (!course || !Array.isArray(students) || !batch || !date || !status) {
      return res.status(400).json({ message: "Missing course, students, batch, date, or status" });
    }

    if (!["present", "absent"].includes(status.toLowerCase())) {
      return res.status(400).json({ message: "Invalid status. Must be 'present' or 'absent'." });
    }

    const Attendance = getAttendanceModel(batch);
    const targetDate = date;
    const courseKey = course.trim();
    const newStatus = status.toLowerCase();

    const bulkOps = [];

    // ✅ Find logs for these rollnos on the given date + course
    const studentsWithLogs = await Attendance.find({
      rollno: { $in: students },
      dailyLogs: {
        $elemMatch: {
          date: targetDate,
          course: courseKey
        }
      }
    });

    console.log(`📝 Found ${studentsWithLogs.length} students with logs for ${targetDate}`);

    for (const student of studentsWithLogs) {
      const logIndex = student.dailyLogs.findIndex(
        (log) => log.date === targetDate && log.course === courseKey
      );

      if (logIndex !== -1) {
        const currentStatus = student.dailyLogs[logIndex].status;

        if (currentStatus !== newStatus) {
          const updateObj = {
            $set: {
              [`dailyLogs.${logIndex}.status`]: newStatus,
              lastUpdated: new Date()
            }
          };

          // ✅ Adjust counts accordingly
          if (newStatus === "present" && currentStatus === "absent") {
            updateObj.$inc = {
              "overallAttendance.presentDays": 1,
              [`courseAttendance.${courseKey}.presentDays`]: 1
            };
          } else if (newStatus === "absent" && currentStatus === "present") {
            updateObj.$inc = {
              "overallAttendance.presentDays": -1,
              [`courseAttendance.${courseKey}.presentDays`]: -1
            };
          }

          bulkOps.push({
            updateOne: {
              filter: {
                rollno: student.rollno,
                [`dailyLogs.${logIndex}.date`]: targetDate,
                [`dailyLogs.${logIndex}.course`]: courseKey
              },
              update: updateObj
            }
          });
        }
      }
    }

    if (bulkOps.length === 0) {
      return res.status(404).json({
        message: `No logs needed updating for ${status}`,
        updatedCount: 0
      });
    }

    const result = await Attendance.bulkWrite(bulkOps, { ordered: false });
    console.log(`📊 Bulk operation result:`, result);

    res.status(200).json({
      message: `Bulk mark ${status} operation completed`,
      updatedCount: result.modifiedCount,
    });

  } catch (err) {
    console.error("❌ Error in HandleUpdateAttendance:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


async function deleteAttendanceLog(req, res) {
  try {
    const { batch, date, course } = req.body;

    if (!batch || !date || !course) {
      return res.status(400).json({ message: "batch, date, and course are required" });
    }

    const batchFormatted = batch
      .replace(/BATCH/gi, "")      // remove "BATCH" word
      .replace(/\s+/g, "-")        // replace spaces with "-"
      .replace(/-+/g, "-")         // collapse multiple "-"
      .replace(/^-|-$/g, "")       // trim leading/trailing "-"
      .toLowerCase();

    // ✅ Get correct model for this batch
    const Attendance = getAttendanceModel(batchFormatted);

    // fetch all students in this batch
    const students = await Attendance.find({});

    if (!students || students.length === 0) {
      return res.status(404).json({ message: "No students found in this batch" });
    }

    let updatedCount = 0;

    for (let student of students) {
      // find log index
      const logIndex = student.dailyLogs.findIndex(
        (log) => log.date === date && log.course === course
      );

      if (logIndex !== -1) {
        const removedLog = student.dailyLogs[logIndex];
        student.dailyLogs.splice(logIndex, 1); // remove log

        // decrement overallAttendance
        student.overallAttendance.totalDays = Math.max(0, student.overallAttendance.totalDays - 1);

        // decrement courseAttendance
        const courseData = student.courseAttendance.get(course) || {
          totalDays: 0,
          presentDays: 0,
        };

        student.courseAttendance.set(course, {
          totalDays: Math.max(0, courseData.totalDays - 1),
          presentDays: Math.max(
            0,
            courseData.presentDays - (removedLog.status === "present" ? 1 : 0)
          ),
        });

        // decrement presentDays if student was marked present
        if (removedLog.status === "present") {
          student.overallAttendance.presentDays = Math.max(
            0,
            student.overallAttendance.presentDays - 1
          );
        }

        student.lastUpdated = Date.now();
        await student.save();
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      return res.status(404).json({ message: "No record on that day" });
    }

    return res.status(200).json({
      message: `Deleted ${updatedCount} log(s) for batch ${batch} on ${date} (${course})`,
    });
  } catch (error) {
    console.error("Error deleting attendance log:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

//-------------------------------   Manage Attendance Routes  Start -----------------------------//

module.exports = {
  HandleSessionAttendanceReportPDF,
  HandleSessionAttendanceReportExcel,
  HandleMonthlyAttendanceReportExcel,
  getDashboardData,
  getProfileData,
  addFaculty,
  deleteFaculty,
  updateFaculty,
  addStudent,
  deleteStudent,
  updateStudent,
  HandleUpdateAttendance,
  getStudentsForAttendanceUpdation,
  getViewStudents,
  getViewFaculty,
  deleteAttendanceLog
}