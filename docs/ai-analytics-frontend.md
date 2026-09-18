# At-Risk Students — Frontend (Step 5)

## Page route

`/at-risk-students`, registered in `client/src/App.jsx` inside the existing "Shared Admin & Faculty Routes" block (`<ProtectedRoute allowedRoles={['admin', 'faculty']} />`), alongside `/post-attendance`, `/batch-report`, `/faculty/action`. Students are blocked by the same existing `ProtectedRoute` mechanism used everywhere else — no new authorization system was introduced. An unauthorized role hitting this route sees the existing `ErrorPage type="notfound"`, exactly as every other role-gated route in the app already behaves.

## Components created

- `client/src/pages/CommonPages/AtRiskStudentsPage.jsx` — the page itself (semester/batch selectors, summary cards, level filter tabs, student table, pagination) plus two co-located components: `StudentDetailModal` (fetches and renders one student's full detail) and small presentational helpers (`RiskBadge`, `TrendIndicator`, `SpinnerOverlay`).
- `client/src/api/analyticsApi.js` — `getBatchRisk({semname, batch, level})` and `getStudentRisk({rollno, semname, batch})`, thin wrappers around the existing shared `api` axios instance (`client/src/api/axiosConfig.js`). No new HTTP client was created; cookie-based auth (`withCredentials: true`) and the existing network/500 error interceptor are reused unchanged.

Placed in `CommonPages/` (not `AdminPages/` or `FacultyPages/`) because it is genuinely shared between both roles, matching where `ViewAttendancePage.jsx`, `BatchWiseReportPage.jsx`, and `FacultyActionPage.jsx` already live.

## API endpoints consumed

- `GET /api/analytics/batch-risk?semname=&batch=` — fetched once per semester/batch selection (no `level` param sent; level-tab switching filters the already-fetched list client-side over the `riskLevel` field already assigned by the backend, so switching tabs never re-hits the API).
- `GET /api/analytics/student-risk/:rollno?semname=&batch=` — fetched when a student row is clicked, inside `StudentDetailModal`.

`GET /api/analytics/my-risk` is **not** used here — it is the student-facing endpoint and out of scope for this faculty/admin page.

## Authentication behavior

Unchanged. The `api` instance sends the `webToken` cookie automatically (`withCredentials: true`); no token handling was added to this page. A `401` from either endpoint calls the existing `useAuth().logout()`, matching how `ViewAttendancePage.jsx`/`BatchWiseReportPage.jsx` already handle session expiry.

## Role behavior

Route-level: only `admin`/`faculty` can reach the page at all (existing `ProtectedRoute`). The frontend does not attempt to compute or guess who is authorized for which batch — it only reflects the backend's decision.

## Faculty scope behavior

The frontend has **no knowledge** of any faculty member's assigned batches. The batch dropdown lists every batch for the selected semester (from the existing `GET /api/get-sem-info/:semname`, the same endpoint `BatchWiseReportPage.jsx` already uses for this exact purpose) — including batches the signed-in faculty member is not scoped to. If they select one they can't access, `batch-risk` returns `403` and the page shows: *"You do not have access to this semester/batch."*, without exposing any internal scope detail. This was verified against the real backend: faculty `IARE11224` (scoped only to `III:A3`) gets `200` for `III/A3` and `403` for `III/SU1`.

## Risk-level display

Four levels (`HIGH`/`MEDIUM`/`LOW`/`INSUFFICIENT_DATA`) are rendered exactly as returned by the backend — colors only, no relabeling: red/amber/emerald/slate respectively, as clickable summary-count cards (using the backend's `summary` object, never recomputed client-side) and as filter tabs. Copy throughout uses "risk prediction" / "risk level" / "prediction confidence" language; nothing claims a guaranteed outcome.

## INSUFFICIENT_DATA behavior

- Table row: shows the `INSUFFICIENT_DATA` badge, `riskProbability` renders as `—` (never `0%` — `formatProbability`/`formatPct` explicitly return `—` for `null`/`undefined`, they never coerce to `0`), and the "Top Factor" column shows literal text **"Insufficient attendance history"** (the backend returns `factors: []` for this case, so this exact phrase — mandated by the task brief — is the only case where display text isn't sourced verbatim from the API).
- Detail modal: shows a dedicated panel with the heading **"Insufficient attendance history"** and an explanation that the system does not yet have enough recorded sessions, instead of the attendance-metrics/factors sections (which don't exist in the API response for this state).
- Verified against real data: batch `III/A3` currently has all 110 students at `INSUFFICIENT_DATA` (only 2 recorded sessions each) — confirmed the page would render this state correctly for every row.

## Student detail behavior

Clicking any row opens a modal calling `student-risk/:rollno`. Every field shown — risk level, probability, confidence, attendance metrics, trend, low courses, top contributing factors, recommendations, and the `disclaimer` string — is read directly from the response; nothing is computed, reworded, or generated client-side. `factors[]` and `recommendations[]` are rendered verbatim from `explanationService.js`/`recommendationService.js` output. The modal closes via the X button, clicking the backdrop, or `Escape`, and is keyboard-reachable (rows are `role="button" tabIndex={0}` with Enter/Space activation).

## Error / loading states implemented

| State | Behavior |
|---|---|
| Fetching batch list | Full-screen spinner overlay ("Loading batches…") |
| Fetching batch risk | Inline spinner inside the results card (filters stay visible/usable) |
| Fetching student detail | Inline spinner inside the modal |
| 400 | Backend's own message surfaced (e.g. missing params) |
| 401 | `logout()` — same as every other page |
| 403 | "You do not have access to this semester/batch." |
| 404 | Backend's own message (e.g. "Attendance collection not found for X / Y") |
| 500 / network | "Unable to load risk analytics. Please try again." + Retry button |
| No semester/batch selected yet | Dashed placeholder card prompting selection |
| Empty batch (0 students) | "No students found in this batch." |
| No rows match the level/search filter | "No students match the current filter." |

## Dashboard integration

- `AdminDashboard.jsx` — added a 5th `managementItems` card ("At-Risk Students" → `/at-risk-students`), same shape (`title`, `icon`, `description`, `bgColor`, `path`) as the existing 4 cards. No existing card was modified or removed.
- `FacultyDashboard.jsx` — added a 4th "Quick Options" card, same visual pattern as the existing 3 (Post Attendance / Download Reports / Update Student).

## Testing performed

- `npm run lint` — the pre-existing codebase already has 78 unrelated lint errors in other files; all new/modified files (`AtRiskStudentsPage.jsx`, `analyticsApi.js`, `App.jsx`, `AdminDashboard.jsx`, `FacultyDashboard.jsx`) are clean (one `exhaustive-deps` warning was found and fixed by wrapping the derived `students` list in `useMemo`).
- `npm run build` — succeeds; `AtRiskStudentsPage` compiles into its own lazy-loaded chunk (`AtRiskStudentsPage-*.js`, ~21 kB) with no errors.
- Backend cross-check: started the real server and re-verified, via curl with real signed JWTs against the live database, that every field the component/modal accesses (`data.sem/batch/total/summary/students`, `model.version/trained`, `disclaimer`, and per-student `rollno/name/branch/batch/sem/currentAttendance/totalSessions/attended/missed/confidence/riskLevel/riskProbability/factors/recommendations/features/lowCourses`) is present with exactly the expected shape in the real API response — including confirming `features`/`lowCourses` are genuinely absent on `INSUFFICIENT_DATA` rows (the component guards every access to these with optional chaining / `Array.isArray` checks).
- Re-confirmed the faculty-scope 403 proof from Step 4 still holds against the exact same endpoint this page calls (`batch-risk`): faculty `IARE11224` → `200` for `III/A3`, `403` for `III/SU1`.
- **Not performed**: interactive in-browser click-through. The available browser automation tool could not reach either local dev server (`http://localhost:5173` / `http://localhost:5000` and `127.0.0.1` equivalents both resolved to `chrome-error://chromewebdata/` in the sandboxed browser session) — this is an environment limitation, not an application issue (both servers responded correctly to `curl` from the same machine throughout testing). Given that, verification fell back to the build/lint pass plus the field-by-field live-API cross-check described above, per the "smallest appropriate verification possible" fallback.
