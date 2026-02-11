# Chrome Reviewer Notes (v2.3)

This extension is a DTU-focused UI enhancement extension.

Main behavior:
- Injects dark mode and utility UI on DTU domains.
- Adds GPA and course helper widgets.
- Adds textbook search badges in course literature sections on `kurser.dtu.dk`.

Host permissions and why:
- `https://www.rejseplanen.dk/*`: fetch public transport departures.
- `https://karakterer.dtu.dk/*`: fetch public grade distribution histograms for course stats.
- `https://findit.dtu.dk/*`: check library availability for textbook search badges.

Data handling:
- No analytics.
- No advertising.
- No user data sent to third-party servers.
- Settings are stored in extension storage only.

No piracy links:
- The extension does not link to unauthorized repositories.
- Textbook links go to DTU Library and Google Books.

Suggested test URLs:
- `https://learn.inside.dtu.dk/`
- `https://campusnet.dtu.dk/cnnet/Grades/Grades.aspx`
- `https://kurser.dtu.dk/course/22051`
