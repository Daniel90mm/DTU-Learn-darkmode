# DTU After Dark

Dark mode for DTU Learn and other DTU sites.

## Install

**Firefox Add-ons:** https://addons.mozilla.org/en-US/firefox/addon/dtu-dark-mode/

**Chrome Web Store:** *Coming soon*

## Features

### Dark Mode
- Two-tier dark theme (#1a1a1a / #2d2d2d) across all DTU sites, toggleable from the homepage
- Shadow DOM support for Brightspace custom elements (`d2l-*`)
- Full CampusNet darkening (frontpage, grades, sidebar, widgets, participants)
- Custom DTU logo replacement
- Preserves syntax highlighting, code editor colors, and service icons

### GPA Tools
- Weighted GPA calculation on CampusNet grade pages (ECTS-weighted, skips pass/fail)
- Grade summary row on CampusNet grade pages for quick weighted GPA overview
- GPA Simulator - add hypothetical grades to see projected GPA (saved across sessions)

### Course Catalog Tools
- Course grade statistics on `kurser.dtu.dk` course pages
- Textbook Linker on `kurser.dtu.dk` course pages: detects literature citations/ISBN and adds per-item `Check Library` links to DTU Library search
- Textbook Linker also adds `Google Books` search badges for broader catalog coverage
- Automatic library availability hint: badge upgrades to `Free PDF` when DTU Library result indicates online access

### Bus Departures (Rejseplanen)
- Live bus departure times for DTU-area stops, displayed directly in DTU Learn
- Configurable bus lines and directions (150S, 300S, 40E, 15E, 193)
- Real-time delay indicators (green = on time, orange = delayed)
- 60-second auto-refresh with smart caching
- Setup wizard and configuration modal for personalized routes

### Quality of Life
- Content shortcut buttons on course cards (hover to reveal, links directly to course content)
- Lightweight - pure CSS + JS, no dependencies

## Supported Sites

- `learn.inside.dtu.dk` - DTU Learn (Brightspace LMS)
- `s.brightspace.com` - Brightspace static assets (iframes)
- `sts.ait.dtu.dk` - DTU login page
- `evaluering.dtu.dk` - DTU course evaluations
- `studieplan.dtu.dk` - DTU study planner
- `kurser.dtu.dk` - DTU course catalog
- `karakterer.dtu.dk` - DTU grades
- `sites.dtu.dk` - DTU department sites
- `campusnet.dtu.dk` - CampusNet grades

## Privacy

No personal data is collected, stored, or transmitted. The extension fetches public transit data from the Rejseplanen API for bus departure times - no user-identifying information is sent. All preferences are stored locally in your browser. See [PRIVACY.md](PRIVACY.md).

## License

MIT
