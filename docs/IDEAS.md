# Ideas (Not Implemented)

## FTP-Like Sync / Export
Direct `ftp://` is not realistically usable from a modern browser extension (no `fetch()` support; deprecated/blocked by browsers).

If we want "FTP-style" syncing anyway, these are viable approaches:
- Export/import settings as a `.json` file (no server).
- HTTPS sync to a small API you host (the API stores your settings and returns them on other devices).
- HTTPS-to-FTP/SFTP bridge: the extension talks to your server over HTTPS; your server uploads/downloads via FTP/SFTP.
- Native Messaging helper app that does FTP/SFTP locally (powerful, but harder to distribute via stores).

