const QRCode = require('qrcode');
const crypto = require('crypto');
const getModel = require('./getModel')
require("dotenv").config();
const Coder = require('../models/coding');
const fetchLeetCode = require("../modules/leetcode");
const fetchGFG = require("../modules/gfg");
const fetchCodeChef = require("../modules/codechef");
const studentSchema = require('../models/Student');


//-------------------------------   Manage Dynamic Routes  Start -----------------------------//

async function updateAllStudentScores(req, res) {
  try {
    const students = await Coder.find();
    if (students.length === 0) {
      return res.status(200).json({ msg: "No students found to update." });
    }

    let successCount = 0;
    let failed = [];

    for (const student of students) {
      try {
        const { handles } = student;

        // fetch all APIs in parallel for this student
        const [leetcodeData, gfgData, codechefData] = await Promise.all([
          handles.leetcode ? fetchLeetCode(handles.leetcode).catch(() => ({})) : {},
          handles.gfg ? fetchGFG(handles.gfg).catch(() => ({})) : {},
          handles.codechef ? fetchCodeChef(handles.codechef).catch(() => ({})) : {},
        ]);

        // calculate scores
        const leetcodeScore =
          (leetcodeData.easy || 0) * 2 +
          (leetcodeData.medium || 0) * 4 +
          (leetcodeData.hard || 0) * 6;

        const normalizedRating = Math.max(
          0,
          Math.min(1, ((codechefData.rating || 0) - 1000) / (3500 - 1000))
        );
        const normalizedProblems = Math.max(
          0,
          Math.min(1, (codechefData.problemsSolved || 0) / 200)
        );

        const codechefScore = Math.round(
          (normalizedRating * 0.5 + normalizedProblems * 0.5) * 500
        );

        const gfgScore = gfgData.codingScore || 0;
        const totalScore = leetcodeScore + gfgScore + codechefScore;

        // update each student individually
        await Coder.updateOne(
          { rollno: student.rollno },
          {
            $set: {
              scores: { leetcode: leetcodeScore, gfg: gfgScore, codechef: codechefScore },
              totalScore,
              lastUpdated: new Date(),
            },
          }
        );

        successCount++;
        // console.log(`✅ Updated: ${student.rollno}`);
      } catch (err) {
        failed.push(student.rollno);
        console.error(`❌ Failed to update ${student.rollno}:`, err.message);
      }
    }

    // final response
    res.status(200).json({
      msg: "Scores update completed",
      updatedCount: successCount,
      failedCount: failed.length,
      failedRollnos: failed,
    });
  } catch (error) {
    console.error("Error updating scores:", error);
    res.status(500).json({ msg: "Error updating scores", error: error.message });
  }
};

async function generateAndStoreQrCodes(req, res) {
  try {
    console.log("🔄 Starting daily QR code generation for ALL Semester collections...");

    const SECRET_KEY = process.env.Attendance_Secret;
    const today = new Date().toISOString().slice(0, 10);

    // 1. Get all collection names in the database
    const allCollections = await mongoose.connection.db.listCollections().toArray();

    // 2. Filter: Keep only collections that have "SEM-students" in the name
    const targetCollections = allCollections
      .map((col) => col.name)
      .filter((name) => name.includes("SEM-students"));

    if (targetCollections.length === 0) {
      return res.status(404).json({ msg: "No 'SEM-students' collections found." });
    }

    console.log(`Found ${targetCollections.length} collections:`, targetCollections);

    let grandTotalUpdated = 0;
    const report = {}; // To store stats per collection

    // 3. Iterate through each matching collection
    for (const collectionName of targetCollections) {
      
      const DynamicStudentModel = getModel(collectionName,studentSchema);

      const students = await DynamicStudentModel.find({});

      if (students.length === 0) {
        console.log(`- Skipping ${collectionName} (No students found)`);
        continue;
      }

      const bulkOps = [];

      for (const student of students) {
        const dataToHash = `${student.rollno}:${student.batch}:${student.sem}:${today}:${SECRET_KEY}`;
        const hash = crypto.createHash("sha256").update(dataToHash).digest("hex");

        const qrPayload = JSON.stringify({ rollno: student.rollno, hash });
        const qrDataUrl = await QRCode.toDataURL(qrPayload);

        bulkOps.push({
          updateOne: {
            filter: { _id: student._id },
            update: { $set: { qrData: hash, qrLink: qrDataUrl } },
          },
        });
      }

      if (bulkOps.length > 0) {
        const result = await DynamicStudentModel.bulkWrite(bulkOps);
        console.log(` Updated ${collectionName}: ${result.modifiedCount} records`);
        grandTotalUpdated += result.modifiedCount;
        report[collectionName] = result.modifiedCount;
      }
    }

    console.log(` Completed. Total updated: ${grandTotalUpdated}`);

    return res.status(200).json({
      msg: "QR codes updated successfully across all semesters",
      totalUpdated: grandTotalUpdated,
      details: report,
    });

  } catch (error) {
    console.error("❌ Error during multi-collection QR update:", error);
    return res.status(500).json({
      msg: "Error during daily QR code update",
      error: error.message,
    });
  }
}

//-------------------------------   Manage Dynamic Routes  End -----------------------------//


module.exports = { generateAndStoreQrCodes,updateAllStudentScores};