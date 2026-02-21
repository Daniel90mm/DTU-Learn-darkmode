# DTU After Dark

The unofficial productivity suite for the Technical University of Denmark.

DTU After Dark is a comprehensive browser extension that upgrades the DTU digital experience. It integrates disparate university systems (grades, schedules, and campus facilities) into a more unified workflow, while providing a consistent two-tier dark theme across DTU domains.

## Install

**Firefox Add-ons:** https://addons.mozilla.org/en-US/firefox/addon/dtu-dark-mode/

**Chrome Web Store:** https://chromewebstore.google.com/detail/dtu-after-dark/hemonfanogjedclfjhmkhjbkknackiel?authuser=0&hl=da

## Key Features

### Academic Intelligence
- **Weighted GPA (CampusNet):** Automatically calculates the true ECTS-weighted GPA on CampusNet grade pages, filtering out Pass/Fail courses.
- **GPA Simulator (CampusNet):** Add hypothetical grades to see a projected weighted GPA (saved locally).
- **GPA Simulator Safety Note:** The simulator includes an on-panel disclaimer reminding students to verify official grades/GPA in DTU systems.
- **ECTS Progress Bar (CampusNet):** Visualizes earned ECTS and now follows your selected accent color.
- **Study Planner Exam Cluster Detection:** Visual timeline of planned exams with a next-exam countdown and colored gap "danger zones" (<3d red, 3-7d yellow, >7d green).
- **Smart Period Filtering:** Period-aware Study Planner mapping with strict handling for summer placements (`June`/`July`/`August`).
- **Prerequisite Validator:** Cross-references course requirements with passed courses to provide visual confirmation of eligibility (Planned Feature).

### Course Planning & Logistics (`kurser.dtu.dk`)
- **Course Statistics:** Injects historical pass rates and grade distribution charts directly into course pages.
- **Course Evaluation Summary:** Fetches the latest evaluation summary from `evaluering.dtu.dk` and renders key metrics and charts.
- **MyLine Curriculum Badges (toggleable):** Marks courses as `Mandatory/Core/Elective pool/...` for your study line based on `sdb.dtu.dk/myline` (cached locally).
- **Room Finder:** Parses room/building usage via TimeEdit schedule data and shows seat-capacity hints.
- **Smart Room Links (MazeMap):** Detects room references like `Building 308, Room 016` and `308.016` across DTU pages and turns them into click-to-locate MazeMap links (resolves POI IDs lazily on click, with a search fallback).
- **Schedule Annotation:** Translates DTU schedule codes (e.g. `F3A`) into weekday/time labels in the course info table.
- **Literature Integration:** Detects literature citations/ISBN and adds direct DTU FindIt/library search links (with caching and availability hints).

### Campus Tools
- **Live Bus Departures (DTU Learn):** Real-time departures for DTU-area stops, embedded on the DTU Learn homepage (Rejseplanen API).
- **Deadlines Widget (DTU Learn):** Timeline-style deadlines list with caching and manual refresh. Compact view can show 2-3 items when they share the same due day as the next deadline.
- **Library (DTU Learn):** Nav bar entry that opens a larger settings-style modal with a quick-link grid plus live upcoming events and latest news from DTU Library (bibliotek.dtu.dk). Uses the native DTU page font, shows full fetched lists directly (no show-more toggle), and follows the selected accent in dark mode ON/OFF. Cached for 6 hours.
- **Course Content Download (DTU Learn):** Compact control under the Lessons search bar to select TOC sections and download child files on the modern `d2l-lessons-toc` structure. The older `.navigation-tree` Lessons layout is currently disabled for this feature (temporarily) to avoid unreliable folder detection/download behavior. In modern structure, the picker shows section labels with topic-page counts. Includes a nested **Bulk Download** sub-toggle in Settings and a **Single ZIP** mode (recommended) that bundles selected files into one archive instead of spawning many separate downloads.

### Participant Intelligence (CampusNet)
- **Course Composition:** On CampusNet participant pages, shows a program breakdown for **Users (students)** (ignores Administrators/Authors), with your own program highlighted in DTU red and an outlier warning if you are under 10% of the class. Automatically tries to switch the participant list to `View 1500` for accurate counts. Exchange students (`gæst udl.`) are labeled as `Exchange student`, and the `Other` bucket includes an expandable breakdown.
- **Course Composition Readability:** The Course Composition chart uses a fixed, non-accent bar palette so custom accent themes do not reduce contrast/readability.
- **Shared Course History:** Adds badges on participant pages (and a card on profile pages) showing where you have seen someone before, based on participant lists you have visited. Tooltips include course code/semester and show course names when available.
- **Shared Course History De-duplication:** Removes duplicate course entries in hover/profile history tooltips when old scans introduced repeated rows, collapses repeated course codes to the newest semester entry, and suppresses the shared-history badge on your own participant row.
- **Non-Course Intake Filter:** Participant Intelligence now ignores non-course CampusNet elements (for example groups/teams, PCB/Frilab, quizzes, labs, and experiments) during collection/backfill/tooltip rendering.
- **Archive Backfill (CampusNet):** On the CampusNet Group Archive page, you can scan archived courses to populate Shared History and Semester Twins automatically (data stays local). Optional weekly auto-scan only fetches newly discovered archived courses.
- **Semester Twins (CampusNet):** Shows a Semester Twins widget on the CampusNet frontpage, finding students with 50%+ overlap. Supports `Scope: This semester / All time`; in `This semester`, ranking strongly prioritizes overlap in your verified current-semester courses (history is used as a tie-breaker). Current-course seeding on CampusNet frontpage is now restricted to the `Courses` section (ignores `Projects/Groups`) and can auto-upgrade stale archived entries for the same course+semester. Also supports hiding your own study line (filters study-line-specific overlaps to reduce "switched study line" false positives) and a compact view (show 5/10 students).
- **Retention Radar:** Tracks **Users** enrollment counts over time per course and shows whether the latest snapshot increased or dropped.
- **Per-Feature Toggles:** Course Composition, Shared History, Semester Twins, and Retention Radar can be enabled/disabled individually under `Settings -> Social` as sub-toggles beneath the `Participant Intelligence` master switch.

### Interface Enhancements
- **Global Dark Mode:** Hand-tuned theme using `rgb(26,26,26)` and `rgb(45,45,45)` across supported DTU domains, with a customizable accent color using official DTU design-guide presets + Custom (default: `DTU Corporate Red`). Accent picker includes source link to `https://designguide.dtu.dk/colours`.
- **GPA Simulator Accent Theming:** Hypothetical GPA rows, focus states, projected GPA row, and add controls now follow the selected accent color instead of fixed blue tones.
- **GPA Projected Row Readability:** The `Projected GPA` row keeps accent background styling but uses neutral text for label/GPA/ECTS values, while delta keeps green/red gain-loss coloring.
- **GPA Summary Alignment:** `Weighted GPA` and `Projected GPA` labels use identical horizontal alignment so the two summary rows line up cleanly.
- **Accent-Safe CampusNet Icons:** Applies accent to red icon background layers while preserving white glyph/logo details.
- **Accent-Aware CampusNet Widgets:** Widget headers and reporting progress bars on CampusNet now follow the selected accent color.
- **CampusNet Accent in Light Mode:** Frontpage widget header backgrounds and nav icon circles keep the selected accent even when dark mode is OFF.
- **CampusNet Widget Icon Safety:** Header widget icon circles follow accent color while inner glyph/logo marks (for example chat bubbles) stay white for readability.
- **CampusNet Nav Icon Rendering:** Prevents dark-mode background bands on top-right stacked icons (heart/user/chat), keeping the accent circle clean with white glyphs.
- **CampusNet Category Headers:** Course/category header rows use accent-colored backgrounds with fixed white text/icons for readability.
- **CampusNet Participants Toolbar Contrast:** The participants search/More-settings toolbar (`.arc-toolbar.mb-l`) is pinned to dark 1 for cleaner contrast against surrounding panels.
- **CampusNet Participant Details Contrast:** Participant detail info boxes (`.ui-participant-informationbox` / `.ui-participant-placeholder`) are pinned to dark 2 for consistent readability.
- **Study Planner Accent Details:** Top-right bar backgrounds follow the selected accent color while separators/carets stay neutral white for readability.
- **Study Planner Exam Timeline Spacing:** Gap pills have more vertical breathing room and the timeline viewport is taller for easier scanning.
- **Semantic Status Palette:** Info/success/warning/danger visuals now use stable DTU design-guide status colors (independent from chosen accent), including exam clash-risk surfaces and status cues.
- **Lessons Sidebar Contrast:** DTU Learn TOC module triangle, title/text rail surfaces, and related utility icons are pinned to dark 1 for clearer readability.
- **Accessibility Widget Contrast (DTU Learn):** The widget content block that contains the `Accessibility` (`/was`) link is forced to dark 1 background while keeping normal text/link colors.
- **Assignments Action Bar Contrast:** DTU Learn assignment action-bar containers stay dark 1, and action buttons (for example `View History`) follow the selected accent color.
- **DTU Learn W2D Badge Contrast:** Homepage work-to-do count badges (`.d2l-w2d-count` / `.d2l-w2d-heading-3-count`) use the selected accent for background/border and automatically switch the number text between black/white for readable contrast.
- **Feature Toggles:** Most tools can be enabled/disabled from the DTU Learn homepage via `Settings` (nav bar button, also available from the gear menu).
- **Navigation Quick Links (DTU Learn, toggleable):** Adds Panopto (and CampusNet) shortcuts into the top navigation dropdowns.
- **Course Card Content Shortcut:** Hover-revealed Content shortcut button on DTU Learn course cards (toggleable).
- **Performance:** Optimized mutation handling on high-churn pages (notably `studieplan.dtu.dk` and `kurser.dtu.dk`) to avoid CPU spikes.
- **Cross-Tab Sync:** Theme (including accent color) and feature toggles are stored in extension storage so they apply across DTU tabs (tabs reload when needed).

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

## Notes / Ideas

- FTP-like sync is tracked in `docs/IDEAS.md`.

## License

MIT
