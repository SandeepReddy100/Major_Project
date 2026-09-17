const mongoose = require("mongoose");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { studentSchema } = require("../models/Student");
const getModel = require("../CommonServices/getModel");

let isRunning = false;

const CONCURRENCY = 10;
const BULK_SIZE = 50;


async function generateAndStoreQrCodes(req, res) {
  if (isRunning) {
    console.log("⚠️ QR Cron already running. Skipping this run.");
    return;
  }

  isRunning = true;

  try {
    console.log("🚀 Starting Global QR Code Generation...");

    const SECRET_KEY = process.env.Attendance_Secret;
    if (!SECRET_KEY) throw new Error("Attendance_Secret env variable missing");

    const allCollections = await mongoose.connection.db
      .listCollections()
      .toArray();

    const targetCollections = allCollections
      .map(c => c.name)
      .filter(name => name.endsWith("-students"));

    if (!targetCollections.length) {
      console.log("⚠️ No student collections found");
      return { updatedCount: 0 };
    }

    console.log(
      `📋 Found ${targetCollections.length} collections:`,
      targetCollections
    );

    let grandTotal = 0;

    for (const collectionName of targetCollections) {
      console.log(`\n📂 Processing Collection: ${collectionName}`);
      const Model = getModel(collectionName, studentSchema);
      if (!Model) continue;

      const count = await processCollection(
        Model,
        SECRET_KEY,
        collectionName
      );
      grandTotal += count;
    }

    console.log(
      `\n🎉 All done! Total students updated: ${grandTotal}`
    );

    if (res)
      return res.status(200).json({
        updatedCount: grandTotal,
        message: "QR codes generated successfully",
      });

    return { updatedCount: grandTotal };
  } catch (err) {
    console.error("❌ Global QR generation failed:", err);
    if (res) return res.status(500).json({ error: err.message });
    throw err;
  } finally {
    isRunning = false; 
  }
}

async function processCollection(Model, secretKey, collectionName) {
  const today = new Date().toISOString().slice(0, 10);

  const students = await Model.find({}, "_id rollno batch sem qrData qrLink").lean();

  if (!students.length) {
    console.log(`  ⚠️ No students in ${collectionName}`);
    return 0;
  }
  let updatedCount = 0;
  let bulkOps = [];

  for (let i = 0; i < students.length; i += CONCURRENCY) {
    const batch = students.slice(i, i + CONCURRENCY);

    for (const student of batch) {
      if (!student._id || !student.rollno) {
        console.log("⚠️ Skipping invalid student:", student);
        continue;
      }
      try {
        const rollno = student.rollno;
        const Studentbatch = student.batch;
        const semname = student.sem;
        const data = `${rollno}:${Studentbatch}:${semname}:${today}:${secretKey}`;
        const hash = crypto
          .createHash("sha256")
          .update(data)
          .digest("hex");

        let qrLink = "";
        try {
          qrLink = await QRCode.toDataURL(
            JSON.stringify({ rollno: student.rollno, hash })
          );
        } catch {
          console.error(`   ⚠️ QR failed for ${student.rollno}`);
        }

        const updateFields = { qrData: hash };

        if (qrLink !== undefined) {
          updateFields.qrLink = qrLink;
        }

        bulkOps.push({
          updateOne: {
            filter: { rollno: student.rollno },
            update: { $set: updateFields }
          },
        });

        if (bulkOps.length === BULK_SIZE) {
          let attempts = 0;
          const MAX_RETRIES = 3;
          let success = false;

          while (attempts < MAX_RETRIES && !success) {
            try {
              attempts++;
              const result = await Model.bulkWrite(bulkOps, { ordered: false });
              updatedCount += result.modifiedCount;
              success = true; 
            } catch (bulkError) {
              console.error(`⚠️ Batch attempt ${attempts} failed:`, bulkError.message);

              if (attempts === MAX_RETRIES) {
                console.error(`❌ Permanently failed batch in ${collectionName}`);
              } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }

          bulkOps = []; 
        }
      } catch (err) {
        console.error(
          `   ❌ Error processing ${student.rollno}:`,
          err.message
        );
      }
    }
  }

  if (bulkOps.length) {
    try {
      const result = await Model.bulkWrite(bulkOps, { ordered: false });
      updatedCount += result.modifiedCount;
    } catch (err) {
      console.error(`❌ Error processing final batch in ${collectionName}:`, err.message);
    }
  }

  console.log(
    `   ✅ Updated ${updatedCount} students in ${collectionName}`
  );
  return updatedCount;
}

module.exports = { generateAndStoreQrCodes };
