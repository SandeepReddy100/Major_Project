/**
 * Defensive normalisation helpers.
 * dailyLogs.date is a String in attendance.model.js and is written by
 * several controllers with no shared format. Never parse it inline.
 */

function normalizeDate(raw) {
  if (raw === null || raw === undefined) return null;

  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw.toISOString().slice(0, 10);
  }

  const s = String(raw).trim();
  if (!s) return null;

  // 2025-09-18  /  2025-09-18T10:00:00.000Z
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // 18-09-2025  /  18/09/2025   (DD first)
  m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // 2025/09/18
  m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normalizeCourse(raw) {
  return String(raw || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return null;
  return s.startsWith("p") ? "present" : "absent";
}

function daysBetween(isoA, isoB) {
  const a = new Date(`${isoA}T00:00:00Z`).getTime();
  const b = new Date(`${isoB}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function pct(present, total) {
  if (!total) return null;
  return Math.round((present / total) * 1000) / 10;
}

/** Clean a raw attendance doc into normalised, chronologically sorted logs. */
function cleanLogs(dailyLogs) {
  const clean = [];
  let unparseable = 0;

  for (const log of dailyLogs || []) {
    const date = normalizeDate(log.date);
    const status = normalizeStatus(log.status);
    if (!date || !status) {
      unparseable += 1;
      continue;
    }
    clean.push({ date, status, course: normalizeCourse(log.course), rawCourse: log.course });
  }

  clean.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { logs: clean, unparseable };
}

module.exports = {
  normalizeDate, normalizeCourse, normalizeStatus,
  daysBetween, addDays, pct, cleanLogs
};