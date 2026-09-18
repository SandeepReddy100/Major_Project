
# HANDOFF.md — AI-Based At-Risk Student Prediction

**Project root:** `D:\Projects\MAJOR_PROJECT-01`
**Handoff written:** 2026-09-17
**Prepared for:** a Claude Code instance with direct filesystem access to the repo.

> **How to read this document.** Everything stated as fact was either read directly from the repository source or printed by a command the user actually ran. Anything inferred, estimated, or unverified is explicitly marked **[UNVERIFIED]** or **[ASSUMPTION]**. Do not treat unmarked claims as guesses, and do not treat marked ones as settled.

---

## 1. Project overview

### The existing system

A MERN-based college Academic / Attendance Management Platform, already in production (CORS allowlist includes `https://cdciare.in` and several Vercel deployments). It covers:

- Student, faculty, semester and batch management
- Attendance management (QR-based, multi-batch QR, and manual/fail-safe)
- Course-wise attendance
- Timetable management
- Coding leaderboard (LeetCode / GFG / CodeChef scraped scores)
- Announcements
- Role-based access (student / faculty / admin)
- PDF and Excel report generation

### The feature being added

**AI-Based At-Risk Student Prediction.** The goal is to identify students likely to become academically at risk from historical and current attendance/engagement data, and surface that to faculty and admins as an *explainable decision-support signal*.

The explicit requirement is that this must **not** be a static `attendance < 75% = at risk` rule, and must **not** be a mock or hard-coded score. It must be a real feature-engineering plus modelling pipeline operating on the real database.

---

## 2. Current state

### Completed and verified working

| Step        | Description                                        | Status                                       |
| ----------- | -------------------------------------------------- | -------------------------------------------- |
| **0** | Full read-only audit of backend + frontend source  | Done                                         |
| **1** | Data audit script (`server/ml/`)                 | **Written, run, output captured**      |
| **2** | Feature engineering layer                          | **Written, smoke-tested successfully** |
| **3** | Prediction / explanation / recommendation services | **Written, smoke-tested successfully** |

### Provided but application NOT confirmed

The user was given the following code but **never confirmed writing it to disk or running it**. Claude Code must verify whether these files exist and match before proceeding.

| Item                          | Files                                                                                                                                                                   | Status                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Recalibration patch** | `ml/models/scorer/baselineScorer.js` (WEIGHTS block), `ml/features/attendanceFeatures.js` (3 functions), `ml/features/featureExtractor.js` (batch reference date) | **[UNVERIFIED]** — provided in chat, not confirmed applied           |
| **Step 4 — API layer** | `CommonServices/facultyScope.js`, `controllers/Analytics.js`, `routes/Analytics.js`, 2 lines in `app.js`                                                        | **[UNVERIFIED]** — provided in chat, not confirmed applied or tested |

### Not started

- **Step 5** — Frontend (`AtRiskStudentsPage.jsx`, route registration, dashboard entry cards)
- **Step 6** — Dataset builder + Python trainer + JSON model export
- **Step 7** — Supervised scorer swap + evaluation metrics endpoint

Steps 6 and 7 are **blocked on data volume**, not on engineering. See §6.

---

## 3. Audit results (real, captured output)

Run on the live database via `node ml/runAudit.js`:

```
================ RISK DATA AUDIT ================
Attendance collections : 31
Students               : 3515 (3514 with logs)
Total dailyLogs        : 61361
Unparseable dates      : 0
Counter mismatches     : 1487
Max date span (days)   : 57
------------------------------------------------
Training rows          : 2437
Positive labels        : 2159 (88.6%)
Rolling cutoffs        : 3
------------------------------------------------
enoughRows      : true
balancedClasses : false
enoughCutoffs   : false
enoughSpan      : true
VERDICT: USE_TRANSPARENT_BASELINE
================================================
```

Full JSON report: `server/ml/reports/audit-2026-09-17.json` (gitignored).

### Interpretation (this drove every subsequent decision)

1. **Dates are clean.** `Unparseable dates: 0` despite `dailyLogs.date` being an unconstrained `String` written by four different controllers.
2. **Data is sparse, not short.** 61,361 logs ÷ 3,514 students ≈ **17.5 sessions per student** across a 57-day span, i.e. roughly **2 sessions per student per week**. Calendar-based rolling windows (7-day, 14-day) are therefore mostly empty or single-sample, and were abandoned.
3. **The 88.6% positive rate is a label artifact, not reality.** The 14-day future window contained only 3–5 sessions for most students. A student missing 1 of 3 sessions scores 66.7%, falls below the 75% threshold, and is labelled at-risk. Small denominators manufactured positives.
4. **1,487 of 3,515 student documents (42%) have stored attendance counters that disagree with their own `dailyLogs`.** This is a pre-existing production bug (see §8) and means **existing dashboards display incorrect attendance percentages for ~42% of students**.
5. **Only 3 rolling cutoffs** is arithmetic: 57-day span − 21-day minimum history − 14-day label window = 22 usable days = 3 weekly cutoffs.

### Smoke test output (real, captured)

`predictBatch('III', 'SU1')` returned:

```
{ HIGH: 26, MEDIUM: 21, LOW: 63, INSUFFICIENT_DATA: 1 }   // 111 students total
```

Roughly 23% HIGH / 57% LOW — a credible distribution, and radically different from the 88.6% the naive label produced. Factor sentences and per-course attribution rendered correctly.

**Two defects were identified in that output:**

- **Probability saturation.** Both inspected students returned exactly `0.993`. Contributions were hitting `weight × clip` on nearly every term, driving the pre-temperature sum to ~6.6. Root cause is partly collinearity — `overallPct`, `recentPct`, `shortPct` and `calendarPct` all measure the same underlying quantity, so the same evidence was counted four times. Since the UI sorts by probability, this would produce ties across most of the HIGH bucket.
- **`daysSinceLastPresent` measured against the student's own last log**, not the batch's. One student showed `0` despite 47% attendance. A student who stopped appearing in the register entirely would also show `0`, which is inverted.

The recalibration patch in §4.3 addresses both. **It has not been verified as applied or re-run.**

---

## 4. What we changed / implementation decisions

### 4.1 New directory structure created

```
server/ml/
├── config/
│   └── riskConfig.js
├── features/
│   ├── dateUtils.js
│   ├── attendanceFeatures.js
│   └── featureExtractor.js
├── dataset/
│   └── auditData.js
├── models/
│   ├── scorer/
│   │   └── baselineScorer.js
│   └── artifacts/            (empty — will hold exported model JSON in Step 6)
├── services/
│   ├── predictionService.js
│   ├── explanationService.js
│   └── recommendationService.js
├── training/                 (empty — Python trainer goes here in Step 6)
├── reports/                  (gitignored — audit JSON output)
└── runAudit.js
```

Plus (Step 4, **[UNVERIFIED]** as applied):

```
server/CommonServices/facultyScope.js
server/controllers/Analytics.js
server/routes/Analytics.js
```

### 4.2 Key implementation decisions

**Never read the stored attendance counters.** `overallAttendance` and `courseAttendance` are ignored everywhere in the ML code. All percentages are recomputed from `dailyLogs`. Driven by the 42% mismatch finding. The audit script uses the **raw MongoDB driver** (not Mongoose models) specifically to avoid Map casting and schema coupling.

**Session-count windows replaced calendar windows.** After the sparsity finding:

- Primary: last **10** sessions (`recentPct`), last **5** sessions (`shortPct`)
- Secondary and nullable: 30-day calendar window (`calendarPct`), returns `null` if fewer than 3 logs fall inside
- The 7-day window was **deleted entirely** as pure noise at ~2 sessions/week

**`minLogsForPrediction` lowered from 15 to 8**, replaced with a `confidence` tier (`high` ≥20 sessions, `medium` ≥12, `low` below). At a median of ~17 logs, a threshold of 15 would have excluded close to half the student body. Students below 8 sessions return `riskLevel: "INSUFFICIENT_DATA"` with `riskProbability: null`.

**All date/course/status parsing funnels through `ml/features/dateUtils.js`.** It handles `YYYY-MM-DD`, ISO timestamps, `DD-MM-YYYY`, `DD/MM/YYYY`, `YYYY/MM/DD`, and `Date` objects. `normalizeCourse` lowercases and collapses whitespace. `normalizeStatus` maps anything starting with `p` to `present`.

**Leakage-free by construction.** `computeFeatures(dailyLogs, asOfDate, referenceDate)` filters to `date <= asOfDate` before computing anything. The label (Step 6) will come strictly from `(t, t+Δ]`. This signature already exists so Step 6 needs no refactor.

**Collinear features were down-weighted, not removed.** `shortPct`, `calendarPct`, `absencesInRecent` and `daysSinceLastPresent` retain small weights so they still contribute to explanations, while the primary signals dominate the score.

**Faculty scope parsing was extracted to a NEW file, not refactored in place.** `controllers/Faculty.js` contains two copies of the `batches_assigned` / `subjects_assigned` parsing logic. Rather than modify working production code, `CommonServices/facultyScope.js` was created as a third, clean implementation used only by the new analytics layer. **`controllers/Faculty.js` was not touched.**

**Students never see a probability.** `GET /api/analytics/my-risk` returns `status` (the level) plus factors and recommendations, but deliberately omits `riskProbability`.

**Route mount order matters.** `app.use("/api/analytics", analyticsRoutes)` must be registered **above** `app.use("/api", commonRoutes)`, because the common router is mounted at the bare `/api` prefix and would otherwise shadow it.

### 4.3 Recalibration patch (provided, **[UNVERIFIED]** as applied)

Changes to `baselineScorer.js` WEIGHTS:

- `intercept`: `-0.9` → `-1.5`
- `temperature`: `2.2` → `3.0`
- `clip`: `2.5` → `2.0`
- Primary weights: `overallPct -0.90`, `recentPct -1.00`, `trendDelta -0.70`, `lowCourseRatio +0.60`, `consecutiveAbsences +0.70`
- Down-weighted collinear: `shortPct -0.35`, `calendarPct -0.30`, `absencesInRecent +0.35`, `daysSinceLastPresent +0.40`
- Probability precision raised to 4 decimal places for stable sorting

Changes to `attendanceFeatures.js`:

- `daysSinceLastPresent(logs, refDate)` — now takes a batch-level reference date
- `calendarWindowPct(logs, refDate)` — same
- `computeFeatures(dailyLogs, asOfDate, referenceDate)` — third parameter added; `ref = asOfDate || referenceDate || last log date`; `referenceDate: ref` added to returned `meta`

Changes to `featureExtractor.js`:

- New `batchReferenceDate(docs)` helper returning the latest log date across the whole batch
- `extractForBatch` computes it once and passes it to every student
- `extractForStudent` loads `{ dailyLogs: { date: 1 } }` for the whole batch to derive the reference date before scoring the single student
- Added to module exports

**[UNVERIFIED] Predicted post-patch values** (hand-calculated, never executed): the two sample students should land at ~`0.883` and ~`0.868` (distinct and correctly ordered), a healthy student ~`0.17`, and a student sitting exactly at 75% ~`0.40` — on the MEDIUM boundary. **These numbers must be confirmed by actually running the smoke test.**

---

## 5. Files and architecture

### 5.1 Backend — existing (read, not modified)

**Entry point:** `server/app.js`

Route mounts (order as found):

```
/api/admin    → routes/Admin.js        (verifyAccess + authorize("admin"))
/api/auth     → routes/Login.js        (public)
/api/student  → routes/Student.js      (verifyAccess + authorize("student"))
/api/faculty  → routes/Faculty.js      (verifyAccess + authorize("faculty"))
/api          → routes/CommonRoutes.js (verifyAccess, then authorize("faculty","admin") midway)
```

**Auth:** `server/middleware/auth.js`

- `verifyAccess` reads JWT from `Authorization: Bearer <token>` **or** the `webToken` cookie
- Sets `req.user = { id, role, userId, sem, batch }`
- `authorize(...allowedRoles)` is a simple whitelist
- Roles are assigned in `controllers/Login.js` by username prefix: `2*` → `student`, `iare*` → `faculty`, `cdc*` → `admin`
- **There is no SuperAdmin or Sector Admin role in the codebase** despite the original spec mentioning them

**Dynamic model factory:** `server/CommonServices/getModel.js` — collections are created per semester and per batch, so models are resolved by name at request time.

### 5.2 Database collections

| Collection                       | Source schema                                         | Notes                                                       |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| `{SEM}-SEM-students`           | `models/student.js` (`studentSchema`)             | e.g.`III-SEM-students`                                    |
| `{SEM}-SEM-attendance-{BATCH}` | `models/attendance.model.js` (`attendanceSchema`) | e.g.`III-SEM-attendance-SU1`; **31 of these exist** |
| `leaderboard`                  | `models/coding.js` (model name `Coder`)           | Global, not per-semester                                    |
| `timetables`                   | `models/timetable.js`                               |                                                             |
| `academic_metadata`            | `models/metadata.js`                                | Authoritative sem → batches → courses map                 |
| `announcements`                | `models/Announcement.js`                            |                                                             |
| (backup)                         | `models/BackUp`                                     | `BackupAttendance`, FN/AN rollno lists only               |

**`attendanceSchema` (the ML data source):**

```js
{
  rollno: String (unique, indexed),
  name: String,
  branch: String,
  batch: String,
  overallAttendance: { totalDays: Number, presentDays: Number },   // DO NOT TRUST — 42% wrong
  courseAttendance: Map<String, { totalDays: Number, presentDays: Number }>,  // DO NOT TRUST
  dailyLogs: [ { date: String, course: String, status: 'present'|'absent' } ],  // SOURCE OF TRUTH
  timestamps: true
}
```

**`studentSchema`:**

```js
{ name, rollno (unique, indexed), password, branch, batch, sem, email, qrData, qrLink, timestamps }
```

**`codingSchema` (Coder → `leaderboard`):**

```js
{ rollno, name, branch, batch, handles: Map<String,String>, sem,
  scores: Map<String,Number>, totalScore: Number, lastUpdated: Date }
```

**Snapshot only — no history.** Overwritten in place by `workflows/Scores.js`.

**`timeTableSchema`:**

```js
{ sem, batch, weekSchedule: [ { day, periods: [ { startTime, endTime, session(FN/AN),
  subject, faculty: [{ id, name }], roomNo } ] } ] }
```

**`AcademicMetadataSchema`:**

```js
{ semesterName (unique), batches: [{ batchName, courses: [String] }], isActive }
```

**Faculty assignment encoding** (`models/faculty.js`, used for scoping):

- `batches_assigned`: `["VI:SU1", ...]` → `SEM:BATCH`
- `subjects_assigned`: `["VI,SN1:CSM601", ...]` → `SEM,BATCH:COURSECODE`

### 5.3 Attendance write paths (must not be broken)

| Endpoint                                      | Handler                                 | File                               |
| --------------------------------------------- | --------------------------------------- | ---------------------------------- |
| `POST /api/attendance-mark-qr`              | `HandleMarkAttendanceByQR`            | `CommonServices/CommonRoutes.js` |
| `POST /api/attendance-mark-multiple-qr`     | `HandleMarkAttendanceMultipleBatches` | `CommonServices/CommonRoutes.js` |
| `POST /api/attendance-session-post`         | `HandleSessionPostAttendance`         | `CommonServices/CommonRoutes.js` |
| `PATCH /api/admin/handle-update-attendance` | `HandleUpdateAttendance`              | `controllers/Admin.js`           |
| `DELETE /api/admin/delete-attendance-log`   | `deleteAttendanceLog`                 | `controllers/Admin.js`           |

**None of these were modified.**

### 5.4 New API design (Step 4, **[UNVERIFIED]** as applied)

All under `server/routes/Analytics.js`, mounted at `/api/analytics`, `router.use(verifyAccess)` then per-route `authorize`.

| Method | Path                                      | Roles          | Query / Params                           |
| ------ | ----------------------------------------- | -------------- | ---------------------------------------- |
| GET    | `/api/analytics/batch-risk`             | faculty, admin | `?semname=&batch=&level=`              |
| GET    | `/api/analytics/student-risk/:rollno`   | faculty, admin | `?semname=&batch=`                     |
| GET    | `/api/analytics/semester-risk/:semname` | admin          | `?level=`                              |
| GET    | `/api/analytics/my-risk`                | student        | (uses token`sem`/`batch`/`userId`) |
| GET    | `/api/analytics/model-info`             | faculty, admin | —                                       |

Faculty requests to `batch-risk` and `student-risk` are gated by `assertFacultyCanAccess()` which throws 403 if the faculty member is not assigned to that sem+batch.

**Response envelope** (follows the `{ success, data }` shape used by `getLeaderBoardData` and the admin dashboard):

```json
{
  "success": true,
  "data": { ... },
  "model": { "version": "heuristic-baseline-v0", "trained": false, "type": "heuristic-logistic" },
  "disclaimer": "Decision-support signal based on recorded attendance patterns. Not a prediction of academic outcome. Review the underlying attendance log before acting."
}
```

**Per-student `data` shape** (real captured example, pre-recalibration):

```json
{
  "rollno": "25951A05B3", "name": "MAGGIDI KANNAIAH", "branch": "CSE",
  "batch": "SU1", "sem": "III",
  "currentAttendance": 41.2, "totalSessions": 17, "attended": 7, "missed": 10,
  "confidence": "medium",
  "modelVersion": "heuristic-baseline-v0",
  "computedAt": "2026-09-17T19:47:53.665Z",
  "riskLevel": "HIGH", "riskProbability": 0.993,
  "modelType": "heuristic-logistic", "trained": false,
  "factors": [ { "factor": "Recent attendance",
                 "detail": "Attendance in the last 10 sessions is 40%.",
                 "impact": "high", "contribution": 3.25 } ],
  "recommendations": [ "Attendance is below the 75% threshold. ..." ],
  "features": { "overallPct": 41.2, "recentPct": 40, "shortPct": 60,
                "calendarPct": 40, "trendDelta": -16.7, "consecutiveAbsences": 1,
                "absencesInRecent": 6, "lowCourseRatio": 1, "daysSinceLastPresent": 1 },
  "lowCourses": [ { "course": "advance_java", "pct": 40, "total": 5 } ]
}
```

**Batch response adds:** `{ sem, batch, total, summary: { HIGH, MEDIUM, LOW, INSUFFICIENT_DATA }, students: [...] }`, sorted HIGH → MEDIUM → LOW → INSUFFICIENT_DATA, then by descending probability.

### 5.5 Frontend — existing (read, not modified)

**Stack:** Vite 7, React 19.1, Tailwind v4, `react-router-dom` 6.30

**Key deps:** `lucide-react`, `recharts`, `framer-motion`, `axios`, `crypto-js`, `date-fns`, `clsx`, `tailwind-merge`, `html5-qrcode`, `react-markdown`, `@monaco-editor/react`

**API client:** `client/src/api/axiosConfig.js` exports `api` — axios instance with `baseURL: import.meta.env.VITE_BASE_URL`, `withCredentials: true`, and a response interceptor dispatching `app-network-error` / `app-server-error` window events.

> **Note:** many existing pages bypass this and use raw `fetch(\`${backendUrl}/api/...\`, { credentials: "include" })`. New code should use the `api` instance.

**Auth context:** `client/src/context/AuthContext.jsx`

- `useAuth()` → `{ user, login, logout, loading }`
- `user = { userId, username, role, sem, batch }`
- Session check hits `GET /api/me`, response is AES-decrypted via `crypto-js` with `VITE_ENC_KEY`

**Routing:** `client/src/App.jsx` — all pages lazy-loaded; guards are `<ProtectedRoute allowedRoles={['admin','faculty']} />` or `<ProtectedRoute requiredRole="admin" />`; `SessionGuard` wraps everything protected; `NetworkGuard` wraps specific routes.

**Design system observed:**

- Page body: `bg-gray-50`, `text-gray-800 font-sans`
- Header block: `bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225]`, `rounded-bl-[1.5rem] rounded-br-[1.5rem] sm:rounded-bl-[2rem]`, `shadow-2xl`
- Shared components: `components/Header` (takes `animate` prop), `components/Loader`, `components/ProtectedRoute`, `components/ErrorPage`
- Cards: `rounded-xl lg:rounded-2xl p-4 shadow-lg border border-white/20`, hover `-translate-y-1`
- Entry animation pattern: `const [animate, setAnimate] = useState(false)` + `setTimeout(() => setAnimate(true), 100)`, staggered via `style={{ transitionDelay: \`${300 + index * 100}ms\` }}`
- Selects: `bg-[#0F172A] border border-blue-500/30 rounded-xl text-white appearance-none focus:border-blue-500`
- Icons from `lucide-react`, sized `w-4 h-4` / `size={16}`

**Template to clone for the new page:** `client/src/pages/CommonPages/ViewAttendancePage.jsx` — shared admin+faculty, semester/batch filters, pagination.

**Batch list source:** `GET /api/get-sem-info/:semname` → `responseData.data.batches`

**Semester list:** hard-coded in several pages as `["I","II","III","IV","V","VI","VII","VIII"]`

---

## 6. Requirements and constraints

### Hard constraints from the user (must not be violated)

- **Do NOT create a separate demo application.** Integrate into the existing system.
- **Do NOT replace the existing architecture.**
- **Do NOT rewrite existing modules unnecessarily.**
- **Preserve existing APIs, authentication, and authorization.**
- **Do not break attendance recording.**
- **Do not modify existing attendance data unnecessarily.**
- **Reuse existing attendance logic; avoid duplicate business logic.**
- **Follow existing API naming conventions** (kebab-case paths) **and the existing frontend design system.** Do not redesign the application.
- **Add database changes only if genuinely necessary.** (None have been made.)

### ML-specific requirements

- **Must be a real ML/feature pipeline, not a mock or hard-coded risk score.**
- **Do NOT fabricate historical training data.** If there is insufficient labelled data, say so clearly and implement a responsible fallback.
- **Do NOT make unsupported accuracy claims** (e.g. "99% accurate").
- **Avoid data leakage.** Features must only use information available at prediction time. Prefer chronological over random train/test splits.
- **Explainability is very important.** Faculty must understand *why* a student was flagged.
- **Recall on the at-risk class matters most** — missing genuinely at-risk students is the costly error.
- **Responsible framing.** Never "this student will fail." Always "high predicted risk based on current historical patterns." UI must make clear faculty can review the underlying data.
- Only use features that actually exist in the database.

### User's working style

The user explicitly asked to **move fast** and wants **step-by-step instructions including shell commands** (`mkdir`, `touch`) for any file creation.

---

## 7. Decisions made — and rejected

### Accepted

| Decision                                                                                 | Rationale                                                                 |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Recompute all attendance from`dailyLogs`; ignore stored counters                       | 42% of documents have counters disagreeing with their own logs            |
| Session-count windows (last 10, last 5) as primary features                              | ~2 sessions/student/week makes calendar windows single-sample noise       |
| 30-day calendar window kept but nullable and down-weighted                               | Still informative when populated; returns`null` below 3 logs            |
| `minLogsForPrediction = 8` + `confidence` tiers                                      | Median ~17 logs/student; a threshold of 15 would exclude ~half the cohort |
| Transparent prior-weighted logistic scorer with`trained: false`                        | Audit verdict; see rejection below                                        |
| Label = future window`(t, t+Δ]`, features `≤ t`, chronological split               | Leakage prevention, as required                                           |
| Offline Python training → export model as plain JSON → dependency-free Node scorer     | Keeps production Node-only; no new runtime                                |
| New`CommonServices/facultyScope.js` rather than refactoring `controllers/Faculty.js` | Avoids touching working production code                                   |
| Students see`status` but never `riskProbability`                                     | Responsible-prediction requirement                                        |
| Raw MongoDB driver in the audit script                                                   | Avoids Mongoose Map casting and schema coupling                           |
| Down-weight collinear features rather than drop them                                     | They still carry explanatory value for faculty                            |

### Rejected (and why — do not silently reverse these)

| Rejected approach                                               | Why                                                                                                                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Training a supervised model now**                       | 88.6% positive rate means a majority-class predictor scores 88.6% accuracy while being useless. Would directly violate the "no unsupported claims" requirement. |
| **Fabricating or synthesising training data**             | Explicitly forbidden by the user.                                                                                                                               |
| **7-day rolling calendar window**                         | At ~2 sessions/week it is pure noise — one absence yields 0%. Deleted entirely.                                                                                |
| **Trusting `overallAttendance` / `courseAttendance`** | 1,487/3,515 documents are wrong.                                                                                                                                |
| **`onnxruntime-node` for model inference**              | Heavy native binary added to a deployment that is currently pure JS.                                                                                            |
| **Adding a Python service to production**                 | Stack is Node-only; training stays offline.                                                                                                                     |
| **Using SHAP**                                            | Unnecessary dependency. A logistic form gives signed per-feature contributions for free.                                                                        |
| **Silently fixing the `presentDays` bug**               | User said to flag conflicts before changing existing working code. Flagged, not fixed.                                                                          |
| **Modifying `controllers/Faculty.js`**                  | Working code; new helper created instead.                                                                                                                       |

---

## 8. Known bugs and issues

### Pre-existing production bugs (found during audit, NOT fixed — need user's decision)

**BUG-1 — `courseAttendance.presentDays` never increments on the multi-batch QR path.**
File: `server/CommonServices/CommonRoutes.js`, in `HandleMarkAttendanceMultipleBatches`:

```js
const incOps = { [`courseAttendance.${cleanCourse}.totalDays`]: 1 };
if (isPresent) { incOps[`courseAttendance.${cleanCourse}.totalDays`] = 1; }  // ← should be presentDays
```

The commented-out earlier version immediately below has `presentDays` here. Looks like a copy-paste regression.

**BUG-2 — `overallAttendance.totalDays` has two different meanings.**
`HandleMarkAttendanceMultipleBatches` guards with `hasAnyMarkedToday`, so it counts **days**. `HandleMarkAttendanceByQR` and `HandleSessionPostAttendance` increment unconditionally per log, so they count **periods**. Overall % therefore mixes units depending on which path marked the student.

**BUG-3 — consequence of BUG-1 and BUG-2: 1,487 of 3,515 students (42%) show incorrect attendance percentages in existing dashboards and reports.** This is independent of the ML feature and deserves its own ticket. **Do not fix without asking the user** — it may require a data migration to recompute counters from logs.

### Structural limitations (design constraints, not fixable in code)

- **`dailyLogs.date` is an unconstrained `String`.** Currently clean (0 unparseable) but nothing enforces this. All ML reads go through `dateUtils.normalizeDate`.
- **`courseAttendance` uses raw course names as Map keys**, normalized differently per write path (`cleanCourse`, `normalizedCourse`, `course.trim()`). Case/whitespace drift is possible.
- **Semester rollover destroys history.** `modifySemesterSetup` with `operation: 'reset'` wipes `dailyLogs` to `[]`; `'remove'` drops collections; rename moves them. `models/BackUp` stores only FN/AN rollno lists, not full logs. **Cross-semester training data does not survive.**
- **`Coder` / `leaderboard` has no time series** — snapshot only, overwritten by `workflows/Scores.js`. "Declining coding activity" as a *trend* feature is not computable. Coding score is usable only as a static feature and is currently **not used at all** in the model.
- **No assessment module exists.** Assessment-performance features from the original spec are excluded.
- **No SuperAdmin / Sector Admin roles** despite the original spec. Only `student`, `faculty`, `admin`.
- **[UNVERIFIED] Possible filename casing issue:** `app.js` does `require("./connect")` but the file appears in the repo listing as `server/Connect.js`. This works on Windows and macOS but would fail on a case-sensitive Linux deployment. `ml/runAudit.js` deliberately calls `mongoose.connect()` directly to sidestep this. **Claude Code should check the actual filename on disk.**
- Many client page files contain large blocks of commented-out duplicate implementations. Ignore them; read the live code above the comment block.

### Open defects in the new ML code

- **DEFECT-1 — probability saturation.** Both inspected students returned exactly `0.993`. Recalibration patch provided in §4.3. **[UNVERIFIED]** as applied or re-tested.
- **DEFECT-2 — `daysSinceLastPresent` referenced to the student's own last log** rather than the batch's latest date. Patch provided in §4.3. **[UNVERIFIED]** as applied.
- **[UNVERIFIED] Performance:** `extractForStudent` (post-patch) loads `{ dailyLogs: { date: 1 } }` for the entire batch just to derive the reference date. Not profiled. Largest batch size is unknown; total is 3,515 students across 31 collections, so ~113 average. Likely fine, but unmeasured.
- **[UNVERIFIED] `semester-risk` endpoint cost:** it loops `predictBatch` over every batch in a semester sequentially with no caching. Not profiled.

---

## 9. Current problem / what remains

**Immediate blocker:** verify whether the recalibration patch (§4.3) and the Step 4 API layer (§5.4) are actually on disk, then confirm the probability spread before any UI is built.

The reason this ordering matters: once the UI exists and faculty have seen risk scores, changing the scoring changes numbers people have already acted on. Calibration must be settled first.

**Remaining work, in order:**

1. Verify / apply the recalibration patch; re-run the smoke test; confirm probabilities are spread rather than saturated.
2. Verify / apply Step 4 (API layer); test all five endpoints including the faculty 403 path.
3. **Step 5 — Frontend.** Not started.
4. **Step 6 — Dataset builder + Python trainer.** Blocked: needs more data (see below).
5. **Step 7 — Supervised scorer swap + evaluation endpoint.** Blocked by Step 6.

**When Steps 6–7 become unblocked:** the gates in `riskConfig.trainingGates` are `minRows: 500`, `minPositiveRate: 0.05`, `maxPositiveRate: 0.60`, `minCutoffs: 4`, `minSpanDays: 56`. Currently `balancedClasses` and `enoughCutoffs` fail. Re-running `node ml/runAudit.js` after several more weeks of attendance data will re-evaluate them automatically.

**[ASSUMPTION]** The 88.6% positive rate is primarily a small-denominator artifact. A likely fix when revisiting Step 6 is requiring a larger minimum future-window sample (e.g. `future.total >= 6` instead of `>= 3`) and/or defining the label purely on *decline* rather than absolute threshold. **This has not been tested.**

---

## 10. Next steps (concrete, in order)

### Step A — Verify current disk state

1. Confirm `server/ml/` exists with all 8 files from §4.1.
2. Diff `ml/models/scorer/baselineScorer.js` against §4.3. Check `temperature` — if it is `2.2`, the patch was **not** applied; if `3.0`, it was.
3. Check whether `computeFeatures` takes 2 or 3 parameters. Two means unpatched.
4. Check whether `CommonServices/facultyScope.js`, `controllers/Analytics.js`, `routes/Analytics.js` exist.
5. Check whether `app.js` contains `analyticsRoutes` and that the mount is **above** `app.use("/api", commonRoutes)`.

Apply anything missing from the sections above.

### Step B — Re-run and validate calibration

Run the smoke test in §11. Confirm:

- Summary distribution is still roughly 20–25% HIGH / 50–60% LOW
- The two sample students (`25951A05B3`, `25951A05E1`) now return **distinct** probabilities, not both `0.993`
- Probabilities across the batch span a range rather than clustering at the ceiling

If still saturated, lower the primary weights further rather than raising `temperature` again — raising temperature alone flattens genuine differences too.

### Step C — Test the API layer

Test all five endpoints. Specifically verify:

- A faculty token requesting a batch they are **not** assigned to gets **403**
- A faculty token requesting an assigned batch gets **200**
- `model-info` reports `trained: false` and `evaluation: null`
- `my-risk` response contains **no** `riskProbability` field
- Invalid `level` query returns **400**
- Nonexistent sem/batch returns **404**

### Step D — Step 5, frontend

1. Create `client/src/pages/CommonPages/AtRiskStudentsPage.jsx`, modelled on `ViewAttendancePage.jsx`.
   - Filters: semester (hard-coded list), batch (from `GET /api/get-sem-info/:semname` → `data.data.batches`), risk level
   - Grouped sections HIGH / MEDIUM / LOW / INSUFFICIENT_DATA with counts from `data.summary`
   - Per-student row: rollno, name, `currentAttendance`, `riskProbability` as a percentage, `confidence` badge
   - Detail panel/modal: attendance trend, `factors[]` with `detail` text and `impact` badge, `recommendations[]`, `lowCourses[]`
   - **Render the `disclaimer` string from the API response visibly.** Do not hard-code it client-side.
   - **Render a "not a trained model" indicator** while `model.trained === false`
   - Use the `api` axios instance, not raw `fetch`
   - Match the design system in §5.5
2. Register the route in `client/src/App.jsx`: lazy import, then add `<Route path="/at-risk-students" element={<AtRiskStudentsPage />} />` **inside the existing `<ProtectedRoute allowedRoles={['admin','faculty']} />` block**.
3. Add an entry card to `AdminDashboard` `managementItems` and to `FacultyActionPage` `actionItems`, matching the existing object shape (`title`, `icon`, `description`, `bgColor`, `path`).
4. **[Optional, ask user first]** Add a risk panel to the student dashboard consuming `/api/analytics/my-risk`.

### Step E — Report BUG-3 to the user as a separate decision

The 42% counter mismatch affects existing production dashboards. Present the option of a recompute migration; **do not run one unprompted.**

---

## 11. Commands

### Run the server

```bash
cd server
npm start          # nodemon app.js
```

### Run the client

```bash
cd client
npm run dev        # vite
```

### Re-run the data audit (read-only, safe against production)

```bash
cd server
node ml/runAudit.js
```

Writes `server/ml/reports/audit-YYYY-MM-DD.json` and prints a summary table with the TRAIN vs BASELINE verdict.

### Smoke-test the prediction pipeline (no server needed)

```bash
cd server
node -e "
require('dotenv').config();
const m=require('mongoose');
m.connect(process.env.MONGODB_URI).then(async()=>{
  const {predictBatch}=require('./ml/services/predictionService');
  const r=await predictBatch('III','SU1');
  console.log(r.summary);
  console.log(JSON.stringify(r.students.slice(0,2),null,2));
  process.exit(0);
});"
```

`III` / `SU1` is a known-good real batch (111 students). Other valid sem/batch pairs are listed in `perCollection[]` of the audit JSON.

### Test an API endpoint

```bash
curl -b "webToken=<JWT_TOKEN>" "http://localhost:5000/api/analytics/batch-risk?semname=III&batch=SU1"
```

Or from the browser console while logged in (cookies ride along):

```js
await (await fetch(`${import.meta.env.VITE_BASE_URL}/api/analytics/batch-risk?semname=III&batch=SU1&level=HIGH`, { credentials: "include" })).json()
```

### Optional package.json script

Add to `server/package.json` under `"scripts"`:

```json
"audit:risk": "node ml/runAudit.js"
```

### Directory scaffolding (if anything is missing)

```bash
cd server
mkdir -p ml/config ml/features ml/dataset ml/services ml/models/scorer ml/models/artifacts ml/reports ml/training
echo "ml/reports/" >> .gitignore
```

---

## 12. Environment and configuration

### Runtime versions

- Node: `^22.18.0` (declared as a dependency in `server/package.json`, which is unusual)
- Express: `^5.1.0`
- Mongoose: `^8.17.1` (lockfile resolves `8.20.1`)
- React: `^19.1.1`
- Vite: `^7.3.0`
- Tailwind: `^4.1.11`
- `dotenvx` appears to be in use (the console prints `injected env (21) from .env`)

### Server environment variables (existing)

```
MONGODB_URI=<MONGODB_URI>
JWT_SECRET=<JWT_SECRET>
JWT_REFRESH_SECRET=<JWT_REFRESH_SECRET>
SECRET_KEY=<AES_SECRET_KEY>              # login payload encryption
Attendance_Secret=<ATTENDANCE_SECRET>    # QR hash generation
PORT=5000
NODE_ENV=development|production
```

### Server environment variables (NEW — all optional, defaults in riskConfig.js)

```
RISK_ATTENDANCE_THRESHOLD=75             # institutional threshold (%)
RISK_PREDICTION_WINDOW_DAYS=14           # future window for label construction
RISK_DECLINE_THRESHOLD=8                 # percentage-point drop counted as declining
RISK_MIN_LOGS=8                          # minimum sessions before scoring
RISK_MODEL_VERSION=heuristic-baseline-v0
```

Nothing breaks if these are unset.

### Client environment variables

```
VITE_BASE_URL=<BACKEND_BASE_URL>
VITE_ENC_KEY=<AES_SECRET_KEY>            # used by AuthContext.jsx
VITE_ENC_SECRET_KEY=<AES_SECRET_KEY>     # referenced in commented-out code — naming is inconsistent
```

**[UNVERIFIED]** Whether both client keys exist in the actual `.env` or only one. The live `AuthContext.jsx` uses `VITE_ENC_KEY`.

### New dependencies

**Production: none.** No packages were added to `server/package.json` or `client/package.json`.

**Future (Step 6, offline only, in `server/ml/training/`):** `scikit-learn`, `pandas`, `numpy`, `joblib` — Python, never imported by the Node runtime.

### Deployment notes

- CORS allowlist in `app.js` includes `https://cdciare.in`, `https://www.cdciare.in`, `http://localhost:5173`, `http://127.0.0.1:3000`, and several `*.vercel.app` origins
- Cookies: `httpOnly`, `secure` in production, `sameSite: "none"` in production
- Access token TTL 180m on login, 15m on refresh; refresh token TTL 1d (signed) / 7d (cookie maxAge) — **[UNVERIFIED]** whether this mismatch is intentional

---

## 13. Important context that would otherwise be lost

- **The user asked for an inspection-first workflow.** The original brief explicitly said "Do not immediately start writing code" and required a 12-point architecture report before implementation. That report was delivered and this handoff supersedes it.
- **The user wants speed.** They asked for step-by-step instructions with literal shell commands. Give commands, not prose descriptions of what to do.
- **The user has been running commands on Windows PowerShell** (`PS D:\Projects\MAJOR_PROJECT-01\server>`). Multi-line `node -e` heredocs work there but shell syntax should account for PowerShell.
- **The 88.6% figure is the single most important number in this project.** It is what justifies shipping a non-trained scorer. Anyone revisiting this must understand it is an artifact of small future-window denominators, not evidence that 88.6% of students are at risk.
- **The `trained: false` flag and the `disclaimer` string are not decoration.** They exist because the user's brief forbids presenting an untrained heuristic as a trained model. The UI must surface both. Do not strip them for visual cleanliness.
- **The scorer is deliberately written in logistic form despite not being fitted.** This means Step 6 replaces only the `WEIGHTS.terms` object with scikit-learn coefficients — the scoring maths, explanation layer, API contract and UI all stay identical. Do not rewrite the scorer as an ad-hoc rule engine; that would destroy this upgrade path.
- **`computeFeatures` already accepts `asOfDate`** precisely so that Step 6's rolling-cutoff dataset builder needs no refactor. Preserve that parameter.
- **The user was asked to confirm the recalibrated output before the UI was built, and the conversation moved to Claude Code before that confirmation arrived.** That confirmation is still outstanding and is Step B above.
- Anything in this document tagged **[UNVERIFIED]** was never executed or observed. Verify before relying on it.

---

## START HERE

Do these five things, in this order, before writing any new feature code.

1. **Read the ML code that already exists.**

   ```bash
   ls -R server/ml
   cat server/ml/config/riskConfig.js
   cat server/ml/models/scorer/baselineScorer.js
   ```
   In `baselineScorer.js`, look at `WEIGHTS.temperature`. **`3.0` means the recalibration patch was applied. `2.2` means it was not** — apply §4.3 in full if so, including the `attendanceFeatures.js` and `featureExtractor.js` changes.
2. **Check whether the Step 4 API layer landed.**

   ```bash
   ls server/controllers/Analytics.js server/routes/Analytics.js server/CommonServices/facultyScope.js
   grep -n "analytics" server/app.js
   ```
   If any are missing, create them from §5.4 and §4.2. Confirm the `/api/analytics` mount sits **above** `app.use("/api", commonRoutes)`.
3. **Run the smoke test and report the numbers back to the user.**

   ```bash
   cd server && node -e "require('dotenv').config();const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const {predictBatch}=require('./ml/services/predictionService');const r=await predictBatch('III','SU1');console.log(r.summary);console.log(r.students.slice(0,5).map(s=>({roll:s.rollno,att:s.currentAttendance,p:s.riskProbability,lvl:s.riskLevel})));process.exit(0);});"
   ```
   The blocking question is whether probabilities are **spread** or **saturated near 0.99**. Do not proceed to the UI until they are spread.
4. **Then build Step 5** (§10 Step D): `AtRiskStudentsPage.jsx`, the `App.jsx` route inside the existing admin+faculty guard, and the two dashboard entry cards.
5. **Do not** fix BUG-1 or BUG-3, refactor `controllers/Faculty.js`, touch any attendance write path, or train a model — without asking the user first. Each was a deliberate decision, documented in §7.
