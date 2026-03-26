# DTU After Dark

The unofficial browser extension for making DTU's student-facing sites easier to use.

DTU After Dark adds a consistent dark theme plus workflow tools across DTU Learn, CampusNet, Study Planner, the course catalog, grades, course evaluations, and related DTU pages. PDF viewers and video players are intentionally left untouched.

## Install

Firefox Add-ons: https://addons.mozilla.org/en-US/firefox/addon/dtu-dark-mode/

Chrome Web Store: https://chromewebstore.google.com/detail/dtu-after-dark/hemonfanogjedclfjhmkhjbkknackiel?authuser=0&hl=da

## Feature Overview

### Theme and controls

- Two-tone dark theme across supported DTU sites using `rgb(26,26,26)` and `rgb(45,45,45)`.
- Accent-color system with preset themes plus custom colors, applied across extension UI and key DTU navigation surfaces.
- Central settings modal for feature toggles, accent selection, and per-feature edit flows.
- `Paused URLs...` control for temporarily disabling the extension on specific pages without turning it off everywhere.

### DTU Learn

- Homepage widgets for live bus departures, upcoming DTU course/exam deadlines, and quick course search.
- Bus departures with multi-campus support (`DTU Lyngby`, `DTU Ballerup`, `DTU Risø`), per-line direction filters, caching, and automatic refresh.
- Library panel with live occupancy, crowding trends, upcoming events, news, and quick-access links.
- Course-card `Content` shortcut with per-course override management.
- Course content download tools for Lessons pages, including section picking and optional single-ZIP bundling.
- Book Finder that detects textbook references on Learn pages and links out to relevant sources.
- Smart Room Links that turn room mentions into click-to-resolve MazeMap links.

### CampusNet

- GPA toolkit on the Grades page: weighted GPA, projected GPA simulation, ECTS progress, and ignore/restore controls for official grade rows.
- Participant intelligence features: course composition, shared course history, Semester Twins, and Retention Radar.
- Dark mode and accent cleanup across Grades, courses, groups, participant pages, and other student-facing CampusNet views.

### Study Planner

- `Exam Schedule & Gaps` widget that maps planned courses to DTU exam dates and surfaces tight exam clusters.
- Exam-choice resolver and modal editor for switching valid exam slots, adding manual entries, or removing bad matches without losing the main timeline.
- Grade-deadline badges based on DTU's 20-workday grading window after each exam.
- Accent-aware cleanup for the top bar, planning tables, and navigation elements.

### kurser.dtu.dk and course info

- Grade statistics panel with pass-rate and grade-distribution data.
- Course evaluation summary panel with satisfaction/workload snapshots and a link to the full evaluation.
- MyLine curriculum badges such as `Mandatory`, `Core`, `Elective pool`, and `Approved elective`.
- Room Finder row with room/location enrichment plus MazeMap deep links.
- Textbook Links that parse course literature sections and add direct library and book-source links.
- Smart room linking for recognizable building/room mentions on supported pages.

### Integrations and data sources

- Deadline and exam-calendar parsing from `student.dtu.dk` and DTU exam pages.
- Library occupancy, events, and news from DTU Library and FindIt.
- MazeMap room/building resolution for smart room links.
- Rejseplanen live departure data for the bus widget.
- Local caching throughout the extension to avoid refetching on every page load.

## Supported Sites

Directly enhanced in the browser:

- `learn.inside.dtu.dk`
- `campusnet.dtu.dk`
- `studieplan.dtu.dk`
- `kurser.dtu.dk`
- `karakterer.dtu.dk`
- `evaluering.dtu.dk`
- `eksamensplan.dtu.dk`
- `sts.ait.dtu.dk`
- `sites.dtu.dk`

Used as data sources and integrations:

- `student.dtu.dk`
- `findit.dtu.dk`
- `www.bibliotek.dtu.dk`
- `sdb.dtu.dk`
- `api.mazemap.com`
- `www.rejseplanen.dk`
- `www.dtu.dk`

## Privacy and storage

- Preferences, caches, and feature state are stored locally in extension storage.
- If Participant Intelligence is enabled, participant metadata used by those features is stored locally on the device.
- Public releases do not send heartbeat or usage telemetry.
- Live features fetch data from DTU services and selected transport/map providers. See `docs/PRIVACY.md` for details.

## Disclaimer

DTU After Dark is unofficial and is not affiliated with, endorsed by, or supported by DTU, D2L/Brightspace, Rejseplanen, MazeMap, or any other provider.

Information shown by the extension, including exam dates, deadlines, grades, room locations, library data, and bus departures, may be inaccurate, incomplete, or outdated. Always verify critical information through official DTU channels.

## Build

1. Firefox: `powershell -ExecutionPolicy Bypass -File .\scripts\build-firefox.ps1`
2. Chrome: `powershell -ExecutionPolicy Bypass -File .\scripts\build-chrome.ps1`

Build artifacts are written to `dist/`.
Public source builds work as-is with the tracked safe `config.js`.
For local-only overrides, create an untracked `config.local.js`; the build scripts will overlay it into the packaged `config.js` and add the extra local host permission only to those private build artifacts.

## Notes

Future ideas are tracked in `docs/IDEAS.md`.

## License

MIT
