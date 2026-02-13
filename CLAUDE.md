I am a student at DTU (technical university of denmark). 

I want a dark mode firefox extension that darkens the wanted pages i give.

I want not complete darkness, of course showing links, some color, like DTU red, which is a signature color which has to be there.

PDF, video players should not be darkened.

When i say very dark or dark 1, i mean rgb(26,26,26).

When i say less dark or dark 2, i mean rgb(45,45,45).

I do not understand HTML, css, javascript, no web dev stuff, so if you cant darken something i want, give me clear instructions on what to give you so you can darken it.

when i copy something from the "inspect element" page, i will copy the html code with "Copy Outer HTML".

No emojis unless asked for


## Project Instructions (Mirrors AGENTS.md)

The section below mirrors the contents of `AGENTS.md` so an assistant reading only `CLAUDE.md` still gets the full project context and bug memory.

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
**Room data refresh (May & November each year):** Re-scrape TimeEdit for the upcoming semester's room assignments and replace `data/rooms_spring_YYYY.json` (or `data/rooms_fall_YYYY.json`). Update the filename reference in `darkmode.js` (`loadRoomFinderData`) and both manifests' `web_accessible_resources`. Use the browser console scraping script documented in `memory/timeedit.md`.


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
- **CRITICAL**: On kurser.dtu.dk, avoid cookie-bearing fetches during page load. kurser.dtu.dk uses ASP.NET with serialized session state; concurrent cookie-bearing requests can trigger server-side crashes (500 errors). Prefer `credentials: 'omit'` for public endpoints; if the anonymous `/info` fetch returns a tiny stub, retry once with `credentials: 'same-origin'` only after `document.readyState === 'complete'` (delayed) to reduce crash risk.
- In Firefox content scripts, `fetch()` with relative URLs resolves against the extension origin (`moz-extension://...`), not the page origin. Always use `window.location.origin + path` for same-origin fetches.
- The `PercentageResult` div on evaluering.dtu.dk sits outside the minimal `CourseResultsPublicContainer` regex match. Search for it in the full HTML or use a fallback calculation from respondents/eligible.


## DTU Domain Recon Notes (2026-02-12)

We ran a light, non-invasive recon to discover DTU subdomains and public endpoints that could improve this extension (student-focused QoL). The goal is to find stable, public information sources (deadlines, course data, rules) and integrate them with strong caching and minimal requests.

### What Was Done
- Queried `crt.sh` for certificate transparency entries matching `%.dtu.dk` and extracted hostnames.
- Tested basic HTTPS liveness (status code + final URL) for each host.
- Spot-checked `robots.txt` for a few relevant hosts to find sitemaps / disallow rules.
- Saved outputs into `dtu_recon_output/` (now gitignored).

Files produced (local):
- `dtu_recon_output/dtu_hosts.txt` raw host list (from crt.sh)
- `dtu_recon_output/dtu_hosts_live.csv` liveness results (status/final URL)
- `dtu_recon_output/top_candidates.txt` heuristic "top candidates" list (keyword scoring)

### robots.txt / Sitemap Findings
- `www.dtu.dk/robots.txt`:
  - Has `Sitemap: https://www.dtu.dk/sitemap.xml`
  - Disallows multiple CMS/internal paths (`/sitecore/`, `/upload/`, etc.)
  - Crawl-delay is `10` for `User-agent: *`, but `1000` for `GPTBot`, `ClaudeBot`, `GoogleOther` (so do not treat this as crawl-friendly).
- `www.student.dtu.dk/robots.txt`:
  - `Disallow: /` (no crawling)
  - `/sitemap.xml` returned `404` when tested.
- `kurser.dtu.dk/robots.txt`:
  - `Sitemap: http://kurser.dtu.dk/sitemap.xml`
- `findit.dtu.dk/robots.txt`:
  - Disallows `/catalog`, `/en/catalog`, `/da/catalog`, and several functional paths (`/resolve`, `/login`, etc.)
  - Implication: avoid automated crawling of catalog pages; prefer user-initiated navigation or extremely low-rate lookups with caching.

### Live Hostnames Found (from `dtu_hosts_live.csv`)
These hosts responded to a basic HTTPS request at the time of the scan:
- `adk.dtu.dk`
- `asdc.space.dtu.dk`
- `auth.dtu.dk`
- `auth.findit.dtu.dk`
- `auth2.dtu.dk`
- `beyondborders.dtu.dk`
- `bim.cas.dtu.dk`
- `bio.dtu.dk`
- `biosustain.dtu.dk`
- `chat.dtu.dk`
- `cloud-t1.eitlab.diplom.dtu.dk`
- `compute.dtu.dk`
- `computerome.dtu.dk`
- `connect.bbar.dtu.dk`
- `crypto-party.it.env.dtu.dk`
- `data.dtu.dk` (returned `202` in scan)
- `databarprint.dtu.dk`
- `designguide.dtu.dk`
- `dtusps.dtu.dk`
- `ebdrup.biosustain.dtu.dk`
- `eis.dtu.dk`
- `energy.dtu.dk`
- `env.dtu.dk`
- `fangstjournalen.dtu.dk`
- `features.dtu.dk`
- `findit.dtu.dk`
- `food.dtu.dk`
- `fotonik.dtu.dk`
- `ftp.space.dtu.dk`
- `fysik.dtu.dk`
- `gitlab.dtusat.dtu.dk`
- `guest.dtu.dk`
- `guestresearcher.dtu.dk`
- `hafnium.prg.dtu.dk`
- `healthtech.dtu.dk`
- `ihkkursusarkiv.dtu.dk`
- `inside.dtu.dk`
- `kemi.dtu.dk`
- `keys.env.dtu.dk`
- `kt.dtu.dk`
- `kurser.dtu.dk`
- `labbook.qpit.fysik.dtu.dk`
- `learnsupport.dtu.dk`
- `lifelonglearning.dtu.dk`
- `limestone.env.dtu.dk`
- `mad7.ebdrup.biosustain.dtu.dk`
- `man.dtu.dk`
- `man-vm-datachal1.win.dtu.dk`
- `mathcore.dtu.dk`
- `nutech.dtu.dk`
- `nyauth.dtu.dk`
- `optag.dtu.dk`
- `pages.windenergy.dtu.dk`
- `password.dtu.dk`
- `portalen.dtu.dk`
- `qsarmodels.food.dtu.dk`
- `shb.dtu.dk`
- `svn.dtusat.dtu.dk`
- `timesheet.adm.dtu.dk`
- `video.dtu.dk`
- `wiki.qpit.fysik.dtu.dk`
- `winbar.dtu.dk`
- `windenergy.dtu.dk`
- `www.adgangskursus.dtu.dk`
- `www.alumni.dtu.dk`
- `www.aqua.dtu.dk`
- `www.bibliotek.dtu.dk`
- `www.bioengineering.dtu.dk`
- `www.biosustain.dtu.dk`
- `www.brand.dtu.dk`
- `www.cee.elektro.dtu.dk`
- `www.cere.dtu.dk`
- `www.chat.dtu.dk`
- `www.dtu.dk`
- `www.energy.dtu.dk`
- `www.entrepreneurship.dtu.dk`
- `www.fangstjournalen.dtu.dk`
- `www.food.dtu.dk`
- `www.fysik.dtu.dk`
- `www.hackerlab.dtu.dk`
- `www.healthtech.dtu.dk`
- `www.hpc.dtu.dk`
- `www.iciee.byg.dtu.dk`
- `www.imm.dtu.dk`
- `www.impact.env.dtu.dk`
- `www.inside.dtu.dk`
- `www.kemi.dtu.dk`
- `www.kt.dtu.dk`
- `www.kurser.dtu.dk`
- `www.learnsupport.dtu.dk`
- `www.lifelonglearning.dtu.dk`
- `www.man.dtu.dk`
- `www.mathcore.dtu.dk`
- `www.nanolab.dtu.dk`
- `www.optag.dtu.dk`
- `www.prg.dtu.dk`
- `www.scienceshow.dtu.dk`
- `www.shb.dtu.dk`
- `www.shb2002.dtu.dk`
- `www.skylab.dtu.dk`
- `www.space.dtu.dk`
- `www.staff.dtu.dk`
- `www.student.dtu.dk`
- `www2.imm.dtu.dk`

Some student-relevant targets returned `ERR` during the scan (often due to auth requirements, redirects, or HEAD being blocked) but are still real targets for the extension when the user is logged in:
- `learn.inside.dtu.dk`
- `campusnet.dtu.dk`
- `cn.inside.dtu.dk`
- `beta.inside.dtu.dk`

### "Top Candidates" (Heuristic)
From `top_candidates.txt`, the scan highlighted:
- `portalen.dtu.dk`
- `inside.dtu.dk`
- `kurser.dtu.dk`
- `findit.dtu.dk` / `auth.findit.dtu.dk`
- `learnsupport.dtu.dk`
- `lifelonglearning.dtu.dk`
- `www.bibliotek.dtu.dk`
- `www.student.dtu.dk`

### Concrete Public Pages Confirmed Useful (student.dtu.dk)
These are public HTML pages with stable, parseable structure (main content often in `.o-rich-text`):
- Course registration deadlines:
  - `https://student.dtu.dk/en/courses-and-teaching/course-registration/course-registration-deadlines`
- Exam registration/withdrawal deadlines:
  - `https://student.dtu.dk/en/exam/exam-registration/-deadlines-for-exams`
- Deadlines for grading (study rules):
  - `https://student.dtu.dk/en/rules/exam/deadlines-for-grading`

These pages include multi-year data (e.g., 2026-2028). Any deadline UI must filter to the nearest upcoming items and avoid showing far-future noise by default.

### How To Use These Findings (Safely)
- Prefer "single-page fetch + cache" (e.g., once per 24h, plus manual refresh).
- Avoid crawling or spidering. Use sitemaps only for manual exploration and very targeted, rate-limited selection of a small set of pages.
- Treat `robots.txt` disallow rules as guidance: do not automate heavy access to disallowed paths (notably `findit.dtu.dk` catalog URLs).
- ERR during liveness checks does not mean "dead"; it often means "login required" or "HEAD blocked".


## Future Feature Roadmap

### Course Evaluation Integration (Priority: High)
- Integrate data from `evaluering.dtu.dk` -- another student already built a tool that gathers course info in one place, so we can do the same.
- Goal: surface course evaluation scores (average rating, workload burden, "I have learned a lot", etc.) directly on `kurser.dtu.dk` course pages and potentially on DTU Learn course pages.
- Needs investigation: URL patterns on evaluering.dtu.dk, whether data is publicly accessible or requires auth, what the page structure looks like for scraping.

### Room Finder / MazeMap Integration (Priority: High, partially done)
- Room Finder is live on `kurser.dtu.dk` course pages, showing rooms as inline pills in the course info table (after the "Location" row).
- Data source: **TimeEdit** -- scraped per semester via browser console script (see `memory/timeedit.md`). Static JSON shipped with the extension (`data/rooms_spring_2026.json`).
- **Room capacity data** is available in the JSON (seat counts per room) but currently hidden from the UI. Consider showing it later if users want it (e.g., as a tooltip or optional detail).
- **MazeMap deep-links**: not yet implemented. MazeMap has no public API, but deep-links to building/room views may work. Future feature.

### Library Section (Priority: High, blocked on API key)
- The person who manages the DTU library sensors is on vacation. Once back, we get an API key for live sensor data.
- Data available: **CO2 levels, noise/loudness, occupancy** for library spaces.
- Can also scrape **group room booking data** to show availability.
- Combined, this creates a "Library" section in the extension showing:
  - Real-time occupancy per library zone (how crowded is it?)
  - Noise levels (quiet zones vs. busy areas)
  - CO2 / air quality
  - Group room availability (free rooms, next available slot)
- This would be a standalone widget/panel, similar to the bus departures widget.

### Dark Mode Expansion
- Several student-facing sites from the recon could get dark mode support:
  - `findit.dtu.dk` -- students land here from textbook links
  - `www.student.dtu.dk` -- deadlines source, students visit directly
  - `portalen.dtu.dk` -- DTU portal (scored highest in recon)
  - `inside.dtu.dk` / `www.inside.dtu.dk` -- DTU Inside intranet
  - `www.bibliotek.dtu.dk` -- library homepage
  - `password.dtu.dk` -- visited at least once per semester
- `chat.dtu.dk` is a very old basic chatroom (CampChat) -- not worth darkening unless someone asks.
- Mostly just adding `content_scripts` entries + verifying existing CSS works.

### Quick Links Widget (Priority: Low)
- Small collapsible widget on DTU Learn homepage with one-click links to grades, study planner, course catalog, library, student info, evaluations.
- Not a priority but easy to add later.

### Course Info Tooltips on Study Planner (Priority: Maybe)
- Hovering over a course code on `studieplan.dtu.dk` shows a tooltip with ECTS, exam form, language, schedule from `kurser.dtu.dk`.
- Saves round-tripping between planner and catalog.
- Big maybe -- depends on whether the tooltip UX feels right.

### Static Pre-computed Data via GitHub Actions (Future Infrastructure)
- Instead of having the extension scrape DTU sites live, use a **GitHub Actions cron job** that runs daily/weekly to scrape public data and produce static JSON files.
- Host the JSON on **GitHub Pages** or **Cloudflare R2** (zero egress costs).
- The extension fetches a single pre-built JSON file -- fast, reliable, no live scraping.
- Candidate datasets for this approach:
  - Course evaluation summaries from `evaluering.dtu.dk` (all courses, pre-aggregated)
  - TimeEdit room/building mappings per course (when room finder is built)
  - Course metadata index from `kurser.dtu.dk/sitemap.xml`
- **Why this works**: no new permissions needed if hosted under a controlled domain, no privacy implications, no user data, no backend to maintain. Store reviewers see a single static-file fetch.
- **Why not now**: the first evaluation integration should be done client-side (background.js fetch + parse) to validate the approach. Once stable, we can optionally migrate to pre-computed data for performance.

### Course Evaluation Integration -- Technical Design
- **URL discovery problem**: `evaluering.dtu.dk/kursus/{courseCode}/{evalId}` has an unpredictable `evalId` (sequential count across all courses/semesters). Cannot be computed from course code alone.
- **Solution**: fetch the evaluation listing page first (`evaluering.dtu.dk/kursus/{courseCode}`) which lists all available evaluations with clickable links containing the evalId. Parse the listing to find the most recent evaluation URL, then fetch that.
- **Architecture**: same pattern as grade stats -- background.js handles cross-origin fetch, content script on `kurser.dtu.dk` requests data via message passing.
- **Manifest change**: add `https://evaluering.dtu.dk/*` to permissions.
- **Data to extract from evaluation page**:
  - Response rate (respondents / eligible, e.g. 28/102 = 27.72%)
  - Question 1.1: "I have learned a lot" (5-point Likert: Helt uenig..Helt enig)
  - Question 1.2: "Teaching aligns with learning objectives"
  - Question 1.3: "Teaching motivates me"
  - Question 1.4: "Opportunity for feedback"
  - Question 1.5: "Clear expectations"
  - Question 2.1: Workload vs expected (Meget mindre..Meget mere)
  - Convert Likert distributions to weighted averages (1-5 scale)
- **Display**: inject a summary panel on `kurser.dtu.dk/course/{code}` alongside the existing grade stats panel. Show key metrics at a glance (average scores, response rate, workload assessment).
- **Caching**: cache evaluation data in extension storage with 24h TTL (evaluations don't change frequently).

### Rejected / Deprioritized Ideas
- **Course prerequisite warnings**: tried before, but many lecturers don't use prerequisites correctly in the system, making warnings unreliable/misleading.
- **ECTS progress tracker**: already covered by the GPA Simulator feature.
- **Exam complaint deadline / grading rules reference**: low value, students rarely need this inline.
- **chat.dtu.dk dark mode**: ancient CampChat system, not worth the effort unless requested.
