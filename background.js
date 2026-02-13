// Background worker for cross-origin data fetches (DTU After Dark)
(function() {
    'use strict';

    const runtime = (typeof browser !== 'undefined') ? browser : chrome;
    const GRADES = ['12', '10', '7', '4', '02', '00', '-3'];
    const GRADE_VALUES = { '12': 12, '10': 10, '7': 7, '4': 4, '02': 2, '00': 0, '-3': -3 };
    const EXAM_CALENDAR_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
    const STUDENT_DEADLINES_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
    const STUDENT_COURSE_REG_DEADLINES_URL = 'https://student.dtu.dk/en/courses-and-teaching/course-registration/course-registration-deadlines';
    const STUDENT_EXAM_REG_DEADLINES_URL = 'https://student.dtu.dk/en/exam/exam-registration/-deadlines-for-exams';
    const EXAM_CALENDAR_URLS = [
        'https://student.dtu.dk/en/exam/exam-dates',
        'https://student.dtu.dk/eksamen/eksamensdatoer',
        'https://student.dtu.dk/da/eksamen/eksamensdatoer',
        'https://student.dtu.dk/en/studies/exam/exam-dates',
        'https://student.dtu.dk/studier/eksamen/eksamensdatoer',
        'https://www.dtu.dk/english/education/student-guide/exams/exam-schedule',
        'https://www.dtu.dk/english/education/student-guide/exams/exam-dates',
        'https://www.dtu.dk/uddannelse/student/eksamen/eksamensdatoer'
    ];
    let _examCalendarCache = null;
    let _studentDeadlinesCache = null;

    // --- Persistent storage cache helpers (browser.storage.local) ---
    const GRADE_STATS_CACHE_TTL_MS  = 1000 * 60 * 60 * 24;   // 24 hours
    const COURSE_EVAL_CACHE_TTL_MS  = 1000 * 60 * 60 * 24;   // 24 hours
    const FINDIT_AVAIL_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

    const CACHE_PREFIX_GRADE  = 'cache_grade_';
    const CACHE_PREFIX_EVAL   = 'cache_eval_';
    const CACHE_PREFIX_FINDIT = 'cache_findit_';

    function storageGet(key) {
        return new Promise(resolve => {
            try {
                runtime.storage.local.get(key, items => {
                    resolve(items && items[key] ? items[key] : null);
                });
            } catch (e) { resolve(null); }
        });
    }
    function storageSet(key, value) {
        try {
            const obj = {};
            obj[key] = value;
            runtime.storage.local.set(obj);
        } catch (e) { /* best-effort */ }
    }
    function storageCacheGet(prefix, id, ttlMs) {
        const key = prefix + id;
        return storageGet(key).then(entry => {
            if (!entry || !entry.ts || (Date.now() - entry.ts) > ttlMs) return null;
            return entry.data;
        });
    }
    function storageCacheSet(prefix, id, data) {
        const key = prefix + id;
        storageSet(key, { ts: Date.now(), data });
    }

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

        function normalizeCellText(text) {
            return String(text || '')
                .replace(/\u00a0/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function normalizeGradeToken(text) {
            return normalizeCellText(text)
                .replace(/[\u2212\u2013\u2014]/g, '-')
                .replace(/\s+/g, '');
        }

        function extractCountFromCells(cells, startIdx) {
            for (let i = startIdx; i < cells.length; i++) {
                const txt = normalizeCellText(cells[i]);
                if (!txt) continue;
                const exactInt = txt.match(/^-?\d+$/);
                if (exactInt) {
                    const n = parseInt(exactInt[0], 10);
                    if (!isNaN(n)) return n;
                }
                const firstInt = txt.match(/-?\d+/);
                if (firstInt) {
                    const n = parseInt(firstInt[0], 10);
                    if (!isNaN(n)) return n;
                }
            }
            return null;
        }

        function isFailLabel(text) {
            return /\b(ikke\s+best[\u00e5a]et|not\s+passed|failed?)\b/i.test(text || '');
        }

        function isNoShowLabel(text) {
            return /\b(ej\s*m[\u00f8o]dt|no[\s-]?show|absent)\b/i.test(text || '');
        }

        function isPassLabel(text) {
            if (!text) return false;
            if (isFailLabel(text)) return false;
            return /\b(best[\u00e5a]et|pass(?:ed)?|godkendt)\b/i.test(text);
        }

        function parseRows(rowsCells) {
            const counts = {};
            GRADES.forEach(g => { counts[g] = 0; });
            const passFailCounts = { passed: 0, failed: 0, noShow: 0 };
            let gradeRowsFound = 0;
            let passFailRowsFound = 0;

            rowsCells.forEach(cells => {
                if (!Array.isArray(cells) || cells.length < 2) return;
                const firstCell = normalizeCellText(cells[0]);
                const firstToken = normalizeGradeToken(firstCell);

                if (GRADES.indexOf(firstToken) !== -1) {
                    const n = extractCountFromCells(cells, 1);
                    if (n !== null) {
                        counts[firstToken] = n;
                        gradeRowsFound++;
                    }
                    return;
                }

                if (isFailLabel(firstCell)) {
                    const n = extractCountFromCells(cells, 1);
                    if (n !== null) {
                        passFailCounts.failed = n;
                        passFailRowsFound++;
                    }
                    return;
                }

                if (isNoShowLabel(firstCell)) {
                    const n = extractCountFromCells(cells, 1);
                    if (n !== null) {
                        passFailCounts.noShow = n;
                        passFailRowsFound++;
                    }
                    return;
                }

                if (isPassLabel(firstCell)) {
                    const n = extractCountFromCells(cells, 1);
                    if (n !== null) {
                        passFailCounts.passed = n;
                        passFailRowsFound++;
                    }
                }
            });

            return { counts, passFailCounts, gradeRowsFound, passFailRowsFound };
        }

        let parsed = null;

        // Try DOMParser first if available (MV2 background has DOM)
        if (typeof DOMParser !== 'undefined') {
            try {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const rows = Array.from(doc.querySelectorAll('tr'));
                const rowsCells = rows.map(row => {
                    return Array.from(row.querySelectorAll('th, td')).map(c => normalizeCellText(c.textContent || ''));
                });
                parsed = parseRows(rowsCells);
            } catch (e) {
                // Fall back to regex parsing below.
            }
        }

        // Regex fallback if DOM parsing found nothing usable
        if (!parsed || (!parsed.gradeRowsFound && !parsed.passFailRowsFound)) {
            const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let match;
            const rowsCells = [];
            while ((match = rowRegex.exec(html)) !== null) {
                const rowHtml = match[1];
                const cellMatches = rowHtml.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi);
                const cells = [];
                for (const cell of cellMatches) {
                    const text = normalizeCellText(
                        String(cell[1] || '')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/&nbsp;/gi, ' ')
                    );
                    cells.push(text);
                }
                if (cells.length >= 2) rowsCells.push(cells);
            }
            parsed = parseRows(rowsCells);
        }

        if (!parsed) return null;

        const counts = parsed.counts || {};
        const numericTotal = GRADES.reduce((sum, g) => sum + (counts[g] || 0), 0);
        if (numericTotal > 0) {
            // DTU does not show usable grade distribution for very small cohorts.
            if (numericTotal <= 3) return null;
            let weighted = 0;
            let passed = 0;
            GRADES.forEach(g => {
                const c = counts[g] || 0;
                weighted += (GRADE_VALUES[g] * c);
                if (GRADE_VALUES[g] > 0) passed += c;
            });
            const average = weighted / numericTotal;
            const passRate = (passed / numericTotal) * 100;
            return { mode: 'graded', counts, total: numericTotal, average, passRate };
        }

        const pf = parsed.passFailCounts || { passed: 0, failed: 0, noShow: 0 };
        const pfTotal = (pf.passed || 0) + (pf.failed || 0) + (pf.noShow || 0);
        if (pfTotal <= 0) return null;
        if (pfTotal <= 3) return null;

        const evaluated = (pf.passed || 0) + (pf.failed || 0);
        const passRate = evaluated > 0 ? ((pf.passed || 0) / evaluated) * 100 : 0;
        return {
            mode: 'pass_fail',
            counts,
            total: pfTotal,
            average: null,
            passRate,
            passFailCounts: pf
        };
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

    function normalizeSpace(text) {
        return String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function parseDmyDate(rawText) {
        const text = normalizeSpace(rawText);
        if (!text) return null;
        const m = text.match(/(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-\s]\s*(\d{4})/);
        if (!m) return null;
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const year = parseInt(m[3], 10);
        if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) return null;
        const ts = Date.UTC(year, month - 1, day);
        const d = new Date(ts);
        if (d.getUTCFullYear() !== year || (d.getUTCMonth() + 1) !== month || d.getUTCDate() !== day) return null;
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { ts, iso };
    }

    function normalizeExamToken(rawToken) {
        const t = normalizeSpace(rawToken).toUpperCase().replace(/\s+/g, '');
        if (!t) return '';
        const compact = t.replace('-', '');
        if (/^[EF]\d[AB]$/.test(compact)) {
            return compact.slice(0, 2) + '-' + compact.slice(2);
        }
        if (/^[EF]\d$/.test(compact)) return compact;
        return '';
    }

    function extractExamTokens(text) {
        const out = [];
        const seen = Object.create(null);
        const regex = /\b([EF]\d(?:\s*-\s*[AB]|[AB])?)\b/gi;
        let m;
        while ((m = regex.exec(text || '')) !== null) {
            const token = normalizeExamToken(m[1]);
            if (!token || seen[token]) continue;
            seen[token] = true;
            out.push(token);
        }
        return out;
    }

    function extractCourseCodes(text) {
        const out = [];
        const seen = Object.create(null);
        const regex = /\b(\d{5})\b/g;
        let m;
        while ((m = regex.exec(text || '')) !== null) {
            const code = m[1];
            if (!code || seen[code]) continue;
            seen[code] = true;
            out.push(code);
        }
        return out;
    }

    function extractMonthTags(text) {
        const tags = [];
        const lower = normalizeSpace(text).toLowerCase();
        function add(tag) {
            if (tags.indexOf(tag) === -1) tags.push(tag);
        }
        if (!lower) return tags;
        if (/\bjanuary\b|\bjanuar\b/.test(lower)) add('january');
        if (/\bfebruary\b|\bfebruar\b/.test(lower)) add('february');
        if (/\bmay\b|\bmaj\b/.test(lower)) add('may');
        if (/\bjune\b|\bjuni\b/.test(lower)) add('june');
        if (/\bjuly\b|\bjuli\b/.test(lower)) add('july');
        if (/\baugust\b/.test(lower)) add('august');
        if (/\bdecember\b/.test(lower)) add('december');
        if (/\bwinter\s+exam\b|\bvintereksamen\b/.test(lower)) add('winter_period');
        if (/\bsummer\s+exam\b|\bsommereksamen\b/.test(lower)) add('summer_period');
        if (/\bre-?exam\b|\breeksamen\b/.test(lower)) add('reexam');
        return tags;
    }

    function decodeBasicHtmlEntities(text) {
        if (!text) return '';
        return String(text)
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10) || 0))
            .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16) || 0));
    }

    function stripHtmlTags(html) {
        if (!html) return '';
        return normalizeSpace(
            decodeBasicHtmlEntities(
                String(html)
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]+>/g, ' ')
            )
        );
    }

    function extractDmyDates(text) {
        const out = [];
        const seen = Object.create(null);
        const regex = /(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-\s]\s*(\d{4})/g;
        let m;
        while ((m = regex.exec(text || '')) !== null) {
            const dateText = `${m[1]}/${m[2]} ${m[3]}`;
            const parsed = parseDmyDate(dateText);
            if (!parsed || !parsed.iso || seen[parsed.iso]) continue;
            seen[parsed.iso] = true;
            out.push(parsed);
        }
        return out;
    }

    function parseStudentDeadlineLine(text) {
        const raw = normalizeSpace(text);
        if (!raw) return null;

        const idx = raw.indexOf(':');
        let label = '';
        let datePart = raw;
        if (idx >= 0) {
            label = normalizeSpace(raw.slice(0, idx)).replace(/\*+$/g, '').trim();
            datePart = normalizeSpace(raw.slice(idx + 1)).replace(/^:+\s*/, '');
        }

        const dates = extractDmyDates(datePart);
        if (!dates.length) return null;

        const start = dates[0];
        const end = dates.length > 1 ? dates[1] : null;
        return {
            label: label || raw,
            startIso: start.iso,
            startTs: start.ts,
            endIso: end ? end.iso : null,
            endTs: end ? end.ts : null,
            raw
        };
    }

    function parseStudentDeadlinesGroupsFromHtml(html) {
        if (!html) return [];
        const groups = [];
        const headings = [];
        const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
        let m;
        while ((m = h2Regex.exec(html)) !== null) {
            const headingText = normalizeSpace(stripHtmlTags(m[1]));
            if (!headingText || /^\u00a0+$/.test(headingText)) continue;
            headings.push({ text: headingText, start: m.index, end: h2Regex.lastIndex });
        }
        if (!headings.length) return groups;

        for (let i = 0; i < headings.length; i++) {
            const segStart = headings[i].end;
            const segEnd = (i + 1 < headings.length) ? headings[i + 1].start : html.length;
            const seg = html.slice(segStart, segEnd);

            const items = [];
            const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
            let li;
            while ((li = liRegex.exec(seg)) !== null) {
                const liText = normalizeSpace(stripHtmlTags(li[1]));
                const parsed = parseStudentDeadlineLine(liText);
                if (parsed) items.push(parsed);
            }

            if (!items.length) continue;
            groups.push({
                heading: headings[i].text,
                items
            });
        }

        return groups;
    }

    async function fetchStudentDeadlines(forceRefresh) {
        const now = Date.now();
        if (!forceRefresh && _studentDeadlinesCache && (now - _studentDeadlinesCache.fetchedAt) < STUDENT_DEADLINES_CACHE_TTL_MS) {
            return {
                ok: true,
                fetchedAt: _studentDeadlinesCache.fetchedAt,
                cached: true,
                course: _studentDeadlinesCache.course,
                exam: _studentDeadlinesCache.exam,
                debug: { source: 'cache' }
            };
        }

        async function fetchOne(url) {
            try {
                const res = await fetch(url, { cache: 'no-store', credentials: 'omit', redirect: 'follow' });
                if (!res || !res.ok) return { ok: false, url, status: res ? res.status : 0, error: 'http' };
                const html = await res.text();
                if (!html || html.length < 200) return { ok: false, url, status: res.status, error: 'empty_html' };
                const groups = parseStudentDeadlinesGroupsFromHtml(html);
                if (!groups || !groups.length) return { ok: false, url, status: res.status, error: 'parse_empty' };
                return { ok: true, url, status: res.status, groups };
            } catch (e) {
                return { ok: false, url, status: 0, error: 'fetch_error', message: String(e && e.message || e) };
            }
        }

        const course = await fetchOne(STUDENT_COURSE_REG_DEADLINES_URL);
        const exam = await fetchOne(STUDENT_EXAM_REG_DEADLINES_URL);
        const fetchedAt = Date.now();
        const ok = !!((course && course.ok) || (exam && exam.ok));

        if (ok) {
            _studentDeadlinesCache = { fetchedAt, course, exam };
        }

        return {
            ok,
            fetchedAt,
            cached: false,
            course,
            exam
        };
    }
    function isLikelyExamCalendarTable(table) {
        if (!table) return false;
        const rows = Array.from(table.querySelectorAll('tr'));
        if (!rows.length) return false;
        const probeRows = rows.slice(0, 3);
        const headerText = normalizeSpace(probeRows.map(r => r.textContent || '').join(' ')).toLowerCase();
        const hasDate = /\b(date|dato)\b/.test(headerText);
        const hasExamCol = /\b(exam|eksamen|course\s*number|kursusnummer|eksamensplacering)\b/.test(headerText);
        return hasDate && hasExamCol;
    }

    function findPeriodHeadingForTable(table) {
        if (!table) return '';
        let el = table.previousElementSibling;
        let hops = 0;
        while (el && hops < 14) {
            const txt = normalizeSpace(el.textContent || '');
            if (txt && txt.length <= 220 && /(exam|eksamen)/i.test(txt) && /\d{4}/.test(txt)) {
                return txt;
            }
            if (txt && txt.length <= 220 && /(?:winter|summer|re-?exam|vintereksamen|sommereksamen)/i.test(txt)) {
                return txt;
            }
            el = el.previousElementSibling;
            hops++;
        }
        return '';
    }

    function findPeriodHeadingForTableHtml(htmlBeforeTable) {
        if (!htmlBeforeTable) return '';
        const headingRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
        let match;
        let lastHeading = '';
        while ((match = headingRegex.exec(htmlBeforeTable)) !== null) {
            const txt = stripHtmlTags(match[1]);
            if (!txt) continue;
            lastHeading = txt;
        }
        if (!lastHeading) return '';
        if (lastHeading.length > 260) return '';
        if (/(exam|eksamen|\d{4}|vinter|sommer|winter|summer|re-?exam|reeksamen)/i.test(lastHeading)) {
            return lastHeading;
        }
        return '';
    }

    function parseExamCalendarHtmlWithoutDom(html, sourceUrl) {
        if (!html) return null;
        const entries = [];
        const seen = Object.create(null);
        const periodTitles = [];
        const tableRegex = /<table\b[\s\S]*?<\/table>/gi;
        let tableMatch;

        while ((tableMatch = tableRegex.exec(html)) !== null) {
            const tableHtml = tableMatch[0];
            const before = html.slice(Math.max(0, tableMatch.index - 6000), tableMatch.index);
            const period = findPeriodHeadingForTableHtml(before);
            if (period && periodTitles.indexOf(period) === -1) periodTitles.push(period);

            const rowRegex = /<tr\b[\s\S]*?<\/tr>/gi;
            let rowMatch;
            let headerHint = false;
            while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
                const rowHtml = rowMatch[0];
                const cellRegex = /<t[dh]\b[\s\S]*?>([\s\S]*?)<\/t[dh]>/gi;
                const cells = [];
                let cellMatch;
                while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                    cells.push(stripHtmlTags(cellMatch[1]));
                }
                if (cells.length < 2) continue;

                const rowText = normalizeSpace(cells.join(' ')).toLowerCase();
                if (/\b(date|dato)\b/.test(rowText) && /\b(exam|eksamen|course\s*number|kursusnummer|eksamensplacering)\b/.test(rowText)) {
                    headerHint = true;
                    continue;
                }

                const parsedDate = parseDmyDate(cells[0]);
                if (!parsedDate) continue;
                const examText = normalizeSpace(cells[1]);
                if (!examText) continue;

                const codes = extractCourseCodes(examText);
                const tokens = extractExamTokens(examText);
                const tags = extractMonthTags(`${period} ${examText}`);
                if (!codes.length && !tokens.length && !tags.length) continue;
                if (!headerHint && !period) continue;

                const key = `${parsedDate.iso}|${examText}`;
                if (seen[key]) continue;
                seen[key] = true;

                entries.push({
                    dateIso: parsedDate.iso,
                    dateTs: parsedDate.ts,
                    dateLabel: cells[0],
                    period: period || '',
                    text: examText,
                    codes,
                    tokens,
                    tags
                });
            }
        }

        entries.sort((a, b) => a.dateTs - b.dateTs);
        if (!entries.length) return null;
        return {
            ok: true,
            entries,
            sourceUrl,
            fetchedAt: Date.now(),
            periodTitles
        };
    }
    function parseExamCalendarDocument(doc, sourceUrl) {
        if (!doc) return null;
        const entries = [];
        const seen = Object.create(null);
        const periodTitles = [];

        const tables = Array.from(doc.querySelectorAll('table'));
        tables.forEach(table => {
            if (!isLikelyExamCalendarTable(table)) return;
            const period = findPeriodHeadingForTable(table);
            if (period && periodTitles.indexOf(period) === -1) periodTitles.push(period);

            const rows = Array.from(table.querySelectorAll('tr'));
            rows.forEach((row, idx) => {
                const cells = Array.from(row.querySelectorAll('th, td'));
                if (cells.length < 2) return;
                if (idx === 0 && row.querySelectorAll('th').length >= 2) return;

                const dateText = normalizeSpace(cells[0].textContent || '');
                const parsedDate = parseDmyDate(dateText);
                if (!parsedDate) return;

                const examText = normalizeSpace(cells[1].textContent || '');
                if (!examText) return;

                const codes = extractCourseCodes(examText);
                const tokens = extractExamTokens(examText);
                const tags = extractMonthTags(`${period} ${examText}`);
                if (!codes.length && !tokens.length && !tags.length) return;

                const key = `${parsedDate.iso}|${examText}`;
                if (seen[key]) return;
                seen[key] = true;

                entries.push({
                    dateIso: parsedDate.iso,
                    dateTs: parsedDate.ts,
                    dateLabel: dateText,
                    period: period || '',
                    text: examText,
                    codes,
                    tokens,
                    tags
                });
            });
        });

        entries.sort((a, b) => a.dateTs - b.dateTs);
        if (!entries.length) return null;
        return {
            ok: true,
            entries,
            sourceUrl,
            fetchedAt: Date.now(),
            periodTitles
        };
    }

    function parseExamCalendarHtml(html, sourceUrl) {
        if (!html) return null;
        if (typeof DOMParser !== 'undefined') {
            try {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const parsed = parseExamCalendarDocument(doc, sourceUrl);
                if (parsed && parsed.ok && Array.isArray(parsed.entries) && parsed.entries.length) {
                    return parsed;
                }
            } catch (e) {
                // Fall back to regex parser below.
            }
        }
        return parseExamCalendarHtmlWithoutDom(html, sourceUrl);
    }

    async function fetchExamCalendarIndex(forceRefresh) {
        const now = Date.now();
        const attempts = [];
        if (!forceRefresh && _examCalendarCache && (now - _examCalendarCache.fetchedAt) < EXAM_CALENDAR_CACHE_TTL_MS) {
            return {
                ok: true,
                entries: _examCalendarCache.entries,
                fetchedAt: _examCalendarCache.fetchedAt,
                sourceUrl: _examCalendarCache.sourceUrl,
                periodTitles: _examCalendarCache.periodTitles || [],
                cached: true,
                debug: { source: 'cache' }
            };
        }

        for (let i = 0; i < EXAM_CALENDAR_URLS.length; i++) {
            const url = EXAM_CALENDAR_URLS[i];
            try {
                const res = await fetch(url, {
                    cache: 'no-store',
                    credentials: 'omit',
                    redirect: 'follow'
                });
                if (!res || !res.ok) {
                    attempts.push({ url, status: res ? res.status : 0, step: 'http' });
                    continue;
                }
                const html = await res.text();
                if (!html || html.length < 200) {
                    attempts.push({ url, status: res.status, step: 'empty_html' });
                    continue;
                }
                const parsed = parseExamCalendarHtml(html, url);
                if (!parsed || !parsed.ok || !Array.isArray(parsed.entries) || !parsed.entries.length) {
                    attempts.push({ url, status: res.status, step: 'parse_empty' });
                    continue;
                }

                _examCalendarCache = {
                    entries: parsed.entries,
                    fetchedAt: parsed.fetchedAt,
                    sourceUrl: parsed.sourceUrl,
                    periodTitles: parsed.periodTitles || []
                };
                return {
                    ok: true,
                    entries: parsed.entries,
                    fetchedAt: parsed.fetchedAt,
                    sourceUrl: parsed.sourceUrl,
                    periodTitles: parsed.periodTitles || [],
                    cached: false,
                    debug: { attempts }
                };
            } catch (e) {
                attempts.push({ url, status: 0, step: 'fetch_error', message: String(e && e.message || '') });
            }
        }

        return { ok: false, error: 'calendar_unavailable', debug: { attempts } };
    }

    // --- Course evaluation parsing (evaluering.dtu.dk) ---

    const EVAL_LIKERT_OPTIONS = ['Helt uenig', 'Uenig', 'Hverken eller', 'Enig', 'Helt enig'];
    const EVAL_WORKLOAD_OPTIONS = ['Meget mindre', 'Noget mindre', 'Det samme', 'Noget mere', 'Meget mere'];
    const EVAL_LIKERT_WEIGHTS = { 'Helt uenig': 1, 'Uenig': 2, 'Hverken eller': 3, 'Enig': 4, 'Helt enig': 5 };
    const EVAL_WORKLOAD_WEIGHTS = { 'Meget mindre': 1, 'Noget mindre': 2, 'Det samme': 3, 'Noget mere': 4, 'Meget mere': 5 };

    function parseEvaluationHtml(html) {
        if (!html || html.length < 200) return null;

        const result = {
            eligible: 0,
            respondents: 0,
            excluded: 0,
            responseRate: 0,
            title: '',
            period: '',
            questions: [],
            workload: null
        };

        // --- Extract title and period from h2 ---
        const titleMatch = html.match(/<h2[^>]*>\s*Resultater\s*:\s*([\s\S]*?)<\/h2>/i);
        if (titleMatch) {
            result.title = normalizeSpace(stripHtmlTags(titleMatch[1]));
            // Extract period token like "F25" from the end of the title
            const periodMatch = result.title.match(/\b([FE]\d{2})\s*$/);
            if (periodMatch) result.period = periodMatch[1];
        }

        // --- Extract statistics ---
        const statsContainerMatch = html.match(/<div[^>]*id="CourseResultsPublicContainer"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
        if (statsContainerMatch) {
            const statsHtml = statsContainerMatch[1];
            // Extract eligible count (first td number)
            const statsRows = [];
            const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let trMatch;
            while ((trMatch = trRegex.exec(statsHtml)) !== null) {
                const cells = [];
                const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                let tdMatch;
                while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
                    cells.push(normalizeSpace(stripHtmlTags(tdMatch[1])));
                }
                if (cells.length >= 2) statsRows.push(cells);
            }
            if (statsRows.length >= 2) {
                result.eligible = parseInt(statsRows[0][0], 10) || 0;
                result.respondents = parseInt(statsRows[1][0], 10) || 0;
                if (statsRows.length >= 3) {
                    result.excluded = parseInt(statsRows[2][0], 10) || 0;
                }
            }

        }

        // Extract response rate percentage (search full HTML -- the PercentageResult div
        // may sit outside the minimal container match above)
        const rateMatch = html.match(/<div[^>]*id="PercentageResult"[^>]*>[\s\S]*?<span>([\d,.]+)\s*%<\/span>/i);
        if (rateMatch) {
            result.responseRate = parseFloat(rateMatch[1].replace(',', '.')) || 0;
        }
        // Fallback: compute from eligible/respondents if page didn't have the element
        if (!result.responseRate && result.eligible > 0 && result.respondents > 0) {
            result.responseRate = (result.respondents / result.eligible) * 100;
        }

        // --- Extract question blocks ---
        const wrapperRegex = /<div\s+class="ResultCourseModelWrapper[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
        // More robust: split by ResultCourseModelWrapper
        const wrapperParts = html.split(/(?=<div\s+class="ResultCourseModelWrapper)/i);

        for (let i = 0; i < wrapperParts.length; i++) {
            const block = wrapperParts[i];
            if (!block || !/ResultCourseModelWrapper/i.test(block)) continue;

            // Extract question number
            const qNumMatch = block.match(/QuestionPositionColumn[^>]*>([\s\S]*?)<\/div>/i);
            if (!qNumMatch) continue;
            const qNum = normalizeSpace(stripHtmlTags(qNumMatch[1]));
            if (!qNum) continue;

            // Extract question text
            const qTextMatch = block.match(/FinalEvaluation_QuestionText[^>]*>([\s\S]*?)<\/div>/i);
            const qText = qTextMatch ? normalizeSpace(stripHtmlTags(qTextMatch[1])) : '';

            // Extract option labels and counts
            const options = [];
            const rowParts = block.split(/(?=<div\s+class="RowWrapper)/i);
            for (let r = 0; r < rowParts.length; r++) {
                const row = rowParts[r];
                if (!row || !/RowWrapper/i.test(row)) continue;

                const optionMatch = row.match(/FinalEvaluation_Result_OptionColumn[^>]*>([\s\S]*?)<\/div>/i);
                const countMatch = row.match(/Answer_Result_Background[^>]*>\s*<span>([\s\S]*?)<\/span>/i);
                if (optionMatch && countMatch) {
                    const label = normalizeSpace(stripHtmlTags(optionMatch[1]));
                    const count = parseInt(normalizeSpace(stripHtmlTags(countMatch[1])), 10) || 0;
                    options.push({ label, count });
                }
            }

            if (!options.length) continue;

            // Extract total responses from footer
            const footerMatch = block.match(/CourseSchemaResultFooter[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i);
            const totalResponses = footerMatch ? (parseInt(normalizeSpace(stripHtmlTags(footerMatch[1])), 10) || 0) : 0;

            // Determine if this is a Likert (1.x) or workload (2.x) question
            const isWorkload = /^2\./.test(qNum);
            const isQualitative = /^3\./.test(qNum);
            if (isQualitative) continue; // Skip qualitative

            const weights = isWorkload ? EVAL_WORKLOAD_WEIGHTS : EVAL_LIKERT_WEIGHTS;
            let weightedSum = 0;
            let totalCount = 0;
            options.forEach(function(opt) {
                const w = weights[opt.label];
                if (w != null) {
                    weightedSum += w * opt.count;
                    totalCount += opt.count;
                }
            });
            const average = totalCount > 0 ? (weightedSum / totalCount) : 0;

            const questionData = {
                number: qNum,
                text: qText,
                options: options,
                totalResponses: totalResponses,
                average: average
            };

            if (isWorkload) {
                result.workload = questionData;
            } else {
                result.questions.push(questionData);
            }
        }

        if (!result.questions.length && !result.workload) return null;
        return result;
    }

    async function fetchCourseEvaluation(evalUrl) {
        if (!evalUrl || typeof evalUrl !== 'string') {
            return { ok: false, error: 'invalid_url' };
        }
        try {
            const parsed = new URL(evalUrl);
            if (parsed.hostname !== 'evaluering.dtu.dk') {
                return { ok: false, error: 'invalid_host' };
            }
        } catch (e) {
            return { ok: false, error: 'invalid_url' };
        }

        try {
            const res = await fetch(evalUrl, { cache: 'no-store', credentials: 'omit' });
            if (!res || !res.ok) {
                return { ok: false, error: 'http', status: res ? res.status : 0 };
            }
            const html = await res.text();
            const data = parseEvaluationHtml(html);
            if (!data) {
                return { ok: false, error: 'parse_empty' };
            }
            data.sourceUrl = evalUrl;
            data.fetchedAt = Date.now();
            return { ok: true, data };
        } catch (e) {
            return { ok: false, error: 'fetch_error', message: String(e && e.message || e) };
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
                const cacheId = courseCode.toUpperCase();
                storageCacheGet(CACHE_PREFIX_GRADE, cacheId, GRADE_STATS_CACHE_TTL_MS).then(cached => {
                    if (cached) {
                        cached.cached = true;
                        sendResponse(cached);
                        return;
                    }
                    fetchLatestIterations(courseCode, message.semesters, 3)
                        .then(result => {
                            if (result && result.ok) storageCacheSet(CACHE_PREFIX_GRADE, cacheId, result);
                            sendResponse(result);
                        })
                        .catch(() => sendResponse({ ok: false, error: 'fetch_failed' }));
                });
                return true;
            }

            if (message.type === 'dtu-findit-availability') {
                const url = String(message.url || '').trim();
                // Use a short hash of the URL as cache key
                const finditCacheId = url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120);
                storageCacheGet(CACHE_PREFIX_FINDIT, finditCacheId, FINDIT_AVAIL_CACHE_TTL_MS).then(cached => {
                    if (cached) {
                        sendResponse(cached);
                        return;
                    }
                    fetchFinditAvailability(url)
                        .then(result => {
                            if (result && result.ok) storageCacheSet(CACHE_PREFIX_FINDIT, finditCacheId, result);
                            sendResponse(result);
                        })
                        .catch(() => sendResponse({ ok: false, error: 'fetch_failed', onlineAccess: false }));
                });
                return true;
            }

            if (message.type === 'dtu-student-deadlines') {
                const forceRefresh = !!message.forceRefresh;
                fetchStudentDeadlines(forceRefresh)
                    .then(sendResponse)
                    .catch(() => sendResponse({ ok: false, error: 'fetch_failed' }));
                return true;
            }

            if (message.type === 'dtu-exam-calendar') {
                const forceRefresh = !!message.forceRefresh;
                fetchExamCalendarIndex(forceRefresh)
                    .then(sendResponse)
                    .catch(() => sendResponse({ ok: false, error: 'fetch_failed' }));
                return true;
            }

            if (message.type === 'dtu-course-evaluation') {
                const evalUrl = String(message.url || '').trim();
                // Cache by eval URL path (strip protocol/host for shorter key)
                const evalCacheId = evalUrl.replace(/^https?:\/\/[^/]+/, '').replace(/[^a-zA-Z0-9]/g, '_');
                storageCacheGet(CACHE_PREFIX_EVAL, evalCacheId, COURSE_EVAL_CACHE_TTL_MS).then(cached => {
                    if (cached) {
                        cached.cached = true;
                        sendResponse(cached);
                        return;
                    }
                    fetchCourseEvaluation(evalUrl)
                        .then(result => {
                            if (result && result.ok) storageCacheSet(CACHE_PREFIX_EVAL, evalCacheId, result);
                            sendResponse(result);
                        })
                        .catch(() => sendResponse({ ok: false, error: 'fetch_failed' }));
                });
                return true;
            }

            return;
        });
    }
})();
