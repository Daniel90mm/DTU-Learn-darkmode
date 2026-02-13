# Release Notes

## 2.3 - 2026-02-11

- Added Textbook Linker on `kurser.dtu.dk` course pages.
- Detects course-literature citations across varied lecturer formatting.
- Adds per-citation links to DTU Library (`Check Library`) and Google Books.
- Shows `Free PDF` badge when DTU Library result indicates online access.
- Improved citation parsing:
  - handles wrapped lines and mixed separators,
  - reduces false positives from prose/remarks,
  - strips page ranges like `pp. 59-66` from search queries,
  - de-duplicates repeated citation matches.
- Added background fetch support for DTU Library availability checks.
- Added `https://findit.dtu.dk/*` host permission in Firefox and Chrome manifests.
- Updated packaging scripts and built new Firefox/Chrome zip artifacts.
