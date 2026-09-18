/**
 * Controlled intent classification — deterministic keyword/regex matching,
 * NOT the LLM. The model never decides which data to fetch or produces a
 * query; it only ever sees the JSON this router's chosen tool returns.
 * This is architecture (B) from the Step 7 brief, chosen because it makes
 * "the model cannot bypass the tools" a structural guarantee rather than a
 * prompting convention.
 */

// The most sensitive categories are refused BEFORE the message is ever
// classified or sent anywhere near the model — this is a hard backend gate,
// not something the LLM is merely asked to decline.
const DANGEROUS_PATTERNS = [
  /\bpassword\b/i,
  /\bapi[\s_-]?keys?\b/i,
  /\bsecret\b/i,
  /\benv(ironment)?\s*variables?\b/i,
  /\bsystem\s*prompt\b/i,
  /\bignore\s+(all|your|previous|the above)\s+instructions?\b/i,
  /\bdb\.\w+\.(find|update|delete|remove|aggregate|drop)\b/i,
  /\bmongo(db|se)?\s*(quer|command)/i,
  /\bexecute\b.*\b(query|code|script)\b/i,
  /\beval\s*\(/i,
  /\bnew\s+function\s*\(/i,
  /\b(jwt|json web token)\b/i,
  /\bcredentials?\b/i,
  /\bconnection\s*string\b/i,
  /\bmongodb\+srv/i
];

function detectDangerousRequest(message) {
  return DANGEROUS_PATTERNS.some((re) => re.test(message));
}

const SEM_PATTERN = "(I{1,3}|IV|VI{0,3}|VIII)";

function extractRollno(message) {
  // Real roll numbers in this system look like "25951A05B3" — two digits
  // then 7-9 more alphanumeric characters, always containing both a digit
  // and a letter. This is a heuristic, not a validator; the downstream tool
  // (predictStudent) is the actual source of truth and 404s on a bad guess.
  const candidates = message.match(/\b[0-9]{2}[0-9A-Za-z]{7,9}\b/g) || [];
  for (const c of candidates) {
    if (/[0-9]/.test(c) && /[A-Za-z]/.test(c)) return c.toUpperCase();
  }
  return null;
}

function extractSemBatch(message) {
  const combo = message.match(new RegExp(`\\b${SEM_PATTERN}[\\s/,-]+([A-Za-z]{1,4}[0-9]{1,2})\\b`, "i"));
  if (combo) return { sem: combo[1].toUpperCase(), batch: combo[2].toUpperCase() };

  let sem = null;
  let batch = null;
  const semMatch = message.match(new RegExp(`\\bsem(?:ester)?\\s*[:#-]?\\s*${SEM_PATTERN}\\b`, "i"));
  if (semMatch) sem = semMatch[1].toUpperCase();
  const batchMatch = message.match(/\bbatch\s*[:#-]?\s*([A-Za-z]{1,4}[0-9]{1,2})\b/i);
  if (batchMatch) batch = batchMatch[1].toUpperCase();
  return { sem, batch };
}

function classifyIntent(message) {
  const text = message.toLowerCase();
  const rollno = extractRollno(message);
  const { sem, batch } = extractSemBatch(message);

  const mentionsRisk = /\brisk\b/.test(text);
  const mentionsTrend = /\btrend|declin|improv|project(ed|ion)?\b/.test(text);
  const mentionsLow = /\blow attendance\b|\bbelow\s*\d{1,3}\s*%?|\bunder\s*\d{1,3}\s*%?/.test(text);
  const mentionsSummary = /\bsummary\b|\boverview\b|\bhow many\b|\bhow is\b/.test(text);
  const mentionsCourse = /\bcourse/.test(text);
  const mentionsAction = /\bwhat should\b|\brecommend/.test(text) || /\bdo about\b/.test(text);
  const mentionsAttendance = /\battendance\b/.test(text);
  const mentionsExplain = /\bwhat does\b|\bwhat is\b.*\bmean\b|\bexplain\b|\bhow does\b.*\bwork\b/.test(text);

  if (rollno) {
    if (mentionsTrend) return { intent: "STUDENT_TREND", rollno, sem, batch };
    if (mentionsAction) return { intent: "STUDENT_ACTION", rollno, sem, batch };
    return { intent: "STUDENT_RISK", rollno, sem, batch };
  }

  if (mentionsExplain && !mentionsRisk && !mentionsTrend && !mentionsAttendance) {
    return { intent: "GENERAL_EXPLANATION", sem, batch };
  }

  if (mentionsCourse && mentionsAttendance) return { intent: "COURSE_LOW_ATTENDANCE", sem, batch };
  if (mentionsLow) return { intent: "LOW_ATTENDANCE", sem, batch };
  if (mentionsAction) return { intent: "BATCH_ACTION", sem, batch };
  if (mentionsTrend) return { intent: "BATCH_TREND", sem, batch };
  if (mentionsRisk) return { intent: "BATCH_RISK", sem, batch };
  if (mentionsAttendance && (mentionsSummary || sem || batch)) return { intent: "ATTENDANCE_SUMMARY", sem, batch };
  if (mentionsExplain) return { intent: "GENERAL_EXPLANATION", sem, batch };

  return { intent: "UNSUPPORTED", sem, batch };
}

module.exports = { classifyIntent, detectDangerousRequest, extractRollno, extractSemBatch };
