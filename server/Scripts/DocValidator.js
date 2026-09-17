const mongoose = require("mongoose");

async function validateAndCleanData() {
  try {
    console.log("\n⏳ Starting Data Validation and Sync...\n");

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("Database connection not established.");
    }

    // ==========================================
    // GET COLLECTIONS
    // ==========================================

    const collections = await db.listCollections().toArray();

    const studentCollections = collections.filter((c) =>
      c.name.includes("-SEM-students")
    );

    const attendanceCollections = collections.filter((c) =>
      c.name.includes("-SEM-attendance-")
    );

    if (
      studentCollections.length === 0 &&
      attendanceCollections.length === 0
    ) {
      console.log("⚠️ No student or attendance collections found.");

      return {
        success: true,
        message: "No student or attendance collections found.",
        summary: {
          semesters: 0,
          studentsChecked: 0,
          cleaned: 0,
          deleted: 0,
          inserted: 0
        },
        semesterWise: []
      };
    }

    // ==========================================
    // TOTAL COUNTERS
    // ==========================================

    let totalStudentsChecked = 0;
    let totalCleaned = 0;
    let totalDeleted = 0;
    let totalInserted = 0;

    // ==========================================
    // SEMESTER-WISE RESULTS
    // ==========================================

    const semesterResults = {};

    // ==========================================
    // PHASE 1
    // CLEAN STUDENT + ATTENDANCE COLLECTIONS
    // ==========================================

    const allCollectionsToClean = [
      ...studentCollections,
      ...attendanceCollections
    ];

    for (const colInfo of allCollectionsToClean) {
      const collectionName = colInfo.name;

      const collection = db.collection(collectionName);

      const docs = await collection.find({}).toArray();

      // ------------------------------------------
      // GET SEMESTER
      // ------------------------------------------

      let sem = "UNKNOWN";

      const semMatch = collectionName.match(
        /^(.+)-SEM-(students|attendance-)/
      );

      if (semMatch) {
        sem = semMatch[1];
      }

      // ------------------------------------------
      // CREATE SEMESTER ENTRY
      // ------------------------------------------

      if (!semesterResults[sem]) {
        semesterResults[sem] = {
          studentsChecked: 0,
          cleaned: 0,
          deleted: 0,
          inserted: 0,
          cleanedRollnos: [],
          deletedRollnos: [],
          insertedRollnos: []
        };
      }

      semesterResults[sem].studentsChecked += docs.length;

      totalStudentsChecked += docs.length;

      const bulkOps = [];

      // ------------------------------------------
      // PROCESS DOCUMENTS
      // ------------------------------------------

      for (const doc of docs) {
        let needsUpdate = false;

        const updateFields = {};

        let rollno = doc.rollno;
        let name = doc.name;

        // ========================================
        // 1. NULL / EMPTY ROLLNO
        // ========================================

        if (
          !rollno ||
          (
            typeof rollno === "string" &&
            rollno.trim() === ""
          )
        ) {
          bulkOps.push({
            deleteOne: {
              filter: {
                _id: doc._id
              }
            }
          });

          totalDeleted++;

          semesterResults[sem].deleted++;

          if (doc.rollno) {
            semesterResults[sem].deletedRollnos.push(
              String(doc.rollno).trim()
            );
          }

          continue;
        }

        // ========================================
        // 2. TRIM ROLLNO
        // ========================================

        if (
          typeof rollno === "string" &&
          rollno !== rollno.trim()
        ) {
          rollno = rollno.trim();

          updateFields.rollno = rollno;

          needsUpdate = true;
        }

        // ========================================
        // 3. EMPTY NAME
        // ========================================

        if (
          !name ||
          (
            typeof name === "string" &&
            name.trim() === ""
          )
        ) {
          name = "needtoupdate";

          updateFields.name = name;

          needsUpdate = true;
        }

        // ========================================
        // 4. CLEAN NAME
        // ========================================

        else if (typeof name === "string") {
          const cleanedName = name
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .replace(/\s+/g, " ")
            .trim();

          if (name !== cleanedName) {
            name =
              cleanedName || "needtoupdate";

            updateFields.name = name;

            needsUpdate = true;
          }
        }

        // ========================================
        // ADD UPDATE
        // ========================================

        if (needsUpdate) {
          bulkOps.push({
            updateOne: {
              filter: {
                _id: doc._id
              },

              update: {
                $set: updateFields
              }
            }
          });

          totalCleaned++;

          semesterResults[sem].cleaned++;

          semesterResults[sem].cleanedRollnos.push(
            rollno
          );
        }
      }

      // ==========================================
      // EXECUTE CLEANUP
      // ==========================================

      if (bulkOps.length > 0) {
        await collection.bulkWrite(
          bulkOps,
          {
            ordered: false
          }
        );
      }
    }

    console.log("✅ Phase 1 completed.");

    // ==========================================
    // PHASE 2
    // SYNC MISSING STUDENTS
    // ==========================================

    for (const stuColInfo of studentCollections) {
      const stuColName = stuColInfo.name;

      const semname =
        stuColName.split("-SEM-students")[0];

      const stuCollection =
        db.collection(stuColName);

      const students =
        await stuCollection.find({}).toArray();

      // Make sure semester exists
      if (!semesterResults[semname]) {
        semesterResults[semname] = {
          studentsChecked: students.length,
          cleaned: 0,
          deleted: 0,
          inserted: 0,
          cleanedRollnos: [],
          deletedRollnos: [],
          insertedRollnos: []
        };
      }

      for (const student of students) {
        const rollno = student.rollno;
        const batch = student.batch;
        const name = student.name;

        // Skip invalid student
        if (!rollno || !batch) {
          continue;
        }

        // ========================================
        // TARGET ATTENDANCE COLLECTION
        // ========================================

        const targetAttColName =
          `${semname}-SEM-attendance-${batch}`;

        const attCollection =
          db.collection(targetAttColName);

        // ========================================
        // CHECK EXISTING STUDENT
        // ========================================

        const existsInAttendance =
          await attCollection.findOne({
            rollno: rollno
          });

        // ========================================
        // INSERT MISSING STUDENT
        // ========================================

        if (!existsInAttendance) {
          const newAttendanceDoc = {
            rollno: rollno,
            name: name,
            branch: student.branch || null,
            batch: batch,

            overallAttendance: {
              totalDays: 0,
              presentDays: 0
            },

            courseAttendance: {},

            dailyLogs: [],

            createdAt: new Date(),
            updatedAt: new Date()
          };

          await attCollection.insertOne(
            newAttendanceDoc
          );

          totalInserted++;

          semesterResults[semname].inserted++;

          semesterResults[
            semname
          ].insertedRollnos.push(rollno);
        }
      }
    }

    console.log("✅ Phase 2 completed.");

    // ==========================================
    // BUILD SHORT SEMESTER RESPONSE
    // ==========================================

    const semesterWise = Object.entries(
      semesterResults
    ).map(([sem, data]) => {
      const result = {
        sem: sem,

        checked:
          data.studentsChecked,

        cleaned:
          data.cleaned,

        deleted:
          data.deleted,

        inserted:
          data.inserted
      };

      // Only show rollnos when required
      if (data.cleanedRollnos.length > 0) {
        result.cleanedRollnos =
          data.cleanedRollnos;
      }

      if (data.deletedRollnos.length > 0) {
        result.deletedRollnos =
          data.deletedRollnos;
      }

      if (data.insertedRollnos.length > 0) {
        result.insertedRollnos =
          data.insertedRollnos;
      }

      return result;
    });

    // ==========================================
    // FINAL CONSOLE
    // ==========================================

    console.log(
      "\n======================================"
    );

    console.log(
      "✅ DATA VALIDATION COMPLETED"
    );

    console.log(
      "======================================"
    );

    console.log(
      `Semesters : ${Object.keys(
        semesterResults
      ).length}`
    );

    console.log(
      `Checked   : ${totalStudentsChecked}`
    );

    console.log(
      `Cleaned   : ${totalCleaned}`
    );

    console.log(
      `Deleted   : ${totalDeleted}`
    );

    console.log(
      `Inserted  : ${totalInserted}`
    );

    console.log(
      "======================================\n"
    );

    // ==========================================
    // RETURN RESPONSE
    // ==========================================

    return {
      success: true,

      message:
        "Data validation and synchronization completed successfully.",

      summary: {
        semesters:
          Object.keys(
            semesterResults
          ).length,

        studentsChecked:
          totalStudentsChecked,

        cleaned:
          totalCleaned,

        deleted:
          totalDeleted,

        inserted:
          totalInserted
      },

      semesterWise
    };

  } catch (error) {
    console.error(
      "❌ Data Validation Error:",
      error.message
    );

    return {
      success: false,

      message:
        "Data validation and synchronization failed.",

      error: error.message
    };
  }
}

async function validateAndCleanDataController(req, res) {
  try {
    const result =
      await validateAndCleanData();

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error(
      "❌ Validation Controller Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Data validation failed.",
      error: error.message
    });
  }
}

module.exports = {
  validateAndCleanData,
  validateAndCleanDataController
};