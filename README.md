# DTU After Dark

**The unofficial productivity suite for the Technical University of Denmark.**

DTU After Dark is a comprehensive browser extension that upgrades the DTU digital experience. It integrates disparate university systems (grades, schedules, and campus facilities) into a more unified workflow, while providing a consistent two-tier dark theme across DTU domains.

## Install

**Firefox Add-ons:** https://addons.mozilla.org/en-US/firefox/addon/dtu-dark-mode/

**Chrome Web Store:** *Coming soon*

## Key Features

### Academic Intelligence
- **Weighted GPA (CampusNet):** Automatically calculates the true ECTS-weighted GPA on CampusNet grade pages, filtering out Pass/Fail courses.
- **GPA Simulator (CampusNet):** Add hypothetical grades to see a projected weighted GPA (saved locally).
- **Study Planner Exam Cluster Detection:** Visualizes planned exams and highlights same-day or tightly clustered exam days.
- **Smart Period Filtering:** Period-aware Study Planner mapping with strict handling for summer placements (`June`/`July`/`August`).
- **Prerequisite Validator:** Cross-references course requirements with passed courses to provide visual confirmation of eligibility (Planned Feature).

### Course Planning & Logistics (`kurser.dtu.dk`)
- **Course Statistics:** Injects historical pass rates and grade distribution charts directly into course pages.
- **Course Evaluation Summary:** Fetches the latest evaluation summary from `evaluering.dtu.dk` and renders key metrics and charts.
- **Room Finder:** Parses room/building usage via TimeEdit schedule data and shows seat-capacity hints.
- **Schedule Annotation:** Translates DTU schedule codes (e.g. `F3A`) into weekday/time labels in the course info table.
- **Literature Integration:** Detects literature citations/ISBN and adds direct DTU FindIt/library search links (with caching and availability hints).

### Campus Tools
- **Live Bus Departures (DTU Learn):** Real-time departures for DTU-area stops, embedded on the DTU Learn homepage (Rejseplanen API).
- **Deadlines Widget (DTU Learn):** Timeline-style deadlines list with caching and manual refresh.

### Interface Enhancements
- **Global Dark Mode:** Hand-tuned theme using `rgb(26,26,26)` and `rgb(45,45,45)` across supported DTU domains, with DTU red accents.
- **Feature Toggles:** Most tools can be enabled/disabled from the DTU Learn homepage via `Admin Tools` -> `DTU After Dark`.
- **Course Card Content Shortcut:** Hover-revealed Content shortcut button on DTU Learn course cards (toggleable).
- **Performance:** Optimized mutation handling on high-churn pages (notably `studieplan.dtu.dk` and `kurser.dtu.dk`) to avoid CPU spikes.
- **Cross-Tab Sync:** Theme/feature toggles are stored in extension storage so they apply across DTU tabs (tabs reload when needed).

## Supported Domains

The extension automatically activates on these DTU-related hosts:
- `learn.inside.dtu.dk` (DTU Learn)
- `s.brightspace.com` (Brightspace static assets/iframes)
- `sts.ait.dtu.dk` (DTU login)
- `studieplan.dtu.dk` (Study Planner)
- `kurser.dtu.dk` (Course catalog)
- `evaluering.dtu.dk` (Course evaluations)
- `campusnet.dtu.dk` (CampusNet)
- `karakterer.dtu.dk` (Grades)
- `findit.dtu.dk` (Library search hints)
- `student.dtu.dk` (Deadlines/exam-related info used by some features)
- `sites.dtu.dk` (Department sites)

## Privacy & Security

No personal data is collected, stored, or transmitted by DTU After Dark.
- **Local Storage:** Preferences (including the GPA simulator entries and bus settings) are stored locally in your browser.
- **Direct Connections:** Requests for bus times go directly to the public Rejseplanen API. Some course tools fetch from DTU domains to render summaries.
- **Open Source:** The full source code is available in this repository for audit.

See `docs/PRIVACY.md`.

## Build Instructions

1. **Firefox:** `powershell -ExecutionPolicy Bypass -File .\\scripts\\build-firefox.ps1`
2. **Chrome:** `powershell -ExecutionPolicy Bypass -File .\\scripts\\build-chrome.ps1`

Output artifacts are generated in `dist/`.

## Notes / Ideas

- FTP-like sync is tracked in `docs/IDEAS.md`.

## License

MIT

