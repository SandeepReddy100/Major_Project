const mongoose = require("mongoose");

async function validateAndSyncAttendanceLogs() {
  try {
    console.log("\n⏳ Starting Attendance Validation...\n");

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("Database connection not established.");
    }

    // ==========================================
    // GET ATTENDANCE COLLECTIONS
    // ==========================================

    const collections = await db.listCollections().toArray();

    const attendanceCollections = collections.filter((c) =>
      c.name.includes("-SEM-attendance-")
    );

    if (attendanceCollections.length === 0) {
      console.log("⚠️ No attendance collections found.");

      return {
        success: true,
        message: "No attendance collections found.",
        summary: {
          semestersChecked: 0,
          collectionsChecked: 0,
          studentsChecked: 0,
          studentsUpdated: 0
        },
        semesters: {}
      };
    }

    let totalStudentsChecked = 0;
    let totalStudentsUpdated = 0;

    // ==========================================
    // SEMESTER-WISE RESULTS
    // ==========================================

    const semesterResults = {};

    // ==========================================
    // PROCESS EACH COLLECTION
    // ==========================================

    for (const colInfo of attendanceCollections) {
      const collectionName = colInfo.name;

      /*
        Example:
        VI-SEM-attendance-SB4

        sem   = VI
        batch = SB4
      */

      const match = collectionName.match(
        /^(.+)-SEM-attendance-(.+)$/
      );

      if (!match) {
        continue;
      }

      const sem = match[1];
      const batch = match[2];

      const collection = db.collection(collectionName);

      const students = await collection.find({}).toArray();

      totalStudentsChecked += students.length;

      // ==========================================
      // CREATE SEMESTER ENTRY
      // ==========================================

      if (!semesterResults[sem]) {
        semesterResults[sem] = {
          collections: 0,
          studentsChecked: 0,
          studentsUpdated: 0,
          collectionsData: []
        };
      }

      semesterResults[sem].collections++;
      semesterResults[sem].studentsChecked += students.length;

      const bulkOps = [];
      const updatedRollnos = [];

      // ==========================================
      // PROCESS STUDENTS
      // ==========================================

      for (const student of students) {
        const dailyLogs = Array.isArray(student.dailyLogs)
          ? student.dailyLogs
          : [];

        // ==========================================
        // CALCULATE FROM DAILY LOGS
        // ==========================================

        const calculatedCourseAttendance = {};

        let overallTotalDays = 0;
        let overallPresentDays = 0;

        const logKeys = new Set();

        for (const log of dailyLogs) {
          if (!log) continue;

          const date = log.date;
          const course = log.course;

          const status = String(log.status || "")
            .toLowerCase()
            .trim();

          // Skip invalid logs
          if (!date || !course || !status) {
            continue;
          }

          // One date + course = one attendance record
          const logKey = `${date}__${course}`;

          // Ignore duplicate logs
          if (logKeys.has(logKey)) {
            continue;
          }

          logKeys.add(logKey);

          // ==========================================
          // CREATE COURSE
          // ==========================================

          if (!calculatedCourseAttendance[course]) {
            calculatedCourseAttendance[course] = {
              totalDays: 0,
              presentDays: 0
            };
          }

          // Total days
          calculatedCourseAttendance[course].totalDays++;
          overallTotalDays++;

          // Present days
          if (status === "present") {
            calculatedCourseAttendance[course].presentDays++;
            overallPresentDays++;
          }
        }

        // ==========================================
        // BUILD CORRECT COURSE ATTENDANCE
        // ==========================================

        const correctedCourseAttendance = {};

        const storedCourseAttendance =
          student.courseAttendance || {};

        // Existing courses
        for (const [course, storedData] of Object.entries(
          storedCourseAttendance
        )) {
          const calculated =
            calculatedCourseAttendance[course];

          correctedCourseAttendance[course] = {
            totalDays: calculated
              ? calculated.totalDays
              : 0,

            presentDays: calculated
              ? calculated.presentDays
              : 0
          };
        }

        // Courses present in logs but missing in DB
        for (const [course, calculated] of Object.entries(
          calculatedCourseAttendance
        )) {
          if (!correctedCourseAttendance[course]) {
            correctedCourseAttendance[course] = {
              totalDays: calculated.totalDays,
              presentDays: calculated.presentDays
            };
          }
        }

        // ==========================================
        // CHECK MISMATCH
        // ==========================================

        let mismatch = false;

        const storedCourses =
          student.courseAttendance || {};

        // Check calculated courses
        for (const [course, calculated] of Object.entries(
          calculatedCourseAttendance
        )) {
          const stored = storedCourses[course];

          if (!stored) {
            mismatch = true;
            break;
          }

          if (
            Number(stored.totalDays || 0) !==
              calculated.totalDays ||
            Number(stored.presentDays || 0) !==
              calculated.presentDays
          ) {
            mismatch = true;
            break;
          }
        }

        // Check stored courses with no logs
        if (!mismatch) {
          for (const [course, stored] of Object.entries(
            storedCourses
          )) {
            if (!calculatedCourseAttendance[course]) {
              if (
                Number(stored.totalDays || 0) !== 0 ||
                Number(stored.presentDays || 0) !== 0
              ) {
                mismatch = true;
                break;
              }
            }
          }
        }

        // ==========================================
        // CHECK OVERALL ATTENDANCE
        // ==========================================

        const storedOverall =
          student.overallAttendance || {};

        if (
          Number(storedOverall.totalDays || 0) !==
            overallTotalDays ||
          Number(storedOverall.presentDays || 0) !==
            overallPresentDays
        ) {
          mismatch = true;
        }

        // ==========================================
        // ADD UPDATE
        // ==========================================

        if (mismatch) {
          bulkOps.push({
            updateOne: {
              filter: {
                _id: student._id
              },

              update: {
                $set: {
                  courseAttendance:
                    correctedCourseAttendance,

                  overallAttendance: {
                    totalDays: overallTotalDays,
                    presentDays: overallPresentDays
                  },

                  updatedAt: new Date()
                }
              }
            }
          });

          updatedRollnos.push(student.rollno);
        }
      }

      // ==========================================
      // EXECUTE BULK UPDATE
      // ==========================================

      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps, {
          ordered: false
        });
      }

      const updatedCount = bulkOps.length;

      totalStudentsUpdated += updatedCount;

      semesterResults[sem].studentsUpdated += updatedCount;

      // ==========================================
      // CONSOLE
      // ==========================================

      console.log(
        `📂 ${collectionName} → Updated: ${updatedCount}`
      );

      if (updatedRollnos.length > 0) {
        console.log(
          `   Rollnos: ${updatedRollnos.join(", ")}`
        );
      }

      // ==========================================
      // COLLECTION RESULT
      // ==========================================

      semesterResults[sem].collectionsData.push({
        batch,
        studentsChecked: students.length,
        updated: updatedCount,
        rollnos: updatedRollnos
      });
    }

    // ==========================================
    // FINAL CONSOLE
    // ==========================================

    console.log("\n======================================");
    console.log("✅ ATTENDANCE SYNC COMPLETED");
    console.log("======================================");

    console.log(
      `Semesters : ${Object.keys(semesterResults).length}`
    );

    console.log(
      `Checked   : ${totalStudentsChecked}`
    );

    console.log(
      `Updated   : ${totalStudentsUpdated}`
    );

    console.log("======================================\n");

    // ==========================================
    // FINAL RESPONSE
    // ==========================================

    return {
      success: true,

      message:
        "Attendance validation and synchronization completed successfully.",

      summary: {
        semestersChecked:
          Object.keys(semesterResults).length,

        collectionsChecked:
          attendanceCollections.length,

        studentsChecked:
          totalStudentsChecked,

        studentsUpdated:
          totalStudentsUpdated
      },

      semesters: semesterResults
    };

  } catch (error) {
    console.error(
      "❌ Attendance Validation Error:",
      error.message
    );

    return {
      success: false,

      message:
        "Attendance validation failed.",

      error: error.message
    };
  }
}

async function validateAttendanceTotals(req, res) {
  try {

    const result =
      await validateAndSyncAttendanceLogs();

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
      message: "Attendance validation failed.",
      error: error.message
    });
  }
}

module.exports = {
  validateAndSyncAttendanceLogs,
  validateAttendanceTotals
};