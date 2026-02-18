# Privacy Policy - DTU After Dark

**Last updated:** February 18, 2026

## Security and Privacy Audit (February 18, 2026)

A static audit of `manifest.json`, `manifest_chrome.json`, `background.js`, and `darkmode.js` was completed on February 18, 2026.

### Summary

- No analytics, telemetry, ad SDKs, or tracker integrations were found.
- No remote code loading, `eval`, or `new Function` execution was found.
- Background cross-origin fetches are behind runtime message handlers with sender allowlisting and per-feature input checks.
- Participant Intelligence data is stored locally only (not sent to third-party services).

### Findings

1. **Medium - Transit integration depends on provider-side rate controls**
   - The current client-side transit integration can be affected by shared provider rate limits in peak usage periods.
   - Impact: temporary degradation/pauses of live bus updates for users.
   - Recommendation: continue hardening architecture (for example stronger server-side mediation and provider-side restrictions).

2. **Low - Participant Intelligence retention is open-ended**
   - Participant metadata can persist until browser/extension data is cleared.
   - Impact: higher privacy risk on shared devices/profiles.
   - Recommendation: add a visible "clear participant data" action and optional retention window.

3. **Low - Documentation scope mismatch (fixed in this update)**
   - Permission/domain docs previously omitted some active fetch hosts.
   - This file and `README.md` now match current manifests and code behavior.

## Data Collection

DTU After Dark does **not** sell personal data and does **not** send personal data to advertising or analytics vendors.

The extension operates locally in your browser and stores settings/caches needed for features. If you enable Participant Intelligence, the extension stores participant metadata locally for overlap and history features.

## What Is Stored Locally

### Extension storage (`browser.storage.local` / `chrome.storage.local`)

- Theme and feature preferences (dark mode mirror, accent theme, toggle states).
- Feature caches:
  - Grade stats cache (24h)
  - Course evaluation cache (24h)
  - FindIt availability cache (7d)
  - MyLine curriculum cache (7d)
  - Library events/news cache (6h)
- Participant Intelligence dataset (if enabled), including:
  - Participant names, s-numbers, program labels
  - Course overlap/history metadata
  - Enrollment snapshots for retention charts
  - Size caps in code: max 5000 student records and max 20 retention snapshots per course

### Site `localStorage` and cookie (origin-scoped)

- Dark mode preference (`localStorage`) and `.dtu.dk` cookie mirror.
- Bus widget preferences and quota counters.
- Deadlines widget cache/state.
- GPA simulator entries and some UI state flags.

Note: origin-scoped `localStorage` keys can be readable by scripts running on that same site origin.

## Network Access and Third-Party Services

### Automatic requests made by extension features

- `https://www.rejseplanen.dk/*` for live bus departures.
  - Sends stop IDs and routing parameters required for departure lookups.
- `https://api.mazemap.com/*` for Smart Room Links resolution.
  - Sends building/room query text and DTU campus ID.
- DTU domain data sources for feature enrichment:
  - `https://karakterer.dtu.dk/*`
  - `https://findit.dtu.dk/*`
  - `https://evaluering.dtu.dk/*`
  - `https://sdb.dtu.dk/*`
  - `https://student.dtu.dk/*`
  - `https://www.dtu.dk/*`
  - `https://www.bibliotek.dtu.dk/*`

### User-initiated external links

Some features render optional outbound links (opened only when you click), including:

- `books.google.com`
- `polyteknisk.dk`
- `supersaas.com`
- `databar.dtu.dk`
- `panopto.dtu.dk`
- `use.mazemap.com`

## Permissions

### Manifest permissions

- `storage`

### Host permissions

- `https://api.mazemap.com/*`
- `https://www.rejseplanen.dk/*`
- `https://karakterer.dtu.dk/*`
- `https://findit.dtu.dk/*`
- `https://evaluering.dtu.dk/*`
- `https://sdb.dtu.dk/*`
- `https://student.dtu.dk/*`
- `https://sts.ait.dtu.dk/*`
- `https://www.dtu.dk/*`
- `https://www.bibliotek.dtu.dk/*`

### Content script injection hosts

- `learn.inside.dtu.dk`
- `s.brightspace.com`
- `sts.ait.dtu.dk`
- `studieplan.dtu.dk`
- `kurser.dtu.dk`
- `evaluering.dtu.dk`
- `campusnet.dtu.dk`
- `karakterer.dtu.dk`
- `sites.dtu.dk`

## Security Controls

- Background message handlers allowlist sender hosts before handling requests.
- Sensitive URL features validate host/path before fetching (for example FindIt and course-evaluation fetch paths).
- The extension uses local code only; no remote script execution model is implemented.

## Data Deletion

You can remove stored data by clearing extension storage and site storage in your browser profile.

- Remove extension data: browser extension settings for DTU After Dark.
- Remove site `localStorage`/cookies: clear data for relevant DTU domains.

## Disclaimer

**DTU After Dark is an unofficial, community-built extension. It is not affiliated with, endorsed by, or supported by DTU, Arcanic, D2L/Brightspace, Rejseplanen, MazeMap, or any other service provider.**

Information shown by the extension (exam dates, deadlines, grades, GPA calculations, bus times, course evaluations, room locations, library data) can be inaccurate, incomplete, or outdated. Always verify critical information through official DTU channels.

## Contact

For privacy/security questions, open an issue on the GitHub repository or contact: `Daniel-yttesen@hotmail.com`.
