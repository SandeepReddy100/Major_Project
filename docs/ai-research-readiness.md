# AI System — Research Readiness Assessment

Produced as part of the Step 8 full-system audit. This assessment is intentionally conservative: a rating of READY means the item would hold up under outside scrutiny (a reviewer, an auditor, a thesis committee), not merely that the code runs.

## Summary table

| # | Area | Rating |
|---|---|---|
| 1 | Problem definition | READY |
| 2 | Data source | READY |
| 3 | Data preprocessing | PARTIALLY READY |
| 4 | Feature engineering | READY |
| 5 | At-Risk methodology | PARTIALLY READY |
| 6 | Trend prediction methodology | PARTIALLY READY |
| 7 | LLM assistant architecture | READY |
| 8 | Explainability | READY |
| 9 | Security | READY |
| 10 | Privacy | READY |
| 11 | Evaluation | NOT READY |
| 12 | Reproducibility | PARTIALLY READY |
| 13 | Limitations (documentation of) | READY |
| 14 | Future supervised ML work | NOT READY |

## 1. Problem definition — READY

Both predictive features answer a stated, narrow question, not an open-ended one: At-Risk asks "how concerning is this student's current pattern," Trend asks "where is it heading if unchanged." Both are explicitly scoped as decision-support signals for a human (faculty/admin), not automated decisions. This framing is consistent across `docs/ai-analytics-api.md`, `docs/attendance-trend-prediction.md`, and the original `HANDOFF.md`.

## 2. Data source — READY

Real production MongoDB (`{SEM}-SEM-attendance-{BATCH}` collections, `dailyLogs: [{date, course, status}]`), the same data the existing (non-AI) attendance system writes to and displays. No synthetic data anywhere in this system. Known data-quality defects (see §3) are documented, not hidden.

## 3. Data preprocessing — PARTIALLY READY

Date/status/course normalization (`dateUtils.js`) is robust — the live audit shows 0 unparseable dates across 61,361+ logs — and session-count windows were chosen deliberately based on measured session sparsity (~2 sessions/student/week), not assumed. **However**: the root cause of the 42% `overallAttendance`/`courseAttendance` counter mismatch (BUG-1/BUG-2, documented since the original handoff) has never been fixed — every AI feature works around it by recomputing from `dailyLogs` instead. That workaround is correct and necessary, but it means the underlying write-path data-integrity bug is still live in production and would need disclosure in any research write-up that touches these collections directly.

## 4. Feature engineering — READY

Features are justified by measured data characteristics (documented in `attendance-trend-prediction.md` §3 and the original recalibration rationale), collinearity was identified and explicitly down-weighted rather than silently ignored (`baselineScorer.js` WEIGHTS comments), and the same feature set is reused (not reimplemented) across At-Risk, Trend, and the Assistant — verified today via direct cross-consistency testing (§4 of this audit, below).

## 5. At-Risk methodology — PARTIALLY READY

The logistic-form scorer is fully documented and deterministic, and every weight has a stated rationale (§4.3 of `HANDOFF.md`, `baselineScorer.js` comments). But the weights are **hand-set**, not fitted — there was no maximum-likelihood estimation, no train/test split, no cross-validation. This is appropriate and honestly labeled as a heuristic baseline (`trained: false`, `modelType: "heuristic-logistic"`) for a deployed decision-support tool, but it would not qualify as a "trained methodology" in a research sense — it's a documented, internally-consistent rule system, not a statistically validated model.

## 6. Trend prediction methodology — PARTIALLY READY

The arithmetic (session-rate projection) is simple, transparent, and correctly implemented (verified deterministic and bounded, see §9 below). **No backtest has ever been run** — nobody has checked whether "assume the recent rate continues" actually predicted real subsequent attendance for students where enough history now exists to check. The method is sound as a transparent estimate but has zero empirical validation of its predictive accuracy.

## 7. LLM assistant architecture — READY

Controlled intent classification (not LLM tool-calling) makes "the model cannot fetch unauthorized data" a structural property, not a prompting convention — confirmed today by both code inspection and live testing (§6–7 of this audit). Every component (intent router, tool layer, prompt, client) is small, single-purpose, and documented.

## 8. Explainability — READY

Both predictive features return per-factor natural-language explanations tied to actual computed values (`explanationService.js` for At-Risk, `buildExplanation`/`buildFactors` for Trend) — not templated boilerplate. Verified today: the assistant's answers about specific students matched these same factor strings, and no invented reasoning was observed anywhere in testing.

## 9. Security — READY

Authorization is structurally guaranteed to precede data access in every code path audited today (At-Risk, Trend, and all 4 Assistant tools). Prompt-injection tests (the exact examples from the Step 8 brief) were all refused without invoking the LLM. No `eval`, `Function`, `child_process`, dynamic `require`, or arbitrary query construction exists anywhere in the AI code (grep-confirmed, zero matches). See §6–7 of this audit for full test results.

## 10. Privacy — READY

Every tool/endpoint returns a hand-picked field allowlist; passwords, JWTs, Mongo `_id`s, and raw `dailyLogs` are never present in any AI-facing output (confirmed by direct inspection of every service's return statement).

## 11. Evaluation — NOT READY

There is no held-out test set, no cross-validation, no measured precision/recall/F1/accuracy/ROC-AUC anywhere in this system, and none is claimed anywhere in the documentation (verified by grep across all `docs/*.md` — see §15 of the audit report). This is not an oversight: the Step 1 audit's own gate (`balancedClasses`) explicitly failed because the only available label definition produces an 80.8% positive rate, which is not usable ground truth for a meaningful evaluation. **Any future claim of predictive accuracy for either the At-Risk scorer or the Trend projector requires a real evaluation study that does not yet exist.**

## 12. Reproducibility — PARTIALLY READY

The code path is deterministic — confirmed today by calling `baselineScorer.score()` three times on identical input and getting an identical result, and by the fact that leakage tests with the same `asOfDate` reliably reproduce the same feature set. Config (`riskConfig.js`) is centralized and version-controlled. **However**, the underlying database is live production data with no frozen/versioned snapshot — rerunning the audit tomorrow will produce different numbers (already observed: the training-gate audit's numbers shifted between the Step 1 run and today's rerun, purely from a day of new attendance data, not from any code change). A research write-up would need to either freeze a dataset snapshot or explicitly caveat that reported numbers are a point-in-time observation.

## 13. Limitations documentation — READY

Limitations are documented extensively and specifically, not generically, across `HANDOFF.md`, `docs/ai-analytics-api.md`, `docs/attendance-trend-prediction.md`, and `docs/ai-faculty-assistant.md` — including the counter-mismatch bug, session sparsity, hand-tuned weights, no backtesting, no conversation memory, and the specific LLM self-consistency slip discovered during Step 7 testing (an off-by-one in a table row count, corrected but disclosed rather than hidden).

## 14. Future supervised ML work — NOT READY

Correctly gated behind `RISK_CONFIG.trainingGates`, which still fail on live data (see the fresh audit run in the main report, §17). No synthetic data has been created to force the gates to pass, and none should be — the existing verdict (`USE_TRANSPARENT_BASELINE`) remains the honest, current state of this system.

## Overall assessment

This system is **solid as a deployed, transparent decision-support tool** — every claim it makes about itself (not trained, not guaranteed, decision-support only) is true and independently verifiable in the running code, which is the property that actually matters for responsible deployment. It is **not yet a research contribution** in the sense of a validated predictive methodology: the honest gaps are evaluation (§11) and backtesting (§6), both correctly and consistently disclosed rather than glossed over anywhere in the existing documentation.
