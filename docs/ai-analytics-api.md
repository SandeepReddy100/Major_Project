# AI Analytics API — At-Risk Student Prediction

## 1. Purpose

Exposes the existing heuristic risk-prediction pipeline (`server/ml/`) over REST so faculty, admins, and students can retrieve an explainable, decision-support risk signal for attendance patterns. This is **not** a static "attendance < 75%" rule and **not** a trained model — it is a transparent, prior-weighted logistic scorer computed from real `dailyLogs`, explicitly reported as `trained: false`.

## 2. Architecture

```
Frontend (client/src/pages/CommonPages/AtRiskStudentsPage.jsx — see docs/ai-analytics-frontend.md)
   ↓
routes/Analytics.js        — authentication + role authorization (existing middleware)
   ↓
controllers/Analytics.js   — param validation, faculty-scope check, response shaping
   ↓
CommonServices/facultyScope.js — authorization: who may see which sem/batch
   ↓
ml/services/predictionService.js — orchestrates extraction + scoring + explanation
   ↓
ml/features/featureExtractor.js  → ml/features/attendanceFeatures.js
   ↓
ml/models/scorer/baselineScorer.js — heuristic-logistic scorer (untrained, prior weights)
   ↓
ml/services/explanationService.js / recommendationService.js
   ↓
MongoDB ({SEM}-SEM-attendance-{BATCH} collections)
```

The controller never recomputes or duplicates scoring logic — it only calls the existing `predictBatch` / `predictStudent` functions from `predictionService.js` and reshapes their output at the response boundary (e.g. stripping `riskProbability` for students).

## 3. Endpoints

All routes are mounted at `/api/analytics`, mounted in `server/app.js` **above** `app.use("/api", commonRoutes)` so the bare `/api` router cannot shadow it.

| Method | Path | Roles | Query / Params |
|---|---|---|---|
| GET | `/api/analytics/batch-risk` | faculty, admin | `?semname=&batch=&level=` (level optional: HIGH\|MEDIUM\|LOW\|INSUFFICIENT_DATA) |
| GET | `/api/analytics/student-risk/:rollno` | faculty, admin | `?semname=&batch=` |
| GET | `/api/analytics/my-risk` | student | none — identity comes from the JWT |

Path/query shape follows the existing convention in `CommonServices/CommonRoutes.js` (e.g. `/students-by-batch?semname=&batch=`, `/get-sem-info/:semname`): a single path param for an identifier, query params for a semester+batch filter pair.

## 4. Authentication

Uses the existing `verifyAccess` middleware (`server/middleware/auth.js`) unmodified — reads the JWT from `Authorization: Bearer <token>` or the `webToken` cookie, and populates `req.user = { id, role, userId, sem, batch }`. No new authentication logic was introduced.

## 5. Authorization

Role gating uses the existing `authorize(...roles)` middleware, applied per-route in `routes/Analytics.js`:
- `batch-risk`, `student-risk/:rollno` → `authorize("faculty", "admin")`
- `my-risk` → `authorize("student")`

Role checks happen at the router level, before the controller runs.

## 6. Faculty scope (`CommonServices/facultyScope.js`)

Role-passing alone isn't enough — a faculty member must only see the semester/batches they're actually assigned to. `facultyScope.js` provides:

- `getFacultyScope(facultyid)` — loads the `Faculty` document and parses `batches_assigned` (`"SEM:BATCH"`) and `subjects_assigned` (`"SEM,BATCH:COURSE"`) into a deduplicated `{sem, batch}` list. This re-implements — rather than imports — the parsing logic already duplicated in `controllers/Faculty.js` (`getDashboardData`, `getFacultyTimeTable`), so the new analytics layer has no dependency on that existing controller.
- `canAccessBatch(user, sem, batch)` — `true` for `admin` unconditionally; for `faculty`, checks the parsed scope; for `student`, checks the token's own `sem`/`batch`.
- `canAccessStudent(user, sem, batch)` — delegates to `canAccessBatch`, since anyone allowed to see a batch's risk list may look up any student inside it (same granularity as the existing `getStudentData` faculty route).

The controller calls `canAccessBatch` **before** invoking the prediction service. The ML layer itself has no notion of who is asking — authorization is enforced entirely at the API boundary, never inside `predictionService`.

**Verified with real data**: faculty `IARE11224` (assigned `III:A3` only) received `200` for `GET /api/analytics/batch-risk?semname=III&batch=A3` and `403` for the same call against `semname=III&batch=SU1` (a batch they are not assigned to). See §13.

## 7. Request examples

```
GET /api/analytics/batch-risk?semname=III&batch=SU1
Authorization: Bearer <admin or scoped-faculty JWT>
```

```
GET /api/analytics/student-risk/25951A05B3?semname=III&batch=SU1
Authorization: Bearer <admin or scoped-faculty JWT>
```

```
GET /api/analytics/my-risk
Authorization: Bearer <student JWT>
```

## 8. Response examples

**Batch risk (faculty/admin)** — real captured response, trimmed:

```json
{
  "success": true,
  "data": {
    "sem": "III",
    "batch": "SU1",
    "total": 111,
    "summary": { "HIGH": 13, "MEDIUM": 25, "LOW": 72, "INSUFFICIENT_DATA": 1 },
    "students": [
      {
        "rollno": "25951A05B3",
        "name": "MAGGIDI KANNAIAH",
        "currentAttendance": 41.2,
        "totalSessions": 17,
        "confidence": "medium",
        "riskLevel": "HIGH",
        "riskProbability": 0.8827,
        "modelType": "heuristic-logistic",
        "trained": false,
        "factors": [ { "factor": "Recent attendance", "detail": "Attendance in the last 10 sessions is 40%.", "impact": "high", "contribution": 2 } ],
        "recommendations": [ "Attendance is below the 75% threshold. Prioritise attending all upcoming sessions." ],
        "features": { "overallPct": 41.2, "recentPct": 40, "...": "..." },
        "lowCourses": [ { "course": "advance_java", "pct": 40, "total": 5 } ]
      }
    ]
  },
  "model": { "version": "heuristic-baseline-v0", "trained": false, "type": "heuristic-logistic" },
  "disclaimer": "Decision-support signal based on recorded attendance patterns. Not a prediction of academic outcome. Review the underlying attendance log before acting."
}
```

**my-risk (student)** — real captured response, `riskProbability` key is absent entirely (not `null`):

```json
{
  "success": true,
  "data": {
    "rollno": "25951A05B3",
    "currentAttendance": 41.2,
    "totalSessions": 17,
    "confidence": "medium",
    "riskLevel": "HIGH",
    "modelType": "heuristic-logistic",
    "trained": false,
    "factors": [ "..." ],
    "recommendations": [ "..." ],
    "features": { "...": "..." },
    "lowCourses": [ "..." ]
  },
  "model": { "version": "heuristic-baseline-v0", "trained": false, "type": "heuristic-logistic" },
  "disclaimer": "Decision-support signal based on recorded attendance patterns. Not a prediction of academic outcome. Review the underlying attendance log before acting."
}
```

`model.version`/`trained`/`type` are read from the actual prediction result (ultimately from `RISK_CONFIG.modelVersion` and `baselineScorer.js`), never hard-coded in the controller.

## 9. Error responses

| Status | Cause | Example body |
|---|---|---|
| 400 | Missing `semname`/`batch`/`rollno`, or invalid `level` | `{"success":false,"error":"semname and batch query parameters are required"}` |
| 401 | Missing/invalid JWT (existing `verifyAccess` behavior, unchanged) | `{"error":"Missing token"}` |
| 403 | Wrong role (existing `authorize` behavior) or faculty out of scope | `{"success":false,"error":"You do not have access to this semester/batch"}` |
| 404 | Semester/batch collection or student not found (thrown by `featureExtractor.js`, translated at the controller boundary) | `{"success":false,"error":"Attendance collection not found for XX / YY"}` |
| 500 | Unexpected internal error | `{"success":false,"error":"Server error"}` — no stack trace or raw MongoDB error is ever returned to the client; the real error is only `console.error`'d server-side. |

## 10. Insufficient-data behavior

Students below `RISK_CONFIG.minLogsForPrediction` (currently 8 sessions) are **not** scored. `predictionService` returns `riskLevel: "INSUFFICIENT_DATA"`, `riskProbability: null`, `factors: []`, and a recommendation asking to verify attendance marking. The API passes this through unchanged — it is not treated as an error and never converted into a fabricated `LOW` risk or a fabricated probability. Verified with a real batch (`III/A3`) where every student had only 2 recorded sessions and correctly came back as `INSUFFICIENT_DATA`.

## 11. Model version

`model.version` in every response envelope is read from `RISK_CONFIG.modelVersion` (`server/ml/config/riskConfig.js`, defaulting to `heuristic-baseline-v0`, overridable via `RISK_MODEL_VERSION`). `model.trained` and `model.type` are read from the prediction result itself (ultimately `baselineScorer.js`'s `trained: false` / `modelType: "heuristic-logistic"`). None of these are literals in `controllers/Analytics.js`, so a future trained model (still blocked on the training gates — see §17 of `docs/ai-research-readiness.md`) can change these values without any API-layer code change.

## 12. Security considerations

- Authorization is enforced **before** any database read for prediction — `canAccessBatch` runs ahead of `predictBatch`/`predictStudent`.
- `my-risk` derives the student's identity (`rollno`, `sem`, `batch`) exclusively from the verified JWT payload (`req.user`) — it never accepts these as request parameters, so a student cannot request another student's data by supplying a different roll number.
- Students never receive `riskProbability`, only the qualitative `riskLevel`, factors, and recommendations — enforced by stripping the field at the API boundary, not by changing what `predictionService` computes.
- Error responses never leak MongoDB errors or stack traces; unexpected errors are logged server-side and returned to the client as a generic `"Server error"`.
- No existing attendance write path, authentication logic, or other controller was modified.

## 13. Testing performed

Manual endpoint testing against the live database with real JWTs signed for real accounts (no test framework existed in the repo to extend):

1. `GET /batch-risk` as faculty `IARE11224` (assigned `III:A3`) for `III/A3` → **200**, real predictions.
2. Same faculty for `III/SU1` (not assigned) → **403**, proving cross-scope access is blocked, not merely that the endpoint responds.
3. `GET /batch-risk` as admin for `III/SU1` → **200**, matches the standalone `predictBatch('III','SU1')` smoke-test numbers exactly (13 HIGH / 25 MEDIUM / 72 LOW / 1 INSUFFICIENT_DATA, top student `25951A05B3` at `0.8827`).
4. Invalid `level=BOGUS` → **400**.
5. Missing `batch` query param → **400**.
6. Nonexistent `semname=XX&batch=YY` → **404**.
7. No `Authorization` header → **401** (existing middleware, unchanged).
8. Student JWT against a faculty-only endpoint → **403** (existing role middleware, unchanged).
9. `GET /student-risk/:rollno` as admin for a real student → **200**, full detail including `riskProbability`.
10. Same endpoint, faculty out of scope → **403**.
11. `GET /student-risk/:rollno` for a nonexistent roll number in a valid batch → **404**.
12. `GET /my-risk` as the student themself (sufficient sessions) → **200**, `riskProbability` key absent, `riskLevel` present.
13. `GET /my-risk` as a student with only 2 sessions → **200**, `riskLevel: "INSUFFICIENT_DATA"`, no fabricated probability.
14. `GET /my-risk` with a faculty JWT → **403** (role mismatch).
15. Existing unrelated routes re-verified after the `app.js` change: `/api/me`, `/api/get-sem-info/:semname`, `/api/faculty/get-profile-data`, `/api/student/get-profile-data` — all still return `200` with correct data.
16. `node --check` passed on all new/modified files (`facultyScope.js`, `controllers/Analytics.js`, `routes/Analytics.js`, `app.js`).

No attendance write endpoint was touched or tested-against, since none were modified.
