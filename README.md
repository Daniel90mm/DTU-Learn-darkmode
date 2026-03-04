# DTU After Dark

The unofficial productivity suite for the Technical University of Denmark.

DTU After Dark is a comprehensive browser extension that upgrades the DTU digital experience. It integrates disparate university systems (grades, schedules, and campus facilities) into a more unified workflow, while providing a consistent two-tier dark theme across DTU domains.

## Install

**Firefox Add-ons:** https://addons.mozilla.org/en-US/firefox/addon/dtu-dark-mode/

**Chrome Web Store:** https://chromewebstore.google.com/detail/dtu-after-dark/hemonfanogjedclfjhmkhjbkknackiel?authuser=0&hl=da

## Key Features

### Academic Intelligence
- **CampusNet GPA Toolkit:** Weighted GPA, projected GPA simulation, ECTS progress tracking, and ignore/restore controls for official grade rows that should not count.
- **Study Planner Exam Timeline:** Exam clustering with countdown and gap-risk signaling, plus ambiguous-slot resolution and manual timeline editing from the widget header in a blurred modal editor with theme-neutral controls.
- **Smarter Exam Mapping:** Period-aware matching with strict handling of explicit summer placements (`June`/`July`/`August`).
- **Planned:** Prerequisite validator based on passed courses and stated requirements.

### Course Planning & Logistics (`kurser.dtu.dk`)
- **Course Intelligence:** In-page pass/grade stats and latest course-evaluation summaries.
- **Prerequisite + Workload Helper:** API-backed prerequisite groups, teaching hours, and teaching-team mix on course pages.
- **MyLine Curriculum Badges:** Optional `Mandatory/Core/Elective/...` tagging from `sdb.dtu.dk/myline`.
- **Room + Location Utilities:** Room finder, capacity hints, and smart MazeMap links.
- **Schedule + Literature Helpers:** Schedule code annotation and literature/ISBN lookup with library links.

### Campus Tools
- **Live Bus Departures (DTU Learn):** Real-time departures on the homepage with campus-aware line setup and API-friendly request budgeting.
- **Campus-Aware Bus Configuration:** Multi-campus setup (`DTU Lyngby`, `DTU Ballerup`, `DTU Riso`) with campus-tagged lines, API-friendly limits, and cleaned local/static direction selection in the edit modal.
- **Deadlines Widget:** Timeline-style deadline view with caching and refresh.
- **Library Panel:** Quick links plus live DTU Library occupancy, events, and news in an extension modal.
- **Library Crowding Intelligence:** Occupancy status, live crowding chart surfaces, and DTU Library event-time overlays when data is available.
- **Course Content Download:** Lessons section picker with bulk and optional single-ZIP download.

### Participant Intelligence (CampusNet)
- **Course Composition:** Program distribution for student participants with outlier highlighting.
- **Shared Course History:** Local history badges/cards showing where you have seen participants before.
- **Semester Twins:** Similar-student matching with semester/all-time scopes.
- **Retention Radar:** Enrollment trend tracking by course over time.
- **Archive Backfill + Granular Toggles:** Optional archive scanning and per-module on/off controls.

### Interface Enhancements
- **Global Dark + Accent System:** Two-tier dark palette (`rgb(26,26,26)` / `rgb(45,45,45)`) with DTU-style accent presets and custom colors.
- **Cross-Site Accent Theming:** Consistent accent behavior across DTU Learn, CampusNet, and Study Planner.
- **DTU Learn Visual Cleanup:** Better contrast for sidebars, mobile navigation, selected states, badges, notifications, and action areas.
- **DTU Learn Legacy Assignments Stability:** Legacy Assignments/Dropbox pages avoid the heaviest Brightspace shadow/observer passes so they stay responsive, and assignment title/status rows are kept on dark 2 for readable contrast.
- **DTU Learn Upload Area Override:** File drop/add panel (`.d2l-fileinput-add`) now supports explicit forced background styling when Brightspace/default darkening overrides normal selectors.
- **DTU Learn File-Link Exception:** Direct file download links (`/d2l/common/viewFile.d2lfile/...`) are excluded from boxed breadcrumb-link background styling to preserve normal link appearance.
- **Configurable Navigation & Shortcuts:** Quick links, content shortcut button, and per-course content overrides.
- **Unified Settings Experience:** Grouped settings, edit modals, feedback shortcut, and a first-run Learn homepage hint that points new users to the settings/toggles entry point.
- **Performance + Sync:** Optimized mutation handling and cross-tab theme/toggle sync.

## Supported Domains

### Content script domains (theme/features run directly on page)

- `learn.inside.dtu.dk` (DTU Learn)
- `s.brightspace.com` (Brightspace static assets/iframes)
- `sts.ait.dtu.dk` (DTU login)
- `studieplan.dtu.dk` (Study Planner)
- `kurser.dtu.dk` (Course catalog)
- `evaluering.dtu.dk` (Course evaluations)
- `campusnet.dtu.dk` (CampusNet)
- `karakterer.dtu.dk` (Grades)
- `eksamensplan.dtu.dk` (Exam plan portal)
- `sites.dtu.dk` (Department sites)

### Data-source/API domains (fetched by extension features)

- `findit.dtu.dk` (FindIt availability checks and library links)
- `student.dtu.dk` (Deadlines and exam-date sources)
- `sdb.dtu.dk` (Study line data for MyLine Curriculum Badges)
- `www.bibliotek.dtu.dk` (Library events/news API)
- `www.dtu.dk` (exam-date fallback sources)
- `api.mazemap.com` (Smart Room Links POI resolution)
- `www.rejseplanen.dk` (bus departure API)

## Privacy & Security

Security/privacy audit completed on **February 18, 2026**.

- **Audit Result:** No analytics/telemetry SDKs found. No remote code loading (`eval`/`new Function`) found.
- **Local Storage:** Preferences and caches are stored locally. If Participant Intelligence is enabled, local participant metadata (names, s-numbers, programs, overlap/snapshot data) may be stored for those features.
- **Direct Connections:** The extension fetches feature data from DTU domains plus Rejseplanen and MazeMap, and does not send participant metadata to third-party analytics services.
- **Known Risk (Open):** Rejseplanen uses a bundled API key in release builds. This can be extracted and abused for quota exhaustion; mitigation is tracked in the audit notes.
- **Open Source:** Full source is available for inspection.

See `docs/PRIVACY.md`.

## Disclaimer

DTU After Dark is an unofficial, community-built extension. It is not affiliated with, endorsed by, or supported by DTU, Arcanic, D2L/Brightspace, Rejseplanen, MazeMap, or any other service provider.

Information displayed by this extension (exam dates, deadlines, grades, GPA calculations, bus times, course evaluations, room locations, library data) is derived from publicly available sources and may be inaccurate, incomplete, or outdated. **Always verify critical information through official DTU channels.** The developer(s) accept no responsibility for missed exams, wrong grades, missed buses, or any other consequences. This extension is provided "as is" without warranty of any kind.

## Build Instructions

1. **Firefox:** `powershell -ExecutionPolicy Bypass -File .\\scripts\\build-firefox.ps1`
2. **Chrome:** `powershell -ExecutionPolicy Bypass -File .\\scripts\\build-chrome.ps1`

Output artifacts are generated in `dist/`.
Before building release zips and bumping version numbers, update `changes.md` with shipped changes/reviewer notes.

## Notes / Ideas

- FTP-like sync is tracked in `docs/IDEAS.md`.

## License

MIT




