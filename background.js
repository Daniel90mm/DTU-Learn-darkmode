// Background worker for cross-origin grade statistics fetches (DTU After Dark)
(function() {
    'use strict';

    const runtime = (typeof browser !== 'undefined') ? browser : chrome;
    const GRADES = ['12', '10', '7', '4', '02', '00', '-3'];
    const GRADE_VALUES = { '12': 12, '10': 10, '7': 7, '4': 4, '02': 2, '00': 0, '-3': -3 };

    function getCourseCodeVariants(courseCode) {
        const raw = String(courseCode || '').trim();
        const variants = [];
        const seen = Object.create(null);
        function add(v) {
            if (!v || seen[v]) return;
            seen[v] = true;
            variants.push(v);
        }

        add(raw);

        // Handle both ".../34721/..." and ".../34721-1/..." patterns.
        const suffixMatch = raw.match(/^(.+)-(\d+)$/);
        if (suffixMatch) {
            add(suffixMatch[1]);
        } else {
            add(raw + '-1');
        }
        return variants;
    }

    function buildDefaultSemesters() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        const startYear = (month <= 5) ? (year - 1) : year;
        const semesters = [];
        for (let y = startYear; y >= startYear - 6; y--) {
            semesters.push(`Winter-${y}`);
            semesters.push(`Summer-${y}`);
        }
        return semesters;
    }

    function parseGradeDistribution(html) {
        if (!html) return null;
        if (/No\s+data|Ingen\s+karakter|ingen\s+karakter/i.test(html)) return null;
        if (/Fordelingen\s+vises\s+ikke/i.test(html)) return null;

        const counts = {};
        GRADES.forEach(g => { counts[g] = 0; });

        // Try DOMParser first if available (MV2 background has DOM)
        if (typeof DOMParser !== 'undefined') {
            try {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const rows = Array.from(doc.querySelectorAll('tr'));
                rows.forEach(row => {
                    const cells = Array.from(row.querySelectorAll('th, td'))
                        .map(c => (c.textContent || '').trim());
                    if (cells.length < 2) return;
                    for (let i = 0; i < cells.length; i++) {
                        const cellVal = cells[i].replace(/\s+/g, '');
                        if (GRADES.indexOf(cellVal) === -1) continue;
                        for (let j = i + 1; j < cells.length; j++) {
                            const num = parseInt(cells[j].replace(/[^\d-]/g, ''), 10);
                            if (!isNaN(num)) {
                                counts[cellVal] = num;
                                break;
                            }
                        }
                    }
                });
            } catch (e) {
                // Fall back to regex parsing below.
            }
        }

        // Regex fallback if DOM parsing found nothing
        const totalFromDom = GRADES.reduce((sum, g) => sum + (counts[g] || 0), 0);
        if (totalFromDom === 0) {
            const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let match;
            while ((match = rowRegex.exec(html)) !== null) {
                const rowHtml = match[1];
                const cellMatches = rowHtml.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
                const cells = [];
                for (const cell of cellMatches) {
                    const text = cell[1]
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;/gi, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    cells.push(text);
                }
                if (cells.length < 2) continue;
                for (let i = 0; i < cells.length; i++) {
                    const cellVal = cells[i].replace(/\s+/g, '');
                    if (GRADES.indexOf(cellVal) === -1) continue;
                    for (let j = i + 1; j < cells.length; j++) {
                        const num = parseInt(cells[j].replace(/[^\d-]/g, ''), 10);
                        if (!isNaN(num)) {
                            counts[cellVal] = num;
                            break;
                        }
                    }
                }
            }
        }

        const total = GRADES.reduce((sum, g) => sum + (counts[g] || 0), 0);
        if (!total) return null;
        // DTU does not show usable grade distribution for very small cohorts.
        if (total <= 3) return null;

        let weighted = 0;
        let passed = 0;
        GRADES.forEach(g => {
            const c = counts[g] || 0;
            weighted += (GRADE_VALUES[g] * c);
            if (GRADE_VALUES[g] > 0) passed += c;
        });

        const average = weighted / total;
        const passRate = (passed / total) * 100;
        return { counts, total, average, passRate };
    }

    async function fetchLatestIterations(courseCode, semesterCandidates, maxIterations) {
        const semesters = (Array.isArray(semesterCandidates) && semesterCandidates.length)
            ? semesterCandidates
            : buildDefaultSemesters();
        const wanted = (typeof maxIterations === 'number' && maxIterations > 0) ? maxIterations : 3;
        const iterations = [];
        const codeVariants = getCourseCodeVariants(courseCode);

        for (let i = 0; i < semesters.length; i++) {
            const semester = semesters[i];
            for (let v = 0; v < codeVariants.length; v++) {
                const codeVariant = codeVariants[v];
                const url = `https://karakterer.dtu.dk/Histogram/1/${encodeURIComponent(codeVariant)}/${semester}`;
                try {
                    const res = await fetch(url, { cache: 'no-store', credentials: 'omit' });
                    if (!res || !res.ok) continue;
                    const html = await res.text();
                    const parsed = parseGradeDistribution(html);
                    if (parsed) {
                        iterations.push({ semester, data: parsed, courseId: codeVariant });
                        break;
                    }
                } catch (e) {
                    // Try next variant or semester
                }
            }
            if (iterations.length >= wanted) break;
        }

        if (!iterations.length) return { ok: false, error: 'no_data' };
        return {
            ok: true,
            iterations,
            // Backward-compatible fields for consumers expecting one result.
            semester: iterations[0].semester,
            data: iterations[0].data
        };
    }

    function isAllowedFinditUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return false;
        try {
            const parsed = new URL(rawUrl);
            if (parsed.protocol !== 'https:') return false;
            if (parsed.hostname !== 'findit.dtu.dk') return false;
            if (!/^\/(?:en\/)?catalog\/?$/i.test(parsed.pathname)) return false;
            return true;
        } catch (e) {
            return false;
        }
    }

    async function fetchFinditAvailability(rawUrl) {
        if (!isAllowedFinditUrl(rawUrl)) {
            return { ok: false, error: 'invalid_url', onlineAccess: false };
        }
        try {
            const res = await fetch(rawUrl, { cache: 'no-store', credentials: 'omit' });
            if (!res || !res.ok) {
                return { ok: false, error: 'fetch_failed', onlineAccess: false };
            }
            const html = await res.text();
            const onlineAccess =
                /online\s+access/i.test(html) ||
                /online\s+adgang/i.test(html) ||
                /full\s*text\s*online/i.test(html);
            return { ok: true, onlineAccess };
        } catch (e) {
            return { ok: false, error: 'fetch_failed', onlineAccess: false };
        }
    }

    if (runtime && runtime.runtime && runtime.runtime.onMessage) {
        runtime.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!message || !message.type) return;

            if (message.type === 'dtu-grade-stats') {
                const courseCode = String(message.courseCode || '').trim();
                if (!/^[A-Za-z0-9-]+$/.test(courseCode)) {
                    sendResponse({ ok: false, error: 'invalid_course' });
                    return;
                }
                fetchLatestIterations(courseCode, message.semesters, 3)
                    .then(sendResponse)
                    .catch(() => sendResponse({ ok: false, error: 'fetch_failed' }));
                return true;
            }

            if (message.type === 'dtu-findit-availability') {
                const url = String(message.url || '').trim();
                fetchFinditAvailability(url)
                    .then(sendResponse)
                    .catch(() => sendResponse({ ok: false, error: 'fetch_failed', onlineAccess: false }));
                return true;
            }

            return;
        });
    }
})();
