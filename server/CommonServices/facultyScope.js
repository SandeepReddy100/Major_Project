const Faculty = require("../models/faculty");

/**
 * Parses batches_assigned ("SEM:BATCH") and subjects_assigned ("SEM,BATCH:COURSE")
 * into a deduplicated list of { sem, batch } pairs a faculty member may access.
 *
 * This mirrors the parsing already duplicated in controllers/Faculty.js
 * (getDashboardData and getFacultyTimeTable both inline the same logic).
 * It is re-implemented here, rather than imported from there, so the new
 * analytics layer does not depend on — or risk destabilising — that existing,
 * working controller.
 */
function parseAssignedScope(faculty) {
  const rawBatches = new Set();

  if (faculty.batches_assigned) {
    faculty.batches_assigned.forEach(entry => {
      const parts = String(entry).split(":");
      if (parts.length === 2) {
        rawBatches.add(JSON.stringify({ sem: parts[0].trim(), batch: parts[1].trim() }));
      }
    });
  }

  if (faculty.subjects_assigned) {
    faculty.subjects_assigned.forEach(entry => {
      const prefix = String(entry).split(":")[0];
      if (prefix) {
        const parts = prefix.split(",");
        if (parts.length === 2) {
          rawBatches.add(JSON.stringify({ sem: parts[0].trim(), batch: parts[1].trim() }));
        }
      }
    });
  }

  return Array.from(rawBatches).map(item => JSON.parse(item));
}

/** @returns {Promise<Array<{sem,batch}>|null>} null if the faculty document doesn't exist */
async function getFacultyScope(facultyid) {
  if (!facultyid) return null;

  const faculty = await Faculty.findOne({
    facultyid: new RegExp(`^${facultyid}$`, "i")
  }).select("facultyid batches_assigned subjects_assigned").lean();

  if (!faculty) return null;
  return parseAssignedScope(faculty);
}

const norm = v => String(v || "").trim().toLowerCase();

/**
 * Whether the authenticated user (req.user: { role, userId, sem, batch })
 * may access the given semester/batch. This is the single authorization
 * gate the analytics controller must call before touching the prediction
 * service — the ML layer itself has no notion of who is asking.
 */
async function canAccessBatch(user, sem, batch) {
  if (!user || !sem || !batch) return false;

  if (user.role === "admin") return true;

  if (user.role === "faculty") {
    const scope = await getFacultyScope(user.userId);
    if (!scope) return false;
    return scope.some(s => norm(s.sem) === norm(sem) && norm(s.batch) === norm(batch));
  }

  if (user.role === "student") {
    return norm(user.sem) === norm(sem) && norm(user.batch) === norm(batch);
  }

  return false;
}

/**
 * Faculty/admin access to one specific student's prediction is governed by
 * batch scope: anyone allowed to see the batch-risk list may look up any
 * student inside it, at the same granularity as the batch-risk endpoint.
 */
async function canAccessStudent(user, sem, batch) {
  return canAccessBatch(user, sem, batch);
}

module.exports = { getFacultyScope, canAccessBatch, canAccessStudent };
