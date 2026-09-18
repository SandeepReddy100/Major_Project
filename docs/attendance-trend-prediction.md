# Attendance Trend Prediction (Step 6)

## 1. Problem definition

*"Based on a student's historical attendance, what attendance percentage can reasonably be expected over the next prediction window if their recent attendance pattern continues?"*

This is framed throughout as a **projection/estimate**, never a guaranteed outcome. It answers a different question than the At-Risk system: At-Risk asks *"how concerning is this student's pattern right now"*; Attendance Trend asks *"if nothing changes, where is this heading"*. Both read the same underlying data but serve different decision-support purposes.

## 2. Data source

Identical to the At-Risk system: `dailyLogs` inside the `{SEM}-SEM-attendance-{BATCH}` collections (`rollno, name, branch, batch, dailyLogs: [{date, course, status}]`). Stored `overallAttendance`/`courseAttendance` counters are **not** used, for the same reason established in Step 1–3 (42% of documents have counters that disagree with their own logs) — everything is recomputed from `dailyLogs` via the existing `computeFeatures` pipeline.

## 3. Features used

Reused directly from `ml/features/attendanceFeatures.js` (no new feature-extraction logic was written):

| Feature | Source | Used for |
|---|---|---|
| `overallPct` | `computeFeatures` | "Current attendance" |
| `recentPct` (last `recentSessions`=10 sessions) | `computeFeatures` | "Recent attendance" and the rate assumed to continue in the forecast |
| `trendDelta` (recent half vs. prior half) | `computeFeatures` | Trend classification |
| `consecutiveAbsences` | `computeFeatures` | An explanatory factor when present |
| `totalSessions`, `attended`, `firstDate`, `lastDate` | `computeFeatures.meta` | Session frequency (`totalSessions / spanDays`) used to scale the forecast horizon into a session count |

No new, redundant, or collinear features were introduced — deliberately reusing the same 2 primary signals (`overallPct`, `recentPct`) and 1 trend signal (`trendDelta`) the At-Risk baseline already established as meaningful for this sparse (~2 sessions/week) attendance pattern, rather than adding volatility/slope/streak metrics that would mostly duplicate `trendDelta` on this data.

## 4. Prediction method — transparent statistical baseline, not ML

`server/ml/services/trendPredictionService.js` implements one deterministic arithmetic projection:

1. **Session frequency**: `sessionsPerDay = totalSessions / spanDays` (spanDays = days between the student's first and last recorded session).
2. **Horizon in sessions**: `projectedSessions = round(sessionsPerDay × predictionWindowDays)` — converts the config's calendar-day horizon into an expected session count for *this* student's own historical cadence (necessary because the audit in Step 1 found attendance is session-sparse and irregular, not evenly spread across calendar days).
3. **Projected sessions attended**: `projectedAttendedSessions = round(projectedSessions × recentPct / 100)` — assumes the student's *recent* rate (not their all-time overall rate) continues.
4. **Projected attendance**: `pct(attended + projectedAttendedSessions, totalSessions + projectedSessions)` — the overall percentage the student would have *if* that recent rate held for the projected sessions.

This is pure arithmetic over already-observed data — no coefficients were fitted, no model was trained, nothing was learned from a dataset. It is explicitly reported as `model.type: "attendance-trend-projection"`, `model.version: "trend-baseline-v0"` — a distinct identity from the At-Risk `heuristic-baseline-v0`, so the two are never conflated in API responses or the UI.

## 5. Trend classification

| Direction | Condition |
|---|---|
| `DECLINING` | `trendDelta <= -RISK_CONFIG.declineThreshold` (currently -8 points) |
| `IMPROVING` | `trendDelta >= RISK_CONFIG.declineThreshold` (currently +8 points) |
| `STABLE` | otherwise |
| `INSUFFICIENT_DATA` | `!meta.scoreable` (fewer than `RISK_CONFIG.minLogsForPrediction`=8 sessions) or `trendDelta` is null |

The threshold is **`RISK_CONFIG.declineThreshold`**, reused as-is — the same "percentage-point drop that counts as declining" value the At-Risk/audit label-feasibility logic already uses (`server/ml/dataset/auditData.js`). No second, conflicting configuration was created. `strength` (`"moderate"`/`"strong"`/`null`) is derived from the same value: `strong` when `|trendDelta| >= declineThreshold × 2`.

## 6. Prediction horizon

**`RISK_CONFIG.predictionWindowDays`** (currently 14 days), read directly from the existing config — not duplicated. Every forecast response includes `horizonDays` so the UI never hard-codes it either.

## 7. Leakage prevention

Built entirely on the same `extractForStudent`/`extractForBatch` → `computeFeatures` pipeline the At-Risk system already established, so the exact same discipline applies: when an `asOfDate` cutoff is supplied, logs are filtered to `date <= asOfDate` and the reference date used for recency features is the cutoff itself, never the true latest date. One additive, non-breaking change was made to `attendanceFeatures.js`: `computeFeatures` now also returns the cleaned, filtered `logs` array (previously discarded internally) so the trend service can build the history/forecast without re-implementing `cleanLogs`+filtering — this is exposing existing internal state, not a scoring or leakage-relevant change.

**Verified directly** (not assumed): calling `predictStudentTrend('III','SU1','25951A05B3', null)` vs. `predictStudentTrend('III','SU1','25951A05B3','2026-08-01')` on the live database:

| | Full history | Cutoff `2026-08-01` |
|---|---|---|
| `totalSessions` | 17 | 4 |
| `trend.direction` | DECLINING | **INSUFFICIENT_DATA** |
| `forecast` | `{...}` | **null** |
| `history` max date | 2026-09-09 | **2026-07-29** (≤ cutoff) |

The cutoff run never saw the 13 sessions after 2026-08-01, correctly dropped below the 8-session floor, and produced no forecast at all — no fabricated projection from data that wouldn't have existed yet.

## 8. API endpoints

| Method | Path | Roles | Query / Params |
|---|---|---|---|
| GET | `/api/analytics/attendance-trend` | faculty, admin | `?semname=&batch=` |
| GET | `/api/analytics/attendance-trend/:rollno` | faculty, admin | `?semname=&batch=` |

Same route/auth conventions as the existing `batch-risk`/`student-risk` endpoints: `verifyAccess` then `authorize("faculty","admin")` in `routes/Analytics.js`, `canAccessBatch()` from the existing `facultyScope.js` called before touching the prediction service (no second authorization implementation). A faculty member out of scope gets `403` with the identical message as the At-Risk endpoints.

## 9. Response structure

**Batch** (`/attendance-trend`):
```json
{
  "success": true,
  "data": { "sem": "III", "batch": "SU1", "total": 111, "summary": { "IMPROVING": 31, "STABLE": 33, "DECLINING": 46, "INSUFFICIENT_DATA": 1 }, "students": [ /* per-student, no history[] */ ] },
  "model": { "type": "attendance-trend-projection", "version": "trend-baseline-v0" },
  "disclaimer": "Projected attendance is a statistical estimate..."
}
```

**Per-student** (real captured example, `25951A05B3`):
```json
{
  "rollno": "25951A05B3", "name": "MAGGIDI KANNAIAH", "branch": "CSE", "batch": "SU1", "sem": "III",
  "totalSessions": 17, "attended": 7, "missed": 10,
  "currentAttendance": 41.2, "recentAttendance": 40, "confidence": "medium",
  "trend": { "direction": "DECLINING", "changePoints": -16.7, "strength": "strong" },
  "forecast": { "horizonDays": 14, "projectedSessions": 5, "projectedAttendedSessions": 2, "projectedTotalSessions": 22, "projectedAttendance": 40.9 },
  "explanation": "Recent attendance over the last 10 sessions is 40%, compared with 41.2% overall. Attendance has dropped 16.7 percentage points compared with the prior period, so the projected attendance is lower than the current rate. If this recent rate continues, projected attendance over the next ~14 days is approximately 40.9%.",
  "factors": [ { "factor": "Recent attendance rate", "detail": "40% over the last 10 sessions." }, "..." ],
  "modelType": "attendance-trend-projection", "modelVersion": "trend-baseline-v0", "computedAt": "..."
}
```

The single-student endpoint additionally includes `"history": [{ "sessionIndex", "date", "status", "runningAttendance" }, ...]` — the running attendance percentage session-by-session, used to draw the actual-vs-projected chart. **Deliberately omitted from the batch response** (payload size — up to ~20 entries × up to ~120 students per batch is unnecessary when the batch table only needs summary figures; the chart is a detail-view feature).

## 10. Explanation method

Generated in `buildExplanation()`/`buildFactors()` from the actual computed numbers (recentPct, overallPct, trendDelta, forecast) via template strings — no LLM, no static copy that could contradict the data. Example: the "dropped/risen N percentage points" clause literally interpolates `features.trendDelta`; if that number is null or contradicts the direction, the code paths simply wouldn't have classified it that way in the first place (the same `trendDelta` value drives both the classification and the sentence).

## 11. Limitations

- **Assumes continuation, not causation.** The projection has no way to account for upcoming holidays, exams, illness, or any real-world change in behavior — this is stated in the `disclaimer` and the frontend's trend-view subtitle.
- **Session-frequency estimate is itself historical.** `sessionsPerDay` is computed from the student's own past cadence; if their course load or session frequency changes going forward, the projected *session count* (not just the rate) will be off.
- **Same sparsity constraints as the At-Risk baseline** apply: ~2 sessions/week per student means the "recent 10 sessions" window can span several weeks, so `recentPct` is a coarser signal than a true recent-week rate would be.
- **`spanDays <= 0` or `recentPct === null` → forecast is `null`**, not a fabricated number (verified in the sanity checks below).

## 12. Testing

Ran directly against the live development database (no synthetic data):

- **Leakage test** (§7 above) — passed.
- **Sanity checks across a real batch** (`III/SU1`, 111 students, `predictBatchTrend`): 0 issues found — every `currentAttendance`/`recentAttendance` in `[0,100]`, every `projectedAttendance` finite and in `[0,100]`, no negative session counts, `projectedAttendedSessions <= projectedTotalSessions` always, and no student with `INSUFFICIENT_DATA` carrying a non-null `forecast`.
- **All four trend categories occur naturally** in this real batch — none were manufactured: 31 `IMPROVING`, 33 `STABLE`, 46 `DECLINING`, 1 `INSUFFICIENT_DATA`. Representative real examples captured for each (see git history / session logs) rather than fabricated test fixtures.
- **API-layer tests**, all against the live server with real signed JWTs for real accounts:
  1. Faculty `IARE11224` (scoped to `III:A3`) on `attendance-trend?semname=III&batch=A3` → `200`.
  2. Same faculty on `III/SU1` (out of scope) → `403`.
  3. Admin on `III/SU1` → `200`.
  4. Missing `batch` param → `400`.
  5. Nonexistent `semname=XX&batch=YY` → `404`.
  6. Admin `attendance-trend/25951A05B3?semname=III&batch=SU1` → `200`, full detail including `history`.
  7. Nonexistent roll number in a valid batch → `404`.
  8. Faculty out-of-scope student-trend request → `403`.
  9. No token → `401`.
  10. Existing `batch-risk` endpoint re-verified working, unchanged → `200`.
  11. Existing `/api/get-sem-info/:semname` re-verified working, unchanged → `200`.

## 13. Why this is a transparent statistical baseline, not a trained model

The Step 1 audit's verdict (`USE_TRANSPARENT_BASELINE`) has not changed — the class-balance gate for the At-Risk label still fails on live data, and no analogous supervised regression target exists for attendance trend either (that would need many students' *actual future* attendance outcomes to train and validate against, at a scale this dataset doesn't yet have without risking overfitting or fabricating a false sense of accuracy). Per the explicit constraint for this step, **no supervised model was trained, no accuracy/precision/recall/F1/ROC-AUC figures are reported anywhere**, and none should be trusted if seen elsewhere until a real training/evaluation pipeline exists. `model.type` is literally named `"attendance-trend-projection"` (not "AI model" or "trained") and `model.version` is `"trend-baseline-v0"`, mirroring the At-Risk system's own honest `trained: false` labeling — this is arithmetic over real historical data, presented as an estimate, not a prediction from a fitted model.
