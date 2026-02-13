# Firefox Reviewer Notes (v2.3)

DTU After Dark is a utility extension for DTU domains.

What changed in this version:
- Added textbook linker on `kurser.dtu.dk` course literature sections.
- Added DTU Library availability check (`findit.dtu.dk`) and Google Books links.
- Improved citation parsing to reduce false positives.

Permissions and purpose:
- `storage`: save user settings locally.
- `https://www.rejseplanen.dk/*`: transit data for bus widget.
- `https://karakterer.dtu.dk/*`: grade histogram data for course stats.
- `https://findit.dtu.dk/*`: detect online library availability for textbook badges.

Data/privacy:
- No telemetry or analytics.
- No user account data is collected.
- No external tracking scripts.

Reviewer test pages:
- `https://learn.inside.dtu.dk/`
- `https://campusnet.dtu.dk/cnnet/Grades/Grades.aspx`
- `https://kurser.dtu.dk/course/22051`
