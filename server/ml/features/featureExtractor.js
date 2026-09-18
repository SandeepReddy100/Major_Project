const mongoose = require("mongoose");
const getModel = require("../../CommonServices/getModel");
const { attendanceSchema } = require("../../models/attendance.model");
const { computeFeatures } = require("./attendanceFeatures");
const { normalizeDate } = require("./dateUtils");

const collectionFor = (semname, batch) =>
  `${String(semname).trim()}-SEM-attendance-${String(batch).trim().replace(/[^a-zA-Z0-9]/g, "")}`;

async function collectionExists(name) {
  const found = await mongoose.connection.db.listCollections({ name }).toArray();
  return found.length > 0;
}

/** Latest normalised log date across every student in the batch. */
function batchReferenceDate(docs) {
  let max = null;
  for (const doc of docs) {
    for (const log of doc.dailyLogs || []) {
      const d = normalizeDate(log.date);
      if (d && (!max || d > max)) max = d;
    }
  }
  return max;
}

async function extractForBatch(semname, batch, asOfDate = null) {
  const name = collectionFor(semname, batch);

  if (!(await collectionExists(name))) {
    const err = new Error(`Attendance collection not found for ${semname} / ${batch}`);
    err.statusCode = 404;
    throw err;
  }

  const Attendance = getModel(name, attendanceSchema);
  const docs = await Attendance.find({}, { rollno: 1, name: 1, branch: 1, batch: 1, dailyLogs: 1 }).lean();
  const referenceDate = batchReferenceDate(docs);

  return docs.map(doc => {
    const computed = computeFeatures(doc.dailyLogs, asOfDate, referenceDate);
    return {
      rollno: doc.rollno,
      name: doc.name,
      branch: doc.branch,
      batch: doc.batch || batch,
      sem: semname,
      ...computed
    };
  });
}

async function extractForStudent(semname, batch, rollno, asOfDate = null) {
  const name = collectionFor(semname, batch);

  if (!(await collectionExists(name))) {
    const err = new Error(`Attendance collection not found for ${semname} / ${batch}`);
    err.statusCode = 404;
    throw err;
  }

  const Attendance = getModel(name, attendanceSchema);

  // Load just the dates for the whole batch to derive a consistent reference
  // date, so a single student's score doesn't depend on their own last log.
  const batchDocs = await Attendance.find({}, { "dailyLogs.date": 1 }).lean();
  const referenceDate = batchReferenceDate(batchDocs);

  const doc = await Attendance.findOne(
    { rollno: new RegExp(`^${rollno}$`, "i") },
    { rollno: 1, name: 1, branch: 1, batch: 1, dailyLogs: 1 }
  ).lean();

  if (!doc) {
    const err = new Error(`No attendance record for ${rollno} in ${semname} / ${batch}`);
    err.statusCode = 404;
    throw err;
  }

  return {
    rollno: doc.rollno,
    name: doc.name,
    branch: doc.branch,
    batch: doc.batch || batch,
    sem: semname,
    ...computeFeatures(doc.dailyLogs, asOfDate, referenceDate)
  };
}

module.exports = { extractForBatch, extractForStudent, collectionFor, batchReferenceDate };