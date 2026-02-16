// Background worker for cross-origin data fetches (DTU After Dark)
(function() {
    'use strict';

    const runtime = (typeof browser !== 'undefined') ? browser : chrome;
    const GRADES = ['12', '10', '7', '4', '02', '00', '-3'];
    const GRADE_VALUES = { '12': 12, '10': 10, '7': 7, '4': 4, '02': 2, '00': 0, '-3': -3 };
    const EXAM_CALENDAR_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
    const STUDENT_DEADLINES_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
    const MYLINE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
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
    const CACHE_PREFIX_MYLINE = 'cache_myline_';
    const CACHE_PREFIX_LIB_EVENTS = 'cache_lib_events_';
    const CACHE_PREFIX_LIB_NEWS   = 'cache_lib_news_';
    const LIB_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

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

    function stripTags(html) {
        return String(html || '').replace(/<[^>]+>/g, ' ');
    }

    function decodeHtmlBasic(text) {
        // Minimal decode: enough for headings and badge labels.
        return String(text || '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&#(\d+);/g, (_, n) => {
                const code = parseInt(n, 10);
                if (!isFinite(code) || code <= 0) return '';
                try { return String.fromCharCode(code); } catch (e) { return ''; }
            })
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeCourseCode(code) {
        const c = String(code || '').trim().toUpperCase();
        if (/^\d{5}$/.test(c)) return c;
        if (/^KU\d{3}$/.test(c)) return c;
        return '';
    }

    function putCourseKind(map, code, kind, source) {
        if (!map || !code || !kind) return;
        const priority = {
            mandatory: 100,
            core: 80,
            project: 70,
            elective_pool: 60,
            approved_elective: 40
        }[kind] || 10;
        const existing = map[code];
        if (!existing || (existing.priority || 0) < priority) {
            map[code] = { kind, priority, source: source || '' };
        }
    }

    function extractCodesFromFragment(fragment, onCode) {
        if (!fragment) return;
        const re = /kurser\.dtu\.dk\/course\/[^"'<>]*?\/([0-9]{5}|KU[0-9]{3})\b/ig;
        let m;
        while ((m = re.exec(fragment)) !== null) {
            const code = normalizeCourseCode(m[1]);
            if (code) onCode(code);
        }
    }

    function parseMyLineHtml(html) {
        const out = {
            ok: true,
            programTitle: '',
            updatedLabel: '',
            kinds: {},
            ts: Date.now()
        };

        const text = String(html || '');
        const h1 = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1 && h1[1]) out.programTitle = decodeHtmlBasic(stripTags(h1[1]));

        // Try to capture a useful "revision" label if present ("senest revideret ...").
        const rev = text.match(/senest\s+revideret\s+den\s+([^.<]+)[.<]/i);
        if (rev && rev[1]) out.updatedLabel = decodeHtmlBasic(rev[1]);

        // Prefer the "Studieplan" block; fall back to whole document if we can't find anchors.
        let studyplanStart = -1;
        let studyplanEnd = -1;
        const mStudieplan = text.match(/<h2[^>]+id="Studieplan"[^>]*>/i);
        if (mStudieplan && mStudieplan.index != null) studyplanStart = mStudieplan.index;
        const mPrev = text.match(/<h2[^>]+id="Kurser,_tidligere_årgange"[^>]*>/i);
        if (mPrev && mPrev.index != null) studyplanEnd = mPrev.index;
        if (studyplanStart >= 0 && studyplanEnd > studyplanStart) {
            // ok
        } else {
            studyplanStart = 0;
            studyplanEnd = text.length;
        }
        const plan = text.slice(studyplanStart, studyplanEnd);

        function sliceBetween(idStart, idEnd) {
            const reStart = new RegExp(`<h2[^>]+id="${idStart}"[^>]*>`, 'i');
            const reEnd = new RegExp(`<h2[^>]+id="${idEnd}"[^>]*>`, 'i');
            const ms = plan.match(reStart);
            if (!ms || ms.index == null) return '';
            const start = ms.index;
            const me = plan.slice(start).match(reEnd);
            if (!me || me.index == null) return plan.slice(start);
            const end = start + me.index;
            return plan.slice(start, end);
        }

        const coreFrag = sliceBetween('Det_polytekniske_grundlag', 'Retningsspecifikke_kurser');
        extractCodesFromFragment(coreFrag, code => putCourseKind(out.kinds, code, 'core', 'core'));

        // Retningsspecifikke kurser: classify by current "pulje" label.
        const lineFrag = sliceBetween('Retningsspecifikke_kurser', 'Projekter');
        if (lineFrag) {
            let bucket = 'mandatory';
            const re = /<p[^>]*>[\s\S]*?Pulje[\s\S]*?<\/p>|kurser\.dtu\.dk\/course\/[^"'<>]*?\/([0-9]{5}|KU[0-9]{3})\b/ig;
            let m;
            while ((m = re.exec(lineFrag)) !== null) {
                if (m[1]) {
                    const code = normalizeCourseCode(m[1]);
                    if (code) {
                        putCourseKind(out.kinds, code, bucket, 'line');
                    }
                    continue;
                }
                const seg = String(m[0] || '');
                const segText = decodeHtmlBasic(stripTags(seg));
                if (/semi-?obligatorisk|valgbare|valgbar/i.test(segText)) {
                    bucket = 'elective_pool';
                } else if (/obligatorisk/i.test(segText)) {
                    bucket = 'mandatory';
                }
            }
        }

        const projFrag = sliceBetween('Projekter', 'Valgfrie_kurser');
        extractCodesFromFragment(projFrag, code => putCourseKind(out.kinds, code, 'project', 'project'));

        // Approved electives: the "Forhåndsgodkendte kandidatkurser" table is useful.
        const electivesFrag = sliceBetween('Forhåndsgodkendte_kandidatkurser', 'Kurser,_tidligere_årgange');
        extractCodesFromFragment(electivesFrag, code => putCourseKind(out.kinds, code, 'approved_elective', 'approved'));

        return out;
    }

    async function fetchMyLine(forceRefresh) {
        const cacheId = 'me';
        if (!forceRefresh) {
            const cached = await storageCacheGet(CACHE_PREFIX_MYLINE, cacheId, MYLINE_CACHE_TTL_MS);
            if (cached && cached.ok && cached.kinds) {
                cached.cached = true;
                return cached;
            }
        }

        let resp = null;
        try {
            resp = await fetch('https://sdb.dtu.dk/myline', {
                credentials: 'include',
                redirect: 'follow'
            });
        } catch (e) {
            return { ok: false, error: 'fetch_error' };
        }

        if (!resp || !resp.ok) {
            return { ok: false, error: 'http', status: resp ? resp.status : 0 };
        }

        // If we got redirected into STS/login, we are not authenticated for SDB.
        try {
            const finalUrl = String(resp.url || '');
            if (/sts\.ait\.dtu\.dk/i.test(finalUrl) || /login/i.test(finalUrl)) {
                return { ok: false, error: 'not_logged_in', url: finalUrl };
            }
        } catch (eUrl) {}

        let html = '';
        try {
            html = await resp.text();
        } catch (e2) {
            return { ok: false, error: 'parse_empty' };
        }
        if (!html || html.length < 200) return { ok: false, error: 'parse_empty' };

        // If we got a login page, we can't parse anything useful.
        if (/sts\.ait\.dtu\.dk|login|mitid/i.test(html) && !/Det\s+polytekniske\s+grundlag|Retningsspecifikke\s+kurser/i.test(html)) {
            return { ok: false, error: 'not_logged_in' };
        }

        let parsed = null;
        try {
            parsed = parseMyLineHtml(html);
        } catch (e3) {
            parsed = null;
        }

        if (!parsed || !parsed.ok || !parsed.kinds || !Object.keys(parsed.kinds).length) {
            return { ok: false, error: 'parse_empty' };
        }

        storageCacheSet(CACHE_PREFIX_MYLINE, cacheId, parsed);
        parsed.cached = false;
        return parsed;
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

    // =========================
    // MazeMap resolver (DTU)
    // =========================

    const MAZEMAP_CAMPUS_ID = 89; // DTU Lyngby

    function stripHtml(s) {
        return String(s || '').replace(/<[^>]*>/g, '');
    }

    function normToken(s) {
        return String(s || '').trim().toUpperCase();
    }

    function roomCompareToken(room) {
        const r = normToken(room);
        if (/^\d+$/.test(r)) {
            const n = parseInt(r, 10);
            if (Number.isFinite(n)) return String(n);
        }
        return r;
    }

    function bldMatchesItem(item, building) {
        if (!item || !building) return false;
        const b = normToken(building);
        const list = Array.isArray(item.dispBldNames) ? item.dispBldNames : [];
        for (let i = 0; i < list.length; i++) {
            if (normToken(list[i]) === b) return true;
        }
        const ident = normToken(stripHtml(item.identifier || ''));
        if (ident && ident.includes(b)) return true;
        return false;
    }

    function roomMatchesItem(item, room) {
        if (!item || !room) return false;
        const want = normToken(room);
        const wantCmp = roomCompareToken(want);

        const candidates = [];
        if (Array.isArray(item.poiNames)) candidates.push(...item.poiNames);
        if (Array.isArray(item.dispPoiNames)) candidates.push(...item.dispPoiNames);
        if (item.title) candidates.push(item.title);
        if (item.dispTitle) candidates.push(item.dispTitle);

        for (let i = 0; i < candidates.length; i++) {
            const raw = stripHtml(candidates[i] || '');
            const cand = normToken(raw);
            if (!cand) continue;
            if (cand === want) return true;
            if (roomCompareToken(cand) === wantCmp) return true;
        }
        return false;
    }

    function pickBestRoomResult(results, building, room) {
        if (!Array.isArray(results) || !results.length) return null;
        let best = null;
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            if (!item || typeof item.poiId !== 'number') continue;
            if (!bldMatchesItem(item, building)) continue;
            if (!roomMatchesItem(item, room)) continue;
            if (!best) { best = item; continue; }
            const a = typeof item.score === 'number' ? item.score : 0;
            const b = typeof best.score === 'number' ? best.score : 0;
            if (a > b) best = item;
        }
        return best;
    }

    function pickBestBuildingResult(results, building) {
        if (!Array.isArray(results) || !results.length) return null;
        let best = null;
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            if (!item || typeof item.poiId !== 'number') continue;
            if (!bldMatchesItem(item, building)) continue;
            if (!best) { best = item; continue; }
            const a = typeof item.score === 'number' ? item.score : 0;
            const b = typeof best.score === 'number' ? best.score : 0;
            if (a > b) best = item;
        }
        return best;
    }

    async function fetchMazemapEquery(q) {
        if (!q || typeof q !== 'string') {
            return { ok: false, error: 'invalid_query' };
        }
        const url = `https://api.mazemap.com/search/equery/?q=${encodeURIComponent(q)}&campusid=${MAZEMAP_CAMPUS_ID}`;
        try {
            const res = await fetch(url, { cache: 'no-store', credentials: 'omit' });
            if (!res || !res.ok) {
                return { ok: false, error: 'http', status: res ? res.status : 0 };
            }
            const json = await res.json();
            const results = (json && Array.isArray(json.result)) ? json.result : [];
            return { ok: true, results };
        } catch (e) {
            return { ok: false, error: 'fetch_error', message: String(e && e.message || e) };
        }
    }

    function zeroPadRoom(room, width) {
        const r = String(room || '').trim();
        if (!/^\d+$/.test(r)) return r;
        const w = Math.max(1, parseInt(width || 3, 10) || 3);
        if (r.length >= w) return r;
        return r.padStart(w, '0');
    }

    async function resolveMazemapPoi(building, room) {
        const bld = normToken(building);
        const rm = String(room || '').trim();
        if (!/^\d{3}[A-Za-z]?$/.test(bld)) {
            return { ok: false, error: 'invalid_building' };
        }
        // Allow building-only resolution (room omitted).
        if (!rm) {
            const buildingQueries = [`Bygning ${bld}`, `Building ${bld}`];
            for (const qb of buildingQueries) {
                const respB = await fetchMazemapEquery(qb);
                if (!respB || !respB.ok) continue;
                const bestB = pickBestBuildingResult(respB.results, bld);
                if (bestB) {
                    return {
                        ok: true,
                        kind: 'building',
                        poiId: bestB.poiId,
                        identifier: bestB.identifier || '',
                        queryUsed: qb
                    };
                }
            }
            return { ok: false, error: 'not_found' };
        }
        if (rm.length > 12) {
            return { ok: false, error: 'invalid_room' };
        }

        const roomVariants = [];
        roomVariants.push(rm);
        const padded = zeroPadRoom(rm, 3);
        if (padded && padded !== rm) roomVariants.push(padded);

        const queryVariants = [];
        for (const rv of roomVariants) {
            queryVariants.push(`${bld}-${rv}`);
            queryVariants.push(`${bld}.${rv}`);
        }

        for (const q of queryVariants) {
            const resp = await fetchMazemapEquery(q);
            if (!resp || !resp.ok) continue;
            const best = pickBestRoomResult(resp.results, bld, rm) || pickBestRoomResult(resp.results, bld, padded);
            if (best) {
                return {
                    ok: true,
                    kind: 'room',
                    poiId: best.poiId,
                    identifier: best.identifier || '',
                    queryUsed: q
                };
            }
        }

        // Fallback: building-level navigation (still helpful when room lookup fails).
        const buildingQueries = [`Bygning ${bld}`, `Building ${bld}`];
        for (const qb of buildingQueries) {
            const respB = await fetchMazemapEquery(qb);
            if (!respB || !respB.ok) continue;
            const bestB = pickBestBuildingResult(respB.results, bld);
            if (bestB) {
                return {
                    ok: true,
                    kind: 'building',
                    poiId: bestB.poiId,
                    identifier: bestB.identifier || '',
                    queryUsed: qb
                };
            }
        }

        return { ok: false, error: 'not_found' };
    }

    // --- Library events & news (bibliotek.dtu.dk) ---
    // The API expects the inner Request fields directly (not wrapped in {Request:{...}}).
    // It returns JSON: { Results: [ { Id, Title, Url, Date, ToDate, FormatedDate, Text, Location, ... } ] }

    // bibliotek.dtu.dk API: same endpoints used by the public website's own JS.
    // Note: Pagination.Size does NOT accept "Three" (it returns HTTP 500). Use "Ten" and
    // slice client-side (we only render a few items in the UI anyway).
    // Cache for 6h to minimise load.
    async function fetchLibraryEvents() {
        const body = {
            Pagination: { Number: 1, Size: 'Ten' },
            ListItemId: '539fc99a-6da8-4cc3-825d-34bfa6e34193',
            Language: 'en',
            Database: 'web',
            Subjects: [],
            DateRange: null,
            SearchText: '',
            ShowHistoricalEvents: false
        };
        try {
            // Note: Do NOT set a `Referer` header here. It's a forbidden header name in fetch and can
            // cause the request to fail entirely in some extension contexts.
            const resp = await fetch('https://www.bibliotek.dtu.dk/api/v1/calendar/calendareventlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'omit',
                body: JSON.stringify(body)
            });
            if (!resp.ok) return { ok: false, error: 'http', status: resp.status };
            const json = await resp.json();
            const results = (json && (json.Results || json.results)) ? (json.Results || json.results) : [];
            const events = results.map(r => {
                const d = r.Date ? new Date(r.Date) : null;
                return {
                    url: r.Url || '',
                    title: decodeHtmlBasic(r.Title || ''),
                    excerpt: r.FormatedDate
                        ? decodeHtmlBasic(r.FormatedDate) + (r.Location ? ' | ' + decodeHtmlBasic(r.Location) : '')
                        : decodeHtmlBasic(r.Text || '').slice(0, 120),
                    day: d ? String(d.getDate()) : '',
                    month: d ? d.toLocaleString('en', { month: 'short' }) : ''
                };
            });
            return { ok: true, events };
        } catch (e) {
            return { ok: false, error: 'fetch_error', message: String(e && e.message || e) };
        }
    }

    async function fetchLibraryNews() {
        const body = {
            Pagination: { Number: 1, Size: 'Ten' },
            ListItemId: '72d6b860-3c16-4256-9b49-35b2840dadf8',
            Language: 'en',
            Database: 'web',
            Subjects: [],
            DateRange: null,
            SearchText: ''
        };
        try {
            // Note: Do NOT set a `Referer` header here. It's a forbidden header name in fetch and can
            // cause the request to fail entirely in some extension contexts.
            const resp = await fetch('https://www.bibliotek.dtu.dk/api/v1/news/newslist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'omit',
                body: JSON.stringify(body)
            });
            if (!resp.ok) return { ok: false, error: 'http', status: resp.status };
            const json = await resp.json();
            const results = (json && (json.Results || json.results)) ? (json.Results || json.results) : [];
            const news = results.map(r => {
                const d = r.Date ? new Date(r.Date) : null;
                return {
                    url: r.Url || '',
                    title: decodeHtmlBasic(r.Title || ''),
                    excerpt: decodeHtmlBasic(r.Summary || '').slice(0, 120),
                    badge: r.Badge && r.Badge.Title ? decodeHtmlBasic(r.Badge.Title) : '',
                    date: d ? d.toLocaleDateString('en', { day: '2-digit', month: 'long', year: 'numeric' }) : ''
                };
            });
            return { ok: true, news };
        } catch (e) {
            return { ok: false, error: 'fetch_error', message: String(e && e.message || e) };
        }
    }

    if (runtime && runtime.runtime && runtime.runtime.onMessage) {
        // Allowed origins: only accept messages from our own content scripts
        const ALLOWED_SENDER_HOSTS = [
            'learn.inside.dtu.dk',
            's.brightspace.com',
            'sts.ait.dtu.dk',
            'evaluering.dtu.dk',
            'studieplan.dtu.dk',
            'kurser.dtu.dk',
            'karakterer.dtu.dk',
            'sites.dtu.dk',
            'campusnet.dtu.dk'
        ];

        function isAllowedSender(sender) {
            // Messages from the extension itself (popup, background, etc.) are always OK
            if (!sender || !sender.url) return true;
            try {
                const url = new URL(sender.url);
                // Extension pages (moz-extension://, chrome-extension://)
                if (url.protocol === 'moz-extension:' || url.protocol === 'chrome-extension:') return true;
                // Content scripts on allowed DTU domains
                if (url.protocol === 'https:' && ALLOWED_SENDER_HOSTS.includes(url.hostname)) return true;
            } catch (e) { /* invalid URL, reject */ }
            return false;
        }

        runtime.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!message || !message.type) return;
            if (!isAllowedSender(sender)) return;

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

            if (message.type === 'dtu-mazemap-resolve') {
                const building = String(message.building || '').trim();
                const room = String(message.room || '').trim();
                resolveMazemapPoi(building, room)
                    .then(sendResponse)
                    .catch(e => sendResponse({ ok: false, error: 'fetch_error', message: String(e && e.message || e) }));
                return true;
            }

            if (message.type === 'dtu-sdb-myline') {
                const forceRefresh = !!message.forceRefresh;
                fetchMyLine(forceRefresh)
                    .then(sendResponse)
                    .catch(() => sendResponse({ ok: false, error: 'fetch_error' }));
                return true;
            }

            if (message.type === 'dtu-library-events') {
                const cacheId = 'lyngby';
                storageCacheGet(CACHE_PREFIX_LIB_EVENTS, cacheId, LIB_CACHE_TTL_MS).then(cached => {
                    if (cached && !message.forceRefresh) {
                        cached.cached = true;
                        sendResponse(cached);
                        return;
                    }
                    fetchLibraryEvents()
                        .then(result => {
                            if (result && result.ok) storageCacheSet(CACHE_PREFIX_LIB_EVENTS, cacheId, result);
                            sendResponse(result);
                        })
                        .catch(() => sendResponse({ ok: false, error: 'fetch_error' }));
                });
                return true;
            }

            if (message.type === 'dtu-library-news') {
                const cacheId = 'main';
                storageCacheGet(CACHE_PREFIX_LIB_NEWS, cacheId, LIB_CACHE_TTL_MS).then(cached => {
                    if (cached && !message.forceRefresh) {
                        cached.cached = true;
                        sendResponse(cached);
                        return;
                    }
                    fetchLibraryNews()
                        .then(result => {
                            if (result && result.ok) storageCacheSet(CACHE_PREFIX_LIB_NEWS, cacheId, result);
                            sendResponse(result);
                        })
                        .catch(() => sendResponse({ ok: false, error: 'fetch_error' }));
                });
                return true;
            }

            return;
        });
    }
})();
