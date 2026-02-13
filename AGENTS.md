I am a student at DTU (technical university of denmark). 

I want a dark mode firefox extension that darkens the wanted pages i give.

I want not complete darkness, of course showing links, some color, like DTU red, which is a signature color which has to be there.

PDF, video players should not be darkened.

When i say very dark or dark 1, i mean rgb(26,26,26).

When i say less dark or dark 2, i mean rgb(45,45,45).

Global darkening rules can override local style changes, so always account for that when implementing or debugging new UI styling.
Whenever adding a new element, ensure it is styled and works correctly with dark mode both ON and OFF.

I do not understand HTML, css, javascript, no web dev stuff, so if you cant darken something i want, give me clear instructions on what to give you so you can darken it.

when i copy something from the "inspect element" page, i will copy the html code with "Copy Outer HTML".

No emojis unless asked for
Whenever a feature is deemed done, update README.md to reflect it.
Never include the on-page context-capture button/hotkey in release builds. It is a dev-only tool and must stay disabled for packaged Firefox/Chrome store zips.
Before building release zips for upload, always bump both manifest versions (`manifest.json` and `manifest_chrome.json`) to a new, matching version number.
For stubborn CampusNet styling (especially `/cnnet/Grades/Grades.aspx`), use runtime inline overrides in `darkmode.js` (`fixCampusnetHeaderStyling`) because broad/global rules and postbacks can override CSS selectors.
Time-critical features (deadlines, exam-date sources, semester/period mappings) must be reviewed and updated regularly (at least each semester) so the extension does not show outdated info.


## Bug Memory (Do Not Repeat)
- Studyplanner exam feature must read courses from the LEFT semester plan table (latest active/planned term with placement), not from `Kursuskurv` unless explicitly requested.
- Summer month placements (`June`, `July`, `August`) should be matched by month-specific exam rows first (e.g. `3-weeks course from June/August`) before generic period matching.
- In MV3/service-worker contexts, `DOMParser` may be unavailable or unreliable for fetched HTML. Always keep a non-DOM regex/parser fallback in `background.js` for exam calendar parsing.
- DTU exam calendar URLs can change; prefer current `student.dtu.dk/.../exam-dates` endpoints first, then keep older URLs as fallbacks.
- Avoid flicker: do not re-render/move the exam panel every observer tick. Re-render only when course signature actually changes, and avoid moving container unless parent changes.
- Keep studyplanner UI strings in English (`Study Planner`, risk labels, status text).
- Avoid unclear labels in panels (e.g. replace `start` with explicit terms like `first exam` or `same day`).
- Do not run broad/global string replacements in `darkmode.js` that can accidentally alter selectors/URLs (example: `gotoStudyplanner`).
- Keep a lightweight debug reason in background-response errors (`http`, `parse_empty`, `fetch_error`) for fast diagnosis when data fails to load.
- For explicit month placement (`June`/`July`/`August`), NEVER fall back to cross-month mapping. If no same-month candidate exists, leave the course unmapped instead of showing a wrong exam date.
- Studyplanner exam mapping must be season-aware: in February 2026 (and generally non-summer months), prioritize token-based 13-week placements (F/E slots) over June/July/August 3-week rows.
- If explicit placement month exists, validate against exam text/period/date month before accepting course-code or token matches.
