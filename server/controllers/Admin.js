const mongoose = require('mongoose');
const { attendanceSchema } = require('../models/attendance.model');
const { studentSchema } = require('../models/Student');
const Faculty = require('../models/faculty');
const Admin = require("../models/admin");
const BackupAttendance = require('../models/BackUp');

const getModel = require('../CommonServices/getModel');
const TimeTable = require('../models/timetable');
const Coder = require('../models/coding');


const xlsx = require('xlsx');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const nodemailer = require('nodemailer');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const fs = require('fs');


const { syncMetaData } = require('../CommonServices/CommonRoutes')

const crypto = require('crypto');
const bcrypt = require('bcrypt');


async function createSemesterSetup(req, res) {
  try {
    const { semname, batches } = req.body;

    if (!semname || !batches) {
      return res.status(400).json({ message: "Missing semname or batches" });
    }

    const studentCollection = `${semname}-SEM-students`;

    // 0️⃣ Function to check if collection exists
    const collectionExists = async (name) => {
      const collections = await mongoose.connection.db
        .listCollections({ name })
        .toArray();
      return collections.length > 0;
    };

    // 1️⃣ Check and Create Student Collection
    if (await collectionExists(studentCollection)) {
      return res
        .status(400)
        .json({ message: `Collection '${studentCollection}' already exists` });
    }

    const Student = mongoose.models[studentCollection] || mongoose.model(studentCollection, studentSchema, studentCollection);
    await Student.createCollection();


    // 2️⃣ Check and Create Attendance Collections For Each Batch
    const attendanceCollections = [];

    for (const batch of batches) {
      const attendanceCollectionName = `${semname}-SEM-attendance-${batch}`;

      if (await collectionExists(attendanceCollectionName)) {
        return res
          .status(400)
          .json({ message: `Collection '${attendanceCollectionName}' already exists` });
      }

      const AttendanceModel = getModel(attendanceCollectionName, attendanceSchema)

      await AttendanceModel.createCollection();
      attendanceCollections.push(attendanceCollectionName);
    }

    return res.status(200).json({
      message: "Collections created successfully",
      studentCollection,
      attendanceCollections
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

async function modifySemesterSetup(req, res) {
  try {
    const { semname, newsemname, batches, operation } = req.body;

    // 1. Validate Inputs
    if (!semname || !newsemname || !batches || !operation) {
      return res.status(400).json({ message: "Missing semname, newsemname, batches, or operation" });
    }

    // Use a local variable to track the current working semester name
    // If a rename happens, we update this to 'newsemname'
    let currentSemName = semname;

    // 2. RENAME LOGIC (If names differ)
    if (semname !== newsemname) {
      // Find all collections starting with the OLD semname
      const collections = await mongoose.connection.db
        .listCollections({ name: { $regex: new RegExp(`^${semname}`) } })
        .toArray();

      for (const col of collections) {
        const oldName = col.name;
        // Replace the prefix (e.g., "III-" -> "IV-")
        const newName = oldName.replace(semname, newsemname);

        try {
          // Check if target exists to avoid errors
          const targetExists = await mongoose.connection.db
            .listCollections({ name: newName })
            .hasNext();

          if (!targetExists) {
            await mongoose.connection.db.renameCollection(oldName, newName);

            // Clear Mongoose cache for the old model
            if (mongoose.models[oldName]) {
              delete mongoose.models[oldName];
            }
          }
        } catch (err) {
          console.error(`Failed to rename ${oldName} to ${newName}:`, err.message);
        }
      }

      // Update currentSemName so subsequent Add/Remove operations use the NEW name
      currentSemName = newsemname;
    }

    // Helper: Check if collection exists
    const ExistngCollections = async (name) => {
      const collections = await mongoose.connection.db
        .listCollections({ name })
        .toArray();
      return collections.length > 0;
    };

    const processedBatches = [];

    // 3. REMOVE OPERATION
    if (operation === 'remove') {
      // Get the shared student model for this semester
      const StudentCollectionName = `${currentSemName}-SEM-students`;
      const StudentModel = getModel(StudentCollectionName, studentSchema);

      for (const batch of batches) {
        const attendanceCollectionName = `${currentSemName}-SEM-attendance-${batch}`;


        // A. Remove Students belonging to this batch from the shared Student Collection
        try {
          const deleteResult = await StudentModel.deleteMany({ batch: batch });
          // console.log(`Removed ${deleteResult.deletedCount} students from batch: ${batch}`);
        } catch (err) {
          console.error(`Failed to delete students for batch ${batch}:`, err.message);
        }

        // B. Drop the specific Attendance Collection
        if (await ExistngCollections(attendanceCollectionName)) {
          await mongoose.connection.db.dropCollection(attendanceCollectionName);

          // Remove from Mongoose model cache
          if (mongoose.models[attendanceCollectionName]) {
            delete mongoose.models[attendanceCollectionName];
          }
        }

        processedBatches.push(batch);
      }

      return res.status(200).json({
        message: "Semester setup modified (Batches and Students Removed)",
        semname: currentSemName,
        removedBatches: processedBatches
      });
    }

    // 4. ADD OPERATION
    else if (operation === 'add') {
      // Handle Schema (whether it's a Model or a Schema object)
      const schemaToUse = attendanceSchema.schema || attendanceSchema;

      for (const batch of batches) {
        const attendanceCollectionName = `${currentSemName}-SEM-attendance-${batch}`;

        if (await ExistngCollections(attendanceCollectionName)) {
          continue; // Skip existing
        }

        // Create Model Safely
        const AttendanceModel = getModel(attendanceCollectionName, attendanceSchema)

        await AttendanceModel.createCollection();
        processedBatches.push(batch);
      }

      return res.status(200).json({
        message: "Semester setup modified (Batches Added)",
        semname: currentSemName,
        addedBatches: processedBatches
      });
    }
    // reset operation
    // 5. RESET OPERATION (Selected Batches Only)
    else if (operation === 'reset') {
      const StudentCollectionName = `${currentSemName}-SEM-students`;
      const StudentModel = getModel(StudentCollectionName, studentSchema);

      for (const batch of batches) {
        const attendanceCollectionName = `${currentSemName}-SEM-attendance-${batch}`;

        // 1. Check if the specific batch collection exists
        if (!(await ExistngCollections(attendanceCollectionName))) {
          // console.log(`Skipping reset: Collection ${attendanceCollectionName} not found.`);
          continue;
        }

        // 2. Reset attendance for all students in this specific batch collection
        const AttendanceModel = getModel(attendanceCollectionName, attendanceSchema);
        await AttendanceModel.updateMany({}, {
          $set: {
            overallAttendance: { totalDays: 0, presentDays: 0 },
            courseAttendance: {},
            dailyLogs: []
          }
        });

        // 3. Update the 'sem' field for students belonging to this specific batch
        // Note: Assuming your StudentModel has a 'batch' field to identify them
        await StudentModel.updateMany(
          { batch: batch, sem: { $ne: newsemname } },
          { $set: { sem: newsemname } }
        );

        processedBatches.push(batch);
      }
      return res.status(200).json({
        message: "Attendance reset for selected batches",
        semname: currentSemName,
        resetBatches: processedBatches
      });
    }
    else if (operation === 'null') {
      return res.status(200).json({
        message: "Semester modified successfully",
        semname: currentSemName
      });
    }
    else {
      return res.status(400).json({ message: "Invalid operation. Use 'add' or 'remove'." });
    }

  } catch (err) {
    console.error("Error in modifySemesterSetup:", err);
    res.status(500).json({ error: err.message });
  }
};

async function getAllCollections(req, res) {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();


    const groupedResult = {
      attendance: [],
      students: [],
      faculty: [],
      timetables: [],
      others: []
    };

    for (const col of collections) {
      const name = col.name;
      const count = await mongoose.connection.db
        .collection(name)
        .countDocuments();

      const collectionData = {
        collectionName: name,
        documents: count
      };

      if (name.toLowerCase().includes('attendance')) {
        groupedResult.attendance.push(collectionData);
      } else if (name.toLowerCase().includes('student')) {
        groupedResult.students.push(collectionData);
      } else if (name.toLowerCase().includes('faculty')) {
        groupedResult.faculty.push(collectionData);
      } else if (name.toLowerCase().includes('timetable')) {
        groupedResult.timetables.push(collectionData);
      } else {
        groupedResult.others.push(collectionData);
      }
    }

    const getBatchPriority = (name) => {
      const upperName = name.toUpperCase();
      if (upperName.includes('SU')) return 1;
      if (upperName.includes('SN')) return 2;
      if (upperName.includes('SB')) return 3;
      return 4;
    };

    for (const key in groupedResult) {
      groupedResult[key].sort((a, b) => {
        const priorityA = getBatchPriority(a.collectionName);
        const priorityB = getBatchPriority(b.collectionName);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return a.collectionName.localeCompare(b.collectionName);
      });
    }

    return res.status(200).json({
      totalCollections: collections.length,
      groups: groupedResult
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch and group collections",
      details: err.message
    });
  }
}

async function deleteCollections(req, res) {
  try {
    const { collectionNames } = req.body;

    if (!collectionNames || !Array.isArray(collectionNames)) {
      return res.status(400).json({ message: "collectionNames (array) is required" });
    }

    let deleted = [];
    let notFound = [];

    for (const name of collectionNames) {
      // 1. Check if the collection exists
      const exists = await mongoose.connection.db
        .listCollections({ name })
        .toArray();

      if (exists.length === 0) {
        notFound.push(name);
        continue;
      }

      // 2. Logic for Attendance Collections: Delete associated students
      // Pattern: {semname}-SEM-attendance-{batch}
      if (name.includes("-SEM-attendance-")) {
        try {
          const parts = name.split("-SEM-attendance-");
          const currentSemName = parts[0];
          const batchName = parts[1];

          // Define the student collection name for this semester
          const studentCollectionName = `${currentSemName}-SEM-students`;

          // Get the model and delete students belonging to this specific batch
          const StudentModel = getModel(studentCollectionName, studentSchema);
          const deleteResult = await StudentModel.deleteMany({ batch: batchName });

          await mongoose.connection.collection("leaderboard").deleteMany({ batch: batchName });

          // console.log(`Dropped attendance: ${name}. Removed ${deleteResult.deletedCount} students from ${batchName}.`);
        } catch (parseError) {
          console.error(`Metadata extraction failed for ${name}:`, parseError.message);
          // We continue to drop the collection even if student deletion fails
        }
      }

      // 3. Delete (drop) the collection
      await mongoose.connection.db.dropCollection(name);

      // 4. Remove from Mongoose model cache
      if (mongoose.models[name]) {
        delete mongoose.models[name];
      }

      deleted.push(name);
    }

    return res.status(200).json({
      message: "Operation completed",
      deleted,
      notFound
    });

  } catch (err) {
    console.error("Delete Collections Error:", err);
    res.status(500).json({
      error: "Failed to delete collections",
      details: err.message
    });
  }
};

async function modifyCollection(req, res) {
  try {
    const { semname, batch, courses } = req.body;

    if (!semname || !batch || !courses || !Array.isArray(courses)) {
      return res.status(400).json({ msg: "Missing fields or invalid courses format" });
    }

    const attendanceCollectionName = `${semname}-SEM-attendance-${batch}`;
    const AttendanceModel = getModel(attendanceCollectionName, attendanceSchema);


    const newCourseAttendanceMap = {};
    courses.forEach(course => {
      newCourseAttendanceMap[course] = { totalDays: 0, presentDays: 0 };
    });

    await AttendanceModel.updateMany(
      {},
      {
        $set: {
          courseAttendance: newCourseAttendanceMap
        }
      }
    );


    await syncMetaData();

    return res.status(200).json({
      success: true,
      msg: `Success: Overwrote all courses in ${attendanceCollectionName}. Now contains: ${courses.join(", ")}`
    });

  } catch (error) {
    console.error("❌ Error overwriting collection:", error);
    return res.status(500).json({ success: false, msg: "Internal Server Error", error: error.message });
  }
};

async function addStudents(req, res) {
  try {
    let { attendanceCollectionName, courses } = req.body;

    if (typeof courses === 'string') {
      try {
        const cleanedCourses = courses.trim();
        courses = JSON.parse(cleanedCourses);
        // console.log("Successfully converted string to array:", courses);
      } catch (e) {
        if (courses.includes(',')) {
          courses = courses.split(',').map(item => item.trim().replace(/["'[\]]/g, ""));
          // console.log("Converted comma-separated string to array:", courses);
        } else {
          return res.status(400).json({
            success: false,
            message: "Format Error: Use [\"CP\",\"JFS\"] ."
          });
        }
      }
    }
    if (!Array.isArray(courses)) {
      return res.status(400).json({ message: "Courses must be an array." });
    }

    if (!attendanceCollectionName || !Array.isArray(courses)) {
      return res.status(400).json({ message: "Missing attendanceCollectionName or courses." });
    }

    const sem = attendanceCollectionName.split('-')[0];
    const batch = attendanceCollectionName.split('-')[3];

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const sheetData = xlsx.utils.sheet_to_json(sheet);

    if (sheetData.length === 0) {
      return res.status(400).json({ message: "Excel file is empty." });
    }

    // --- FIELD VALIDATION ---
    const requiredFields = ["Roll No", "Name of the Student", "Branch", "Batch"];
    const firstRow = sheetData[0];
    const missingFields = requiredFields.filter(field => !(field in firstRow));

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Fields not matched",
        missingFields: missingFields,
        expectedFields: requiredFields
      });
    }

    const studentCollectionName = `${sem}-SEM-students`;
    const AttendanceModel = mongoose.models[attendanceCollectionName] || mongoose.model(attendanceCollectionName, attendanceSchema, attendanceCollectionName);
    const StudentModel = mongoose.models[studentCollectionName] || mongoose.model(studentCollectionName, studentSchema, studentCollectionName);



    const today = new Date().toISOString().split('T')[0];
    const secretKey = process.env.Attendance_Secret;
    const hashedPassword = await bcrypt.hash(`pat@${new Date().getFullYear()}`, 10);

    const studentsData = [];
    const attendanceData = [];
    const mismatchedrolls = [];
    // const codersData = [];

    for (const row of sheetData) {
      const rollno = String(row['Roll No']).trim();
      const excelbatch = String(row['Batch']).trim();

      // Batch check
      if (batch !== excelbatch) {
        mismatchedrolls.push({ rollno, batch: excelbatch, expectedBatch: batch });
        continue;
      }

      // --- FIXED QR GENERATION ---
      // Uses the current loop's data instead of undefined 'student'
      const combinedData = `${rollno}:${excelbatch}:${sem}:${today}:${secretKey}`;
      const qrData = crypto.createHmac('sha256', secretKey)
        .update(combinedData)
        .digest('hex');

      const qrPayload = JSON.stringify({
        rollno: rollno,
        sem: sem,
        batch: excelbatch,
        hash: qrData
      });
      const qrLink = await QRCode.toDataURL(qrPayload);

      const studentDoc = {
        name: row['Name of the Student'].toUpperCase(),
        rollno: rollno.toUpperCase().trim(),
        password: hashedPassword,
        branch: row['Branch'],
        batch: excelbatch.toUpperCase(),
        sem: sem,
        email: `${rollno.toLowerCase()}@iare.ac.in`,
        qrData: qrData,
        qrLink: qrLink
      };

      const courseAttendanceMap = {};
      courses.forEach(course => {
        courseAttendanceMap[course] = { totalDays: 0, presentDays: 0 };
      });

      const attendanceDoc = {
        rollno: rollno.toUpperCase(),
        name: row['Name of the Student'],
        branch: row['Branch'],
        batch: excelbatch.toUpperCase(),
        overallAttendance: { totalDays: 0, presentDays: 0 },
        courseAttendance: courseAttendanceMap,
        dailyLogs: [],
        lastUpdated: new Date()
      };

      // const coderDoc = {
      //   rollno: rollno.toUpperCase(),
      //   name: row['Name of the Student'],
      //   branch: row['Branch'],
      //   sem: sem,
      //   batch: excelbatch.toUpperCase(),
      //   handles: {},
      //   scores: {},
      //   totalScore: 0
      // };

      studentsData.push(studentDoc);
      attendanceData.push(attendanceDoc);
      // codersData.push(coderDoc);
    }

    // Bulk operations
    const studentOps = studentsData.map(doc => ({
      updateOne: { filter: { rollno: doc.rollno }, update: { $set: doc }, upsert: true }
    }));

    const attendanceOps = attendanceData.map(doc => ({
      updateOne: { filter: { rollno: doc.rollno }, update: { $set: doc }, upsert: true }
    }));

    // const coderOps = codersData.map(doc => ({
    //   updateOne: { filter: { rollno: doc.rollno }, update: { $set: doc }, upsert: true }
    // }));

    if (studentsData.length > 0) {
      await Promise.all([
        StudentModel.bulkWrite(studentOps),
        AttendanceModel.bulkWrite(attendanceOps),
        // Coder.bulkWrite(coderOps)
      ]);
    }

    res.status(200).json({
      success: true,
      message: `Processed ${studentsData.length} valid students.`,
      addedCount: studentsData.length,
      mismatchedCount: mismatchedrolls.length,
      mismatchedBatchRolls: mismatchedrolls
    });

  } catch (error) {
    console.error("Add Students Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

async function createTimeTable(req, res) {
  try {
    const { sem, batch, weekSchedule } = req.body;

    // 1. Basic Validation
    if (!sem || !batch) {
      return res.status(400).json({
        error: "Missing required fields: 'sem' and 'batch' are mandatory."
      });
    }

    if (!weekSchedule || !Array.isArray(weekSchedule) || weekSchedule.length === 0) {
      return res.status(400).json({
        error: "Invalid schedule: 'weekSchedule' must be a non-empty array."
      });
    }

    // check is timetable already exists  
    const existingTimetable = await TimeTable.findOne({ sem, batch });
    if (existingTimetable) {
      return res.status(400).json({
        error: `Timetable for Sem: '${sem}' and Batch: '${batch}' already exists. Use update endpoint to modify.`
      });
    }
    // 2. Create New Timetable Document
    const newTimeTable = new TimeTable({
      sem,
      batch,
      weekSchedule
    });
    await newTimeTable.save();
    res.status(201).json({
      message: "Timetable created successfully.",
      timetable: newTimeTable
    });
  } catch (error) {
    console.error("Error creating timetable:", error);
    res.status(500).json({ error: error.message });
  }
};

function formatExcelTime(value) {
  if (!value) return null;

  // If it's already a string like "09:30", just return it
  if (typeof value === 'string') return value.trim();

  // If it's a number (Excel decimal), convert it
  if (typeof value === 'number') {
    // Excel fraction * 24 hours * 60 minutes
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Pad with zeros (e.g., 9:5 -> 09:05)
    const hoursStr = String(hours).padStart(2, '0');
    const minStr = String(minutes).padStart(2, '0');
    return `${hoursStr}:${minStr}`;
  }

  return value;
};

async function uploadTimeTable(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Read Excel
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];

    // raw: true gets the underlying number (0.39), which allows our helper to convert it accurately
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });

    if (rows.length === 0) {
      return res.status(400).json({ error: "Excel sheet is empty." });
    }

    const batchesMap = {};

    for (const row of rows) {
      const sem = row['Sem']?.toString().trim();
      const batch = row['Batch']?.toString().trim();

      if (!sem || !batch) continue;

      const batchKey = `${sem}_${batch}`;

      if (!batchesMap[batchKey]) {
        batchesMap[batchKey] = {
          sem,
          batch,
          scheduleMap: {}
        };
      }

      const day = row['Day']?.trim();

      // Handle Faculty
      const facultyString = row['Faculty'] ? String(row['Faculty']) : "";
      const facultyArray = facultyString.includes(',')
        ? facultyString.split(',').map(f => f.trim())
        : [facultyString.trim()];

      // --- FIX: USE THE HELPER FUNCTION HERE ---
      const period = {
        startTime: formatExcelTime(row['StartTime']), // Converts 0.3958 -> "09:30"
        endTime: formatExcelTime(row['EndTime']),     // Converts 0.5104 -> "12:15"
        session: row['Session'],
        subject: row['Subject'],
        facultyName: facultyArray,
        roomNo: row['Room']?.toString()
      };

      if (!batchesMap[batchKey].scheduleMap[day]) {
        batchesMap[batchKey].scheduleMap[day] = [];
      }
      batchesMap[batchKey].scheduleMap[day].push(period);
    }

    // Convert to DB Operations
    const ops = [];
    for (const key in batchesMap) {
      const data = batchesMap[key];
      const weekSchedule = [];

      for (const day in data.scheduleMap) {
        weekSchedule.push({
          day: day,
          periods: data.scheduleMap[day]
        });
      }

      ops.push({
        updateOne: {
          filter: { sem: data.sem, batch: data.batch },
          update: {
            $set: {
              sem: data.sem,
              batch: data.batch,
              weekSchedule: weekSchedule
            }
          },
          upsert: true
        }
      });
    }

    if (ops.length > 0) {
      await TimeTable.bulkWrite(ops);
    }

    res.status(200).json({
      message: "Timetables uploaded and Time Formats fixed successfully",
      totalBatchesUpdated: ops.length
    });

  } catch (error) {
    console.error("Error uploading timetable:", error);
    res.status(500).json({ error: error.message });
  }
};

async function getTimeTable(req, res) {
  try {
    const { sem, batch } = req.query;
    if (!sem || !batch) {
      return res.status(400).json({ error: "Missing 'sem' or 'batch' parameter." });
    }

    if (batch === 'all') {
      const timeTables = await TimeTable.find({ sem: sem })
        .select('-_id -__v -createdAt -updatedAt -weekSchedule._id -weekSchedule.periods._id')
        .lean();
      if (timeTables.length === 0) {
        return res.status(404).json({ error: "No timetables found for the specified sem." });
      }
      return res.status(200).json(timeTables);
    }
    else {
      const timeTable = await TimeTable.findOne({ sem: sem, batch: batch })
        .select('-_id -__v -createdAt -updatedAt -weekSchedule._id -weekSchedule.periods._id')
        .lean();
      if (!timeTable) {
        return res.status(404).json({ error: "Timetable not found for the specified sem and batch." });
      }
      res.status(200).json(timeTable);
    }
  } catch (error) {
    console.error("Error fetching timetable:", error);
    res.status(500).json({ error: error.message });
  }
};

async function modifyTimeTable(req, res) {
  const { sem, batch, weekSchedule } = req.body;
  try {
    if (!sem || !batch || !weekSchedule) {
      return res.status(400).json({ error: "Missing 'sem', 'batch', or 'weekSchedule' in request body." });
    }
    const updatedTimetable = await TimeTable.findOneAndUpdate(
      { sem: sem, batch: batch },
      { weekSchedule: weekSchedule },
      { new: true }
    );
    if (!updatedTimetable) {
      return res.status(404).json({ error: "Timetable not found for the specified sem and batch." });
    }
    res.status(200).json({
      message: "Timetable updated successfully.",
      timetable: updatedTimetable
    });
  } catch (error) {
    console.error("Error updating timetable:", error);
    res.status(500).json({ error: error.message });
  }
};

async function getAllTimetables(req, res) {
  try {
    const rawData = await TimeTable.find({})
      .select('-__v -createdAt -updatedAt')
      .lean();

    // Grouping by Semester
    const groupedData = rawData.reduce((acc, current) => {
      const semester = current.sem;

      // If this semester doesn't exist in our accumulator yet, create it
      if (!acc[semester]) {
        acc[semester] = {
          semester: semester,
          batches: []
        };
      }

      // Push the current batch timetable into the corresponding semester
      acc[semester].batches.push(current);

      return acc;
    }, {});

    // Convert the object back into an array for the response
    const finalResult = Object.values(groupedData);

    return res.status(200).json({
      success: true,
      count: finalResult.length, // Number of unique semesters
      data: finalResult
    });

  } catch (error) {
    console.error("Error fetching grouped timetables:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
};

async function deleteTimetable(req, res) {
  const { sem, batch } = req.body;

  try {
    if (!sem || !batch) {
      return res.status(400).json({
        error: "Missing 'sem' or 'batch' in request body. Both are required to delete a timetable."
      });
    }

    const deletedTimetable = await TimeTable.findOneAndDelete({
      sem: sem,
      batch: batch
    });

    if (!deletedTimetable) {
      return res.status(404).json({
        error: "Timetable not found for the specified semester and batch."
      });
    }

    return res.status(200).json({
      success: true,
      message: `Timetable for Semester ${sem}, Batch ${batch} has been deleted successfully.`,
      deletedData: {
        sem: deletedTimetable.sem,
        batch: deletedTimetable.batch
      }
    });

  } catch (error) {
    console.error("Error deleting timetable:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
};


//-------------------------------   Manage Student Routes  Start    ----------------------------//

async function getViewStudents(req, res) {
  const { semname } = req.params;

  if (!semname) {
    return res.status(400).json({ error: "Missing 'semname' parameter." });
  }

  const collectionName = `${semname}-SEM-students`;

  const collectionExists = await mongoose.connection.db
    .listCollections({ name: collectionName })
    .toArray();
  if (collectionExists.length === 0) {
    return res.status(404).json({ error: `Collection '${collectionName}' does not exist.` });
  }
  const StudentModel = getModel(collectionName, studentSchema);
  try {
    // 1. Get all students
    let students = await StudentModel.find()
      .select("rollno name batch branch") // also fetch branch
      .lean();

    // 2. For each student, fetch attendance + handles
    const AllStudents = await Promise.all(
      students.map(async (student) => {
        try {


          // --- Coder Handles ---
          let coderData = await Coder.findOne({
            rollno: new RegExp(`^${student.rollno}$`, "i"),
          })
            .select("handles")
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
  try {
    // 'handles' and 'courses' are now optional
    const { semname, rollno, name, branch, batch, handles, courses } = req.body;

    // 1. Validation: Removed handles/courses from this check
    if (!semname || !rollno || !name || !branch || !batch) {
      return res.status(400).json({ message: 'Roll No, Name, Branch, and Batch are required.' });
    }
    // 2. Dynamic Student Collection Check
    const studentCollectionName = `${semname}-SEM-students`;

    const collectionExists = await mongoose.connection.db
      .listCollections({ name: studentCollectionName })
      .toArray();

    if (collectionExists.length === 0) {
      return res.status(404).json({ error: `Semester Collection '${studentCollectionName}' does not exist.` });
    }

    // 3. Create Dynamic Student Model
    const StudentModel = getModel(studentCollectionName, studentSchema);

    // Converting to Uppercase
    rollno.toUpperCase().trim();

    // Check for duplicates
    const existingStudent = await StudentModel.findOne({ rollno });
    if (existingStudent) {
      return res.status(409).json({ message: 'A student with this Roll No already exists.' });
    }

    // 4. Prepare Security Data (Password & QR)
    const currentYear = new Date().getFullYear();
    const defaultPassword = `pat@${currentYear}`;
    const hashedNewPassword = await bcrypt.hash(defaultPassword, 10);
    const email = `${rollno.toLowerCase()}@.iare.ac.in`;

    // QR Generation
    const SECRET_KEY = process.env.Attendance_Secret;
    const today = new Date().toISOString().slice(0, 10);
    const dataToHash = `${rollno}:${batch}:${semname}:${today}:${SECRET_KEY}`;
    const qrHash = crypto.createHash("sha256").update(dataToHash).digest("hex");

    const qrPayload = JSON.stringify({
      rollno: rollno,
      sem: semname,
      batch: batch,
      hash: qrHash
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload);

    // 5. Create Student Document
    const newStudent = new StudentModel({
      name,
      rollno,
      password: hashedNewPassword,
      branch,
      batch,
      sem: semname,
      email,
      qrData: qrHash,
      qrLink: qrDataUrl
    });


    // const newCoder = new Coder({
    //   rollno,
    //   name,
    //   branch,
    //   sem: semname,
    //   batch,
    //   handles: new Map(Object.entries(handles || {}))
    // });

    const attendanceCollectionName = `${semname}-SEM-attendance-${batch}`;

    const AttendanceSchemaToUse = attendanceSchema.schema || attendanceSchema;
    const AttendanceModel = getModel(attendanceCollectionName, attendanceSchema);

    // Initialize course map (Default to empty object if courses not provided)
    const courseMap = {};
    if (courses && Array.isArray(courses)) {
      courses.forEach(c => {
        courseMap[c] = { totalDays: 0, presentDays: 0 };
      });
    }

    const newAttendanceRecord = new AttendanceModel({
      rollno,
      name,
      branch,
      batch,
      overallAttendance: { totalDays: 0, presentDays: 0 },
      courseAttendance: courseMap,
      dailyLogs: []
    });

    // 8. Save All Documents
    await newStudent.save();
    // await newCoder.save();
    await newAttendanceRecord.save();

    res.status(201).json({
      message: 'Student added successfully!',
      student: {
        name,
        rollno,
        sem: semname,
        batch: batch
      }
    });

  } catch (error) {
    console.error("Add Student Error:", error);
    res.status(500).json({ message: 'Error adding student.', error: error.message });
  }
};

async function deleteStudent(req, res) {
  const { semname, rollno } = req.body;

  if (!semname || !rollno) {
    return res.status(400).json({ message: 'Roll No is required.' });
  }

  const studentCollectionName = `${semname}-SEM-students`;

  const collectionExists = await mongoose.connection.db
    .listCollections({ name: studentCollectionName })
    .toArray();
  if (collectionExists.length === 0) {
    return res.status(404).json({ error: `Collection '${studentCollectionName}' does not exist.` });
  }
  const StudentModel = getModel(studentCollectionName, studentSchema);
  try {
    // 1. Find the student first to get their batch
    const studentToDelete = await StudentModel.findOne({ rollno }).lean();
    if (!studentToDelete) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const batchFormatted = `${semname}-SEM-attendance-${studentToDelete.batch}`;

    // 2. Get the dynamic attendance model using the student's batch
    const Attendance = getModel(batchFormatted, attendanceSchema);

    // 3. Delete the student from all three collections
    await StudentModel.deleteOne({ rollno });
    // await Coder.deleteOne({ rollno });
    await Attendance.deleteOne({ rollno });

    res.status(200).json({ message: `Student ${rollno} deleted successfully from all systems.` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting student.', error: error.message });
  }
};

async function updateStudent(req, res) {
  const { semname, rollno, ...updateData } = req.body;

  if (!semname || !rollno) {
    return res.status(400).json({ message: 'Roll No and Semester name are required for updates.' });
  }

  const collectionName = `${semname}-SEM-students`;

  // Check if student collection exists
  const collectionExists = await mongoose.connection.db
    .listCollections({ name: collectionName })
    .toArray();

  if (collectionExists.length === 0) {
    return res.status(404).json({ error: `Collection '${collectionName}' does not exist.` });
  }

  const StudentModel = getModel(collectionName, studentSchema);

  try {
    // 1. Find Original Student
    const originalStudent = await StudentModel.findOne({ rollno });
    if (!originalStudent) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const oldBatch = originalStudent.batch;
    const newBatch = updateData.batch;

    // 2. Update Student Document
    const updatedStudent = await StudentModel.findOneAndUpdate(
      { rollno },
      updateData,
      { new: true }
    );

    // 3. Update Coder Model
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

    // =========================================================
    // 4. ATTENDANCE MIGRATION (The Fix)
    // =========================================================
    if (newBatch && newBatch !== oldBatch) {
      // console.log(`🔄 Migrating Attendance from ${oldBatch} to ${newBatch}...`);

      const oldAttendanceCol = `${semname}-SEM-attendance-${oldBatch}`;
      const newAttendanceCol = `${semname}-SEM-attendance-${newBatch}`;


      const OldAttendanceModel = getModel(oldAttendanceCol, attendanceSchema);

      const NewAttendanceModel = getModel(newAttendanceCol, attendanceSchema);

      // --- SAFETY FIX: CLEANUP GHOST DATA ---
      // If there is already a 'null' rollno document in the target, delete it to prevent error 11000
      await NewAttendanceModel.deleteOne({ rollno: null });
      await NewAttendanceModel.deleteOne({ rollno: { $exists: false } });

      // Find Old Record
      const attendanceRecord = await OldAttendanceModel.findOne({ rollno }).lean();

      if (attendanceRecord) {
        // --- FIX: Explicitly set rollno to ensure it's never null ---
        const recordToTransfer = {
          ...attendanceRecord,
          batch: newBatch,
          rollno: rollno, // <--- CRITICAL FIX: Force the roll number
          _id: undefined
        };

        if (updateData.name) recordToTransfer.name = updateData.name;
        if (updateData.branch) recordToTransfer.branch = updateData.branch;

        // INSERT into New Collection
        await NewAttendanceModel.create(recordToTransfer);
        // console.log(`✅ Created record in ${newAttendanceCol}`);

        // DELETE from Old Collection
        await OldAttendanceModel.deleteOne({ rollno });
        // console.log(`❌ Deleted record from ${oldAttendanceCol}`);

      } else {
        console.warn(`⚠️ No attendance record found for ${rollno}. Creating fresh.`);

        await NewAttendanceModel.create({
          rollno: rollno, // <--- CRITICAL FIX: Use variable from scope
          name: updatedStudent.name,
          branch: updatedStudent.branch,
          batch: newBatch,
          overallAttendance: { totalDays: 0, presentDays: 0 },
          courseAttendance: {},
          dailyLogs: []
        });
      }
    }

    res.status(200).json({
      message: 'Student updated successfully across all systems!',
      student: updatedStudent
    });

  } catch (error) {
    console.error("Update Student Error:", error);
    res.status(500).json({
      message: 'Error updating student.',
      error: error.message
    });
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendMailToBatches(req, res) {
  try {
    const { semester, batches, subject, message } = req.body;

    if (!semester || !batches || !Array.isArray(batches) || !subject || !message) {
      return res.status(400).json({ message: "Missing required fields in request body." });
    }

    const studentCollectionName = `${semester}-SEM-students`;
    const StudentModel = getModel(studentCollectionName, studentSchema);

    const students = await StudentModel.find(
      { batch: { $in: batches } },
      'email name'
    );

    const emailList = students.map(student => student.email).filter(email => email);

    if (emailList.length === 0) {
      return res.status(404).json({ message: "No students found in these batches." });
    }

    // 2. Configure Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });


    const chunkSize = 25;
    const delayBetweenChunks = 5000; // 5 seconds
    let totalSent = 0;

    for (let i = 0; i < emailList.length; i += chunkSize) {
      const currentChunk = emailList.slice(i, i + chunkSize);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        bcc: currentChunk,
        subject: subject,
        text: message
      };

      await transporter.sendMail(mailOptions);
      totalSent += currentChunk.length;

      // console.log(`Sent ${totalSent}/${emailList.length} emails...`);

      if (i + chunkSize < emailList.length) {
        await sleep(delayBetweenChunks);
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully sent emails to ${totalSent} students in ${Math.ceil(emailList.length / chunkSize)} batches.`,
    });

  } catch (error) {
    console.error("Throttled Mail Error:", error);
    res.status(500).json({ error: error.message });
  }
};

async function sendMailToIndividual(req, res) {
  try {
    const { emailroll, subject, message } = req.body;
    if (!emailroll || !subject || !message) {
      return res.status(400).json({ message: "Missing required fields in request body." });
    }
    // 2. Configure Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: message
    };
    const email = `${emailroll.toLowerCase()}@.iare.ac.in`;
    await transporter.sendMail(mailOptions);
    res.status(200).json({
      success: true,
      message: `Email sent successfully to ${email}.`,
    });
  } catch (error) {
    console.error("Individual Mail Error:", error);
    res.status(500).json({ error: error.message });
  }
};



//-------------------------------   Manage Student Routes  End      ----------------------------//

//-------------------------------   Manage Faculty Routes  Start    ----------------------------//

async function getViewFaculty(req, res) {
  try {
    const faculty = await Faculty.find({})
      .select('name facultyid designation sem subjects_assigned batches_assigned email');

    if (faculty.length === 0) {
      return res.status(404).json({ msg: 'No faculty found' });
    }

    res.status(200).json(faculty);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

async function addFaculty(req, res) {

  const { name, facultyid, email, sem, designation, batches_assigned, subjects_assigned } = req.body;

  // 1. Basic validation
  if (!name || !facultyid || !email) {
    return res.status(400).json({ message: 'Name, Faculty ID, and Email are required.' });
  }

  try {
    // 2. Check for existing faculty (ID or Email)
    const existingFaculty = await Faculty.findOne({
      $or: [{ facultyid }, { email }]
    });

    if (existingFaculty) {
      return res.status(409).json({ message: 'Faculty with this ID or email already exists.' });
    }

    // 3. Password Generation (e.g., F123@25)
    const yearLastTwoDigits = new Date().getFullYear().toString().slice(-2);
    const defaultPassword = `${facultyid}@${yearLastTwoDigits}`;
    const hashedNewPassword = await bcrypt.hash(defaultPassword, 10);

    // 4. Create new faculty instance
    // Note: If your frontend sends objects, map them to the string format here.
    // Otherwise, pass them directly if they are already formatted strings.
    const newFaculty = new Faculty({
      name,
      facultyid,
      password: hashedNewPassword,
      email,
      sem, // Array of strings e.g., ["VI", "VII"]
      designation,
      subjects_assigned,
      batches_assigned,
    });

    // 5. Save to database
    const savedFaculty = await newFaculty.save();

    res.status(201).json({
      message: 'Faculty added successfully!',
      faculty: {
        id: savedFaculty._id,
        name: savedFaculty.name,
        facultyid: savedFaculty.facultyid,
        email: savedFaculty.email
      }
    });

  } catch (error) {
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
  const { facultyid, ...updateData } = req.body; // 🚫 Extract and ignore password

  if (!facultyid) {
    return res.status(400).json({ message: 'Faculty ID is required for updates.' });
  }

  try {


    const updatedFaculty = await Faculty.findOneAndUpdate(
      { facultyid: facultyid },
      { $set: updateData },
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
};

//-------------------------------   Manage Faculty Routes  End      ----------------------------//

//-------------------------------   Manage Attendance Routes  Start -----------------------------//

async function getStudentsForAttendanceUpdation(req, res) {
  try {
    const { semname, batch, date, course, status } = req.query;

    // ✅ Validation
    if (!semname || !batch || !date || !course || !status) {
      return res
        .status(400)
        .json({ message: "Missing semname, batch, date, course, or status" });
    }

    // ✅ Ensure valid status
    if (!["present", "absent"].includes(status.toLowerCase())) {
      return res
        .status(400)
        .json({ message: "Invalid status. Must be 'present' or 'absent'." });
    }

    batchFormatted = `${semname}-SEM-attendance-${batch}`;
    // ✅ Get Attendance Model
    let Attendance;
    try {
      Attendance = getModel(batchFormatted, attendanceSchema);
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
    const { semname, course, students, batch, date, status } = req.body;

    // ✅ Validation
    if (!semname || !course || !Array.isArray(students) || !batch || !date || !status) {
      return res.status(400).json({ message: "Missing semname, course, students, batch, date, or status" });
    }

    if (!["present", "absent"].includes(status.toLowerCase())) {
      return res.status(400).json({ message: "Invalid status. Must be 'present' or 'absent'." });
    }

    const batchFormatted = `${semname}-SEM-attendance-${batch}`;
    const Attendance = getModel(batchFormatted, attendanceSchema);
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

    // console.log(`📝 Found ${studentsWithLogs.length} students with logs for ${targetDate}`);

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
    // console.log(`📊 Bulk operation result:`, result);

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
    const { semname, batch, date, course } = req.body;
    if (!semname || !batch || !date || !course) {
      return res.status(400).json({ message: "semname, batch, date, and course are required" });
    }

    const batchFormatted = `${semname}-SEM-attendance-${batch}`;
    const Attendance = getModel(batchFormatted, attendanceSchema);

    console.log("bf", batchFormatted, Attendance);
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

//-------------------------------   Manage Attendance Routes  End -----------------------------//


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

function getSafeDayFromDate(dateString) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date(dateString);
  return days[date.getDay()];
}

async function HandleSessionAttendanceReportExcel(req, res) {
  const { semname, date, session, format = "excel" } = req.query;

  if (!semname || !date || !session || format !== "excel") {
    return res.status(400).json({
      message: "semname, date, session (FN/AN), and format=excel are required",
    });
  }

  const cleanSem = semname.trim(); // Remove spaces
  const cleanSession = session.trim();
  const Day = getSafeDayFromDate(date);

  // 1. Fetch full timetable documents instead of just distinct batches
  const timetables = await TimeTable.find({
    sem: cleanSem,
    weekSchedule: {
      $elemMatch: {
        day: Day,
        periods: {
          $elemMatch: { session: cleanSession }
        }
      }
    }
  });

  if (!timetables || timetables.length === 0) {
    return res.status(404).json({
      message: `No batches found for ${cleanSem} Sem on ${Day} (${date}) for ${cleanSession} session. Check your TimeTable DB.`
    });
  }

  // 2. Map batches to the specific subjects taught in this session
  const batchSubjects = {};
  for (const tt of timetables) {
    const daySchedule = tt.weekSchedule.find(d => d.day === Day);
    if (daySchedule) {
      // Find the exact periods that match "FN" or "AN"
      const targetPeriods = daySchedule.periods.filter(p => p.session === cleanSession);
      if (targetPeriods.length > 0) {
        // Extract the unique subject names (e.g., ["DAA_BOOTCAMP"])
        batchSubjects[tt.batch] = [...new Set(targetPeriods.map(p => p.subject).filter(Boolean))];
      }
    }
  }

  const batches = Object.keys(batchSubjects);

  const allSummaries = [];
  const allAbsentees = [];
  const branchWiseSummary = {};

  try {
    for (const b of batches) {
      const attendanceCollectionName = `${semname}-SEM-attendance-${b}`;
      const targetCourses = batchSubjects[b] || []; // The courses for this specific batch & session

      const Attendance = getModel(attendanceCollectionName, attendanceSchema);
      const students = await Attendance.find();

      const branchData = {};

      for (const student of students) {
        const branch = student.branch || "UNKNOWN";
        const shortBatch = student.batch;

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

        // 3. Filter logs by BOTH date AND the specific course(s) for this session
        const logsForDateAndSession = student.dailyLogs?.filter(
          (log) => log.date === date && targetCourses.includes(log.course)
        );

        const wasPresent = logsForDateAndSession?.some(
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

    const branchWiseData = Object.values(branchWiseSummary).map(branch => ({
      ...branch,
      batches: Array.from(branch.batches).sort((a, b) =>
        a.localeCompare(
          b,
          undefined,
          {
            numeric: true,
          }
        )
      ).join(', ')
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
    styleHeaders(summarySheet, `B.Tech ${cleanSem} Semester Attendance Summary`);

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

    const batchGroups = {};
    allSummaries.forEach(item => {
      if (!batchGroups[item.batch]) batchGroups[item.batch] = [];
      batchGroups[item.batch].push(item);
    });

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
    styleHeaders(branchSummarySheet, `B.Tech ${cleanSem} Semester Branch-wise Summary`);

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
        const sortedAbsentees = branchData.absenteesList.sort((a, b) => a.rollno.localeCompare(b.rollno));

        const sheetName = branch.replace(/[\\\/\?\*\[\]]/g, "").slice(0, 31);
        const sheet = workbook.addWorksheet(sheetName);

        const branchBatches = [...new Set(sortedAbsentees.map(student => student.batch))].sort();

        styleHeaders(sheet, `${cleanSem} SEM ${branch} - Absentees List`);

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

    const fileName = `${semname}: ${session}-${displayDate}_Attendance_Report.xlsx`;
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
  const { semname, date, session } = req.query;

  if (!semname || !date || !session) {
    return res.status(400).json({
      message: "semname, batch (array), date, and session (FN/AN) are required",
    });
  }

  const cleanSem = semname.trim();
  const cleanSession = session.trim();
  if (!["FN", "AN"].includes(cleanSession)) {
    return res.status(400).json({
      message: "Session must be FN or AN",
    });
  }
  const Day = getSafeDayFromDate(date);

  const timetables = await TimeTable.find({
    sem: cleanSem,
    weekSchedule: {
      $elemMatch: {
        day: Day,
        periods: {
          $elemMatch: { session: cleanSession }
        }
      }
    }
  });

  if (!timetables || timetables.length === 0) {
    return res.status(404).json({
      message: `No batches found for ${cleanSem} Sem on ${Day} (${date}) for ${cleanSession} session. Check your TimeTable DB.`,
    });
  }

  const batchSubjects = {};

  for (const tt of timetables) {
    const daySchedule = tt.weekSchedule.find(
      d => d.day === Day
    );

    if (daySchedule) {
      const targetPeriods = daySchedule.periods.filter(
        p => p.session === cleanSession
      );

      if (targetPeriods.length > 0) {
        batchSubjects[tt.batch] = [
          ...new Set(
            targetPeriods
              .map(p => p.subject)
              .filter(Boolean)
          ),
        ];
      }
    }
  }

  const batches = Object.keys(batchSubjects);


  const allSummaries = [];
  const allAbsentees = [];
  const branchWiseSummary = {}; // New object to track branch-wise data

  try {
    for (const b of batches) {
      const attendanceCollectionName = `${semname}-SEM-attendance-${b}`;

      const Attendance = getModel(attendanceCollectionName, attendanceSchema);
      const targetCourses = batchSubjects[b] || [];

      const students = await Attendance.find(
        {},
        {
          name: 1,
          rollno: 1,
          branch: 1,
          batch: 1,
          dailyLogs: 1,
        }
      );
      const branchData = {};

      for (const student of students) {
        const branch = (student.branch || "UNKNOWN")
          .trim()
          .toUpperCase(); const shortBatch = student.batch;

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

        const wasPresent =
          student.dailyLogs?.some(log =>
            log.date === date &&
            targetCourses.includes(log.course) &&
            log.status.toLowerCase() === "present"
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
            absentees: branchInfo.absenteesList.sort((a, b) =>
              a.rollno.localeCompare(
                b.rollno,
                undefined,
                { numeric: true }
              )
            )
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

    const fileName = `${semname}-${session}-${displayDate}-AttendanceReport.pdf`;
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
    let currentY = addHeaders(doc, `B.Tech ${semname} Semester Attendance Summary`);

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
        yPos = addHeaders(doc, `B.Tech ${semname} Semester Attendance Summary`);
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
    currentY = addHeaders(doc, `B.Tech ${semname} Semester Branch-wise Summary`);

    // Branch-wise summary table
    const branchTableHeaders = [`${semname} SEM BRANCH (BATCHES)`, 'Total Strength', 'Present', 'Absent'];
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
        yPos = addHeaders(doc, `B.Tech ${semname} Semester Branch-wise Summary`);
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
      const title = `${semname} SEM ${branch} - Absentees List`;
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

const dayjs = require("dayjs");
const { get } = require('http');
const COLLECTION_PREFIX = "attendance_";

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
  const Attendance = getModel(collectionName, attendanceSchema);
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

async function listAttendanceCollections(semname) {
  const all = await mongoose.connection.db.listCollections().toArray();
  return all.map((x) => x.name).filter((n) => n.startsWith(`${semname}-SEM-attendance-`));
}

// =========================================================================
// EXCEL SHEET BUILDERS
// =========================================================================

async function buildSheetForCollection(workbook, collectionName, fromISO, toISO) {
  const Attendance = getModel(collectionName, attendanceSchema);
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
    const { semname, from, to } = req.query;
    if (!semname || !from || !to) {
      return res.status(400).json({ message: "Missing required query parameters: semname, from, to (YYYY-MM-DD)" });
    }

    const fromISO = toISO(from);
    const toISODate = toISO(to);
    if (!dayjs(fromISO).isValid() || !dayjs(toISODate).isValid() || dayjs(fromISO).isAfter(toISODate)) {
      return res.status(400).json({ message: "Invalid date range." });
    }

    const collections = await listAttendanceCollections(semname);
    if (collections.length === 0) {
      return res.status(404).json({ message: "No attendance collections found." });
    }
    collections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const wb = new ExcelJS.Workbook();
    wb.creator = "Attendance Management System";
    wb.created = new Date();

    for (const colName of collections) {
      // console.log(`Building sheet for: ${colName}`);
      await buildSheetForCollection(wb, colName, fromISO, toISODate);
    }

    createSummarySheet(wb, fromISO, toISODate);

    const fileName = `CDC-${semname}-Attendance_Report_${dayjs(fromISO).format("DD-MMM-YYYY")}_to_${dayjs(toISODate).format("DD-MMM-YYYY")}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await wb.xlsx.write(res);
    res.end();
    // console.log(`✅ Successfully generated report: ${fileName}`);

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
    const now = new Date();
    const todayDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[now.getDay()];

    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    const studentCols = collectionNames.filter(n => n.includes("-students"));
    const attendanceCols = collectionNames.filter(n => n.includes("-attendance-"));

    // 1. Counts
    let totalStudentCount = 0;
    for (const name of studentCols) {
      const count = await getModel(name, studentSchema).countDocuments();
      totalStudentCount += count;
    }
    const totalFaculty = await Faculty.countDocuments();

    // 2. Process Attendance
    const groupedSummary = {};

    const attendancePromises = attendanceCols.map(async (colName) => {
      const parts = colName.split("-");
      const semLabel = parts[0];
      const batchName = parts[parts.length - 1];
      const semesterKey = `${semLabel}-SEM`;


      // Find TimeTable
      const timetable = await TimeTable.findOne({
        sem: semLabel,
        batch: batchName
      });

      let activeSessions = [];

      if (timetable) {
        const todaySchedule = timetable.weekSchedule.find(d => d.day === todayName);
        if (todaySchedule && todaySchedule.periods.length > 0) {
          // Extract both session AND subject to map them accurately
          todaySchedule.periods.forEach(p => {
            if (p.session && p.subject) {
              // Avoid duplicate queries if there are back-to-back periods of the same subject
              const exists = activeSessions.find(s => s.session === p.session && s.subject === p.subject);
              if (!exists) {
                activeSessions.push({ session: p.session, subject: p.subject });
              }
            }
          });
        }
      }

      // Fallback if no timetable is found for today
      if (activeSessions.length === 0) {
        activeSessions.push({ session: "N/A", subject: null });
      }

      const AttendanceModel = getModel(colName, attendanceSchema);
      const totalCount = await AttendanceModel.countDocuments();

      if (!groupedSummary[semesterKey]) {
        groupedSummary[semesterKey] = { semester: semesterKey, fnBatches: [], anBatches: [], otherBatches: [] };
      }

      // Loop through the unique session/subject combinations for today
      for (const active of activeSessions) {
        let presentCount = 0;

        if (active.subject) {
          // Fetch present count using the COURSE (subject) tied to the timetable session
          presentCount = await AttendanceModel.countDocuments({
            dailyLogs: {
              $elemMatch: {
                date: { $regex: new RegExp(todayDate) },
                course: active.subject, // <--- THIS FIXES THE 0 ISSUE
                status: "present"
              }
            }
          });
        } else {
          // Fallback if no specific subject was found in the timetable
          presentCount = await AttendanceModel.countDocuments({
            dailyLogs: {
              $elemMatch: {
                date: { $regex: new RegExp(todayDate) },
                status: "present"
              }
            }
          });
        }

        const batchData = {
          batch: batchName,
          session: active.session,
          course: active.subject || "Unknown",
          presentCount,
          totalCount,
          date: todayDate
        };

        // Push into the correct array based on session
        if (active.session === "FN") {
          groupedSummary[semesterKey].fnBatches.push(batchData);
        } else if (active.session === "AN") {
          groupedSummary[semesterKey].anBatches.push(batchData);
        } else {
          groupedSummary[semesterKey].otherBatches.push(batchData);
        }
      }
    });

    await Promise.all(attendancePromises);

    res.status(200).json({
      success: true,
      data: {
        attendanceSummary: Object.values(groupedSummary),
        totalStudentCount,
        totalFaculty,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

async function getProfileData(req, res) {
  try {
    const { userId } = req.user;
    if (!userId) {
      return res.status(400).json({ error: "adminId is required" });
    }

    const admin = await Admin.findOne({
      adminId: new RegExp(`^${userId}$`, "i")
    }).select("name adminId email");
    if (!userId) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({ admin });

  } catch (err) {
    console.error("Error fetching Admin data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function CreateNewAdmin(req, res) {
  const { name, adminId, email, Ur_password } = req.body;

  if (!name || !adminId || !email || !Ur_password) {
    return res.status(400).json({ error: "Missing required fields: name, adminId, email, and Ur_password are all necessary." });
  }

  try {
    const requesterId = req.user.userId;
    const currentAdmin = await Admin.findOne({ adminId: requesterId });

    if (!currentAdmin) {
      return res.status(404).json({ error: "Requester admin profile not found" });
    }

    const isMatch = await bcrypt.compare(Ur_password, currentAdmin.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Unauthorized: Incorrect password" });
    }

    const exist = await Admin.findOne({
      $or: [{ adminId }, { email }]
    });
    if (exist) {
      return res.status(400).json({ error: "An admin with this ID or Email already exists" });
    }

    const saltRounds = 10;
    const defaultPassword = `${adminId}@cdc`;
    const hashPassword = await bcrypt.hash(defaultPassword, saltRounds);

    const adminDoc = new Admin({
      name,
      email,
      adminId,
      password: hashPassword
    });

    const savedAdmin = await adminDoc.save();

    return res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: savedAdmin._id,
        name: savedAdmin.name,
        email: savedAdmin.email,
        adminId: savedAdmin.adminId
      }
    });

  } catch (error) {
    console.error("Error creating admin:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const downloadLeaderboardPDF = async (req, res) => {
  try {
    // 1. INPUT HANDLING
    // Check query params or body for 'limit'. Default to 'all'.
    const limitInput = req.query.limit || req.body.limit || 'all';

    const coders = await Coder.find({}).lean();

    if (!coders || coders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found'
      });
    }

    // Sort by total score
    let sortedCoders = [...coders].sort((a, b) => b.totalScore - a.totalScore);

    // Filter based on input
    if (limitInput.toString().toLowerCase() !== 'all') {
      const limit = parseInt(limitInput);
      if (!isNaN(limit) && limit > 0) {
        sortedCoders = sortedCoders.slice(0, limit);
      }
    }

    // Colors
    const colors = {
      white: '#FFFFFF',
      lightBg: '#F8FAFC',
      cardBorder: '#E2E8F0',
      gold: '#FFD700',
      goldTint: '#FFFDF0',
      silver: '#C0C0C0',
      silverTint: '#FAFAFA',
      bronze: '#CD7F32',
      bronzeTint: '#FDF8F5',
      textDark: '#1E293B',
      textSecondary: '#64748B',
      shadow: '#E2E8F0',
      gfg: '#2F8D46',
      leetcode: '#FFA116',
      codechef: '#5B4638',
      github: '#24292F',
      headerBg: '#0F172A'
    };

    const getPlatformUrl = (platform, handle) => {
      const urls = {
        gfg: `https://auth.geeksforgeeks.org/user/${handle}`,
        leetcode: `https://leetcode.com/${handle}`,
        codechef: `https://www.codechef.com/users/${handle}`,
        github: `https://github.com/${handle}`
      };
      return urls[platform];
    };

    const getValue = (obj, key, defaultValue = '') => {
      if (obj instanceof Map) return obj.get(key) || defaultValue;
      return obj?.[key] || defaultValue;
    };

    // --- ICON DRAWING FUNCTIONS (Vector based to avoid image dependencies) ---
    // --- ICON DRAWING FUNCTIONS (Using Images from 'logos' folder) ---
    const drawIcon = (doc, type, x, y, size) => {
      doc.save();

      // Define the folder path: current_file_location/logos/
      const logoDir = path.join(__dirname, 'logos');
      let imageFile = '';
      let width = size;
      let yOffset = -3; // shift up slightly to align with text

      // Select the file and adjust specific sizes if needed
      if (type === 'gfg') {
        imageFile = 'gfg.png';
        width = size * 2.2; // GFG logo is usually wide
      } else if (type === 'leetcode') {
        imageFile = 'leetcode.png';
        width = size * 1.5;
      } else if (type === 'codechef') {
        imageFile = 'codechef.png';
        width = size * 1.5;
      } else if (type === 'github') {
        imageFile = 'github.png';
        width = size * 1.5;
      }

      try {
        const imagePath = path.join(logoDir, imageFile);
        doc.image(imagePath, x, y + yOffset, { width: width });
      } catch (error) {
        // Fallback: If image is missing, draw text instead so PDF doesn't crash
        console.error(`Missing Logo: ${imageFile}`);
        doc.fillColor('black').fontSize(8).text(type.toUpperCase().substring(0, 2), x, y);
      }

      doc.restore();
    };

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      const filename = `Leaderboard_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // ============ HEADER (ONLY PAGE 1) ============
    const drawHeader = () => {
      doc.rect(0, 0, pageWidth, 100).fill(colors.headerBg);

      doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold')
        .text('Institute of Aeronautical Engineering', 0, 20, { width: pageWidth, align: 'center' });

      doc.fontSize(12).font('Helvetica')
        .text('Career Development Center', 0, 45, { width: pageWidth, align: 'center' });

      doc.fontSize(16).font('Helvetica-Bold')
        .text('Coding Data Summary', 0, 68, { width: pageWidth, align: 'center' });

      const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      doc.fontSize(9).font('Helvetica')
        .text(`Date: ${today}`, pageWidth - 130, 20, { width: 110, align: 'right' });
    };

    // Draw Header ONLY once
    drawHeader();


    // ============ PODIUM SECTION (Page 1) ============
    doc.fillColor(colors.textDark).fontSize(16).font('Helvetica-Bold')
      .text('Top Performers', 50, 120);

    const podiumBaseY = 380;

    if (sortedCoders.length >= 3) {
      const podiumData = [
        {
          coder: sortedCoders[1], rank: 2,
          width: 140, height: 190,
          x: 60, color: colors.silver, bg: colors.silverTint
        },
        {
          coder: sortedCoders[0], rank: 1,
          width: 160, height: 210,
          x: 217, color: colors.gold, bg: colors.goldTint
        },
        {
          coder: sortedCoders[2], rank: 3,
          width: 140, height: 180,
          x: 395, color: colors.bronze, bg: colors.bronzeTint
        }
      ];

      podiumData.forEach(({ coder, rank, width, height, x, color, bg }) => {
        const y = podiumBaseY - height;

        // Shadow & Card
        doc.roundedRect(x + 5, y + 5, width, height, 8).fill(colors.shadow);
        doc.roundedRect(x, y, width, height, 8).fillAndStroke(bg, color);

        // --- 1. RANK BADGE (Top Center) ---
        doc.circle(x + width / 2, y, (rank === 1 ? 22 : 18)).fill(color);
        doc.fillColor('white').fontSize(rank === 1 ? 16 : 14).font('Helvetica-Bold')
          .text(rank.toString(), x, y - (rank === 1 ? 6 : 5), { width: width, align: 'center' });

        // --- 2. TOTAL SCORE (Below Badge) ---
        // Fixed Y position for score to ensure alignment
        const scoreY = y + 35;
        doc.fillColor(colors.textSecondary).fontSize(8).font('Helvetica-Bold')
          .text('TOTAL SCORE', x, scoreY, { width: width, align: 'center' });
        doc.fillColor(color).fontSize(20).font('Helvetica-Bold')
          .text(coder.totalScore.toString(), x, scoreY + 12, { width: width, align: 'center' });

        // --- 3. STUDENT NAME (Middle Fixed Slot) ---
        // We define a fixed "box" for the name so it can wrap without pushing other elements
        const nameBoxY = scoreY + 45;
        const nameBoxHeight = 35; // Enough for 2 lines

        let name = coder.name;
        // Truncate if insanely long, but allow 2 lines
        if (name.length > 40) name = name.substring(0, 37) + '...';

        doc.fillColor(colors.textDark).fontSize(11).font('Helvetica-Bold')
          .text(name, x + 10, nameBoxY, {
            width: width - 20,
            align: 'center',
            height: nameBoxHeight,
            ellipsis: true
          });

        // --- 4. ROLL NO (Below Name Box) ---
        const rollY = nameBoxY + nameBoxHeight + 5;
        doc.fillColor(colors.textSecondary).fontSize(9).font('Helvetica')
          .text(coder.rollno, x, rollY, { width: width, align: 'center' });

        // --- 5. PLATFORM ICONS (Footer) ---
        const footerH = 45;
        const footerY = y + height - footerH;

        // Divider line
        doc.moveTo(x + 15, footerY).lineTo(x + width - 15, footerY)
          .strokeColor(colors.cardBorder).lineWidth(0.5).stroke();

        const platforms = ['gfg', 'leetcode', 'codechef', 'github'];
        const colW = (width - 20) / 2;

        platforms.forEach((platform, idx) => {
          const r = Math.floor(idx / 2);
          const c = idx % 2;
          const px = x + 15 + (c * colW);
          const py = footerY + 8 + (r * 18);

          const handle = getValue(coder.handles, platform);
          const score = getValue(coder.scores, platform, 0);

          // Draw custom vector icon
          drawIcon(doc, platform, px, py, 10);

          // Score text
          // Adjusted X offset based on icon type
          const textOffset = (platform === 'gfg') ? 28 : 16;
          doc.fillColor(colors.textDark).fontSize(9).font('Helvetica-Bold')
            .text(score.toString(), px + textOffset, py);

          // Clickable link
          if (handle) {
            doc.link(px, py - 2, 45, 12, getPlatformUrl(platform, handle));
          }
        });
      });
    }


    // ============ TABLE SECTION ============

    // Function to draw Table Column Headers (Repeated on new pages)
    const drawTableHeaders = (yPos) => {
      doc.roundedRect(40, yPos, pageWidth - 80, 28, 4).fillAndStroke(colors.lightBg, colors.cardBorder);

      const rankX = 50, rankW = 40;
      const nameX = 100, nameW = 160;
      const platX = 270, platW = 220;
      const totalX = pageWidth - 90, totalW = 50;

      doc.fillColor(colors.textSecondary).fontSize(9).font('Helvetica-Bold');
      doc.text('RANK', rankX, yPos + 10, { width: rankW, align: 'center' });
      doc.text('STUDENT', nameX, yPos + 10, { width: nameW, align: 'left' });
      doc.text('PLATFORM SCORES', platX, yPos + 10, { width: platW, align: 'center' });
      doc.text('TOTAL', totalX, yPos + 10, { width: totalW, align: 'center' });
    };

    const startTableIndex = (sortedCoders.length >= 3) ? 3 : 0;

    if (sortedCoders.length > startTableIndex) {
      // Start table on the next page if there is a podium, or same page if list is small
      if (startTableIndex === 3) doc.addPage();
      else {
        // Just spacing if no podium
        doc.moveDown(2);
      }

      // Title (Only on the page where table starts)
      doc.fillColor(colors.textDark).fontSize(14).font('Helvetica-Bold')
        .text('Complete Rankings', 50, 50); // Fixed Y since it's a new page usually

      let currentY = 80; // Start below title
      drawTableHeaders(currentY);
      currentY += 36;

      const baseRowHeight = 50;

      // TABLE LOOP
      for (let i = startTableIndex; i < sortedCoders.length; i++) {
        const coder = sortedCoders[i];
        const rank = i + 1;
        let name = coder.name;

        // Dynamic Height Check
        doc.fontSize(11).font('Helvetica-Bold');
        const nameHeight = doc.heightOfString(name, { width: 160 }); // 160 is name col width
        const rowHeight = Math.max(baseRowHeight, nameHeight + 25);

        // Page Break
        if (currentY + rowHeight > pageHeight - 50) {
          doc.addPage();
          // NO main header call here
          currentY = 50; // Reset Y to top
          drawTableHeaders(currentY); // Only column headers
          currentY += 36;
        }

        // Draw Row
        if (i % 2 === 0) doc.roundedRect(40, currentY, pageWidth - 80, rowHeight, 4).fillAndStroke(colors.lightBg, colors.cardBorder);
        else doc.roundedRect(40, currentY, pageWidth - 80, rowHeight, 4).stroke(colors.cardBorder);

        // Rank
        doc.fillColor(colors.textSecondary).fontSize(11).font('Helvetica-Bold')
          .text(`#${rank}`, 50, currentY + 18, { width: 40, align: 'center' });

        // Name & Roll
        doc.fillColor(colors.textDark).fontSize(11).font('Helvetica-Bold')
          .text(name, 100, currentY + 13, { width: 160 });
        doc.fillColor(colors.textSecondary).fontSize(8).font('Helvetica')
          .text(coder.rollno, 100, currentY + 13 + nameHeight + 2, { width: 160 });

        // Icons
        const platforms = ['gfg', 'leetcode', 'codechef', 'github'];
        platforms.forEach((platform, idx) => {
          const iconX = 270 + (idx * 58);
          const iconY = currentY + 20;
          const handle = getValue(coder.handles, platform);
          const score = getValue(coder.scores, platform, 0);

          drawIcon(doc, platform, iconX, iconY, 10);

          const textOffset = (platform === 'gfg') ? 28 : 16;
          doc.fillColor(colors.textDark).fontSize(10).font('Helvetica-Bold')
            .text(score.toString(), iconX + textOffset, iconY);

          if (handle) {
            doc.link(iconX, iconY - 2, 50, 14, getPlatformUrl(platform, handle));
          }
        });

        // Total
        doc.fillColor(colors.textDark).fontSize(14).font('Helvetica-Bold')
          .text(coder.totalScore.toString(), pageWidth - 90, currentY + 18, { width: 50, align: 'center' });

        currentY += rowHeight + 6;
      }
    }

    doc.end();

  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF', error: error.message });
  }
};

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const downloadLeaderboardImage = async (req, res) => {
  try {
    const { sem, branch } = req.query;

    // Build the database query dynamically
    const dbQuery = {};
    if (sem) dbQuery.sem = sem;

    if (branch) {
      // Safely escape the branch string before putting it in the regex
      dbQuery.branch = branch.toUpperCase(); // Fast, uses indexes
    }
    const coders = await Coder.find(dbQuery).lean();
    console.log(coders);
    if (!coders || coders.length === 0) {
      let msg = 'No data found';
      if (sem && branch) msg += ` for semester ${sem} and branch ${branch}`;
      else if (sem) msg += ` for semester ${sem}`;
      else if (branch) msg += ` for branch ${branch}`;

      return res.status(404).json({ success: false, message: msg });
    }

    const topCoders = [...coders]
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);

    // 3. Setup Canvas (800 x 1200 px)
    const width = 800;
    const height = 1200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // --- COLORS ---
    const colors = {
      bg: '#F8FAFC',
      headerBlue: '#1a103c',
      cardBg: '#FFFFFF',
      textMain: '#1E293B',
      textLight: '#F1F5F9',
      textSec: '#64748B',
      gold: '#F59E0B',
      silver: '#94A3B8',
      bronze: '#B45309',
    };

    // --- LOAD ASSETS ---
    const logoDir = path.join(__dirname, 'logos');

    let headerImg = null;
    try {
      headerImg = await loadImage(path.join(logoDir, 'iare_header.png'));
    } catch (e) {
      // console.log("Header image fallback.");
    }

    const loadIcon = async (p) => {
      try { return await loadImage(path.join(logoDir, `${p}.png`)); } catch (e) { return null; }
    };
    const icons = {
      gfg: await loadIcon('gfg'),
      leetcode: await loadIcon('leetcode'),
      codechef: await loadIcon('codechef'),
      github: await loadIcon('github')
    };
    const platformsList = ['gfg', 'leetcode', 'codechef', 'github'];

    // --- DRAWING UTILS ---
    const drawRoundedRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // ================= START DRAWING =================

    // 1. FILL BACKGROUND
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // 2. HEADER SECTION
    const imgH = headerImg ? (width * (headerImg.height / headerImg.width)) : 150;
    const textExtensionH = 110;
    const totalHeaderH = imgH + textExtensionH;

    // A. Wave Shape
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, totalHeaderH - 40);
    ctx.bezierCurveTo(width / 2, totalHeaderH + 20, width / 2, totalHeaderH - 120, 0, totalHeaderH - 30);
    ctx.closePath();
    ctx.clip();

    // B. Blue Fill
    ctx.fillStyle = colors.headerBlue;
    ctx.fillRect(0, 0, width, totalHeaderH + 100);

    // C. Image
    if (headerImg) {
      ctx.drawImage(headerImg, 0, 0, width, imgH);
    }

    // D. Extension Text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('CAREER DEVELOPMENT CENTER', width / 2, imgH + (textExtensionH / 3) + 10);
    ctx.restore();


    // 3. TITLE (Updated dynamically based on `sem` and `branch`)
    const titleY = totalHeaderH + 60;
    const gradient = ctx.createLinearGradient(0, titleY - 40, 0, titleY);
    gradient.addColorStop(0, '#F59E0B');
    gradient.addColorStop(1, '#D97706');

    ctx.textAlign = 'center';
    ctx.fillStyle = gradient;

    // Build the dynamic title text
    let titleParts = ['TOP 10 CODERS'];
    if (branch) titleParts.push(branch.toUpperCase());
    if (sem) titleParts.push(`${sem.toUpperCase()} SEMESTER`);

    const titleText = titleParts.join(' - ');

    // Shrink font slightly if the title gets too long (e.g., "TOP 10 CODERS - CSE (AI & ML) - SEM 4")
    if (titleText.length > 30) {
      ctx.font = '700 34px Arial';
    } else {
      ctx.font = '700 42px Arial';
    }

    ctx.fillText(titleText, width / 2, titleY);

    const dateStr = new Date().toLocaleDateString('en-GB');
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = colors.textSec;
    ctx.fillText(`As of ${dateStr}`, width / 2, titleY + 30);


    // ================= PODIUM SECTION (Ranks 1-3) =================
    const podiumBaseY = titleY + 70;

    const podiumConfig = [
      { idx: 1, rank: 2, x: 40, y: podiumBaseY + 40, w: 220, h: 260, color: colors.silver, glow: 'rgba(148, 163, 184, 0.4)' },
      { idx: 0, rank: 1, x: 280, y: podiumBaseY, w: 240, h: 300, color: colors.gold, glow: 'rgba(245, 158, 11, 0.4)' },
      { idx: 2, rank: 3, x: 540, y: podiumBaseY + 60, w: 220, h: 240, color: colors.bronze, glow: 'rgba(180, 83, 9, 0.4)' }
    ];

    for (const p of podiumConfig) {
      if (!topCoders[p.idx]) continue;
      const coder = topCoders[p.idx];

      // Card + Badge
      ctx.save();
      ctx.shadowColor = p.glow; ctx.shadowBlur = 25; ctx.shadowOffsetY = 10;
      ctx.fillStyle = colors.cardBg;
      drawRoundedRect(p.x, p.y, p.w, p.h, 20); ctx.fill();
      ctx.clip();
      ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y + p.h - 8, p.w, 8);
      ctx.restore();

      ctx.save();
      const centerX = p.x + p.w / 2; ctx.translate(centerX, p.y);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.moveTo(-35, -10); ctx.lineTo(35, -10); ctx.lineTo(35, 25); ctx.lineTo(0, 40); ctx.lineTo(-35, 25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.rank, 0, 12);
      ctx.restore();

      ctx.fillStyle = colors.textMain; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      let fontSize = 20; let lines = []; let lineHeight = fontSize + 4; const maxWidth = p.w - 20;
      do {
        ctx.font = `bold ${fontSize}px Arial`; lineHeight = fontSize + 4; lines = [];
        const words = coder.name.split(' '); let line = '';
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) { lines.push(line); line = words[n] + ' '; } else { line = testLine; }
        }
        lines.push(line);
        if (lines.length > 2) fontSize -= 2;
      } while (lines.length > 2 && fontSize > 12);

      const verticalShift = lines.length > 2 ? -10 : 0;
      const blockHeight = lines.length * lineHeight;
      const startY = (p.y + 80) - (blockHeight / 2) + (lineHeight / 2) + verticalShift;
      lines.forEach((l, i) => { ctx.fillText(l.trim(), p.x + p.w / 2, startY + (i * lineHeight)); });

      // Score + Icons
      const scoreLabelY = p.y + 135;
      ctx.fillStyle = colors.textSec; ctx.font = '12px Arial'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('TOTAL SCORE', p.x + p.w / 2, scoreLabelY);
      ctx.fillStyle = p.color; ctx.font = '900 38px Arial';
      ctx.fillText(coder.totalScore, p.x + p.w / 2, scoreLabelY + 35);

      const iconSize = 24; const spacing = 14;
      const totalW = (platformsList.length * iconSize) + ((platformsList.length - 1) * spacing);
      let startX = p.x + (p.w - totalW) / 2;
      const iconY = scoreLabelY + 55;
      platformsList.forEach((plat, i) => {
        const img = icons[plat];
        const score = coder.scores ? (coder.scores[plat] || 0) : 0;
        const cx = startX + (i * (iconSize + spacing));
        if (img) {
          ctx.drawImage(img, cx, iconY, iconSize, iconSize);
          ctx.fillStyle = colors.textMain; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
          ctx.fillText(score, cx + iconSize / 2, iconY + iconSize + 14);
        }
      });
    }

    // ================= LIST SECTION (Ranks 4-10) =================
    let listY = podiumBaseY + 340;
    const rowHeight = 75;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 3; i < topCoders.length; i++) {
      const coder = topCoders[i];
      const rank = i + 1;
      if (listY + rowHeight > height) break;

      // Draw Row Card
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.05)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(40, listY, width - 80, rowHeight - 12, 12);
      ctx.fill();
      ctx.fillStyle = colors.textMain;
      ctx.fillRect(40, listY + 10, 6, rowHeight - 32);
      ctx.restore();

      const centerY = listY + (rowHeight - 12) / 2;

      // 1. Rank
      ctx.fillStyle = colors.textSec;
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${rank}`, 80, centerY);

      ctx.textAlign = 'left';
      ctx.fillStyle = colors.textMain;
      ctx.font = 'bold 18px Arial';

      const maxNameWidth = 250;
      let nameText = coder.name;

      // Check if text is too wide
      if (ctx.measureText(nameText).width > maxNameWidth) {
        while (ctx.measureText(nameText + '...').width > maxNameWidth && nameText.length > 0) {
          nameText = nameText.substring(0, nameText.length - 1);
        }
        nameText += '...';
      }

      ctx.fillText(nameText, 120, centerY - 9);

      // 3. Roll Number
      ctx.fillStyle = colors.textSec;
      ctx.font = '13px Arial';
      ctx.fillText(coder.rollno, 120, centerY + 10);

      // 4. Platform Icons
      const listIconSize = 16; const listSpace = 60; let px = 380;
      platformsList.forEach((plat, idx) => {
        const img = icons[plat];
        const score = coder.scores ? (coder.scores[plat] || 0) : 0;
        const cx = px + (idx * listSpace);
        if (img) {
          ctx.drawImage(img, cx, centerY - 8, listIconSize, listIconSize);
          ctx.fillStyle = '#334155';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(score, cx + 22, centerY + 1);
        }
      });

      // 5. Total Score
      ctx.textAlign = 'right';
      ctx.fillStyle = colors.textMain;
      ctx.font = '900 28px Arial';
      ctx.fillText(coder.totalScore, width - 60, centerY);

      listY += rowHeight;
    }

    ctx.fillStyle = colors.textSec;
    ctx.textAlign = 'center';
    ctx.font = '14px Arial';
    ctx.fillText('Generated by Coding Tracker System', width / 2, height - 20);

    const buffer = canvas.toBuffer('image/png');
    // 1. Create a dynamic filename based on the query parameters
    let filename = 'Top_10_Coders';
    if (branch) {
      // Remove spaces and special chars (like '&' or '()') so the filename is clean
      const cleanBranch = branch.replace(/[^a-zA-Z0-9]/g, '');
      filename += `_${cleanBranch}`;
    }
    if (sem) {
      filename += `_Sem_${sem}`;
    }
    filename += '.png';

    // 2. Set the headers to trigger the download with your new filename
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`); // <-- THIS IS THE MAGIC LINE

    // 3. Send the image
    res.send(buffer);
  } catch (error) {
    console.error('Poster Gen Error:', error);
    res.status(500).json({ success: false, message: 'Generation failed' });
  }
};

async function generateAttendancePDF(req, res) {

  // ─── 1. Validate Request Body ────────────────────────────────────────────────
  const { semname, batch, branch, threshold } = req.body;

  if (!semname || !threshold) {
    return res.status(400).json({ message: "Semester name and threshold are required." });
  }
  if (!batch || !branch) {
    return res.status(400).json({ message: "Batch and branch are required." });
  }

  // ─── 2. Resolve Dynamic Collection ──────────────────────────────────────────
  const attendanceCollectionName = `${semname}-SEM-attendance-${batch}`;

  const collectionExists = await mongoose.connection.db
    .listCollections({ name: attendanceCollectionName })
    .toArray();

  if (collectionExists.length === 0) {
    return res.status(404).json({
      error: `Collection '${attendanceCollectionName}' does not exist.`
    });
  }

  const AttendanceModel = getModel(attendanceCollectionName, attendanceSchema);

  // ─── 3. Fetch & Filter Defaulters ───────────────────────────────────────────
  try {
    const targetThreshold = parseFloat(threshold);
    const students = await AttendanceModel.find({ branch }).lean();

    const defaulters = students.filter((student) => {
      const { totalDays = 0, presentDays = 0 } = student.overallAttendance ?? {};
      if (totalDays === 0) return false;
      return (presentDays / totalDays) * 100 < targetThreshold;
    });

    if (defaulters.length === 0) {
      return res.status(404).json({
        message: `No students found below the ${threshold}% threshold.`
      });
    }

    // ─── 4. Initialise PDF Document ─────────────────────────────────────────
    const doc = new PDFDocument({ size: "A4", margin: 44 });
    const filename = `Defaulters_${semname}-SEM_${batch}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Column X positions (fixed, pixel-perfect alignment) ──
    const COL = {
      rollno: 44,
      name: 120,
      present: 310,
      total: 375,
      bar: 430,
      pct: 500,
    };
    const PAGE_RIGHT = 551;
    const ROW_H = 22;

    // ── Color helpers ──
    const color = (pct) => {
      if (pct < 65) return "#E24B4A"; // critical – red
      if (pct < 70) return "#BA7517"; // warning  – amber
      return "#639922";                 // borderline – green
    };

    // ─── 5. PDF Header ──────────────────────────────────────────────────────
    doc
      .fontSize(15).font("Helvetica-Bold")
      .fillColor("#111111")
      .text("Institute of Aeronautical Engineering", { align: "center" });

    doc
      .fontSize(10).font("Helvetica")
      .fillColor("#888888")
      .text("Attendance Defaulters Report", { align: "center" });

    // Red accent rule
    const midX = (doc.page.width / 2) - 20;
    doc.moveDown(0.4);
    doc.rect(midX, doc.y, 40, 2).fill("#E24B4A");
    doc.moveDown(0.8);

    // ─── 6. Meta Info Cards (4 columns) ─────────────────────────────────────
    const cardW = 116;
    const cardH = 38;
    const cardY = doc.y;
    const cards = [
      { label: "SEMESTER", value: semname },
      { label: "BATCH", value: batch },
      { label: "BRANCH", value: branch },
      { label: "DEFAULTERS", value: String(defaulters.length), highlight: true },
    ];

    cards.forEach((card, i) => {
      const cx = 44 + i * (cardW + 5);
      doc.roundedRect(cx, cardY, cardW, cardH, 4)
        .fill("#F5F5F3");

      doc.fontSize(7).font("Helvetica")
        .fillColor("#888888")
        .text(card.label, cx, cardY + 8, { width: cardW, align: "center" });

      doc.fontSize(12).font("Helvetica-Bold")
        .fillColor(card.highlight ? "#A32D2D" : "#111111")
        .text(card.value, cx, cardY + 19, { width: cardW, align: "center" });
    });

    doc.y = cardY + cardH + 16;

    // Section sub-label
    doc.fontSize(8).font("Helvetica")
      .fillColor("#888888")
      .text(`STUDENTS BELOW ${targetThreshold}% THRESHOLD`, { characterSpacing: 0.8 });
    doc.moveDown(0.5);

    // ─── 7. Table Header Row ─────────────────────────────────────────────────
    const headerY = doc.y;
    doc.rect(44, headerY, PAGE_RIGHT - 44, ROW_H).fill("#F5F5F3");

    doc.fontSize(8).font("Helvetica").fillColor("#888888");
    const headers = [
      { label: "ROLL NO", x: COL.rollno, align: "left" },
      { label: "NAME", x: COL.name, align: "left" },
      { label: "PRESENT", x: COL.present, align: "right", w: 40 },
      { label: "TOTAL", x: COL.total, align: "right", w: 40 },
      { label: "ATTENDANCE", x: COL.bar, align: "right", w: PAGE_RIGHT - COL.bar },
    ];

    headers.forEach(({ label, x, align, w }) => {
      doc.text(label, x, headerY + 7, { width: w || 80, align, characterSpacing: 0.5 });
    });

    doc.y = headerY + ROW_H;
    doc.moveTo(44, doc.y).lineTo(PAGE_RIGHT, doc.y)
      .strokeColor("#E0E0DC").lineWidth(0.5).stroke();

    // ─── 8. Table Data Rows ──────────────────────────────────────────────────
    defaulters.forEach((student, idx) => {

      // Page break guard
      if (doc.y > 740) {
        doc.addPage();
        doc.y = 44;
      }

      const { totalDays, presentDays } = student.overallAttendance;
      const pct = (presentDays / totalDays) * 100;
      const pctText = pct.toFixed(2) + "%";
      const rowColor = color(pct);
      const rowY = doc.y;
      const isEven = idx % 2 === 0;

      // Alternating row tint
      if (isEven) {
        doc.rect(44, rowY, PAGE_RIGHT - 44, ROW_H).fill("#FAFAF8");
      }

      // Roll No
      doc.fontSize(9).font("Helvetica").fillColor("#888888")
        .text(student.rollno, COL.rollno, rowY + 7, { width: 76 });

      // Name (truncated)
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#111111")
        .text(student.name.substring(0, 22), COL.name, rowY + 7, { width: 170 });

      // Present days (right-aligned)
      doc.fontSize(9).font("Helvetica").fillColor("#555555")
        .text(String(presentDays), COL.present, rowY + 7, { width: 40, align: "right" });

      // Total days (right-aligned)
      doc.fontSize(9).font("Helvetica").fillColor("#555555")
        .text(String(totalDays), COL.total, rowY + 7, { width: 40, align: "right" });

      // Mini progress bar
      const BAR_X = COL.bar + 4;
      const BAR_Y = rowY + 11;
      const BAR_W = 54;
      const BAR_H = 4;
      const fillW = Math.min((pct / 100) * BAR_W, BAR_W);

      doc.roundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, 2).fill("#E8E8E4");
      doc.roundedRect(BAR_X, BAR_Y, fillW, BAR_H, 2).fill(rowColor);

      // Percentage pill
      const PILL_X = COL.pct;
      const PILL_W = 48;
      const PILL_H = 14;
      const PILL_Y = rowY + 4;

      // Pill bg (light tint of the row color)
      const pillBg = pct < 65 ? "#FCEBEB" : pct < 70 ? "#FAEEDA" : "#EAF3DE";
      doc.roundedRect(PILL_X, PILL_Y, PILL_W, PILL_H, 7).fill(pillBg);

      doc.fontSize(8).font("Helvetica-Bold").fillColor(rowColor)
        .text(pctText, PILL_X, PILL_Y + 3, { width: PILL_W, align: "center" });

      doc.y = rowY + ROW_H;

      // Row separator
      doc.moveTo(44, doc.y).lineTo(PAGE_RIGHT, doc.y)
        .strokeColor("#EBEBEB").lineWidth(0.3).stroke();
    });

    // ─── 9. Footer ───────────────────────────────────────────────────────────
    doc.moveDown(1.2);
    doc.moveTo(44, doc.y).lineTo(PAGE_RIGHT, doc.y)
      .strokeColor("#E0E0DC").lineWidth(0.5).stroke();
    doc.moveDown(0.5);

    const footerY = doc.y;

    // Left: generated date
    doc.fontSize(8).font("Helvetica").fillColor("#999999")
      .text(
        `Generated on ${new Date().toLocaleDateString("en-GB")}  ·  Threshold: below ${targetThreshold}%`,
        44, footerY
      );

    // Right: legend dots
    const legendItems = [
      { label: "Critical (<65%)", color: "#E24B4A" },
      { label: "Warning (65–70%)", color: "#BA7517" },
      { label: "Borderline (70–75%)", color: "#639922" },
    ];
    let lx = PAGE_RIGHT - 210;
    legendItems.forEach(({ label, color: lc }) => {
      doc.circle(lx + 4, footerY + 4, 3).fill(lc);
      doc.fontSize(7).font("Helvetica").fillColor("#999999")
        .text(label, lx + 10, footerY + 1);
      lx += 72;
    });

    // ─── 10. Finalise & Stream ───────────────────────────────────────────────
    doc.end();

  } catch (err) {
    console.error("Error generating Defaulters PDF:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error generating report.", error: err.message });
    }
  }
};

module.exports = { generateAttendancePDF };

// const generatePasswordsForAllFaculty = async (req, res) => {
//   try {
//     // 1. Fetch all faculty members
//     const allFaculty = await Faculty.find({});

//     if (allFaculty.length === 0) {
//       // Use 'res' to send a response back to the client
//       return res.status(404).json({ 
//         success: false, 
//         message: 'No faculty members found in the database.' 
//       });
//     }

//     // 2. Configure the email transporter
//     const transporter = nodemailer.createTransport({
//       service: 'gmail', 
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     let successCount = 0;
//     let failCount = 0;

//     // 3. Process each faculty member
//     for (const faculty of allFaculty) {
//       try {
//         const defaultPassword = crypto.randomBytes(4).toString('hex');
//         const hashedNewPassword = await bcrypt.hash(defaultPassword, 10);

//         faculty.password = hashedNewPassword;
//         await faculty.save();

//         const mailOptions = {
//           from: process.env.EMAIL_USER,
//           to: faculty.email,
//           subject: 'Welcome! Your Faculty Portal Login Details',
//           text: `Hello ${faculty.name},\n\nYour faculty account has been provisioned.\n\nYour default password is: ${defaultPassword}\n\nPlease log in and change this password immediately.\n\nBest regards,\nAdministration`,
//         };

//         await transporter.sendMail(mailOptions);
//         successCount++;

//       } catch (innerError) {
//         console.error(`Failed to process faculty ${faculty.email}:`, innerError.message);
//         failCount++;
//       }
//     }

//     // 4. Send the final success response back to the client using 'res'
//     return res.status(200).json({
//       success: true,
//       message: `Process complete. Succeeded: ${successCount}, Failed: ${failCount}`
//     });

//   } catch (error) {
//     console.error('Fatal error in batch processing:', error);
//     // 5. Send an error response back to the client using 'res'
//     return res.status(500).json({ 
//       success: false, 
//       error: 'An internal server error occurred while processing.' 
//     });
//   }
// };



const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

async function generatePasswordsForAllFaculty(req, res) {
  try {
    const allFaculty = await Faculty.find({});

    if (allFaculty.length === 0) {
      return res.status(404).json({ success: false, message: "No faculty found" });
    }

    let successCount = 0;
    let failCount = 0;

    for (const faculty of allFaculty) {
      try {
        const defaultPassword = crypto.randomBytes(4).toString("hex");
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        faculty.password = hashedPassword;
        await faculty.save();

        const sendSmtpEmail = {
          sender: {
            email: process.env.EMAIL_FROM,
            name: "Administration"
          },
          to: [{
            email: faculty.email,
            name: faculty.name
          }],
          subject: "Faculty Portal Login Details",
          textContent: `Hello ${faculty.name},

Your account has been created.

Default Password: ${defaultPassword}

Please login and change it immediately.

- Administration`
        };

        await tranEmailApi.sendTransacEmail(sendSmtpEmail);
        successCount++;

      } catch (err) {
        console.error(`Failed for ${faculty.email}`, err.message);
        failCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Completed. Success: ${successCount}, Failed: ${failCount}`
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



async function deleteBackup(req, res) {
  try {
    const {
      sem,
      batch,
      session,
      date
    } = req.body;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!sem || !batch || !session || !date) {
      return res.status(400).json({
        success: false,
        message:
          "sem, batch, session and date are required."
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
    // DELETE ONLY THAT SESSION + DATE
    // ==========================================

    const fieldPath =
      `attendanceRecords.${normalizedSession}.${date}`;

    const result =
      await BackupAttendance.updateOne(
        {
          sem: normalizedSem,
          batch: normalizedBatch,
          [fieldPath]: { $exists: true }
        },
        {
          $unset: {
            [fieldPath]: ""
          }
        }
      );

    // ==========================================
    // BACKUP NOT FOUND
    // ==========================================

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message:
          `Backup does not exist for ${normalizedSem}-${normalizedBatch} ${normalizedSession} on ${date}.`
      });
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        `Backup deleted successfully for ${normalizedSem}-${normalizedBatch} ${normalizedSession} on ${date}.`
    });

  } catch (error) {
    console.error(
      "❌ Delete Backup Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete backup."
    });
  }
};

async function getAllBackups(req, res) {
  try {
    const backups = await BackupAttendance.find({})
      .sort({ sem: 1, batch: 1 })
      .lean();

    if (backups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No backup attendance records found."
      });
    }

    const semWise = {};

    for (const backup of backups) {
      const { sem, batch, attendanceRecords } = backup;

      // Create semester
      if (!semWise[sem]) {
        semWise[sem] = {
          batches: {}
        };
      }

      // Create batch
      if (!semWise[sem].batches[batch]) {
        semWise[sem].batches[batch] = {
          FN: {},
          AN: {}
        };
      }

      // Process FN and AN
      for (const session of ["FN", "AN"]) {
        const sessionRecords =
          attendanceRecords?.[session] || {};

        for (const [date, rollnos] of Object.entries(
          sessionRecords
        )) {
          semWise[sem].batches[batch][session][date] = {
            presentCount: Array.isArray(rollnos)
              ? rollnos.length
              : 0,
            rollnos: Array.isArray(rollnos)
              ? rollnos
              : []
          };
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Backup attendance fetched successfully.",
      totalSemesters: Object.keys(semWise).length,
      totalBatches: backups.length,
      data: semWise
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch backup attendance.",
      error: error.message
    });
  }
}


const HandleCombinedAttendanceReport = async (req, res) => {
  const CONFIG = {
    // IMPORTANT: two SEPARATE folders, kept separate on purpose.
    // Fonts live in your original assets folder (this is what the previous
    // version of this file already pointed at — restoring it fixes the
    // "LiberationSans" console warnings and the stretched/gappy text you saw,
    // which happened because the last edit accidentally pointed the font
    // lookup at the logos folder too, so Calibri.ttf silently failed to load
    // and PDFKit fell back to the un-embedded standard "Helvetica" font.
    FONTS_DIR: path.join(__dirname, '..', 'assets'),

    // Logo/header images live in controllers/logos per your screenshot.
    LOGO_DIR: path.join(__dirname, 'logos'),

    // 'iare_header.png' (underscore) is the actual filename in your logos
    // folder — that's what makes the header show up at all.
    headerImages: [
      'iare_header.png',
      'iare-header.png',
      'iare-header.jpg',
      'iare-report-header.png',
      'iare-report-header.jpg'
    ],

    fontRegular: 'fonts/Calibri.ttf',
    fontBold: 'fonts/Calibri-Bold.ttf',

    institutionName: 'INSTITUTE OF AERONAUTICAL ENGINEERING',
    departmentTitle: 'CAREER DEVELOPMENT CENTER',
    reportTitle: 'Daily Attendance Report',
    signatory: 'DEAN – CDC',

    defaultProgram: 'B.Tech',

    // Refined palette — a confident navy/red brand pair instead of flat
    // black-on-white, plus semantic colors for present/absent/summary cards.
    colors: {
      title: '#C8102E',          // institute red, slightly warmer than pure red
      navy: '#122A4D',           // deep navy for structural elements
      text: '#1F2430',
      muted: '#5B6472',          // darker than the first pass — the old grey was too faint to read
      border: '#C6CCD6',         // slightly darker/crisper table lines
      headerFill: '#122A4D',     // table header now a solid navy band
      headerText: '#FFFFFF',
      zebra: '#F5F7FA',
      accent: '#C8102E',
      cardTotalBg: '#EAF1FB',
      cardTotalText: '#1D4E89',
      cardPresentBg: '#E8F6EC',
      cardPresentText: '#1E7B34',
      cardAbsentBg: '#FDECEC',
      cardAbsentText: '#B3261E',
      cardUnmarkedBg: '#F3F1FA',
      cardUnmarkedText: '#5B4E8C',
      pillFN: '#EAF1FB',
      pillFNText: '#1D4E89',
      pillAN: '#FFF3E0',
      pillANText: '#9A5B00'
    }
  };

  const PAGE_MARGINS = {
    top: 34,
    bottom: 50,
    left: 40,
    right: 40
  };

  const COLUMNS = [
    { key: 'batch', label: 'Batch', ratio: 0.11, align: 'left' },
    { key: 'branchText', label: 'Branch', ratio: 0.41, align: 'left' },
    { key: 'totalStrength', label: 'Total Strength', ratio: 0.16, align: 'center' },
    { key: 'present', label: 'Present', ratio: 0.16, align: 'center' },
    { key: 'absent', label: 'Absent', ratio: 0.16, align: 'center' }
  ];

  const SIZE = {
    title: 16,
    subtitle: 10.5,
    date: 10.5,
    section: 12.5,
    head: 10,
    body: 10,
    footer: 8,
    signatory: 11,
    cardNumber: 18,
    cardLabel: 8.5
  };

  const PAD_X = 7;
  const PAD_Y = 6;
  const MIN_ROW_H = 22;
  const SECTION_GAP = 20;
  const RADIUS = 6;

  // Absolute ceiling PDF allows for a single page (spec max is 14400pt / 200in).
  // We stay comfortably under that so one report never physically can't fit.
  const MAX_SINGLE_PAGE_HEIGHT = 14000;
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  const fail = (status, message, extra = {}) => {
    return res.status(status).json({ success: false, message, ...extra });
  };

  // Two separate resolvers on purpose — fonts and logos live in different
  // folders (see CONFIG comment above). Mixing them up is what broke the
  // fonts last time.
  const fontAsset = (relativePath) => {
    const fullPath = path.join(CONFIG.FONTS_DIR, relativePath);
    return fs.existsSync(fullPath) ? fullPath : null;
  };

  const logoAsset = (relativePath) => {
    const fullPath = path.join(CONFIG.LOGO_DIR, relativePath);
    return fs.existsSync(fullPath) ? fullPath : null;
  };

  const normalizeSemester = (value) => String(value ?? '').trim().toUpperCase();
  const normalizeBatch = (value) => String(value ?? '').trim().toUpperCase();

  const normalizeSession = (value) => {
    const session = String(value ?? '').trim().toUpperCase();
    if (session === 'FN' || session === 'FORENOON' || session === 'MORNING') return 'FN';
    if (session === 'AN' || session === 'AFTERNOON') return 'AN';
    return null;
  };

  const normalizeBranch = (value) => {
    return String(value || '')
      .replace(/\s*\(\s*/g, ' (')
      .replace(/\s*\)/g, ')')
      .replace(/\s*&\s*/g, ' & ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isPresent = (status) => {
    const value = String(status || '').trim().toLowerCase();
    return value === 'present' || value === 'p' || value === 'od';
  };

  const toRoman = (value) => {
    const map = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII' };
    const normalized = String(value).trim().toUpperCase();
    return map[normalized] || normalized;
  };

  const semesterSortValue = (semester) => {
    const value = String(semester).trim().toUpperCase();
    const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
    if (map[value]) return map[value];
    const number = Number(value);
    return Number.isFinite(number) ? number : 999;
  };

  const compareBatches = (a, b) => {
    const first = String(a || '');
    const second = String(b || '');
    const n1 = parseInt((first.match(/(\d+)\s*$/) || [])[1], 10);
    const n2 = parseInt((second.match(/(\d+)\s*$/) || [])[1], 10);
    if (Number.isFinite(n1) && Number.isFinite(n2) && n1 !== n2) return n1 - n2;
    return first.localeCompare(second, 'en', { numeric: true });
  };

  const formatNumber = (value) => (Number.isFinite(value) ? value.toLocaleString('en-IN') : '—');

  try {
    const requestedDate = String(req.query.date || '').trim();
    const format = String(req.query.format || 'png').trim().toLowerCase();
    const download = String(req.query.download || '').trim().toLowerCase() === 'true';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      return fail(400, 'Query parameter "date" is required in YYYY-MM-DD format.');
    }

    if (!['pdf', 'png', 'jpg', 'jpeg', 'json'].includes(format)) {
      return fail(400, 'Supported formats are pdf, png, jpg, jpeg and json.');
    }

    const parsedDate = new Date(`${requestedDate}T00:00:00+05:30`);
    if (Number.isNaN(parsedDate.getTime())) {
      return fail(400, 'Invalid attendance date.');
    }

    const dayName = new Date(`${requestedDate}T00:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC'
    });

    const displayDate = new Date(`${requestedDate}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });

    /* ============================================================
     * 1. GET ALL TIMETABLE DATA FOR THE REQUESTED DAY
     * ============================================================ */
    const timetableDocuments = await TimeTable.find({}, { sem: 1, batch: 1, weekSchedule: 1 }).lean();

    const slotMap = new Map();

    for (const timetable of timetableDocuments) {
      const semester = normalizeSemester(timetable.sem);
      const batch = normalizeBatch(timetable.batch);
      if (!semester || !batch) continue;

      const daySchedule = (timetable.weekSchedule || []).find(
        item => String(item.day).trim().toLowerCase() === dayName.toLowerCase()
      );
      if (!daySchedule) continue;

      for (const period of daySchedule.periods || []) {
        const session = normalizeSession(period.session);
        const subject = String(period.subject || '').trim();
        if (!session || !subject) continue;

        const key = `${semester}|${batch}|${session}`;
        if (!slotMap.has(key)) {
          slotMap.set(key, { semester, batch, session, subjects: new Set() });
        }
        slotMap.get(key).subjects.add(subject);
      }
    }

    /* ============================================================
     * 2. GET ALL STUDENTS
     * ============================================================ */
    const semesterSet = new Set([...slotMap.values()].map(slot => slot.semester));
    const studentsByBatch = new Map();

    for (const semester of semesterSet) {
      const studentCollection = `${semester}-SEM-students`;
      const Student = getModel(studentCollection, studentSchema);

      const students = await Student.find(
        {},
        { _id: 1, name: 1, rollno: 1, branch: 1, batch: 1, sem: 1 }
      ).lean();

      for (const student of students) {
        const batch = normalizeBatch(student.batch);
        if (!batch) continue;

        const key = `${semester}|${batch}`;
        if (!studentsByBatch.has(key)) {
          studentsByBatch.set(key, { total: 0, students: new Map(), branches: new Set() });
        }

        const group = studentsByBatch.get(key);
        const rollno = String(student.rollno || '').trim();
        if (!rollno) continue;
        if (group.students.has(rollno)) continue;

        group.students.set(rollno, student);
        group.total += 1;

        const branch = normalizeBranch(student.branch);
        if (branch) group.branches.add(branch);
      }
    }

    /* ============================================================
     * 3. READ ATTENDANCE FOR EVERY REQUIRED BATCH
     * ============================================================ */
    const sectionsMap = new Map();

    for (const slot of slotMap.values()) {
      const batchKey = `${slot.semester}|${slot.batch}`;
      const studentGroup = studentsByBatch.get(batchKey);
      if (!studentGroup || studentGroup.total === 0) continue;

      const attendanceCollection = `${slot.semester}-SEM-attendance-${slot.batch}`;
      const Attendance = getModel(attendanceCollection, attendanceSchema);

      const attendanceDocuments = await Attendance.find(
        {},
        { rollno: 1, name: 1, branch: 1, batch: 1, dailyLogs: 1 }
      ).lean();

      const validSubjects = new Set(
        [...slot.subjects].map(subject => String(subject).trim().toLowerCase())
      );

      const presentRollNumbers = new Set();

      for (const attendanceStudent of attendanceDocuments) {
        const rollno = String(attendanceStudent.rollno || '').trim();
        if (!rollno || !studentGroup.students.has(rollno)) continue;

        for (const log of attendanceStudent.dailyLogs || []) {
          const logDate = String(log.date || '').trim().slice(0, 10);
          const course = String(log.course || '').trim().toLowerCase();

          if (logDate === requestedDate && validSubjects.has(course) && isPresent(log.status)) {
            presentRollNumbers.add(rollno);
            break;
          }
        }
      }

      const attendanceMarked = attendanceDocuments.some(student =>
        (student.dailyLogs || []).some(log => {
          const logDate = String(log.date || '').trim().slice(0, 10);
          const course = String(log.course || '').trim().toLowerCase();
          return logDate === requestedDate && validSubjects.has(course);
        })
      );

      const totalStrength = studentGroup.total;
      const present = attendanceMarked ? presentRollNumbers.size : null;
      const absent = attendanceMarked ? Math.max(0, totalStrength - present) : null;

      const branches = [...studentGroup.branches].sort((a, b) => a.localeCompare(b, 'en'));

      // Skip this batch entirely if attendance hasn't been marked yet —
      // only marked batches should appear in the report/photo.
      if (!attendanceMarked) {
        continue;
      }

      const sectionKey = `${slot.semester}|${slot.session}`;
      if (!sectionsMap.has(sectionKey)) {
        sectionsMap.set(sectionKey, {
          semester: slot.semester,
          semesterLabel: toRoman(slot.semester),
          session: slot.session,
          program: CONFIG.defaultProgram,
          rows: []
        });
      }

      sectionsMap.get(sectionKey).rows.push({
        batch: slot.batch,
        branches,
        branchText: branches.join(', '),
        totalStrength,
        present,
        absent,
        attendanceMarked
      });
    }

    /* ============================================================
     * 4. SORT REPORT
     * ============================================================ */
    const sections = [...sectionsMap.values()]
      .filter(section => section.rows.length > 0)
      .sort(
        (a, b) =>
          semesterSortValue(a.semester) - semesterSortValue(b.semester) ||
          (a.session === 'FN' ? 0 : 1) - (b.session === 'FN' ? 0 : 1)
      )
      .map(section => ({
        ...section,
        rows: section.rows.sort((a, b) => compareBatches(a.batch, b.batch))
      }));

    if (sections.length === 0) {
      return fail(404, `No attendance/timetable data found for ${displayDate}.`);
    }

    /* ============================================================
     * 5. REPORT OBJECT
     * ============================================================ */
    const allRows = sections.flatMap(section => section.rows);
    const markedRows = allRows.filter(row => row.attendanceMarked);

    const report = {
      date: requestedDate,
      displayDate,
      dayName,
      generatedAt: new Date().toISOString(),
      sections,
      summary: {
        sections: sections.length,
        batches: allRows.length,
        totalStrength: markedRows.reduce((total, row) => total + row.totalStrength, 0),
        present: markedRows.reduce((total, row) => total + row.present, 0),
        absent: markedRows.reduce((total, row) => total + row.absent, 0),
        unmarkedBatches: allRows.length - markedRows.length
      }
    };

    if (format === 'json') {
      return res.status(200).json({ success: true, data: report });
    }

    /* ============================================================
     * 6. PDF GENERATION
     * ============================================================ */

    // Loads fonts + header image onto whichever PDFDocument instance is
    // passed in. PDFKit ties registered fonts/opened images to a specific
    // document, so this runs once on a throwaway "measuring" doc and again
    // on the real doc we actually render into.
    const loadAssets = (targetDoc) => {
      let fontRegular = 'Helvetica';
      let fontBold = 'Helvetica-Bold';

      const regularFontPath = fontAsset(CONFIG.fontRegular);
      const boldFontPath = fontAsset(CONFIG.fontBold);

      if (regularFontPath && boldFontPath) {
        try {
          targetDoc.registerFont('ReportRegular', regularFontPath);
          targetDoc.registerFont('ReportBold', boldFontPath);
          fontRegular = 'ReportRegular';
          fontBold = 'ReportBold';
        } catch {
          /* Helvetica fallback. */
        }
      } else {
        // This is the scenario that caused the stretched/gappy text and the
        // "LiberationSans" console warnings: Helvetica isn't embedded in the
        // PDF, so pdf-to-img has to substitute a system font to rasterize
        // it, and the metrics don't line up. If you see this warning, check
        // CONFIG.FONTS_DIR / fontRegular / fontBold.
        console.warn(
          '[CombinedAttendanceReport] Calibri font files not found at',
          path.join(CONFIG.FONTS_DIR, CONFIG.fontRegular),
          '— falling back to Helvetica, which renders with distorted spacing in PNG/JPG export.'
        );
      }

      let headerImage = null;
      for (const imageName of CONFIG.headerImages) {
        const imagePath = logoAsset(imageName);
        if (!imagePath) continue;
        try {
          headerImage = targetDoc.openImage(imagePath);
          break;
        } catch {
          continue;
        }
      }

      return { fontRegular, fontBold, headerImage };
    };

    const contentWidth = A4_WIDTH - PAGE_MARGINS.left - PAGE_MARGINS.right;

    let usedWidthForMeasure = 0;
    const columnWidths = COLUMNS.map((column, index) => {
      if (index === COLUMNS.length - 1) return contentWidth - usedWidthForMeasure;
      const w = Math.round(contentWidth * column.ratio);
      usedWidthForMeasure += w;
      return w;
    });

    const headerValuesForMeasure = Object.fromEntries(COLUMNS.map(column => [column.key, column.label]));

    const getRowValuesForMeasure = row => ({
      batch: row.batch,
      branchText: row.branchText || '—',
      totalStrength: formatNumber(row.totalStrength),
      present: row.attendanceMarked ? formatNumber(row.present) : 'Not marked',
      absent: row.attendanceMarked ? formatNumber(row.absent) : '—'
    });

    const measureRowWith = (measureDoc, values, font, size) => {
      measureDoc.font(font).fontSize(size);
      let maxHeight = 0;
      COLUMNS.forEach((column, index) => {
        const height = measureDoc.heightOfString(String(values[column.key] ?? ''), {
          width: columnWidths[index] - PAD_X * 2
        });
        maxHeight = Math.max(maxHeight, height);
      });
      return Math.max(MIN_ROW_H, Math.ceil(maxHeight + PAD_Y * 2));
    };

    // ---------- PASS 1: measure the whole report so we can size ONE page
    // that fits everything, instead of shrinking fonts or splitting pages ----------
    let singlePageMode = true;
    let plannedPageHeight = A4_HEIGHT;

    {
      const measureDoc = new PDFDocument({ size: 'A4', margins: { ...PAGE_MARGINS } });
      measureDoc.on('data', () => {});
      measureDoc.on('error', () => {});

      const { fontRegular, fontBold, headerImage } = loadAssets(measureDoc);

      let total = PAGE_MARGINS.top;

      // letterhead
      if (headerImage) {
        total += (contentWidth * headerImage.height) / headerImage.width + 10;
      } else {
        measureDoc.font(fontBold).fontSize(17);
        total += measureDoc.heightOfString(CONFIG.institutionName, { width: contentWidth }) + 10;
      }
      total += 2.4 + 16; // accent bar + gap

      // title + subtitle
      measureDoc.font(fontBold).fontSize(SIZE.title);
      total += measureDoc.heightOfString(CONFIG.departmentTitle, { width: contentWidth }) + 3;
      measureDoc.font(fontRegular).fontSize(SIZE.subtitle);
      total += measureDoc.heightOfString(CONFIG.reportTitle, { width: contentWidth }) + 14;

      // date pill + summary dashboard
      total += 32;
      total += 52 + 20;

      // sections
      for (const section of sections) {
        const title = `${section.program} ${section.semesterLabel} Semester Attendance`;
        measureDoc.font(fontBold).fontSize(SIZE.section);
        total += measureDoc.heightOfString(title, { width: contentWidth - 100 }) + 8;
        total += measureRowWith(measureDoc, headerValuesForMeasure, fontBold, SIZE.head);

        for (const row of section.rows) {
          total += measureRowWith(measureDoc, getRowValuesForMeasure(row), fontRegular, SIZE.body);
        }

        total += SECTION_GAP;
      }

      // signature + footer
      measureDoc.font(fontBold).fontSize(SIZE.signatory);
      total += 6 + 6 + measureDoc.heightOfString(CONFIG.signatory, { width: contentWidth }) + 10;
      total += PAGE_MARGINS.bottom + 50;

      // generous safety buffer — better to have a little extra white space
      // at the bottom than to risk clipping content
      total = Math.ceil(total) + 100;

      measureDoc.end();

      if (total <= MAX_SINGLE_PAGE_HEIGHT) {
        singlePageMode = true;
        plannedPageHeight = total;
      } else {
        // Data volume is unusually large — fall back to normal multi-page
        // A4 pagination rather than an unwieldy single page.
        singlePageMode = false;
        plannedPageHeight = A4_HEIGHT;
      }
    }

    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: singlePageMode ? [A4_WIDTH, plannedPageHeight] : 'A4',
        margins: { ...PAGE_MARGINS },
        bufferPages: true,
        info: {
          Title: `Attendance Report – ${displayDate}`,
          Author: CONFIG.institutionName,
          Subject: `${CONFIG.departmentTitle} – FN & AN Attendance`
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const { fontRegular, fontBold, headerImage } = loadAssets(doc);

        const left = PAGE_MARGINS.left;
        const width = doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right;
        const bottom = () => doc.page.height - PAGE_MARGINS.bottom;

        let y = PAGE_MARGINS.top;

        // ---------- helpers ----------

        const drawLetterhead = () => {
          if (headerImage) {
            const height = (width * headerImage.height) / headerImage.width;
            doc.image(headerImage, left, y, { width, height });
            y += height + 10;
          } else {
            doc
              .font(fontBold)
              .fontSize(17)
              .fillColor(CONFIG.colors.navy)
              .text(CONFIG.institutionName, left, y, { width, align: 'center' });
            y = doc.y + 10;
          }

          // A crisp two-tone accent rule under the letterhead, brand navy + red
          doc.rect(left, y, width * 0.7, 2.4).fill(CONFIG.colors.navy);
          doc.rect(left + width * 0.7, y, width * 0.3, 2.4).fill(CONFIG.colors.accent);
          y += 16;
        };

        const newPage = () => {
          doc.addPage();
          y = PAGE_MARGINS.top;
          drawLetterhead();
        };

        const measureRow = (values, font, size) => {
          doc.font(font).fontSize(size);
          let maxHeight = 0;
          COLUMNS.forEach((column, index) => {
            const height = doc.heightOfString(String(values[column.key] ?? ''), {
              width: columnWidths[index] - PAD_X * 2
            });
            maxHeight = Math.max(maxHeight, height);
          });
          return Math.max(MIN_ROW_H, Math.ceil(maxHeight + PAD_Y * 2));
        };

        const drawRow = (values, { font, size, fill = null, textColors = {}, align = null, bold = false }) => {
          const height = measureRow(values, font, size);
          let x = left;

          COLUMNS.forEach((column, index) => {
            const w = columnWidths[index];

            if (fill) {
              doc.rect(x, y, w, height).fill(fill);
            }

            doc
              .rect(x, y, w, height)
              .lineWidth(0.6)
              .strokeColor(CONFIG.colors.border)
              .stroke();

            const text = String(values[column.key] ?? '');
            const textWidth = w - PAD_X * 2;

            doc.font(font).fontSize(size);
            const textHeight = doc.heightOfString(text, { width: textWidth });

            doc
              .fillColor(textColors[column.key] || CONFIG.colors.text)
              .text(text, x + PAD_X, y + (height - textHeight) / 2, {
                width: textWidth,
                align: align || column.align
              });

            x += w;
          });

          y += height;
        };

        const headerValues = Object.fromEntries(COLUMNS.map(column => [column.key, column.label]));

        const drawHeaderRow = () =>
          drawRow(headerValues, {
            font: fontBold,
            size: SIZE.head,
            fill: CONFIG.colors.headerFill,
            textColors: Object.fromEntries(COLUMNS.map(c => [c.key, CONFIG.colors.headerText])),
            align: 'center'
          });

        const getRowValues = row => ({
          batch: row.batch,
          branchText: row.branchText || '—',
          totalStrength: formatNumber(row.totalStrength),
          present: row.attendanceMarked ? formatNumber(row.present) : 'Not marked',
          absent: row.attendanceMarked ? formatNumber(row.absent) : '—'
        });

        // Session pill (FN / AN) drawn to the right of a section title
        const drawSessionPill = (session, titleWidth) => {
          const label = session === 'FN' ? 'FORENOON' : 'AFTERNOON';
          const bg = session === 'FN' ? CONFIG.colors.pillFN : CONFIG.colors.pillAN;
          const fg = session === 'FN' ? CONFIG.colors.pillFNText : CONFIG.colors.pillANText;

          doc.font(fontBold).fontSize(8);
          const pillWidth = doc.widthOfString(label) + 18;
          const pillHeight = 16;
          const pillX = left + width - pillWidth;
          const pillY = y;

          doc.roundedRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2).fill(bg);
          doc
            .fillColor(fg)
            .text(label, pillX, pillY + 4.5, { width: pillWidth, align: 'center' });
        };

        const drawSectionTitle = (section, contd = false) => {
          const title = `${section.program} ${section.semesterLabel} Semester Attendance${contd ? ' (contd.)' : ''}`;

          // small accent bar to the left of the title, like a section marker
          doc.rect(left, y + 2, 4, 15).fill(CONFIG.colors.accent);

          doc
            .font(fontBold)
            .fontSize(SIZE.section)
            .fillColor(CONFIG.colors.navy)
            .text(title, left + 12, y, { width: width - 100, align: 'left' });

          drawSessionPill(section.session, width);

          y = doc.y + 8;
        };

        // Small summary "stat card" used in the dashboard row at the top
        const drawStatCard = (x, cardWidth, label, value, bg, fg) => {
          const cardHeight = 52;
          doc.roundedRect(x, y, cardWidth, cardHeight, RADIUS).fill(bg);

          doc
            .font(fontBold)
            .fontSize(SIZE.cardNumber)
            .fillColor(fg)
            .text(String(value), x + 12, y + 9, { width: cardWidth - 24, align: 'left' });

          doc
            .font(fontRegular)
            .fontSize(SIZE.cardLabel)
            .fillColor(fg)
            .text(label.toUpperCase(), x + 12, y + 33, { width: cardWidth - 24, align: 'left', characterSpacing: 0.4 });

          return cardHeight;
        };

        const drawSummaryDashboard = () => {
          const gap = 12;
          const cardWidth = (width - gap * 3) / 4;

          const attendancePct =
            report.summary.totalStrength > 0
              ? Math.round((report.summary.present / report.summary.totalStrength) * 100)
              : 0;

          const cards = [
            { label: 'Total Strength', value: formatNumber(report.summary.totalStrength), bg: CONFIG.colors.cardTotalBg, fg: CONFIG.colors.cardTotalText },
            { label: 'Present', value: formatNumber(report.summary.present), bg: CONFIG.colors.cardPresentBg, fg: CONFIG.colors.cardPresentText },
            { label: 'Absent', value: formatNumber(report.summary.absent), bg: CONFIG.colors.cardAbsentBg, fg: CONFIG.colors.cardAbsentText },
            { label: 'Attendance %', value: `${attendancePct}%`, bg: CONFIG.colors.cardUnmarkedBg, fg: CONFIG.colors.cardUnmarkedText }
          ];

          const startY = y;
          let x = left;
          let maxCardHeight = 0;

          cards.forEach((card, index) => {
            y = startY;
            const h = drawStatCard(x, cardWidth, card.label, card.value, card.bg, card.fg);
            maxCardHeight = Math.max(maxCardHeight, h);
            x += cardWidth + gap;
          });

          y = startY + maxCardHeight + 20;
        };

        // ---------- REPORT HEADER ----------

        drawLetterhead();

        doc
          .font(fontBold)
          .fontSize(SIZE.title)
          .fillColor(CONFIG.colors.title)
          .text(CONFIG.departmentTitle, left, y, { width, align: 'center' });

        y = doc.y + 3;

        doc
          .font(fontRegular)
          .fontSize(SIZE.subtitle)
          .fillColor(CONFIG.colors.muted)
          .text(CONFIG.reportTitle, left, y, { width, align: 'center' });

        y = doc.y + 14;

        // Date shown as a soft pill on the right instead of plain bold text
        doc.font(fontBold).fontSize(SIZE.date);
        const dateLabel = `${dayName}, ${displayDate}`;
        const dateWidth = doc.widthOfString(dateLabel) + 20;
        doc
          .roundedRect(left + width - dateWidth, y, dateWidth, 20, 10)
          .fillAndStroke(CONFIG.colors.zebra, CONFIG.colors.border);
        doc
          .fillColor(CONFIG.colors.navy)
          .text(dateLabel, left + width - dateWidth, y + 5, { width: dateWidth, align: 'center' });

        y += 32;

        drawSummaryDashboard();

        // ---------- ALL SEMESTERS + FN/AN ----------

        for (const section of sections) {
          doc.font(fontBold).fontSize(SIZE.section);
          const title = `${section.program} ${section.semesterLabel} Semester Attendance`;
          const titleHeight = doc.heightOfString(title, { width: width - 100 }) + 8;

          const headerHeight = measureRow(headerValues, fontBold, SIZE.head);
          const firstRowHeight = measureRow(getRowValues(section.rows[0]), fontRegular, SIZE.body);

          if (y + titleHeight + headerHeight + firstRowHeight > bottom()) {
            newPage();
          }

          drawSectionTitle(section);
          drawHeaderRow();

          section.rows.forEach((row, rowIndex) => {
            const values = getRowValues(row);
            const rowHeight = measureRow(values, fontRegular, SIZE.body);

            if (y + rowHeight > bottom()) {
              newPage();
              drawSectionTitle(section, true);
              drawHeaderRow();
            }

            const zebraFill = rowIndex % 2 === 1 ? CONFIG.colors.zebra : null;

            drawRow(values, {
              font: fontRegular,
              size: SIZE.body,
              fill: zebraFill,
              textColors: row.attendanceMarked
                ? {}
                : { present: CONFIG.colors.muted, absent: CONFIG.colors.muted }
            });
          });

          y += SECTION_GAP;
        }

        // ---------- SIGNATURE ----------

        if (y + 40 > bottom()) {
          newPage();
        }

        y += 6;
        doc.moveTo(left + width - 160, y).lineTo(left + width, y).lineWidth(0.8).strokeColor(CONFIG.colors.border).stroke();
        y += 6;

        doc
          .font(fontBold)
          .fontSize(SIZE.signatory)
          .fillColor(CONFIG.colors.navy)
          .text(CONFIG.signatory, left, y, { width, align: 'right' });

        // ---------- PAGE NUMBERS / FOOTER ----------

        const pageRange = doc.bufferedPageRange();

        for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
          doc.switchToPage(i);

          const originalBottom = doc.page.margins.bottom;
          doc.page.margins.bottom = 0;

          doc
            .moveTo(left, doc.page.height - 40)
            .lineTo(left + width, doc.page.height - 40)
            .lineWidth(0.5)
            .strokeColor(CONFIG.colors.border)
            .stroke();

          doc
            .font(fontRegular)
            .fontSize(SIZE.footer)
            .fillColor(CONFIG.colors.muted)
            .text(CONFIG.institutionName, left, doc.page.height - 32, {
              width: width / 2,
              align: 'left',
              lineBreak: false
            });

          if (pageRange.count > 1) {
            doc
              .font(fontRegular)
              .fontSize(SIZE.footer)
              .fillColor(CONFIG.colors.muted)
              .text(`Page ${i + 1} of ${pageRange.count}`, left + width / 2, doc.page.height - 32, {
                width: width / 2,
                align: 'right',
                lineBreak: false
              });
          }

          doc.page.margins.bottom = originalBottom;
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });

    /* ============================================================
     * 7. PDF RESPONSE
     * ============================================================ */
    const baseName = `Attendance_Report_FN_AN_${requestedDate}`;
    const disposition = download ? 'attachment' : 'inline';

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Total-Pages');

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `${disposition}; filename="${baseName}.pdf"`);
      return res.status(200).end(pdfBuffer);
    }

    /* ============================================================
     * 8. PDF → PNG/JPG
     * ============================================================ */
    let pdfToImg;
    try {
      ({ pdf: pdfToImg } = await import('pdf-to-img'));
    } catch {
      return fail(501, 'Image export requires pdf-to-img. Install it with: npm install pdf-to-img');
    }

    const imageDocument = await pdfToImg(pdfBuffer, { scale: 2.5 });
    const totalPages = imageDocument.length;
    const page = Number.parseInt(req.query.page || '1', 10);

    if (!Number.isInteger(page) || page < 1 || page > totalPages) {
      return fail(400, `"page" must be between 1 and ${totalPages}.`);
    }

    let image;
    let currentPage = 0;

    for await (const pageImage of imageDocument) {
      currentPage++;
      if (currentPage === page) {
        image = pageImage;
        break;
      }
    }

    if (!image) {
      return fail(500, 'Unable to render requested report page.');
    }

    let mime = 'image/png';
    let extension = 'png';

    if (format === 'jpg' || format === 'jpeg') {
      let sharp;
      try {
        sharp = require('sharp');
      } catch {
        return fail(501, 'JPG export requires sharp. Install it with: npm install sharp');
      }

      image = await sharp(image).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
      mime = 'image/jpeg';
      extension = 'jpg';
    }

    const suffix = totalPages > 1 ? `_page${page}` : '';
    const date = new Date();

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', image.length);
    res.setHeader('X-Total-Pages', String(totalPages));
    res.setHeader('Content-Disposition', `${disposition}; filename="CDC-DAY-SUMMARY${date}.${extension}"`);

    return res.status(200).end(image);
  } catch (error) {
    console.error('[CombinedAttendanceReport]', error);

    if (res.headersSent) {
      return res.end();
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to generate combined attendance report.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createSemesterSetup,
  getAllCollections,
  deleteCollections,
  addStudents,
  createTimeTable,
  uploadTimeTable,
  getTimeTable,
  modifySemesterSetup,
  getViewStudents,
  addStudent,
  deleteStudent,
  updateStudent,
  getViewFaculty,
  addFaculty,
  deleteFaculty,
  updateFaculty,
  getStudentsForAttendanceUpdation,
  HandleUpdateAttendance,
  deleteAttendanceLog,
  HandleSessionAttendanceReportExcel,
  HandleSessionAttendanceReportPDF,
  HandleMonthlyAttendanceReportExcel,
  getDashboardData,
  getProfileData,
  sendMailToBatches,
  sendMailToIndividual,
  modifyTimeTable,
  getAllTimetables,
  CreateNewAdmin,
  deleteTimetable,
  modifyCollection,
  downloadLeaderboardPDF,
  downloadLeaderboardImage,
  generateAttendancePDF,
  generatePasswordsForAllFaculty,
  deleteBackup,
  getAllBackups,
  HandleCombinedAttendanceReport
};