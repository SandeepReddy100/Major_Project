const mongoose = require('mongoose');

async function syncAttendanceTotals() {
  try {
    console.log("hi");
    const db = mongoose.connection.db;
    
    // Get all collections in the database
    const collections = await db.listCollections().toArray();
    
    // Filter only collections that end with "attendance-<batch>"
    const attendanceCollections = collections.filter(col => 
      col.name.includes('-SEM-attendance-')
    );

    if (attendanceCollections.length === 0) {
      console.log("⚠️ No attendance collections found.");
      return; // Changed process.exit(0) to return
    }

    console.log(`🔍 Found ${attendanceCollections.length} attendance collections to process.`);

    // Loop through each attendance collection
    for (const collectionInfo of attendanceCollections) {
      const collectionName = collectionInfo.name;
      console.log(`\n📂 Processing Collection: ${collectionName}`);
      
      const collection = db.collection(collectionName);
      const docs = await collection.find({}).toArray();
      
      if (docs.length === 0) {
        console.log("   -> Empty collection, skipping.");
        continue;
      }

      const bulkOps = [];

      // Process each student document
      for (const doc of docs) {
        const logs = doc.dailyLogs || [];
        
        // Recalculated counters
        const newOverall = { totalDays: 0, presentDays: 0 };
        const newCourseAttendance = {};

        // Iterate through logs to build the true source of truth
        for (const log of logs) {
          const course = log.course;
          const status = log.status; // "present" or "absent"

          // 1. Overall Attendance
          newOverall.totalDays += 1;
          if (status === 'present') {
            newOverall.presentDays += 1;
          }

          // 2. Course Attendance
          if (!newCourseAttendance[course]) {
            newCourseAttendance[course] = { totalDays: 0, presentDays: 0 };
          }
          
          newCourseAttendance[course].totalDays += 1;
          if (status === 'present') {
            newCourseAttendance[course].presentDays += 1;
          }
        }

        // Prepare the bulk write operation for this student
        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                overallAttendance: newOverall,
                courseAttendance: newCourseAttendance,
                lastUpdated: new Date()
              }
            }
          }
        });
      }

      // Execute bulk updates for the collection
      if (bulkOps.length > 0) {
        const result = await collection.bulkWrite(bulkOps, { ordered: false });
        console.log(`   ✅ Synced ${result.modifiedCount} student records.`);
      }
    }

    console.log("\n🎉 All attendance records have been successfully synchronized!");

  } catch (error) {
    console.error("❌ An error occurred during synchronization:", error);
  }
  // REMOVED THE FINALLY BLOCK ENTIRELY
}

module.exports = {
    syncAttendanceTotals
}