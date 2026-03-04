# Ideas (Not Implemented)

## Screenshot-Driven Ideas (2026-02-23)

### DTU Learn (Assignments/Quizzes)
- Add a compact "Due Soon" strip above assignment/quiz lists (for example: overdue, due in 24h, due this week).
- Add one-click filters: `Not submitted`, `Has feedback`, `Attempt left`.
- Add a local "pin important activity" marker so students can track key quizzes/assignments across courses.

### Studyplanner
- Add drag-and-drop safety UX in Basket/course rows: clearer drop placeholder + temporary lock option to prevent accidental moves.
- Add "ECTS balance by term" helper badge (warn when a term is heavy/light versus target ECTS).
- Add quick jump buttons to `Current term`, `First missing prerequisite`, and `Next exam-risk item`.

### CampusNet Participants
- Add participant list quality-of-life tools: compact mode (smaller avatars), quick letter jump, and sticky mini filter bar.
- Add "copy selected emails" utility with role filters (`Users`, `Administrators`, etc.) for group coordination.
- Add local notes/tags on participants (private, per course) to help remember project preferences or past collaboration.

### student.dtu.dk Portal
- Add optional "Student Home Helper" card with direct links to high-traffic pages (exam dates, registration deadlines, study rules).
- Add optional timeline extraction from notices/news posts (highlight date-critical announcements first).
- Add one-click language consistency toggle per page section where mixed DA/EN content appears.

### eksamensplan.dtu.dk
- Add exam table enhancer: local countdown badges (`x days left`) and exam type chips.
- Add conflict helper for same-day or tight-gap exams (local warning banner, similar to Studyplanner risk colors).
- Add export helpers: copy exam rows as text and optional `.ics` calendar export.

## Rejseplanen API Opportunities (2026-02-24)
- Add explicit real-time state tags per departure: `On time`, `Delayed +N`, `Cancelled` (using `rtTime`, `rtDate`, `cancelled`, `prognosisType`).
- Add a compact "next stops" popover for each bus line using `JourneyDetailRef` -> `journeyDetail`.
- Use `lineinfo` / `linematch` refresh task (manual or scheduled) to keep hardcoded direction presets synced with canonical destination names.
- Consider replacing per-stop calls with `multiDepartureBoard` / `nearbyDepartureBoard` to reduce API call count further.
- Optional advanced mode: show live vehicle progress using `journeypos` where available.

## DTU Course Catalog API Opportunities (2026-03-03)

The course catalog exposes a full SOAP/HTTP-GET API at `kurser.dtu.dk/coursewebservicev2/course.asmx`.
Full schema documented in `memory/kurser_api.md`. Key call: `GetCourseNewestPublic?courseCode=XXXXX`.
Always use `credentials: 'omit'` — concurrent cookie-bearing requests crash ASP.NET session.
Cache aggressively; catalog data changes at most once per year per course.

### A. Course Info Panel on kurser.dtu.dk (extension to existing grade/eval panels)
Currently we already inject a grade-stats panel and (planned) an eval panel on course pages.
With this API we can enrich the same panel without any new permissions (same-origin fetch):

- **Literature / textbook** (`Course_Literature`) — surface the reading list directly on the page instead of buried in the description. Very useful for lecturers checking course materials.
- **Teacher type split** (`TeacherTypesDistribuition`) — % permanent staff vs TA vs part-time. Interesting signal for course quality.
- **Credit exclusion warning** (`No_Credit_Points_With`) — highlight courses the student cannot take if they've already taken this one. Cross-link to those course pages.
- **Last-updated timestamp** (`LastUpdated` attr on `<Course>`) — show when the course description was last edited. Useful signal for how current the info is.
- **Green Challenge badge** (`DTU.GroenDyst.ParticipationKey`) — small badge if eligible.
- **Previous course link** (`Previous_Course` element, when present) — link to the predecessor course.
- **Course type / offered as** (`CBS_Programme_Level`, `Open_University`) — show BSc/MSc/PhD/Diplom badge and open university indicator.

### B. DTU Learn Course Page Widget
On `learn.inside.dtu.dk` course pages the student sees the LMS but no quick ref to the catalog.
Inject a collapsible sidebar card (similar to the bus widget) pulling from `GetCourseNewestPublic`:

- ECTS + schedule slots (E3A / F4A etc.)
- Exam type + grading scale + allowed aids
- Literature (if set)
- Learning objectives (bullet list)
- Academic prerequisites (qualified + mandatory, with course code links)
- Direct link to the kurser.dtu.dk course page
- Responsible persons with mailto: links
- No new permissions needed (background.js cross-origin fetch already used for other things).

### C. Prerequisite Chain on Studyplanner
`studieplan.dtu.dk` shows courses but no prerequisite graph. Using `GetCourseNewestPublic` per course:

- Annotate each course row with its `Qualified_Prerequisites.DTU_CoursesTxt` (course codes).
- Highlight in red/orange if a prerequisite course is missing from the plan.
- Extend the existing exam-risk coloring system to also cover prerequisite risk.
- This is the "Course Info Tooltips" idea from CLAUDE.md roadmap, now with a concrete data source.

### D. "All Courses by This Person" on kurser.dtu.dk
When viewing a responsible-person entry on a course page, add a link that calls
`GetCourseResponsiblesCoursesInOpenVolumes` or `GetTeacherCoursesInCurrentAndPriorYear`
and shows a popover listing all their other courses. Useful for lecturers to cross-check their own catalog entries, and for students to find related courses by the same person.

### E. Bulk Static Data via GitHub Actions (pre-compute all courses)
Using `GetCoursesByDepartment` for all 25 department IDs → get every current course code.
Then batch `GetCourseNewestPublic` per code → build a complete course metadata JSON.
Host on GitHub Pages (free, zero egress cost). Extension fetches one static file.
Candidate data to pre-compute:
- `{courseCode: {ects, title_en, title_da, schedule, exam_type, grading, aids, literature, prerequisites, credit_exclusions, last_updated}}`
- Update via GitHub Actions cron weekly (course data rarely changes mid-semester).
- Would power instant course lookups on DTU Learn and Studyplanner without live API calls.

### F. Lecturer-Facing Tools (lecturer suggested this API)
The API has several fields of direct value to course coordinators:

- **`GetCourseTeachersList` / `GetCourseTeachersAndSuperusersList`** — full list of TAs and teachers with CampusNet IDs. Useful for coordinators to audit who has access.
- **`GetCourseResponsibleList`** — full history of who was responsible for a course across all years. Useful for institutional memory / handover.
- **`GetDataForGradeEntry` / `GetCourselistForExamReporting`** — administrative feeds; worth exploring if accessible without token, as they could power grading workflow helpers.
- **`GetCourseResponsiblesCoursesInSpecificVolume`** — exam reporting data per person per year.
- Potential standalone page/tool for lecturers: enter your DTU PersonKey or email, see all your courses across years with edit timestamps, teacher splits, and link to each catalog entry.

### G. Credit Exclusion Checker
A small popup/sidebar on kurser.dtu.dk: "Check my exclusions". Student pastes in their taken course codes; the tool fetches each course's `No_Credit_Points_With` field and warns about overlaps. Useful when planning electives.

### H. Course Duration Filter on Studyplanner
The API's `Course_Duration.Exact` (ISO 8601: `P0M` = 3-week block, `P6M` = semester, `P12M` = full year) could be used to:
- Badge courses in the studyplanner by duration type.
- Warn when a student stacks multiple full-year courses (heavy load).

### I. "Is This Course Still Offered?" Detection
`GetCourseNewestPublic` returns the course at its latest volume. If `Volume` is significantly older than the current year, or if `DTU_Remark` contains phrases like "last time" / "nedlægges" / "closed", flag the course as potentially discontinued. Could be surfaced on kurser.dtu.dk and studieplan.dtu.dk.

---

## FTP-Like Sync / Export
Direct `ftp://` is not realistically usable from a modern browser extension (no `fetch()` support; deprecated/blocked by browsers).

If we want "FTP-style" syncing anyway, these are viable approaches:
- Export/import settings as a `.json` file (no server).
- HTTPS sync to a small API you host (the API stores your settings and returns them on other devices).
- HTTPS-to-FTP/SFTP bridge: the extension talks to your server over HTTPS; your server uploads/downloads via FTP/SFTP.
- Native Messaging helper app that does FTP/SFTP locally (powerful, but harder to distribute via stores).

