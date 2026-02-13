# Context Transfer: Course Evaluation Feature

## Status: In Progress -- Debugging Page Crash

The course evaluation feature for `kurser.dtu.dk` is mostly implemented but caused a page crash on kurser.dtu.dk. A fix has been applied (switching `credentials: 'same-origin'` back to `credentials: 'omit'`), but this needs verification.

---

## What Was Built

A new feature that fetches course evaluation data from `evaluering.dtu.dk` and displays it inline on `kurser.dtu.dk/course/{code}` pages. The panel shows:
- Response rate (percentage + respondent count)
- Overall satisfaction score (average of 5 Likert questions, 1-5 scale)
- Per-question horizontal bar charts (Learned a lot, Aligns with objectives, Motivating, Feedback opportunity, Clear expectations)
- Workload gauge meter (gradient bar with marker showing weighted average from "Much less" to "Much more")
- Link to full evaluation on evaluering.dtu.dk

## Architecture

### Two-step fetch pattern:
1. **Same-origin fetch** from content script on `kurser.dtu.dk`: fetches `/course/{code}/info` to discover the evaluation URL (the eval ID is unpredictable, e.g. `/kursus/22050/330831`)
2. **Cross-origin fetch** via `background.js`: fetches the actual evaluation page from `evaluering.dtu.dk`, parses it with regex (no DOM -- MV3 compatible), returns structured data to content script

### Files changed:
- **manifest.json** + **manifest_chrome.json**: Added `https://evaluering.dtu.dk/*` to permissions
- **background.js**: Added `parseEvaluationHtml()`, `fetchCourseEvaluation()`, and message handler for `dtu-course-evaluation`
- **darkmode.js**: Added feature flag, toggle, `insertKurserCourseEvaluation()`, `renderCourseEvaluationPanel()`, wired into all kurser.dtu.dk call sites

### Feature flag:
- Key: `dtuAfterDarkFeatureKurserCourseEval` (default: `true`)
- Toggle ID: `feature-kurser-course-eval-toggle`
- Added to admin tools panel under "Course Tools" group

---

## The Bug: kurser.dtu.dk Page Crash

### Symptom:
When the extension is enabled, visiting `kurser.dtu.dk/course/{code}` shows a server error page: "An error has occurred. The error was not handled by the system." with error IDs from the CampusNet backend. Disabling the extension makes the page load normally.

### Root Cause Analysis:
The `insertKurserCourseEvaluation()` function fetches `https://kurser.dtu.dk/course/{code}/info` during page load. Initially it used `credentials: 'omit'` (correct) but was changed to `credentials: 'same-origin'` while debugging a different issue (relative URL not resolving in content script context).

**The problem**: `credentials: 'same-origin'` sends the user's session cookies with the fetch. kurser.dtu.dk runs on ASP.NET/CampusNet, which uses server-side session state. ASP.NET session state access is **serialized** -- only one request per session can execute at a time. When our fetch runs concurrently with the page's own requests during load, the session lock conflict causes the server to error.

### Fix Applied:
Changed back to `credentials: 'omit'` in `insertKurserCourseEvaluation()` (line ~7581 in darkmode.js). The `/info` page is public and doesn't need cookies. Added a comment explaining why `credentials: 'omit'` is important.

### Needs Verification:
- [ ] Reload extension and confirm kurser.dtu.dk course pages load without error
- [ ] Confirm the evaluation panel still appears and shows data correctly
- [ ] Verify response rate is no longer 0.0% (was fixed in background.js by moving `PercentageResult` search to full HTML)
- [ ] Verify the `Overall` score is computed from questions `1.1`-`1.5` only (when present)
- [ ] Test on multiple courses (try 22050, 01005, 02402, etc.)
- [ ] Test with dark mode ON and OFF

---

## Bugs Fixed During This Session

1. **Relative URL in content script**: `fetch('/course/22050/info')` resolves to `moz-extension://xxx/course/22050/info` in Firefox content scripts. Fixed by using `window.location.origin + '/course/...'`.

2. **Response rate showing 0.0%**: The `PercentageResult` div was outside the minimal regex match for `CourseResultsPublicContainer`. Fixed by searching the full HTML for the percentage element, with a fallback that computes rate from respondents/eligible.

3. **Session lock crash (current)**: `credentials: 'same-origin'` on concurrent fetch causes ASP.NET session serialization conflict. Fixed by using `credentials: 'omit'`.

4. **Evaluation summary "Overall" skewed**: The UI averaged *all* parsed `1.x` questions, but the intended satisfaction summary is the standard `1.1`-`1.5` block. Some courses add extra `1.x` questions, which inflated/deflated the displayed "Overall" score and cluttered the satisfaction list. Fixed by preferring `1.1`-`1.5` for both the `Overall` score and the satisfaction bars (with fallback to previous behavior if those keys aren't present).

---

## Key Code Locations

### darkmode.js:
- Feature flag: `FEATURE_KURSER_COURSE_EVAL_KEY` (line ~160)
- Toggle registration: `insertAfterDarkFeatureToggle(...)` (line ~4961)
- Toggle change handler: (line ~4944)
- Admin tools group: `'Course Tools'` ids array (line ~5007)
- Main function: `insertKurserCourseEvaluation()` (line ~7520)
- Render function: `renderCourseEvaluationPanel()` (line ~7629)
- Call sites:
  - `runTopWindowFeatureChecks` (line ~9485): `insertKurserCourseEvaluation();`
  - `scheduleHostLightRefresh` (line ~9549): `insertKurserCourseEvaluation();`
  - `startHostFeatureBootstrap` done check (line ~9516): `|| !!document.querySelector('[data-dtu-course-eval]')`

### background.js:
- Constants: `EVAL_LIKERT_WEIGHTS`, `EVAL_WORKLOAD_WEIGHTS` (line ~788-791)
- Parser: `parseEvaluationHtml(html)` (line ~793)
- Fetcher: `fetchCourseEvaluation(evalUrl)` (line ~931)
- Message handler: `if (message.type === 'dtu-course-evaluation')` (line ~826)

---

## Bug Memory (Add to CLAUDE.md)

- **CRITICAL**: On kurser.dtu.dk, avoid cookie-bearing fetches during page load. kurser.dtu.dk uses ASP.NET with serialized session state; concurrent cookie-bearing requests can trigger server-side crashes. Prefer `credentials: 'omit'` for public endpoints; if the anonymous `/info` fetch returns a tiny stub, retry once with `credentials: 'same-origin'` only after `document.readyState === 'complete'` (delayed) to reduce crash risk.
- In Firefox content scripts, `fetch()` with relative URLs resolves against the extension origin (`moz-extension://...`), not the page origin. Always use `window.location.origin + path` for same-origin fetches from content scripts.
- The `PercentageResult` div on evaluering.dtu.dk sits outside the minimal `CourseResultsPublicContainer` regex match. Search for it in the full HTML or use a fallback calculation.

---

## What's Left

If the `credentials: 'omit'` fix resolves the crash:
- Feature is complete and ready for testing
- May want to add caching (store evaluation data in extension storage with 24h TTL)
- Console debug logs can be removed once stable (search for `[DTU After Dark] Course eval`)
