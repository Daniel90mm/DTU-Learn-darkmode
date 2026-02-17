// Dark mode script to inject styles into Shadow DOM elements
(function () {
    'use strict';

    // ===== DARK MODE TOGGLE =====
    const DARK_MODE_KEY = 'dtuDarkModeEnabled';
    const DEV_CONTEXT_CAPTURE_KEY = 'dtuDevContextCapture';
    const IS_TOP_WINDOW = (() => {
        try {
            return window === window.top;
        } catch (e) {
            return false;
        }
    })();
    const ENABLE_CONTEXT_CAPTURE_DEV_TOOL = (() => {
        try {
            return localStorage.getItem(DEV_CONTEXT_CAPTURE_KEY) === 'true';
        } catch (e) {
            return false;
        }
    })();

    // Check dark mode preference: cookie (.dtu.dk cross-origin) â†’ localStorage â†’ default true
    function isDarkModeEnabled() {
        try {
            const match = document.cookie.match(/dtuDarkMode=(\w+)/);
            if (match) return match[1] !== 'false';
        } catch (e) { /* cookie access blocked in some iframes */ }
        const stored = localStorage.getItem(DARK_MODE_KEY);
        if (stored !== null) return stored === 'true';
        return true;
    }

    function getExtensionStorageArea() {
        try {
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
                return { api: 'browser', area: browser.storage.local };
            }
        } catch (e) { }
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                return { api: 'chrome', area: chrome.storage.local };
            }
        } catch (e) { }
        return null;
    }

    // Save preference to all available stores (localStorage + cookie + extension storage)
    function saveDarkModePreference(enabled) {
        localStorage.setItem(DARK_MODE_KEY, String(enabled));
        try {
            if (location.hostname.endsWith('.dtu.dk')) {
                document.cookie = 'dtuDarkMode=' + enabled + '; domain=.dtu.dk; path=/; max-age=31536000; SameSite=Lax';
            }
        } catch (e) { /* cookie access blocked */ }
        var storage = getExtensionStorageArea();
        if (storage) {
            if (storage.api === 'browser') {
                storage.area.set({ [DARK_MODE_KEY]: enabled });
            } else {
                storage.area.set({ [DARK_MODE_KEY]: enabled }, function () { });
            }
        }
    }

    function getExtensionUrl(path) {
        try {
            if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
                return browser.runtime.getURL(path);
            }
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                return chrome.runtime.getURL(path);
            }
        } catch (e) {
            // Fall back to raw path below.
        }
        return path;
    }

    // Inject the dark mode CSS stylesheet via <link> element
    function injectDarkCSS() {
        if (document.getElementById('dtu-dark-mode-css')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = getExtensionUrl('darkmode.css');
        link.id = 'dtu-dark-mode-css';
        (document.head || document.documentElement).appendChild(link);
    }

    // Inject accent overrides for specific UI elements regardless of dark mode state
    function injectAccentOverrides() {
        if (document.getElementById('dtu-accent-overrides-css')) return;
        const style = document.createElement('style');
        style.id = 'dtu-accent-overrides-css';
        style.textContent = `
            /* Structural accent overrides for CampusNet/DTU sites (Light & Dark modes) */
            .boxHeader,
            .box.mainContentPageTemplate .boxHeader,
            .box.widget .boxHeader,
            #afrapporteringWidget .boxHeader {
                background-color: var(--dtu-ad-accent-deep) !important;
                background: var(--dtu-ad-accent-deep) !important;
                border-bottom-color: var(--dtu-ad-accent-deep-hover) !important;
                color: #ffffff !important;
            }

            .boxHeader h2,
            .box.mainContentPageTemplate .boxHeader h2,
            .box.widget .boxHeader h2,
            #afrapporteringWidget .boxHeader h2 {
                color: #ffffff !important;
                background-color: transparent !important;
            }

            /* Category titles in sidebar */
            h4.category__title,
            h4.category__title a {
                background-color: var(--dtu-ad-accent-deep) !important;
                background: var(--dtu-ad-accent-deep) !important;
                color: #ffffff !important;
            }

            h4.category__title:hover,
            h4.category__title:focus-within {
                background-color: var(--dtu-ad-accent-deep-hover) !important;
                background: var(--dtu-ad-accent-deep-hover) !important;
            }

            h4.category__title i,
            h4.category__title .toggle-category,
            h4.category__title .arc-menu-burger-expander {
                color: #ffffff !important;
            }

            /* Icon base (circle background) */
            .item__icon .icon__base,
            .service-icon .icon__base {
                color: var(--dtu-ad-accent) !important;
            }

            /* Group menu items (Courses, Groups, etc.) */
            .group-menu__item,
            .group-menu__item-burger {
                border-color: var(--dtu-ad-accent-deep) !important;
                background-color: var(--dtu-ad-accent-deep) !important;
            }

            .group-menu__item header,
            .group-menu__item-burger header {
                background-color: var(--dtu-ad-accent-deep) !important;
                background: var(--dtu-ad-accent-deep) !important;
            }

            .group-menu__item .item__title,
            .group-menu__item-burger .item__title,
            .group-menu__item header h2,
            .group-menu__item-burger header h2 {
                color: #ffffff !important;
            }

            .group-menu__item-burger-expander {
                color: #ffffff !important;
            }

            /* Links (Generic content links) */
            a,
            .groupLinksTable a:not(.arc-button) {
                color: var(--dtu-ad-accent) !important;
                text-decoration: none;
            }
            
            a:hover {
                color: var(--dtu-ad-accent-hover) !important;
            }

            /* Exclude top navigation and header links (keep them white) */
            .nav__item a,
            .header__top a,
            .top-menu a,
            .header__logo-area a,
            section.header a {
                color: #ffffff !important;
            }

            /* Keep black-bar top menu ("DTU INSIDE") white */
            .top-menu a,
            .top-menu a * {
                color: #ffffff !important;
            }

            /* Prevent red background on hover for menu items (Light mode fix) */
            .menu__item:hover {
                background-color: white !important;
                transition: none !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // Always inject accent overrides (even in light mode)
    injectAccentOverrides();

    // Synchronous check â€” inject CSS immediately if enabled (runs at document_start)
    const darkModeEnabled = isDarkModeEnabled();
    if (darkModeEnabled) {
        injectDarkCSS();
    }

    function applyStoredDarkModeValue(storedEnabled) {
        if (storedEnabled === undefined) return;
        localStorage.setItem(DARK_MODE_KEY, String(storedEnabled));
        try {
            if (location.hostname.endsWith('.dtu.dk')) {
                document.cookie = 'dtuDarkMode=' + storedEnabled + '; domain=.dtu.dk; path=/; max-age=31536000; SameSite=Lax';
            }
        } catch (e) { }
        if (storedEnabled !== darkModeEnabled && window === window.top) {
            location.reload();
        }
    }

    // Async cross-origin check via extension storage (covers s.brightspace.com etc.)
    var extensionStorage = getExtensionStorageArea();
    if (extensionStorage) {
        if (extensionStorage.api === 'browser') {
            extensionStorage.area.get(DARK_MODE_KEY).then(function (result) {
                applyStoredDarkModeValue(result[DARK_MODE_KEY]);
            }).catch(function () { });
        } else {
            extensionStorage.area.get([DARK_MODE_KEY], function (result) {
                if (chrome && chrome.runtime && chrome.runtime.lastError) return;
                applyStoredDarkModeValue(result ? result[DARK_MODE_KEY] : undefined);
            });
        }
    }

    function subscribeDarkModeStorageChanges() {
        var onChanged = function (changes, areaName) {
            if (!IS_TOP_WINDOW) return;
            if (areaName && areaName !== 'local') return;
            if (!changes || !changes[DARK_MODE_KEY]) return;
            var next = changes[DARK_MODE_KEY].newValue;
            if (typeof next !== 'boolean') return;
            if (next !== darkModeEnabled) {
                location.reload();
            }
        };

        try {
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.onChanged) {
                browser.storage.onChanged.addListener(onChanged);
                return;
            }
        } catch (e) { }
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener(onChanged);
            }
        } catch (e) { }
    }
    subscribeDarkModeStorageChanges();

    // Dark mode toggle for light mode (re-enable): inserted via runFeatureChecks below

    // ===== FEATURE FLAGS (extension-wide) =====
    // These toggles live in extension storage so they apply across all DTU domains.
    const FEATURE_BOOK_FINDER_KEY = 'dtuAfterDarkFeatureBookFinder';
    const FEATURE_KURSER_GRADE_STATS_KEY = 'dtuAfterDarkFeatureKurserGradeStats';
    const FEATURE_KURSER_TEXTBOOK_LINKER_KEY = 'dtuAfterDarkFeatureKurserTextbookLinker';
    const FEATURE_CONTENT_SHORTCUT_KEY = 'dtuAfterDarkFeatureContentShortcut';
    const FEATURE_CAMPUSNET_GPA_TOOLS_KEY = 'dtuAfterDarkFeatureCampusnetGpaTools';
    const FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY = 'dtuAfterDarkFeatureStudyplanExamCluster';
    const FEATURE_KURSER_COURSE_EVAL_KEY = 'dtuAfterDarkFeatureKurserCourseEval';
    const FEATURE_KURSER_ROOM_FINDER_KEY = 'dtuAfterDarkFeatureKurserRoomFinder';
    const FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY = 'dtuAfterDarkFeatureKurserScheduleAnnotation';
    const FEATURE_KURSER_MYLINE_BADGES_KEY = 'dtuAfterDarkFeatureKurserMyLineBadges';
    const FEATURE_SMART_ROOM_LINKER_KEY = 'dtuAfterDarkFeatureSmartRoomLinker';
    const FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY = 'dtuAfterDarkFeatureLearnNavResourceLinks';
    const FEATURE_PARTICIPANT_INTEL_KEY = 'dtuAfterDarkFeatureParticipantIntel';
    const FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY = 'dtuAfterDarkFeatureParticipantIntelDemographics';
    const FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY = 'dtuAfterDarkFeatureParticipantIntelSharedHistory';
    const FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY = 'dtuAfterDarkFeatureParticipantIntelSemesterTwins';
    const FEATURE_PARTICIPANT_INTEL_RETENTION_KEY = 'dtuAfterDarkFeatureParticipantIntelRetention';
    const FEATURE_LIBRARY_DROPDOWN_KEY = 'dtuAfterDarkFeatureLibraryDropdown';
    const PARTICIPANT_INTEL_STORAGE_KEY = 'dtuParticipantIntel';
    const PARTICIPANT_INTEL_MAX_STUDENTS = 5000;
    const PARTICIPANT_INTEL_MAX_RETENTION = 20;
    const SEMESTER_TWIN_PREFS_KEY = 'dtuAfterDarkSemesterTwinPrefsV1';

    const FEATURE_FLAG_DEFAULTS = {
        [FEATURE_BOOK_FINDER_KEY]: true,
        [FEATURE_KURSER_GRADE_STATS_KEY]: true,
        [FEATURE_KURSER_TEXTBOOK_LINKER_KEY]: true,
        [FEATURE_CONTENT_SHORTCUT_KEY]: true,
        [FEATURE_CAMPUSNET_GPA_TOOLS_KEY]: true,
        [FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY]: true,
        [FEATURE_KURSER_COURSE_EVAL_KEY]: true,
        [FEATURE_KURSER_ROOM_FINDER_KEY]: true,
        [FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY]: true,
        [FEATURE_KURSER_MYLINE_BADGES_KEY]: true,
        [FEATURE_SMART_ROOM_LINKER_KEY]: true,
        [FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY]: true,
        [FEATURE_PARTICIPANT_INTEL_KEY]: true,
        [FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY]: true,
        [FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY]: true,
        [FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY]: true,
        [FEATURE_PARTICIPANT_INTEL_RETENTION_KEY]: true,
        [FEATURE_LIBRARY_DROPDOWN_KEY]: true
    };

    let _featureFlags = Object.assign({}, FEATURE_FLAG_DEFAULTS);
    let _featureFlagsLoaded = false;

    function storageLocalGet(defaults, cb) {
        var storage = getExtensionStorageArea();
        if (!storage) {
            if (cb) cb(Object.assign({}, defaults));
            return;
        }
        try {
            if (storage.api === 'browser') {
                storage.area.get(defaults).then(function (result) {
                    cb(result || Object.assign({}, defaults));
                }).catch(function () {
                    cb(Object.assign({}, defaults));
                });
            } else {
                storage.area.get(defaults, function (result) {
                    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                        cb(Object.assign({}, defaults));
                        return;
                    }
                    cb(result || Object.assign({}, defaults));
                });
            }
        } catch (e) {
            cb(Object.assign({}, defaults));
        }
    }

    function storageLocalSet(items) {
        var storage = getExtensionStorageArea();
        if (!storage) return;
        try {
            if (storage.api === 'browser') {
                storage.area.set(items).catch(function () { });
            } else {
                storage.area.set(items, function () { });
            }
        } catch (e) {
            // ignore
        }
    }

    // ===== ACCENT THEME (extension-wide) =====
    // Stored in extension storage so it applies across all DTU domains.
    const ACCENT_THEME_KEY = 'dtuAfterDarkAccentThemeV1';
    const ACCENT_CUSTOM_HEX_KEY = 'dtuAfterDarkAccentCustomHexV1';
    const ACCENT_THEME_DEFAULT = 'dtu_red';
    const ACCENT_CUSTOM_DEFAULT = '#990000';
    const ACCENT_THEMES = {
        dtu_red: {
            label: 'DTU Corporate Red',
            accent: '#990000',
            accentHover: '#b30000',
            accentDeep: '#7d0000',
            accentDeepHover: '#990000',
            accentSoft: '#ff6b6b',
            accentBorder: '#7d0000'
        },
        dtu_blue: {
            label: 'DTU Blue',
            accent: '#2f3eea',
            accentHover: '#4d5af0',
            accentDeep: '#1f2bb5',
            accentDeepHover: '#2f3eea',
            accentSoft: '#9ca5ff',
            accentBorder: '#1f2bb5'
        },
        dtu_bright_green: {
            label: 'DTU Bright Green',
            accent: '#1fd082',
            accentHover: '#3ddd97',
            accentDeep: '#138a55',
            accentDeepHover: '#1aa66a',
            accentSoft: '#8cf0c5',
            accentBorder: '#12784b'
        },
        dtu_navy_blue: {
            label: 'DTU Navy Blue',
            accent: '#030f4f',
            accentHover: '#0c1e75',
            accentDeep: '#020a37',
            accentDeepHover: '#030f4f',
            accentSoft: '#7e8bc8',
            accentBorder: '#020a37'
        },
        dtu_yellow: {
            label: 'DTU Yellow',
            accent: '#f6d04d',
            accentHover: '#ffe073',
            accentDeep: '#c89f14',
            accentDeepHover: '#d8b12a',
            accentSoft: '#ffebad',
            accentBorder: '#b88f00'
        },
        dtu_orange: {
            label: 'DTU Orange',
            accent: '#fc7634',
            accentHover: '#ff914f',
            accentDeep: '#cc5519',
            accentDeepHover: '#e16526',
            accentSoft: '#ffc3a3',
            accentBorder: '#b84a13'
        },
        dtu_pink: {
            label: 'DTU Pink',
            accent: '#f7bbb1',
            accentHover: '#ffd0c8',
            accentDeep: '#c9857b',
            accentDeepHover: '#dea198',
            accentSoft: '#ffe7e2',
            accentBorder: '#b6736a'
        },
        dtu_grey: {
            label: 'DTU Grey',
            accent: '#dadada',
            accentHover: '#ececec',
            accentDeep: '#9f9f9f',
            accentDeepHover: '#b7b7b7',
            accentSoft: '#f4f4f4',
            accentBorder: '#8f8f8f'
        },
        dtu_red_secondary: {
            label: 'DTU Red',
            accent: '#e83f48',
            accentHover: '#ef636b',
            accentDeep: '#b3202a',
            accentDeepHover: '#cf2f38',
            accentSoft: '#ff9fa4',
            accentBorder: '#9e1d25'
        },
        dtu_green: {
            label: 'DTU Green',
            accent: '#008835',
            accentHover: '#12a24a',
            accentDeep: '#006125',
            accentDeepHover: '#00752d',
            accentSoft: '#79d39a',
            accentBorder: '#00531f'
        },
        dtu_purple: {
            label: 'DTU Purple',
            accent: '#79238e',
            accentHover: '#9440a8',
            accentDeep: '#5a1a6a',
            accentDeepHover: '#6b1f80',
            accentSoft: '#c78ed6',
            accentBorder: '#4f175d'
        },
        custom: {
            label: 'Custom',
            // Values are computed dynamically from ACCENT_CUSTOM_HEX_KEY.
            accent: '#990000',
            accentHover: '#b30000',
            accentDeep: '#7d0000',
            accentDeepHover: '#990000',
            accentSoft: '#ff6b6b',
            accentBorder: '#7d0000'
        }
    };
    // Official DTU palette presets + Custom (custom does not count as a preset).
    const ACCENT_THEME_ORDER = [
        'dtu_red',
        'dtu_blue',
        'dtu_navy_blue',
        'dtu_bright_green',
        'dtu_green',
        'dtu_yellow',
        'dtu_orange',
        'dtu_pink',
        'dtu_purple',
        'dtu_grey',
        'dtu_red_secondary',
        'custom'
    ];
    const STATUS_THEME = {
        info: '#2f3eea',
        success: '#008835',
        warning: '#f6d04d',
        warningStrong: '#fc7634',
        danger: '#e83f48'
    };

    let _accentThemeId = ACCENT_THEME_DEFAULT;
    let _accentThemeLoaded = false;
    let _accentThemeStorageSubscribed = false;
    let _accentCustomHex = ACCENT_CUSTOM_DEFAULT;

    function normalizeAccentThemeId(id) {
        var v = String(id || '').trim();
        var aliasMap = {
            // Backward compatibility for older preset ids.
            ocean_blue: 'dtu_blue',
            emerald_green: 'dtu_green',
            amber_orange: 'dtu_orange',
            royal_purple: 'dtu_purple',
            teal: 'dtu_bright_green'
        };
        if (Object.prototype.hasOwnProperty.call(aliasMap, v)) v = aliasMap[v];
        if (v && Object.prototype.hasOwnProperty.call(ACCENT_THEMES, v)) return v;
        return ACCENT_THEME_DEFAULT;
    }

    function parseHexColorToRgb(hex) {
        var s = String(hex || '').trim();
        if (!s) return null;
        if (s[0] === '#') s = s.slice(1);
        if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
        if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
        var r = parseInt(s.slice(0, 2), 16);
        var g = parseInt(s.slice(2, 4), 16);
        var b = parseInt(s.slice(4, 6), 16);
        return { r: r, g: g, b: b };
    }

    function clampByte(v) {
        var n = Math.round(Number(v || 0));
        if (n < 0) return 0;
        if (n > 255) return 255;
        return n;
    }

    function rgbToHex(rgb, fallback) {
        if (!rgb) return fallback || ACCENT_CUSTOM_DEFAULT;
        var r = clampByte(rgb.r), g = clampByte(rgb.g), b = clampByte(rgb.b);
        var s = (r << 16) | (g << 8) | b;
        var hex = s.toString(16).padStart(6, '0');
        return ('#' + hex).toLowerCase();
    }

    function mixRgb(a, b, t) {
        if (!a || !b) return a || b || { r: 198, g: 40, b: 40 };
        var tt = Math.max(0, Math.min(1, Number(t || 0)));
        return {
            r: a.r + (b.r - a.r) * tt,
            g: a.g + (b.g - a.g) * tt,
            b: a.b + (b.b - a.b) * tt
        };
    }

    function lightenHex(hex, amt, fallbackHex) {
        var rgb = parseHexColorToRgb(hex);
        if (!rgb) rgb = parseHexColorToRgb(fallbackHex || ACCENT_CUSTOM_DEFAULT);
        return rgbToHex(mixRgb(rgb, { r: 255, g: 255, b: 255 }, amt), fallbackHex || ACCENT_CUSTOM_DEFAULT);
    }

    function darkenHex(hex, amt, fallbackHex) {
        var rgb = parseHexColorToRgb(hex);
        if (!rgb) rgb = parseHexColorToRgb(fallbackHex || ACCENT_CUSTOM_DEFAULT);
        return rgbToHex(mixRgb(rgb, { r: 0, g: 0, b: 0 }, amt), fallbackHex || ACCENT_CUSTOM_DEFAULT);
    }

    function normalizeHexColor(hex, fallbackHex) {
        var rgb = parseHexColorToRgb(hex);
        if (!rgb) return (fallbackHex || null);
        return rgbToHex(rgb, fallbackHex || ACCENT_CUSTOM_DEFAULT);
    }

    function hexToRgbTriplet(hex, fallbackTriplet) {
        var rgb = parseHexColorToRgb(hex);
        if (!rgb) return fallbackTriplet || '198,40,40';
        return rgb.r + ',' + rgb.g + ',' + rgb.b;
    }

    function rgbaFromHex(hex, alpha, fallbackHex) {
        var rgb = parseHexColorToRgb(hex);
        if (!rgb) rgb = parseHexColorToRgb(fallbackHex || '#990000');
        if (!rgb) return 'rgba(153,0,0,' + String(alpha || 0) + ')';
        return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + String(alpha || 0) + ')';
    }

    function getAccentCustomHexFromLocalStorage() {
        try {
            return localStorage.getItem(ACCENT_CUSTOM_HEX_KEY);
        } catch (e) {
            return null;
        }
    }

    function computeCustomAccentTheme(hex) {
        var base = normalizeHexColor(hex, ACCENT_CUSTOM_DEFAULT) || ACCENT_CUSTOM_DEFAULT;
        // Pragmatic palette: strong primary, deeper bar, lighter "soft" for text on dark UI.
        // Keep it deterministic so it works cross-site with our existing CSS variables.
        return {
            label: 'Custom',
            accent: base,
            accentHover: lightenHex(base, 0.12, base),
            accentDeep: darkenHex(base, 0.38, base),
            accentDeepHover: darkenHex(base, 0.24, base),
            accentSoft: lightenHex(base, 0.45, base),
            accentBorder: darkenHex(base, 0.28, base)
        };
    }

    function getAccentThemeById(id) {
        var key = normalizeAccentThemeId(id);
        if (key === 'custom') return computeCustomAccentTheme(_accentCustomHex || ACCENT_CUSTOM_DEFAULT);
        return ACCENT_THEMES[key] || ACCENT_THEMES[ACCENT_THEME_DEFAULT];
    }

    function applyAccentThemeVars(theme) {
        var root = document.documentElement;
        if (!root || !root.style || !theme) return;

        root.style.setProperty('--dtu-ad-accent', theme.accent);
        root.style.setProperty('--dtu-ad-accent-hover', theme.accentHover);
        root.style.setProperty('--dtu-ad-accent-rgb', hexToRgbTriplet(theme.accent, '153,0,0'));

        root.style.setProperty('--dtu-ad-accent-deep', theme.accentDeep);
        root.style.setProperty('--dtu-ad-accent-deep-hover', theme.accentDeepHover || theme.accentHover);
        root.style.setProperty('--dtu-ad-accent-deep-rgb', hexToRgbTriplet(theme.accentDeep, '125,0,0'));

        root.style.setProperty('--dtu-ad-accent-soft', theme.accentSoft || theme.accent);
        root.style.setProperty('--dtu-ad-accent-border', theme.accentBorder || theme.accentDeep);

        // Semantic status colors (stable DTU palette, independent of selected accent).
        root.style.setProperty('--dtu-ad-status-info', STATUS_THEME.info);
        root.style.setProperty('--dtu-ad-status-info-rgb', hexToRgbTriplet(STATUS_THEME.info, '47,62,234'));

        root.style.setProperty('--dtu-ad-status-success', STATUS_THEME.success);
        root.style.setProperty('--dtu-ad-status-success-rgb', hexToRgbTriplet(STATUS_THEME.success, '0,136,53'));

        root.style.setProperty('--dtu-ad-status-warning', STATUS_THEME.warning);
        root.style.setProperty('--dtu-ad-status-warning-rgb', hexToRgbTriplet(STATUS_THEME.warning, '246,208,77'));
        root.style.setProperty('--dtu-ad-status-warning-strong', STATUS_THEME.warningStrong);
        root.style.setProperty('--dtu-ad-status-warning-strong-rgb', hexToRgbTriplet(STATUS_THEME.warningStrong, '252,118,52'));

        root.style.setProperty('--dtu-ad-status-danger', STATUS_THEME.danger);
        root.style.setProperty('--dtu-ad-status-danger-rgb', hexToRgbTriplet(STATUS_THEME.danger, '232,63,72'));
    }

    function getAccentThemeIdFromLocalStorage() {
        try {
            return localStorage.getItem(ACCENT_THEME_KEY);
        } catch (e) {
            return null;
        }
    }

    function applyAfterDarkAdminMenuThemeVars(rootEl) {
        if (!rootEl || !rootEl.style) return;
        var isDark = !!darkModeEnabled;
        var theme = getAccentThemeById(_accentThemeId);
        var deep = theme.accentDeep || '#990000';
        var soft = theme.accentSoft || deep;

        rootEl.style.setProperty('--dtu-am-sidebar-bg', isDark ? '#2d2d2d' : '#f3f4f6');
        rootEl.style.setProperty('--dtu-am-content-bg', isDark ? '#2d2d2d' : '#ffffff');
        rootEl.style.setProperty('--dtu-am-text', isDark ? '#e0e0e0' : '#1f2937');
        rootEl.style.setProperty('--dtu-am-muted', isDark ? '#888' : '#6b7280');
        rootEl.style.setProperty('--dtu-am-border', isDark ? '#333' : '#e5e7eb');
        rootEl.style.setProperty('--dtu-am-hover', isDark ? '#333' : '#e5e7eb');
        rootEl.style.setProperty('--dtu-am-action', isDark ? '#93c5fd' : '#1565c0');
        rootEl.style.setProperty('--dtu-am-toggle-off', isDark ? '#555' : '#ccc');
        rootEl.style.setProperty('--dtu-am-height', '600px');

        rootEl.style.setProperty('--dtu-am-accent', deep);
        rootEl.style.setProperty('--dtu-am-active-text', isDark ? soft : deep);
        rootEl.style.setProperty('--dtu-am-active-bg', isDark ? rgbaFromHex(deep, 0.13) : rgbaFromHex(deep, 0.07));
        rootEl.style.setProperty('--dtu-am-input-bg', isDark ? '#1a1a1a' : '#f9fafb');
        rootEl.style.setProperty('--dtu-am-accent-ring', isDark ? rgbaFromHex(deep, 0.28) : rgbaFromHex(deep, 0.18));
    }

    function syncAccentThemeUi() {
        try {
            document.querySelectorAll('[data-dtu-accent-theme-select]').forEach(function (sel) {
                if (!sel) return;
                try { sel.value = _accentThemeId; } catch (e0) { }
            });
        } catch (e) { }

        try {
            document.querySelectorAll('[data-dtu-accent-custom-input]').forEach(function (inp) {
                if (!inp) return;
                try { inp.value = normalizeHexColor(_accentCustomHex, ACCENT_CUSTOM_DEFAULT) || ACCENT_CUSTOM_DEFAULT; } catch (e0) { }
                try { inp.style.display = (_accentThemeId === 'custom') ? '' : 'none'; } catch (e1) { }
            });
        } catch (e1) { }

        // Keep any open settings UI in sync.
        try {
            document.querySelectorAll('.dtu-am-root').forEach(function (rootEl) {
                try { applyAfterDarkAdminMenuThemeVars(rootEl); } catch (e1) { }
            });
        } catch (e2) { }
    }

    function setAccentCustomHex(nextHex, opts) {
        var normalized = normalizeHexColor(nextHex, null);
        if (!normalized) return;
        _accentCustomHex = normalized;
        try { localStorage.setItem(ACCENT_CUSTOM_HEX_KEY, normalized); } catch (e0) { }

        if (_accentThemeId === 'custom') {
            applyAccentThemeVars(getAccentThemeById('custom'));
            syncAccentThemeUi();
            try { replaceLogoImage(); } catch (eLogoCustom) { }
        }

        if (opts && opts.noStorage) return;
        storageLocalSet({ [ACCENT_CUSTOM_HEX_KEY]: normalized });
    }

    function setAccentThemeId(nextId, opts) {
        var id = normalizeAccentThemeId(nextId);
        _accentThemeId = id;
        try { localStorage.setItem(ACCENT_THEME_KEY, id); } catch (e0) { }

        applyAccentThemeVars(getAccentThemeById(id));
        syncAccentThemeUi();
        try { replaceLogoImage(); } catch (eLogoTheme) { }

        if (opts && opts.noStorage) return;
        storageLocalSet({ [ACCENT_THEME_KEY]: id });
    }

    function loadAccentTheme(cb) {
        if (_accentThemeLoaded) {
            if (cb) cb(_accentThemeId);
            return;
        }
        storageLocalGet({
            [ACCENT_THEME_KEY]: ACCENT_THEME_DEFAULT,
            [ACCENT_CUSTOM_HEX_KEY]: ACCENT_CUSTOM_DEFAULT
        }, function (result) {
            _accentThemeLoaded = true;
            var storedTheme = result ? result[ACCENT_THEME_KEY] : null;
            var storedCustom = result ? result[ACCENT_CUSTOM_HEX_KEY] : null;

            // Load custom first so selecting "custom" immediately uses the stored color.
            if (typeof storedCustom === 'string' && storedCustom) {
                var normCustom = normalizeHexColor(storedCustom, ACCENT_CUSTOM_DEFAULT) || ACCENT_CUSTOM_DEFAULT;
                _accentCustomHex = normCustom;
                try { localStorage.setItem(ACCENT_CUSTOM_HEX_KEY, normCustom); } catch (e0) { }
            }

            if (typeof storedTheme === 'string' && storedTheme) {
                var normalized = normalizeAccentThemeId(storedTheme);
                if (normalized !== _accentThemeId) setAccentThemeId(normalized, { noStorage: true });
                else {
                    // Re-apply in case custom changed and the current theme depends on it.
                    applyAccentThemeVars(getAccentThemeById(_accentThemeId));
                    syncAccentThemeUi();
                }
            } else {
                // Theme wasn't stored; still apply custom if we're currently on "custom".
                applyAccentThemeVars(getAccentThemeById(_accentThemeId));
                syncAccentThemeUi();
            }
            if (cb) cb(_accentThemeId);
        });
    }

    function subscribeAccentThemeStorageChanges() {
        if (_accentThemeStorageSubscribed) return;
        _accentThemeStorageSubscribed = true;

        var onChanged = function (changes, areaName) {
            if (areaName && areaName !== 'local') return;
            if (!changes) return;

            if (changes[ACCENT_THEME_KEY]) {
                var next = changes[ACCENT_THEME_KEY] ? changes[ACCENT_THEME_KEY].newValue : undefined;
                if (typeof next === 'string' && next) setAccentThemeId(next, { noStorage: true });
            }

            if (changes[ACCENT_CUSTOM_HEX_KEY]) {
                var nextHex = changes[ACCENT_CUSTOM_HEX_KEY] ? changes[ACCENT_CUSTOM_HEX_KEY].newValue : undefined;
                if (typeof nextHex === 'string' && nextHex) setAccentCustomHex(nextHex, { noStorage: true });
            }
        };

        try {
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.onChanged) {
                browser.storage.onChanged.addListener(onChanged);
                return;
            }
        } catch (e) { }
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener(onChanged);
            }
        } catch (e2) { }
    }

    // Apply sync value immediately for faster first paint.
    _accentThemeId = normalizeAccentThemeId(getAccentThemeIdFromLocalStorage());
    _accentCustomHex = normalizeHexColor(getAccentCustomHexFromLocalStorage(), ACCENT_CUSTOM_DEFAULT) || ACCENT_CUSTOM_DEFAULT;
    applyAccentThemeVars(getAccentThemeById(_accentThemeId));
    // Then sync from extension storage (cross-domain).
    loadAccentTheme(function () { });
    subscribeAccentThemeStorageChanges();

    function loadFeatureFlags(cb) {
        if (_featureFlagsLoaded) {
            if (cb) cb(_featureFlags);
            return;
        }
        storageLocalGet(FEATURE_FLAG_DEFAULTS, function (flags) {
            _featureFlags = Object.assign({}, FEATURE_FLAG_DEFAULTS, flags || {});
            _featureFlagsLoaded = true;
            if (cb) cb(_featureFlags);
        });
    }

    function isFeatureFlagEnabled(key) {
        if (!key) return true;
        if (_featureFlagsLoaded) return !!_featureFlags[key];
        if (Object.prototype.hasOwnProperty.call(FEATURE_FLAG_DEFAULTS, key)) return !!FEATURE_FLAG_DEFAULTS[key];
        return true;
    }

    function setFeatureFlagEnabled(key, enabled) {
        if (!key) return;
        _featureFlags[key] = !!enabled;
        storageLocalSet({ [key]: !!enabled });
    }

    var _featureFlagStorageSubscribed = false;
    var _featureFlagStorageChangeTimer = null;
    function subscribeFeatureFlagStorageChanges() {
        if (_featureFlagStorageSubscribed) return;
        _featureFlagStorageSubscribed = true;

        var onChanged = function (changes, areaName) {
            if (areaName && areaName !== 'local') return;
            if (!changes) return;

            var touched = false;
            Object.keys(changes).forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(FEATURE_FLAG_DEFAULTS, key)) return;
                var next = changes[key] ? changes[key].newValue : undefined;
                if (typeof next !== 'boolean') return;
                _featureFlags[key] = next;
                touched = true;
            });

            if (Object.prototype.hasOwnProperty.call(changes, SEMESTER_TWIN_PREFS_KEY)) {
                touched = true;
                _participantIntelSemesterTwinLastTs = 0;
                _participantIntelSemesterTwinCampusnetLastTs = 0;
            }

            if (!touched) return;
            if (_featureFlagStorageChangeTimer) return;
            _featureFlagStorageChangeTimer = setTimeout(function () {
                _featureFlagStorageChangeTimer = null;
                if (IS_TOP_WINDOW) {
                    try { syncAfterDarkFeatureToggleStates(); } catch (e1) { }
                    try { runTopWindowFeatureChecks(null, false); } catch (e2) { }
                } else {
                    try { runFrameFeatureChecks(null); } catch (e3) { }
                }
            }, 120);
        };

        try {
            if (typeof browser !== 'undefined' && browser.storage && browser.storage.onChanged) {
                browser.storage.onChanged.addListener(onChanged);
                return;
            }
        } catch (e) { }
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener(onChanged);
            }
        } catch (e2) { }
    }

    // Load feature flags early so cross-domain toggles work without a full refresh cycle.
    // Note: some pages (Brightspace Content) render inside same-origin iframes; we still
    // want lightweight features (e.g. Smart Room Links) there.
    loadFeatureFlags(function () {
        if (IS_TOP_WINDOW) {
            try { syncAfterDarkFeatureToggleStates(); } catch (e1) { }
            try { runTopWindowFeatureChecks(null, false); } catch (e2) { }
        } else {
            try { runFrameFeatureChecks(null); } catch (e3) { }
        }
    });
    subscribeFeatureFlagStorageChanges();

    // Dark mode colors
    const DARK_BG = '#2d2d2d';
    const DARK_TEXT = '#e0e0e0';
    const DARK_BORDER = '#404040';

    // CSS to inject into shadow roots
    const shadowDOMStyles = `
        /* Override all backgrounds to dark */
        * {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        /* Card elements */
        d2l-card,
        .d2l-card,
        .d2l-card-container,
        .d2l-enrollment-card-content-flex,
        .d2l-card-link-container,
        .d2l-card-header,
        .d2l-card-content,
        .d2l-card-actions,
        .d2l-card-footer,
        .d2l-card-badge,
        [slot="content"],
        [slot="header"],
        [slot="footer"] {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        /* Links should still be visible */
        a {
            color: #66b3ff !important;
        }

        /* Accent for important buttons */
        .d2l-button-primary,
        button[primary] {
            background-color: var(--dtu-ad-accent) !important;
            color: #ffffff !important;
        }

        /* Status indicators */
        .d2l-enrollment-card-status-indicator {
            filter: grayscale(0) !important;
            opacity: 1 !important;
        }

        /* List role containers (except left nav wrapper) */
        div[role="list"]:not(.d2l-navigation-s-main-wrapper),
        [role="list"]:not(.d2l-navigation-s-main-wrapper) {
            background: #1a1a1a !important;
            background-color: #1a1a1a !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }

        /* Breadcrumb list container can have gradient backgrounds in DTU Learn */
        nav[aria-label="Breadcrumb"],
        nav[aria-label="Breadcrumb"] div[role="list"],
        nav[aria-label="Breadcrumb"] [role="list"] {
            background: #1a1a1a !important;
            background-color: #1a1a1a !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }

        /* Action trigger buttons */
        button[aria-haspopup="true"][aria-label^="Actions for"],
        button[aria-label^="Actions for"] {
            background-color: #2d2d2d !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        button[aria-label^="Actions for"] d2l-icon[icon="tier1:chevron-down"] {
            background-color: #2d2d2d !important;
            background: #2d2d2d !important;
            background-image: none !important;
        }

        /* Specific action buttons that stay dark 2 */
        button[aria-haspopup="true"][aria-label="Actions for Work To Do"],
        button[aria-label^="Actions for Work To Do"],
        button[aria-haspopup="true"][aria-label="Actions for Study Announcements"],
        button[aria-label^="Actions for Study Announcements"],
        button[aria-haspopup="true"][aria-label="Actions for Calendar"],
        button[aria-label^="Actions for Calendar"],
        button[aria-haspopup="true"][aria-label="Actions for Lecture 01, Quiz 1"],
        button[aria-label^="Actions for Lecture 01, Quiz 1"] {
            background-color: #2d2d2d !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        button[aria-label^="Actions for Work To Do"] d2l-icon[icon="tier1:chevron-down"],
        button[aria-label^="Actions for Study Announcements"] d2l-icon[icon="tier1:chevron-down"],
        button[aria-label^="Actions for Calendar"] d2l-icon[icon="tier1:chevron-down"],
        button[aria-label^="Actions for Lecture 01, Quiz 1"] d2l-icon[icon="tier1:chevron-down"] {
            background-color: #2d2d2d !important;
            background: #2d2d2d !important;
            background-image: none !important;
        }

        /* Breadcrumb elements */
        d2l-breadcrumb,
        d2l-breadcrumbs,
        d2l-breadcrumb-current-page,
        .d2l-breadcrumb,
        .d2l-breadcrumbs {
            background: #1a1a1a !important;
            background-color: #1a1a1a !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }

        /* Breadcrumb links */
        a.d2l-link-small:not(.d2l-link-inline),
        span[aria-current="page"] {
            background-color: #1a1a1a !important;
        }

        /* Keep chevron separators on dark 2 */
        d2l-icon[icon="tier1:chevron-right"] {
            background-color: #2d2d2d !important;
        }

        /* Inline links - lighter dark */
        a.d2l-link-inline {
            background-color: #2d2d2d !important;
        }

        /* Floating buttons */
        d2l-floating-buttons,
        .d2l-floating-buttons-container,
        .d2l-floating-buttons,
        .d2l-floating-buttons-inner-container {
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
        }

        /* Empty state */
        .empty-state-container,
        .d2l-empty-state-description,
        .d2l-body-compact {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        /* Accent navigation band (DTU Learn) */
        d2l-labs-navigation-band,
        d2l-labs-navigation-band * {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            background-image: none !important;
            color: #ffffff !important;
        }
        d2l-labs-navigation-band a:hover {
            background-color: var(--dtu-ad-accent-deep-hover) !important;
            background: var(--dtu-ad-accent-deep-hover) !important;
        }

        /* Count badges (DTU Learn) */
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count,
        .d2l-count-badge-number,
        .d2l-count-badge-number > div {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            color: #ffffff !important;
        }
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count {
            border-radius: 999px !important;
            padding: 0 7px !important;
            min-width: 18px !important;
            text-align: center !important;
        }
        .d2l-count-badge-number {
            border-color: #ffffff !important;
        }

        /* Announcement title text */
        .uw-text {
            color: var(--dtu-ad-accent-soft) !important;
        }
    `;

    // Styles for same-origin iframes
    const iframeStyles = `
        body,
        html,
        #app,
        #app > *,
        .d2l-typography,
        .d2l-typography > * {
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
        }

        .box-section.bg-white.rounded,
        .panel-section .box-section {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        /* Navigation tree and items */
        .navigation-container,
        .navigation-menu,
        .navigation-search,
        .navigation-tree,
        .navigation-tree > div,
        .navigation-item,
        .navigation-item > div,
        .navigation-item div,
        .unit,
        .unit-box,
        [role="treeitem"],
        d2l-lessons-toc {
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        /* List items - dark 2 (#2d2d2d) */
        d2l-list,
        d2l-list-item,
        d2l-list-item-nav {
            background-color: #2d2d2d !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        /* Selected list item - same dark 2 background */
        d2l-list-item-nav[current] {
            background-color: #2d2d2d !important;
        }

        /* Ensure scrollbar area is also dark */
        ::-webkit-scrollbar-track {
            background: #1a1a1a !important;
        }

        ::-webkit-scrollbar {
            background: #1a1a1a !important;
        }

        .co-content,
        .title-container,
        .title,
        .title-text,
        .text-wrapper,
        .date-container,
        .due-date-container {
            background-color: transparent !important;
            color: ${DARK_TEXT} !important;
        }

        .unit-box .fadeout,
        .fadeout {
            background: transparent !important;
            display: none !important;
        }

        /* Links */
        a {
            color: #66b3ff !important;
        }

        /* Module headers and text */
        h1, h2, h3, h4, h5, h6,
        .d2l-heading-1,
        .d2l-heading-2,
        .d2l-heading-3,
        .module-header,
        h1.module-header,
        h1.d2l-heading-1 {
            color: #ffffff !important;
        }

        p, div, b, i {
            color: ${DARK_TEXT} !important;
        }
        span:not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        em:not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        strong:not([style^="color"]):not([style*="; color"]):not([style*=";color"]) {
            color: ${DARK_TEXT} !important;
        }

        /* Override near-black text */
        [style*="color: #202122"], [style*="color:#202122"],
        [style*="color: rgb(32, 33, 34"] {
            color: ${DARK_TEXT} !important;
        }

        /* Multiselect (email recipients) */
        .d2l-multiselect,
        ul.d2l-multiselect,
        ul[id*="$control"],
        [id*="Addresses$control"] {
            background-color: #3d3d3d !important;
            border-color: #505050 !important;
        }

        .d2l-multiselect-choice,
        li.d2l-multiselect-choice,
        ul[id*="$control"] li.d2l-multiselect-choice,
        li[class*="d2l-multiselect-choice"] {
            background-color: #4a4a4a !important;
            color: ${DARK_TEXT} !important;
            border-color: #606060 !important;
        }

        .d2l-multiselect-choice span,
        li.d2l-multiselect-choice span,
        ul[id*="$control"] li span,
        li[class*="d2l-multiselect-choice"] span {
            color: ${DARK_TEXT} !important;
        }

        .d2l-multiselect-choice a,
        .d2l-multiselect-clearicon,
        .d2l-imagelink,
        ul[id*="$control"] li a {
            color: ${DARK_TEXT} !important;
        }

        .d2l-multiselect-input,
        .d2l-multiselect-input input,
        .d2l-multiselect input.d2l-edit,
        ul[id*="$control"] input,
        input.d2l-edit {
            background-color: #3d3d3d !important;
            color: ${DARK_TEXT} !important;
            border-color: #505050 !important;
        }

        /* Autocomplete dropdown */
        .d2l-autocomplete-dynamic,
        [id*="AutoComplete"],
        .d2l-autocomplete-message {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: #505050 !important;
        }

        /* Popup title */
        .d2l-popup-title,
        .d2l-popup-title h1 {
            background-color: ${DARK_BG} !important;
            color: #ffffff !important;
        }

        /* Accent badges and announcement titles */
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count,
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            color: #ffffff !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent-soft) !important;
        }
    `;

    // Styles specifically for icon shadow roots
    const iconShadowStyles = `
        :host {
            color: ${DARK_TEXT} !important;
        }

        svg {
            fill: ${DARK_TEXT} !important;
        }

        path {
            fill: ${DARK_TEXT} !important;
        }

        /* Make sure icons are visible on dark backgrounds */
        * {
            fill: ${DARK_TEXT} !important;
            color: ${DARK_TEXT} !important;
        }
    `;

    // Styles specifically for enrollment card shadow roots
    const enrollmentCardShadowStyles = `
        :host {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        .d2l-enrollment-card-container,
        .d2l-enrollment-card-content,
        .d2l-enrollment-card-content-flex {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        /* Override white backgrounds in enrollment cards */
        .d2l-enrollment-card-status-indicator {
            background-color: ${DARK_BG} !important;
            box-shadow: 0 0 0 2px ${DARK_BG} !important;
        }

        .d2l-enrollment-card-icon-container {
            background-color: ${DARK_BG} !important;
        }

        /* Don't override the course image container */
        .d2l-enrollment-card-image-container {
            background-color: transparent !important;
        }

        /* Course overlay should remain dark overlay */
        .d2l-enrollment-card-overlay {
            background-color: rgba(0, 0, 0, 0.7) !important;
        }

        /* Don't touch images */
        img,
        svg,
        d2l-organization-image,
        d2l-course-image {
            background-color: transparent !important;
            filter: none !important;
        }
    `;

    // Styles specifically for d2l-card shadow roots
    const cardShadowStyles = `
        /* Override the white background from d2l-card */
        :host {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        .d2l-card-container {
            background: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        .d2l-card-link-container {
            background: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        .d2l-card-container a,
        .d2l-card-container a:link,
        .d2l-card-container a:visited {
            background-color: transparent !important;
            color: ${DARK_TEXT} !important;
        }

        .d2l-card-content {
            background: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        .d2l-card-footer {
            background: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        /* Keep header, actions, and badge transparent (for images) */
        .d2l-card-header {
            background-color: transparent !important;
        }

        .d2l-card-actions {
            background-color: transparent !important;
        }

        .d2l-card-badge {
            background-color: transparent !important;
        }

        .d2l-card-title,
        .d2l-card-subtitle,
        .d2l-card-link-text,
        .d2l-card-text {
            color: ${DARK_TEXT} !important;
            background-color: transparent !important;
        }

        .d2l-card-divider,
        .d2l-card-separator {
            border-color: ${DARK_BORDER} !important;
        }

        /* Don't touch images, icons, or course headers */
        img,
        svg,
        d2l-organization-image,
        d2l-course-image,
        [slot="header"] {
            background-color: transparent !important;
            filter: none !important;
        }

        /* Keep links visible */
        a {
            background-color: transparent !important;
        }

        /* Content shortcut button â€” use a.class to beat .d2l-card-container a specificity */
        a.dtu-dark-content-btn,
        a.dtu-dark-content-btn:link,
        a.dtu-dark-content-btn:visited {
            position: absolute !important;
            bottom: 6px !important;
            right: 6px !important;
            transform: translate(195px, 60px) !important;
            min-width: 42px !important;
            min-height: 42px !important;
            width: 42px !important;
            height: 42px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 6px !important;
            background-color: #2d2d2d !important;
            color: #ffffff !important;
            font-size: 18px !important;
            font-family: sans-serif !important;
            text-decoration: none !important;
            cursor: pointer !important;
            z-index: 5 !important;
            border: none !important;
            box-sizing: border-box !important;
            line-height: 1 !important;
            transition: opacity 0.2s, background-color 0.2s !important;
            padding: 0 !important;
            margin: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        :host(:hover) a.dtu-dark-content-btn,
        .d2l-card-container:hover a.dtu-dark-content-btn,
        .d2l-card-header:hover a.dtu-dark-content-btn {
            opacity: 1 !important;
            pointer-events: auto !important;
        }
        a.dtu-dark-content-btn:hover {
            background-color: rgba(0, 0, 0, 0.85) !important;
        }
    `;

    // Styles for expand/collapse content and LTI launch elements
    const expandCollapseStyles = `
        /* Dark background for expand/collapse containers */
        :host {
            background-color: ${DARK_BG} !important;
        }

        .d2l-expand-collapse-content-container {
            background-color: ${DARK_BG} !important;
        }

        .d2l-expand-collapse-content-inner {
            background-color: ${DARK_BG} !important;
        }

        .d2l-widget-content {
            background-color: ${DARK_BG} !important;
        }

        .d2l-widget-content-padding {
            background-color: ${DARK_BG} !important;
        }

        /* Don't style the iframe itself - just its container */
        iframe {
            background-color: transparent !important;
        }
    `;

    // Styles for menu and menu items
    const menuStyles = `
        /* Dark background for menus */
        :host {
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
        }

        .d2l-menu,
        .d2l-menu-mvc,
        .d2l-contextmenu {
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        .d2l-menu-item,
        .d2l-menu-item-text {
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
        }

        .d2l-menu-item:hover,
        .d2l-menu-item:focus {
            background-color: #2d2d2d !important;
            color: ${DARK_TEXT} !important;
        }

        a {
            color: ${DARK_TEXT} !important;
            background-color: transparent !important;
        }

        button,
        button[aria-haspopup="true"][aria-label^="Actions for"] {
            color: ${DARK_TEXT} !important;
            background-color: #2d2d2d !important;
            border-color: ${DARK_BORDER} !important;
        }

        button[aria-haspopup="true"][aria-label="Actions for Work To Do"],
        button[aria-label^="Actions for Work To Do"],
        button[aria-haspopup="true"][aria-label="Actions for Study Announcements"],
        button[aria-label^="Actions for Study Announcements"],
        button[aria-haspopup="true"][aria-label="Actions for Calendar"],
        button[aria-label^="Actions for Calendar"],
        button[aria-haspopup="true"][aria-label="Actions for Lecture 01, Quiz 1"],
        button[aria-label^="Actions for Lecture 01, Quiz 1"] {
            background-color: #2d2d2d !important;
            border-color: ${DARK_BORDER} !important;
        }

        button[aria-label^="Actions for Work To Do"] d2l-icon[icon="tier1:chevron-down"],
        button[aria-label^="Actions for Study Announcements"] d2l-icon[icon="tier1:chevron-down"],
        button[aria-label^="Actions for Calendar"] d2l-icon[icon="tier1:chevron-down"],
        button[aria-label^="Actions for Lecture 01, Quiz 1"] d2l-icon[icon="tier1:chevron-down"] {
            background-color: #2d2d2d !important;
            background: #2d2d2d !important;
            background-image: none !important;
        }

        div[role="list"] {
            background: #1a1a1a !important;
            background-color: #1a1a1a !important;
            background-image: none !important;
        }

        nav[aria-label="Breadcrumb"],
        nav[aria-label="Breadcrumb"] div[role="list"],
        nav[aria-label="Breadcrumb"] [role="list"] {
            background: #1a1a1a !important;
            background-color: #1a1a1a !important;
            background-image: none !important;
        }

        /* Accent badges/text that should remain highlighted */
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count,
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            background-image: none !important;
            color: #ffffff !important;
            border: 0 !important;
            outline: 0 !important;
            box-shadow: none !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent) !important;
        }
    `;

    // Styles for d2l-list-item-nav and lessons content (new content browser)
    const listItemNavStyles = `
        :host {
            background-color: transparent !important;
            color: ${DARK_TEXT} !important;
        }

        /* Only set color on all elements, not background */
        * {
            color: ${DARK_TEXT} !important;
        }

        /* Target the white rectangle inside list items (pin to dark 1) */
        [slot="outside-control-container"] {
            background-color: #1a1a1a !important;
            background: #1a1a1a !important;
            background-image: none !important;
        }

        /* Selected/current item state - keep dark 1 */
        :host([current]) {
            background-color: #1a1a1a !important;
            background: #1a1a1a !important;
            background-image: none !important;
        }
        :host([current]) [slot="outside-control-container"] {
            background-color: #1a1a1a !important;
            background: #1a1a1a !important;
            background-image: none !important;
        }

        /* Lessons TOC title rail: prevent dark-2 "chips" behind wrapped text */
        .co-content,
        .title-container,
        .title,
        .title > div,
        .title-text,
        .title-text span,
        .text-wrapper,
        .overflow-detector,
        .overflow-detector span,
        .date-container,
        .due-date-container {
            background-color: #1a1a1a !important;
            background: #1a1a1a !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }

        .title::before,
        .title::after {
            background-color: #1a1a1a !important;
            background: #1a1a1a !important;
            background-image: none !important;
        }

        d2l-icon.module-triangle,
        d2l-icon[icon="tier1:arrow-collapse-small"],
        d2l-icon[icon="tier1:arrow-expand-small"],
        d2l-icon[icon="tier1:dragger"],
        d2l-icon[icon="tier2:upload"],
        d2l-icon[icon="tier2:file-document"] {
            background-color: #1a1a1a !important;
            background: #1a1a1a !important;
            background-image: none !important;
            color: ${DARK_TEXT} !important;
        }

        /* Links should be visible blue */
        a {
            color: #66b3ff !important;
        }

        /* Ensure text is visible */
        [slot="supporting-info"],
        [slot="content"],
        div, span, p, h1, h2, h3, h4, h5, h6 {
            color: ${DARK_TEXT} !important;
        }

        /* Accent badges/text that should remain highlighted */
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count,
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            background-image: none !important;
            color: #ffffff !important;
            border: 0 !important;
            outline: 0 !important;
            box-shadow: none !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
        }
        .uw-text {
            color: var(--dtu-ad-accent) !important;
        }
    `;

    // Styles for d2l-w2d-list (Work to Do list widget)
    const w2dListStyles = `
        :host {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        * {
            color: ${DARK_TEXT} !important;
        }

        /* Ensure all text elements are white/light */
        p, span, div, h1, h2, h3, h4, h5, h6,
        strong, em, b, i, ul, ol, li,
        .d2l-body-compact, .d2l-body-standard, .d2l-label-text {
            color: ${DARK_TEXT} !important;
        }

        /* Links should be visible blue */
        a {
            color: #66b3ff !important;
        }

        /* List items and containers */
        .d2l-list-item,
        .d2l-list-item-content,
        d2l-list-item,
        d2l-list-item-content {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        /* W2D count badge */
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            background-image: none !important;
            color: #ffffff !important;
            border-radius: 999px !important;
            padding: 0 7px !important;
            min-width: 18px !important;
            text-align: center !important;
            border: 0 !important;
            outline: 0 !important;
            box-shadow: none !important;
        }

        /* Count badge used in the top navigation */
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            color: #ffffff !important;
            border-color: #ffffff !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
        }
    `;

    // Light-mode accent badge styles -- injected into shadow roots even when dark mode is OFF
    // so that the user's chosen accent color replaces the default Brightspace red.
    const lightAccentBadgeStyles = `
        .d2l-w2d-count,
        .d2l-w2d-heading-3-count {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            color: #ffffff !important;
        }
        .d2l-count-badge-number {
            background-color: var(--dtu-ad-accent-deep) !important;
            background: var(--dtu-ad-accent-deep) !important;
            color: #ffffff !important;
        }
        .d2l-count-badge-number > div {
            background: transparent !important;
            background-color: transparent !important;
            color: #ffffff !important;
        }
    `;

    // Styles for HTML block content (module descriptions, lecturer info, etc.)
    const htmlBlockStyles = `
        /* Light text for readability on dark backgrounds */
        :host {
            color: #e0e0e0 !important;
        }

        /* Force grey text on elements WITHOUT custom inline color (except links) */
        *:not(a):not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        *::before, *::after {
            color: #e0e0e0 !important;
        }

        /* Override specifically black/near-black text back to grey */
        [style*="color: #000"], [style*="color:#000"],
        [style*="color: black"], [style*="color:black"],
        [style*="color: rgb(0, 0, 0"], [style*="color:rgb(0,0,0"],
        [style*="color: rgb(0,0,0"],
        [style*="color: #202122"], [style*="color:#202122"],
        [style*="color: rgb(32, 33, 34"] {
            color: #e0e0e0 !important;
        }

        div.d2l-html-block-rendered,
        div.d2l-html-block-rendered *:not(a):not([style^="color"]):not([style*="; color"]):not([style*=";color"]),
        .d2l-html-block-rendered,
        .d2l-html-block-rendered *:not(a):not([style^="color"]):not([style*="; color"]):not([style*=";color"]) {
            color: #e0e0e0 !important;
        }

        /* Clear white backgrounds from pasted/rich-text content */
        span, p, div, strong, em, b, i {
            background-color: transparent !important;
            background: transparent !important;
        }

        /* Keep links visible with blue color */
        a {
            color: #66b3ff !important;
        }

        a:hover, a:hover * {
            color: #99ccff !important;
        }

        /* Accent: announcements / headings inside rich blocks */
        .uw-text {
            color: var(--dtu-ad-accent-soft) !important;
        }
    `;

    // Elements that should NOT have dark mode injected (keep original styling)
    const EXCLUDED_ELEMENTS = [
        'd2l-image-banner-overlay',      // Course banner
        'd2l-image-banner',               // Course banner components
        'team-widget',                    // Teams widget
        'd2l-organization-image',         // Course images
        'd2l-course-image',               // Course images
        'd2l-pdf-viewer',                 // PDF viewer
        'd2l-pdf-viewer-toolbar',         // PDF viewer toolbar
        'd2l-pdf-viewer-progress-bar',    // PDF viewer progress bar
        'd2l-labs-media-player',          // Media player
        'd2l-labs-slider-bar'             // Media player slider
    ];

    // Function to check if element should be excluded from dark mode
    function shouldExcludeElement(element) {
        if (!element || !element.tagName) return false;

        const tagName = element.tagName.toLowerCase();

        // Check if element tag is in exclusion list
        if (EXCLUDED_ELEMENTS.includes(tagName)) {
            return true;
        }

        // Check if element has excluded classes
        if (element.classList) {
            if (element.classList.contains('team-widget-container') ||
                element.classList.contains('d2l-image-banner-overlay') ||
                element.classList.contains('bg-white')) {
                return true;
            }

            // PDF Viewer exclusions
            if (element.classList.contains('pdfViewer') ||
                element.classList.contains('page') ||
                element.classList.contains('canvasWrapper') ||
                element.classList.contains('textLayer') ||
                element.classList.contains('annotationLayer') ||
                element.classList.contains('annotationEditorLayer')) {
                return true;
            }
        }

        // Check if element ID suggests it should be excluded
        if (element.id) {
            if (element.id.includes('banner') ||
                element.id.includes('team') ||
                element.id.includes('overlayContent')) {
                return true;
            }

            // PDF Viewer exclusion
            if (element.id === 'viewer' || element.id.includes('pdfViewer')) {
                return true;
            }

            // Media Player exclusion
            if (element.id === 'player' || element.id.includes('d2l-labs-media-player')) {
                return true;
            }
        }

        // Check for PDF page data attribute
        if (element.hasAttribute && element.hasAttribute('data-page-number')) {
            return true;
        }

        return false;
    }

    // Function to inject styles into a shadow root
    function injectStylesIntoShadowRoot(shadowRoot, element) {
        if (!shadowRoot) return;

        // Skip if element should be excluded
        if (shouldExcludeElement(element)) {
            return;
        }

        let styleId = 'dark-mode-shadow-styles';
        let styleText = shadowDOMStyles;

        if (element && element.tagName) {
            const tagName = element.tagName.toLowerCase();

            if (tagName === 'd2l-icon') {
                styleId = 'dark-mode-shadow-styles-icon';
                styleText = iconShadowStyles;
            } else if (tagName === 'd2l-enrollment-card') {
                styleId = 'dark-mode-shadow-styles-enrollment-card';
                styleText = enrollmentCardShadowStyles;
            } else if (tagName === 'd2l-card') {
                styleId = 'dark-mode-shadow-styles-card';
                styleText = cardShadowStyles;
            } else if (tagName === 'd2l-expand-collapse-content' || tagName === 'd2l-lti-launch') {
                styleId = 'dark-mode-shadow-styles-expand-collapse';
                styleText = expandCollapseStyles;
            } else if (tagName === 'd2l-menu' || tagName === 'd2l-menu-item' || tagName === 'd2l-menu-item-link') {
                styleId = 'dark-mode-shadow-styles-menu';
                styleText = menuStyles;
            } else if (tagName === 'd2l-html-block') {
                styleId = 'dark-mode-shadow-styles-html-block';
                styleText = htmlBlockStyles;
            } else if (tagName === 'd2l-w2d-list' || tagName.startsWith('d2l-w2d-')) {
                styleId = 'dark-mode-shadow-styles-w2d-list';
                styleText = w2dListStyles;
            } else if (tagName === 'd2l-list-item-nav' || tagName === 'd2l-list-item-content' ||
                tagName === 'd2l-list' || tagName === 'd2l-list-item' ||
                tagName.startsWith('d2l-lessons-') || tagName.startsWith('d2l-toc-')) {
                styleId = 'dark-mode-shadow-styles-list-item-nav';
                styleText = listItemNavStyles;
            } else if (tagName === 'd2l-input-search') {
                // Minimal styling for search - just text color, no background overrides
                styleId = 'dark-mode-shadow-styles-input-search';
                styleText = `
                    :host {
                        color: ${DARK_TEXT} !important;
                    }
                    input {
                        color: ${DARK_TEXT} !important;
                        background-color: transparent !important;
                    }
                `;
            }
        }

        let style = shadowRoot.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            style.textContent = styleText;
            shadowRoot.appendChild(style);
        } else if (style.textContent !== styleText) {
            style.textContent = styleText;
        }

        // Some Brightspace widgets (counts, badges, titles) live deep inside shadow DOM.
        // CSS injection alone is sometimes insufficient due to component-specific inline styles.
        // Force key accent elements inline within this shadow root.
        try { forceDTULearnAccentInRoot(shadowRoot); } catch (eAcc0) { }

        observeInjectedShadowRoot(shadowRoot);
        processNestedShadowRoots(shadowRoot);
        // Also scan for room mentions inside Brightspace shadow DOM (announcements, dialogs, etc.).
        try { seedSmartRoomLinkerShadowRoot(shadowRoot); } catch (eSeed) { }
    }

    // Function to process shadow roots nested inside a shadow root
    const _pendingShadowHostRetry = new WeakMap();
    const _shadowHostRetryCount = new WeakMap();
    const _observedShadowRoots = new WeakSet();
    const SHADOW_HOST_RETRY_DELAY_MS = 350;
    const SHADOW_HOST_MAX_RETRIES = 20;

    function isShadowHostCandidate(element) {
        if (!element || !element.tagName) return false;
        var tagName = element.tagName.toLowerCase();
        return tagName.startsWith('d2l-');
    }

    function scheduleShadowHostRetry(element) {
        if (!isShadowHostCandidate(element)) return;

        if (element.shadowRoot) {
            var existingTimer = _pendingShadowHostRetry.get(element);
            if (existingTimer) {
                clearTimeout(existingTimer);
                _pendingShadowHostRetry.delete(element);
            }
            injectStylesIntoShadowRoot(element.shadowRoot, element);
            return;
        }

        if (_pendingShadowHostRetry.has(element)) return;

        var retryCount = _shadowHostRetryCount.get(element) || 0;
        if (retryCount >= SHADOW_HOST_MAX_RETRIES) return;
        _shadowHostRetryCount.set(element, retryCount + 1);

        var retryTimer = setTimeout(function () {
            _pendingShadowHostRetry.delete(element);
            if (!element.isConnected) return;
            scheduleShadowHostRetry(element);
        }, SHADOW_HOST_RETRY_DELAY_MS);
        _pendingShadowHostRetry.set(element, retryTimer);
    }

    function processShadowMutationNode(node) {
        if (!node || node.nodeType !== 1) return;
        if (shouldExcludeElement(node) || isInsideExcludedContainer(node)) return;

        if (node.shadowRoot) {
            injectStylesIntoShadowRoot(node.shadowRoot, node);
        } else {
            scheduleShadowHostRetry(node);
        }

        const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, null);
        let child = walker.nextNode();
        while (child) {
            if (!shouldExcludeElement(child) && !isInsideExcludedContainer(child)) {
                if (child.shadowRoot) {
                    injectStylesIntoShadowRoot(child.shadowRoot, child);
                } else {
                    scheduleShadowHostRetry(child);
                }
            }
            child = walker.nextNode();
        }

        processHtmlBlocks(node);
        insertContentButtons(node);
        // Brightspace content often lives in Shadow DOM (announcements, dialogs).
        // When new nodes are added inside shadow roots, scan them for room mentions.
        try {
            // Scan rendered announcement HTML containers first.
            if (node.matches && node.matches('.d2l-html-block-rendered')) {
                scheduleSmartRoomLinkerScan(node, 120);
                return;
            }
            if (node.querySelectorAll) {
                var rendered = node.querySelectorAll('.d2l-html-block-rendered');
                if (rendered && rendered.length) {
                    for (var i = 0; i < rendered.length && i < 12; i++) {
                        scheduleSmartRoomLinkerScan(rendered[i], 120);
                    }
                    return;
                }
            }
            scheduleSmartRoomLinkerScan(node, 140);
        } catch (eLink) { }
    }

    function observeInjectedShadowRoot(shadowRoot) {
        if (!shadowRoot || _observedShadowRoots.has(shadowRoot)) return;

        const observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.type !== 'childList') continue;
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    var added = mutation.addedNodes[j];
                    if (added.nodeType === 1) {
                        processShadowMutationNode(added);
                    }
                }
            }
            // Re-apply accent inside this shadow root after mutations, since Brightspace can
            // re-render badges with new nodes and inline styles.
            try { forceDTULearnAccentInRoot(shadowRoot); } catch (eAcc1) { }
        });

        observer.observe(shadowRoot, {
            childList: true,
            subtree: true
        });

        _observedShadowRoots.add(shadowRoot);
    }

    function processNestedShadowRoots(shadowRoot) {
        if (!shadowRoot) return;

        const walker = document.createTreeWalker(shadowRoot, NodeFilter.SHOW_ELEMENT, null);
        let element = walker.nextNode();
        while (element) {
            if (element.shadowRoot) {
                injectStylesIntoShadowRoot(element.shadowRoot, element);
            } else {
                scheduleShadowHostRetry(element);
            }
            element = walker.nextNode();
        }
    }

    const _styledHtmlBlocks = new WeakSet();
    const _pendingHtmlBlockRetry = new WeakMap();
    const _htmlBlockRetryCount = new WeakMap();
    const HTML_BLOCK_MAX_RETRIES = 8;

    function ensureHtmlBlockStyled(block) {
        if (!block || _styledHtmlBlocks.has(block)) return;

        if (block.shadowRoot) {
            var pendingTimer = _pendingHtmlBlockRetry.get(block);
            if (pendingTimer) {
                clearTimeout(pendingTimer);
                _pendingHtmlBlockRetry.delete(block);
            }
            injectStylesIntoShadowRoot(block.shadowRoot, block);
            _styledHtmlBlocks.add(block);
            return;
        }

        if (_pendingHtmlBlockRetry.has(block)) return;

        var retryCount = _htmlBlockRetryCount.get(block) || 0;
        if (retryCount >= HTML_BLOCK_MAX_RETRIES) return;
        _htmlBlockRetryCount.set(block, retryCount + 1);

        // Keep one short retry timer per block to avoid timer fan-out.
        const retryTimer = setTimeout(function () {
            _pendingHtmlBlockRetry.delete(block);
            ensureHtmlBlockStyled(block);
        }, 400);
        _pendingHtmlBlockRetry.set(block, retryTimer);
    }

    // Function to specifically process d2l-html-block elements
    function processHtmlBlocks(root) {
        if (!root || !root.querySelectorAll) return;
        if (root.matches && root.matches('d2l-html-block')) {
            ensureHtmlBlockStyled(root);
        }
        const htmlBlocks = root.querySelectorAll('d2l-html-block');
        htmlBlocks.forEach(block => {
            ensureHtmlBlockStyled(block);
        });
    }

    // Light scan for d2l-html-block elements to catch late DOM inserts.
    function pollForHtmlBlocks() {
        const htmlBlocks = document.querySelectorAll('d2l-html-block');
        htmlBlocks.forEach(block => {
            ensureHtmlBlockStyled(block);
        });
    }

    // Function to directly style multiselect elements (for iframes where CSS doesn't apply)
    function styleMultiselectElements(root) {
        // Style multiselect containers
        const multiselects = root.querySelectorAll('.d2l-multiselect, ul.d2l-multiselect');
        multiselects.forEach(el => {
            el.style.setProperty('background-color', '#3d3d3d', 'important');
            el.style.setProperty('border-color', '#505050', 'important');
        });

        // Style multiselect choice items
        const choices = root.querySelectorAll('.d2l-multiselect-choice');
        choices.forEach(el => {
            el.style.setProperty('background-color', '#4a4a4a', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            el.style.setProperty('border-color', '#606060', 'important');
        });

        // Style spans inside choices
        const choiceSpans = root.querySelectorAll('.d2l-multiselect-choice span');
        choiceSpans.forEach(el => {
            el.style.setProperty('color', '#e0e0e0', 'important');
        });

        // Style clear icons
        const clearIcons = root.querySelectorAll('.d2l-multiselect-clearicon, .d2l-multiselect-choice a');
        clearIcons.forEach(el => {
            el.style.setProperty('color', '#e0e0e0', 'important');
        });

        // Style input fields
        const inputs = root.querySelectorAll('.d2l-multiselect input, input.d2l-edit, .d2l-multiselect-input input');
        inputs.forEach(el => {
            el.style.setProperty('background-color', '#3d3d3d', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            el.style.setProperty('border-color', '#505050', 'important');
        });

        // Style popup titles
        const popupTitles = root.querySelectorAll('.d2l-popup-title, .d2l-popup-title h1');
        popupTitles.forEach(el => {
            el.style.setProperty('background-color', '#2d2d2d', 'important');
            el.style.setProperty('color', '#ffffff', 'important');
        });
    }

    // Poll for multiselect elements in main document and iframes
    function pollForMultiselects() {
        styleMultiselectElements(document);

        // Also check iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                const doc = iframe.contentDocument;
                if (doc && doc.body) {
                    styleMultiselectElements(doc);
                }
            } catch (e) {
                // Cross-origin iframe, skip
            }
        });
    }

    // Selectors for elements that should be #1a1a1a (darkest)
    const DARK_SELECTORS = `
        .grid_3.minHeight,
        .grid_3.minHeight *,
        .linkset8,
        .empty-state-container,
        .d2l-page-collapsepane-content,
        .d2l-page-collapsepane-content-inner,
        .d2l-page-collapsepane-content-padding,
        .d2l-user-profile-card,
        .d2l-user-profile-card *,
        .d2l-empty-state-description,
        .panel-section.side-panel,
        .panel-section.side-panel *,
        .content-div,
        .topic-display,
        .activity-viewer,
        .content-container,
        .content-loaded-wrapper,
        .vui-fileviewer,
        .vui-fileviewer-generic,
        .vui-fileviewer-generic-container,
        .vui-fileviewer-generic-main,
        .generic-header-icon-container,
        .generic-headers,
        .vui-fileviewer-generic-header,
        .vui-fileviewer-generic-subheader,
        .vui-fileviewer-icon,
        .generic-download-area,
        .vui-fileviewer-generic-size,
        .vui-fileviewer-generic-download,
        .tsMasterContent header.header,
        div.main.row,
        form[action*="/Answer/Exclude/"],
        form[action*="/Answer/SaveAnswers/"],
        .tsMasterContent .header__title,
        .tsMasterContent .header__actions,
        nav.navigation,
        .navigation__items,
        .navigation__item,
        main.main__content,
        .tsMasterContent,
        .page__title,
        .AnswerSurvey,
        .question__list,
        .question,
        .question__header,
        .question__title,
        .question__content,
        .question__item,
        .item__list,
        .item__scale,
        .scale__radios,
        .scale__label,
        .scale__options,
        .matrix,
        .matrix__header,
        .matrix__item,
        .matrix__option,
        .dropdown,
        .dropdown__list,
        .dropdown__list-item,
        .modal,
        .modal__dialog,
        .modal__content,
        .modal__header,
        .modal__footer,
        .confirm__dialog,
        .confirm__content,
        .confirm__body,
        .confirm__footer,
        footer.footer,
        .excludeForm,
        #AnswerZone,
        #QuestionZone,
        .arc-confirm,
        .d2l-course-banner-container,
        #CourseImageBannerPlaceholderId,
        .d2l-column-flip-side,
        .d2l-column-side-padding,
        .page-articlehtml,
        .container_12,
        .leftcolumn,
        .rightcolumn,
        .contentModulesContainer,
        .contentFooter,
        .contentFooter-print,
        #outercontent,
        #outercontent_0_LeftColumn,
        #outercontent_0_RightColumn,
        #outercontent_0_ContentColumn,
        #karsumForm,
        .subservicemenuHeader,
        .subservicemenu,
        .subservicemenuFooter,
        .servicemenu,
        .servicemenu *,
        .servicemenuitems,
        .servicemenuitems *,
        .grid_6.minHeight,
        .grid_6.minHeight *,
        .item.itemmenu,
        .item.separator,
        .servicemenu nav,
        .servicemenu nav *,
        .servicemenu__link-text,
        .breadcrumb.linkset6,
        .breadcrumb.linkset6 *,
        #d_content_r_c1,
        #d_content_r_c2,
        #d_content_r,
        #d_content_r_p,
        form#d2l_form,
        d2l-dropdown-context-menu,
        d2l-dropdown-menu,
        d2l-dropdown-menu-contextmenu,
        d2l-menu,
        d2l-menu-item,
        button[aria-haspopup="true"][aria-label^="Actions for"],
        d2l-dropdown-context-menu button[aria-label^="Actions for"],
        d2l-floating-buttons,
        .d2l-floating-buttons-container,
        .d2l-floating-buttons,
        .d2l-floating-buttons-inner-container,
        div[role="list"]:not(.d2l-navigation-s-main-wrapper),
        d2l-breadcrumb,
        d2l-breadcrumbs,
        d2l-breadcrumb-current-page,
        d2l-breadcrumbs a,
        d2l-breadcrumbs span,
        d2l-breadcrumbs d2l-icon,
        table.d_FG,
        table.d_FG *,
        .d_fgh,
        .fct_w,
        .fl_n,
        .fl_top
    `;

    // Selectors for elements that should be #2d2d2d (lighter dark)
    const LIGHTER_DARK_SELECTORS = `
        .d2l-navigation-s-main-wrapper,
        .d2l-navigation-s-main-wrapper *,
        .d2l-navigation-s-item,
        .d2l-navigation-s-group,
        .d2l-navigation-s-link,
        .dco,
        .dco_c,
        .dco a.d2l-link,
        .dco_c a.d2l-link,
        td.d_gn a.d2l-link,
        td.d_gc a.d2l-link,
        .d2l-inline,
        .d2l-inline a,
        .d2l-inline a.d2l-link,
        td.d2l-table-cell-first,
        td.d2l-table-cell-first *,
        .d2l-datalist,
        .vui-list,
        .vui-no-separator,
        ul.d2l-datalist,
        .d2l-widget-header,
        .d2l-widget-header a,
        .d2l-widget-header a.d2l-link,
        .d2l-widget-content-padding .d2l-placeholder,
        .d2l-widget .d2l-placeholder,
        .d2l-datalist-container,
        .d2l-personal-tools-list,
        .d2l-personal-tools-list li,
        .d2l-personal-tools-category-item,
        .d2l-personal-tools-separated-item,
        .d2l-personal-tools-list a.d2l-link,
        li.d2l-datalist-item,
        .d2l-datalist-item-actionable,
        .d2l-navigation-area-activity-message-content,
        .d2l-navigation-area-activity-message-wrapper,
        .d2l-navigation-area-activity-message-details,
        li.d2l-datalist-item.d2l-datalist-item-actionable,
        .d2l-datalist-item-actioncontrol,
        a.d2l-datalist-item-actioncontrol,
        .d2l-messagebucket-button-container,
        .d2l-messagebucket-button-container *,
        .d2l-messagebucket-button-container-left,
        .d2l-messagebucket-button-container-right,
        d2l-icon,
        .d2l-iterator-button,
        a.d2l-iterator-button,
        #TitlePlaceholderId,
        .d2l-link-main,
        a.d2l-link-main,
        .vui-button,
        a.vui-button,
        #ListPageViewSelector,
        .breadcrumb,
        .linkset6,
        .table-slide-container,
        .content.grid_6,
        .pageheader,
        .grid_10,
        .search,
        .search .inputtext,
        .inside-search-btn,
        .inside-search-btn .inputsubmit,
        .pagefooterlogo,
        .pagefootercolumn,
        #footerLogo,
        #footerAbout,
        #footerJob,
        #footerFollowus,
        .footeraddresstitle,
        .footeraddress,
        .footerintro,
        .contactWrapper,
        .socialMediaIcons,
        .subsitesearch,
        .top-search-wrapper,
        .pageheaderoverlay,
        .pageheader *,
        .pageheaderoverlay *,
        .sitelogo,
        .sitetextlogo,
        .websiteLogoLink,
        .websitelogoright__link,
        .mainmenu,
        .breadcrumb-print,
        .grid_6.pageheadertop,
        .grid_6.pageheadertop *,
        .mobileTopMenuButton,
        .mobileTopMenuButton *,
        .linkset4,
        .topmenuitems,
        .linkset1,
        .mobilemenuNavigation,
        .grid_5,
        .grid_1.minHeight,
        .pagefooter,
        .pagefooter .container_12,
        .pagefooter .container_12 *,
        .lineheight13_18,
        ul.d2l-action-buttons-list,
        .d2l-action-buttons-list,
        .d2l-action-buttons-item,
        button[aria-haspopup="true"][aria-label="Actions for Work To Do"],
        button[aria-label^="Actions for Work To Do"],
        button[aria-haspopup="true"][aria-label="Actions for Study Announcements"],
        button[aria-label^="Actions for Study Announcements"],
        button[aria-haspopup="true"][aria-label="Actions for Calendar"],
        button[aria-label^="Actions for Calendar"],
        button[aria-haspopup="true"][aria-label="Actions for Lecture 01, Quiz 1"],
        button[aria-label^="Actions for Lecture 01, Quiz 1"],
        .d2l-tool-areas-item,
        li.d2l-tool-areas-item,
        h2.d2l-heading-none,
        .d2l-box-layout,
        .d2l-box.d2l-box-v,
        .d2l-accordion-content,
        .d2l-accordion-content-expanded,
        .d2l-hpg-opener,
        button.d2l-hpg-opener,
        a.ddl_li_c,
        a.ddl_li_c *,
        #z_g,
        #z_g .dco_c
    `;

    const LESSONS_TOC_DARK1_SELECTORS = `
        .navigation-container .navigation-tree .co-content,
        .navigation-container .navigation-tree .title-container,
        .navigation-container .navigation-tree .title,
        .navigation-container .navigation-tree .title > div,
        .navigation-container .navigation-tree .title-text,
        .navigation-container .navigation-tree .title-text span,
        .navigation-container .navigation-tree .overflow-detector,
        .navigation-container .navigation-tree .overflow-detector span,
        .navigation-container .navigation-tree .text-wrapper,
        .navigation-container .navigation-tree .date-container,
        .navigation-container .navigation-tree .due-date-container
    `;

    function normalizeInlineStyleValue(value) {
        return String(value || '').replace(/\s+/g, '').toLowerCase();
    }

    function inlineStyleHasDarkFill(el, hexValue, rgbValue) {
        if (!el || !el.style) return false;
        var bgColor = normalizeInlineStyleValue(el.style.getPropertyValue('background-color'));
        var bg = normalizeInlineStyleValue(el.style.getPropertyValue('background'));
        var bgImage = normalizeInlineStyleValue(el.style.getPropertyValue('background-image'));
        var hasPriority = el.style.getPropertyPriority('background-color') === 'important'
            || el.style.getPropertyPriority('background') === 'important';
        var hasFill = bgColor === hexValue || bgColor === rgbValue || bg === hexValue || bg === rgbValue;
        var hasNoImage = (bgImage === '' || bgImage === 'none');
        return hasFill && hasNoImage && hasPriority;
    }

    function inlineStyleHasTextColor(el, hexValue, rgbValue) {
        if (!el || !el.style) return false;
        var color = normalizeInlineStyleValue(el.style.getPropertyValue('color'));
        var hasPriority = el.style.getPropertyPriority('color') === 'important';
        return hasPriority && (color === hexValue || color === rgbValue);
    }

    function forceLessonsTocDark1Element(el) {
        if (!el || !el.style) return;
        el.style.setProperty('background', '#1a1a1a', 'important');
        el.style.setProperty('background-color', '#1a1a1a', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        if (el.tagName !== 'A') {
            el.style.setProperty('color', '#e0e0e0', 'important');
        }
    }

    function forceLessonsTocDark1(root) {
        if (!darkModeEnabled) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!root) return;

        var scope = root;
        if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) {
            return;
        }

        try {
            if (scope.matches && scope.matches(LESSONS_TOC_DARK1_SELECTORS)) {
                forceLessonsTocDark1Element(scope);
            }
        } catch (e0) { }

        if (!scope.querySelectorAll) return;
        try {
            var targets = scope.querySelectorAll(LESSONS_TOC_DARK1_SELECTORS);
            targets.forEach(forceLessonsTocDark1Element);
        } catch (e1) { }
    }

    function forceD2LActionButtonsDark1(root) {
        if (!darkModeEnabled) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!root) return;

        var scope = root;
        if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) return;

        try {
            if (scope.matches && scope.matches('.d2l-action-buttons, .d2l-action-buttons-list, ul.d2l-action-buttons-list, .d2l-action-buttons-item')) {
                forceLessonsTocDark1Element(scope);
            }
        } catch (e0) { }

        if (!scope.querySelectorAll) return;
        try {
            scope.querySelectorAll('.d2l-action-buttons, .d2l-action-buttons-list, ul.d2l-action-buttons-list, .d2l-action-buttons-item').forEach(forceLessonsTocDark1Element);
            scope.querySelectorAll('.d2l-action-buttons .d2l-button, .d2l-action-buttons-item .d2l-button').forEach(function (btn) {
                if (!btn || !btn.style) return;
                btn.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                btn.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                btn.style.setProperty('background-image', 'none', 'important');
                btn.style.setProperty('color', '#ffffff', 'important');
                btn.style.setProperty('border-color', 'var(--dtu-ad-accent-border)', 'important');
            });
        } catch (e1) { }
    }

    // Function to apply darkest style to an element (#1a1a1a)
    function applyDarkStyle(el) {
        if (!el || !el.style) return;
        // CampusNet top-right nav icon stacks (heart/user): keep layers transparent.
        // Global darkening can otherwise paint dark bands across the accent circle.
        if (window.location.hostname === 'campusnet.dtu.dk' && el.matches) {
            var isNavIconLayer = false;
            try {
                isNavIconLayer = el.matches('.nav__icon, .nav__icon *') || (el.closest && !!el.closest('.nav__icon'));
            } catch (eNav0) { isNavIconLayer = false; }
            if (isNavIconLayer) {
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                if (el.classList && el.classList.contains('fa-circle')) {
                    el.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
                } else if (
                    (el.classList && el.classList.contains('fa-stack-1x'))
                    || (el.classList && el.classList.contains('fa-heart'))
                    || (el.classList && el.classList.contains('fa-user'))
                ) {
                    el.style.setProperty('color', '#ffffff', 'important');
                }
                return;
            }
        }
        // Skip extension-created elements (ECTS bar, GPA rows, sim rows, etc.)
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return;
        // Skip descendants inside extension-created UI as well (global rules should not repaint our widgets).
        if (el.closest && el.closest('[data-dtu-ext]')) return;
        // Evaluering charts use canvas wrappers inside .question__content;
        // keep them transparent so graph rendering is not blocked by forced dark fills.
        if (window.location.hostname === 'evaluering.dtu.dk' && el.matches) {
            if (el.matches('.question__content, .question__content > div[style*="font-size:0"]')) return;
        }
        // Preserve quiz histogram visuals (bars + axis image overlays)
        if (isDTULearnQuizSubmissionsPage() && el.matches) {
            if (el.matches('img.d2l-histogram-barblue, td.d2l-histogram-disback1, td.d2l-histogram-disyimg2, td.d2l-histogram-xside2')) {
                return;
            }
        }
        // Skip navigation wrapper elements
        if (el.closest && el.closest('.d2l-navigation-s-main-wrapper')) return;
        // Skip elements inside pagefooter (those should be dark 2)
        if (el.closest && el.closest('.pagefooter')) return;
        // Skip topmenuitems (should be dark 2)
        if (el.closest && el.closest('.topmenuitems')) return;
        // Skip pageheader descendants (should be dark 2), except breadcrumb.linkset6 (dark 1)
        if (el.closest && el.closest('.pageheader') && !el.closest('.breadcrumb.linkset6')) return;
        if (el.tagName === 'A') {
            if (inlineStyleHasDarkFill(el, '#1a1a1a', 'rgb(26,26,26)')) return;
        } else if (inlineStyleHasDarkFill(el, '#1a1a1a', 'rgb(26,26,26)')
            && inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)')) {
            return;
        }
        el.style.setProperty('background', '#1a1a1a', 'important');
        el.style.setProperty('background-color', '#1a1a1a', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        // Skip color on links â€” let CSS handle it (nav links grey, content links blue)
        if (el.tagName !== 'A') {
            el.style.setProperty('color', '#e0e0e0', 'important');
        }
    }

    // Function to apply lighter dark style to an element (#2d2d2d)
    function applyLighterDarkStyle(el) {
        if (!el || !el.style) return;
        // CampusNet top-right nav icon stacks (heart/user): keep layers transparent.
        // Global darkening can otherwise paint dark bands across the accent circle.
        if (window.location.hostname === 'campusnet.dtu.dk' && el.matches) {
            var isNavIconLayer = false;
            try {
                isNavIconLayer = el.matches('.nav__icon, .nav__icon *') || (el.closest && !!el.closest('.nav__icon'));
            } catch (eNav1) { isNavIconLayer = false; }
            if (isNavIconLayer) {
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                if (el.classList && el.classList.contains('fa-circle')) {
                    el.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
                } else if (
                    (el.classList && el.classList.contains('fa-stack-1x'))
                    || (el.classList && el.classList.contains('fa-heart'))
                    || (el.classList && el.classList.contains('fa-user'))
                ) {
                    el.style.setProperty('color', '#ffffff', 'important');
                }
                return;
            }
        }
        // Skip extension-created elements (ECTS bar, GPA rows, sim rows, etc.)
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return;
        // Skip descendants inside extension-created UI as well.
        if (el.closest && el.closest('[data-dtu-ext]')) return;
        // Skip bus departure container â€” it manages its own colors
        if (el.closest && el.closest('.dtu-bus-departures')) return;
        if (el.matches && el.matches('.dtu-bus-departures')) return;
        if (isDTULearnQuizSubmissionsPage() && el.matches) {
            if (el.matches('img.d2l-histogram-barblue, td.d2l-histogram-disback1, td.d2l-histogram-disyimg2, td.d2l-histogram-xside2')) {
                return;
            }
        }
        if (isDTULearnQuizSubmissionsPage()) {
            var graphRow = el.closest && el.closest('tr');
            if (graphRow && graphRow.querySelector && graphRow.querySelector('img[src*="Framework.GraphBar"]')) return;
        }
        // Keep quiz details tables dark 1
        if (el.closest && el.closest('table.d_FG')) return;
        // Skip breadcrumb.linkset6 (should be dark 1)
        if (el.matches && el.matches('.breadcrumb.linkset6')) return;
        if (el.closest && el.closest('.breadcrumb.linkset6')) return;
        // DTU Learn lessons TOC text/title surfaces should stay dark 1.
        if (
            window.location.hostname === 'learn.inside.dtu.dk'
            && el.closest
            && el.closest('.navigation-container .navigation-tree')
            && el.matches
            && el.matches('.co-content, .title-container, .title, .title > div, .title-text, .title-text span, .overflow-detector, .overflow-detector span, .text-wrapper, .date-container, .due-date-container')
        ) {
            forceLessonsTocDark1Element(el);
            return;
        }
        // DTU Learn assignment action containers should stay dark 1.
        if (
            window.location.hostname === 'learn.inside.dtu.dk'
            && el.matches
            && el.matches('.d2l-action-buttons, .d2l-action-buttons-list, ul.d2l-action-buttons-list, .d2l-action-buttons-item')
        ) {
            forceLessonsTocDark1Element(el);
            return;
        }
        // DTU Learn lessons TOC: keep triangle/utility icons on the dark 1 rail.
        var tagName = ((el.tagName || '') + '').toLowerCase();
        var iconName = (el.getAttribute && el.getAttribute('icon')) || '';
        if (
            el.matches && (
                el.matches('d2l-icon.module-triangle')
                || el.matches('.module-triangle')
                || el.matches('.navigation-container .drag-handle d2l-icon')
                || el.matches('.navigation-container .upload-icon-container d2l-icon')
                || (tagName === 'd2l-icon' && (
                    iconName === 'tier1:arrow-collapse-small'
                    || iconName === 'tier1:arrow-expand-small'
                    || iconName === 'tier1:dragger'
                    || iconName === 'tier2:upload'
                    || iconName === 'tier2:file-document'
                ))
                || (tagName === 'd2l-icon' && el.closest && el.closest('.navigation-container .navigation-tree .title-container'))
            )
        ) {
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            return;
        }
        if (el.tagName === 'A') {
            if (inlineStyleHasDarkFill(el, '#2d2d2d', 'rgb(45,45,45)')) return;
        } else if (inlineStyleHasDarkFill(el, '#2d2d2d', 'rgb(45,45,45)')
            && inlineStyleHasTextColor(el, '#e0e0e0', 'rgb(224,224,224)')) {
            return;
        }
        el.style.setProperty('background', '#2d2d2d', 'important');
        el.style.setProperty('background-color', '#2d2d2d', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        // Skip color on links â€” let CSS handle it (nav links grey, content links blue)
        if (el.tagName !== 'A') {
            el.style.setProperty('color', '#e0e0e0', 'important');
        }
    }

    // Historically we forced DTU-red header bars to dark 2 in dark mode to avoid harsh red.
    // Now that the accent color is user-configurable, keep these bars tied to the accent.
    // Uses resolved hex color instead of var() reference because some browsers fail to
    // resolve CSS variables in inline styles on deeply nested elements.
    function getResolvedAccentDeep() {
        var theme = getAccentThemeById(_accentThemeId);
        return (theme && theme.accentDeep) || '#7d0000';
    }

    function forceDtuRedBackgroundDark2(el) {
        if (!el || !el.style) return;
        var color = getResolvedAccentDeep();
        var styleAttr = (el.getAttribute && el.getAttribute('style')) || '';
        var currentBg = (styleAttr.match(/background-color\s*:\s*([^;!]+)/i) || [])[1];
        if (currentBg && currentBg.trim() === color) return;

        el.style.setProperty('background', color, 'important');
        el.style.setProperty('background-color', color, 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('border-color', color, 'important');
        if (el.tagName === 'A') {
            el.style.setProperty('color', '#ffffff', 'important');
        }
    }

    function enforceDtuRedBackgroundZoneDark2() {
        var targets = document.querySelectorAll(
            '.dturedbackground, '
            + '.dturedbackground .container, '
            + '.dturedbackground .row, '
            + '.dturedbackground [class*="col-"], '
            + '.dturedbackground .pull-right, '
            + '.dturedbackground .pull-right span, '
            + '.dturedbackground .pull-right span a, '
            + '.dturedbackground .dropdown, '
            + '.dturedbackground .dropdown-toggle.red, '
            + '.dturedbackground .dropdown-menu.red, '
            + '.dturedbackground .dropdown-menu.red li, '
            + '.dturedbackground .dropdown-menu.red li a'
        );
        targets.forEach(forceDtuRedBackgroundDark2);
    }

    // Function to aggressively override dynamically applied styles
    function overrideDynamicStyles(root) {
        // Apply darkest color to dark selectors
        const darkElements = root.querySelectorAll(DARK_SELECTORS);
        darkElements.forEach(applyDarkStyle);

        // Apply lighter dark color to navigation wrapper
        const lighterElements = root.querySelectorAll(LIGHTER_DARK_SELECTORS);
        lighterElements.forEach(applyLighterDarkStyle);

        // DTU Learn lessons TOC: force dark 1 on text/title rail surfaces.
        try {
            forceLessonsTocDark1(document);
            if (root !== document) forceLessonsTocDark1(root);
        } catch (eToc) { }
        // DTU Learn assignment action bar: dark 1 container + accent button.
        try {
            forceD2LActionButtonsDark1(document);
            if (root !== document) forceD2LActionButtonsDark1(root);
        } catch (eAction) { }

        // Force white text on nav dropdown (Courses/Groups/Shortcuts menu)
        root.querySelectorAll('.nav__dropdown, article.nav__dropdown').forEach(dropdown => {
            dropdown.querySelectorAll('a, span, h2, li, div, header').forEach(el => {
                el.style.setProperty('color', '#ffffff', 'important');
            });
        });

        // Keep DTU red background bar tied to accent (studieplan.dtu.dk, campusnet.dtu.dk)
        root.querySelectorAll('.dturedbackground').forEach(forceDtuRedBackgroundDark2);

        // Accent badges/text that should not be "flattened" to dark backgrounds by global rules.
        // We set these inline with !important because applyDarkStyle() also writes inline !important.
        try {
            var badgeBg = darkModeEnabled ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
            root.querySelectorAll('.d2l-w2d-count, .d2l-w2d-heading-3-count, .d2l-count-badge-number').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', badgeBg, 'important');
                el.style.setProperty('background-color', badgeBg, 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
                el.style.setProperty('border', '0', 'important');
                el.style.setProperty('outline', '0', 'important');
                el.style.setProperty('box-shadow', 'none', 'important');
            });
            root.querySelectorAll('.d2l-count-badge-number > div').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
            });
            root.querySelectorAll('.uw-text').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
            });
        } catch (eAcc) { }
    }

    // MutationObserver to watch for style changes
    function setupStyleObserver(root) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const el = mutation.target;
                    try {
                        if (el && el.closest && el.closest('.navigation-container .navigation-tree')) {
                            forceLessonsTocDark1(el);
                        }
                    } catch (eTocAttr) { }
                    try {
                        forceD2LActionButtonsDark1(el);
                    } catch (eActionAttr) { }
                    // Check lighter dark selectors first (they take priority)
                    if (el.matches && el.matches(LIGHTER_DARK_SELECTORS)) {
                        applyLighterDarkStyle(el);
                    } else if (el.matches && el.matches(DARK_SELECTORS)) {
                        applyDarkStyle(el);
                    }
                }
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            try {
                                if (node.closest && node.closest('.navigation-container .navigation-tree')) {
                                    forceLessonsTocDark1(node);
                                }
                            } catch (eTocNode) { }
                            try {
                                forceD2LActionButtonsDark1(node);
                            } catch (eActionNode) { }
                            // Apply dark first, then lighter (lighter wins)
                            if (node.matches && node.matches(DARK_SELECTORS)) {
                                applyDarkStyle(node);
                            }
                            if (node.matches && node.matches(LIGHTER_DARK_SELECTORS)) {
                                applyLighterDarkStyle(node);
                            }
                            // Check descendants: dark first, then lighter (lighter wins)
                            if (node.querySelectorAll) {
                                const darkDescendants = node.querySelectorAll(DARK_SELECTORS);
                                darkDescendants.forEach(applyDarkStyle);
                                const lighterDescendants = node.querySelectorAll(LIGHTER_DARK_SELECTORS);
                                lighterDescendants.forEach(applyLighterDarkStyle);
                                forceLessonsTocDark1(node);
                                forceD2LActionButtonsDark1(node);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            childList: true,
            subtree: true
        });

        return observer;
    }

    // Poll to override dynamic styles
    function pollOverrideDynamicStyles() {
        overrideDynamicStyles(document);

        // Also check iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                const doc = iframe.contentDocument;
                if (doc && doc.body) {
                    // Skip iframes with content navigation (new lessons content browser)
                    // These are handled by iframeStyles and should not have dynamic overrides
                    if (doc.querySelector('.navigation-container') || doc.querySelector('d2l-lessons-toc')) {
                        return;
                    }
                    overrideDynamicStyles(doc);
                    // Setup observer on iframe if not already done
                    if (!iframe._darkModeObserver) {
                        iframe._darkModeObserver = setupStyleObserver(doc.documentElement);
                    }
                }
            } catch (e) {
                // Cross-origin iframe, skip
            }
        });
    }

    // Run immediately (dark mode only)
    if (darkModeEnabled) pollOverrideDynamicStyles();

    // Function to check if element is inside a PDF viewer or media player
    function isInsideExcludedContainer(element) {
        let parent = element;
        while (parent) {
            // PDF viewer check
            if (parent.id === 'viewer' ||
                (parent.classList && (
                    parent.classList.contains('pdfViewer') ||
                    parent.classList.contains('pdf-viewer')
                ))) {
                return true;
            }
            // Media player check
            if (parent.tagName && parent.tagName.toLowerCase() === 'd2l-labs-media-player') {
                return true;
            }
            if (parent.id === 'player' || (parent.id && parent.id.includes('d2l-labs-media-player'))) {
                return true;
            }
            parent = parent.parentElement;
        }
        return false;
    }

    // Function to find and inject into all shadow roots
    function processElement(element) {
        if (!element || element.nodeType !== 1) return;

        // Skip if inside PDF viewer
        if (isInsideExcludedContainer(element)) {
            return;
        }

        function processNode(node) {
            if (!node || node.nodeType !== 1) return;
            if (shouldExcludeElement(node) || isInsideExcludedContainer(node)) return;
            if (node.shadowRoot) {
                injectStylesIntoShadowRoot(node.shadowRoot, node);
            } else {
                scheduleShadowHostRetry(node);
            }
        }

        processNode(element);

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null);
        let child = walker.nextNode();
        while (child) {
            processNode(child);
            child = walker.nextNode();
        }

        // Specifically process d2l-html-block elements
        processHtmlBlocks(element);

        processIframes(element);
    }

    function sweepForLateShadowRoots(root) {
        if (!darkModeEnabled) return;
        var baseRoot = root && root.nodeType === 1 ? root : (document.body || document.documentElement);
        if (!baseRoot) return;

        function processCandidate(node) {
            if (!node || node.nodeType !== 1 || !node.tagName) return;
            if (!node.tagName.toLowerCase().startsWith('d2l-')) return;
            if (shouldExcludeElement(node) || isInsideExcludedContainer(node)) return;
            if (node.shadowRoot) {
                injectStylesIntoShadowRoot(node.shadowRoot, node);
            } else {
                scheduleShadowHostRetry(node);
            }
        }

        processCandidate(baseRoot);

        var walker = document.createTreeWalker(baseRoot, NodeFilter.SHOW_ELEMENT, null);
        var node = walker.nextNode();
        while (node) {
            processCandidate(node);
            node = walker.nextNode();
        }
    }

    function processIframes(root) {
        const iframes = [];
        if (root.matches && root.matches('iframe')) {
            iframes.push(root);
        }
        root.querySelectorAll('iframe').forEach(iframe => iframes.push(iframe));

        iframes.forEach(iframe => {
            try {
                // Skip PDF viewer iframes
                const src = iframe.src || '';
                if (src.includes('pdf') || src.includes('viewer') || src.includes('.pdf')) {
                    return;
                }

                const doc = iframe.contentDocument;
                if (!doc || !doc.documentElement) return;

                // Skip if iframe contains PDF viewer
                if (doc.getElementById('viewer') ||
                    doc.querySelector('.pdfViewer') ||
                    doc.querySelector('.pdf-viewer') ||
                    doc.querySelector('[data-page-number]')) {
                    return;
                }

                let style = doc.getElementById('dark-mode-iframe-styles');
                if (!style) {
                    style = doc.createElement('style');
                    style.id = 'dark-mode-iframe-styles';
                    style.textContent = iframeStyles;
                    doc.head.appendChild(style);
                } else if (style.textContent !== iframeStyles) {
                    style.textContent = iframeStyles;
                }
            } catch (error) {
                // Ignore cross-origin iframe access errors
            }
        });
    }

    // Wait for critical custom elements to be defined before processing
    async function waitForCustomElements() {
        // Wait for the custom elements to be defined
        const elementsToWait = [
            'd2l-enrollment-card',
            'd2l-card',
            'd2l-html-block',
            'd2l-icon'
        ];

        const promises = elementsToWait.map(tagName => {
            if (customElements.get(tagName)) {
                // Already defined
                return Promise.resolve();
            } else {
                // Wait for it to be defined
                return customElements.whenDefined(tagName).catch(() => {
                    // Element might not exist on this page, that's OK
                    return Promise.resolve();
                });
            }
        });

        // Wait for all elements (with timeout)
        return Promise.race([
            Promise.all(promises),
            new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
        ]);
    }

    // Initial processing (dark mode only â€” unified observer handles ongoing changes)
    if (darkModeEnabled) {
        async function initialize() {
            await waitForCustomElements();
            processElement(document.body);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
    }

    // Load and visibility handlers are managed by unified scheduling section below

    // ===== LOGO REPLACEMENT =====
    // Replace the "My Home" logo with accent-colored DTU logos.
    // Uses PNG alpha masking:
    // - Dark mode: accent fill
    // - Light mode: accent fill + black outline border
    var _accentLogoPngImage = null;
    var _accentLogoPngLoadPromise = null;
    var _accentLogoDataUrlCache = {};

    function getResolvedAccent() {
        var theme = getAccentThemeById(_accentThemeId);
        return (theme && theme.accent) || '#990000';
    }

    function getAccentLogoSrc() {
        var accentHex = normalizeHexColor(getResolvedAccent(), '#990000') || '#990000';
        var modeKey = darkModeEnabled ? 'dark' : 'light';
        var cacheKey = modeKey + '|' + accentHex;
        if (Object.prototype.hasOwnProperty.call(_accentLogoDataUrlCache, cacheKey)) {
            return _accentLogoDataUrlCache[cacheKey];
        }

        var pngUrl = getExtensionUrl('images/Corp_White_Transparent.png');
        if (_accentLogoPngImage && _accentLogoPngImage.naturalWidth > 0 && _accentLogoPngImage.naturalHeight > 0) {
            try {
                var rgbParts = (hexToRgbTriplet(accentHex, '153,0,0') || '153,0,0').split(',');
                var r = parseInt(rgbParts[0], 10) || 153;
                var g = parseInt(rgbParts[1], 10) || 0;
                var b = parseInt(rgbParts[2], 10) || 0;

                var w = _accentLogoPngImage.naturalWidth;
                var h = _accentLogoPngImage.naturalHeight;
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                if (!ctx) return pngUrl;

                function makeMaskedSolid(rgbCss) {
                    var c = document.createElement('canvas');
                    c.width = w;
                    c.height = h;
                    var cctx = c.getContext('2d');
                    if (!cctx) return c;
                    cctx.clearRect(0, 0, w, h);
                    cctx.fillStyle = rgbCss;
                    cctx.fillRect(0, 0, w, h);
                    cctx.globalCompositeOperation = 'destination-in';
                    cctx.drawImage(_accentLogoPngImage, 0, 0, w, h);
                    cctx.globalCompositeOperation = 'source-over';
                    return c;
                }

                var accentMask = makeMaskedSolid('rgb(' + r + ',' + g + ',' + b + ')');
                ctx.clearRect(0, 0, w, h);

                if (!darkModeEnabled) {
                    // Light mode: add a thin black outline around the logo for contrast.
                    var outlineMask = makeMaskedSolid('#000000');
                    var offsets = [
                        [-1, 0], [1, 0], [0, -1], [0, 1],
                        [-1, -1], [-1, 1], [1, -1], [1, 1]
                    ];
                    offsets.forEach(function (off) {
                        ctx.drawImage(outlineMask, off[0], off[1], w, h);
                    });
                }

                ctx.drawImage(accentMask, 0, 0, w, h);

                var dataUrl = canvas.toDataURL('image/png');
                _accentLogoDataUrlCache[cacheKey] = dataUrl;
                return dataUrl;
            } catch (e0) {
                return pngUrl;
            }
        }

        if (!_accentLogoPngLoadPromise) {
            _accentLogoPngLoadPromise = new Promise(function (resolve) {
                try {
                    var img = new Image();
                    img.onload = function () {
                        _accentLogoPngImage = img;
                        resolve();
                    };
                    img.onerror = function () { resolve(); };
                    img.src = pngUrl;
                } catch (eLoad) {
                    resolve();
                }
            })
                .finally(function () {
                    _accentLogoPngLoadPromise = null;
                    try { replaceLogoImage(); } catch (e0) { }
                });
        }

        // Fallback while PNG is loading.
        return pngUrl;
    }

    function replaceLogoImage(rootNode) {
        const newSrc = getAccentLogoSrc();

        function replaceHostLogosInRoot(root) {
            if (!root || !root.querySelectorAll) return;
            const hostLogos = root.querySelectorAll(
                'd2l-labs-navigation-link-image.d2l-navigation-s-logo, '
                + 'd2l-labs-navigation-link-image[text="My Home"], '
                + 'd2l-labs-navigation-link-image[href*="/d2l/lp/ouHome/"]'
            );
            hostLogos.forEach(host => {
                if (!host.dataset.darkModeReplaced || host.getAttribute('src') !== newSrc) {
                    host.setAttribute('src', newSrc);
                    host.src = newSrc;
                    host.dataset.darkModeReplaced = 'true';
                }
            });
        }

        // Helper function to replace logo in a given root
        function replaceInRoot(root) {
            if (!root) return;
            const logoImages = root.querySelectorAll(
                'img[src*="/d2l/lp/navbars/"][src*="/theme/viewimage/"], '
                + 'img[alt="My Home"], '
                + 'img.websitelogoright__link-image, '
                + 'img[src*="dtulogo2_colour.png"], '
                + 'img[src*="dtulogo_colour.png"], '
                + 'img.header__logo, '
                + 'img[src*="DTULogo_Corp_Red_RGB.png"]'
            );
            logoImages.forEach(img => {
                // Re-apply if the host page swaps the src back after load.
                if (!img.dataset.darkModeReplaced || img.src !== newSrc) {
                    img.src = newSrc;
                    img.dataset.darkModeReplaced = 'true';
                    // Resize the sites.dtu.dk DTU logo
                    if (img.classList.contains('websitelogoright__link-image') || img.getAttribute('src')?.includes('dtulogo2_colour') || img.classList.contains('logo-img')) {
                        img.style.setProperty('max-height', '60px', 'important');
                        img.style.setProperty('width', 'auto', 'important');
                    }
                }
            });
        }

        const baseRoot = (rootNode && rootNode.nodeType === 1) ? rootNode : document;
        replaceHostLogosInRoot(baseRoot);
        replaceInRoot(baseRoot);

        // Check all shadow roots recursively
        function checkShadowRoots(root) {
            if (!root) return;
            const elements = root.querySelectorAll('*');
            elements.forEach(el => {
                if (el.shadowRoot) {
                    replaceHostLogosInRoot(el.shadowRoot);
                    replaceInRoot(el.shadowRoot);
                    checkShadowRoots(el.shadowRoot);
                }
            });
        }

        checkShadowRoots(baseRoot);
    }

    // Run logo replacement
    replaceLogoImage();

    // ===== MOJANGLES TEXT INSERTION =====
    // Insert Mojangles text image into the navigation header with Minecraft-style animation

    function isMojanglesEnabled() {
        const stored = localStorage.getItem('mojanglesTextEnabled');
        return stored === null ? true : stored === 'true';
    }

    function isMojanglesTargetPage() {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return false;
        var path = window.location.pathname || '';
        if (/^\/d2l\/home(?:\/\d+)?\/?$/i.test(path)) return true;
        if (/^\/d2l\/le\/lessons\/\d+(?:\/.*)?$/i.test(path)) return true;
        return false;
    }

    // Find all .mojangles-text-img elements including inside shadow roots
    function findAllMojanglesImages(root) {
        const images = [];
        if (!root) return images;
        root.querySelectorAll('.mojangles-text-img').forEach(img => images.push(img));
        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
                findAllMojanglesImages(el.shadowRoot).forEach(img => images.push(img));
            }
        });
        return images;
    }

    function insertMojanglesText() {
        if (!IS_TOP_WINDOW) return;
        if (!isMojanglesTargetPage()) {
            findAllMojanglesImages(document).forEach(img => {
                if (img && img._dtuMojanglesPulseAnim && typeof img._dtuMojanglesPulseAnim.cancel === 'function') {
                    img._dtuMojanglesPulseAnim.cancel();
                    img._dtuMojanglesPulseAnim = null;
                }
                img.remove();
            });
            return;
        }

        // If disabled, hide all existing Mojangles images (including in shadow DOM) and return
        if (!isMojanglesEnabled()) {
            findAllMojanglesImages(document).forEach(img => {
                if (img && img._dtuMojanglesPulseAnim && typeof img._dtuMojanglesPulseAnim.cancel === 'function') {
                    img._dtuMojanglesPulseAnim.cancel();
                    img._dtuMojanglesPulseAnim = null;
                }
                img.style.display = 'none';
            });
            return;
        }

        // If enabled, make sure existing ones are visible
        findAllMojanglesImages(document).forEach(img => {
            img.style.display = '';
        });

        if (!document.getElementById('dtu-mojangles-pulse-style')) {
            var pulseStyle = document.createElement('style');
            pulseStyle.id = 'dtu-mojangles-pulse-style';
            pulseStyle.textContent = '@keyframes dtuMojanglesPulse { 0%, 100% { transform: translateY(-50%) rotate(-20deg) scale(1); } 50% { transform: translateY(-50%) rotate(-20deg) scale(1.05); } }';
            (document.head || document.documentElement).appendChild(pulseStyle);
        }

        const mojanglesImgSrc = getExtensionUrl(darkModeEnabled ? 'images/mojangles_text.png' : 'images/mojangles_text_darkmode_off.png');
        const isRootHomePage = /^\/d2l\/home\/?$/.test(window.location.pathname);
        const homePulseMs = 1800;

        function setMojanglesPulse(img, shouldPulse) {
            if (!img) return;
            if (img._dtuMojanglesPulseAnim && typeof img._dtuMojanglesPulseAnim.cancel === 'function') {
                if (!shouldPulse) {
                    img._dtuMojanglesPulseAnim.cancel();
                    img._dtuMojanglesPulseAnim = null;
                } else {
                    return;
                }
            }
            if (shouldPulse) {
                try {
                    if (typeof img.animate === 'function') {
                        img._dtuMojanglesPulseAnim = img.animate(
                            [
                                { transform: 'translateY(-50%) rotate(-20deg) scale(1)' },
                                { transform: 'translateY(-50%) rotate(-20deg) scale(1.05)' },
                                { transform: 'translateY(-50%) rotate(-20deg) scale(1)' }
                            ],
                            { duration: homePulseMs, iterations: Infinity, easing: 'ease-in-out' }
                        );
                        img.style.animation = 'none';
                        return;
                    }
                } catch (e) {
                    // Fall back to CSS animation below.
                }
                img.style.animation = 'dtuMojanglesPulse 1.8s ease-in-out infinite';
            } else {
                img.style.animation = 'none';
            }
        }

        function resolveMojanglesLogoElement(container) {
            if (!container) return null;
            var strongSelector = [
                'd2l-navigation-link-image.d2l-navigation-s-logo',
                'd2l-navigation-link-image[text="My Home"]',
                'a.d2l-navigation-s-link[href*="/d2l/home"]',
                'a[href^="/d2l/home"]',
                'a[href*="/d2l/home"] d2l-navigation-link-image'
            ].join(', ');

            var slot = container.querySelector('slot[name="left"]');
            if (slot && typeof slot.assignedElements === 'function') {
                var assigned = slot.assignedElements({ flatten: true }) || [];
                for (var i = 0; i < assigned.length; i++) {
                    var el = assigned[i];
                    if (!el) continue;
                    if (el.matches && el.matches(strongSelector)) return el;
                    if (el.querySelector) {
                        var nested = el.querySelector(strongSelector);
                        if (nested) return nested;
                    }
                }
            }

            var direct = container.querySelector(strongSelector);
            if (direct) return direct;
            return null;
        }

        // Helper function to insert in a given root
        function insertInRoot(root) {
            if (!root) return;

            // Find the navigation header container
            const headerContainers = root.querySelectorAll('.d2l-labs-navigation-header-container');
            headerContainers.forEach(container => {
                var img = container.querySelector('.mojangles-text-img');
                if (!img) {
                    img = document.createElement('img');
                    markExt(img);
                    img.className = 'mojangles-text-img';
                    img.alt = 'Mojangles';
                    container.appendChild(img);
                }
                img.src = mojanglesImgSrc;
                img.style.display = 'block';
                img.style.opacity = '1';
                img.style.visibility = 'visible';

                // Use absolute placement for reliable rendering across slot-based header variants.
                container.style.position = 'relative';
                container.style.overflow = 'visible';

                var logo = resolveMojanglesLogoElement(container);
                var heightPx = isRootHomePage ? 16 : 12;
                var fallbackLeftPx = isRootHomePage ? 36 : 16;
                var fallbackTop = isRootHomePage ? 'calc(58% + 3px)' : 'calc(60% + 19px)';
                var styleBase = 'height:' + heightPx + 'px; position:absolute; transform:translateY(-50%) rotate(-20deg); '
                    + 'z-index:20; pointer-events:none; display:block; opacity:1; visibility:visible;';

                if (!logo || !logo.getBoundingClientRect) {
                    img.style.cssText = styleBase + ' left:' + fallbackLeftPx + 'px; top:' + fallbackTop + ';';
                    setMojanglesPulse(img, isRootHomePage);
                    return;
                }

                var containerRect = container.getBoundingClientRect();
                var logoRect = logo.getBoundingClientRect();
                if (!containerRect || !logoRect || logoRect.width <= 0 || containerRect.width <= 0) {
                    img.style.cssText = styleBase + ' left:' + fallbackLeftPx + 'px; top:' + fallbackTop + ';';
                    setMojanglesPulse(img, isRootHomePage);
                    return;
                }

                var leftPx = Math.max(4, Math.round(logoRect.right - containerRect.left + (isRootHomePage ? -26 : -32)));
                // Safety guard: if the detected anchor is on the right side, snap back near the DTU logo area.
                if (leftPx > (containerRect.width * 0.5)) {
                    leftPx = fallbackLeftPx;
                }
                var topPx = Math.round((logoRect.top - containerRect.top) + (logoRect.height * (isRootHomePage ? 0.58 : 0.62))) + (isRootHomePage ? 3 : 19);
                img.style.cssText = styleBase + ' left:' + leftPx + 'px; top:' + topPx + 'px;';
                setMojanglesPulse(img, isRootHomePage);
            });
        }

        // Check main document
        insertInRoot(document);

        // Check all shadow roots recursively
        function checkShadowRoots(root) {
            if (!root) return;
            const elements = root.querySelectorAll('*');
            elements.forEach(el => {
                if (el.shadowRoot) {
                    insertInRoot(el.shadowRoot);
                    checkShadowRoots(el.shadowRoot);
                }
            });
        }

        checkShadowRoots(document);
    }

    // Run Mojangles text insertion (unified observer handles updates)
    insertMojanglesText();

    // Admin Tools menu content can live inside Brightspace shadow roots and/or be lazy-loaded.
    // Use a shadow-aware lookup so our "DTU After Dark" column is reliably created.
    var _adminToolsPlaceholderCache = null;
    var _adminToolsDebugLog = [];
    var ADMIN_TOOLS_DEBUG_KEY = 'dtuAfterDarkAdminToolsDebug';
    var _adminToolsDebugBridgeInstalled = false;
    var _adminToolsLastGearInteractionTs = 0;
    function isAdminToolsDebugEnabled() {
        try { return localStorage.getItem(ADMIN_TOOLS_DEBUG_KEY) === 'true'; } catch (e) { return false; }
    }

    // Like Element.closest(), but crosses shadow-root boundaries (via ShadowRoot.host).
    function closestComposed(el, selector) {
        var cur = el;
        while (cur) {
            try { if (cur.matches && cur.matches(selector)) return cur; } catch (e0) { }
            try {
                if (cur.parentElement) { cur = cur.parentElement; continue; }
            } catch (e1) { }
            try {
                var root = cur.getRootNode ? cur.getRootNode() : null;
                if (root && root.host) { cur = root.host; continue; }
            } catch (e2) { }
            cur = null;
        }
        return null;
    }
    function isD2LDropdownOpen(dd) {
        try {
            if (!dd) return false;
            // Brightspace sometimes uses attributes, sometimes properties.
            if (dd.hasAttribute && (dd.hasAttribute('opened') || dd.hasAttribute('_opened'))) return true;
            if (dd.opened === true) return true;
            if (dd._opened === true) return true;
        } catch (e) { }
        return false;
    }

    // Prevent Brightspace d2l-dropdown-content from auto-closing during our DOM mutations.
    // Returns a cleanup function that forces the dropdown to stay open and removes the guard.
    function guardDropdownOpen(dd) {
        if (!dd) return null;
        var hadNoAutoClose = false;
        try { hadNoAutoClose = dd.hasAttribute('no-auto-close'); } catch (e0) { }
        try { dd.setAttribute('no-auto-close', ''); } catch (e1) { }

        function preventClose(e) {
            try { e.preventDefault(); } catch (e2) { }
            try { e.stopPropagation(); } catch (e3) { }
            try { e.stopImmediatePropagation(); } catch (e4) { }
        }
        try { dd.addEventListener('d2l-dropdown-close', preventClose, true); } catch (e5) { }

        return function releaseGuard() {
            // Force the dropdown to remain open after mutations.
            try {
                dd.setAttribute('opened', '');
                if (typeof dd.opened !== 'undefined') dd.opened = true;
            } catch (e6) { }
            // Remove guards after the DOM has settled.
            setTimeout(function () {
                try { dd.removeEventListener('d2l-dropdown-close', preventClose, true); } catch (e7) { }
                if (!hadNoAutoClose) {
                    try { dd.removeAttribute('no-auto-close'); } catch (e8) { }
                }
            }, 600);
        };
    }

    function elementSeemsVisible(el) {
        try {
            if (!el || !el.getBoundingClientRect) return false;
            var r = el.getBoundingClientRect();
            if (!r || r.width <= 0 || r.height <= 0) return false;
            // If it's completely offscreen, treat as not visible.
            if (r.bottom < 0 || r.right < 0) return false;
            if (r.top > window.innerHeight || r.left > window.innerWidth) return false;
            var cs = null;
            try { cs = getComputedStyle(el); } catch (e0) { cs = null; }
            if (cs) {
                if (cs.display === 'none') return false;
                if (cs.visibility === 'hidden') return false;
                if (parseFloat(cs.opacity || '1') === 0) return false;
            }
            return true;
        } catch (e) { return false; }
    }

    function getComposedParent(el) {
        try {
            if (!el) return null;
            if (el.parentElement) return el.parentElement;
        } catch (e0) { }
        try {
            var root = el.getRootNode ? el.getRootNode() : null;
            if (root && root.host) return root.host;
        } catch (e1) { }
        return null;
    }

    // Some Brightspace placeholders have 0x0 rects even when their content is visible.
    // Consider an element visible if it or any composed ancestor has a visible rect.
    function elementOrAncestorSeemsVisible(el, maxHops) {
        var cur = el;
        var hops = 0;
        var limit = (typeof maxHops === 'number' && maxHops > 0) ? maxHops : 10;
        while (cur && hops < limit) {
            try { if (elementSeemsVisible(cur)) return true; } catch (e0) { }
            cur = getComposedParent(cur);
            hops++;
        }
        return false;
    }

    function adminToolsLikelyOpen(placeholder, dd) {
        // Fallback: Brightspace may not expose "opened" as attributes anymore.
        // If the user just clicked the gear, we treat it as "open enough" to enhance.
        try {
            if (isD2LDropdownOpen(dd)) return true;
        } catch (e0) { }
        try {
            var dt = Date.now() - (_adminToolsLastGearInteractionTs || 0);
            if (dt >= 0 && dt <= 2500) {
                // Only treat it as open if the placeholder (or a composed ancestor) is actually visible.
                if (elementOrAncestorSeemsVisible(placeholder)) return true;
                if (elementOrAncestorSeemsVisible(dd)) return true;
            }
        } catch (e1) { }
        try {
            if (elementOrAncestorSeemsVisible(placeholder)) return true;
        } catch (e2) { }
        return false;
    }

    function safeRect(el) {
        try {
            if (!el || !el.getBoundingClientRect) return null;
            var r = el.getBoundingClientRect();
            return {
                x: Math.round(r.x), y: Math.round(r.y),
                w: Math.round(r.width), h: Math.round(r.height),
                l: Math.round(r.left), t: Math.round(r.top),
                r: Math.round(r.right), b: Math.round(r.bottom)
            };
        } catch (e) { return null; }
    }

    function snapshotAdminToolsDomState() {
        var out = {
            ts: (function () { try { return new Date().toISOString(); } catch (e) { return String(Date.now()); } })(),
            href: (function () { try { return String(location.href); } catch (e) { return null; } })(),
            readyState: (function () { try { return String(document.readyState); } catch (e) { return null; } })(),
            ua: (function () { try { return String(navigator.userAgent); } catch (e) { return null; } })(),
            gearButton: null,
            openedDropdowns: [],
            placeholders: []
        };

        try {
            var gear = null;
            try { gear = document.querySelector('button[aria-label="Admin Tools"]'); } catch (e0) { gear = null; }
            if (!gear) {
                try {
                    var hits = deepQueryAll('button[aria-label="Admin Tools"]', document);
                    if (hits && hits.length) gear = hits[0];
                } catch (e1) { gear = null; }
            }
            if (gear) {
                out.gearButton = {
                    tag: gear.tagName ? String(gear.tagName) : null,
                    rect: safeRect(gear),
                    hooked: gear.getAttribute ? gear.getAttribute('data-dtu-gear-hooked') : null
                };
            }
        } catch (e2) { }

        try {
            // Capture a handful of dropdown-content nodes near the top bar to see where Brightspace stores open state.
            var all = [];
            try { all = deepQueryAll('d2l-dropdown-content', document); } catch (e3) { all = []; }
            var scored = [];
            for (var i = 0; i < (all ? all.length : 0); i++) {
                var dd = all[i];
                if (!dd || !dd.isConnected) continue;
                var r = safeRect(dd);
                var area = 0;
                try { area = r ? (r.w * r.h) : 0; } catch (eA) { area = 0; }
                scored.push({ dd: dd, rect: r, area: area });
            }
            scored.sort(function (a, b) { return (b.area || 0) - (a.area || 0); });
            var take = scored.slice(0, 12);
            for (var j = 0; j < take.length; j++) {
                var dd2 = take[j].dd;
                out.openedDropdowns.push({
                    rect: take[j].rect,
                    openedAttr: dd2.hasAttribute ? dd2.hasAttribute('opened') : null,
                    _openedAttr: dd2.hasAttribute ? dd2.hasAttribute('_opened') : null,
                    openedProp: (typeof dd2.opened !== 'undefined') ? dd2.opened : null,
                    _openedProp: (typeof dd2._opened !== 'undefined') ? dd2._opened : null,
                    minWidthAttr: dd2.getAttribute ? dd2.getAttribute('min-width') : null,
                    maxWidthAttr: dd2.getAttribute ? dd2.getAttribute('max-width') : null,
                    styleLeft: (dd2.style && dd2.style.left) ? String(dd2.style.left) : null,
                    styleRight: (dd2.style && dd2.style.right) ? String(dd2.style.right) : null,
                    styleWidth: (dd2.style && dd2.style.width) ? String(dd2.style.width) : null
                });
            }
        } catch (e4) { }

        try {
            var hits2 = [];
            try { hits2 = deepQueryAll('#AdminToolsPlaceholderId', document); } catch (e5) { hits2 = []; }
            if (hits2 && hits2.length) {
                for (var j = 0; j < hits2.length; j++) {
                    var p = hits2[j];
                    if (!p || !p.isConnected) continue;
                    var dd2 = null;
                    try { dd2 = closestComposed(p, 'd2l-dropdown-content'); } catch (e6) { dd2 = null; }
                    var open2 = adminToolsLikelyOpen(p, dd2);
                    var rootUi = null;
                    try { rootUi = p.querySelector ? p.querySelector('.dtu-am-root') : null; } catch (e7) { rootUi = null; }
                    out.placeholders.push({
                        rect: safeRect(p),
                        marker: p.getAttribute ? p.getAttribute('data-dtu-restructured') : null,
                        inOpenDropdown: open2,
                        dropdownRect: safeRect(dd2),
                        hasUiRoot: !!rootUi,
                        uiRect: safeRect(rootUi)
                    });
                }
            }
        } catch (e8) { }

        return out;
    }
    function getPageWindowForDebugApi() {
        // Firefox content scripts run with Xray wrappers; expose debug API via wrappedJSObject so it is callable
        // from the page console. In Chromium this is just window.
        try { return (window && window.wrappedJSObject) ? window.wrappedJSObject : window; } catch (e) { return window; }
    }

    function installAdminToolsDebugBridge() {
        if (_adminToolsDebugBridgeInstalled) return;
        _adminToolsDebugBridgeInstalled = true;
        try {
            window.addEventListener('DTU_AD_ADMIN_TOOLS_DEBUG_REQUEST', function (ev) {
                try {
                    var detail = ev && ev.detail ? ev.detail : {};
                    var reqId = detail && detail.reqId ? String(detail.reqId) : String(Date.now());
                    var payloadObj = {
                        meta: {
                            ts: (function () { try { return new Date().toISOString(); } catch (e) { return String(Date.now()); } })(),
                            href: (function () { try { return String(location.href); } catch (e) { return null; } })()
                        },
                        snapshot: snapshotAdminToolsDomState(),
                        log: _adminToolsDebugLog
                    };
                    var payload = '';
                    try { payload = JSON.stringify(payloadObj, null, 2); } catch (e0) { payload = String(payloadObj); }
                    window.dispatchEvent(new CustomEvent('DTU_AD_ADMIN_TOOLS_DEBUG_RESPONSE', { detail: { reqId: reqId, payload: payload } }));
                } catch (e1) { }
            });
            window.addEventListener('DTU_AD_ADMIN_TOOLS_DEBUG_CLEAR_REQUEST', function (ev) {
                try {
                    var detail = ev && ev.detail ? ev.detail : {};
                    var reqId = detail && detail.reqId ? String(detail.reqId) : String(Date.now());
                    _adminToolsDebugLog = [];
                    window.dispatchEvent(new CustomEvent('DTU_AD_ADMIN_TOOLS_DEBUG_RESPONSE', { detail: { reqId: reqId, payload: 'CLEARED' } }));
                } catch (e2) { }
            });
        } catch (e3) { }

        // Inject a page-context helper so DevTools console can call it in Firefox (content script isolation).
        try {
            var s = document.createElement('script');
            s.textContent = ''
                + '(function(){'
                + '  try {'
                + '    if (window.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_EXPORT__) return;'
                + '    function req(kind, opts){'
                + '      opts = opts || {};'
                + '      var reqId = String(Date.now()) + \":\" + String(Math.random()).slice(2);'
                + '      return new Promise(function(resolve){'
                + '        var done = false;'
                + '        function finish(v){ if(done) return; done = true; try{ window.removeEventListener(\"DTU_AD_ADMIN_TOOLS_DEBUG_RESPONSE\", onResp); }catch(e){} resolve(v); }'
                + '        function onResp(ev){'
                + '          try {'
                + '            var d = ev && ev.detail ? ev.detail : null;'
                + '            if (!d || String(d.reqId) !== String(reqId)) return;'
                + '            finish(d.payload || \"\");'
                + '          } catch (e0) {}'
                + '        }'
                + '        window.addEventListener(\"DTU_AD_ADMIN_TOOLS_DEBUG_RESPONSE\", onResp);'
                + '        try {'
                + '          window.dispatchEvent(new CustomEvent(kind, { detail: { reqId: reqId, opts: opts } }));'
                + '        } catch (e1) { finish(\"ERROR_DISPATCH\"); }'
                + '        setTimeout(function(){ finish(\"TIMEOUT\"); }, 2500);'
                + '      });'
                + '    }'
                + '    window.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_EXPORT__ = function(opts){ return req(\"DTU_AD_ADMIN_TOOLS_DEBUG_REQUEST\", opts); };'
                + '    window.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_CLEAR__ = function(){ return req(\"DTU_AD_ADMIN_TOOLS_DEBUG_CLEAR_REQUEST\"); };'
                + '    window.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_HELP__ = function(){'
                + '      return \"Run: await __DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_EXPORT__()  (copies JSON to console result).\\n\"'
                + '        + \"If it returns TIMEOUT, the content script bridge did not respond.\";'
                + '    };'
                + '  } catch (e) {}'
                + '})();';
            (document.head || document.documentElement).appendChild(s);
            try { s.remove(); } catch (e4) { }
        } catch (e5) { }
    }
    function exposeAdminToolsDebugApi() {
        try {
            var w = getPageWindowForDebugApi();
            if (!w) return;
            if (w.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_API__ === true) return;
            w.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_API__ = true;

            // In Firefox, prefer exportFunction so the functions are callable from page DevTools even under strict CSP.
            try {
                if (window && window.wrappedJSObject && (typeof exportFunction === 'function')) {
                    exportFunction(function () {
                        try {
                            return JSON.stringify({
                                snapshot: snapshotAdminToolsDomState(),
                                log: _adminToolsDebugLog
                            }, null, 2);
                        } catch (e0) { return String(_adminToolsDebugLog); }
                    }, window.wrappedJSObject, { defineAs: '__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_EXPORT__' });

                    exportFunction(function () {
                        _adminToolsDebugLog = [];
                        return true;
                    }, window.wrappedJSObject, { defineAs: '__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_CLEAR__' });

                    exportFunction(function () {
                        try { return localStorage.getItem(ADMIN_TOOLS_DEBUG_KEY) === 'true'; } catch (e1) { return false; }
                    }, window.wrappedJSObject, { defineAs: '__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_ENABLED__' });

                    exportFunction(function () {
                        return 'Run: __DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_EXPORT__()  (returns JSON string).';
                    }, window.wrappedJSObject, { defineAs: '__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_HELP__' });
                }
            } catch (eX) { }

            // Fallback assignment (Chromium / less strict contexts).
            try {
                if (!w.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_EXPORT__) {
                    w.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_EXPORT__ = function () {
                        try { return JSON.stringify({ snapshot: snapshotAdminToolsDomState(), log: _adminToolsDebugLog }, null, 2); }
                        catch (e0) { return String(_adminToolsDebugLog); }
                    };
                }
                if (!w.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_CLEAR__) {
                    w.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_CLEAR__ = function () {
                        _adminToolsDebugLog = [];
                        return true;
                    };
                }
                if (!w.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_ENABLED__) {
                    w.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG_ENABLED__ = function () {
                        try { return localStorage.getItem(ADMIN_TOOLS_DEBUG_KEY) === 'true'; } catch (e1) { return false; }
                    };
                }
            } catch (eY) { }
        } catch (e) { }
    }
    function adminToolsDbg(event, data) {
        try {
            if (!isAdminToolsDebugEnabled()) return;
            installAdminToolsDebugBridge();
            exposeAdminToolsDebugApi();
            var ts = '';
            try { ts = new Date().toISOString(); } catch (e0) { ts = String(Date.now()); }
            var entry = { ts: ts, event: String(event || ''), data: data || null };
            _adminToolsDebugLog.push(entry);
            if (_adminToolsDebugLog.length > 600) _adminToolsDebugLog.shift();
            // Keep console noise reasonable; full log is exported via the debug bridge.
            try {
                var evName = String(entry.event || '');
                var shouldPrint = true;
                if (evName.indexOf('placeholder_') === 0) shouldPrint = false;
                if (evName === 'enhance_tick') shouldPrint = false;
                if (shouldPrint) console.log('[DTU After Dark][AdminTools]', entry.event, entry.data || '');
            } catch (e1) { }
            try {
                var w = getPageWindowForDebugApi();
                if (w) w.__DTU_AFTER_DARK_ADMIN_TOOLS_DEBUG__ = _adminToolsDebugLog;
            } catch (e2) { }
        } catch (e) { }
    }
    function adminToolsDbgError(event, err) {
        try {
            adminToolsDbg(event, {
                message: err && err.message ? String(err.message) : String(err),
                stack: err && err.stack ? String(err.stack) : null
            });
        } catch (e) { }
    }
    function getAdminToolsPlaceholder() {
        try {
            if (_adminToolsPlaceholderCache && _adminToolsPlaceholderCache.isConnected) {
                // Prefer cached placeholder only if it belongs to an opened dropdown, otherwise it might be a stale/offscreen instance.
                try {
                    var ddCached = closestComposed(_adminToolsPlaceholderCache, 'd2l-dropdown-content');
                    if (isD2LDropdownOpen(ddCached)) {
                        adminToolsDbg('placeholder_cache_hit', { opened: true });
                        return _adminToolsPlaceholderCache;
                    }
                } catch (eC) { }
            }
        } catch (e0) { _adminToolsPlaceholderCache = null; }

        var candidates = [];
        try {
            var direct = document.querySelector('#AdminToolsPlaceholderId');
            if (direct) candidates.push(direct);
        } catch (e1) { }
        try {
            var hits = deepQueryAll('#AdminToolsPlaceholderId', document);
            if (hits && hits.length) {
                for (var i = 0; i < hits.length; i++) candidates.push(hits[i]);
            }
        } catch (e2) { }

        // Dedupe candidates.
        var uniq = [];
        for (var u = 0; u < candidates.length; u++) {
            var c = candidates[u];
            if (!c || !c.isConnected) continue;
            var seen = false;
            for (var k = 0; k < uniq.length; k++) {
                if (uniq[k] === c) { seen = true; break; }
            }
            if (!seen) uniq.push(c);
        }

        var chosen = null;
        var chosenOpen = false;
        var bestOpenArea = -1;
        for (var j = 0; j < uniq.length; j++) {
            var cand = uniq[j];
            var dd = null;
            var isOpen = false;
            try {
                dd = closestComposed(cand, 'd2l-dropdown-content');
                isOpen = isD2LDropdownOpen(dd);
            } catch (e3) { dd = null; isOpen = false; }
            if (isOpen) {
                var area = 0;
                try {
                    var r = dd && dd.getBoundingClientRect ? dd.getBoundingClientRect() : null;
                    area = r ? (r.width * r.height) : 0;
                } catch (eA) { area = 0; }
                if (area > bestOpenArea) {
                    bestOpenArea = area;
                    chosen = cand;
                    chosenOpen = true;
                }
                continue;
            }
            if (!chosen) chosen = cand;
        }

        if (chosen) _adminToolsPlaceholderCache = chosen;
        adminToolsDbg('placeholder_lookup', {
            found: !!chosen,
            candidates: uniq.length,
            chosenInOpenedDropdown: chosenOpen,
            readyState: (function () { try { return document.readyState; } catch (e4) { return null; } })()
        });
        if (isAdminToolsDebugEnabled() && uniq.length > 1) {
            try {
                var info = uniq.map(function (cand2) {
                    var dd2 = null;
                    var open2 = false;
                    var rect = null;
                    try {
                        dd2 = closestComposed(cand2, 'd2l-dropdown-content');
                        open2 = isD2LDropdownOpen(dd2);
                    } catch (e5) { }
                    try { rect = cand2.getBoundingClientRect ? cand2.getBoundingClientRect() : null; } catch (e6) { rect = null; }
                    return {
                        open: open2,
                        hasDd: !!dd2,
                        marker: cand2.getAttribute ? cand2.getAttribute('data-dtu-restructured') : null,
                        rect: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : null
                    };
                });
                adminToolsDbg('placeholder_candidates', info);
            } catch (e7) { }
        }
        return chosen;
    }

    // ===== MOJANGLES TOGGLE IN ADMIN TOOLS =====
    function insertMojanglesToggle() {
        if (!IS_TOP_WINDOW) return;
        const placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return;
        if (placeholder.querySelector && placeholder.querySelector('#mojangles-toggle')) return;

        const column = document.createElement('div');
        column.className = 'd2l-admin-tools-column';
        if (darkModeEnabled) column.style.cssText = 'background-color: #2d2d2d !important; color: #e0e0e0 !important;';

        const heading = document.createElement('h2');
        heading.className = 'd2l-heading vui-heading-4 d2l-heading-none';
        heading.textContent = 'DTU After Dark';
        if (darkModeEnabled) heading.style.cssText = 'background-color: #2d2d2d !important; color: #e0e0e0 !important;';

        const list = document.createElement('ul');
        list.className = 'd2l-list';
        if (darkModeEnabled) list.style.cssText = 'background-color: #2d2d2d !important;';

        const li = document.createElement('li');
        li.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        const label = document.createElement('label');
        label.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; font-size: 14px; background-color: #2d2d2d !important; background: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'mojangles-toggle';
        toggle.checked = isMojanglesEnabled();
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: var(--dtu-ad-accent);';

        toggle.addEventListener('change', () => {
            localStorage.setItem('mojanglesTextEnabled', toggle.checked.toString());
            insertMojanglesText();
        });

        label.appendChild(toggle);
        label.appendChild(document.createTextNode('Mojangles Text'));
        li.appendChild(label);
        list.appendChild(li);
        column.appendChild(heading);
        column.appendChild(list);
        placeholder.appendChild(column);
    }

    // Do not mutate Admin Tools until the gear dropdown is opened.
    // Brightspace can keep offscreen/template DOM around; changing it early can desync the visible menu.

    // ===== DARK MODE TOGGLE (works in both dark and light modes) =====
    function insertDarkModeToggle() {
        if (!IS_TOP_WINDOW) return;
        const placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return;
        if (placeholder.querySelector && placeholder.querySelector('#dark-mode-toggle')) return;

        // Find or create the "DTU After Dark" column
        let targetList = null;
        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });

        if (!targetList) {
            if (!darkModeEnabled) {
                // In light mode, create the column if it doesn't exist
                const column = document.createElement('div');
                column.className = 'd2l-admin-tools-column';

                const heading = document.createElement('h2');
                heading.className = 'd2l-heading vui-heading-4 d2l-heading-none';
                heading.textContent = 'DTU After Dark';

                const list = document.createElement('ul');
                list.className = 'd2l-list';

                column.appendChild(heading);
                column.appendChild(list);
                placeholder.appendChild(column);
                targetList = list;
            } else {
                return;
            }
        }

        const li = document.createElement('li');
        li.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        const label = document.createElement('label');
        label.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; '
            + 'font-size: 14px; background-color: #2d2d2d !important; background: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'dark-mode-toggle';
        toggle.checked = darkModeEnabled;
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: var(--dtu-ad-accent);';

        toggle.addEventListener('change', () => {
            saveDarkModePreference(!darkModeEnabled);
            location.reload();
        });

        label.appendChild(toggle);
        label.appendChild(document.createTextNode('Dark Mode'));
        li.appendChild(label);

        // Insert as the first item in the list
        if (targetList.firstChild) {
            targetList.insertBefore(li, targetList.firstChild);
        } else {
            targetList.appendChild(li);
        }
    }

    // Do not mutate Admin Tools until the gear dropdown is opened.

    // Admin Tools dropdown content is sometimes created only when the user opens the gear menu,
    // and can live inside Brightspace shadow roots. Hook the gear interaction so we can
    // (re)apply our "DTU After Dark" admin panel as soon as it becomes available.
    var _adminToolsEnhanceTimer = null;
    function enhanceAdminToolsMenuOnce() {
        // Settings are now shown via the standalone modal (showSettingsModal).
        // No longer modify Brightspace's Admin Tools dropdown.
        return;
        var placeholder = null;
        try { placeholder = getAdminToolsPlaceholder(); } catch (eP) { placeholder = null; }
        if (!placeholder) {
            adminToolsDbg('enhance_skip_no_placeholder', null);
            return;
        }
        var dd = null;
        try {
            dd = closestComposed(placeholder, 'd2l-dropdown-content');
            var isOpen = adminToolsLikelyOpen(placeholder, dd);
            if (!isOpen) {
                adminToolsDbg('enhance_skip_dropdown_closed', {
                    hasDd: !!dd,
                    openedAttr: dd && dd.hasAttribute ? dd.hasAttribute('opened') : null,
                    _openedAttr: dd && dd.hasAttribute ? dd.hasAttribute('_opened') : null,
                    openedProp: dd && (typeof dd.opened !== 'undefined') ? dd.opened : null,
                    _openedProp: dd && (typeof dd._opened !== 'undefined') ? dd._opened : null,
                    sinceGearMs: (function () { try { return Date.now() - (_adminToolsLastGearInteractionTs || 0); } catch (e) { return null; } })(),
                    placeholderVisible: (function () { try { return elementOrAncestorSeemsVisible(placeholder); } catch (e2) { return null; } })()
                });
                return;
            }
        } catch (eD) { /* ignore */ }

        adminToolsDbg('enhance_target', {
            placeholderRect: safeRect(placeholder),
            dropdownRect: safeRect(dd),
            marker: placeholder.getAttribute ? placeholder.getAttribute('data-dtu-restructured') : null
        });

        adminToolsDbg('enhance_begin', null);

        // Guard: prevent Brightspace from auto-closing the dropdown while we mutate its content.
        // Also suppress the unified MutationObserver so our DOM changes don't trigger re-processing.
        var releaseGuard = null;
        try { releaseGuard = guardDropdownOpen(dd); } catch (eG) { }
        _suppressHeavyWork = true;

        try {
            try { insertMojanglesToggle(); } catch (e0) { adminToolsDbgError('enhance_err_insert_mojangles', e0); }
            try { insertDarkModeToggle(); } catch (e1) { adminToolsDbgError('enhance_err_insert_darkmode', e1); }
            try { insertBusToggle(); } catch (e2) { adminToolsDbgError('enhance_err_insert_bus', e2); }
            try { insertDeadlinesToggle(); } catch (e3) { adminToolsDbgError('enhance_err_insert_deadlines', e3); }
            try { insertSearchWidgetToggle(); } catch (e4) { adminToolsDbgError('enhance_err_insert_search', e4); }
            try { insertAfterDarkFeatureToggles(); } catch (e5) { adminToolsDbgError('enhance_err_insert_feature_toggles', e5); }
            try { syncAfterDarkFeatureToggleStates(); } catch (e6) { adminToolsDbgError('enhance_err_sync_toggles', e6); }
            try { restructureAdminToolsPanel(); } catch (e7) { adminToolsDbgError('enhance_err_restructure', e7); }
        } finally {
            _suppressHeavyWork = false;
            if (releaseGuard) { try { releaseGuard(); } catch (eR) { } }
        }

        adminToolsDbg('enhance_end', {
            hasUi: (function () {
                try {
                    var p = getAdminToolsPlaceholder();
                    return !!(p && p.querySelector && p.querySelector('.dtu-am-root'));
                } catch (e8) { return false; }
            })()
        });
    }

    function scheduleAdminToolsEnhance() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (_adminToolsEnhanceTimer) return;

        var attempts = 0;
        adminToolsDbg('enhance_schedule_start', null);
        _adminToolsEnhanceTimer = setInterval(function () {
            attempts++;
            adminToolsDbg('enhance_tick', { attempts: attempts });
            enhanceAdminToolsMenuOnce();

            var placeholder = null;
            try { placeholder = getAdminToolsPlaceholder(); } catch (e0) { placeholder = null; }
            var done = false;
            try {
                if (placeholder && placeholder.getAttribute && placeholder.getAttribute('data-dtu-restructured') === '1') {
                    var dd = closestComposed(placeholder, 'd2l-dropdown-content');
                    var open = adminToolsLikelyOpen(placeholder, dd);
                    var hasUi = false;
                    try { hasUi = !!(placeholder.querySelector && placeholder.querySelector('.dtu-am-root')); } catch (e2) { hasUi = false; }
                    done = !!(open && hasUi);
                }
            } catch (e1) { done = false; }
            // Brightspace can render the dropdown lazily; allow a few seconds to catch the real visible instance.
            if (done || attempts >= 30) {
                clearInterval(_adminToolsEnhanceTimer);
                _adminToolsEnhanceTimer = null;
                adminToolsDbg('enhance_schedule_stop', { done: done, attempts: attempts });
            }
        }, 150);
    }

    var _adminToolsGearHooked = false;
    function hookAdminToolsGearEnhancer() {
        if (_adminToolsGearHooked) return;
        _adminToolsGearHooked = true;
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;

        // Prefer direct listener on the actual gear button (more reliable than composedPath heuristics).
        function tryHook() {
            var btn = null;
            try { btn = document.querySelector('button[aria-label="Admin Tools"]'); } catch (e0) { btn = null; }
            if (!btn) {
                try {
                    var hits = deepQueryAll('button[aria-label="Admin Tools"]', document);
                    if (hits && hits.length) btn = hits[0];
                } catch (e1) { btn = null; }
            }
            if (!btn || btn.getAttribute('data-dtu-gear-hooked') === '1') return !!btn;

            btn.setAttribute('data-dtu-gear-hooked', '1');
            // Fully intercept the gear button: block ALL event phases so Brightspace's
            // native admin tools dropdown never opens. Only our settings modal is shown.
            function blockEvent(e) {
                try { e.preventDefault(); } catch (eP) { }
                try { e.stopPropagation(); } catch (eS) { }
                try { e.stopImmediatePropagation(); } catch (eI) { }
            }
            btn.addEventListener('pointerdown', blockEvent, true);
            btn.addEventListener('mousedown', blockEvent, true);
            btn.addEventListener('click', function (e) {
                blockEvent(e);
                adminToolsDbg('gear_click_intercepted', null);
                var existing = document.querySelector('.dtu-settings-modal-overlay');
                if (existing) { hideSettingsModal(); }
                else { showSettingsModal(); }
            }, true);
            // Also suppress the d2l-dropdown opener if the button lives inside one.
            try {
                var d2lDropdown = btn.closest('d2l-dropdown');
                if (!d2lDropdown) {
                    var composed = closestComposed(btn, 'd2l-dropdown');
                    if (composed) d2lDropdown = composed;
                }
                if (d2lDropdown) {
                    d2lDropdown.addEventListener('d2l-dropdown-open', blockEvent, true);
                    d2lDropdown.addEventListener('click', blockEvent, true);
                }
            } catch (eDd) { }
            return true;
        }

        // The top bar can render late; keep a short bootstrap loop.
        var tries = 0;
        var t = setInterval(function () {
            tries++;
            var ok = false;
            try { ok = tryHook(); } catch (e6) { ok = false; adminToolsDbgError('gear_hook_try_err', e6); }
            adminToolsDbg('gear_hook_try', { tries: tries, hooked: ok });
            if (ok || tries >= 20) {
                try { clearInterval(t); } catch (e7) { }
            }
        }, 250);
    }

    hookAdminToolsGearEnhancer();

    // ===== CONTEXT CAPTURE HELPER =====
    // Dev-only helper. Must stay disabled in release builds.
    const ENABLE_CONTEXT_CAPTURE_HELPER = false;
    var _contextCaptureActive = false;
    var _contextCaptureCleanup = null;
    var _contextCaptureHotkeyBound = false;
    var _contextCaptureToastTimer = null;
    var CONTEXT_CAPTURE_HTML_MAX = 60000;

    function getContextCaptureTheme() {
        if (darkModeEnabled) {
            return {
                bg: '#1f2937',
                fg: '#e0e0e0',
                border: '#3f4b5e',
                errorBg: '#5b1c1c',
                errorBorder: '#8c2d2d'
            };
        }
        return {
            bg: '#ffffff',
            fg: '#1f2937',
            border: '#cbd5e1',
            errorBg: '#fee2e2',
            errorBorder: '#fca5a5'
        };
    }

    function showContextCaptureToast(message, isError) {
        if (!document.body) return;

        var theme = getContextCaptureTheme();
        var toast = document.querySelector('#dtu-context-capture-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'dtu-context-capture-toast';
            toast.setAttribute('data-dtu-ext', '1');
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.cssText =
            'position: fixed; right: 14px; bottom: 14px; z-index: 2147483647; '
            + 'max-width: 420px; padding: 10px 12px; border-radius: 8px; '
            + 'font-size: 12px; line-height: 1.4; white-space: normal; '
            + 'box-shadow: 0 6px 18px rgba(0,0,0,0.35); '
            + 'background: ' + (isError ? theme.errorBg : theme.bg) + '; '
            + 'color: ' + theme.fg + '; '
            + 'border: 1px solid ' + (isError ? theme.errorBorder : theme.border) + ';';

        if (_contextCaptureToastTimer) clearTimeout(_contextCaptureToastTimer);
        _contextCaptureToastTimer = setTimeout(function () {
            if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
        }, 3600);
    }

    async function copyTextToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) {
            // Fallback below
        }

        try {
            var area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', 'readonly');
            area.style.position = 'fixed';
            area.style.opacity = '0';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.focus();
            area.select();
            var copied = document.execCommand('copy');
            document.body.removeChild(area);
            return !!copied;
        } catch (e) {
            return false;
        }
    }

    function getCaptureElementFromEvent(event) {
        var path = event.composedPath ? event.composedPath() : [];
        var candidate = (path && path.length > 0) ? path[0] : event.target;
        if (!candidate) return null;

        if (candidate.nodeType !== 1) {
            candidate = candidate.parentElement;
        }
        if (!candidate || candidate.nodeType !== 1) return null;
        return candidate;
    }

    function getCaptureParentElement(element) {
        if (!element) return null;
        if (element.parentElement) return element.parentElement;
        try {
            var root = element.getRootNode ? element.getRootNode() : null;
            if (root && root.host && root.host.nodeType === 1) return root.host;
        } catch (e) { }
        return null;
    }

    function trimCapturedHtml(html, maxLen) {
        if (!html) return '(not available)';
        if (html.length <= maxLen) return html;
        return html.slice(0, maxLen)
            + '\n<!-- truncated by DTU After Dark context helper (' + html.length + ' chars total) -->';
    }

    function buildContextCapturePayload(element) {
        var parent = getCaptureParentElement(element);
        var elementHtml = trimCapturedHtml(element.outerHTML || '', CONTEXT_CAPTURE_HTML_MAX);
        var parentHtml = trimCapturedHtml(parent ? parent.outerHTML : '', CONTEXT_CAPTURE_HTML_MAX);

        return [
            'DTU After Dark Context Capture',
            'URL: ' + window.location.href,
            'TITLE: ' + document.title,
            'TIMESTAMP: ' + new Date().toISOString(),
            '',
            'ELEMENT_OUTER_HTML:',
            elementHtml,
            '',
            'PARENT_OUTER_HTML:',
            parentHtml
        ].join('\n');
    }

    function stopContextCaptureMode() {
        _contextCaptureActive = false;
        if (_contextCaptureCleanup) {
            _contextCaptureCleanup();
            _contextCaptureCleanup = null;
        }
    }

    function startContextCaptureMode() {
        if (!ENABLE_CONTEXT_CAPTURE_HELPER) return;
        if (!IS_TOP_WINDOW) return;
        if (_contextCaptureActive) {
            showContextCaptureToast('Context capture is already active. Click an element or press Esc.', false);
            return;
        }

        _contextCaptureActive = true;
        showContextCaptureToast('Context capture active: click one element. Press Esc to cancel.', false);

        var clickHandler = async function (event) {
            if (!_contextCaptureActive) return;
            if (event.button !== 0) return; // Left click only

            var targetEl = getCaptureElementFromEvent(event);
            if (!targetEl) return;

            if (targetEl.closest && targetEl.closest('[data-dtu-ext], #dtu-context-capture-toast')) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }

            stopContextCaptureMode();
            var payload = buildContextCapturePayload(targetEl);
            var copied = await copyTextToClipboard(payload);
            if (copied) {
                showContextCaptureToast('Context copied to clipboard. Paste it here.', false);
            } else {
                showContextCaptureToast('Could not copy context automatically. Clipboard permission blocked.', true);
            }
        };

        var keydownHandler = function (event) {
            if (!_contextCaptureActive) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                stopContextCaptureMode();
                showContextCaptureToast('Context capture cancelled.', false);
            }
        };

        document.addEventListener('click', clickHandler, true);
        document.addEventListener('keydown', keydownHandler, true);

        _contextCaptureCleanup = function () {
            document.removeEventListener('click', clickHandler, true);
            document.removeEventListener('keydown', keydownHandler, true);
        };
    }

    function setupContextCaptureHotkey() {
        if (!ENABLE_CONTEXT_CAPTURE_HELPER) return;
        if (!IS_TOP_WINDOW || _contextCaptureHotkeyBound) return;

        document.addEventListener('keydown', function (event) {
            if (event.defaultPrevented) return;
            if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;

            var key = event.key ? event.key.toLowerCase() : '';
            if (key !== 'c') return;

            event.preventDefault();
            startContextCaptureMode();
        }, true);

        _contextCaptureHotkeyBound = true;
    }

    function triggerContextCaptureFromButton(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
        }
        // Delay activation so the initiating button event is never treated as capture target.
        setTimeout(startContextCaptureMode, 0);
    }

    function insertContextCaptureFloatingHelper() {
        if (!ENABLE_CONTEXT_CAPTURE_HELPER) return;
        if (!IS_TOP_WINDOW) return;
        if (!document.body) return;
        if (document.querySelector('#dtu-context-capture-floating-btn')) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'dtu-context-capture-floating-btn';
        btn.setAttribute('data-dtu-ext', '1');
        btn.title = 'Capture Context (Alt+Shift+C)';
        btn.textContent = 'Capture';
        btn.style.cssText = darkModeEnabled
            ? 'position: fixed; right: 14px; bottom: 54px; z-index: 2147483646; '
            + 'background: #2d2d2d; color: #66b3ff; border: 1px solid #4f5f74; border-radius: 6px; '
            + 'cursor: pointer; font-size: 12px; padding: 6px 10px;'
            : 'position: fixed; right: 14px; bottom: 54px; z-index: 2147483646; '
            + 'background: #ffffff; color: #0b67c2; border: 1px solid #c8d0db; border-radius: 6px; '
            + 'cursor: pointer; font-size: 12px; padding: 6px 10px;';
        // Prevent host-page global button rules from turning this into a full-width bar.
        btn.style.setProperty('position', 'fixed', 'important');
        btn.style.setProperty('right', '14px', 'important');
        btn.style.setProperty('bottom', '54px', 'important');
        btn.style.setProperty('left', 'auto', 'important');
        btn.style.setProperty('top', 'auto', 'important');
        btn.style.setProperty('display', 'inline-flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('width', 'auto', 'important');
        btn.style.setProperty('max-width', '160px', 'important');
        btn.style.setProperty('min-width', '0', 'important');
        btn.style.setProperty('margin', '0', 'important');
        btn.style.setProperty('float', 'none', 'important');
        btn.style.setProperty('white-space', 'nowrap', 'important');
        btn.style.setProperty('pointer-events', 'auto', 'important');
        btn.style.setProperty('user-select', 'none', 'important');

        // Use multiple triggers because CampusNet click handlers sometimes swallow button clicks.
        btn.addEventListener('pointerdown', triggerContextCaptureFromButton, true);
        btn.addEventListener('click', triggerContextCaptureFromButton, true);

        document.body.appendChild(btn);
    }

    function insertContextCaptureHelper() {
        if (!ENABLE_CONTEXT_CAPTURE_HELPER) return;
        if (!IS_TOP_WINDOW) return;
        if (document.querySelector('#dtu-context-capture-btn')
            || document.querySelector('#dtu-context-capture-floating-btn')) return;

        // Preferred placement on DTU Learn homepage admin tools.
        if (!isDTULearnHomepage()) {
            insertContextCaptureFloatingHelper();
            return;
        }

        const placeholder = getAdminToolsPlaceholder();
        if (!placeholder) {
            insertContextCaptureFloatingHelper();
            return;
        }

        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });

        if (!targetList) {
            insertContextCaptureFloatingHelper();
            return;
        }

        const li = document.createElement('li');
        li.setAttribute('data-dtu-ext', '1');
        li.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'dtu-context-capture-btn';
        btn.setAttribute('data-dtu-ext', '1');
        btn.style.cssText = darkModeEnabled
            ? 'background: #2d2d2d; color: #66b3ff; border: 1px solid #4f5f74; border-radius: 4px; '
            + 'cursor: pointer; font-size: 12px; padding: 3px 8px;'
            : 'background: #ffffff; color: #0b67c2; border: 1px solid #c8d0db; border-radius: 4px; '
            + 'cursor: pointer; font-size: 12px; padding: 3px 8px;';
        btn.textContent = 'Capture Context';
        btn.addEventListener('pointerdown', triggerContextCaptureFromButton, true);
        btn.addEventListener('click', triggerContextCaptureFromButton, true);

        const hotkeyHint = document.createElement('span');
        hotkeyHint.setAttribute('data-dtu-ext', '1');
        hotkeyHint.style.cssText = darkModeEnabled
            ? 'font-size: 11px; color: #9aa7b8;'
            : 'font-size: 11px; color: #6b7280;';
        hotkeyHint.textContent = 'Alt+Shift+C';

        li.appendChild(btn);
        li.appendChild(hotkeyHint);
        targetList.appendChild(li);
    }

    // ===== FIRST-TIME ONBOARDING HINT =====
    // Show a hint pointing to the gear icon for the first 3 homepage visits
    function showOnboardingHint() {
        if (!IS_TOP_WINDOW) return;
        // Only show on DTU Learn homepage where the gear icon lives
        if (!isDTULearnHomepage()) return;

        var HINT_COUNT_KEY = 'dtuDarkModeHintCount';
        var hintCount = parseInt(localStorage.getItem(HINT_COUNT_KEY) || '0', 10);
        if (hintCount >= 3) return;

        // Find the gear button before incrementing counter
        var gearBtn = document.querySelector('button[aria-label="Admin Tools"]');
        if (!gearBtn) {
            // Fallback: search shadow DOM for the gear icon
            function findGearIcon(root) {
                if (!root) return null;
                var icon = root.querySelector('d2l-icon[icon="tier3:gear"]');
                if (icon) return icon;
                var els = root.querySelectorAll('*');
                for (var i = 0; i < els.length; i++) {
                    if (els[i].shadowRoot) {
                        var found = findGearIcon(els[i].shadowRoot);
                        if (found) return found;
                    }
                }
                return null;
            }
            gearBtn = findGearIcon(document);
        }
        if (!gearBtn) return;

        // Only increment after we confirmed we can actually show the hint
        localStorage.setItem(HINT_COUNT_KEY, (hintCount + 1).toString());

        // Get gear button position
        var gearRect = gearBtn.getBoundingClientRect();
        if (gearRect.width === 0) return; // not visible yet

        // Arrow should point to the center of the gear button
        var bubbleWidth = 240;
        var gearCenterX = gearRect.left + gearRect.width / 2;
        var bubbleLeft = gearCenterX - bubbleWidth / 2;
        // Keep bubble on screen
        if (bubbleLeft < 8) bubbleLeft = 8;
        if (bubbleLeft + bubbleWidth > window.innerWidth - 8) bubbleLeft = window.innerWidth - bubbleWidth - 8;
        var arrowLeft = gearCenterX - bubbleLeft;

        // Create the hint bubble
        var bubble = document.createElement('div');
        bubble.id = 'dtu-dark-hint';
        var outer = document.createElement('div');
        outer.id = 'dtu-dark-hint-inner';
        Object.assign(outer.style, {
            position: 'fixed',
            top: (gearRect.bottom + 12) + 'px',
            left: bubbleLeft + 'px',
            zIndex: '999999',
            pointerEvents: 'auto'
        });

        var card = document.createElement('div');
        Object.assign(card.style, {
            position: 'relative',
            background: 'linear-gradient(135deg, var(--dtu-ad-accent), var(--dtu-ad-accent-deep))',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '10px',
            fontFamily: "'Segoe UI', sans-serif",
            fontSize: '13px',
            lineHeight: '1.4',
            width: bubbleWidth + 'px',
            boxSizing: 'border-box',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            animation: 'dtuHintBounce 2s ease-in-out infinite'
        });

        var arrow = document.createElement('div');
        Object.assign(arrow.style, {
            position: 'absolute',
            top: '-8px',
            left: (arrowLeft - 8) + 'px',
            width: '0',
            height: '0',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid var(--dtu-ad-accent)'
        });

        var title = document.createElement('span');
        Object.assign(title.style, { fontWeight: 'bold', fontSize: '14px' });
        title.textContent = '\u2699 DTU After Dark';

        var desc = document.createElement('span');
        desc.style.opacity = '0.9';
        desc.textContent = 'Click the gear or "Settings" in the nav bar to customize your experience!';

        var visitNote = document.createElement('div');
        Object.assign(visitNote.style, { marginTop: '6px', fontSize: '11px', opacity: '0.7', textAlign: 'right' });
        visitNote.textContent = 'click to dismiss (' + (3 - hintCount - 1) + ' more)';
        if (hintCount + 1 >= 3) visitNote.textContent = 'click to dismiss';

        card.appendChild(arrow);
        card.appendChild(title);
        card.appendChild(document.createElement('br'));
        card.appendChild(desc);
        card.appendChild(visitNote);
        outer.appendChild(card);
        bubble.appendChild(outer);

        // Add bounce animation
        if (!document.querySelector('#dtu-hint-bounce-style')) {
            var style = document.createElement('style');
            style.id = 'dtu-hint-bounce-style';
            style.textContent = '@keyframes dtuHintBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }';
            document.head.appendChild(style);
        }
        document.body.appendChild(bubble);

        // Dismiss on click (for this visit only, will reappear until 3 visits)
        function dismissBubble() {
            bubble.style.transition = 'opacity 0.3s';
            bubble.style.opacity = '0';
            setTimeout(function () { bubble.remove(); }, 300);
        }
        bubble.addEventListener('click', dismissBubble);

        // Auto-dismiss after 15 seconds
        setTimeout(function () {
            if (document.querySelector('#dtu-dark-hint')) dismissBubble();
        }, 15000);
    }

    // showOnboardingHint is called from unified load handler below

    // ===== TYPEBOX PRESERVATION (kurser.dtu.dk, studieplan.dtu.dk, etc.) =====
    // Preserve custom colors on .typebox elements by reapplying inline styles with !important
    function preserveSingleTypeboxColor(typebox) {
        if (!typebox || !typebox.getAttribute || !typebox.style) return;
        var inlineStyle = typebox.getAttribute('style');
        if (!inlineStyle) return;
        var match = inlineStyle.match(/background-color:\s*([^;]+)/i);
        if (!match || !match[1]) return;
        var bgColor = match[1].trim();
        typebox.style.setProperty('background-color', bgColor, 'important');
    }

    function preserveTypeboxColors(root) {
        var scope = (root && root.nodeType === 1) ? root : document;
        if (!scope || !scope.querySelectorAll) return;
        if (scope.matches && scope.matches('.typebox')) {
            preserveSingleTypeboxColor(scope);
        }
        scope.querySelectorAll('.typebox').forEach(function (typebox) {
            preserveSingleTypeboxColor(typebox);
        });
    }

    // Run typebox preservation (dark mode only)
    if (darkModeEnabled) preserveTypeboxColors();

    // ===== CAMPUSNET GPA CALCULATION (campusnet.dtu.dk) =====
    // Calculate weighted GPA from the grades table and insert a summary row
    function insertGPARow() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_CAMPUSNET_GPA_TOOLS_KEY)) {
            const table = document.querySelector('table.gradesList');
            if (table) {
                const existing = table.querySelector('.gpa-row');
                if (existing) existing.remove();
                const projected = table.querySelector('.gpa-projected-row');
                if (projected) projected.remove();
            }
            return;
        }
        const table = document.querySelector('table.gradesList');
        if (!table || table.querySelector('.gpa-row')) return;

        const rows = table.querySelectorAll('tr:not(.gradesListHeader)');
        let totalWeighted = 0;
        let totalECTS = 0;

        rows.forEach(row => {
            if (row.classList.contains('gpa-sim-row') || row.classList.contains('gpa-sim-add-row')) return;
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;

            const gradeSpan = cells[2].querySelector('span');
            if (!gradeSpan) return;

            const gradeText = gradeSpan.textContent.trim();
            const gradeMatch = gradeText.match(/^(-?\d+)/);
            if (!gradeMatch) return; // Skip pass/fail (e.g. "BE (P)")

            const grade = parseInt(gradeMatch[1], 10);
            const ects = parseFloat(cells[3].textContent.trim());
            if (isNaN(ects) || ects <= 0) return;

            totalWeighted += grade * ects;
            totalECTS += ects;
        });

        if (totalECTS === 0) return;

        const gpa = totalWeighted / totalECTS;

        const headerRow = table.querySelector('tr.gradesListHeader');
        if (!headerRow) return;

        const gpaRow = document.createElement('tr');
        gpaRow.className = 'gpa-row';
        gpaRow.setAttribute('data-dtu-ext', '1');

        const tdLabel = document.createElement('td');
        tdLabel.setAttribute('data-dtu-ext', '1');
        tdLabel.colSpan = 2;
        tdLabel.style.cssText = 'text-align: left; font-weight: bold; padding: 8px 0;';
        tdLabel.style.setProperty('padding-left', '5px', 'important');
        tdLabel.style.setProperty('padding-right', '0', 'important');
        tdLabel.textContent = 'Weighted GPA';

        const tdGrade = document.createElement('td');
        tdGrade.setAttribute('data-dtu-ext', '1');
        tdGrade.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold; white-space: nowrap;';
        tdGrade.textContent = gpa.toFixed(2);

        const tdECTS = document.createElement('td');
        tdECTS.setAttribute('data-dtu-ext', '1');
        tdECTS.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold;';
        tdECTS.textContent = totalECTS;

        const tdDate = document.createElement('td');
        tdDate.setAttribute('data-dtu-ext', '1');

        gpaRow.appendChild(tdLabel);
        gpaRow.appendChild(tdGrade);
        gpaRow.appendChild(tdECTS);
        gpaRow.appendChild(tdDate);

        // Insert at the bottom of the table
        const lastRow = table.querySelector('tr:last-child');
        if (lastRow) {
            lastRow.after(gpaRow);
        } else {
            table.appendChild(gpaRow);
        }
    }

    // Run GPA insertion only on the CampusNet Grades page
    if (window.location.hostname === 'campusnet.dtu.dk' && /\/cnnet\/Grades\//i.test(window.location.pathname)) {
        insertGPARow();
    }

    // ===== CAMPUSNET ECTS PROGRESS BAR (campusnet.dtu.dk) =====
    // Show a visual progress bar of earned ECTS above the grades table
    function insertECTSProgressBar() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_CAMPUSNET_GPA_TOOLS_KEY)) {
            const existing = document.querySelector('.ects-progress-container');
            if (existing) existing.remove();
            return;
        }
        const table = document.querySelector('table.gradesList');
        if (!table) return;

        const existing = document.querySelector('.ects-progress-container');
        if (existing) {
            const accentFill = darkModeEnabled ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
            const barFill = existing.querySelector('.ects-bar-fill');
            if (barFill && barFill.style) {
                barFill.style.setProperty('background', accentFill, 'important');
                barFill.style.setProperty('background-color', accentFill, 'important');
                barFill.style.setProperty('background-image', 'none', 'important');
                barFill.removeAttribute('data-bar-color');
            }
            return;
        }

        const rows = table.querySelectorAll('tr:not(.gradesListHeader)');
        let passedECTS = 0;

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;

            const gradeSpan = cells[2].querySelector('span');
            if (!gradeSpan) return;

            const gradeText = gradeSpan.textContent.trim();
            const ects = parseFloat(cells[3].textContent.trim());
            if (isNaN(ects) || ects <= 0) return;

            // Check if passed: numeric grade >= 2, or "BE" (BestÃ¥et/Pass)
            const numMatch = gradeText.match(/^(-?\d+)/);
            if (numMatch) {
                if (parseInt(numMatch[1], 10) >= 2) passedECTS += ects;
            } else if (/^BE\b/i.test(gradeText)) {
                passedECTS += ects;
            }
        });

        if (passedECTS === 0) return;

        // Target: 180 ECTS for BSc, then 120 ECTS for MSc (300 total)
        const inMasters = passedECTS > 180;
        const target = inMasters ? 300 : 180;
        const pct = Math.min((passedECTS / target) * 100, 100);
        const mscECTS = inMasters ? passedECTS - 180 : 0;
        const targetLabel = inMasters
            ? 'BSc done \u00B7 MSc ' + mscECTS + ' / 120 ECTS'
            : 'BSc (' + passedECTS + ' / 180 ECTS)';

        const container = document.createElement('div');
        container.className = 'ects-progress-container';
        container.setAttribute('data-dtu-ext', '1');
        container.style.cssText = darkModeEnabled
            ? 'margin: 12px 0 16px 0; padding: 10px 12px; background: #2d2d2d; border-radius: 6px;'
            : 'margin: 12px 0 16px 0; padding: 10px 12px; background: #ffffff; border-radius: 6px; border: 1px solid #ddd;';

        const label = document.createElement('div');
        label.setAttribute('data-dtu-ext', '1');
        label.style.cssText = darkModeEnabled
            ? 'display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #e0e0e0;'
            : 'display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #333;';
        label.textContent = '';

        const labelLeft = document.createElement('span');
        labelLeft.setAttribute('data-dtu-ext', '1');
        labelLeft.style.fontWeight = 'bold';
        labelLeft.textContent = passedECTS + ' ECTS earned';

        const labelRight = document.createElement('span');
        labelRight.setAttribute('data-dtu-ext', '1');
        labelRight.style.color = darkModeEnabled ? '#b0b0b0' : '#666';
        labelRight.textContent = targetLabel;

        label.appendChild(labelLeft);
        label.appendChild(labelRight);

        const barBg = document.createElement('div');
        barBg.className = 'ects-bar-bg';
        barBg.setAttribute('data-dtu-ext', '1');
        barBg.style.cssText = 'width: 100%; height: 18px; border-radius: 9px; overflow: hidden; position: relative;';
        barBg.style.setProperty('background', darkModeEnabled ? '#1a1a1a' : '#e0e0e0', 'important');
        barBg.style.setProperty('background-color', darkModeEnabled ? '#1a1a1a' : '#e0e0e0', 'important');

        const barFill = document.createElement('div');
        barFill.className = 'ects-bar-fill';
        barFill.setAttribute('data-dtu-ext', '1');
        const barColor = darkModeEnabled ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
        barFill.style.cssText = 'height: 100%; border-radius: 9px; transition: width 0.3s; width: ' + pct + '%;';
        barFill.style.setProperty('background', barColor, 'important');
        barFill.style.setProperty('background-color', barColor, 'important');

        const pctLabel = document.createElement('div');
        pctLabel.className = 'ects-bar-pct';
        pctLabel.setAttribute('data-dtu-ext', '1');
        pctLabel.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.5);';
        pctLabel.style.setProperty('color', '#ffffff', 'important');
        pctLabel.style.setProperty('background', 'transparent', 'important');
        pctLabel.textContent = Math.round(pct) + '%';

        barBg.appendChild(barFill);
        barBg.appendChild(pctLabel);
        container.appendChild(label);
        container.appendChild(barBg);

        // Insert above the grades table
        table.parentNode.insertBefore(container, table);
    }

    // Run ECTS progress bar only on the CampusNet Grades page
    if (window.location.hostname === 'campusnet.dtu.dk' && /\/cnnet\/Grades\//i.test(window.location.pathname)) {
        insertECTSProgressBar();
    }

    // ===== CAMPUSNET GPA SIMULATOR (campusnet.dtu.dk) =====
    // Adds hypothetical grade rows to the grades table so users can simulate future GPA

    const DANISH_GRADES = [12, 10, 7, 4, 2, 0, -3];

    function syncGpaSimulatorDisclaimer(table) {
        if (!table) return;
        var addRow = table.querySelector('.gpa-sim-add-row');
        if (!addRow) return;

        var disclaimerRow = table.querySelector('.gpa-sim-disclaimer-row');
        if (!disclaimerRow) {
            disclaimerRow = document.createElement('tr');
            disclaimerRow.className = 'gpa-sim-disclaimer-row';
            disclaimerRow.setAttribute('data-dtu-ext', '1');

            var td = document.createElement('td');
            td.colSpan = 5;
            td.setAttribute('data-dtu-ext', '1');
            td.style.cssText = 'text-align:right;padding:4px 6px 2px;font-size:10px;';
            td.style.setProperty('color', darkModeEnabled ? '#9aa1aa' : '#6b7280', 'important');
            td.textContent = 'Hypothetical GPA is an estimate. Always verify official grades/GPA in DTU systems.';
            disclaimerRow.appendChild(td);
        }

        var simRows = table.querySelectorAll('.gpa-sim-row');
        var anchor = simRows.length ? simRows[simRows.length - 1] : addRow;
        if (anchor && anchor.parentNode && disclaimerRow.previousElementSibling !== anchor) {
            anchor.after(disclaimerRow);
        }
    }

    function saveSimEntries() {
        const rows = document.querySelectorAll('.gpa-sim-row');
        const entries = [];
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 5) return;
            const codeInput = cells[0].querySelector('input');
            const nameInput = cells[1].querySelector('input');
            const gradeSelect = cells[2].querySelector('select');
            const ectsInput = cells[3].querySelector('input');
            if (!gradeSelect || !ectsInput) return;
            entries.push({
                code: codeInput ? codeInput.value : '',
                name: nameInput ? nameInput.value : '',
                grade: parseInt(gradeSelect.value, 10),
                ects: parseFloat(ectsInput.value) || 5
            });
        });
        localStorage.setItem('gpaSimEntries', JSON.stringify(entries));
    }

    function updateProjectedGPA() {
        const table = document.querySelector('table.gradesList');
        if (!table) return;

        // Read actual grades (same logic as insertGPARow)
        const rows = table.querySelectorAll('tr:not(.gradesListHeader)');
        let actualWeighted = 0;
        let actualECTS = 0;
        rows.forEach(row => {
            if (row.classList.contains('gpa-sim-row') || row.classList.contains('gpa-sim-add-row')
                || row.classList.contains('gpa-row') || row.classList.contains('gpa-projected-row')) return;
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;
            const gradeSpan = cells[2].querySelector('span');
            if (!gradeSpan) return;
            const gradeText = gradeSpan.textContent.trim();
            const gradeMatch = gradeText.match(/^(-?\d+)/);
            if (!gradeMatch) return;
            const grade = parseInt(gradeMatch[1], 10);
            const ects = parseFloat(cells[3].textContent.trim());
            if (isNaN(ects) || ects <= 0) return;
            actualWeighted += grade * ects;
            actualECTS += ects;
        });

        // Read simulated entries
        let simWeighted = 0;
        let simECTS = 0;
        const simRows = table.querySelectorAll('.gpa-sim-row');
        simRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;
            const gradeSelect = cells[2].querySelector('select');
            const ectsInput = cells[3].querySelector('input');
            if (!gradeSelect || !ectsInput) return;
            const grade = parseInt(gradeSelect.value, 10);
            const ects = parseFloat(ectsInput.value);
            if (isNaN(ects) || ects <= 0) return;
            simWeighted += grade * ects;
            simECTS += ects;
        });

        // Remove existing projected row
        const existingProjected = table.querySelector('.gpa-projected-row');
        if (existingProjected) existingProjected.remove();

        // Keep disclaimer visible even when no hypothetical rows exist.
        syncGpaSimulatorDisclaimer(table);
        // Only show projected row if there are sim entries
        if (simECTS === 0) return;

        const currentGPA = actualECTS > 0 ? actualWeighted / actualECTS : 0;
        const projectedGPA = (actualECTS + simECTS) > 0
            ? (actualWeighted + simWeighted) / (actualECTS + simECTS) : 0;
        const delta = projectedGPA - currentGPA;
        const projectedNeutralTextColor = darkModeEnabled ? '#e0e0e0' : '#1f2937';
        const projectedRowBg = darkModeEnabled ? 'rgba(var(--dtu-ad-accent-rgb), 0.12)' : 'rgba(var(--dtu-ad-accent-rgb), 0.08)';
        const positiveDeltaColor = darkModeEnabled ? '#66bb6a' : '#2e7d32';
        const negativeDeltaColor = darkModeEnabled ? '#ef5350' : '#c62828';

        const projRow = document.createElement('tr');
        projRow.className = 'gpa-projected-row';
        projRow.setAttribute('data-dtu-ext', '1');
        projRow.style.setProperty('background', projectedRowBg, 'important');
        projRow.style.setProperty('background-color', projectedRowBg, 'important');
        projRow.style.setProperty('border-top', '1px dashed rgba(var(--dtu-ad-accent-rgb), 0.7)', 'important');

        const tdLabel = document.createElement('td');
        tdLabel.setAttribute('data-dtu-ext', '1');
        tdLabel.colSpan = 2;
        tdLabel.style.cssText = 'text-align: left; font-weight: bold; padding: 8px 0;';
        tdLabel.style.setProperty('padding-left', '5px', 'important');
        tdLabel.style.setProperty('padding-right', '0', 'important');
        tdLabel.style.setProperty('background', projectedRowBg, 'important');
        tdLabel.style.setProperty('background-color', projectedRowBg, 'important');
        tdLabel.style.setProperty('color', projectedNeutralTextColor, 'important');
        tdLabel.textContent = 'Projected GPA';

        const tdGrade = document.createElement('td');
        tdGrade.setAttribute('data-dtu-ext', '1');
        tdGrade.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold; white-space: nowrap;';
        tdGrade.style.setProperty('background', projectedRowBg, 'important');
        tdGrade.style.setProperty('background-color', projectedRowBg, 'important');
        tdGrade.style.setProperty('color', projectedNeutralTextColor, 'important');
        tdGrade.textContent = projectedGPA.toFixed(2);

        const tdECTS = document.createElement('td');
        tdECTS.setAttribute('data-dtu-ext', '1');
        tdECTS.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold;';
        tdECTS.style.setProperty('background', projectedRowBg, 'important');
        tdECTS.style.setProperty('background-color', projectedRowBg, 'important');
        tdECTS.style.setProperty('color', projectedNeutralTextColor, 'important');
        tdECTS.textContent = (actualECTS + simECTS);

        const tdDelta = document.createElement('td');
        tdDelta.setAttribute('data-dtu-ext', '1');
        tdDelta.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold; font-size: 12px;';
        tdDelta.style.setProperty('background', projectedRowBg, 'important');
        tdDelta.style.setProperty('background-color', projectedRowBg, 'important');
        if (delta > 0) {
            tdDelta.style.setProperty('color', positiveDeltaColor, 'important');
            tdDelta.textContent = '+' + delta.toFixed(2);
        } else if (delta < 0) {
            tdDelta.style.setProperty('color', negativeDeltaColor, 'important');
            tdDelta.textContent = delta.toFixed(2);
        } else {
            tdDelta.style.setProperty('color', projectedNeutralTextColor, 'important');
            tdDelta.textContent = '0.00';
        }

        projRow.appendChild(tdLabel);
        projRow.appendChild(tdGrade);
        projRow.appendChild(tdECTS);
        projRow.appendChild(tdDelta);

        // Insert after the GPA row
        const gpaRow = table.querySelector('.gpa-row');
        if (gpaRow) {
            gpaRow.after(projRow);
        } else {
            const lastRow = table.querySelector('tr:last-child');
            if (lastRow) lastRow.after(projRow);
        }
    }

    function createSimRow(entry) {
        const tr = document.createElement('tr');
        tr.className = 'gpa-sim-row';
        tr.setAttribute('data-dtu-ext', '1');
        tr.style.setProperty('border-left', '2px solid rgba(var(--dtu-ad-accent-rgb), 0.55)', 'important');

        // Course code
        const tdCode = document.createElement('td');
        tdCode.setAttribute('data-dtu-ext', '1');
        const codeInput = document.createElement('input');
        codeInput.type = 'text';
        codeInput.className = 'gpa-sim-input';
        codeInput.setAttribute('data-dtu-ext', '1');
        codeInput.placeholder = 'Course num';
        codeInput.value = entry.code || '';
        codeInput.style.cssText = 'width: 96px;';
        codeInput.addEventListener('input', () => { saveSimEntries(); });
        tdCode.appendChild(codeInput);

        // Course name
        const tdName = document.createElement('td');
        tdName.setAttribute('data-dtu-ext', '1');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'gpa-sim-input';
        nameInput.setAttribute('data-dtu-ext', '1');
        nameInput.placeholder = 'Course name';
        nameInput.value = entry.name || '';
        nameInput.style.cssText = 'width: 100%;';
        nameInput.addEventListener('input', () => { saveSimEntries(); });
        tdName.appendChild(nameInput);

        // Grade dropdown
        const tdGrade = document.createElement('td');
        tdGrade.setAttribute('data-dtu-ext', '1');
        tdGrade.style.cssText = 'text-align: right; padding-right: 5px;';
        const gradeSelect = document.createElement('select');
        gradeSelect.className = 'gpa-sim-select';
        gradeSelect.setAttribute('data-dtu-ext', '1');
        DANISH_GRADES.forEach(g => {
            const option = document.createElement('option');
            option.setAttribute('data-dtu-ext', '1');
            option.value = g.toString();
            option.textContent = g === 2 ? '02' : g === 0 ? '00' : g.toString();
            if (g === entry.grade) option.selected = true;
            gradeSelect.appendChild(option);
        });
        gradeSelect.addEventListener('change', () => { saveSimEntries(); updateProjectedGPA(); });
        tdGrade.appendChild(gradeSelect);

        // ECTS
        const tdECTS = document.createElement('td');
        tdECTS.setAttribute('data-dtu-ext', '1');
        tdECTS.style.cssText = 'text-align: right; padding-right: 8px;';
        const ectsInput = document.createElement('input');
        ectsInput.type = 'number';
        ectsInput.className = 'gpa-sim-input';
        ectsInput.setAttribute('data-dtu-ext', '1');
        ectsInput.min = '1';
        ectsInput.max = '60';
        ectsInput.value = entry.ects || 5;
        ectsInput.style.cssText = 'width: 67px; text-align: left; padding-left: 10px; padding-right: 22px; box-sizing: border-box;';
        ectsInput.addEventListener('input', () => { saveSimEntries(); updateProjectedGPA(); });
        tdECTS.appendChild(ectsInput);

        // Delete button
        const tdAction = document.createElement('td');
        tdAction.setAttribute('data-dtu-ext', '1');
        tdAction.style.cssText = 'text-align: right; width: 56px;';
        tdAction.style.setProperty('padding-left', '8px', 'important');
        tdAction.style.setProperty('padding-right', '14px', 'important');
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'gpa-sim-delete-btn';
        delBtn.setAttribute('data-dtu-ext', '1');
        delBtn.textContent = '\u00D7';
        delBtn.title = 'Remove';
        delBtn.style.cssText = 'width: 40px; transform: translateX(5px);';
        delBtn.addEventListener('click', () => {
            tr.remove();
            saveSimEntries();
            updateProjectedGPA();
        });
        tdAction.appendChild(delBtn);

        tr.appendChild(tdCode);
        tr.appendChild(tdName);
        tr.appendChild(tdGrade);
        tr.appendChild(tdECTS);
        tr.appendChild(tdAction);

        return tr;
    }

    function insertGPASimulator() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_CAMPUSNET_GPA_TOOLS_KEY)) {
            document.querySelectorAll('.gpa-sim-row, .gpa-sim-add-row, .gpa-projected-row, .gpa-sim-disclaimer-row').forEach(function (el) {
                el.remove();
            });
            return;
        }
        const table = document.querySelector('table.gradesList');
        if (!table || table.querySelector('.gpa-sim-add-row')) return;

        const headerRow = table.querySelector('tr.gradesListHeader');
        if (!headerRow) return;

        // Load saved entries
        let savedEntries = [];
        try {
            const stored = localStorage.getItem('gpaSimEntries');
            if (stored) savedEntries = JSON.parse(stored);
        } catch (e) { /* ignore parse errors */ }

        // Create the "add" button row first (it goes right after header)
        const addRow = document.createElement('tr');
        addRow.className = 'gpa-sim-add-row';
        addRow.setAttribute('data-dtu-ext', '1');
        const addTd = document.createElement('td');
        addTd.setAttribute('data-dtu-ext', '1');
        addTd.colSpan = 5;
        addTd.style.cssText = 'text-align: left; padding: 6px 0;';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'gpa-sim-add-btn';
        addBtn.setAttribute('data-dtu-ext', '1');
        addBtn.textContent = '+ Add hypothetical grade';
        addBtn.style.setProperty('background', 'rgba(var(--dtu-ad-accent-rgb), 0.12)', 'important');
        addBtn.style.setProperty('background-color', 'rgba(var(--dtu-ad-accent-rgb), 0.12)', 'important');
        addBtn.style.setProperty('color', darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
        addBtn.style.setProperty('border-color', 'rgba(var(--dtu-ad-accent-rgb), 0.55)', 'important');
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            _suppressHeavyWork = true;
            const newEntry = { code: '', name: '', grade: 7, ects: 5 };
            const newRow = createSimRow(newEntry);
            // Insert before the first real grade row (after all sim rows)
            const lastSimRow = table.querySelector('.gpa-sim-row:last-of-type');
            if (lastSimRow) {
                lastSimRow.after(newRow);
            } else {
                addRow.after(newRow);
            }
            saveSimEntries();
            updateProjectedGPA();
            _suppressHeavyWork = false;
        });
        addBtn.addEventListener('mouseenter', function () {
            addBtn.style.setProperty('background-color', 'rgba(var(--dtu-ad-accent-rgb), 0.2)', 'important');
            addBtn.style.setProperty('background', 'rgba(var(--dtu-ad-accent-rgb), 0.2)', 'important');
            addBtn.style.setProperty('border-color', 'rgba(var(--dtu-ad-accent-rgb), 0.8)', 'important');
            addBtn.style.setProperty('color', '#ffffff', 'important');
        });
        addBtn.addEventListener('mouseleave', function () {
            addBtn.style.setProperty('background', 'rgba(var(--dtu-ad-accent-rgb), 0.12)', 'important');
            addBtn.style.setProperty('background-color', 'rgba(var(--dtu-ad-accent-rgb), 0.12)', 'important');
            addBtn.style.setProperty('color', darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
            addBtn.style.setProperty('border-color', 'rgba(var(--dtu-ad-accent-rgb), 0.55)', 'important');
        });
        addTd.appendChild(addBtn);
        addRow.appendChild(addTd);

        // Insert add row after header
        headerRow.after(addRow);

        // Insert saved entries after the add row
        let insertAfter = addRow;
        savedEntries.forEach(entry => {
            const simRow = createSimRow(entry);
            insertAfter.after(simRow);
            insertAfter = simRow;
        });
        syncGpaSimulatorDisclaimer(table);

        // Calculate projected GPA if there are saved entries
        if (savedEntries.length > 0) {
            updateProjectedGPA();
        }
    }

    // Run GPA simulator only on the CampusNet Grades page
    if (window.location.hostname === 'campusnet.dtu.dk' && /\/cnnet\/Grades\//i.test(window.location.pathname)) {
        insertGPASimulator();
    }

    // ===== PARTICIPANT INTELLIGENCE (campusnet.dtu.dk) =====
    // Scrapes participant lists locally to build demographics, shared-history
    // badges, semester-twin detection and retention tracking.
    // All data stays in browser.storage.local -- nothing leaves the browser.
    var _participantIntelLastCollectSig = null;
    var _participantIntelLastCollectTs = 0;
    var _participantIntelAnnotateTimer = null;
    var _participantIntelSemesterTwinLastTs = 0;
    var _participantIntelSemesterTwinCampusnetLastTs = 0;
    var _campusnetSemesterTwinRetryTimer = null;
    var _campusnetSemesterTwinRetryAttempts = 0;
    var _campusnetSemesterTwinRepositionTimer = null;
    var _campusnetSemesterTwinRepositionAttempts = 0;
    var _participantIntelPageSizeAdjustTs = 0;
    var _participantIntelPageSizeAdjustTimer = null;

    function normalizeIntelCourseCode(code) {
        var rawText = String(code || '');
        var m = rawText.match(/\b(\d{5}|KU\d{3})\b/i);
        if (m) return String(m[1]).toUpperCase();

        var raw = rawText.toUpperCase();
        raw = raw.replace(/[\u200B-\u200D\uFEFF]/g, '');
        raw = raw.replace(/\u00A0/g, ' ');
        raw = raw.replace(/[^A-Z0-9]/g, '');
        return raw;
    }

    function normalizeIntelCourseSemester(semester) {
        var raw = String(semester || '').toUpperCase();
        raw = raw.replace(/[\u200B-\u200D\uFEFF]/g, '');
        raw = raw.replace(/\u00A0/g, ' ');
        // First pass: extract a semester token even if extra punctuation/text is present.
        var embedded = raw.match(/([FE])\s*[-_/]?\s*(\d{2}|\d{4})/);
        if (embedded) {
            var embSeason = embedded[1];
            var embYear = parseInt(embedded[2], 10);
            if (!isNaN(embYear)) {
                if (embYear < 100) embYear += 2000;
                return embSeason + embYear;
            }
        }
        raw = raw.replace(/\s+/g, '');
        raw = raw.replace(/[^A-Z0-9]/g, '');
        if (!raw) return '';
        var shortMatch = raw.match(/^([FE])(\d{2})$/);
        if (shortMatch) return shortMatch[1] + '20' + shortMatch[2];
        var longMatch = raw.match(/^([FE])(\d{4})$/);
        if (longMatch) return longMatch[1] + longMatch[2];
        return raw;
    }

    function detectCampusnetSelfSNumberFromHeader() {
        if (window.location.hostname !== 'campusnet.dtu.dk') return '';
        try {
            var root = document.querySelector('header, .header, #header, .masthead') || document.body;
            if (!root) return '';
            var txt = normalizeWhitespace(root.textContent || '');
            var m = txt.match(/\b(s\d{6})\b/i);
            return m ? String(m[1]).toLowerCase() : '';
        } catch (e) {
            return '';
        }
    }

    function dedupeIntelCourseList(courses) {
        if (!Array.isArray(courses)) return { list: [], changed: !!courses };

        var changed = false;
        var list = [];
        var byKey = Object.create(null);

        for (var i = 0; i < courses.length; i++) {
            var c = courses[i];
            var code = normalizeIntelCourseCode(c && c.code);
            if (!code) {
                changed = true;
                continue;
            }
            var semester = normalizeIntelCourseSemester(c && c.semester);
            if (!semester) {
                changed = true;
                continue;
            }

            var key = code + '|' + semester;
            if (byKey[key] === undefined) {
                var entry = { code: code, semester: semester };
                if (c && c.source) entry.source = String(c.source);
                if (c && c.archived) entry.archived = true;
                byKey[key] = list.length;
                list.push(entry);

                if (!c || c.code !== code || c.semester !== semester) changed = true;
                continue;
            }

            changed = true;
            var idx = byKey[key];
            var existing = list[idx];
            // Prefer non-archived evidence if both exist for same course+semester.
            if (existing.archived && !(c && c.archived)) delete existing.archived;

            // Prefer higher-confidence source markers over frontpage/empty entries.
            if (!existing.source && c && c.source) {
                existing.source = String(c.source);
            } else if (
                existing.source === 'frontpage'
                && c && c.source
                && String(c.source) !== 'frontpage'
            ) {
                existing.source = String(c.source);
            }
        }

        return { list: list, changed: changed };
    }

    function dedupeParticipantIntelData(data) {
        if (!data || typeof data !== 'object') return false;
        var changed = false;

        if (!data.students || typeof data.students !== 'object') {
            data.students = {};
            changed = true;
        }

        var keys = Object.keys(data.students);
        for (var i = 0; i < keys.length; i++) {
            var s = data.students[keys[i]];
            if (!s || typeof s !== 'object') {
                data.students[keys[i]] = { name: '', program: '', courses: [], lastSeen: Date.now() };
                changed = true;
                continue;
            }
            var deduped = dedupeIntelCourseList(s.courses || []);
            var filteredCourses = deduped.list.filter(function (c) {
                var code = normalizeIntelCourseCode(c && c.code);
                var nm = '';
                try { nm = data.courseNames ? (data.courseNames[code] || '') : ''; } catch (eN0) { nm = ''; }
                return isCampusnetLikelyAcademicCourse(code, nm, { title: nm });
            });
            if (filteredCourses.length !== deduped.list.length) changed = true;
            if (deduped.changed || !Array.isArray(s.courses) || filteredCourses.length !== deduped.list.length) {
                s.courses = filteredCourses;
                changed = true;
            }
        }

        if (data.self && typeof data.self === 'object') {
            var selfDeduped = dedupeIntelCourseList(data.self.courses || []);
            var filteredSelfCourses = selfDeduped.list.filter(function (c) {
                var code = normalizeIntelCourseCode(c && c.code);
                var nm = '';
                try { nm = data.courseNames ? (data.courseNames[code] || '') : ''; } catch (eN1) { nm = ''; }
                return isCampusnetLikelyAcademicCourse(code, nm, { title: nm });
            });
            if (filteredSelfCourses.length !== selfDeduped.list.length) changed = true;
            if (selfDeduped.changed || !Array.isArray(data.self.courses) || filteredSelfCourses.length !== selfDeduped.list.length) {
                data.self.courses = filteredSelfCourses;
                changed = true;
            }
        }

        return changed;
    }

    function semesterSortValue(semester) {
        var sem = normalizeIntelCourseSemester(semester);
        var m = sem.match(/^([FE])(20\d{2})$/);
        if (!m) return 0;
        var season = m[1];
        var year = parseInt(m[2], 10);
        if (isNaN(year)) return 0;
        return (year * 10) + (season === 'E' ? 2 : 1);
    }

    function collapseCourseEntriesByCode(courses) {
        var normalized = dedupeIntelCourseList(courses || []).list;
        if (!normalized.length) return [];

        var out = [];
        var byCode = Object.create(null);
        for (var i = 0; i < normalized.length; i++) {
            var c = normalized[i];
            var code = normalizeIntelCourseCode(c && c.code);
            if (!code) continue;

            if (byCode[code] === undefined) {
                byCode[code] = out.length;
                out.push(c);
                continue;
            }

            var idx = byCode[code];
            var current = out[idx];
            var curScore = semesterSortValue(current.semester);
            var nextScore = semesterSortValue(c.semester);
            var shouldReplace = false;
            if (nextScore > curScore) shouldReplace = true;
            else if (nextScore === curScore && current.archived && !c.archived) shouldReplace = true;

            if (shouldReplace) out[idx] = c;
        }

        return out;
    }

    function loadParticipantIntel(cb) {
        storageLocalGet({ [PARTICIPANT_INTEL_STORAGE_KEY]: null }, function (result) {
            var data = result[PARTICIPANT_INTEL_STORAGE_KEY];
            if (!data || typeof data !== 'object') {
                data = { self: null, students: {}, retention: {}, courseNames: {}, backfill: { scanned: {}, autoWeekly: false, lastRunTs: 0 } };
            }
            if (!data.students) data.students = {};
            if (!data.retention) data.retention = {};
            if (!data.courseNames) data.courseNames = {};
            if (!data.backfill || typeof data.backfill !== 'object') data.backfill = { scanned: {}, autoWeekly: false, lastRunTs: 0 };
            if (!data.backfill.scanned || typeof data.backfill.scanned !== 'object') data.backfill.scanned = {};
            if (typeof data.backfill.autoWeekly !== 'boolean') data.backfill.autoWeekly = false;
            if (typeof data.backfill.lastRunTs !== 'number') data.backfill.lastRunTs = 0;
            if (dedupeParticipantIntelData(data)) saveParticipantIntel(data);
            cb(data);
        });
    }

    function saveParticipantIntel(data) {
        storageLocalSet({ [PARTICIPANT_INTEL_STORAGE_KEY]: data });
    }

    // One-time migration: clear participant intel corrupted by semester-guessing bug.
    // Remove this block after one release cycle.
    (function clearCorruptedIntel() {
        storageLocalGet({ _intelSemFixApplied3: false }, function (r) {
            if (r._intelSemFixApplied3) return;
            storageLocalSet({ [PARTICIPANT_INTEL_STORAGE_KEY]: null, _intelSemFixApplied3: true });
            console.log('[DTU After Dark] Cleared participant intel (archived-flag fix). Re-scan to rebuild.');
        });
    })();

    // One-time reset requested during semester-twins ranking tuning:
    // clear current participant-intel list so users can rescan from a clean slate.
    (function resetParticipantIntelForRescan() {
        storageLocalGet({ _intelRescanResetApplied1: false }, function (r) {
            if (r._intelRescanResetApplied1) return;
            storageLocalSet({ [PARTICIPANT_INTEL_STORAGE_KEY]: null, _intelRescanResetApplied1: true });
            console.log('[DTU After Dark] Reset participant intel for clean rescan.');
        });
    })();

    function loadSemesterTwinPrefs(cb) {
        storageLocalGet({ [SEMESTER_TWIN_PREFS_KEY]: null }, function (result) {
            var raw = result[SEMESTER_TWIN_PREFS_KEY];
            if (!raw || typeof raw !== 'object') raw = {};
            var limit = parseInt(raw.rowLimit, 10);
            if (limit !== 5 && limit !== 10) limit = 5;
            var scope = (raw.scope === 'all') ? 'all' : 'semester';
            cb({
                hideOwnProgram: raw.hideOwnProgram === true,
                rowLimit: limit,
                scope: scope
            });
        });
    }

    function saveSemesterTwinPrefs(prefs) {
        storageLocalSet({ [SEMESTER_TWIN_PREFS_KEY]: prefs || {} });
    }

    function updateSemesterTwinPrefs(patch, cb) {
        loadSemesterTwinPrefs(function (prev) {
            var next = Object.assign({}, prev || {}, patch || {});
            next.hideOwnProgram = next.hideOwnProgram === true;
            var limit = parseInt(next.rowLimit, 10);
            if (limit !== 5 && limit !== 10) limit = 5;
            next.rowLimit = limit;
            next.scope = (next.scope === 'all') ? 'all' : 'semester';
            saveSemesterTwinPrefs(next);
            if (cb) cb(next);
        });
    }

    // -- Page detection helpers --

    function isCampusnetParticipantPage() {
        return window.location.hostname === 'campusnet.dtu.dk'
            && /\/cnnet\/element\/\d+\/participants/i.test(window.location.pathname);
    }

    function isCampusnetProfilePage() {
        return window.location.hostname === 'campusnet.dtu.dk'
            && /\/cnnet\/participants\/showperson\.aspx/i.test(window.location.pathname);
    }

    function isCampusnetFrontpageDTU() {
        return window.location.hostname === 'campusnet.dtu.dk'
            && /^\/cnnet\/frontpage\/dtu\/?$/i.test(window.location.pathname);
    }

    function isCampusnetGroupArchivePage() {
        return window.location.hostname === 'campusnet.dtu.dk'
            && /^\/cnnet\/grouparchive\/default\/?$/i.test(window.location.pathname);
    }

    function getCurrentDTUSemester() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth(); // 0-11
        if (month >= 1 && month <= 6) return 'F' + year;   // Feb-Jul  (spring)
        if (month >= 7) return 'E' + year;                   // Aug-Dec  (autumn)
        return 'E' + (year - 1);                              // Jan = previous autumn
    }

    function parseDTUSemesterFromText(text) {
        var t = normalizeWhitespace(text);
        if (!t) return null;

        // Standard tokens like "F26", "E25", "F2026", "E2026"
        var m = t.match(/\b([FE])\s*(\d{2}|\d{4})\b/i);
        if (m) {
            var season = (m[1] || '').toUpperCase();
            var year = parseInt(m[2], 10);
            if (isNaN(year)) return null;
            if (year < 100) year += 2000;
            if (year < 2000 || year > 2100) return null;
            return season + year;
        }

        // Month tokens like "Jan 26", "August 24" (map Jan-Jul => spring, Aug-Dec => autumn)
        var m2 = t.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*(\d{2}|\d{4})\b/i);
        if (m2) {
            var mon = (m2[1] || '').toLowerCase().slice(0, 3);
            var year2 = parseInt(m2[2], 10);
            if (isNaN(year2)) return null;
            if (year2 < 100) year2 += 2000;
            if (year2 < 2000 || year2 > 2100) return null;

            var monthIndex = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }[mon];
            if (typeof monthIndex !== 'number') return null;
            return (monthIndex <= 6 ? 'F' : 'E') + year2;
        }

        return null;
    }

    function getCampusnetExplicitSemesterFromPage(rootDoc) {
        var doc = rootDoc || document;
        var candidates = [];

        // Breadcrumb links often contain "... F26" / "... E25"
        try {
            var breadcrumb = doc.querySelector('#breadcrumb, .breadcrumb, nav[aria-label="breadcrumb"]');
            if (breadcrumb) candidates.push(normalizeWhitespace(breadcrumb.textContent));
        } catch (e1) { }

        // Headings / element titles
        try {
            doc.querySelectorAll('h1, h2, .course-title, .element-title').forEach(function (h) {
                var txt = normalizeWhitespace(h.textContent);
                if (txt) candidates.push(txt);
            });
        } catch (e2) { }

        // Page title
        try {
            if (doc.title) candidates.push(normalizeWhitespace(doc.title));
        } catch (e3) { }

        for (var i = 0; i < candidates.length; i++) {
            var sem = parseDTUSemesterFromText(candidates[i]);
            if (sem) return sem;
        }

        return null;
    }

    function getCampusnetSemesterFromPage(rootDoc) {
        // Fallback: use current semester when page doesn't include an explicit semester token.
        return getCampusnetExplicitSemesterFromPage(rootDoc) || getCurrentDTUSemester();
    }

    function getCampusnetCourseCodeFromPage(rootDoc) {
        var doc = rootDoc || document;
        var codeRe = /\b(\d{5}|KU\d{3})\b/i;
        // Try breadcrumb links
        var breadcrumb = doc.querySelector('#breadcrumb, .breadcrumb, nav[aria-label="breadcrumb"]');
        if (breadcrumb) {
            var links = breadcrumb.querySelectorAll('a');
            for (var i = 0; i < links.length; i++) {
                var m = (links[i].textContent || '').match(codeRe);
                if (m) return m[1];
            }
        }
        // Try main heading / course title
        var headings = doc.querySelectorAll('h1, h2, .course-title, .element-title');
        for (var j = 0; j < headings.length; j++) {
            var m2 = (headings[j].textContent || '').match(codeRe);
            if (m2) return m2[1];
        }
        // Try page title
        var titleText = '';
        try { titleText = doc.title || ''; } catch (e0) { titleText = ''; }
        var titleMatch = titleText.match(codeRe);
        if (titleMatch) return titleMatch[1];
        return null;
    }

    function normalizeWhitespace(s) {
        return (s || '').replace(/\s+/g, ' ').trim();
    }

    function isCampusnetNonCourseTitle(text) {
        var t = normalizeWhitespace(text || '').toLowerCase();
        if (!t) return false;

        // Remove common code/semester noise before keyword checks.
        t = t.replace(/\b(?:\d{5}|ku\d{3})\b/gi, ' ');
        t = t.replace(/\b[fe]\s*[-_/]?\s*(?:20)?\d{2}\b/gi, ' ');
        t = t.replace(/\(archived\)/gi, ' ');
        t = normalizeWhitespace(t);
        if (!t) return false;

        // Fold accents so Danish variants (e.g. "øvelse") match reliably.
        var tf = t;
        try {
            tf = tf.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (eNorm) { }

        if (/\b(?:group|groups|gruppe|grupper|team|teams|hold)\b/i.test(tf)) return true;
        if (/\b(?:pcb|frilab|fri\s*lab|free\s*lab)\b/i.test(tf)) return true;
        if (/\bquiz(?:zes)?\b/i.test(tf)) return true;
        if (/\b(?:lab|labs|laboratory|laboratorie|ovelse|eksperiment(?:er)?|experiment(?:s)?)\b/i.test(tf)) return true;
        if (/\b(?:experiment|eksperiment)\s*x\b/i.test(tf)) return true;
        return false;
    }

    function isCampusnetLikelyAcademicCourse(courseCode, courseName, opts) {
        var code = normalizeIntelCourseCode(courseCode);
        if (!/^(?:\d{5}|KU\d{3})$/.test(code)) return false;

        var texts = [];
        if (courseName) texts.push(String(courseName));
        if (opts && opts.title) texts.push(String(opts.title));
        if (opts && opts.linkText) texts.push(String(opts.linkText));

        for (var i = 0; i < texts.length; i++) {
            if (isCampusnetNonCourseTitle(texts[i])) return false;
        }
        return true;
    }

    function getCampusnetCourseNameFromPage(courseCode, rootDoc) {
        var doc = rootDoc || document;
        var code = courseCode || getCampusnetCourseCodeFromPage(doc);
        if (!code) return null;

        function escapeRegExp(s) {
            return (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function cleanCandidate(s) {
            var t = normalizeWhitespace(s);
            if (!t) return '';
            // Strip common suffix/prefix noise.
            t = t.replace(/\b(participants?|deltagere|participant\s*list|deltagerliste)\b/ig, '').trim();
            t = t.replace(/\s*[\|\-:]\s*$/g, '').trim();
            return t;
        }

        var candidates = [];

        // Breadcrumb links often contain "02105 Course name"
        var breadcrumb = doc.querySelector('#breadcrumb, .breadcrumb, nav[aria-label="breadcrumb"]');
        if (breadcrumb) {
            breadcrumb.querySelectorAll('a, span').forEach(function (n) {
                var txt = cleanCandidate(n.textContent);
                if (txt) candidates.push(txt);
            });
        }

        // Headings / element titles
        doc.querySelectorAll('h1, h2, .course-title, .element-title').forEach(function (h) {
            var txt = cleanCandidate(h.textContent);
            if (txt) candidates.push(txt);
        });

        // Page title
        try {
            if (doc.title) candidates.push(cleanCandidate(doc.title));
        } catch (e0) { }

        var codeEsc = escapeRegExp(code);
        var codeRe = new RegExp('\\b' + codeEsc + '\\b');
        for (var i = 0; i < candidates.length; i++) {
            var cand = candidates[i];
            if (!cand) continue;
            if (!codeRe.test(cand)) continue;

            // "02105 - Course Name" or "02105 Course Name"
            var m1 = cand.match(new RegExp('\\b' + codeEsc + '\\b\\s*(?:[-:|\\u2013\\u2014])?\\s*(.+)$'));
            if (m1 && m1[1]) {
                var name1 = cleanCandidate(m1[1]);
                if (name1 && name1.length >= 4 && !/^\d+$/.test(name1)) return name1;
            }

            // "Course Name (02105)"
            var m2 = cand.match(new RegExp('^(.+?)\\s*\\(\\s*' + codeEsc + '\\s*\\)\\s*$'));
            if (m2 && m2[1]) {
                var name2 = cleanCandidate(m2[1]);
                if (name2 && name2.length >= 4 && !/^\d+$/.test(name2)) return name2;
            }
        }

        return null;
    }

    function normalizeProgramLabel(raw) {
        var p = normalizeWhitespace(raw);
        if (!p) return '';
        if (/^g(?:æ|ae)st\s*udl\.?$/i.test(p)) return 'Exchange student';
        return p;
    }

    function getCampusnetParticipantCategoryMeta(labelRegex) {
        if (!labelRegex) return null;
        var headings = document.querySelectorAll('.ui-participant-categorybar h3');
        for (var i = 0; i < headings.length; i++) {
            var txt = normalizeWhitespace(headings[i].textContent);
            if (!labelRegex.test(txt)) continue;

            var m = txt.match(/\((\d+)\)/);
            var count = m ? parseInt(m[1], 10) : null;
            return {
                headingEl: headings[i],
                barEl: headings[i].closest('.ui-participant-categorybar'),
                containerEl: headings[i].closest('.ui-participants-list-category'),
                count: isNaN(count) ? null : count
            };
        }
        return null;
    }

    function getCampusnetUsersCategoryMeta() {
        // CampusNet labels this section "Users (N)" (sometimes localized).
        return getCampusnetParticipantCategoryMeta(/^(Users|Brugere)\b/i);
    }

    function getCampusnetUsersCountFromPage() {
        var meta = getCampusnetUsersCategoryMeta();
        return meta ? meta.count : null;
    }

    function getCampusnetUsersAnchorElement() {
        var meta = getCampusnetUsersCategoryMeta();
        if (!meta) return document.querySelector('.ui-participants-list-category');
        return meta.containerEl || meta.barEl || meta.headingEl;
    }

    function getCampusnetParticipantsListRoot() {
        var root = document.querySelector('.ui-participants-list');
        if (root) return root;
        var firstCategory = document.querySelector('.ui-participants-list-category');
        if (firstCategory && firstCategory.parentNode) return firstCategory.parentNode;
        var firstBar = document.querySelector('.ui-participant-categorybar');
        if (firstBar && firstBar.parentNode) return firstBar.parentNode;
        return null;
    }

    function getCampusnetUsersParticipantElements() {
        var meta = getCampusnetUsersCategoryMeta();
        if (meta && meta.containerEl) {
            var within = Array.from(meta.containerEl.querySelectorAll('.ui-participant'));
            if (within.length) return within;
        }

        var bar = meta ? meta.barEl : null;
        if (bar) {
            var items = [];
            var seen = new Set();
            var node = bar.nextElementSibling;
            var guard = 0;
            while (node && guard < 6000) {
                guard++;
                if (node.classList && node.classList.contains('ui-participant-categorybar')) break;

                if (node.classList && node.classList.contains('ui-participant')) {
                    if (!seen.has(node)) { seen.add(node); items.push(node); }
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('.ui-participant').forEach(function (p) {
                        if (!seen.has(p)) { seen.add(p); items.push(p); }
                    });
                }
                node = node.nextElementSibling;
            }
            if (items.length) return items;
        }

        // Fallback (should be rare): parse what we can from the current DOM.
        return Array.from(document.querySelectorAll('.ui-participant'));
    }

    function ensureCampusnetParticipantsPageSizeMax() {
        if (!isCampusnetParticipantPage()) return false;
        var ss = null;
        try { ss = sessionStorage; } catch (e) { ss = null; }
        if (!ss) return false;

        var key = 'dtuAfterDarkParticipantsPageSizeMaxAttempt:' + window.location.pathname;
        var now = Date.now();
        var lastAttempt = parseInt(ss.getItem(key) || '0', 10);
        if (lastAttempt && (now - lastAttempt) < 8000) return false;

        var selects = document.querySelectorAll('select');
        for (var i = 0; i < selects.length; i++) {
            var sel = selects[i];
            if (!sel || !sel.options || sel.options.length < 4) continue;

            var nums = [];
            for (var o = 0; o < sel.options.length; o++) {
                var raw = sel.options[o].value || sel.options[o].textContent;
                var n = parseInt(raw, 10);
                if (!isNaN(n)) nums.push(n);
            }
            if (!nums.length) continue;

            var max = Math.max.apply(Math, nums);
            if (max < 500) continue;
            if (nums.indexOf(1500) === -1) continue; // strongly hints this is the participants "View" dropdown

            var curRaw = sel.value || (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '');
            var cur = parseInt(curRaw, 10);
            if (!isNaN(cur) && cur >= max) return false;

            // Set to max and trigger the page's refresh handler.
            try { ss.setItem(key, String(now)); } catch (e4) { }
            _participantIntelPageSizeAdjustTs = now;

            for (var oo = 0; oo < sel.options.length; oo++) {
                var opt = sel.options[oo];
                var optNum = parseInt(opt.value || opt.textContent, 10);
                if (optNum === max) {
                    sel.value = opt.value;
                    opt.selected = true;
                    break;
                }
            }

            try {
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {
                try {
                    var evt = document.createEvent('HTMLEvents');
                    evt.initEvent('change', true, false);
                    sel.dispatchEvent(evt);
                } catch (e2) { }
            }

            // Run again after the page updates (avoids requiring a full reload).
            if (!_participantIntelPageSizeAdjustTimer) {
                _participantIntelPageSizeAdjustTimer = setTimeout(function () {
                    _participantIntelPageSizeAdjustTimer = null;
                    try { insertParticipantIntelligence(); } catch (e3) { }
                }, 1600);
            }

            return true;
        }

        return false;
    }

    // -- Participant list parser --

    function parseParticipantList() {
        var participants = [];
        var items = getCampusnetUsersParticipantElements();
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var entry = {};

            // Name + profile link
            var nameEl = item.querySelector('.ui-participant-fullname a');
            if (nameEl) {
                entry.name = normalizeWhitespace(nameEl.textContent);
                var href = nameEl.getAttribute('href') || '';
                var idMatch = href.match(/id=(\d+)/i);
                if (idMatch) entry.userId = idMatch[1];
            }

            // S-number (shown as e.g. "s252710" in the additional info line)
            var infoEl = item.querySelector('.ui-participant-additional.user-information');
            if (infoEl) {
                var sMatch = infoEl.textContent.match(/\b(s\d{6})\b/i);
                if (sMatch) entry.sNumber = sMatch[1].toLowerCase();
            }

            // Education / program -- hidden info box is in the DOM
            var idx = null;
            var arrow = item.querySelector('.ui-participants-arrow');
            if (arrow) {
                var arrowId = arrow.getAttribute('id') || '';
                var idMatch = arrowId.match(/participantarrow(\d+)/i);
                if (idMatch) idx = parseInt(idMatch[1], 10);
                if (idx === null || isNaN(idx)) {
                    var onclick = arrow.getAttribute('onclick') || '';
                    var onMatch = onclick.match(/\((\d+)\)/);
                    if (onMatch) idx = parseInt(onMatch[1], 10);
                }
            }
            if (idx === null || isNaN(idx)) idx = i;

            var infoBox = document.getElementById('participantinformation' + idx);
            if (!infoBox) infoBox = item.nextElementSibling;
            if (!infoBox) {
                // Brute-force: walk siblings
                var sib = item.nextElementSibling;
                while (sib && !sib.classList.contains('ui-participant')) {
                    if (sib.classList.contains('ui-participant-informationbox')) { infoBox = sib; break; }
                    sib = sib.nextElementSibling;
                }
            }
            if (infoBox) {
                var headers = infoBox.querySelectorAll('.info-header span');
                for (var h = 0; h < headers.length; h++) {
                    if (/education|uddannelse/i.test(headers[h].textContent)) {
                        var infoDiv = headers[h].closest('.ui-participant-infobox');
                        if (infoDiv) {
                            var lists = infoDiv.querySelectorAll('.ui-participants-infolist p');
                            if (lists.length) {
                                entry.program = normalizeProgramLabel(lists[0].textContent);
                            } else {
                                // Fallback: grab text after the header div
                                var children = infoDiv.children;
                                for (var c = 0; c < children.length; c++) {
                                    if (!children[c].classList.contains('info-header')) {
                                        var txt = normalizeProgramLabel(children[c].textContent);
                                        if (txt) { entry.program = txt; break; }
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            }

            if (entry.sNumber) participants.push(entry);
        }
        return participants;
    }

    // -- Data collection & self-detection --

    function collectParticipantData() {
        if (!isCampusnetParticipantPage()) return;
        var courseCode = normalizeIntelCourseCode(getCampusnetCourseCodeFromPage());
        var semester = normalizeIntelCourseSemester(getCampusnetSemesterFromPage());
        var courseName = getCampusnetCourseNameFromPage(courseCode);
        var pageTitle = '';
        try { pageTitle = document.title || ''; } catch (e0) { pageTitle = ''; }
        if (!isCampusnetLikelyAcademicCourse(courseCode, courseName, { title: pageTitle })) return;

        var participants = parseParticipantList();
        if (!participants.length) return;

        // Avoid hammering browser.storage.local when observers re-run feature checks.
        var now = Date.now();
        var sig = (courseCode || 'unknown') + '|' + semester + '|' + participants.length
            + '|' + (participants[0] ? participants[0].sNumber : '')
            + '|' + (participants[participants.length - 1] ? participants[participants.length - 1].sNumber : '');
        if (_participantIntelLastCollectSig === sig && (now - _participantIntelLastCollectTs) < 30000) return;
        _participantIntelLastCollectSig = sig;
        _participantIntelLastCollectTs = now;

        loadParticipantIntel(function (intel) {
            if (courseCode && courseName) {
                var existingName = intel.courseNames ? intel.courseNames[courseCode] : null;
                if (!existingName || existingName.length < courseName.length) {
                    intel.courseNames[courseCode] = courseName;
                }
            }

            for (var i = 0; i < participants.length; i++) {
                var p = participants[i];
                if (!p.sNumber) continue;

                if (!intel.students[p.sNumber]) {
                    intel.students[p.sNumber] = { name: p.name || '', program: p.program || '', courses: [], lastSeen: now };
                }
                var student = intel.students[p.sNumber];
                student.name = p.name || student.name;
                if (p.program) student.program = p.program;
                student.lastSeen = now;
                if (!student.courses) student.courses = [];

                if (courseCode) {
                    var alreadyHas = student.courses.some(function (c) { return c.code === courseCode && c.semester === semester; });
                    if (!alreadyHas) student.courses.push({ code: courseCode, semester: semester });
                }
            }

            // Prune oldest if over limit
            var sNumbers = Object.keys(intel.students);
            if (sNumbers.length > PARTICIPANT_INTEL_MAX_STUDENTS) {
                sNumbers.sort(function (a, b) { return intel.students[a].lastSeen - intel.students[b].lastSeen; });
                var toRemove = sNumbers.length - PARTICIPANT_INTEL_MAX_STUDENTS;
                for (var r = 0; r < toRemove; r++) delete intel.students[sNumbers[r]];
            }

            // Self-detection
            detectAndStoreSelf(intel, participants, courseCode, semester);

            saveParticipantIntel(intel);
        });
    }

    function detectAndStoreSelf(intel, participants, courseCode, semester) {
        function normName(s) {
            return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
        }

        if (intel.self && intel.self.sNumber) {
            // Already known -- keep name/program up to date when we can.
            for (var u = 0; u < participants.length; u++) {
                if (participants[u].sNumber === intel.self.sNumber) {
                    if (participants[u].name) intel.self.name = participants[u].name;
                    if (participants[u].program) intel.self.program = participants[u].program;
                    break;
                }
            }

            // Update course history if we can extract a course code on this page.
            if (courseCode) {
                if (!intel.self.courses) intel.self.courses = [];
                var existing = null;
                for (var ex = 0; ex < intel.self.courses.length; ex++) {
                    var ec = intel.self.courses[ex];
                    if (ec && ec.code === courseCode && ec.semester === semester) {
                        existing = ec;
                        break;
                    }
                }
                if (!existing) {
                    intel.self.courses.push({ code: courseCode, semester: semester, source: 'participant' });
                } else {
                    // Upgrade low-confidence frontpage-seeded entries when we have
                    // direct participant-page evidence for the same course/semester.
                    existing.source = 'participant';
                    if (existing.archived) delete existing.archived;
                }
            }
            return;
        }

        // Prefer matching by CampusNet profile ID (robust even if names are formatted differently).
        var myUserId = null;
        try {
            var profileLinks = document.querySelectorAll('a[href*="showperson.aspx"]');
            for (var p = 0; p < profileLinks.length; p++) {
                var a = profileLinks[p];
                if (!a || !a.getAttribute) continue;
                if (a.closest && (a.closest('.ui-participant') || a.closest('.ui-participant-informationbox') || a.closest('[data-dtu-ext]'))) continue;
                var href = a.getAttribute('href') || '';
                var idMatch = href.match(/id=(\d+)/i);
                if (idMatch) { myUserId = idMatch[1]; break; }
            }
        } catch (e0) { }

        if (!myUserId) {
            // Fallback: user avatar in the header often uses /cnnet/userpicture/<id>
            try {
                var imgs = document.querySelectorAll('img[src*="/cnnet/userpicture/"]');
                for (var im = 0; im < imgs.length; im++) {
                    var img = imgs[im];
                    if (!img || !img.getAttribute) continue;
                    if (img.closest && (img.closest('.ui-participant') || img.closest('.ui-participant-informationbox') || img.closest('[data-dtu-ext]'))) continue;
                    var src = img.getAttribute('src') || '';
                    var mImg = src.match(/\/cnnet\/userpicture\/(\d+)/i);
                    if (mImg) { myUserId = mImg[1]; break; }
                }
            } catch (e0b) { }
        }

        if (myUserId) {
            for (var i0 = 0; i0 < participants.length; i0++) {
                if (participants[i0].userId === myUserId && participants[i0].sNumber) {
                    var courses0 = [];
                    if (courseCode) courses0.push({ code: courseCode, semester: semester, source: 'participant' });
                    intel.self = {
                        sNumber: participants[i0].sNumber,
                        name: participants[i0].name || '',
                        program: participants[i0].program || '',
                        courses: courses0
                    };
                    return;
                }
            }
        }

        // Try to extract your s-number from the page header (CampusNet sometimes shows username instead of full name).
        var headerSNumber = null;
        try {
            var headerCandidates = [];
            var c1 = document.querySelector('.user-name, .header__user-name, [data-user-name], .masthead .profile-name');
            if (c1) headerCandidates.push(c1);
            var c2 = document.querySelector('header');
            if (c2) headerCandidates.push(c2);
            var c3 = document.querySelector('.header, #header, .masthead');
            if (c3) headerCandidates.push(c3);
            for (var hc = 0; hc < headerCandidates.length; hc++) {
                var el = headerCandidates[hc];
                if (!el) continue;
                if (el.closest && (el.closest('.ui-participants-list') || el.closest('.ui-participant') || el.closest('.ui-participant-informationbox'))) continue;
                var mS = (el.textContent || '').match(/\b(s\d{6})\b/i);
                if (mS) { headerSNumber = mS[1].toLowerCase(); break; }
            }
        } catch (eHdr) { }

        if (headerSNumber) {
            for (var hs = 0; hs < participants.length; hs++) {
                if (participants[hs].sNumber === headerSNumber) {
                    var coursesH = [];
                    if (courseCode) coursesH.push({ code: courseCode, semester: semester, source: 'participant' });
                    intel.self = {
                        sNumber: headerSNumber,
                        name: participants[hs].name || '',
                        program: participants[hs].program || '',
                        courses: coursesH
                    };
                    return;
                }
            }
            var coursesH2 = [];
            if (courseCode) coursesH2.push({ code: courseCode, semester: semester, source: 'participant' });
            intel.self = { sNumber: headerSNumber, name: '', program: '', courses: coursesH2 };
            return;
        }

        // Try to match header user-name against participant list
        var headerNameEl = document.querySelector('.user-name, .header__user-name, [data-user-name], .masthead .profile-name');
        if (!headerNameEl) {
            // CampusNet often has the name inside the profile dropdown
            var profileLink = null;
            try {
                var links = document.querySelectorAll('a[href*="showperson.aspx"]');
                for (var l = 0; l < links.length; l++) {
                    if (links[l].closest && (links[l].closest('.ui-participant') || links[l].closest('.ui-participant-informationbox'))) continue;
                    profileLink = links[l];
                    break;
                }
            } catch (e1) { }
            if (profileLink) {
                var closest = profileLink.closest('.nav__dropdown--group, .header, header');
                if (closest) headerNameEl = profileLink;
            }
        }
        if (!headerNameEl) return;
        var headerName = normName(headerNameEl.textContent);
        if (!headerName) return;

        for (var i = 0; i < participants.length; i++) {
            if (participants[i].name && normName(participants[i].name) === headerName && participants[i].sNumber) {
                var courses = [];
                if (courseCode) courses.push({ code: courseCode, semester: semester, source: 'participant' });
                intel.self = {
                    sNumber: participants[i].sNumber,
                    name: participants[i].name,
                    program: participants[i].program || '',
                    courses: courses
                };
                return;
            }
        }
    }

    // ---- Feature 1: Room Intelligence (Demographics) ----

    function insertParticipantDemographics() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY) || !isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY)) {
            var old = document.querySelector('[data-dtu-participant-demographics]');
            if (old) old.remove();
            return;
        }
        if (!isCampusnetParticipantPage()) return;

        var participants = parseParticipantList();
        if (!participants.length) return;

        var totalUsers = getCampusnetUsersCountFromPage();
        if (totalUsers && totalUsers < participants.length) totalUsers = participants.length;
        if (!totalUsers) totalUsers = participants.length;

        var programCounts = {};
        var totalWithProgram = 0;
        for (var i = 0; i < participants.length; i++) {
            if (participants[i].program) {
                var key = participants[i].program;
                programCounts[key] = (programCounts[key] || 0) + 1;
                totalWithProgram++;
            }
        }

        var sorted = Object.keys(programCounts).map(function (k) {
            return { program: k, count: programCounts[k] };
        }).sort(function (a, b) { return b.count - a.count; });

        loadParticipantIntel(function (intel) {
            var selfProgram = intel.self ? normalizeProgramLabel(intel.self.program) : null;
            var isOutlier = false;
            if (selfProgram && totalWithProgram > 0) {
                var selfCount = programCounts[selfProgram] || 0;
                isOutlier = (selfCount / totalWithProgram) < 0.10;
            }
            renderDemographicsCard(sorted, totalWithProgram, totalUsers, participants.length, isOutlier, selfProgram);
        });
    }

    function renderDemographicsCard(sorted, totalWithProgram, totalUsers, loadedUsers, isOutlier, selfProgram) {
        var anchor = getCampusnetUsersAnchorElement();
        var listRoot = getCampusnetParticipantsListRoot() || (anchor ? anchor.parentNode : null);
        if (!listRoot) return;
        var isDark = darkModeEnabled;
        var sig = (isDark ? 'd' : 'l') + '|'
            + (selfProgram || '') + '|'
            + (isOutlier ? '1' : '0') + '|'
            + totalWithProgram + '|' + totalUsers + '|' + loadedUsers + '|'
            + sorted.map(function (r) { return r.program + ':' + r.count; }).join('|');

        var card = document.querySelector('[data-dtu-participant-demographics]');
        if (!card) {
            card = document.createElement('div');
            card.setAttribute('data-dtu-participant-demographics', '1');
            markExt(card);
        }

        // Ensure placement (top of participant lists, above Administrators/Authors/Users).
        var insertionAnchor = listRoot.querySelector('.ui-participants-list-category') || listRoot.querySelector('.ui-participant-categorybar');
        if (insertionAnchor && insertionAnchor !== card) {
            if (card.parentNode !== listRoot || card.nextSibling !== insertionAnchor) {
                listRoot.insertBefore(card, insertionAnchor);
            }
        } else {
            if (card.parentNode !== listRoot) {
                listRoot.insertBefore(card, listRoot.firstChild);
            } else if (listRoot.firstChild !== card) {
                listRoot.insertBefore(card, listRoot.firstChild);
            }
        }

        if (card.getAttribute('data-dtu-demographics-sig') === sig) return;
        card.setAttribute('data-dtu-demographics-sig', sig);

        card.style.cssText = 'margin:0 0 16px;padding:14px 16px;border-radius:8px;'
            + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        card.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
        card.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
        card.style.setProperty('border', isDark ? '1px solid #404040' : '1px solid #e0e0e0', 'important');
        card.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');

        while (card.firstChild) card.removeChild(card.firstChild);

        var title = document.createElement('div');
        markExt(title);
        title.textContent = 'Course Composition';
        title.style.cssText = 'font-weight:700;font-size:15px;margin-bottom:10px;';
        title.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
        card.appendChild(title);

        if (isOutlier && selfProgram) {
            var badge = document.createElement('div');
            markExt(badge);
            badge.textContent = 'Outlier Alert -- your program (' + selfProgram + ') is under 10% of this class';
            badge.style.cssText = 'display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;margin-bottom:10px;';
            badge.style.setProperty('background', 'rgba(198,40,40,0.15)', 'important');
            badge.style.setProperty('background-color', 'rgba(198,40,40,0.15)', 'important');
            badge.style.setProperty('color', '#c62828', 'important');
            card.appendChild(badge);
        }

        var palette = isDark
            ? ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#22d3ee', '#fb7185', '#a3e635']
            : ['#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'];
        var paletteIdx = 0;

        var maxBars = 6;
        var otherCount = 0;
        var otherPrograms = [];
        for (var i = 0; i < sorted.length; i++) {
            if (i >= maxBars) { otherCount += sorted[i].count; otherPrograms.push(sorted[i]); continue; }
            var pct = totalWithProgram > 0 ? Math.round(sorted[i].count / totalWithProgram * 100) : 0;
            var isSelf = selfProgram && sorted[i].program === selfProgram;
            // Keep Course Composition bars non-accent for stable chart readability.
            var fill = isSelf ? (isDark ? '#ef5350' : '#c62828') : palette[paletteIdx++ % palette.length];
            card.appendChild(buildDemoBar(sorted[i].program, sorted[i].count, pct, isSelf, isDark, fill, null));
        }
        if (otherCount > 0) {
            var otherPct = totalWithProgram > 0 ? Math.round(otherCount / totalWithProgram * 100) : 0;
            var otherLabel = 'Other' + (otherPrograms.length ? ' (' + otherPrograms.length + ' programs)' : '');
            var stripe = isDark
                ? 'repeating-linear-gradient(135deg, rgba(148,163,184,0.75) 0, rgba(148,163,184,0.75) 6px, rgba(148,163,184,0.30) 6px, rgba(148,163,184,0.30) 12px)'
                : 'repeating-linear-gradient(135deg, rgba(100,116,139,0.55) 0, rgba(100,116,139,0.55) 6px, rgba(100,116,139,0.20) 6px, rgba(100,116,139,0.20) 12px)';
            card.appendChild(buildDemoBar(otherLabel, otherCount, otherPct, false, isDark, stripe, { isOther: true }));

            if (otherPrograms.length) {
                var details = document.createElement('details');
                markExt(details);
                details.style.cssText = 'margin-top:8px;padding-top:8px;';
                details.style.setProperty('border-top', '1px solid ' + (isDark ? '#404040' : '#eee'), 'important');

                var summary = document.createElement('summary');
                markExt(summary);
                var showN = Math.min(10, otherPrograms.length);
                summary.textContent = 'Other breakdown (top ' + showN + ' of ' + otherPrograms.length + ')';
                summary.style.cssText = 'cursor:pointer;font-size:12px;opacity:0.85;user-select:none;';
                summary.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
                details.appendChild(summary);

                var list = document.createElement('div');
                markExt(list);
                list.style.cssText = 'margin-top:8px;display:flex;flex-direction:column;gap:6px;';

                for (var k = 0; k < showN; k++) {
                    var it = otherPrograms[k];
                    var lpct = totalWithProgram > 0 ? Math.round(it.count / totalWithProgram * 100) : 0;

                    var line = document.createElement('div');
                    markExt(line);
                    line.style.cssText = 'display:flex;justify-content:space-between;gap:12px;font-size:12px;line-height:1.25;';

                    var left = document.createElement('span');
                    markExt(left);
                    left.textContent = it.program;
                    left.style.cssText = 'flex:1;min-width:0;white-space:normal;word-break:break-word;opacity:0.9;';

                    var right = document.createElement('span');
                    markExt(right);
                    right.textContent = it.count + ' (' + lpct + '%)';
                    right.style.cssText = 'flex:0 0 auto;white-space:nowrap;opacity:0.75;';

                    line.appendChild(left);
                    line.appendChild(right);
                    list.appendChild(line);
                }

                if (otherPrograms.length > showN) {
                    var more = document.createElement('div');
                    markExt(more);
                    more.textContent = '... and ' + (otherPrograms.length - showN) + ' more';
                    more.style.cssText = 'font-size:11px;opacity:0.6;margin-top:2px;';
                    list.appendChild(more);
                }

                details.appendChild(list);
                card.appendChild(details);
            }
        }

        var footer = document.createElement('div');
        markExt(footer);
        var footerText = totalUsers + ' users';
        if (loadedUsers && loadedUsers !== totalUsers) footerText += ' (showing ' + loadedUsers + ')';
        if (totalWithProgram < loadedUsers) footerText += ' (' + totalWithProgram + ' with program info)';
        footer.textContent = footerText;
        footer.style.cssText = 'font-size:11px;opacity:0.6;margin-top:8px;';
        card.appendChild(footer);
    }

    function buildDemoBar(label, count, pct, isSelf, isDark, fillStyle, meta) {
        var row = document.createElement('div');
        markExt(row);
        row.style.cssText = 'display:grid;grid-template-columns:clamp(220px,38%,440px) 1fr 74px;'
            + 'column-gap:10px;align-items:center;margin:6px 0;';
        if (meta && meta.isOther) {
            row.style.setProperty('opacity', isDark ? '0.92' : '0.95', 'important');
        }

        var lbl = document.createElement('span');
        markExt(lbl);
        lbl.textContent = label;
        lbl.title = label;
        lbl.style.cssText = 'font-size:12px;line-height:1.25;white-space:normal;overflow:visible;word-break:break-word;';
        lbl.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');

        var barBg = document.createElement('div');
        markExt(barBg);
        barBg.style.cssText = 'height:14px;border-radius:3px;overflow:hidden;align-self:center;';
        barBg.style.setProperty('background', isDark ? '#1a1a1a' : '#f0f0f0', 'important');
        barBg.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f0f0f0', 'important');

        var barFill = document.createElement('div');
        markExt(barFill);
        barFill.style.cssText = 'height:100%;border-radius:3px;transition:width .3s;width:' + pct + '%;';
        // Keep Course Composition bars non-accent for stable chart readability.
        var bg = fillStyle || (isSelf ? (isDark ? '#ef5350' : '#c62828') : (isDark ? '#666' : '#999'));
        barFill.style.setProperty('background', bg, 'important');
        if (!/gradient/i.test(bg)) {
            barFill.style.setProperty('background-color', bg, 'important');
        }
        if (meta && meta.isOther) {
            barFill.style.setProperty('opacity', isDark ? '0.7' : '0.75', 'important');
        }
        barBg.appendChild(barFill);

        var countLbl = document.createElement('span');
        markExt(countLbl);
        countLbl.textContent = count + ' (' + pct + '%)';
        countLbl.style.cssText = 'text-align:right;font-size:11px;opacity:0.8;white-space:nowrap;';

        row.appendChild(lbl);
        row.appendChild(barBg);
        row.appendChild(countLbl);
        return row;
    }

    // ---- Feature 2: Semester Twin (DTU Learn dashboard) ----

    function computeCourseProgramStatsForCodes(intel, courseCodes, scope, currentSem) {
        // Build per-course program distribution from collected participant intel.
        // Used to detect "study line specific" courses that heavily correlate with your program.
        var onlyCurrent = (scope === 'semester' && !!currentSem);
        var wanted = {};
        for (var i = 0; i < courseCodes.length; i++) {
            var cc = courseCodes[i];
            if (cc) wanted[cc] = 1;
        }

        var stats = {};
        var students = (intel && intel.students) ? intel.students : {};
        var sNumbers = Object.keys(students || {});
        for (var s = 0; s < sNumbers.length; s++) {
            var student = students[sNumbers[s]];
            if (!student || !student.courses || !student.courses.length) continue;

            var program = normalizeProgramLabel(student.program || '');
            if (!program) continue;

            var seen = {};
            for (var c = 0; c < student.courses.length; c++) {
                var sc = student.courses[c];
                if (!sc || !sc.code) continue;
                if (onlyCurrent && sc.semester !== currentSem) continue;
                var code = normalizeIntelCourseCode(sc.code);
                var cName = '';
                try { cName = intel.courseNames ? (intel.courseNames[code] || '') : ''; } catch (eCN0) { cName = ''; }
                if (!isCampusnetLikelyAcademicCourse(code, cName, { title: cName })) continue;
                if (!wanted[code]) continue;
                if (seen[code]) continue;
                seen[code] = 1;

                if (!stats[code]) stats[code] = { total: 0, byProgram: {} };
                stats[code].total++;
                stats[code].byProgram[program] = (stats[code].byProgram[program] || 0) + 1;
            }
        }

        // Include self (best-effort) so newly collected course sets still get a stable denominator.
        try {
            if (intel && intel.self && intel.self.program && intel.self.courses && intel.self.courses.length) {
                var selfProg = normalizeProgramLabel(intel.self.program || '');
                if (selfProg) {
                    var seenSelf = {};
                    for (var i2 = 0; i2 < intel.self.courses.length; i2++) {
                        var mc = intel.self.courses[i2];
                        if (!mc || !mc.code) continue;
                        if (onlyCurrent && mc.semester !== currentSem) continue;
                        var code2 = normalizeIntelCourseCode(mc.code);
                        var cName2 = '';
                        try { cName2 = intel.courseNames ? (intel.courseNames[code2] || '') : ''; } catch (eCN1) { cName2 = ''; }
                        if (!isCampusnetLikelyAcademicCourse(code2, cName2, { title: cName2 })) continue;
                        if (!wanted[code2]) continue;
                        if (seenSelf[code2]) continue;
                        seenSelf[code2] = 1;

                        if (!stats[code2]) stats[code2] = { total: 0, byProgram: {} };
                        stats[code2].total++;
                        stats[code2].byProgram[selfProg] = (stats[code2].byProgram[selfProg] || 0) + 1;
                    }
                }
            }
        } catch (eSelf) { }

        return stats;
    }

    function detectStudyLineSpecificCourses(intel, selfProgram, myCourseCodes, scope, currentSem) {
        // Heuristic: a course is considered "study line specific" if your program is the top
        // program bucket and makes up a large share of known-program participants for that course.
        // This helps avoid showing previous study-line mates who switched programs.
        var MIN_TOTAL = 25;
        var MIN_SHARE = 0.60;

        var stats = computeCourseProgramStatsForCodes(intel, myCourseCodes, scope, currentSem);
        var set = {};
        var details = {};
        for (var i = 0; i < myCourseCodes.length; i++) {
            var code = myCourseCodes[i];
            if (!code) continue;
            var st = stats[code];
            if (!st || !st.total || st.total < MIN_TOTAL) continue;

            var selfCount = (st.byProgram && st.byProgram[selfProgram]) ? st.byProgram[selfProgram] : 0;
            if (!selfCount) continue;
            var share = selfCount / st.total;
            if (share < MIN_SHARE) continue;

            var max = 0;
            var keys = Object.keys(st.byProgram || {});
            for (var k = 0; k < keys.length; k++) {
                var v = st.byProgram[keys[k]] || 0;
                if (v > max) max = v;
            }
            if (selfCount < max) continue;

            set[code] = 1;
            details[code] = { total: st.total, selfCount: selfCount, share: share };
        }
        return { set: set, details: details, minTotal: MIN_TOTAL, minShare: MIN_SHARE };
    }

    function computeSemesterTwinData(intel, prefs) {
        var rowLimit = (prefs && prefs.rowLimit === 10) ? 10 : 5;
        var scope = (prefs && prefs.scope === 'all') ? 'all' : 'semester';
        var data = {
            twins: [],
            myTotal: 0,
            meta: {
                showingClosest: false,
                includingClosest: false,
                includesLowOverlap: false,
                includesZeroOverlap: false,
                twinCount: 0,
                emptyMessage: '',
                hideOwnProgram: false,
                selfProgram: '',
                courseNames: (intel && intel.courseNames) ? intel.courseNames : {},
                rowLimit: rowLimit,
                scope: scope,
                historyTotal: 0,
                currentTotal: 0,
                currentVerifiedTotal: 0,
                currentSeededTotal: 0,
                myTotalBeforeLineSpecific: 0,
                myTotalAfterLineSpecific: 0,
                lineSpecificCourseCount: 0,
                lineSpecificCourses: [],
                lineSpecificSuppressed: 0,
                lineSpecificNote: ''
            }
        };

        if (!intel || !intel.self || !intel.self.courses || !intel.self.courses.length) {
            data.meta.emptyMessage = 'Semester Twins: could not detect you yet. Open a CampusNet course participant page (Users list) while logged in, then reload this page.';
            return data;
        }

        var selfProgram = normalizeProgramLabel(intel.self.program || '');
        data.meta.selfProgram = selfProgram || '';
        data.meta.hideOwnProgram = !!(prefs && prefs.hideOwnProgram && selfProgram);

        var currentSem = getCurrentDTUSemester();
        var myAllSet = {};
        var myCurrentSet = {};
        var myCurrentWeightByCode = {};
        var myCurrentVerifiedSet = {};
        for (var i = 0; i < intel.self.courses.length; i++) {
            var myc = intel.self.courses[i];
            if (!myc || !myc.code) continue;
            var myCode = normalizeIntelCourseCode(myc.code);
            var myName = '';
            try { myName = intel.courseNames ? (intel.courseNames[myCode] || '') : ''; } catch (eMyNm) { myName = ''; }
            if (!isCampusnetLikelyAcademicCourse(myCode, myName, { title: myName })) continue;

            myAllSet[myCode] = 1;
            if (myc.semester === currentSem && !myc.archived) {
                myCurrentSet[myCode] = 1;
                var src = String(myc.source || '').toLowerCase();
                var hasKnownName = !!(intel.courseNames && intel.courseNames[myCode]);
                // Frontpage seed is useful fallback, but lower-confidence than participant-page evidence.
                // Legacy entries without explicit source are treated as verified only when we know
                // the course from collected participant/course-name data.
                var weight = 1.0;
                var isVerifiedCurrent = false;
                if (src === 'frontpage') {
                    weight = 0.35;
                    isVerifiedCurrent = false;
                } else if (src === 'participant') {
                    weight = 1.0;
                    isVerifiedCurrent = true;
                } else if (!src) {
                    weight = hasKnownName ? 1.0 : 0.55;
                    isVerifiedCurrent = !!hasKnownName;
                } else {
                    weight = 0.85;
                    isVerifiedCurrent = true;
                }
                if (!myCurrentWeightByCode[myCode] || weight > myCurrentWeightByCode[myCode]) {
                    myCurrentWeightByCode[myCode] = weight;
                }
                if (isVerifiedCurrent) {
                    myCurrentVerifiedSet[myCode] = 1;
                }
            }
        }

        // Always keep full-history overlap available, but in "This semester"
        // we rank primarily by current-semester overlap (verified first) and
        // use history as tie-breaker.
        var myCourses = Object.keys(myAllSet);
        myCourses.sort();
        var myCurrentCodes = Object.keys(myCurrentSet);
        myCurrentCodes.sort();
        var myCurrentVerifiedCodes = Object.keys(myCurrentVerifiedSet);
        myCurrentVerifiedCodes.sort();
        var myCurrentWeightTotal = 0;
        for (var mw = 0; mw < myCurrentCodes.length; mw++) {
            myCurrentWeightTotal += (myCurrentWeightByCode[myCurrentCodes[mw]] || 1.0);
        }
        var hasVerifiedCurrent = myCurrentVerifiedCodes.length > 0;
        data.meta.historyTotal = myCourses.length;
        data.meta.currentTotal = myCurrentCodes.length;
        data.meta.currentVerifiedTotal = myCurrentVerifiedCodes.length;
        data.meta.currentSeededTotal = Math.max(0, myCurrentCodes.length - myCurrentVerifiedCodes.length);
        data.meta.myTotalBeforeLineSpecific = myCourses.length;
        data.meta.myTotalAfterLineSpecific = myCourses.length;

        if (!myCourses.length) {
            data.meta.emptyMessage = 'No course history found yet. Visit CampusNet course participant pages (Users list) or scan your course history, then reload this page.';
            return data;
        }
        if (myCourses.length < 2) {
            data.meta.emptyMessage = 'Add at least 2 courses to your history (visit participant pages or scan your course history) to unlock Semester Twins.';
            return data;
        }
        if (scope === 'semester' && !myCurrentCodes.length) {
            data.meta.emptyMessage = 'No current-semester courses found yet. Visit a CampusNet participant page (Users list) for a course you are taking this semester.';
            return data;
        }

        var hideOwnProgram = !!data.meta.hideOwnProgram;
        var myCoursesUsed = myCourses;
        var myTotalUsed = myCoursesUsed.length;
        var lineSpecificSet = null;
        var lineSpecificCodes = [];
        var suppressedByLineSpecific = 0;

        if (hideOwnProgram && selfProgram) {
            // Always detect on full history for consistent filtering.
            var detected = detectStudyLineSpecificCourses(intel, selfProgram, myCourses, 'all', currentSem);
            lineSpecificSet = (detected && detected.set) ? detected.set : null;
            lineSpecificCodes = lineSpecificSet ? Object.keys(lineSpecificSet) : [];
            lineSpecificCodes.sort();
            if (lineSpecificCodes.length) {
                data.meta.lineSpecificCourseCount = lineSpecificCodes.length;
                data.meta.lineSpecificCourses = lineSpecificCodes.slice(0);

                var filtered = myCourses.filter(function (code) { return !lineSpecificSet[code]; });
                if (filtered.length >= 2) {
                    myCoursesUsed = filtered;
                    myTotalUsed = myCoursesUsed.length;
                    data.meta.myTotalAfterLineSpecific = myTotalUsed;
                } else {
                    data.meta.lineSpecificNote = 'Too few courses left after excluding study-line-specific courses.';
                }
            }
        }

        data.myTotal = myTotalUsed;
        var candidates = [];
        var sNumbers = Object.keys(intel.students || {});
        for (var s = 0; s < sNumbers.length; s++) {
            var sNumber = sNumbers[s];
            if (intel.self.sNumber === sNumber) continue;
            var student = intel.students[sNumber];
            if (!student || !student.courses || !student.courses.length) continue;

            // Always build the full course set for each student (for scoring).
            var theirCourseSet = {};
            for (var c = 0; c < student.courses.length; c++) {
                var tc = student.courses[c];
                if (!tc || !tc.code) continue;
                var theirCode = normalizeIntelCourseCode(tc.code);
                var theirName = '';
                try { theirName = intel.courseNames ? (intel.courseNames[theirCode] || '') : ''; } catch (eThNm) { theirName = ''; }
                if (!isCampusnetLikelyAcademicCourse(theirCode, theirName, { title: theirName })) continue;
                theirCourseSet[theirCode] = 1;
            }

            // In "Hide my study line" mode, suppress candidates that share study-line-specific courses.
            if (hideOwnProgram && selfProgram && lineSpecificCodes && lineSpecificCodes.length) {
                var hasLineSpecific = false;
                for (var ls = 0; ls < lineSpecificCodes.length; ls++) {
                    if (theirCourseSet[lineSpecificCodes[ls]]) { hasLineSpecific = true; break; }
                }
                if (hasLineSpecific) {
                    suppressedByLineSpecific++;
                    continue;
                }
            }

            // Compute overlap on the full used course set (history).
            var overlap = [];
            for (var o = 0; o < myCoursesUsed.length; o++) {
                if (theirCourseSet[myCoursesUsed[o]]) overlap.push(myCoursesUsed[o]);
            }

            var program = normalizeProgramLabel(student.program || '');
            if (hideOwnProgram && selfProgram && program && program === selfProgram) continue;

            // For "This semester" scope: require at least 1 shared current-semester course.
            var currentSemOverlap = 0;
            var currentSemWeightedOverlap = 0;
            var currentSemVerifiedOverlap = 0;
            if (scope === 'semester') {
                for (var cs = 0; cs < myCurrentCodes.length; cs++) {
                    var cc = myCurrentCodes[cs];
                    if (theirCourseSet[cc]) {
                        currentSemOverlap++;
                        currentSemWeightedOverlap += (myCurrentWeightByCode[cc] || 1.0);
                        if (myCurrentVerifiedSet[cc]) currentSemVerifiedOverlap++;
                    }
                }
                // If we have verified current courses, require overlap on at least one of those.
                // Otherwise, fall back to any current overlap.
                if (hasVerifiedCurrent) {
                    if (currentSemVerifiedOverlap === 0) continue;
                } else if (currentSemOverlap === 0) {
                    continue;
                }
            }

            var syncScore = overlap.length / myTotalUsed;
            var semesterBlendScore = syncScore;
            if (scope === 'semester') {
                // Strongly prioritize current-semester overlap while still considering history.
                var currentRatio = (myCurrentWeightTotal > 0) ? (currentSemWeightedOverlap / myCurrentWeightTotal) : 0;
                semesterBlendScore = (currentRatio * 0.85) + (syncScore * 0.15);
            }
            candidates.push({
                sNumber: sNumber,
                name: student.name || sNumber,
                program: program,
                syncScore: syncScore,
                semesterBlendScore: semesterBlendScore,
                shared: overlap,
                currentSemOverlap: currentSemOverlap,
                currentSemWeightedOverlap: currentSemWeightedOverlap,
                currentSemVerifiedOverlap: currentSemVerifiedOverlap,
                lastSeen: student.lastSeen || 0
            });
        }

        data.meta.lineSpecificSuppressed = suppressedByLineSpecific;

        if (!candidates.length) {
            if (hideOwnProgram && selfProgram && lineSpecificCodes && lineSpecificCodes.length && suppressedByLineSpecific > 0) {
                data.meta.emptyMessage = 'No matches outside your study line after filtering out study-line-specific overlaps.';
            } else if (scope === 'semester') {
                data.meta.emptyMessage = 'No classmates found in your current-semester courses yet. Visit more participant pages for this semester\'s courses.';
            } else {
                data.meta.emptyMessage = hideOwnProgram
                    ? 'No overlaps outside your study line yet. Visit more CampusNet participant pages to build your course set.'
                    : 'No overlaps yet. Visit more CampusNet participant pages to build your course set.';
            }
            return data;
        }

        candidates.sort(function (a, b) {
            // In "This semester" mode, heavily prioritize current-semester overlap
            // (verified current courses first), then use total history as tie-breaker.
            if (scope === 'semester') {
                var cvA = a.currentSemVerifiedOverlap || 0;
                var cvB = b.currentSemVerifiedOverlap || 0;
                if (cvB !== cvA) return cvB - cvA;

                var cwA = a.currentSemWeightedOverlap || 0;
                var cwB = b.currentSemWeightedOverlap || 0;
                if (cwB !== cwA) return cwB - cwA;

                var csA = a.currentSemOverlap || 0;
                var csB = b.currentSemOverlap || 0;
                if (csB !== csA) return csB - csA;

                if ((b.semesterBlendScore || 0) !== (a.semesterBlendScore || 0)) {
                    return (b.semesterBlendScore || 0) - (a.semesterBlendScore || 0);
                }
            }
            if (b.shared.length !== a.shared.length) return b.shared.length - a.shared.length;
            if (b.syncScore !== a.syncScore) return b.syncScore - a.syncScore;
            if ((b.lastSeen || 0) !== (a.lastSeen || 0)) return (b.lastSeen || 0) - (a.lastSeen || 0);
            return (a.name || '').localeCompare(b.name || '');
        });

        // "Twin" is a high overlap score; for large histories this can be rare, so we always
        // fill the requested list with the closest matches (and finally 0-overlap) instead
        // of only showing the 50%+ set.
        var twins = candidates.filter(function (m) { return m.syncScore >= 0.50 && m.shared && m.shared.length; });
        data.meta.twinCount = twins.length;

        var preferredMinOverlap = (scope === 'all') ? 1 : ((myTotalUsed >= 3) ? 2 : 1);
        var preferred = candidates.filter(function (m) { return (m.shared && m.shared.length >= preferredMinOverlap); });
        var lowOverlap = candidates.filter(function (m) { return (m.shared && m.shared.length > 0 && m.shared.length < preferredMinOverlap); });
        var zeroOverlap = candidates.filter(function (m) { return !(m.shared && m.shared.length); });

        var seen = {};
        var display = [];
        function pushFrom(list) {
            for (var i = 0; i < list.length && display.length < 10; i++) {
                var item = list[i];
                if (!item || !item.sNumber) continue;
                if (seen[item.sNumber]) continue;
                seen[item.sNumber] = 1;
                display.push(item);
            }
        }

        pushFrom(twins);
        pushFrom(preferred);
        pushFrom(lowOverlap);
        pushFrom(zeroOverlap);

        data.meta.includingClosest = twins.length > 0 && display.some(function (m) { return m.syncScore < 0.50; });
        data.meta.includesLowOverlap = display.some(function (m) { return m.shared && m.shared.length > 0 && m.shared.length < preferredMinOverlap; });
        data.meta.includesZeroOverlap = display.some(function (m) { return !(m.shared && m.shared.length); });

        var showingClosest = twins.length === 0;
        data.meta.showingClosest = showingClosest;
        data.twins = display.slice(0, 10);
        return data;
    }

    function removeDTULearnSemesterTwinWidget() {
        document.querySelectorAll('[data-dtu-semester-twin]').forEach(function (el) { el.remove(); });
    }

    function insertSemesterTwinWidget() {
        if (!IS_TOP_WINDOW) return;
        if (!isDTULearnHomepage()) {
            var old = document.querySelector('[data-dtu-semester-twin]');
            if (old) old.remove();
            return;
        }
        var existing = document.querySelector('[data-dtu-semester-twin]');
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY) || !isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY)) {
            if (existing) existing.remove();
            return;
        }

        var now = Date.now();
        if ((now - _participantIntelSemesterTwinLastTs) < 5000) {
            // Keep theme in sync if dark mode toggled, but avoid heavy recomputation.
            if (existing) applySemesterTwinTheme(existing, darkModeEnabled);
            return;
        }
        _participantIntelSemesterTwinLastTs = now;

        loadParticipantIntel(function (intel) {
            loadSemesterTwinPrefs(function (prefs) {
                var computed = computeSemesterTwinData(intel, prefs);
                renderSemesterTwinWidget(computed.twins, computed.myTotal, computed.meta);
            });
        });
    }

    // --- Shared SVG sync ring builder for Semester Twins ---
    function buildSyncRingSVG(pct, size, isDark) {
        var radius = (size - 6) / 2;
        var circ = 2 * Math.PI * radius;
        var dashOffset = circ * (1 - pct / 100);
        var ringColor = pct >= 50 ? 'var(--dtu-ad-accent)' : (isDark ? '#666' : '#aaa');
        var trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

        var ns = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
        svg.style.cssText = 'flex-shrink:0;';

        var track = document.createElementNS(ns, 'circle');
        track.setAttribute('cx', String(size / 2));
        track.setAttribute('cy', String(size / 2));
        track.setAttribute('r', String(radius));
        track.setAttribute('fill', 'none');
        track.setAttribute('stroke', trackColor);
        track.setAttribute('stroke-width', '3');
        svg.appendChild(track);

        var arc = document.createElementNS(ns, 'circle');
        arc.setAttribute('cx', String(size / 2));
        arc.setAttribute('cy', String(size / 2));
        arc.setAttribute('r', String(radius));
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', ringColor);
        arc.setAttribute('stroke-width', '3');
        arc.setAttribute('stroke-linecap', 'round');
        arc.setAttribute('stroke-dasharray', String(circ));
        arc.setAttribute('stroke-dashoffset', String(dashOffset));
        arc.setAttribute('transform', 'rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')');
        svg.appendChild(arc);

        var txt = document.createElementNS(ns, 'text');
        txt.setAttribute('x', '50%');
        txt.setAttribute('y', '50%');
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('dominant-baseline', 'central');
        txt.setAttribute('fill', isDark ? '#e0e0e0' : '#333');
        txt.setAttribute('font-size', String(Math.round(size * 0.26)));
        txt.setAttribute('font-weight', '700');
        txt.textContent = pct + '%';
        svg.appendChild(txt);

        return svg;
    }

    // Strip noise from course titles: remove (archived), (Polytechnical foundation), semester codes like E23/F24, etc.
    function sanitizeCourseLabel(code, rawName) {
        if (!rawName) return code;
        var name = rawName
            .replace(/\s*\(archived\)/gi, '')
            .replace(/\s*\(Polytechnical foundation\)/gi, '')
            .replace(/\s*\(Polyteknisk grundlag\)/gi, '')
            .replace(/\s+[EF]\d{2}\b/g, '')      // e.g. " E23", " F24"
            .replace(/\s+[EF]20\d{2}\b/g, '')     // e.g. " E2023", " F2024"
            .replace(/\s*-\s*$/, '')               // trailing dash
            .replace(/\s{2,}/g, ' ')
            .trim();
        return name ? (code + ' ' + name) : code;
    }

    // --- Shared: build a Semester Twin match card ---
    function buildTwinMatchCard(t, myTotal, courseNames, isDark, idx) {
        var pct = Math.round(t.syncScore * 100);
        var isTwin = pct === 100;

        var card = document.createElement('div');
        card.setAttribute('data-dtu-semester-twin-row', '1');
        markExt(card);
        var cardBg = isDark ? '#1a1a1a' : '#f6f8fb';
        var cardBorder = isDark ? '#333' : '#e4e8ee';
        card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;'
            + 'margin-bottom:6px;position:relative;cursor:default;transition:background 0.15s;';
        card.style.setProperty('background', cardBg, 'important');
        card.style.setProperty('background-color', cardBg, 'important');
        card.style.setProperty('border', '1px solid ' + cardBorder, 'important');
        card.style.setProperty('color', isDark ? '#e0e0e0' : '#1f2937', 'important');

        // Left: name + program + shared count
        var left = document.createElement('div');
        markExt(left);
        left.style.cssText = 'min-width:0;flex:1;display:flex;flex-direction:column;gap:1px;';

        var nameEl = document.createElement('div');
        markExt(nameEl);
        nameEl.setAttribute('data-dtu-campusnet-semester-twin-name', '1');
        nameEl.textContent = t.name;
        nameEl.style.cssText = 'font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        nameEl.style.setProperty('color', isDark ? '#f0f0f0' : '#1a1a1a', 'important');
        nameEl.style.setProperty('background', 'transparent', 'important');
        nameEl.style.setProperty('background-color', 'transparent', 'important');
        left.appendChild(nameEl);

        if (t.program) {
            var progEl = document.createElement('div');
            markExt(progEl);
            progEl.setAttribute('data-dtu-campusnet-semester-twin-program', '1');
            progEl.textContent = t.program;
            progEl.style.cssText = 'font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            progEl.style.setProperty('color', isDark ? '#999' : '#6b7280', 'important');
            progEl.style.setProperty('background', 'transparent', 'important');
            progEl.style.setProperty('background-color', 'transparent', 'important');
            left.appendChild(progEl);
        }

        // Shared courses count (prominent)
        var sharedCount = document.createElement('div');
        markExt(sharedCount);
        sharedCount.textContent = t.shared.length + ' Shared Course' + (t.shared.length === 1 ? '' : 's');
        sharedCount.style.cssText = 'font-size:12px;font-weight:600;margin-top:3px;';
        sharedCount.style.setProperty('color', pct >= 50 ? 'var(--dtu-ad-accent)' : (isDark ? '#bbb' : '#555'), 'important');
        left.appendChild(sharedCount);

        // Twin badge if 100%
        if (isTwin) {
            var badge = document.createElement('span');
            markExt(badge);
            badge.textContent = 'Semester Twin';
            badge.style.cssText = 'display:inline-block;padding:1px 7px;border-radius:999px;font-size:9px;font-weight:700;'
                + 'text-transform:uppercase;letter-spacing:0.5px;margin-top:3px;width:fit-content;';
            badge.style.setProperty('background', 'rgba(var(--dtu-ad-accent-rgb),0.15)', 'important');
            badge.style.setProperty('background-color', 'rgba(var(--dtu-ad-accent-rgb),0.15)', 'important');
            badge.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
            left.appendChild(badge);
        }

        card.appendChild(left);

        // Right: sync ring
        var right = document.createElement('div');
        markExt(right);
        right.style.cssText = 'flex:0 0 auto;display:flex;align-items:center;';
        var ring = buildSyncRingSVG(pct, 44, isDark);
        markExt(ring);
        right.appendChild(ring);
        card.appendChild(right);

        // Click-to-expand chips area showing matching courses
        if (t.shared && t.shared.length) {
            card.style.setProperty('cursor', 'pointer', 'important');

            // Expandable drawer (sits below the card content, inside the card)
            var drawer = document.createElement('div');
            markExt(drawer);
            drawer.style.cssText = 'width:100%;overflow:hidden;transition:max-height 0.25s ease;';
            drawer.style.setProperty('max-height', '0px', 'important');

            var drawerInner = document.createElement('div');
            markExt(drawerInner);
            var drawerBg = isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)';
            drawerInner.style.cssText = 'padding:8px 10px;margin-top:8px;border-radius:8px;';
            drawerInner.style.setProperty('background', drawerBg, 'important');
            drawerInner.style.setProperty('background-color', drawerBg, 'important');

            var chipsWrap = document.createElement('div');
            markExt(chipsWrap);
            chipsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

            t.shared.forEach(function (code) {
                var rawName = normalizeWhitespace(courseNames[code] || '');
                var label = sanitizeCourseLabel(code, rawName);

                var chip = document.createElement('span');
                markExt(chip);
                chip.textContent = label;
                chip.style.cssText = 'display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;'
                    + 'white-space:nowrap;line-height:1.3;';
                chip.style.setProperty('background', isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)', 'important');
                chip.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)', 'important');
                chip.style.setProperty('color', isDark ? '#ddd' : '#333', 'important');
                chipsWrap.appendChild(chip);
            });

            drawerInner.appendChild(chipsWrap);
            drawer.appendChild(drawerInner);

            // The card needs flex-wrap so the drawer can go full-width below the main row
            card.style.setProperty('flex-wrap', 'wrap', 'important');
            card.appendChild(drawer);

            // Toggle expand/collapse on click
            var isExpanded = false;
            card.addEventListener('click', function (e) {
                e.stopPropagation();
                isExpanded = !isExpanded;
                if (isExpanded) {
                    // Measure natural height then animate
                    drawer.style.setProperty('max-height', drawerInner.scrollHeight + 40 + 'px', 'important');
                } else {
                    drawer.style.setProperty('max-height', '0px', 'important');
                }
            });
        }

        return card;
    }

    // --- Shared: build filter dropdown panel for Semester Twins ---
    function buildTwinFilterDropdown(isDark, prefs, selfProgram, lineSpecificCourseCount, opts) {
        var hasCampusnetControls = !!(opts && opts.campusnet);

        var wrap = document.createElement('div');
        markExt(wrap);
        wrap.setAttribute('data-dtu-semester-twin-filterpanel', '1');
        wrap.style.cssText = 'position:relative;flex:0 0 auto;';

        // Filter icon button
        var btn = document.createElement('button');
        markExt(btn);
        btn.setAttribute('data-dtu-semester-twin-filterbtn', '1');
        btn.setAttribute('aria-label', 'Filters');
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">'
            + '<path d="M1 3h14M3 8h10M5 13h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
        btn.style.cssText = 'display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;'
            + 'cursor:pointer;border:none;outline:none;transition:background 0.12s;';
        btn.style.setProperty('background', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', 'important');
        btn.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', 'important');
        btn.style.setProperty('color', isDark ? '#ccc' : '#555', 'important');
        wrap.appendChild(btn);

        // Dropdown panel
        var panel = document.createElement('div');
        markExt(panel);
        panel.setAttribute('data-dtu-semester-twin-filterdrop', '1');
        panel.style.cssText = 'position:absolute;right:0;top:100%;margin-top:4px;min-width:200px;z-index:200;'
            + 'padding:10px 12px;border-radius:10px;display:none;';
        panel.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
        panel.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
        panel.style.setProperty('border', '1px solid ' + (isDark ? '#444' : '#ddd'), 'important');
        panel.style.setProperty('box-shadow', '0 8px 24px rgba(0,0,0,0.18)', 'important');
        panel.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');

        function makeLabel(text) {
            var l = document.createElement('div');
            markExt(l);
            l.textContent = text;
            l.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;';
            l.style.setProperty('color', isDark ? '#999' : '#888', 'important');
            return l;
        }

        function makeSelect(attr, options, value) {
            var sel = document.createElement('select');
            markExt(sel);
            sel.setAttribute(attr, '1');
            sel.style.cssText = 'font-size:12px;padding:4px 8px;border-radius:6px;cursor:pointer;outline:none;width:100%;box-sizing:border-box;';
            sel.style.setProperty('background', isDark ? '#1a1a1a' : '#f3f3f3', 'important');
            sel.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f3f3f3', 'important');
            sel.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
            sel.style.setProperty('border', '1px solid ' + (isDark ? '#404040' : '#d0d0d0'), 'important');
            options.forEach(function (o) {
                var opt = document.createElement('option');
                opt.value = o.value;
                opt.textContent = o.label;
                sel.appendChild(opt);
            });
            sel.value = value;
            return sel;
        }

        // Scope (CampusNet only)
        if (hasCampusnetControls) {
            panel.appendChild(makeLabel('Scope'));
            var scopeSel = makeSelect('data-dtu-campusnet-semester-twin-scope-select',
                [{ value: 'semester', label: 'This semester' }, { value: 'all', label: 'All time' }],
                prefs.scope || 'semester');
            panel.appendChild(scopeSel);

            var spacer1 = document.createElement('div');
            spacer1.style.cssText = 'height:10px;';
            panel.appendChild(spacer1);

            // Show
            panel.appendChild(makeLabel('Show'));
            var limitSel = makeSelect('data-dtu-campusnet-semester-twin-limit-select',
                [{ value: '5', label: '5 matches' }, { value: '10', label: '10 matches' }],
                String(prefs.rowLimit || 5));
            panel.appendChild(limitSel);

            var spacer2 = document.createElement('div');
            spacer2.style.cssText = 'height:10px;';
            panel.appendChild(spacer2);
        }

        // Hide my study line checkbox (both platforms)
        panel.appendChild(makeLabel('Study Line'));
        var filterRow = document.createElement('label');
        markExt(filterRow);
        filterRow.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;font-size:12px;';

        var filterInput = document.createElement('input');
        filterInput.type = 'checkbox';
        filterInput.setAttribute(hasCampusnetControls ? 'data-dtu-campusnet-semester-twin-filter-input' : 'data-dtu-semester-twin-filter-input', '1');
        markExt(filterInput);
        filterInput.checked = !!(prefs && prefs.hideOwnProgram);
        filterInput.disabled = !selfProgram;
        filterInput.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:var(--dtu-ad-accent);';
        filterInput.title = selfProgram
            ? ('When enabled, only show students from other study lines.'
                + (lineSpecificCourseCount ? (' Also hides students who share your study-line-specific courses (' + lineSpecificCourseCount + ' detected).') : ''))
            : 'Your study line is unknown yet. Visit a CampusNet participant page first.';

        var filterText = document.createElement('span');
        markExt(filterText);
        filterText.textContent = 'Hide my study line';
        filterText.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');

        filterRow.appendChild(filterInput);
        filterRow.appendChild(filterText);
        panel.appendChild(filterRow);

        // Course History Scanner (integrated)
        var scanSpacer = document.createElement('div');
        scanSpacer.style.cssText = 'height:10px;';
        panel.appendChild(scanSpacer);

        var scanDivider = document.createElement('div');
        markExt(scanDivider);
        scanDivider.style.cssText = 'height:1px;margin-bottom:10px;';
        scanDivider.style.setProperty('background', isDark ? '#404040' : '#e0e0e0', 'important');
        panel.appendChild(scanDivider);

        panel.appendChild(makeLabel('Course History'));

        var scanStatus = document.createElement('div');
        markExt(scanStatus);
        scanStatus.setAttribute('data-dtu-twin-scan-status', '1');
        scanStatus.textContent = 'Scan your past courses to find more matches.';
        scanStatus.style.cssText = 'font-size:11px;margin-bottom:8px;line-height:1.35;';
        scanStatus.style.setProperty('color', isDark ? '#999' : '#666', 'important');
        panel.appendChild(scanStatus);

        var scanBtnRow = document.createElement('div');
        markExt(scanBtnRow);
        scanBtnRow.style.cssText = 'display:flex;gap:6px;';

        var scanBtn = document.createElement('button');
        markExt(scanBtn);
        scanBtn.setAttribute('data-dtu-twin-scan-btn', '1');
        scanBtn.textContent = 'Scan course history';
        scanBtn.style.cssText = 'flex:1;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;'
            + 'cursor:pointer;border:none;outline:none;text-align:center;';
        scanBtn.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
        scanBtn.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
        scanBtn.style.setProperty('color', '#fff', 'important');

        var scanStopBtn = document.createElement('button');
        markExt(scanStopBtn);
        scanStopBtn.setAttribute('data-dtu-twin-scan-stop', '1');
        scanStopBtn.textContent = 'Stop';
        scanStopBtn.style.cssText = 'padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;'
            + 'cursor:pointer;border:none;outline:none;display:none;';
        scanStopBtn.style.setProperty('background', isDark ? '#333' : '#e0e0e0', 'important');
        scanStopBtn.style.setProperty('background-color', isDark ? '#333' : '#e0e0e0', 'important');
        scanStopBtn.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');

        scanBtnRow.appendChild(scanBtn);
        scanBtnRow.appendChild(scanStopBtn);
        panel.appendChild(scanBtnRow);

        // If a scan is already running, show progress immediately
        if (_campusnetArchiveBackfillRunning) {
            scanBtn.disabled = true;
            scanBtn.textContent = 'Scanning...';
            scanStopBtn.style.display = 'block';
            var initPoll = setInterval(function () {
                if (!_campusnetArchiveBackfillRunning) {
                    clearInterval(initPoll);
                    var p = _campusnetArchiveBackfillProgress;
                    scanStatus.textContent = p ? ('Done! Scanned ' + p.ok + ' courses' + (p.failed ? (', ' + p.failed + ' failed') : '') + '.') : 'Scan complete.';
                    scanBtn.disabled = false;
                    scanBtn.textContent = 'Scan course history';
                    scanStopBtn.style.display = 'none';
                    _participantIntelSemesterTwinLastTs = 0;
                    _participantIntelSemesterTwinCampusnetLastTs = 0;
                    try { insertSemesterTwinWidget(); } catch (e1) { }
                    try { insertCampusnetSemesterTwinWidget(); } catch (e2) { }
                    return;
                }
                var p2 = _campusnetArchiveBackfillProgress;
                if (p2) scanStatus.textContent = 'Scanning: ' + p2.done + '/' + p2.total + ' (OK ' + p2.ok + (p2.failed ? ', ' + p2.failed + ' failed' : '') + ')';
            }, 500);
        }

        // Scan logic: fetch archive page remotely, then run the backfill
        scanBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (_campusnetArchiveBackfillRunning) return;
            scanBtn.disabled = true;
            scanBtn.textContent = 'Fetching course list...';
            scanStatus.textContent = 'Loading your archived courses...';

            fetchAndParseArchivedElements().then(function (items) {
                var courseItems = items.filter(function (it) {
                    return !!it.codeHint && isCampusnetLikelyAcademicCourse(it.codeHint, it.title, { title: it.title });
                });
                if (!courseItems.length) {
                    scanStatus.textContent = 'No archived courses found.';
                    scanBtn.disabled = false;
                    scanBtn.textContent = 'Scan course history';
                    return;
                }

                loadParticipantIntel(function (intel) {
                    // If self is unknown, try to detect from CampusNet page header
                    if (!intel.self || !intel.self.sNumber) {
                        try {
                            var headerSNum = null;
                            // Check for s-number in header/username area
                            var hdrCandidates = [
                                document.querySelector('.user-name, .header__user-name, [data-user-name], .masthead .profile-name'),
                                document.querySelector('header'),
                                document.querySelector('.header, #header, .masthead')
                            ];
                            for (var hci = 0; hci < hdrCandidates.length; hci++) {
                                var hEl = hdrCandidates[hci];
                                if (!hEl) continue;
                                var sM = (hEl.textContent || '').match(/\b(s\d{6})\b/i);
                                if (sM) { headerSNum = sM[1].toLowerCase(); break; }
                            }
                            if (headerSNum) {
                                intel.self = { sNumber: headerSNum, name: '', program: '', courses: [] };
                                saveParticipantIntel(intel);
                            }
                        } catch (eSelfDetect) { }
                    }

                    // Seed own course history from archive list
                    try {
                        if (intel && intel.self && intel.self.sNumber) {
                            if (!intel.self.courses) intel.self.courses = [];
                            for (var si = 0; si < courseItems.length; si++) {
                                var it0 = courseItems[si];
                                if (!it0 || !it0.codeHint) continue;
                                if (!isCampusnetLikelyAcademicCourse(it0.codeHint, it0.title, { title: it0.title })) continue;
                                var sem0 = it0.semesterHint;
                                if (!sem0) continue; // Don't guess semester; backfill will resolve it
                                var has0 = intel.self.courses.some(function (c) { return c && c.code === it0.codeHint && c.semester === sem0; });
                                if (!has0) intel.self.courses.push({ code: it0.codeHint, semester: sem0, archived: true });
                            }
                            saveParticipantIntel(intel);
                        }
                    } catch (eSeed) { }

                    var scanned = (intel.backfill && intel.backfill.scanned) ? intel.backfill.scanned : {};
                    var queue = courseItems.filter(function (it) { return !scanned[it.elementId]; });

                    if (!queue.length) {
                        scanStatus.textContent = 'All ' + courseItems.length + ' courses already scanned. Nothing new to do.';
                        scanBtn.disabled = false;
                        scanBtn.textContent = 'Scan course history';
                        return;
                    }

                    scanStatus.textContent = 'Scanning: 0/' + queue.length + ' courses...';
                    scanStopBtn.style.display = 'block';

                    // Use the existing backfill engine
                    runCampusnetArchiveBackfill(queue, intel);

                    // Poll progress
                    var pollTimer = setInterval(function () {
                        if (!_campusnetArchiveBackfillRunning) {
                            clearInterval(pollTimer);
                            var p = _campusnetArchiveBackfillProgress;
                            if (p) {
                                scanStatus.textContent = 'Done! Scanned ' + p.ok + ' courses' + (p.failed ? (', ' + p.failed + ' failed') : '') + '.';
                            } else {
                                scanStatus.textContent = 'Scan complete.';
                            }
                            scanBtn.disabled = false;
                            scanBtn.textContent = 'Scan course history';
                            scanStopBtn.style.display = 'none';
                            // Refresh the widget
                            _participantIntelSemesterTwinLastTs = 0;
                            _participantIntelSemesterTwinCampusnetLastTs = 0;
                            try { insertSemesterTwinWidget(); } catch (e1) { }
                            try { insertCampusnetSemesterTwinWidget(); } catch (e2) { }
                            return;
                        }
                        var p2 = _campusnetArchiveBackfillProgress;
                        if (p2) {
                            scanStatus.textContent = 'Scanning: ' + p2.done + '/' + p2.total
                                + ' (OK ' + p2.ok + (p2.failed ? ', ' + p2.failed + ' failed' : '') + ')';
                        }
                    }, 500);
                });
            }).catch(function (err) {
                scanStatus.textContent = 'Failed to load archive page. Are you logged into CampusNet?';
                scanBtn.disabled = false;
                scanBtn.textContent = 'Scan course history';
            });
        });

        scanStopBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            stopCampusnetArchiveBackfill();
            scanStopBtn.style.display = 'none';
            scanBtn.disabled = false;
            scanBtn.textContent = 'Scan course history';
        });

        wrap.appendChild(panel);

        // Toggle dropdown
        var isOpen = false;
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            isOpen = !isOpen;
            panel.style.display = isOpen ? 'block' : 'none';
        });
        // Close on outside click
        document.addEventListener('click', function (e) {
            if (isOpen && !wrap.contains(e.target)) {
                isOpen = false;
                panel.style.display = 'none';
            }
        }, true);

        return wrap;
    }

    function applySemesterTwinTheme(widget, isDark) {
        if (!widget) return;
        var header = widget.querySelector('[data-dtu-semester-twin-header]');
        var title = widget.querySelector('[data-dtu-semester-twin-title]');
        var body = widget.querySelector('[data-dtu-semester-twin-body]');

        if (header) {
            header.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
            header.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
            header.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
        }
        if (title) {
            title.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
        }
        if (body) {
            body.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
            body.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
            body.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
        }
        // Theme filter button
        var filterBtn = widget.querySelector('[data-dtu-semester-twin-filterbtn]');
        if (filterBtn) {
            filterBtn.style.setProperty('background', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', 'important');
            filterBtn.style.setProperty('background-color', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', 'important');
            filterBtn.style.setProperty('color', isDark ? '#ccc' : '#555', 'important');
        }
        var filterDrop = widget.querySelector('[data-dtu-semester-twin-filterdrop]');
        if (filterDrop) {
            filterDrop.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
            filterDrop.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
            filterDrop.style.setProperty('border', '1px solid ' + (isDark ? '#444' : '#ddd'), 'important');
            filterDrop.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
        }
        // Theme cards
        widget.querySelectorAll('[data-dtu-semester-twin-row]').forEach(function (row) {
            row.style.setProperty('background', isDark ? '#1a1a1a' : '#f6f8fb', 'important');
            row.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f6f8fb', 'important');
            row.style.setProperty('border', '1px solid ' + (isDark ? '#333' : '#e4e8ee'), 'important');
            row.style.setProperty('color', isDark ? '#e0e0e0' : '#1f2937', 'important');
        });
    }

    function placeSemesterTwinWidget(widget, col3) {
        if (!widget || !col3) return;
        var deadlines = col3.querySelector('.dtu-deadlines-home-widget');

        if (deadlines && deadlines.parentNode === col3) {
            var after = deadlines.nextSibling;
            if (widget.parentNode !== col3 || widget.previousElementSibling !== deadlines) {
                if (after) col3.insertBefore(widget, after);
                else col3.appendChild(widget);
            }
            return;
        }

        if (widget.parentNode !== col3 || col3.firstChild !== widget) {
            if (col3.firstChild) col3.insertBefore(widget, col3.firstChild);
            else col3.appendChild(widget);
        }
    }

    function renderSemesterTwinWidget(twins, myTotal, meta) {
        var col3 = null;
        var deadlinesAnywhere = document.querySelector('.dtu-deadlines-home-widget');
        if (deadlinesAnywhere && deadlinesAnywhere.closest) {
            col3 = deadlinesAnywhere.closest('.homepage-col-3');
            if (!col3) col3 = deadlinesAnywhere.parentElement;
        }
        if (!col3) col3 = document.querySelector('.homepage-col-3') || document.querySelector('.d2l-page-main');
        if (!col3) return;

        var isDark = darkModeEnabled;
        var showingClosest = !!(meta && meta.showingClosest);
        var emptyMessage = (meta && meta.emptyMessage) ? meta.emptyMessage : '';
        var hideOwnProgram = !!(meta && meta.hideOwnProgram);
        var selfProgram = (meta && meta.selfProgram) ? meta.selfProgram : '';
        var courseNames = (meta && meta.courseNames) ? meta.courseNames : {};
        var myTotalBeforeLineSpecific = (meta && typeof meta.myTotalBeforeLineSpecific === 'number') ? meta.myTotalBeforeLineSpecific : myTotal;
        var myTotalAfterLineSpecific = (meta && typeof meta.myTotalAfterLineSpecific === 'number') ? meta.myTotalAfterLineSpecific : myTotal;
        var lineSpecificCourseCount = (meta && typeof meta.lineSpecificCourseCount === 'number') ? meta.lineSpecificCourseCount : 0;
        var lineSpecificCourses = (meta && meta.lineSpecificCourses && meta.lineSpecificCourses.length) ? meta.lineSpecificCourses : [];
        var lineSpecificSuppressed = (meta && typeof meta.lineSpecificSuppressed === 'number') ? meta.lineSpecificSuppressed : 0;
        var lineSpecificNote = (meta && meta.lineSpecificNote) ? meta.lineSpecificNote : '';
        var sig = (isDark ? 'd' : 'l') + '|' + myTotal + '|' + (showingClosest ? 'closest' : 'twins')
            + '|' + (hideOwnProgram ? 'hideOwn1' : 'hideOwn0')
            + '|' + (selfProgram || '') + '|' + emptyMessage + '|'
            + myTotalBeforeLineSpecific + '|' + myTotalAfterLineSpecific + '|'
            + lineSpecificCourseCount + '|' + lineSpecificSuppressed + '|'
            + (lineSpecificNote || '') + '|' + (lineSpecificCourses || []).join(',') + '|'
            + twins.map(function (t) {
                var pct = Math.round(t.syncScore * 100);
                var sharedSig = '';
                if (t.shared && t.shared.length) {
                    sharedSig = t.shared.map(function (code) {
                        var nm = normalizeWhitespace(courseNames[code] || '');
                        return code + '=' + nm;
                    }).join(',');
                }
                return (t.sNumber || '') + ':' + pct + ':' + sharedSig + ':' + (t.program || '') + ':' + (t.name || '');
            }).join('|');

        var widget = document.querySelector('[data-dtu-semester-twin]');
        if (!widget) {
            widget = document.createElement('div');
            widget.className = 'd2l-widget d2l-tile d2l-widget-padding-full dtu-semester-twins-widget';
            widget.setAttribute('role', 'region');
            widget.setAttribute('data-dtu-semester-twin', '1');
            markExt(widget);

            var header = document.createElement('div');
            header.className = 'd2l-widget-header';
            header.setAttribute('data-dtu-semester-twin-header', '1');
            markExt(header);
            header.style.cssText = 'padding: 2px 7px 2px !important;';

            var headerWrap = document.createElement('div');
            headerWrap.className = 'd2l-homepage-header-wrapper';
            markExt(headerWrap);
            headerWrap.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';

            var h2 = document.createElement('h2');
            h2.className = 'd2l-heading vui-heading-4';
            h2.setAttribute('data-dtu-semester-twin-title', '1');
            markExt(h2);
            h2.textContent = 'Semester Twins';
            h2.style.cssText = 'margin: 0; flex: 1 1 auto; min-width: 140px; white-space: nowrap;';

            headerWrap.appendChild(h2);

            // Filter dropdown (replaces inline checkbox)
            var filterPanel = buildTwinFilterDropdown(isDark,
                { hideOwnProgram: hideOwnProgram }, selfProgram, lineSpecificCourseCount, { campusnet: false });
            headerWrap.appendChild(filterPanel);

            header.appendChild(headerWrap);
            widget.appendChild(header);

            var clear = document.createElement('div');
            clear.className = 'd2l-clear';
            widget.appendChild(clear);

            var content = document.createElement('div');
            content.className = 'd2l-widget-content';
            markExt(content);

            var padding = document.createElement('div');
            padding.className = 'd2l-widget-content-padding';
            padding.setAttribute('data-dtu-semester-twin-body', '1');
            markExt(padding);
            padding.style.cssText = 'padding: 6px 7px 8px !important;';

            content.appendChild(padding);
            widget.appendChild(content);
        }

        // Sync filter UI state
        var filterInputEl = widget.querySelector('[data-dtu-semester-twin-filter-input]');
        if (filterInputEl) {
            filterInputEl.checked = hideOwnProgram;
            filterInputEl.disabled = !selfProgram;
            filterInputEl.title = selfProgram
                ? ('When enabled, Semester Twins will only show students from other study lines.'
                    + (lineSpecificCourseCount ? (' It also hides students who share your study-line-specific courses (' + lineSpecificCourseCount + ' detected).') : ''))
                : 'Your study line is unknown yet. Visit a CampusNet participant page (Users list) to learn it.';
            if (filterInputEl.getAttribute('data-dtu-semester-twin-filter-bound') !== '1') {
                filterInputEl.setAttribute('data-dtu-semester-twin-filter-bound', '1');
                filterInputEl.addEventListener('change', function () {
                    updateSemesterTwinPrefs({ hideOwnProgram: !!filterInputEl.checked });
                    _participantIntelSemesterTwinLastTs = 0;
                    _participantIntelSemesterTwinCampusnetLastTs = 0;
                    try { insertCampusnetSemesterTwinWidget(); } catch (e2) { }
                });
            }
        }

        placeSemesterTwinWidget(widget, col3);
        applySemesterTwinTheme(widget, isDark);

        if (widget.getAttribute('data-dtu-semester-twin-sig') === sig) return;
        widget.setAttribute('data-dtu-semester-twin-sig', sig);

        var body = widget.querySelector('[data-dtu-semester-twin-body]');
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        if (emptyMessage && (!twins || twins.length === 0)) {
            var msg = document.createElement('div');
            markExt(msg);
            msg.textContent = emptyMessage;
            msg.style.cssText = 'font-size:12px;opacity:0.82;line-height:1.3;margin:6px 0 2px;';
            body.appendChild(msg);
        }

        for (var i = 0; i < twins.length; i++) {
            body.appendChild(buildTwinMatchCard(twins[i], myTotal, courseNames, isDark, i));
        }

        var note = document.createElement('div');
        markExt(note);
        var baseNote = (!emptyMessage && showingClosest)
            ? 'No 50%+ twins yet. Showing closest matches from your course history.'
            : 'Based on participant lists you have visited.';
        var lsExtra = '';
        if (hideOwnProgram && selfProgram && lineSpecificCourseCount) {
            var excluded = Math.max(0, (myTotalBeforeLineSpecific || 0) - (myTotalAfterLineSpecific || 0));
            if (excluded > 0) {
                lsExtra += ' Ignoring ' + excluded + ' study-line-specific course' + (excluded === 1 ? '' : 's') + ' for matching.';
            }
            if (lineSpecificSuppressed > 0) {
                lsExtra += ' Hiding ' + lineSpecificSuppressed + ' student' + (lineSpecificSuppressed === 1 ? '' : 's') + ' with study-line-specific overlap.';
            }
            if (lineSpecificNote) {
                lsExtra += ' ' + lineSpecificNote;
            }
        }
        note.textContent = baseNote + lsExtra;
        if (hideOwnProgram && selfProgram && lineSpecificCourseCount && lineSpecificCourses && lineSpecificCourses.length) {
            note.title = 'Study-line-specific courses detected: ' + lineSpecificCourses.join(', ');
        }
        note.style.cssText = 'font-size:10px;opacity:0.5;margin-top:10px;';
        body.appendChild(note);
    }

    // ---- Semester Twins (CampusNet frontpage) ----

    function findCampusnetFrontpageAnchorWidget() {
        var widgets = document.querySelectorAll('.widget');
        for (var i = 0; i < widgets.length; i++) {
            var w = widgets[i];
            var titleEl = w.querySelector('.widget__title');
            var title = normalizeWhitespace(titleEl ? titleEl.textContent : '');
            if (title && /mobile phone number/i.test(title)) return w;
            if (title && /phone number/i.test(title) && /up to date|update/i.test(title)) return w;
        }
        for (var j = 0; j < widgets.length; j++) {
            var w2 = widgets[j];
            if (w2.querySelector('.icon--messages, .icon__content.icon--messages')) return w2;
        }
        return null;
    }

    function placeCampusnetSemesterTwinWidget(widget) {
        if (!widget) return false;
        var anchor = findCampusnetFrontpageAnchorWidget();
        if (anchor && anchor.parentNode) {
            if (widget.parentNode !== anchor.parentNode || widget.previousElementSibling !== anchor) {
                anchor.parentNode.insertBefore(widget, anchor.nextSibling);
            }
            return true;
        }

        // Fallback: append into the same container as other native widgets.
        var anyNativeWidget = document.querySelector('.widget:not([data-dtu-campusnet-semester-twin])');
        var container = (anyNativeWidget && anyNativeWidget.parentElement)
            || document.querySelector('.widgets, .widget-area, .widget-container, .frontpage')
            || null;
        if (!container) return false;
        if (widget.parentNode !== container) container.appendChild(widget);
        return true;
    }

    function canPlaceCampusnetSemesterTwinWidget() {
        var anchor = findCampusnetFrontpageAnchorWidget();
        if (anchor && anchor.parentNode) return true;
        var anyNativeWidget = document.querySelector('.widget:not([data-dtu-campusnet-semester-twin])');
        if (anyNativeWidget && anyNativeWidget.parentElement) return true;
        if (document.querySelector('.widgets, .widget-area, .widget-container, .frontpage')) return true;
        return false;
    }

    function scheduleCampusnetSemesterTwinEnsure(delayMs) {
        if (!IS_TOP_WINDOW) return;
        if (_campusnetSemesterTwinRetryTimer) return;
        _campusnetSemesterTwinRetryTimer = setTimeout(function () {
            _campusnetSemesterTwinRetryTimer = null;

            if (!isCampusnetFrontpageDTU()) {
                _campusnetSemesterTwinRetryAttempts = 0;
                return;
            }
            if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY) || !isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY)) {
                _campusnetSemesterTwinRetryAttempts = 0;
                var old = document.querySelector('[data-dtu-campusnet-semester-twin]');
                if (old) old.remove();
                return;
            }
            if (document.hidden) {
                // Avoid burning retries while hidden; try again shortly when visible.
                scheduleCampusnetSemesterTwinEnsure(900);
                return;
            }

            _campusnetSemesterTwinRetryAttempts++;

            var widget = document.querySelector('[data-dtu-campusnet-semester-twin]');
            if (widget) {
                placeCampusnetSemesterTwinWidget(widget);
                applyCampusnetSemesterTwinTheme(widget, darkModeEnabled);
            } else {
                // Force a fresh attempt regardless of throttling.
                _participantIntelSemesterTwinCampusnetLastTs = 0;
                try { insertCampusnetSemesterTwinWidget(); } catch (e1) { }
                widget = document.querySelector('[data-dtu-campusnet-semester-twin]');
            }

            var anchor = findCampusnetFrontpageAnchorWidget();
            var anchoredOk = !!(anchor && widget && widget.parentNode === anchor.parentNode && widget.previousElementSibling === anchor);

            if (!widget || !anchoredOk) {
                if (_campusnetSemesterTwinRetryAttempts < 40) scheduleCampusnetSemesterTwinEnsure(450);
                else _campusnetSemesterTwinRetryAttempts = 0;
            } else {
                _campusnetSemesterTwinRetryAttempts = 0;
            }
        }, delayMs || 220);
    }

    function applyCampusnetSemesterTwinTheme(widget, isDark) {
        if (!widget) return;
        var accentDeepHex = getResolvedAccentDeep();
        var accentDeepHoverHex = (getAccentThemeById(_accentThemeId) || {}).accentDeepHover || '#990000';
        widget.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
        widget.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
        widget.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
        widget.style.setProperty('border', isDark ? '1px solid #404040' : '1px solid #e0e0e0', 'important');

        var header = widget.querySelector('[data-dtu-campusnet-semester-twin-header]');
        var body = widget.querySelector('[data-dtu-campusnet-semester-twin-body]');
        var title = widget.querySelector('.widget__title');
        if (header) {
            header.style.setProperty('background', accentDeepHex, 'important');
            header.style.setProperty('background-color', accentDeepHex, 'important');
            header.style.setProperty('border-bottom-color', accentDeepHoverHex, 'important');
            header.style.setProperty('color', '#ffffff', 'important');
        }
        if (title) {
            title.style.setProperty('color', '#ffffff', 'important');
            title.style.setProperty('background', 'transparent', 'important');
            title.style.setProperty('background-color', 'transparent', 'important');
        }
        if (body) {
            body.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
        }
        // Theme filter button + dropdown
        var filterBtn = widget.querySelector('[data-dtu-semester-twin-filterbtn]');
        if (filterBtn) {
            filterBtn.style.setProperty('background', 'rgba(255,255,255,0.16)', 'important');
            filterBtn.style.setProperty('background-color', 'rgba(255,255,255,0.16)', 'important');
            filterBtn.style.setProperty('color', '#ffffff', 'important');
        }
        var filterDrop = widget.querySelector('[data-dtu-semester-twin-filterdrop]');
        if (filterDrop) {
            filterDrop.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
            filterDrop.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
            filterDrop.style.setProperty('border', '1px solid ' + (isDark ? '#444' : '#ddd'), 'important');
            filterDrop.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
        }
        // Theme selects in dropdown
        widget.querySelectorAll('[data-dtu-campusnet-semester-twin-scope-select],[data-dtu-campusnet-semester-twin-limit-select]').forEach(function (sel) {
            sel.style.setProperty('background', isDark ? '#1a1a1a' : '#f3f3f3', 'important');
            sel.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f3f3f3', 'important');
            sel.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
            sel.style.setProperty('border', '1px solid ' + (isDark ? '#404040' : '#d0d0d0'), 'important');
        });
        // Theme cards
        widget.querySelectorAll('[data-dtu-campusnet-semester-twin-row],[data-dtu-semester-twin-row]').forEach(function (row) {
            row.style.setProperty('background', isDark ? '#1a1a1a' : '#f6f8fb', 'important');
            row.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f6f8fb', 'important');
            row.style.setProperty('border', '1px solid ' + (isDark ? '#333' : '#e4e8ee'), 'important');
            row.style.setProperty('color', isDark ? '#e0e0e0' : '#1f2937', 'important');
        });
        // Ensure name/program don't pick up mismatched CampusNet greys.
        widget.querySelectorAll('[data-dtu-campusnet-semester-twin-name],[data-dtu-campusnet-semester-twin-program]').forEach(function (el) {
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
            el.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
        });
    }

    function renderCampusnetSemesterTwinWidget(twins, myTotal, meta) {
        if (!isCampusnetFrontpageDTU()) return;

        var isDark = darkModeEnabled;
        var showingClosest = !!(meta && meta.showingClosest);
        var emptyMessage = (meta && meta.emptyMessage) ? meta.emptyMessage : '';
        var hideOwnProgram = !!(meta && meta.hideOwnProgram);
        var selfProgram = (meta && meta.selfProgram) ? meta.selfProgram : '';
        var courseNames = (meta && meta.courseNames) ? meta.courseNames : {};
        var rowLimit = (meta && meta.rowLimit === 10) ? 10 : 5;
        var scope = (meta && meta.scope === 'all') ? 'all' : 'semester';
        var historyTotal = (meta && typeof meta.historyTotal === 'number') ? meta.historyTotal : 0;
        var currentTotal = (meta && typeof meta.currentTotal === 'number') ? meta.currentTotal : 0;
        var currentVerifiedTotal = (meta && typeof meta.currentVerifiedTotal === 'number') ? meta.currentVerifiedTotal : currentTotal;
        var currentSeededTotal = (meta && typeof meta.currentSeededTotal === 'number') ? meta.currentSeededTotal : Math.max(0, currentTotal - currentVerifiedTotal);
        var myTotalBeforeLineSpecific = (meta && typeof meta.myTotalBeforeLineSpecific === 'number') ? meta.myTotalBeforeLineSpecific : myTotal;
        var myTotalAfterLineSpecific = (meta && typeof meta.myTotalAfterLineSpecific === 'number') ? meta.myTotalAfterLineSpecific : myTotal;
        var lineSpecificCourseCount = (meta && typeof meta.lineSpecificCourseCount === 'number') ? meta.lineSpecificCourseCount : 0;
        var lineSpecificCourses = (meta && meta.lineSpecificCourses && meta.lineSpecificCourses.length) ? meta.lineSpecificCourses : [];
        var lineSpecificSuppressed = (meta && typeof meta.lineSpecificSuppressed === 'number') ? meta.lineSpecificSuppressed : 0;
        var lineSpecificNote = (meta && meta.lineSpecificNote) ? meta.lineSpecificNote : '';

        var sig = (isDark ? 'd' : 'l') + '|'
            + (hideOwnProgram ? 'hideOwn1' : 'hideOwn0') + '|'
            + (selfProgram || '') + '|'
            + rowLimit + '|'
            + scope + '|'
            + myTotal + '|'
            + currentTotal + '|' + currentVerifiedTotal + '|' + currentSeededTotal + '|'
            + myTotalBeforeLineSpecific + '|' + myTotalAfterLineSpecific + '|'
            + lineSpecificCourseCount + '|' + lineSpecificSuppressed + '|'
            + (lineSpecificNote || '') + '|' + (lineSpecificCourses || []).join(',') + '|'
            + (showingClosest ? 'closest' : 'twins') + '|'
            + emptyMessage + '|'
            + (twins || []).map(function (t) {
                var pct = Math.round(t.syncScore * 100);
                var sharedSig = '';
                if (t.shared && t.shared.length) {
                    sharedSig = t.shared.map(function (code) {
                        var nm = normalizeWhitespace(courseNames[code] || '');
                        return code + '=' + nm;
                    }).join(',');
                }
                return (t.sNumber || '') + ':' + pct + ':' + sharedSig + ':' + (t.program || '') + ':' + (t.name || '');
            }).join('|');

        var widget = document.querySelector('[data-dtu-campusnet-semester-twin]');
        if (!widget) {
            widget = document.createElement('div');
            widget.className = 'widget';
            widget.setAttribute('data-dtu-campusnet-semester-twin', '1');
            markExt(widget);
            widget.style.cssText = 'border-radius:10px;overflow:visible;';

            var header = document.createElement('div');
            header.className = 'widget__header';
            header.setAttribute('data-dtu-campusnet-semester-twin-header', '1');
            markExt(header);
            header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;';

            var h2 = document.createElement('h2');
            h2.className = 'widget__title';
            markExt(h2);
            h2.textContent = 'Semester Twins';
            h2.style.cssText = 'margin:0;min-width:0;flex:1 1 auto;';

            header.appendChild(h2);

            // Filter dropdown (replaces inline controls)
            var filterPanel = buildTwinFilterDropdown(isDark,
                { hideOwnProgram: hideOwnProgram, scope: scope, rowLimit: rowLimit },
                selfProgram, lineSpecificCourseCount, { campusnet: true });
            header.appendChild(filterPanel);

            widget.appendChild(header);

            var content = document.createElement('div');
            content.className = 'widget__content';
            content.setAttribute('data-dtu-campusnet-semester-twin-body', '1');
            markExt(content);
            content.style.cssText = 'padding:12px 16px;';
            widget.appendChild(content);
        }

        // Bind scope select
        var scopeSelectEl = widget.querySelector('[data-dtu-campusnet-semester-twin-scope-select]');
        if (scopeSelectEl) {
            scopeSelectEl.value = scope;
            if (scopeSelectEl.getAttribute('data-dtu-campusnet-semester-twin-scope-bound') !== '1') {
                scopeSelectEl.setAttribute('data-dtu-campusnet-semester-twin-scope-bound', '1');
                scopeSelectEl.addEventListener('change', function () {
                    updateSemesterTwinPrefs({ scope: String(scopeSelectEl.value || 'semester') });
                    _participantIntelSemesterTwinLastTs = 0;
                    _participantIntelSemesterTwinCampusnetLastTs = 0;
                    try { insertCampusnetSemesterTwinWidget(); } catch (e1) { }
                });
            }
        }

        // Bind limit select
        var limitSelectEl = widget.querySelector('[data-dtu-campusnet-semester-twin-limit-select]');
        if (limitSelectEl) {
            limitSelectEl.value = String(rowLimit);
            if (limitSelectEl.getAttribute('data-dtu-campusnet-semester-twin-limit-bound') !== '1') {
                limitSelectEl.setAttribute('data-dtu-campusnet-semester-twin-limit-bound', '1');
                limitSelectEl.addEventListener('change', function () {
                    updateSemesterTwinPrefs({ rowLimit: parseInt(limitSelectEl.value, 10) });
                    _participantIntelSemesterTwinLastTs = 0;
                    _participantIntelSemesterTwinCampusnetLastTs = 0;
                    try { insertCampusnetSemesterTwinWidget(); } catch (e1) { }
                });
            }
        }

        // Bind filter checkbox
        var filterInputEl = widget.querySelector('[data-dtu-campusnet-semester-twin-filter-input]');
        if (filterInputEl) {
            filterInputEl.checked = hideOwnProgram;
            filterInputEl.disabled = !selfProgram;
            filterInputEl.title = selfProgram
                ? ('When enabled, Semester Twins will only show students from other study lines.'
                    + (lineSpecificCourseCount ? (' It also hides students who share your study-line-specific courses (' + lineSpecificCourseCount + ' detected).') : ''))
                : 'Your study line is unknown yet. Visit a CampusNet participant page (Users list) to learn it.';
            if (filterInputEl.getAttribute('data-dtu-campusnet-semester-twin-filter-bound') !== '1') {
                filterInputEl.setAttribute('data-dtu-campusnet-semester-twin-filter-bound', '1');
                filterInputEl.addEventListener('change', function () {
                    updateSemesterTwinPrefs({ hideOwnProgram: !!filterInputEl.checked });
                    _participantIntelSemesterTwinLastTs = 0;
                    _participantIntelSemesterTwinCampusnetLastTs = 0;
                    try { insertCampusnetSemesterTwinWidget(); } catch (e1) { }
                });
            }
        }

        placeCampusnetSemesterTwinWidget(widget);
        applyCampusnetSemesterTwinTheme(widget, isDark);

        if (widget.getAttribute('data-dtu-campusnet-semester-twin-sig') === sig) return;
        widget.setAttribute('data-dtu-campusnet-semester-twin-sig', sig);

        var body = widget.querySelector('[data-dtu-campusnet-semester-twin-body]');
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        if (emptyMessage && (!twins || twins.length === 0)) {
            var msg = document.createElement('div');
            markExt(msg);
            msg.textContent = emptyMessage;
            msg.style.cssText = 'font-size:13px;opacity:0.82;line-height:1.35;margin:2px 0 8px;';
            body.appendChild(msg);
        }

        var list = (twins || []).slice(0, rowLimit);
        for (var i = 0; i < list.length; i++) {
            body.appendChild(buildTwinMatchCard(list[i], myTotal, courseNames, isDark, i));
        }

        var note = document.createElement('div');
        markExt(note);
        var baseNote = '';
        if (!emptyMessage && showingClosest) {
            baseNote = (scope === 'all')
                ? 'No 50%+ twins yet. Showing closest matches based on participant lists you have visited.'
                : 'No 50%+ twins yet. Showing closest matches based on participant lists you have visited this semester.';
        } else {
            baseNote = (scope === 'all')
                ? 'Based on participant lists you have visited.'
                : 'Based on participant lists you have visited this semester.';
        }
        var fillNote = '';
        if (!emptyMessage) {
            if (meta && meta.includingClosest) {
                fillNote = ' Including closest matches to fill your "Show" limit.';
            } else if (showingClosest && meta && meta.includesLowOverlap) {
                fillNote = ' Including small overlaps to fill the list.';
            } else if (showingClosest && meta && meta.includesZeroOverlap) {
                fillNote = ' Including 0-overlap students to fill the list.';
            }
        }
        var extra = (twins && twins.length > list.length) ? (' Showing ' + list.length + ' of ' + twins.length + '.') : '';
        var scopeNote = (scope === 'all')
            ? (' Matching across all ' + historyTotal + ' courses in your history.')
            : (' Showing classmates in your ' + currentTotal + ' current course' + (currentTotal === 1 ? '' : 's') + ', ranked by weighted current-semester overlap (verified courses first) with history as tie-breaker (' + historyTotal + ' courses).');
        if (scope === 'semester' && currentSeededTotal > 0 && currentVerifiedTotal > 0) {
            scopeNote += ' Using ' + currentVerifiedTotal + ' verified current course' + (currentVerifiedTotal === 1 ? '' : 's') + '; frontpage-only detections are down-weighted.';
        }
        var lsExtra = '';
        if (hideOwnProgram && selfProgram && lineSpecificCourseCount) {
            var excluded = Math.max(0, (myTotalBeforeLineSpecific || 0) - (myTotalAfterLineSpecific || 0));
            if (excluded > 0) {
                lsExtra += ' Ignoring ' + excluded + ' study-line-specific course' + (excluded === 1 ? '' : 's') + ' for matching.';
            }
            if (lineSpecificSuppressed > 0) {
                lsExtra += ' Hiding ' + lineSpecificSuppressed + ' student' + (lineSpecificSuppressed === 1 ? '' : 's') + ' with study-line-specific overlap.';
            }
            if (lineSpecificNote) {
                lsExtra += ' ' + lineSpecificNote;
            }
        }
        note.textContent = baseNote + fillNote + extra + scopeNote + lsExtra;
        if (hideOwnProgram && selfProgram && lineSpecificCourseCount && lineSpecificCourses && lineSpecificCourses.length) {
            note.title = 'Study-line-specific courses detected: ' + lineSpecificCourses.join(', ');
        }
        note.style.cssText = 'font-size:11px;opacity:0.55;margin-top:10px;';
        body.appendChild(note);
    }

    // Detect active (non-archived) courses from the CampusNet frontpage DOM and seed them
    // into participant intel so they count as "current" courses for Semester Twins.
    // Keep this conservative: only seed links that look like real course titles
    // (course code at start), to avoid group/project links polluting "This semester".
    function seedActiveFrontpageCourses(intel) {
        if (!isCampusnetFrontpageDTU()) return false;
        if (!intel || typeof intel !== 'object') return false;

        function detectSelfSNumberFromHeader() {
            try {
                var root = document.querySelector('header, .header, #header, .masthead') || document.body;
                if (!root) return '';
                var txt = normalizeWhitespace(root.textContent || '');
                var m = txt.match(/\b(s\d{6})\b/i);
                return m ? String(m[1]).toLowerCase() : '';
            } catch (e0) { return ''; }
        }

        if (!intel.self || typeof intel.self !== 'object') intel.self = null;
        if (!intel.self || !intel.self.sNumber) {
            var guessedSelf = detectSelfSNumberFromHeader();
            if (!guessedSelf) return false;
            intel.self = intel.self || {};
            intel.self.sNumber = guessedSelf;
            if (!intel.self.name) intel.self.name = '';
            if (!intel.self.program) intel.self.program = '';
            if (!intel.self.courses || !Array.isArray(intel.self.courses)) intel.self.courses = [];
        }
        if (!intel.self.courses) intel.self.courses = [];

        var currentSem = getCurrentDTUSemester();
        var codeRe = /^\s*((?:\d{5}|KU\d{3}))(?=\s|$|[-:,(])/i;
        var seeded = false;

        // Prefer links inside the explicit "Courses" section of "My courses and groups".
        // This avoids picking Projects/Groups/Shortcuts noise.
        var links = [];
        try {
            var sections = document.querySelectorAll('.group-menu__item.group-menu__item-burger');
            sections.forEach(function (sec) {
                if (!sec || !sec.querySelector) return;
                var titleEl = sec.querySelector('h2.item__title');
                var sectionTitle = normalizeWhitespace(titleEl ? titleEl.textContent : '').toLowerCase();
                // English + Danish
                if (!/^(courses|kurser)$/.test(sectionTitle)) return;
                sec.querySelectorAll('a[href*="/cnnet/element/"]').forEach(function (a) { links.push(a); });
            });
        } catch (eLinks) { }

        // Fallback: broad scan if the Courses section is not present in DOM yet.
        if (!links.length) {
            try {
                document.querySelectorAll('a[href*="/cnnet/element/"]').forEach(function (a) { links.push(a); });
            } catch (eLinks2) { }
        }

        for (var i = 0; i < links.length; i++) {
            var a = links[i];
            if (!a || !a.textContent) continue;
            // Skip links inside our own extension widgets
            if (a.closest && (a.closest('[data-dtu-ext]') || a.closest('[data-dtu-campusnet-semester-twin]'))) continue;
            // Skip links inside archived elements sections
            if (a.closest && a.closest('.archived-element')) continue;
            // Skip links inside non-course sections in header/dropdowns when detectable.
            try {
                var section = a.closest('.group-menu__item, section');
                var titleEl = section ? section.querySelector('.item__title') : null;
                var sectionTitle = normalizeWhitespace(titleEl ? titleEl.textContent : '').toLowerCase();
                if (sectionTitle && (sectionTitle.indexOf('project') > -1 || sectionTitle.indexOf('group') > -1 || sectionTitle.indexOf('shortcut') > -1)) {
                    continue;
                }
            } catch (eSec) { }

            var text = normalizeWhitespace(a.textContent);
            var m = text.match(codeRe);
            if (!m) continue;
            var code = m[1].toUpperCase();
            if (!isCampusnetLikelyAcademicCourse(code, text, { title: text, linkText: text })) continue;

            // Try to extract semester from the link text; default to current semester for frontpage active courses
            var sem = parseDTUSemesterFromText(text) || currentSem;

            // Only seed if not already present (avoid overwriting archived flag on existing entries)
            var existing = null;
            for (var c = 0; c < intel.self.courses.length; c++) {
                var ec = intel.self.courses[c];
                if (ec && ec.code === code && ec.semester === sem) { existing = ec; break; }
            }
            if (!existing) {
                intel.self.courses.push({ code: code, semester: sem, source: 'frontpage' }); // No archived flag = active
                seeded = true;
            } else {
                // If this course/semester exists but was archived (or unknown source),
                // frontpage "Courses" section proves it is currently active.
                var touched = false;
                if (existing.archived) {
                    delete existing.archived;
                    touched = true;
                }
                if (!existing.source || String(existing.source).toLowerCase() === 'frontpage') {
                    if (existing.source !== 'frontpage') {
                        existing.source = 'frontpage';
                        touched = true;
                    }
                }
                if (touched) seeded = true;
            }
        }

        if (seeded) {
            try { saveParticipantIntel(intel); } catch (e) { }
        }
        return seeded;
    }

    function insertCampusnetSemesterTwinWidget() {
        if (!IS_TOP_WINDOW) return;

        var existing = document.querySelector('[data-dtu-campusnet-semester-twin]');
        if (!isCampusnetFrontpageDTU()) {
            if (existing) existing.remove();
            return;
        }

        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY) || !isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY)) {
            if (existing) existing.remove();
            return;
        }

        // CampusNet frontpage widgets can mount late via bindings; retry until we have a safe container.
        if (!canPlaceCampusnetSemesterTwinWidget()) {
            scheduleCampusnetSemesterTwinEnsure(350);
            return;
        }

        var now = Date.now();
        if ((now - _participantIntelSemesterTwinCampusnetLastTs) < 5000) {
            if (existing) {
                placeCampusnetSemesterTwinWidget(existing);
                applyCampusnetSemesterTwinTheme(existing, darkModeEnabled);
            }
            return;
        }
        _participantIntelSemesterTwinCampusnetLastTs = now;

        loadParticipantIntel(function (intel) {
            // Seed active courses from frontpage DOM (non-archived, current semester)
            seedActiveFrontpageCourses(intel);

            loadSemesterTwinPrefs(function (prefs) {
                var computed = computeSemesterTwinData(intel, prefs);
                renderCampusnetSemesterTwinWidget(computed.twins, computed.myTotal, computed.meta);
                scheduleCampusnetSemesterTwinEnsure(600);
            });
        });
    }

    // ---- Feature 3: Contextual Memory ("Where do I know you from?") ----

    function annotateParticipantHistory() {
        if (!isCampusnetParticipantPage()) return;
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY) || !isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY)) {
            document.querySelectorAll('[data-dtu-shared-history]').forEach(function (el) { el.remove(); });
            return;
        }

        var courseCode = getCampusnetCourseCodeFromPage();
        var semester = getCampusnetSemesterFromPage();
        var currentCourseCode = normalizeIntelCourseCode(courseCode);
        var currentSemester = normalizeIntelCourseSemester(semester);
        var userItems = getCampusnetUsersParticipantElements();
        if (!userItems.length) return;

        // Remove any old badges that ended up on non-user categories (admins/authors).
        var userSet = new Set(userItems);
        document.querySelectorAll('[data-dtu-shared-history]').forEach(function (badge) {
            var p = badge.closest && badge.closest('.ui-participant');
            if (!p || !userSet.has(p)) badge.remove();
        });

        loadParticipantIntel(function (intel) {
            var items = userItems;
            var isDark = darkModeEnabled;
            var selfSNumber = '';
            try {
                selfSNumber = (intel && intel.self && intel.self.sNumber) ? String(intel.self.sNumber).toLowerCase() : '';
            } catch (eSelf0) { selfSNumber = ''; }
            if (!selfSNumber) selfSNumber = detectCampusnetSelfSNumberFromHeader();
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var nameEl = item.querySelector('.ui-participant-fullname');
                if (!nameEl) continue;

                var existingBadge = nameEl.querySelector('[data-dtu-shared-history]');
                var infoEl = item.querySelector('.ui-participant-additional.user-information');
                if (!infoEl) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }
                var sMatch = infoEl.textContent.match(/\b(s\d{6})\b/i);
                if (!sMatch) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }
                var sNumber = sMatch[1].toLowerCase();
                if (selfSNumber && sNumber === selfSNumber) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }

                var student = intel.students[sNumber];
                if (!student || !student.courses || !student.courses.length) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }
                var dedupedStudentCourses = dedupeIntelCourseList(student.courses);
                var studentCourses = dedupedStudentCourses.list;

                // Find shared courses excluding the current one
                var shared = [];
                for (var c = 0; c < studentCourses.length; c++) {
                    var sc = studentCourses[c];
                    if (currentCourseCode && currentSemester && sc.code === currentCourseCode && sc.semester === currentSemester) continue;
                    var scName = '';
                    try { scName = intel.courseNames ? (intel.courseNames[sc.code] || '') : ''; } catch (eScNm) { scName = ''; }
                    if (!isCampusnetLikelyAcademicCourse(sc.code, scName, { title: scName })) continue;
                    shared.push(sc);
                }
                shared = collapseCourseEntriesByCode(shared);
                if (!shared.length) {
                    if (existingBadge) existingBadge.remove();
                    continue;
                }

                var badge = existingBadge;
                if (!badge) {
                    badge = document.createElement('span');
                    badge.setAttribute('data-dtu-shared-history', '1');
                    markExt(badge);
                    nameEl.appendChild(badge);
                }

                var sharedTitle = shared.map(function (s) {
                    var nm = '';
                    try { nm = intel.courseNames ? (intel.courseNames[s.code] || '') : ''; } catch (eName) { nm = ''; }
                    nm = normalizeWhitespace(nm);
                    return s.code + ' (' + s.semester + ')' + (nm ? ' - ' + nm : '');
                }).join('\n');
                if (shared.length === 1) {
                    badge.textContent = 'Shared ' + shared[0].code + ' (' + shared[0].semester + ')';
                } else {
                    badge.textContent = shared.length + ' shared courses';
                }
                badge.title = sharedTitle;

                badge.style.cssText = 'display:inline-block;margin-left:8px;padding:1px 6px;border-radius:3px;'
                    + 'font-size:10px;font-weight:600;vertical-align:middle;cursor:help;';
                badge.style.setProperty('background', isDark ? 'rgba(var(--dtu-ad-accent-rgb),0.2)' : 'rgba(var(--dtu-ad-accent-rgb),0.1)', 'important');
                badge.style.setProperty('background-color', isDark ? 'rgba(var(--dtu-ad-accent-rgb),0.2)' : 'rgba(var(--dtu-ad-accent-rgb),0.1)', 'important');
                badge.style.setProperty('color', isDark ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
            }
        });
    }

    function annotateProfileHistory() {
        if (!isCampusnetProfilePage()) return;
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY) || !isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY)) {
            var existing0 = document.querySelector('[data-dtu-profile-history]');
            if (existing0) existing0.remove();
            return;
        }

        // Extract s-number from profile page
        var sNumber = null;
        var tds = document.querySelectorAll('td');
        for (var i = 0; i < tds.length; i++) {
            var m = tds[i].textContent.match(/\b(s\d{6})\b/i);
            if (m) { sNumber = m[1].toLowerCase(); break; }
        }
        if (!sNumber) {
            var existing = document.querySelector('[data-dtu-profile-history]');
            if (existing) existing.remove();
            return;
        }

        loadParticipantIntel(function (intel) {
            var existing = document.querySelector('[data-dtu-profile-history]');
            var student = intel.students[sNumber];
            if (!student || !student.courses || !student.courses.length) {
                if (existing) existing.remove();
                return;
            }
            var dedupedStudentCourses = dedupeIntelCourseList(student.courses);
            var studentCourses = dedupedStudentCourses.list;

            var isDark = darkModeEnabled;
            var courseSig = studentCourses.map(function (c) { return (c.code || '') + '_' + (c.semester || ''); }).join('|');
            var sig = (isDark ? 'd' : 'l') + '|' + sNumber + '|' + courseSig;

            var showPerson = document.querySelector('.show-person');
            if (!showPerson) return;

            var card = existing;
            if (!card) {
                card = document.createElement('div');
                card.setAttribute('data-dtu-profile-history', '1');
                markExt(card);
                showPerson.appendChild(card);
            } else if (card.parentNode !== showPerson) {
                showPerson.appendChild(card);
            }

            if (card.getAttribute('data-dtu-profile-history-sig') === sig) return;
            card.setAttribute('data-dtu-profile-history-sig', sig);

            card.style.cssText = 'margin:12px 0;padding:12px 16px;border-radius:8px;'
                + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
            card.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
            card.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
            card.style.setProperty('border', isDark ? '1px solid #404040' : '1px solid #e0e0e0', 'important');
            card.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');

            while (card.firstChild) card.removeChild(card.firstChild);

            var title = document.createElement('div');
            markExt(title);
            title.textContent = 'Shared Course History';
            title.style.cssText = 'font-weight:700;font-size:14px;margin-bottom:8px;';
            title.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
            card.appendChild(title);

            for (var c = 0; c < studentCourses.length; c++) {
                var courseTag = document.createElement('span');
                markExt(courseTag);
                var cc = studentCourses[c].code;
                var ss = studentCourses[c].semester;
                var nm2 = '';
                try { nm2 = intel.courseNames ? (intel.courseNames[cc] || '') : ''; } catch (eName2) { nm2 = ''; }
                nm2 = normalizeWhitespace(nm2);
                if (!isCampusnetLikelyAcademicCourse(cc, nm2, { title: nm2 })) continue;
                courseTag.textContent = cc + ' (' + ss + ')';
                if (nm2) courseTag.title = nm2;
                courseTag.style.cssText = 'display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;border-radius:4px;font-size:12px;';
                courseTag.style.setProperty('background', isDark ? '#1a1a1a' : '#f0f0f0', 'important');
                courseTag.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f0f0f0', 'important');
                courseTag.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
                card.appendChild(courseTag);
            }
        });
    }

    // ---- Feature 4: Retention Radar ----

    var _retentionSnapshotInFlight = false;
    function recordRetentionSnapshot() {
        if (_retentionSnapshotInFlight) return;
        if (!isCampusnetParticipantPage()) return;
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY) || !isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_RETENTION_KEY)) {
            var old = document.querySelector('[data-dtu-retention-indicator]');
            if (old) old.remove();
            return;
        }

        var courseCode = getCampusnetCourseCodeFromPage();
        var semester = getCampusnetSemesterFromPage();
        if (!courseCode) return;

        var count = getCampusnetUsersCountFromPage();
        if (!count) count = getCampusnetUsersParticipantElements().length;
        if (!count) return;

        var rKey = courseCode + '_' + semester;

        _retentionSnapshotInFlight = true;
        loadParticipantIntel(function (intel) {
            _retentionSnapshotInFlight = false;
            if (!intel.retention[rKey]) intel.retention[rKey] = [];
            var snapshots = intel.retention[rKey];
            var now = Date.now();

            // Avoid duplicates within 6 hours
            if (snapshots.length > 0) {
                var last = snapshots[snapshots.length - 1];
                if ((now - last.ts) < 6 * 3600000) {
                    // Still render with existing data
                    renderRetentionIndicator(snapshots);
                    return;
                }
            }

            snapshots.push({ count: count, ts: now });
            if (snapshots.length > PARTICIPANT_INTEL_MAX_RETENTION) {
                intel.retention[rKey] = snapshots.slice(-PARTICIPANT_INTEL_MAX_RETENTION);
                snapshots = intel.retention[rKey];
            }

            saveParticipantIntel(intel);
            renderRetentionIndicator(snapshots);
        });
    }

    function renderRetentionIndicator(snapshots) {
        if (!snapshots || snapshots.length < 1) return;
        var meta = getCampusnetUsersCategoryMeta();
        var heading = meta && meta.headingEl ? meta.headingEl : document.querySelector('.ui-participant-categorybar h3');
        if (!heading) return;

        var latest = snapshots[snapshots.length - 1];
        var delta = null;
        var timeLabel = '';
        if (snapshots.length >= 2) {
            var previous = snapshots[snapshots.length - 2];
            delta = latest.count - previous.count;
            var diffMs = latest.ts - previous.ts;
            var daysDiff = Math.floor(diffMs / 86400000);
            var hoursDiff = Math.floor(diffMs / 3600000);
            if (daysDiff >= 2) timeLabel = 'since ' + daysDiff + ' days ago';
            else if (daysDiff === 1) timeLabel = 'since 1 day ago';
            else if (hoursDiff >= 1) timeLabel = 'since ' + hoursDiff + 'h ago';
            else timeLabel = 'since earlier today';
        }

        var isDark = darkModeEnabled;
        var indicator = document.querySelector('[data-dtu-retention-indicator]');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.setAttribute('data-dtu-retention-indicator', '1');
            markExt(indicator);
        }

        var text = latest.count + ' users';
        if (delta !== null && delta !== 0) {
            var sign = delta > 0 ? '+' : '';
            text += ' [' + sign + delta + ' ' + timeLabel + ']';
        }
        indicator.textContent = text;

        indicator.style.cssText = 'display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;margin-left:12px;vertical-align:middle;';
        indicator.style.setProperty('background', isDark ? '#1a1a1a' : '#f5f5f5', 'important');
        indicator.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f5f5f5', 'important');
        var color = isDark ? '#e0e0e0' : '#333';
        if (delta !== null) {
            if (delta < 0) color = '#ef5350';
            else if (delta > 0) color = '#4caf50';
        }
        indicator.style.setProperty('color', color, 'important');

        if (indicator.parentNode !== heading) heading.appendChild(indicator);
    }

    // ---- Optional: Archive backfill (CampusNet group archive) ----
    // Lets you populate Participant Intelligence by scanning archived course participant pages.
    // Runs locally and stores derived data in browser.storage.local.
    var _campusnetArchiveBackfillRunning = false;
    var _campusnetArchiveBackfillAbort = false;
    var _campusnetArchiveBackfillProgress = null;

    function getCampusnetParticipantCategoryMetaFromDoc(doc, labelRegex) {
        if (!doc || !labelRegex) return null;
        var headings = doc.querySelectorAll('.ui-participant-categorybar h3');
        for (var i = 0; i < headings.length; i++) {
            var txt = normalizeWhitespace(headings[i].textContent);
            if (!labelRegex.test(txt)) continue;

            var m = txt.match(/\((\d+)\)/);
            var count = m ? parseInt(m[1], 10) : null;
            return {
                headingEl: headings[i],
                barEl: headings[i].closest('.ui-participant-categorybar'),
                containerEl: headings[i].closest('.ui-participants-list-category'),
                count: isNaN(count) ? null : count
            };
        }
        return null;
    }

    function getCampusnetUsersCountFromDoc(doc) {
        var meta = getCampusnetParticipantCategoryMetaFromDoc(doc, /^(Users|Brugere)\b/i);
        return meta ? meta.count : null;
    }

    function getCampusnetUsersParticipantElementsFromDoc(doc) {
        var meta = getCampusnetParticipantCategoryMetaFromDoc(doc, /^(Users|Brugere)\b/i);
        if (meta && meta.containerEl) {
            var within = Array.from(meta.containerEl.querySelectorAll('.ui-participant'));
            if (within.length) return within;
        }

        var bar = meta ? meta.barEl : null;
        if (bar) {
            var items = [];
            var seen = new Set();
            var node = bar.nextElementSibling;
            var guard = 0;
            while (node && guard < 6000) {
                guard++;
                if (node.classList && node.classList.contains('ui-participant-categorybar')) break;

                if (node.classList && node.classList.contains('ui-participant')) {
                    if (!seen.has(node)) { seen.add(node); items.push(node); }
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('.ui-participant').forEach(function (p) {
                        if (!seen.has(p)) { seen.add(p); items.push(p); }
                    });
                }
                node = node.nextElementSibling;
            }
            if (items.length) return items;
        }

        return Array.from(doc.querySelectorAll('.ui-participant'));
    }

    function parseParticipantListFromDoc(doc) {
        var participants = [];
        if (!doc) return participants;
        var items = getCampusnetUsersParticipantElementsFromDoc(doc);
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var entry = {};

            var nameEl = item.querySelector('.ui-participant-fullname a');
            if (nameEl) {
                entry.name = normalizeWhitespace(nameEl.textContent);
                var href = nameEl.getAttribute('href') || '';
                var idMatch = href.match(/id=(\d+)/i);
                if (idMatch) entry.userId = idMatch[1];
            }

            var infoEl = item.querySelector('.ui-participant-additional.user-information');
            if (infoEl) {
                var sMatch = infoEl.textContent.match(/\b(s\d{6})\b/i);
                if (sMatch) entry.sNumber = sMatch[1].toLowerCase();
            }

            var idx = null;
            var arrow = item.querySelector('.ui-participants-arrow');
            if (arrow) {
                var arrowId = arrow.getAttribute('id') || '';
                var idMatch2 = arrowId.match(/participantarrow(\d+)/i);
                if (idMatch2) idx = parseInt(idMatch2[1], 10);
                if (idx === null || isNaN(idx)) {
                    var onclick = arrow.getAttribute('onclick') || '';
                    var onMatch = onclick.match(/\((\d+)\)/);
                    if (onMatch) idx = parseInt(onMatch[1], 10);
                }
            }
            if (idx === null || isNaN(idx)) idx = i;

            var infoBox = doc.getElementById('participantinformation' + idx);
            if (!infoBox) infoBox = item.nextElementSibling;
            if (!infoBox) {
                var sib = item.nextElementSibling;
                while (sib && !sib.classList.contains('ui-participant')) {
                    if (sib.classList.contains('ui-participant-informationbox')) { infoBox = sib; break; }
                    sib = sib.nextElementSibling;
                }
            }

            if (infoBox) {
                var headers = infoBox.querySelectorAll('.info-header span');
                for (var h = 0; h < headers.length; h++) {
                    if (/education|uddannelse/i.test(headers[h].textContent)) {
                        var infoDiv = headers[h].closest('.ui-participant-infobox');
                        if (infoDiv) {
                            var lists = infoDiv.querySelectorAll('.ui-participants-infolist p');
                            if (lists.length) {
                                entry.program = normalizeProgramLabel(lists[0].textContent);
                            } else {
                                var children = infoDiv.children;
                                for (var c = 0; c < children.length; c++) {
                                    if (!children[c].classList.contains('info-header')) {
                                        var txt = normalizeProgramLabel(children[c].textContent);
                                        if (txt) { entry.program = txt; break; }
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            }

            if (entry.sNumber) participants.push(entry);
        }
        return participants;
    }

    // Parse archived elements from any document (live DOM or fetched).
    function parseCampusnetArchivedElementsFromDoc(doc) {
        var out = [];
        if (!doc || !doc.querySelectorAll) return out;
        doc.querySelectorAll('article.archived-element[data-id]').forEach(function (article) {
            if (!article) return;
            var id = (article.getAttribute('data-id') || '').trim();
            var link = article.querySelector('.archived-element__title a[href*=\"/cnnet/element/\"]');
            if (!link) return;

            var href = link.getAttribute('href') || '';
            var m = href.match(/\/cnnet\/element\/(\d+)\//i);
            if (m) id = m[1];
            if (!id) return;

            var title = normalizeWhitespace(link.textContent);
            var codeHint = null;
            var codeMatch = title.match(/\b(\d{5}|KU\d{3})\b/i);
            if (codeMatch) codeHint = (codeMatch[1] || '').toUpperCase();
            var semesterHint = parseDTUSemesterFromText(title);
            if (codeHint && !isCampusnetLikelyAcademicCourse(codeHint, title, { title: title })) return;

            out.push({
                elementId: id,
                title: title,
                href: href,
                codeHint: codeHint,
                semesterHint: semesterHint
            });
        });
        return out;
    }

    function parseCampusnetArchivedElements() {
        if (!isCampusnetGroupArchivePage()) return [];
        return parseCampusnetArchivedElementsFromDoc(document);
    }

    // Fetch the archive page remotely and parse archived elements from it.
    function fetchAndParseArchivedElements() {
        return fetchCampusnetDoc('/cnnet/grouparchive/default').then(function (doc) {
            return parseCampusnetArchivedElementsFromDoc(doc);
        });
    }

    function formatShortDateTime(ts) {
        if (!ts || typeof ts !== 'number') return 'never';
        try {
            var d = new Date(ts);
            var yyyy = d.getFullYear();
            var mm = String(d.getMonth() + 1).padStart(2, '0');
            var dd = String(d.getDate()).padStart(2, '0');
            var hh = String(d.getHours()).padStart(2, '0');
            var mi = String(d.getMinutes()).padStart(2, '0');
            return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
        } catch (e) { }
        return 'never';
    }

    function fetchCampusnetDoc(url) {
        var absUrl = url;
        try {
            // Content scripts can run with an extension origin base; force absolute URLs to CampusNet.
            absUrl = new URL(url, window.location.origin).toString();
        } catch (e0) {
            try {
                absUrl = 'https://campusnet.dtu.dk' + String(url || '');
            } catch (e1) {
                absUrl = String(url || '');
            }
        }

        return fetch(absUrl, { credentials: 'same-origin', cache: 'no-store' }).then(function (res) {
            if (!res || !res.ok) throw new Error('http_' + (res ? res.status : '0'));
            return res.text();
        }).then(function (html) {
            var doc = null;
            try {
                doc = new DOMParser().parseFromString(html, 'text/html');
            } catch (e) {
                doc = null;
            }
            if (!doc || !doc.querySelectorAll) throw new Error('parse_empty');
            return doc;
        });
    }

    function fetchBestCampusnetParticipantsDoc(elementId) {
        // Archived participant pages often require specific query params to return the list server-side.
        // Example working URL:
        // /cnnet/element/771293/participants?groupType=Rights&query=&sortField=LastName&page=0&showClosed=True&displayType=list&itemsPerPage=1500
        var base = '/cnnet/element/' + elementId + '/participants'
            + '?groupType=Rights&query=&sortField=LastName&page=0&showClosed=True&displayType=list';
        var candidates = [
            base + '&itemsPerPage=1500',
            base + '&itemsperpage=1500',
            base + '&itemsPerPage=1000',
            base + '&itemsPerPage=500',
            base
        ];

        var best = null;
        var lastErr = '';
        var chain = Promise.resolve();
        candidates.forEach(function (url) {
            chain = chain.then(function () {
                if (_campusnetArchiveBackfillAbort) return null;
                if (best && best.usersCount && best.loaded >= best.usersCount) return null;
                return fetchCampusnetDoc(url).then(function (doc) {
                    var loaded = getCampusnetUsersParticipantElementsFromDoc(doc).length;
                    var usersCount = getCampusnetUsersCountFromDoc(doc);
                    var rec = { url: url, doc: doc, loaded: loaded, usersCount: usersCount };

                    if (!best) best = rec;
                    else if (rec.loaded > best.loaded) best = rec;
                    else if (rec.loaded === best.loaded && rec.usersCount && best.usersCount
                        && rec.usersCount === rec.loaded && best.usersCount !== best.loaded) {
                        best = rec;
                    }
                    return null;
                }).catch(function (e) {
                    try { lastErr = (e && e.message) ? String(e.message) : 'fetch_error'; } catch (e2) { lastErr = 'fetch_error'; }
                    return null;
                });
            });
        });

        return chain.then(function () {
            if (best) return best;
            return { url: candidates[0] || '', doc: null, loaded: 0, usersCount: null, err: lastErr || 'fetch_failed' };
        });
    }

    function upsertParticipantsIntoIntel(intel, participants, courseCode, semester, courseName, opts) {
        courseCode = normalizeIntelCourseCode(courseCode);
        semester = normalizeIntelCourseSemester(semester);
        var sourceTitle = (opts && opts.title) ? String(opts.title) : '';
        if (!isCampusnetLikelyAcademicCourse(courseCode, courseName, { title: sourceTitle })) return;
        var isArchived = !!(opts && opts.archived);
        var now = Date.now();
        if (courseCode && courseName) {
            var existingName = intel.courseNames ? intel.courseNames[courseCode] : null;
            if (!existingName || existingName.length < courseName.length) {
                intel.courseNames[courseCode] = courseName;
            }
        }

        for (var i = 0; i < participants.length; i++) {
            var p = participants[i];
            if (!p || !p.sNumber) continue;

            if (!intel.students[p.sNumber]) {
                intel.students[p.sNumber] = { name: p.name || '', program: p.program || '', courses: [], lastSeen: now };
            }
            var student = intel.students[p.sNumber];
            student.name = p.name || student.name;
            if (p.program) student.program = p.program;
            student.lastSeen = now;
            if (!student.courses) student.courses = [];

            if (courseCode && semester) {
                var alreadyHas = student.courses.some(function (c) { return c.code === courseCode && c.semester === semester; });
                if (!alreadyHas) {
                    var entry = { code: courseCode, semester: semester };
                    if (isArchived) entry.archived = true;
                    student.courses.push(entry);
                }
            }

            // If we already know who "self" is, extend self course history from backfilled pages too.
            if (intel.self && intel.self.sNumber && p.sNumber === intel.self.sNumber) {
                if (p.name) intel.self.name = p.name;
                if (p.program) intel.self.program = p.program;
                if (!intel.self.courses) intel.self.courses = [];
                if (courseCode && semester) {
                    var selfHas = intel.self.courses.some(function (c) { return c.code === courseCode && c.semester === semester; });
                    if (!selfHas) {
                        var selfEntry = { code: courseCode, semester: semester };
                        if (isArchived) selfEntry.archived = true;
                        intel.self.courses.push(selfEntry);
                    }
                }
            }
        }

        var sNumbers = Object.keys(intel.students);
        if (sNumbers.length > PARTICIPANT_INTEL_MAX_STUDENTS) {
            sNumbers.sort(function (a, b) { return intel.students[a].lastSeen - intel.students[b].lastSeen; });
            var toRemove = sNumbers.length - PARTICIPANT_INTEL_MAX_STUDENTS;
            for (var r = 0; r < toRemove; r++) delete intel.students[sNumbers[r]];
        }
    }

    function updateCampusnetArchiveBackfillWidgetStatus(text) {
        var widget = document.querySelector('[data-dtu-archive-backfill]');
        if (!widget) return;
        var statusEl = widget.querySelector('[data-dtu-archive-backfill-status]');
        if (!statusEl) return;
        if (statusEl.textContent === text) return;
        statusEl.textContent = text;
    }

    function stopCampusnetArchiveBackfill() {
        _campusnetArchiveBackfillAbort = true;
        updateCampusnetArchiveBackfillWidgetStatus('Stopping...');
    }

    function runCampusnetArchiveBackfill(queue, intel) {
        if (_campusnetArchiveBackfillRunning) return;
        if (!queue || !queue.length) {
            updateCampusnetArchiveBackfillWidgetStatus('Nothing new to scan.');
            return;
        }

        _campusnetArchiveBackfillRunning = true;
        _campusnetArchiveBackfillAbort = false;
        _campusnetArchiveBackfillProgress = { total: queue.length, done: 0, ok: 0, failed: 0, lastTitle: '', lastError: '' };

        // The group archive list itself already means you are a member of these elements.
        // Seed self course history from the archive metadata (even if the participant list is truncated).
        try {
            if (intel && intel.self && intel.self.sNumber) {
                if (!intel.self.courses) intel.self.courses = [];
                var seedList = queue.slice(0);
                for (var si = 0; si < seedList.length; si++) {
                    var it = seedList[si];
                    if (!it || !it.codeHint) continue;
                    if (!isCampusnetLikelyAcademicCourse(it.codeHint, it.title, { title: it.title })) continue;
                    var sem = it.semesterHint;
                    if (!sem) continue; // Don't guess semester; backfill will resolve it from the page
                    var has = intel.self.courses.some(function (c) { return c && c.code === it.codeHint && c.semester === sem; });
                    if (!has) intel.self.courses.push({ code: it.codeHint, semester: sem, archived: true });
                }
                try { saveParticipantIntel(intel); } catch (eSeedSave) { }
            }
        } catch (eSeed) { }

        function afterOne() {
            _campusnetArchiveBackfillProgress.done++;
            setTimeout(step, 280);
        }

        function step() {
            // Abort if we navigated away from CampusNet entirely (but allow any CampusNet page,
            // since the scanner can be triggered from the frontpage Semester Twins widget).
            if (window.location.hostname !== 'campusnet.dtu.dk') {
                _campusnetArchiveBackfillAbort = true;
            }

            if (_campusnetArchiveBackfillAbort) {
                _campusnetArchiveBackfillRunning = false;
                _campusnetArchiveBackfillAbort = false;
                try { saveParticipantIntel(intel); } catch (e0) { }
                updateCampusnetArchiveBackfillWidgetStatus('Scan stopped. (' + _campusnetArchiveBackfillProgress.done + '/' + _campusnetArchiveBackfillProgress.total + ')');
                _campusnetArchiveBackfillProgress = null;
                return;
            }

            var item = queue.shift();
            if (!item) {
                _campusnetArchiveBackfillRunning = false;
                intel.backfill.lastRunTs = Date.now();
                try { saveParticipantIntel(intel); } catch (e1) { }
                var lastErr = _campusnetArchiveBackfillProgress.lastError ? (' Last error: ' + _campusnetArchiveBackfillProgress.lastError) : '';
                updateCampusnetArchiveBackfillWidgetStatus('Scan finished. OK: ' + _campusnetArchiveBackfillProgress.ok + ', failed: ' + _campusnetArchiveBackfillProgress.failed + '.' + lastErr);
                _campusnetArchiveBackfillProgress = null;
                return;
            }

            _campusnetArchiveBackfillProgress.lastTitle = item.title || ('element ' + item.elementId);
            updateCampusnetArchiveBackfillWidgetStatus(
                'Scanning: ' + _campusnetArchiveBackfillProgress.done + '/' + _campusnetArchiveBackfillProgress.total
                + ' (OK ' + _campusnetArchiveBackfillProgress.ok + ', failed ' + _campusnetArchiveBackfillProgress.failed + ')'
                + ' | Now: ' + _campusnetArchiveBackfillProgress.lastTitle
            );

            fetchBestCampusnetParticipantsDoc(item.elementId).then(function (best) {
                if (!best || !best.doc) throw new Error((best && best.err) ? best.err : 'fetch_failed');

                var doc = best.doc;
                var courseCode = getCampusnetCourseCodeFromPage(doc) || item.codeHint || null;
                var semester = getCampusnetExplicitSemesterFromPage(doc) || item.semesterHint || null;
                var courseName = getCampusnetCourseNameFromPage(courseCode, doc);

                var participants = parseParticipantListFromDoc(doc);
                if (!participants.length) throw new Error('no_participants');

                upsertParticipantsIntoIntel(intel, participants, courseCode, semester, courseName, { archived: true, title: (item && item.title) ? item.title : '' });
                intel.backfill.scanned[item.elementId] = Date.now();
                _campusnetArchiveBackfillProgress.ok++;

                try { saveParticipantIntel(intel); } catch (e2) { }
                afterOne();
            }).catch(function (e) {
                _campusnetArchiveBackfillProgress.failed++;
                try { _campusnetArchiveBackfillProgress.lastError = (e && e.message) ? String(e.message) : 'scan_failed'; } catch (e2) { _campusnetArchiveBackfillProgress.lastError = 'scan_failed'; }
                afterOne();
            });
        }

        step();
    }

    var _archiveBackfillInsertPending = false;
    function insertCampusnetArchiveBackfillWidget() {
        var existing = document.querySelector('[data-dtu-archive-backfill]');
        if (!isCampusnetGroupArchivePage()) {
            if (existing) existing.remove();
            return;
        }

        var sharedHistoryEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY);
        var semesterTwinsEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY);
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY) || (!sharedHistoryEnabled && !semesterTwinsEnabled)) {
            if (existing) existing.remove();
            return;
        }

        // Guard against multiple async callbacks creating duplicate widgets.
        if (!existing && _archiveBackfillInsertPending) return;

        var anchor = document.querySelector('.archived-elements__content') || document.querySelector('main') || document.body;
        if (!anchor) return;

        var isDark = darkModeEnabled;
        var items = parseCampusnetArchivedElements();
        var courseItems = items.filter(function (it) {
            return !!it.codeHint && isCampusnetLikelyAcademicCourse(it.codeHint, it.title, { title: it.title });
        });

        if (!existing) _archiveBackfillInsertPending = true;
        loadParticipantIntel(function (intel) {
            _archiveBackfillInsertPending = false;
            // Re-check if another callback already created the widget.
            existing = document.querySelector('[data-dtu-archive-backfill]');
            var scanned = intel.backfill && intel.backfill.scanned ? intel.backfill.scanned : {};
            var scannedCount = 0;
            courseItems.forEach(function (it) { if (scanned && scanned[it.elementId]) scannedCount++; });

            // Ensure your own course history includes archived course codes from the archive list itself.
            // This is important because fetched participant pages can be truncated and may not include you.
            var seeded = 0;
            try {
                if (intel && intel.self && intel.self.sNumber) {
                    if (!intel.self.courses) intel.self.courses = [];
                    for (var si = 0; si < courseItems.length; si++) {
                        var it0 = courseItems[si];
                        if (!it0 || !it0.codeHint) continue;
                        if (!isCampusnetLikelyAcademicCourse(it0.codeHint, it0.title, { title: it0.title })) continue;
                        var sem0 = it0.semesterHint;
                        if (!sem0) continue; // Don't guess semester; backfill resolves it from the page
                        var has0 = intel.self.courses.some(function (c) { return c && c.code === it0.codeHint && c.semester === sem0; });
                        if (!has0) {
                            intel.self.courses.push({ code: it0.codeHint, semester: sem0, archived: true });
                            seeded++;
                        }
                    }
                    if (seeded) saveParticipantIntel(intel);
                }
            } catch (eSeed2) { }

            var lastRun = intel.backfill ? intel.backfill.lastRunTs : 0;
            var autoWeekly = !!(intel.backfill && intel.backfill.autoWeekly);
            var due = autoWeekly && (!lastRun || (Date.now() - lastRun) > 7 * 86400000);

            var status = '';
            if (_campusnetArchiveBackfillRunning && _campusnetArchiveBackfillProgress) {
                var nowTitle = _campusnetArchiveBackfillProgress.lastTitle ? (' Now: ' + _campusnetArchiveBackfillProgress.lastTitle) : '';
                var lastErr = _campusnetArchiveBackfillProgress.lastError ? (' Last error: ' + _campusnetArchiveBackfillProgress.lastError) : '';
                status = 'Scanning: ' + _campusnetArchiveBackfillProgress.done + '/' + _campusnetArchiveBackfillProgress.total
                    + ' (OK ' + _campusnetArchiveBackfillProgress.ok + ', failed ' + _campusnetArchiveBackfillProgress.failed + ').' + nowTitle + lastErr;
            } else {
                status = 'Past courses: ' + courseItems.length + ' detected. Scanned: ' + scannedCount + '. Last scan: ' + formatShortDateTime(lastRun) + '.';
                if (seeded) status += ' Added ' + seeded + ' courses to your history.';
                if (due) status += ' Auto weekly scan is due.';
            }

            var sig = (isDark ? 'd' : 'l') + '|' + items.length + '|' + courseItems.length + '|' + scannedCount + '|'
                + (autoWeekly ? 'aw1' : 'aw0') + '|' + lastRun + '|' + (_campusnetArchiveBackfillRunning ? 'run1' : 'run0') + '|'
                + status;

            var widget = existing;
            if (!widget) {
                widget = document.createElement('div');
                widget.setAttribute('data-dtu-archive-backfill', '1');
                markExt(widget);
                widget.style.cssText = 'margin:12px 0 18px;padding:14px 16px;border-radius:12px;'
                    + 'font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif;';

                var title = document.createElement('div');
                title.setAttribute('data-dtu-archive-backfill-title', '1');
                markExt(title);
                title.textContent = 'Course History Scanner';
                title.style.cssText = 'font-weight:800;font-size:14px;margin-bottom:6px;';
                widget.appendChild(title);

                var statusEl = document.createElement('div');
                statusEl.setAttribute('data-dtu-archive-backfill-status', '1');
                markExt(statusEl);
                statusEl.style.cssText = 'font-size:12px;opacity:0.85;line-height:1.35;';
                widget.appendChild(statusEl);

                var row = document.createElement('div');
                markExt(row);
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;flex-wrap:wrap;';

                var left = document.createElement('div');
                markExt(left);
                left.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

                var startBtn = document.createElement('button');
                startBtn.type = 'button';
                startBtn.setAttribute('data-dtu-archive-backfill-start', '1');
                markExt(startBtn);
                startBtn.textContent = 'Scan course history';
                startBtn.style.cssText = 'padding:8px 12px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;border:1px solid transparent;';
                startBtn.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                startBtn.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                startBtn.style.setProperty('color', '#ffffff', 'important');

                var stopBtn = document.createElement('button');
                stopBtn.type = 'button';
                stopBtn.setAttribute('data-dtu-archive-backfill-stop', '1');
                markExt(stopBtn);
                stopBtn.textContent = 'Stop';
                stopBtn.style.cssText = 'padding:8px 12px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;border:1px solid transparent;';

                left.appendChild(startBtn);
                left.appendChild(stopBtn);
                row.appendChild(left);

                var autoLabel = document.createElement('label');
                autoLabel.setAttribute('data-dtu-archive-backfill-auto', '1');
                markExt(autoLabel);
                autoLabel.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;user-select:none;';

                var autoInput = document.createElement('input');
                autoInput.type = 'checkbox';
                autoInput.setAttribute('data-dtu-archive-backfill-auto-input', '1');
                markExt(autoInput);
                autoInput.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:var(--dtu-ad-accent);';

                var autoText = document.createElement('span');
                markExt(autoText);
                autoText.textContent = 'Auto scan weekly';

                autoLabel.appendChild(autoInput);
                autoLabel.appendChild(autoText);
                row.appendChild(autoLabel);

                widget.appendChild(row);

                var note = document.createElement('div');
                markExt(note);
                note.textContent = 'Scans your past courses to find classmates for Semester Twins. Data is stored locally on your device.';
                note.style.cssText = 'font-size:11px;opacity:0.6;margin-top:10px;line-height:1.35;';
                widget.appendChild(note);

                startBtn.addEventListener('click', function () {
                    if (_campusnetArchiveBackfillRunning) return;
                    loadParticipantIntel(function (intel2) {
                        var list = parseCampusnetArchivedElements();
                        var scanned2 = (intel2.backfill && intel2.backfill.scanned) ? intel2.backfill.scanned : {};
                        var queue = list.filter(function (it) {
                            return !!it.codeHint
                                && isCampusnetLikelyAcademicCourse(it.codeHint, it.title, { title: it.title })
                                && !scanned2[it.elementId];
                        });
                        if (!queue.length) {
                            updateCampusnetArchiveBackfillWidgetStatus('Nothing new to scan. (All archived courses were already scanned.)');
                            intel2.backfill.lastRunTs = Date.now();
                            saveParticipantIntel(intel2);
                            return;
                        }
                        runCampusnetArchiveBackfill(queue, intel2);
                    });
                });

                stopBtn.addEventListener('click', function () {
                    if (!_campusnetArchiveBackfillRunning) return;
                    stopCampusnetArchiveBackfill();
                });

                autoInput.addEventListener('change', function () {
                    loadParticipantIntel(function (intel3) {
                        intel3.backfill.autoWeekly = !!autoInput.checked;
                        saveParticipantIntel(intel3);
                    });
                });

                existing = widget;
            }

            widget.style.setProperty('background', isDark ? '#2d2d2d' : '#ffffff', 'important');
            widget.style.setProperty('background-color', isDark ? '#2d2d2d' : '#ffffff', 'important');
            widget.style.setProperty('border', isDark ? '1px solid #404040' : '1px solid #e0e0e0', 'important');
            widget.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');

            var titleEl = widget.querySelector('[data-dtu-archive-backfill-title]');
            if (titleEl) titleEl.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');

            var statusEl2 = widget.querySelector('[data-dtu-archive-backfill-status]');
            if (statusEl2) statusEl2.textContent = status;

            var autoInputEl = widget.querySelector('[data-dtu-archive-backfill-auto-input]');
            if (autoInputEl) autoInputEl.checked = autoWeekly;

            var stopBtnEl = widget.querySelector('[data-dtu-archive-backfill-stop]');
            if (stopBtnEl) {
                stopBtnEl.style.setProperty('background', isDark ? '#1a1a1a' : '#f5f5f5', 'important');
                stopBtnEl.style.setProperty('background-color', isDark ? '#1a1a1a' : '#f5f5f5', 'important');
                stopBtnEl.style.setProperty('color', isDark ? '#e0e0e0' : '#333', 'important');
            }

            var startBtnEl = widget.querySelector('[data-dtu-archive-backfill-start]');
            if (startBtnEl) startBtnEl.disabled = _campusnetArchiveBackfillRunning;
            if (stopBtnEl) stopBtnEl.disabled = !_campusnetArchiveBackfillRunning;

            if (widget.getAttribute('data-dtu-archive-backfill-sig') === sig) return;
            widget.setAttribute('data-dtu-archive-backfill-sig', sig);

            if (widget.parentNode !== anchor) {
                if (anchor.firstChild) anchor.insertBefore(widget, anchor.firstChild);
                else anchor.appendChild(widget);
            } else if (anchor.firstChild !== widget) {
                anchor.insertBefore(widget, anchor.firstChild);
            }

            if (due && !_campusnetArchiveBackfillRunning && !document.hidden) {
                var queue2 = courseItems.filter(function (it) { return !scanned[it.elementId]; });
                if (queue2.length) {
                    runCampusnetArchiveBackfill(queue2, intel);
                } else {
                    intel.backfill.lastRunTs = Date.now();
                    saveParticipantIntel(intel);
                }
            }
        });
    }

    // ---- Master bootstrap function ----

    function scheduleAnnotateParticipantHistory(delayMs) {
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY) || !isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY)) return;
        if (_participantIntelAnnotateTimer) return;
        _participantIntelAnnotateTimer = setTimeout(function () {
            _participantIntelAnnotateTimer = null;
            annotateParticipantHistory();
        }, delayMs || 260);
    }

    function insertParticipantIntelligence() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_KEY)) {
            if (_participantIntelAnnotateTimer) {
                clearTimeout(_participantIntelAnnotateTimer);
                _participantIntelAnnotateTimer = null;
            }
            document.querySelectorAll(
                '[data-dtu-participant-demographics],[data-dtu-shared-history],'
                + '[data-dtu-retention-indicator],[data-dtu-profile-history],[data-dtu-archive-backfill]'
            ).forEach(function (el) { el.remove(); });
            return;
        }

        var demographicsEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY);
        var sharedHistoryEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY);
        var semesterTwinsEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY);
        var retentionEnabled = isFeatureFlagEnabled(FEATURE_PARTICIPANT_INTEL_RETENTION_KEY);

        if (isCampusnetParticipantPage()) {
            // Fast cleanup when sub-features are toggled off.
            if (!demographicsEnabled) {
                var oldDemo = document.querySelector('[data-dtu-participant-demographics]');
                if (oldDemo) oldDemo.remove();
            }
            if (!sharedHistoryEnabled) {
                if (_participantIntelAnnotateTimer) {
                    clearTimeout(_participantIntelAnnotateTimer);
                    _participantIntelAnnotateTimer = null;
                }
                document.querySelectorAll('[data-dtu-shared-history]').forEach(function (el) { el.remove(); });
            }
            if (!retentionEnabled) {
                var oldRet = document.querySelector('[data-dtu-retention-indicator]');
                if (oldRet) oldRet.remove();
            }

            // Prefer showing all users on one page (max page size is typically 1500).
            // This makes composition + history badges accurate without requiring manual pagination.
            if (demographicsEnabled || sharedHistoryEnabled || semesterTwinsEnabled) {
                if (ensureCampusnetParticipantsPageSizeMax()) {
                    // Retention uses the header "Users (N)" count, so it can still run immediately.
                    if (retentionEnabled) recordRetentionSnapshot();
                    return;
                }
            }

            // If we just requested a larger page size, give CampusNet a moment to refresh the list
            // before we scrape (avoids storing/visualizing an incomplete first page).
            if ((demographicsEnabled || sharedHistoryEnabled || semesterTwinsEnabled)
                && _participantIntelPageSizeAdjustTs && (Date.now() - _participantIntelPageSizeAdjustTs) < 5500) {
                var totalUsers = getCampusnetUsersCountFromPage();
                var loadedUsers = getCampusnetUsersParticipantElements().length;
                var likelyComplete = false;
                if (totalUsers && loadedUsers) {
                    if (loadedUsers >= totalUsers) likelyComplete = true;
                    else if (totalUsers > 1500 && loadedUsers >= 1500) likelyComplete = true;
                }
                if (!likelyComplete) {
                    if (retentionEnabled) recordRetentionSnapshot();
                    return;
                }
                _participantIntelPageSizeAdjustTs = 0;
            }

            if (sharedHistoryEnabled || semesterTwinsEnabled) collectParticipantData();
            if (demographicsEnabled) insertParticipantDemographics();
            if (sharedHistoryEnabled) {
                // Delay slightly so the storage write from collectParticipantData has time to settle.
                scheduleAnnotateParticipantHistory(320);
            }
            if (retentionEnabled) recordRetentionSnapshot();
        }

        if (isCampusnetProfilePage()) {
            annotateProfileHistory();
        }

        if (isCampusnetGroupArchivePage()) {
            insertCampusnetArchiveBackfillWidget();
        } else {
            var oldBackfill = document.querySelector('[data-dtu-archive-backfill]');
            if (oldBackfill) oldBackfill.remove();
        }
    }

    // ===== CONTENT SHORTCUT BUTTON =====
    // Adds a small "Content" button to each course card on the homepage
    // that links directly to /d2l/le/lessons/{courseId}

    // Standalone button CSS â€” injected into card shadow roots when dark mode styles aren't present
    const contentBtnShadowCSS = `
        a.dtu-dark-content-btn,
        a.dtu-dark-content-btn:link,
        a.dtu-dark-content-btn:visited {
            position: absolute !important;
            bottom: 6px !important;
            right: 6px !important;
            transform: translate(195px, 60px) !important;
            min-width: 42px !important;
            min-height: 42px !important;
            width: 42px !important;
            height: 42px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 6px !important;
            background-color: #2d2d2d !important;
            color: #ffffff !important;
            font-size: 18px !important;
            font-family: sans-serif !important;
            text-decoration: none !important;
            cursor: pointer !important;
            z-index: 5 !important;
            border: none !important;
            box-sizing: border-box !important;
            line-height: 1 !important;
            transition: opacity 0.2s, background-color 0.2s !important;
            padding: 0 !important;
            margin: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        :host(:hover) a.dtu-dark-content-btn,
        .d2l-card-container:hover a.dtu-dark-content-btn,
        .d2l-card-header:hover a.dtu-dark-content-btn {
            opacity: 1 !important;
            pointer-events: auto !important;
        }
        a.dtu-dark-content-btn:hover {
            background-color: rgba(0, 0, 0, 0.85) !important;
        }
    `;

    // Recursively find all elements matching a selector, traversing shadow roots
    function deepQueryAll(selector, root) {
        const results = [];
        if (!root) return results;
        if (root.matches && root.matches(selector)) {
            results.push(root);
        }

        const pendingRoots = [root.shadowRoot || root];
        while (pendingRoots.length > 0) {
            const searchRoot = pendingRoots.pop();
            if (!searchRoot || !searchRoot.querySelectorAll) continue;

            searchRoot.querySelectorAll(selector).forEach(match => results.push(match));

            const walker = document.createTreeWalker(searchRoot, NodeFilter.SHOW_ELEMENT, null);
            let el = walker.nextNode();
            while (el) {
                if (el.shadowRoot) {
                    pendingRoots.push(el.shadowRoot);
                }
                el = walker.nextNode();
            }
        }

        return results;
    }

    function parseCourseIdFromString(str) {
        if (!str) return null;
        const patterns = [
            /\/d2l\/home\/(\d+)/i,
            /[?&]ou=(\d+)/i,
            /\/org(?:units?|Units?)\/(\d+)/i,
            /(?:orgUnitId|courseOfferingId|offeringId)[=:"\s]+(\d+)/i
        ];
        for (var i = 0; i < patterns.length; i++) {
            var match = str.match(patterns[i]);
            if (match && match[1]) return match[1];
        }
        return null;
    }

    function normalizeD2LPath(urlStr) {
        if (!urlStr) return null;
        try {
            const parsed = new URL(urlStr, location.origin);
            if (parsed.pathname && parsed.pathname.startsWith('/d2l/')) {
                return parsed.pathname + parsed.search + parsed.hash;
            }
        } catch (e) { }
        if (/^\/d2l\//.test(urlStr)) return urlStr;
        return null;
    }

    function extractCourseId(ec, card, roots) {
        const candidates = [];
        if (ec) {
            candidates.push(ec.getAttribute('href') || '');
            if (ec.attributes) {
                for (var i = 0; i < ec.attributes.length; i++) {
                    const attr = ec.attributes[i];
                    if (/(ou|org|course|offering)/i.test(attr.name)) {
                        candidates.push(attr.value || '');
                    }
                }
            }
        }
        if (card) {
            candidates.push(card.getAttribute('href') || '');
            if (card.attributes) {
                for (var j = 0; j < card.attributes.length; j++) {
                    const cardAttr = card.attributes[j];
                    if (/(ou|org|course|offering)/i.test(cardAttr.name)) {
                        candidates.push(cardAttr.value || '');
                    }
                }
            }
        }
        roots.forEach(root => {
            if (!root || !root.querySelectorAll) return;
            root.querySelectorAll('[href]').forEach(linkEl => {
                candidates.push(linkEl.getAttribute('href') || '');
            });
        });
        for (var k = 0; k < candidates.length; k++) {
            var id = parseCourseIdFromString(candidates[k]);
            if (id) return id;
        }
        return null;
    }

    function extractFallbackHref(ec, card, roots) {
        const candidates = [];
        if (card) candidates.push(card.getAttribute('href') || '');
        if (ec) candidates.push(ec.getAttribute('href') || '');
        roots.forEach(root => {
            if (!root || !root.querySelectorAll) return;
            root.querySelectorAll('[href]').forEach(linkEl => {
                candidates.push(linkEl.getAttribute('href') || '');
            });
        });
        for (var i = 0; i < candidates.length; i++) {
            var normalized = normalizeD2LPath(candidates[i]);
            if (normalized) return normalized;
        }
        return null;
    }

    let _contentShortcutsLastEnabled = null;

    function insertContentButtons(rootNode) {
        if (!IS_TOP_WINDOW) return;
        if (!isDTULearnHomepage()) return;
        if (!isFeatureFlagEnabled(FEATURE_CONTENT_SHORTCUT_KEY)) {
            if (_contentShortcutsLastEnabled !== false) {
                _contentShortcutsLastEnabled = false;
                removeContentButtons();
            }
            return;
        }
        _contentShortcutsLastEnabled = true;

        const scanRoot = rootNode && rootNode.nodeType === 1 ? rootNode : document.body;
        if (!scanRoot) return;

        // Enrollment cards can be nested deep inside multiple shadow roots.
        const enrollmentCards = deepQueryAll('d2l-enrollment-card', scanRoot);
        enrollmentCards.forEach(ec => {
            const ecShadow = ec.shadowRoot;
            if (!ecShadow) return;

            const card = ecShadow.querySelector('d2l-card[href*="/d2l/home/"], d2l-card[href], d2l-card');
            const cardShadow = card && card.shadowRoot ? card.shadowRoot : null;
            const styleRoot = cardShadow || ecShadow;

            // Ensure content button CSS is in the shadow root (needed when dark mode is off)
            if (!styleRoot.querySelector('#dtu-content-btn-styles')) {
                const btnStyle = document.createElement('style');
                btnStyle.id = 'dtu-content-btn-styles';
                btnStyle.textContent = contentBtnShadowCSS;
                styleRoot.appendChild(btnStyle);
            }

            // Append to the card header (image area) for bottom-right positioning
            const header = styleRoot.querySelector('.d2l-card-header, .d2l-enrollment-card-image-container');
            const container = header || styleRoot.querySelector('.d2l-card-container, .d2l-enrollment-card-content, .d2l-enrollment-card-container');
            if (!container) return;
            if (container.querySelector('.dtu-dark-content-btn')) return;
            container.style.setProperty('position', 'relative', 'important');

            const roots = [styleRoot, ecShadow];
            const courseId = extractCourseId(ec, card, roots);
            const fallbackHref = extractFallbackHref(ec, card, roots);
            if (!courseId && !fallbackHref) return;
            const targetHref = courseId ? ('/d2l/le/lessons/' + courseId) : fallbackHref;

            // Styling is handled by cardShadowStyles CSS (.dtu-dark-content-btn)
            const btn = document.createElement('a');
            btn.className = 'dtu-dark-content-btn';
            btn.href = targetHref;
            btn.title = 'Go to Content';
            btn.textContent = '\u{1F4D6}';
            btn.addEventListener('click', (e) => e.stopPropagation());

            container.appendChild(btn);
        });
    }

    let _contentButtonBootstrapTimer = null;

    function startContentButtonBootstrap() {
        if (!IS_TOP_WINDOW || !isDTULearnHomepage()) return;
        if (_contentButtonBootstrapTimer) return;

        let attempts = 0;
        _contentButtonBootstrapTimer = setInterval(function () {
            if (!isDTULearnHomepage()) {
                clearInterval(_contentButtonBootstrapTimer);
                _contentButtonBootstrapTimer = null;
                return;
            }
            if (!isFeatureFlagEnabled(FEATURE_CONTENT_SHORTCUT_KEY)) {
                removeContentButtons();
                clearInterval(_contentButtonBootstrapTimer);
                _contentButtonBootstrapTimer = null;
                return;
            }
            insertContentButtons();
            attempts++;
            if (document.querySelector('.dtu-dark-content-btn') || attempts >= 24) {
                clearInterval(_contentButtonBootstrapTimer);
                _contentButtonBootstrapTimer = null;
            }
        }, 500);
    }

    function removeContentButtons(rootNode) {
        if (!IS_TOP_WINDOW) return;
        const scanRoot = rootNode && rootNode.nodeType === 1 ? rootNode : document.body;
        if (!scanRoot) return;

        // Remove injected buttons and their shadow-root style helpers.
        deepQueryAll('.dtu-dark-content-btn', scanRoot).forEach(function (btn) {
            try { btn.remove(); } catch (e) { }
        });
        deepQueryAll('#dtu-content-btn-styles', scanRoot).forEach(function (styleEl) {
            try { styleEl.remove(); } catch (e) { }
        });
    }

    // Run content buttons (unified observer handles updates)
    if (isFeatureFlagEnabled(FEATURE_CONTENT_SHORTCUT_KEY)) {
        insertContentButtons();
        startContentButtonBootstrap();
    } else {
        removeContentButtons();
    }

    // ===== BUS DEPARTURE TIMES (Rejseplanen 2.0 API) =====
    // Live bus departure information for DTU-area stops, shown on the DTU Learn homepage

    const REJSEPLANEN_API = 'https://www.rejseplanen.dk/api';
    const REJSEPLANEN_KEY = (typeof CONFIG !== 'undefined' && CONFIG.REJSEPLANEN_API_KEY) || '';

    // Bus lines that serve the DTU campus area
    const DTU_BUS_LINES = [
        { line: '150S', name: 'Bus 150S' },
        { line: '300S', name: 'Bus 300S' },
        { line: '40E', name: 'Bus 40E' },
        { line: '15E', name: 'Bus 15E' },
        { line: '193', name: 'Bus 193' }
    ];

    // Badge colors per bus line
    const LINE_COLORS = { '150S': '#1565c0', '300S': '#2e7d32', '40E': '#6a1b9a', '15E': '#c62828', '193': '#e65100' };

    // Known DTU-area stop IDs (hardcoded for reliability instead of name search)
    // 6015/6026: RÃ¦vehÃ¸jvej, DTU (HelsingÃ¸rmotorvejen) â€” 150S, 300S, 40E, 15E
    // 474/496:   RÃ¦vehÃ¸jvej, DTU (LundtoftegÃ¥rdsvej)    â€” 150S, 300S, 40E, 15E
    // 497/473:   DTU (Anker Engelunds Vej)               â€” 300S
    const DTU_AREA_STOP_IDS = ['6015', '6026', '474', '496', '497', '473'];

    const BUS_ENABLED_KEY = 'dtuDarkModeBusEnabled';
    const BUS_CONFIG_KEY = 'dtuDarkModeBusConfig';
    const BUS_SETUP_DONE_KEY = 'dtuDarkModeBusSetupDone';
    const DEADLINES_ENABLED_KEY = 'dtuDarkModeDeadlinesEnabled';
    const DEADLINES_CACHE_KEY = 'dtuDarkModeDeadlinesCacheV1';
    const DEADLINES_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

    let _lastBusFetch = 0;
    let _cachedDepartures = [];
    let _busFetchInProgress = false;

    let _deadlinesFetchInProgress = false;
    let _deadlinesLastResponse = null;
    let _deadlinesLastRequestAt = 0;

    function isBusEnabled() {
        return localStorage.getItem(BUS_ENABLED_KEY) === 'true';
    }

    function isDeadlinesEnabled() {
        const stored = localStorage.getItem(DEADLINES_ENABLED_KEY);
        return stored === null ? true : stored === 'true';
    }

    const SEARCH_WIDGET_ENABLED_KEY = 'dtuDarkModeSearchWidgetEnabled';

    function isSearchWidgetEnabled() {
        const stored = localStorage.getItem(SEARCH_WIDGET_ENABLED_KEY);
        return stored === 'true';
    }

    function getBusConfig() {
        try {
            const raw = localStorage.getItem(BUS_CONFIG_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function saveBusConfig(config) {
        localStorage.setItem(BUS_CONFIG_KEY, JSON.stringify(config));
    }

    function isDTULearnHomepage() {
        return window.location.hostname === 'learn.inside.dtu.dk'
            && /^\/d2l\/home\/?$/.test(window.location.pathname);
    }

    // Inject helpful external links into existing DTU Learn nav dropdowns.
    // This runs best-effort and degrades gracefully if Brightspace changes markup.
    function insertDTULearnNavResourceLinks() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isFeatureFlagEnabled(FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY)) return;

        function textOf(el) {
            return normalizeWhitespace(el ? el.textContent : '');
        }

        function getNavDropdownTargets(titleRegex) {
            var targets = [];
            var dropdowns = document.querySelectorAll('.d2l-navigation-s-item d2l-dropdown');
            for (var i = 0; i < dropdowns.length; i++) {
                var dd = dropdowns[i];
                var titleEl = dd.querySelector('.d2l-navigation-s-group-text');
                var title = textOf(titleEl) || textOf(dd.querySelector('button'));
                if (!title || !titleRegex.test(title)) continue;

                var menu = dd.querySelector('d2l-dropdown-menu d2l-menu') || dd.querySelector('d2l-menu');
                targets.push({ dropdown: dd, menu: menu });

                // If the menu isn't present until the dropdown opens, hook the opener once.
                if (!menu) {
                    var opener = dd.querySelector('button.d2l-dropdown-opener, button[aria-haspopup="true"]');
                    if (opener && opener.getAttribute('data-dtu-afterdark-menu-hook') !== '1') {
                        opener.setAttribute('data-dtu-afterdark-menu-hook', '1');
                        opener.addEventListener('click', function () {
                            setTimeout(function () { try { insertDTULearnNavResourceLinks(); } catch (e) { } }, 50);
                        });
                    }
                }
            }
            return targets;
        }

        function ensureExternalMenuItem(menu, spec) {
            if (!menu) return false;
            if (menu.querySelector('[data-dtu-afterdark-nav-link="' + spec.id + '"]')) return false;

            var item = document.createElement('d2l-menu-item');
            item.setAttribute('text', spec.text);
            item.setAttribute('role', 'menuitem');
            item.setAttribute('tabindex', '-1');
            item.setAttribute('aria-label', spec.text);
            item.setAttribute('data-dtu-afterdark-nav-link', spec.id);
            markExt(item);

            function openLink() {
                try { window.open(spec.url, '_blank', 'noopener,noreferrer'); } catch (e) { }
            }
            item.addEventListener('click', openLink);
            item.addEventListener('keydown', function (e) {
                if (!e) return;
                if (e.key === 'Enter' || e.key === ' ') openLink();
            });

            var insertBefore = menu.querySelector('d2l-menu-item[last], d2l-menu-item-link[last]') || null;
            if (insertBefore && insertBefore.parentNode === menu) {
                menu.insertBefore(item, insertBefore);
            } else {
                menu.appendChild(item);
            }
            return true;
        }

        function reorderStudentResourcesMenu(menu) {
            if (!menu) return;

            // Only reorder the Student Resources menu (avoid unintended side-effects on other dropdowns).
            var label = '';
            try { label = String(menu.getAttribute('label') || '').trim(); } catch (e) { }
            if (label && !/^Student Resources$/i.test(label)) return;

            var items = Array.prototype.slice.call(menu.querySelectorAll('d2l-menu-item, d2l-menu-item-link'));
            if (!items.length) return;

            function norm(s) {
                return normalizeWhitespace(String(s || '')).toLowerCase();
            }

            function itemText(it) {
                return norm(it.getAttribute && it.getAttribute('text')) || norm(it.textContent);
            }

            // Preferred order from you.
            // Remaining items will keep their original relative order after these.
            var preferred = [
                'campusnet',
                'final grades',
                'panopto',
                'student email',
                'course evaluation'
            ];

            var chosen = [];
            var used = new Set();

            for (var p = 0; p < preferred.length; p++) {
                var want = preferred[p];
                for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    if (!it || used.has(it)) continue;
                    if (itemText(it) === want) {
                        chosen.push(it);
                        used.add(it);
                        break;
                    }
                }
            }

            // Add the rest, preserving original order.
            var rest = [];
            for (var j = 0; j < items.length; j++) {
                var it2 = items[j];
                if (!it2 || used.has(it2)) continue;
                rest.push(it2);
            }

            if (!chosen.length) return;

            // Rebuild menu: keep any separators at the end (none in your menu today),
            // but don't let them block ordering.
            var seps = Array.prototype.slice.call(menu.querySelectorAll('d2l-menu-item-separator'));
            seps.forEach(function (s) { try { s.remove(); } catch (e) { } });

            // Detach all items first.
            items.forEach(function (it3) { try { it3.remove(); } catch (e) { } });

            var rebuilt = chosen.concat(rest);
            rebuilt.forEach(function (it4) { try { menu.appendChild(it4); } catch (e) { } });
            seps.forEach(function (s2) { try { menu.appendChild(s2); } catch (e) { } });

            // Update first/last markers for Brightspace styling.
            try {
                rebuilt.forEach(function (it5) { it5.removeAttribute('first'); it5.removeAttribute('last'); });
                if (rebuilt[0]) rebuilt[0].setAttribute('first', 'true');
                if (rebuilt[rebuilt.length - 1]) rebuilt[rebuilt.length - 1].setAttribute('last', 'true');
            } catch (e2) { }
        }

        var panopto = { id: 'panopto', text: 'Panopto', url: 'https://panopto.dtu.dk/Panopto/Pages/Home.aspx' };
        var campusnet = { id: 'campusnet', text: 'CampusNet', url: 'https://campusnet.dtu.dk/cnnet/' };

        // Place Panopto under Student Resources (not Find Courses).
        getNavDropdownTargets(/^Student Resources$/i).forEach(function (t) { ensureExternalMenuItem(t.menu, panopto); });

        // CampusNet fits naturally under Student Resources.
        getNavDropdownTargets(/^Student Resources$/i).forEach(function (t) { ensureExternalMenuItem(t.menu, campusnet); });

        // Reorder Student Resources items for better ergonomics.
        getNavDropdownTargets(/^Student Resources$/i).forEach(function (t) { reorderStudentResourcesMenu(t.menu); });
    }

    function removeDTULearnNavResourceLinks() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        document.querySelectorAll('[data-dtu-afterdark-nav-link]').forEach(function (el) {
            try { el.remove(); } catch (e) { }
        });
    }

    function ensureNavWidgetsContainer() {
        // Deadlines widget lives in the top header right slot.
        const headerRight = document.querySelector('.d2l-labs-navigation-header-right');
        if (!headerRight) return null;

        let container = document.querySelector('.dtu-nav-widgets');
        if (container && container.parentElement !== headerRight) {
            try {
                headerRight.insertBefore(container, headerRight.firstChild);
            } catch (e) {
                // ignore
            }
        }

        if (!container) {
            container = document.createElement('div');
            container.className = 'dtu-nav-widgets';
            container.setAttribute('role', 'listitem');
            markExt(container);
            if (headerRight.firstChild) headerRight.insertBefore(container, headerRight.firstChild);
            else headerRight.appendChild(container);
        }

        container.style.cssText = 'display: flex; align-items: center; gap: 10px; '
            + 'margin-right: 12px;';
        return container;
    }

    function cleanupNavWidgetsContainer() {
        const container = document.querySelector('.dtu-nav-widgets');
        if (!container) return;
        if (container.children.length === 0) container.remove();
    }

    function getDeadlineNextTs(item, todayTs) {
        if (!item) return null;
        const start = typeof item.startTs === 'number' ? item.startTs : null;
        const end = typeof item.endTs === 'number' ? item.endTs : null;
        if (start == null) return null;
        if (end != null) {
            if (todayTs < start) return start;
            if (todayTs <= end) return end;
            return end;
        }
        return start;
    }

    function getDeadlineState(item, todayTs) {
        if (!item) return 'unknown';
        const start = typeof item.startTs === 'number' ? item.startTs : null;
        const end = typeof item.endTs === 'number' ? item.endTs : null;
        if (start == null) return 'unknown';
        if (end != null) {
            if (todayTs < start) return 'upcoming';
            if (todayTs <= end) return 'active';
            return 'past';
        }
        if (todayTs <= start) return 'upcoming';
        return 'past';
    }

    function formatDeadlineRange(item) {
        if (!item) return '';
        const s = item.startIso ? formatIsoDateForDisplay(item.startIso) : '';
        if (item.endIso) return s + ' - ' + formatIsoDateForDisplay(item.endIso);
        return s;
    }

    function formatDeadlineRangeCompact(item) {
        if (!item) return '';
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var sm = String(item.startIso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        var em = String(item.endIso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!sm) return formatDeadlineRange(item);

        var sd = parseInt(sm[3], 10);
        var smon = months[parseInt(sm[2], 10) - 1] || sm[2];

        if (!em) {
            return sd + ' ' + smon + ' ' + sm[1];
        }

        var ed = parseInt(em[3], 10);
        var emon = months[parseInt(em[2], 10) - 1] || em[2];

        if (sm[1] === em[1]) {
            return sd + ' ' + smon + ' - ' + ed + ' ' + emon + ' ' + em[1];
        }

        return sd + ' ' + smon + ' ' + sm[1] + ' - ' + ed + ' ' + emon + ' ' + em[1];
    }

    function buildUpcomingDeadlineRows(groups, todayTs, limit) {
        const out = [];
        (groups || []).forEach(function (g) {
            const period = String(g && g.heading || '');
            (g && Array.isArray(g.items) ? g.items : []).forEach(function (item) {
                if (!item || typeof item.startTs !== 'number') return;
                const state = getDeadlineState(item, todayTs);
                const nextTs = getDeadlineNextTs(item, todayTs);
                if (state === 'past' || nextTs == null || nextTs < todayTs) return;
                out.push({
                    period,
                    label: String(item.label || '').trim(),
                    startIso: item.startIso,
                    startTs: item.startTs,
                    endIso: item.endIso,
                    endTs: item.endTs,
                    state,
                    nextTs
                });
            });
        });
        out.sort(function (a, b) { return a.nextTs - b.nextTs; });
        return out.slice(0, (typeof limit === 'number' && limit > 0) ? limit : 8);
    }

    function requestStudentDeadlines(forceRefresh, cb) {
        if (!IS_TOP_WINDOW) return;
        if (_deadlinesFetchInProgress) return;

        const now = Date.now();
        if (!forceRefresh && _deadlinesLastRequestAt && (now - _deadlinesLastRequestAt) < 1500) return;
        _deadlinesLastRequestAt = now;

        _deadlinesFetchInProgress = true;
        sendRuntimeMessage({ type: 'dtu-student-deadlines', forceRefresh: !!forceRefresh }, function (response) {
            _deadlinesFetchInProgress = false;
            if (response && response.ok) {
                _deadlinesLastResponse = response;
                try {
                    localStorage.setItem(DEADLINES_CACHE_KEY, JSON.stringify(response));
                } catch (e) {
                    // ignore
                }
            }
            if (cb) cb(response);
        });
    }

    const ATOMIC_SEARCH_HIDDEN_ATTR = 'data-dtu-atomic-search-hidden';
    const ATOMIC_SEARCH_HIDDEN_STYLE_ATTR = 'data-dtu-atomic-search-prev-style';
    const DEADLINES_EXPANDED_KEY = 'dtuDarkModeDeadlinesExpanded';

    function getAtomicSearchWidgetRoot() {
        const atomic = document.querySelector('#atomic-jolt-search-widget') || document.querySelector('atomic-search-widget');
        if (!atomic) return null;
        return atomic.closest('.d2l-widget') || null;
    }

    function setAtomicSearchWidgetHidden(hidden) {
        const widget = getAtomicSearchWidgetRoot();
        if (!widget) return;

        if (hidden) {
            if (widget.getAttribute(ATOMIC_SEARCH_HIDDEN_ATTR) === '1') return;
            widget.setAttribute(ATOMIC_SEARCH_HIDDEN_ATTR, '1');
            widget.setAttribute(ATOMIC_SEARCH_HIDDEN_STYLE_ATTR, widget.getAttribute('style') || '');
            widget.style.setProperty('display', 'none', 'important');
            return;
        }

        if (widget.getAttribute(ATOMIC_SEARCH_HIDDEN_ATTR) !== '1') return;
        const prev = widget.getAttribute(ATOMIC_SEARCH_HIDDEN_STYLE_ATTR) || '';
        widget.removeAttribute(ATOMIC_SEARCH_HIDDEN_ATTR);
        widget.removeAttribute(ATOMIC_SEARCH_HIDDEN_STYLE_ATTR);
        if (prev) widget.setAttribute('style', prev);
        else widget.removeAttribute('style');
    }

    function buildTopDeadlines(resp, todayTs, limit) {
        const out = [];
        const courseUrl = (resp && resp.course && resp.course.url)
            ? resp.course.url
            : 'https://student.dtu.dk/en/courses-and-teaching/course-registration/course-registration-deadlines';
        const examUrl = (resp && resp.exam && resp.exam.url)
            ? resp.exam.url
            : 'https://student.dtu.dk/en/exam/exam-registration/-deadlines-for-exams';

        const courseRows = buildUpcomingDeadlineRows((resp && resp.course && resp.course.groups) || [], todayTs, 60);
        const examRows = buildUpcomingDeadlineRows((resp && resp.exam && resp.exam.groups) || [], todayTs, 60);
        courseRows.forEach(function (r) {
            r.kind = 'course';
            r.sourceUrl = courseUrl;
            out.push(r);
        });
        examRows.forEach(function (r) {
            r.kind = 'exam';
            r.sourceUrl = examUrl;
            out.push(r);
        });

        out.sort(function (a, b) { return a.nextTs - b.nextTs; });
        return out.slice(0, (typeof limit === 'number' && limit > 0) ? limit : 3);
    }

    function deadlineOneLineHint(kind, label) {
        const l = String(label || '').toLowerCase();
        const isExam = kind === 'exam';
        const isCourse = kind === 'course';

        if (/(withdrawal|withdraw|deregister|de-?register)/.test(l)) {
            return isExam ? 'Withdraw from the exam before this deadline.' : 'Withdraw from courses before this deadline.';
        }
        if (/supplementary/.test(l)) {
            return isCourse ? 'Register for courses with vacant seats.' : 'Late changes may be possible in this period.';
        }
        if (/registration/.test(l)) {
            return isExam ? 'Register for the exam before this deadline.' : 'Register for courses before this deadline.';
        }
        if (/grading/.test(l)) {
            return 'Grades should be published by this deadline.';
        }
        return isExam ? 'Check exam registration/withdrawal rules.' : 'Check course registration rules.';
    }

    function formatDeadlineChip(row, todayTs) {
        const nextTs = getDeadlineNextTs(row, todayTs);
        const days = (nextTs == null) ? null : diffDaysUtc(todayTs, nextTs);
        const active = row && row.state === 'active';

        let text = '';
        if (days === 0) {
            text = active ? 'Ends today' : 'Today';
        } else if (days != null) {
            text = active ? (days + 'd left') : ('In ' + days + 'd');
        }

        const color = active
            ? (darkModeEnabled ? '#66bb6a' : '#2e7d32')
            : (days != null && days <= 7
                ? (darkModeEnabled ? '#ffa726' : '#e65100')
                : (darkModeEnabled ? '#66b3ff' : '#1565c0'));

        return { text, color, days };
    }

    function createDeadlinesHomeRow(row, todayTs, includePeriod) {
        var chipInfo = formatDeadlineChip(row, todayTs);
        var isActive = row && row.state === 'active';

        // Pick left-border color: green for active/ending, blue for upcoming
        var borderColor = isActive
            ? (darkModeEnabled ? '#66bb6a' : '#2e7d32')
            : (darkModeEnabled ? '#66b3ff' : '#1565c0');

        // Outer card: grid with [left-border | content | badge]
        var card = document.createElement('div');
        markExt(card);
        card.style.cssText = 'display: grid; grid-template-columns: 4px 1fr auto; gap: 0; '
            + 'padding: 10px 0; min-width: 0;';

        // Left colored strip
        var strip = document.createElement('div');
        markExt(strip);
        strip.style.cssText = 'border-radius: 2px; background: ' + borderColor + ';';

        // Center content
        var center = document.createElement('div');
        markExt(center);
        center.style.cssText = 'display: flex; flex-direction: column; gap: 2px; padding: 0 10px; min-width: 0;';

        // Title
        var title = document.createElement('div');
        markExt(title);
        title.textContent = row.label || '';
        title.title = row.label || '';
        title.style.cssText = 'font-size: 13px; font-weight: 600; line-height: 18px; '
            + 'color: ' + (darkModeEnabled ? '#e0e0e0' : '#1f2937') + ';';

        // Date
        var range = formatDeadlineRangeCompact(row);
        var dates = document.createElement('div');
        markExt(dates);
        dates.textContent = range || '';
        dates.title = range || '';
        dates.style.cssText = 'font-size: 11px; color: ' + (darkModeEnabled ? '#8a8a8a' : '#9ca3af') + '; '
            + 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        if (!range) dates.style.display = 'none';

        // Description (subtle, single line with ellipsis)
        var rawHint = deadlineOneLineHint(row.kind, row.label) || '';
        var hintText = rawHint.replace(/\.\s*$/, '').trim();
        var hint = document.createElement('div');
        markExt(hint);
        hint.textContent = hintText || '';
        hint.title = hintText || '';
        hint.style.cssText = 'font-size: 11px; line-height: 15px; color: ' + (darkModeEnabled ? '#707070' : '#b0b0b0') + '; '
            + 'margin-top: 1px;';
        if (!hintText) hint.style.display = 'none';

        center.appendChild(title);
        center.appendChild(dates);
        center.appendChild(hint);

        if (includePeriod && row.period) {
            var period = document.createElement('div');
            markExt(period);
            period.textContent = row.period;
            period.style.cssText = 'font-size: 10px; color: ' + (darkModeEnabled ? '#707070' : '#b0b0b0') + '; margin-top: 1px;';
            center.appendChild(period);
        }

        // Right badge
        var badge = document.createElement('div');
        markExt(badge);
        var chipText = chipInfo.text || '';
        badge.textContent = chipText;

        // Subtle background tint instead of heavy border
        var chipBg = isActive
            ? (darkModeEnabled ? 'rgba(102,187,106,0.15)' : 'rgba(46,125,50,0.1)')
            : (chipInfo.days != null && chipInfo.days <= 7
                ? (darkModeEnabled ? 'rgba(255,167,38,0.15)' : 'rgba(230,81,0,0.1)')
                : (darkModeEnabled ? 'rgba(102,179,255,0.15)' : 'rgba(21,101,192,0.1)'));
        badge.style.cssText = 'align-self: start; padding: 2px 8px; border-radius: 6px; '
            + 'font-size: 11px; font-weight: 700; white-space: nowrap; '
            + 'background: ' + chipBg + '; color: ' + chipInfo.color + ';';
        badge.style.setProperty('color', chipInfo.color, 'important');
        if (!chipText) badge.style.display = 'none';

        card.appendChild(strip);
        card.appendChild(center);
        card.appendChild(badge);

        return card;
    }

    function renderDeadlinesHomepageWidget(widget) {
        if (!widget) return;

        const summary = widget.querySelector('[data-dtu-deadlines-summary]');
        const next = widget.querySelector('[data-dtu-deadlines-next]');
        const more = widget.querySelector('[data-dtu-deadlines-more]');
        const footer = widget.querySelector('[data-dtu-deadlines-footer]');
        const meta = widget.querySelector('[data-dtu-deadlines-meta]');
        const chevronBtn = widget.querySelector('[data-dtu-deadlines-chevron]');
        const refreshBtn = widget.querySelector('[data-dtu-deadlines-refresh]');
        const sources = widget.querySelector('[data-dtu-deadlines-sources]');

        // Hydrate from persistent cache for instant render and fewer network requests.
        if (!_deadlinesLastResponse) {
            try {
                const raw = localStorage.getItem(DEADLINES_CACHE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.ok) _deadlinesLastResponse = parsed;
                }
            } catch (e) {
                // ignore
            }
        }

        const resp = _deadlinesLastResponse;
        const todayTs = startOfTodayUtcTs();

        function clear(el) {
            if (!el) return;
            while (el.firstChild) el.removeChild(el.firstChild);
        }
        clear(next);
        clear(more);

        const expandedWanted = localStorage.getItem(DEADLINES_EXPANDED_KEY) === 'true';
        if (chevronBtn) {
            chevronBtn.setAttribute('icon', expandedWanted ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expandedWanted ? 'true' : 'false');
            chevronBtn.setAttribute('text', expandedWanted ? 'Show fewer deadlines' : 'Show more deadlines');
            chevronBtn.setAttribute('aria-expanded', expandedWanted ? 'true' : 'false');
            chevronBtn.style.display = '';
        }
        if (more) more.style.display = expandedWanted ? 'block' : 'none';
        if (footer) footer.style.display = 'flex';

        if (!resp || !resp.ok) {
            if (summary) summary.textContent = '...';
            const loading = document.createElement('div');
            markExt(loading);
            loading.textContent = _deadlinesFetchInProgress ? 'Loading deadlines...' : 'Loading deadlines...';
            loading.style.cssText = 'font-size: 13px; color: ' + (darkModeEnabled ? '#b0b0b0' : '#6b7280') + ';';
            if (next) next.appendChild(loading);

            if (!_deadlinesFetchInProgress) {
                requestStudentDeadlines(false, function () { renderDeadlinesHomepageWidget(widget); });
            }

            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.style.opacity = '0.7';
            }
            return;
        }

        const rows = buildTopDeadlines(resp, todayTs, 3);
        if (!rows.length) {
            if (summary) summary.textContent = 'None';
            const empty = document.createElement('div');
            markExt(empty);
            empty.textContent = 'No upcoming deadlines found.';
            empty.style.cssText = 'font-size: 13px; color: ' + (darkModeEnabled ? '#b0b0b0' : '#6b7280') + '; font-style: italic;';
            if (next) next.appendChild(empty);
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.style.opacity = '1';
            }
            return;
        }

        const nextRow = rows[0];
        const days = diffDaysUtc(todayTs, nextRow.nextTs);
        if (summary) {
            summary.textContent = (days === 0) ? 'Today' : (days + 'd');
        }

        // Compact view usually shows only 1 deadline. However, if the 2nd/3rd deadline has the
        // same time-remaining as the first (same "In 14d"/"14d left" day), show them too.
        let compactCount = 1;
        try {
            if (rows.length > 1) {
                for (let i = 1; i < rows.length; i++) {
                    const d2 = diffDaysUtc(todayTs, rows[i].nextTs);
                    if (d2 === days) compactCount++;
                    else break;
                }
            }
        } catch (eC) { compactCount = 1; }

        const hasMore = rows.length > compactCount;
        const expanded = expandedWanted && hasMore;
        if (chevronBtn) {
            if (!hasMore) {
                chevronBtn.style.display = 'none';
            } else {
                chevronBtn.style.display = '';
            }
            chevronBtn.setAttribute('icon', expanded ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expanded ? 'true' : 'false');
            chevronBtn.setAttribute('text', expanded ? 'Show fewer deadlines' : 'Show more deadlines');
            chevronBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
        if (more) more.style.display = expanded ? 'block' : 'none';

        if (next) {
            for (let i = 0; i < compactCount; i++) {
                next.appendChild(createDeadlinesHomeRow(rows[i], todayTs, false));
            }
        }

        if (expanded && more) {
            for (let i = compactCount; i < rows.length; i++) {
                more.appendChild(createDeadlinesHomeRow(rows[i], todayTs, false));
            }
        }

        if (meta) {
            const fetchedAt = resp.fetchedAt ? new Date(resp.fetchedAt) : null;
            meta.textContent = fetchedAt
                ? fetchedAt.toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
                : 'unknown';
        }

        if (sources) {
            const courseUrl = (resp.course && resp.course.url) ? resp.course.url : 'https://student.dtu.dk/en/courses-and-teaching/course-registration/course-registration-deadlines';
            const examUrl = (resp.exam && resp.exam.url) ? resp.exam.url : 'https://student.dtu.dk/en/exam/exam-registration/-deadlines-for-exams';
            sources.querySelectorAll('a').forEach(function (a) {
                if (a.getAttribute('data-kind') === 'course') a.href = courseUrl;
                if (a.getAttribute('data-kind') === 'exam') a.href = examUrl;
            });
        }

        // Refresh at most once per day (and only if stale/missing).
        const now = Date.now();
        const fetchedAt = (resp && typeof resp.fetchedAt === 'number') ? resp.fetchedAt : 0;
        const stale = !fetchedAt || (now - fetchedAt) > DEADLINES_CACHE_TTL_MS;
        if (stale && !_deadlinesFetchInProgress) {
            requestStudentDeadlines(false, function () { renderDeadlinesHomepageWidget(widget); });
        }

        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.style.opacity = '1';
        }
    }

    const DTU_HOMEPAGE_COL3_STYLE_ID = 'dtu-after-dark-homepage-col3-wide';

    function ensureDTULearnHomepageCol3Wide(enabled) {
        const existing = document.querySelector('#' + DTU_HOMEPAGE_COL3_STYLE_ID);
        if (!enabled) {
            if (existing) existing.remove();
            return;
        }
        if (existing) return;

        const style = document.createElement('style');
        style.id = DTU_HOMEPAGE_COL3_STYLE_ID;
        markExt(style);
        style.textContent = [
            '@media (min-width: 1100px) {',
            '  .homepage-col-3 {',
            '    width: clamp(360px, 34vw, 520px) !important;',
            '    max-width: clamp(360px, 34vw, 520px) !important;',
            '    flex: 0 0 clamp(360px, 34vw, 520px) !important;',
            '  }',
            '  .homepage-col-1, .homepage-col-2 { min-width: 0 !important; }',
            '}'
        ].join('\\n');
        document.head.appendChild(style);
    }

    function placeDeadlinesHomepageWidget(widget, col3) {
        if (!widget || !col3) return;
        if (widget.parentNode !== col3 || col3.firstChild !== widget) {
            if (col3.firstChild) col3.insertBefore(widget, col3.firstChild);
            else col3.appendChild(widget);
        }
    }

    function insertDeadlinesHomepageWidget() {
        if (!IS_TOP_WINDOW) return;
        if (!isDTULearnHomepage() || !isDeadlinesEnabled()) {
            const existing = document.querySelector('.dtu-deadlines-home-widget');
            if (existing) existing.remove();
            setAtomicSearchWidgetHidden(false);
            ensureDTULearnHomepageCol3Wide(false);
            return;
        }

        // Replace the native Atomic Search widget on the homepage right column.
        const atomicWidget = getAtomicSearchWidgetRoot();
        const col3 = document.querySelector('.homepage-col-3') || (atomicWidget ? atomicWidget.parentElement : null);
        if (!col3) return;

        ensureDTULearnHomepageCol3Wide(true);

        // Only hide search widget if user hasn't enabled it
        if (atomicWidget) setAtomicSearchWidgetHidden(!isSearchWidgetEnabled());

        let widget = document.querySelector('.dtu-deadlines-home-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.className = 'd2l-widget d2l-tile d2l-widget-padding-full dtu-deadlines-home-widget';
            widget.setAttribute('role', 'region');
            markExt(widget);

            const titleId = 'dtu-deadlines-home-title';
            widget.setAttribute('aria-labelledby', titleId);

            const header = document.createElement('div');
            header.className = 'd2l-widget-header';
            markExt(header);
            header.style.cssText = 'padding: 2px 7px 2px !important;';
            header.style.setProperty('background', darkModeEnabled ? '#2d2d2d' : '#ffffff', 'important');
            header.style.setProperty('background-color', darkModeEnabled ? '#2d2d2d' : '#ffffff', 'important');
            header.style.setProperty('color', darkModeEnabled ? '#e0e0e0' : '#333', 'important');

            const headerWrap = document.createElement('div');
            headerWrap.className = 'd2l-homepage-header-wrapper';
            markExt(headerWrap);
            headerWrap.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 10px;';

            const h2 = document.createElement('h2');
            h2.className = 'd2l-heading vui-heading-4';
            h2.id = titleId;
            markExt(h2);
            h2.textContent = 'Deadlines';
            h2.style.cssText = 'margin: 0; flex: 1 1 auto; min-width: 140px; '
                + 'white-space: nowrap; overflow: visible; text-overflow: clip; max-width: none;';
            h2.style.setProperty('overflow', 'visible', 'important');
            h2.style.setProperty('text-overflow', 'clip', 'important');
            h2.style.setProperty('white-space', 'nowrap', 'important');
            h2.style.setProperty('max-width', 'none', 'important');

            // Hidden summary element (kept for render logic, not displayed)
            const badge = document.createElement('span');
            markExt(badge);
            badge.setAttribute('data-dtu-deadlines-summary', '1');
            badge.style.display = 'none';

            const expandedInit = localStorage.getItem(DEADLINES_EXPANDED_KEY) === 'true';
            const chevronBtn = document.createElement('d2l-button-icon');
            markExt(chevronBtn);
            chevronBtn.setAttribute('data-dtu-deadlines-chevron', '1');
            chevronBtn.setAttribute('type', 'button');
            chevronBtn.setAttribute('animation-type', 'opacity-transform');
            chevronBtn.setAttribute('text-hidden', '');
            chevronBtn.setAttribute('aria-label', 'Toggle upcoming deadlines');
            chevronBtn.setAttribute('icon', expandedInit ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expandedInit ? 'true' : 'false');
            chevronBtn.setAttribute('text', expandedInit ? 'Show fewer deadlines' : 'Show more deadlines');
            chevronBtn.addEventListener('click', function () {
                const nextState = localStorage.getItem(DEADLINES_EXPANDED_KEY) !== 'true';
                localStorage.setItem(DEADLINES_EXPANDED_KEY, nextState ? 'true' : 'false');
                renderDeadlinesHomepageWidget(widget);
            });

            headerWrap.appendChild(h2);
            headerWrap.appendChild(badge);
            // Chevron sits directly in headerWrap, flex-shrink: 0 keeps it on the same line
            chevronBtn.style.cssText = 'flex: 0 0 auto;';
            headerWrap.appendChild(chevronBtn);
            header.appendChild(headerWrap);

            const clear = document.createElement('div');
            clear.className = 'd2l-clear';
            header.appendChild(clear);

            const content = document.createElement('div');
            content.className = 'd2l-widget-content';
            markExt(content);

            const padding = document.createElement('div');
            padding.className = 'd2l-widget-content-padding';
            markExt(padding);
            padding.style.cssText = 'padding: 0 7px 6px !important;';

            const next = document.createElement('div');
            markExt(next);
            next.setAttribute('data-dtu-deadlines-next', '1');

            const more = document.createElement('div');
            markExt(more);
            more.setAttribute('data-dtu-deadlines-more', '1');
            more.style.display = 'none';

            const footer = document.createElement('div');
            markExt(footer);
            footer.setAttribute('data-dtu-deadlines-footer', '1');
            footer.style.cssText = 'display: none; align-items: center; justify-content: space-between; gap: 6px; '
                + 'margin-top: 8px; padding-top: 8px; '
                + 'border-top: 1px solid ' + (darkModeEnabled ? '#333' : '#e5e7eb') + ';';

            // Left side: Updated text + refresh icon
            const footerLeft = document.createElement('div');
            markExt(footerLeft);
            footerLeft.style.cssText = 'display: flex; align-items: center; gap: 6px;';

            const meta = document.createElement('div');
            markExt(meta);
            meta.setAttribute('data-dtu-deadlines-meta', '1');
            meta.style.cssText = 'font-size: 10px; color: ' + (darkModeEnabled ? '#666' : '#9ca3af') + ';';

            const refreshBtn = document.createElement('button');
            refreshBtn.type = 'button';
            markExt(refreshBtn);
            refreshBtn.setAttribute('data-dtu-deadlines-refresh', '1');
            refreshBtn.setAttribute('aria-label', 'Refresh deadlines');
            refreshBtn.setAttribute('title', 'Refresh deadlines');
            refreshBtn.innerHTML = '&#x21bb;';
            refreshBtn.style.cssText = 'border: none; background: transparent; cursor: pointer; '
                + 'font-size: 14px; line-height: 1; padding: 2px; border-radius: 4px; '
                + 'color: ' + (darkModeEnabled ? '#888' : '#9ca3af') + ';';
            refreshBtn.style.setProperty('background', 'transparent', 'important');
            refreshBtn.style.setProperty('color', darkModeEnabled ? '#888' : '#9ca3af', 'important');
            refreshBtn.style.setProperty('border', 'none', 'important');
            refreshBtn.addEventListener('mouseenter', function () {
                refreshBtn.style.setProperty('color', darkModeEnabled ? '#ccc' : '#555', 'important');
            });
            refreshBtn.addEventListener('mouseleave', function () {
                refreshBtn.style.setProperty('color', darkModeEnabled ? '#888' : '#9ca3af', 'important');
            });
            refreshBtn.addEventListener('click', function () {
                refreshBtn.disabled = true;
                refreshBtn.style.opacity = '0.5';
                requestStudentDeadlines(true, function () { renderDeadlinesHomepageWidget(widget); });
            });

            footerLeft.appendChild(meta);
            footerLeft.appendChild(refreshBtn);

            // Right side: source links
            const sources = document.createElement('div');
            markExt(sources);
            sources.setAttribute('data-dtu-deadlines-sources', '1');
            sources.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 10px;';

            const courseA = document.createElement('a');
            courseA.textContent = 'Course';
            courseA.target = '_blank';
            courseA.rel = 'noopener noreferrer';
            courseA.setAttribute('data-kind', 'course');
            courseA.style.cssText = 'color: ' + (darkModeEnabled ? '#888' : '#9ca3af') + ' !important; text-decoration: none;';
            courseA.addEventListener('mouseenter', function () { courseA.style.textDecoration = 'underline'; });
            courseA.addEventListener('mouseleave', function () { courseA.style.textDecoration = 'none'; });

            const sep = document.createElement('span');
            markExt(sep);
            sep.textContent = '\u00b7';
            sep.style.cssText = 'color: ' + (darkModeEnabled ? '#555' : '#d1d5db') + ';';

            const examA = document.createElement('a');
            examA.textContent = 'Exam';
            examA.target = '_blank';
            examA.rel = 'noopener noreferrer';
            examA.setAttribute('data-kind', 'exam');
            examA.style.cssText = 'color: ' + (darkModeEnabled ? '#888' : '#9ca3af') + ' !important; text-decoration: none;';
            examA.addEventListener('mouseenter', function () { examA.style.textDecoration = 'underline'; });
            examA.addEventListener('mouseleave', function () { examA.style.textDecoration = 'none'; });

            sources.appendChild(courseA);
            sources.appendChild(sep);
            sources.appendChild(examA);

            footer.appendChild(footerLeft);
            footer.appendChild(sources);

            const disclaimer = document.createElement('div');
            markExt(disclaimer);
            disclaimer.textContent = 'Please double-check dates on the official DTU student pages.';
            disclaimer.style.cssText = 'font-size: 10px; font-style: italic; line-height: 14px; '
                + 'color: ' + (darkModeEnabled ? '#555' : '#b0b0b0') + '; '
                + 'margin-top: 6px;';

            padding.appendChild(next);
            padding.appendChild(more);
            padding.appendChild(footer);
            padding.appendChild(disclaimer);
            content.appendChild(padding);

            widget.appendChild(header);
            widget.appendChild(content);
        }

        placeDeadlinesHomepageWidget(widget, col3);
        renderDeadlinesHomepageWidget(widget);
    }

    function hideDeadlinesModal() {
        const existing = document.querySelector('.dtu-deadlines-modal');
        if (existing) existing.remove();
    }

    function showDeadlinesModal(forceRefresh) {
        if (!IS_TOP_WINDOW) return;
        if (!isDTULearnHomepage()) return;

        hideDeadlinesModal();

        const isDarkTheme = isDarkModeEnabled();
        const theme = isDarkTheme
            ? {
                overlay: 'rgba(0,0,0,0.25)',
                background: 'rgba(30,30,30,0.92)',
                text: '#e0e0e0',
                heading: '#ffffff',
                subtle: '#b0b0b0',
                border: '#404040',
                chipBg: '#252525',
                chipBorder: '#3b3b3b',
                link: '#66b3ff'
            }
            : {
                overlay: 'rgba(15,23,42,0.10)',
                background: 'rgba(255,255,255,0.96)',
                text: '#1f2937',
                heading: '#111827',
                subtle: '#4b5563',
                border: '#d1d5db',
                chipBg: '#f6f8fb',
                chipBorder: '#dce2ea',
                link: '#1a73e8'
            };

        const overlay = document.createElement('div');
        overlay.className = 'dtu-deadlines-modal';
        markExt(overlay);
        overlay.style.cssText = 'position: fixed; inset: 0; z-index: 1000000; '
            + 'background: ' + theme.overlay + '; backdrop-filter: blur(14px) brightness(1.8); '
            + '-webkit-backdrop-filter: blur(14px) brightness(1.8); '
            + 'display: flex; align-items: center; justify-content: center; '
            + 'font-family: sans-serif; opacity: 0; transition: opacity 0.2s;';

        requestAnimationFrame(function () { overlay.style.opacity = '1'; });

        const modal = document.createElement('div');
        markExt(modal);
        modal.style.cssText = 'background: ' + theme.background + '; color: ' + theme.text + '; '
            + 'border: 1px solid ' + theme.border + '; border-radius: 14px; '
            + 'width: min(760px, 92vw); max-height: 82vh; overflow: auto; '
            + 'box-shadow: 0 16px 64px rgba(0,0,0,0.45); padding: 20px 22px;';

        function dismiss() {
            overlay.style.opacity = '0';
            setTimeout(function () { overlay.remove(); }, 160);
        }

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) dismiss();
        });

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;';

        const titleWrap = document.createElement('div');
        const title = document.createElement('div');
        title.textContent = 'DTU Deadlines';
        title.style.cssText = 'font-size: 20px; font-weight: 800; color: ' + theme.heading + '; letter-spacing: -0.2px;';

        const subtitle = document.createElement('div');
        subtitle.style.cssText = 'margin-top: 4px; font-size: 12px; color: ' + theme.subtle + ';';
        subtitle.textContent = 'Pulls public deadlines from student.dtu.dk (cached).';

        titleWrap.appendChild(title);
        titleWrap.appendChild(subtitle);

        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; gap: 10px; align-items: center;';

        const refreshBtn = document.createElement('button');
        refreshBtn.type = 'button';
        refreshBtn.textContent = 'Refresh';
        refreshBtn.style.cssText = 'border: 1px solid ' + theme.border + '; background: transparent; '
            + 'color: ' + theme.text + '; padding: 7px 10px; border-radius: 8px; cursor: pointer; font-size: 12px;';
        refreshBtn.style.setProperty('background', 'transparent', 'important');
        refreshBtn.style.setProperty('background-color', 'transparent', 'important');
        refreshBtn.style.setProperty('color', theme.text, 'important');
        refreshBtn.style.setProperty('border-color', theme.border, 'important');
        refreshBtn.addEventListener('click', function () {
            refreshBtn.disabled = true;
            refreshBtn.style.opacity = '0.7';
            renderBody(null, true);
        });

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = 'border: 1px solid ' + theme.border + '; background: transparent; '
            + 'color: ' + theme.text + '; padding: 7px 10px; border-radius: 8px; cursor: pointer; font-size: 12px;';
        closeBtn.style.setProperty('background', 'transparent', 'important');
        closeBtn.style.setProperty('background-color', 'transparent', 'important');
        closeBtn.style.setProperty('color', theme.text, 'important');
        closeBtn.style.setProperty('border-color', theme.border, 'important');
        closeBtn.addEventListener('click', dismiss);

        actions.appendChild(refreshBtn);
        actions.appendChild(closeBtn);

        header.appendChild(titleWrap);
        header.appendChild(actions);
        modal.appendChild(header);

        const body = document.createElement('div');
        body.style.cssText = 'margin-top: 16px;';
        modal.appendChild(body);

        function createSection(titleText, linkUrl, rows) {
            const card = document.createElement('div');
            card.style.cssText = 'border: 1px solid ' + theme.border + '; border-radius: 12px; padding: 14px 14px; '
                + 'background: ' + (isDarkTheme ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.6)') + '; '
                + 'margin-bottom: 12px;';

            const cardHeader = document.createElement('div');
            cardHeader.style.cssText = 'display: flex; align-items: baseline; justify-content: space-between; gap: 10px;';

            const h = document.createElement('div');
            h.textContent = titleText;
            h.style.cssText = 'font-size: 14px; font-weight: 800; color: ' + theme.heading + ';';

            const a = document.createElement('a');
            a.href = linkUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = 'Open source';
            a.style.cssText = 'font-size: 12px; color: ' + theme.link + '; text-decoration: none;';
            a.addEventListener('mouseenter', function () { a.style.textDecoration = 'underline'; });
            a.addEventListener('mouseleave', function () { a.style.textDecoration = 'none'; });

            cardHeader.appendChild(h);
            cardHeader.appendChild(a);
            card.appendChild(cardHeader);

            if (!rows.length) {
                const empty = document.createElement('div');
                empty.textContent = 'No upcoming deadlines found.';
                empty.style.cssText = 'margin-top: 8px; font-size: 12px; color: ' + theme.subtle + '; font-style: italic;';
                card.appendChild(empty);
                return card;
            }

            rows.forEach(function (r, idx) {
                const row = document.createElement('div');
                row.style.cssText = 'display: grid; grid-template-columns: 1fr auto; gap: 10px; '
                    + 'padding: 10px 0; align-items: center;'
                    + (idx ? (' border-top: 1px solid ' + theme.border + ';') : '');

                const left = document.createElement('div');

                const period = document.createElement('div');
                period.textContent = r.period || '';
                period.style.cssText = 'font-size: 11px; color: ' + theme.subtle + '; margin-bottom: 2px;';

                const label = document.createElement('div');
                label.textContent = r.label || '';
                label.style.cssText = 'font-size: 13px; font-weight: 750; color: ' + theme.text + ';';

                const dates = document.createElement('div');
                dates.textContent = formatDeadlineRange(r);
                dates.style.cssText = 'font-size: 12px; color: ' + theme.subtle + '; margin-top: 2px;';

                left.appendChild(period);
                left.appendChild(label);
                left.appendChild(dates);

                const right = document.createElement('div');
                right.style.cssText = 'display: flex; align-items: center; gap: 8px; justify-content: flex-end;';

                const chip = document.createElement('div');
                chip.style.cssText = 'padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; '
                    + 'border: 1px solid ' + theme.chipBorder + '; background: ' + theme.chipBg + ';';

                const today = startOfTodayUtcTs();
                const nextTs = getDeadlineNextTs(r, today);
                const days = (nextTs == null) ? null : diffDaysUtc(today, nextTs);
                const verb = r.state === 'active' ? 'Ends' : 'Starts';

                if (r.endTs == null) {
                    if (days === 0) chip.textContent = 'Today';
                    else chip.textContent = (days != null ? ('In ' + days + 'd') : '');
                } else {
                    if (days === 0) chip.textContent = (r.state === 'active') ? 'Ends today' : 'Starts today';
                    else chip.textContent = (days != null ? (verb + ' in ' + days + 'd') : '');
                }

                const chipColor = r.state === 'active'
                    ? (isDarkTheme ? '#66bb6a' : '#2e7d32')
                    : (days != null && days <= 7
                        ? (isDarkTheme ? '#ffa726' : '#e65100')
                        : (isDarkTheme ? '#66b3ff' : '#1565c0'));
                chip.style.setProperty('color', chipColor, 'important');
                chip.style.setProperty('border-color', chipColor, 'important');

                right.appendChild(chip);
                row.appendChild(left);
                row.appendChild(right);
                card.appendChild(row);
            });

            return card;
        }

        function renderBody(resp, force) {
            while (body.firstChild) body.removeChild(body.firstChild);

            const activeResp = resp || _deadlinesLastResponse;
            if (!activeResp || !activeResp.ok) {
                const loading = document.createElement('div');
                loading.style.cssText = 'font-size: 13px; color: ' + theme.subtle + ';';
                loading.textContent = _deadlinesFetchInProgress ? 'Loading deadlines...' : 'Loading deadlines...';
                body.appendChild(loading);

                requestStudentDeadlines(!!force, function (newResp) {
                    refreshBtn.disabled = false;
                    refreshBtn.style.opacity = '1';
                    renderBody(newResp, false);
                });
                return;
            }

            const todayTs = startOfTodayUtcTs();
            const courseRows = buildUpcomingDeadlineRows(activeResp.course && activeResp.course.groups, todayTs, 8);
            const examRows = buildUpcomingDeadlineRows(activeResp.exam && activeResp.exam.groups, todayTs, 8);

            const meta = document.createElement('div');
            meta.style.cssText = 'font-size: 12px; color: ' + theme.subtle + '; margin-bottom: 10px;';
            const fetchedAt = activeResp.fetchedAt ? new Date(activeResp.fetchedAt) : null;
            meta.textContent = 'Updated: ' + (fetchedAt ? fetchedAt.toLocaleString() : 'unknown') + (activeResp.cached ? ' (cached)' : '');
            body.appendChild(meta);

            body.appendChild(createSection(
                'Course registration',
                (activeResp.course && activeResp.course.url) ? activeResp.course.url : 'https://student.dtu.dk/en/courses-and-teaching/course-registration/course-registration-deadlines',
                courseRows
            ));
            body.appendChild(createSection(
                'Exam registration',
                (activeResp.exam && activeResp.exam.url) ? activeResp.exam.url : 'https://student.dtu.dk/en/exam/exam-registration/-deadlines-for-exams',
                examRows
            ));

            refreshBtn.disabled = false;
            refreshBtn.style.opacity = '1';
        }

        renderBody(null, !!forceRefresh);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function updateDeadlinesWidgetSummary() {
        if (!IS_TOP_WINDOW) return;
        if (!isDTULearnHomepage() || !isDeadlinesEnabled()) return;

        const btn = document.querySelector('.dtu-deadlines-widget');
        if (!btn) return;

        const summary = btn.querySelector('.dtu-deadlines-summary');
        if (!summary) return;

        const resp = _deadlinesLastResponse;
        if (!resp || !resp.ok) {
            summary.textContent = _deadlinesFetchInProgress ? 'Loading...' : 'Open';
            btn.title = 'Deadlines: click to view course/exam registration deadlines.';
            return;
        }

        const todayTs = startOfTodayUtcTs();
        const rows = buildUpcomingDeadlineRows((resp.course && resp.course.groups) || [], todayTs, 20)
            .concat(buildUpcomingDeadlineRows((resp.exam && resp.exam.groups) || [], todayTs, 20));
        if (!rows.length) {
            summary.textContent = 'None';
            btn.title = 'Deadlines: no upcoming deadlines found.';
            return;
        }
        rows.sort(function (a, b) { return a.nextTs - b.nextTs; });
        const next = rows[0];
        const days = diffDaysUtc(todayTs, next.nextTs);
        if (days === 0) summary.textContent = 'Today';
        else summary.textContent = days + 'd';

        const iso = (next.state === 'active' && next.endIso) ? next.endIso : next.startIso;
        const pretty = iso ? formatIsoDateForDisplay(iso) : '';
        const verb = next.state === 'active' ? 'ends' : 'starts';
        const rel = (days === 0) ? 'today' : ('in ' + days + ' day' + (days === 1 ? '' : 's'));
        const label = next.label ? next.label.replace(/\s+/g, ' ').trim() : 'Next deadline';
        const period = next.period ? next.period.replace(/\s+/g, ' ').trim() : '';
        btn.title = 'Next deadline ' + verb + ' ' + rel + ': ' + label
            + (pretty ? (' (' + pretty + ')') : '')
            + (period ? (' - ' + period) : '')
            + '. Click for details.';
    }

    function insertDeadlinesWidget() {
        if (!isDTULearnHomepage() || !isDeadlinesEnabled()) {
            const existing = document.querySelector('.dtu-deadlines-widget');
            if (existing) existing.remove();
            hideDeadlinesModal();
            cleanupNavWidgetsContainer();
            return;
        }

        const navWidgets = ensureNavWidgetsContainer();
        if (!navWidgets) return;

        let btn = navWidgets.querySelector('.dtu-deadlines-widget');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dtu-deadlines-widget';
            markExt(btn);
            btn.style.cssText = 'display: inline-flex; align-items: baseline; gap: 8px; padding: 7px 12px; '
                + 'border-radius: 8px; border-left: 2px solid var(--dtu-ad-accent); border: 1px solid ' + (darkModeEnabled ? '#404040' : '#d1d5db') + '; '
                + 'background: ' + (darkModeEnabled ? '#2d2d2d' : '#ffffff') + '; '
                + 'color: ' + (darkModeEnabled ? '#e0e0e0' : '#333') + '; '
                + 'font-size: 12px; cursor: pointer; line-height: 1.2;';

            // Beat global `button { ... !important }` rules in darkmode.css.
            btn.style.setProperty('background', darkModeEnabled ? '#2d2d2d' : '#ffffff', 'important');
            btn.style.setProperty('background-color', darkModeEnabled ? '#2d2d2d' : '#ffffff', 'important');
            btn.style.setProperty('color', darkModeEnabled ? '#e0e0e0' : '#333', 'important');
            btn.style.setProperty('border-color', darkModeEnabled ? '#404040' : '#d1d5db', 'important');
            btn.style.setProperty('border-left', '2px solid var(--dtu-ad-accent)', 'important');

            const title = document.createElement('span');
            title.className = 'dtu-deadlines-title';
            title.textContent = 'Deadlines';
            title.style.cssText = 'font-weight: 800; letter-spacing: 0.2px;';
            markExt(title);

            const summary = document.createElement('span');
            summary.className = 'dtu-deadlines-summary';
            summary.textContent = 'Open';
            summary.style.cssText = 'font-weight: 700; opacity: 0.9; color: ' + (darkModeEnabled ? '#b0b0b0' : '#666') + ';';
            summary.style.setProperty('color', darkModeEnabled ? '#b0b0b0' : '#666', 'important');
            markExt(summary);

            btn.addEventListener('mouseenter', function () {
                btn.style.boxShadow = darkModeEnabled
                    ? '0 6px 20px rgba(0,0,0,0.35)'
                    : '0 8px 22px rgba(15,23,42,0.12)';
            });
            btn.addEventListener('mouseleave', function () {
                btn.style.boxShadow = 'none';
            });

            btn.addEventListener('click', function () {
                showDeadlinesModal(false);
            });

            btn.appendChild(title);
            btn.appendChild(summary);
            navWidgets.appendChild(btn);
        } else {
            // Update theme when dark mode toggles
            btn.style.setProperty('border-color', darkModeEnabled ? '#404040' : '#d1d5db', 'important');
            btn.style.setProperty('border-left', '2px solid var(--dtu-ad-accent)', 'important');
            btn.style.setProperty('background', darkModeEnabled ? '#2d2d2d' : '#ffffff', 'important');
            btn.style.setProperty('background-color', darkModeEnabled ? '#2d2d2d' : '#ffffff', 'important');
            btn.style.setProperty('color', darkModeEnabled ? '#e0e0e0' : '#333', 'important');
            const summary = btn.querySelector('.dtu-deadlines-summary');
            if (summary) summary.style.setProperty('color', darkModeEnabled ? '#b0b0b0' : '#666', 'important');
        }

        // Hydrate from persistent cache for instant render and fewer network requests.
        if (!_deadlinesLastResponse) {
            try {
                const raw = localStorage.getItem(DEADLINES_CACHE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.ok) _deadlinesLastResponse = parsed;
                }
            } catch (e) {
                // ignore
            }
        }

        updateDeadlinesWidgetSummary();

        // Refresh at most once per day (and only if stale/missing).
        const now = Date.now();
        const fetchedAt = _deadlinesLastResponse && typeof _deadlinesLastResponse.fetchedAt === 'number'
            ? _deadlinesLastResponse.fetchedAt
            : 0;
        const stale = !fetchedAt || (now - fetchedAt) > DEADLINES_CACHE_TTL_MS;
        if ((_deadlinesLastResponse == null || stale) && !_deadlinesFetchInProgress) {
            requestStudentDeadlines(false, function () { updateDeadlinesWidgetSummary(); });
        }
    }

    // ===== LIBRARY NAV DROPDOWN =====
    // Placed in the bottom nav bar (d2l-navigation-s-main-wrapper), after "Find Courses" and before "Study Rules".
    function isLibraryEnabled() {
        return isFeatureFlagEnabled(FEATURE_LIBRARY_DROPDOWN_KEY);
    }

    var _libraryEventsCache = null;
    var _libraryNewsCache = null;
    var LIBRARY_RUNTIME_STYLE_ID = 'dtu-library-runtime-style';
    var _libraryEscHandler = null;

    function ensureLibraryRuntimeStyles() {
        if (!IS_TOP_WINDOW) return;
        var host = document.head || document.documentElement;
        if (!host) return;

        var style = document.getElementById(LIBRARY_RUNTIME_STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = LIBRARY_RUNTIME_STYLE_ID;
            markExt(style);
            host.appendChild(style);
        }

        var panelBg = darkModeEnabled ? 'rgba(24,24,24,0.97)' : 'rgba(255,255,255,0.98)';
        var panelBorder = darkModeEnabled ? '#404040' : '#d6dce7';
        var panelText = darkModeEnabled ? '#e8e8e8' : '#1f2937';
        var muted = darkModeEnabled ? '#9aa0aa' : '#6b7280';
        var sectionBg = darkModeEnabled ? '#2d2d2d' : '#ffffff';
        var rowBg = darkModeEnabled ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';
        var rowBgHover = darkModeEnabled ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
        var sectionTitle = darkModeEnabled ? '#a3acb8' : '#667084';
        var stateBg = darkModeEnabled ? 'rgba(255,255,255,0.02)' : '#f8fafc';
        var actionBorder = darkModeEnabled ? '#4a4a4a' : '#d4dbe6';
        var actionBg = darkModeEnabled ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';
        var actionBgHover = darkModeEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
        var dateBg = darkModeEnabled ? '#212121' : '#f3f6fb';
        var panelShadow = darkModeEnabled ? '0.7' : '0.25';

        var css = [
            '.dtu-library-modal-overlay{position:fixed !important;inset:0 !important;z-index:1000000 !important;display:flex !important;align-items:center !important;justify-content:center !important;padding:20px !important;background:transparent !important;background-color:transparent !important;backdrop-filter:blur(4px) !important;-webkit-backdrop-filter:blur(4px) !important;}',
            '.dtu-library-backdrop{position:fixed !important;inset:0 !important;z-index:999998 !important;background:transparent !important;background-color:transparent !important;}',
            '.dtu-library-panel{display:flex !important;flex-direction:column !important;overflow:hidden !important;width:min(980px,calc(100vw - 40px)) !important;max-height:calc(100vh - 80px) !important;box-sizing:border-box !important;border-radius:14px !important;background:' + panelBg + ' !important;border:1px solid ' + panelBorder + ' !important;color:' + panelText + ' !important;box-shadow:0 20px 60px rgba(0,0,0,' + panelShadow + ') !important;}',
            '.dtu-library-panel,.dtu-library-panel *{box-sizing:border-box !important;font-family:inherit !important;}',
            '.dtu-library-header{display:flex !important;align-items:center !important;justify-content:space-between !important;gap:10px !important;padding:14px 18px 12px !important;border-bottom:1px solid ' + panelBorder + ' !important;background:rgba(255,255,255,0.02) !important;flex-shrink:0 !important;}',
            '.dtu-library-title{margin:0 !important;font-size:21px !important;font-weight:760 !important;line-height:1.1 !important;letter-spacing:-0.3px !important;color:' + panelText + ' !important;}',
            'button.dtu-library-close{appearance:none !important;border:1px solid ' + actionBorder + ' !important;background:' + actionBg + ' !important;color:' + muted + ' !important;border-radius:7px !important;cursor:pointer !important;padding:2px 9px !important;line-height:1 !important;font-size:26px !important;min-width:34px !important;min-height:30px !important;}',
            'button.dtu-library-close:hover{background:' + actionBgHover + ' !important;color:' + panelText + ' !important;border-color:var(--dtu-ad-accent) !important;}',
            '.dtu-library-content{display:flex !important;flex-direction:column !important;gap:14px !important;padding:18px 22px 20px !important;overflow:auto !important;background:transparent !important;flex:1 1 auto !important;}',
            '.dtu-library-layout{display:flex !important;flex-direction:column !important;gap:14px !important;}',
            '.dtu-library-feed-grid{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:14px !important;}',
            '.dtu-library-section{margin:0 !important;padding:12px !important;background:' + sectionBg + ' !important;border:1px solid ' + panelBorder + ' !important;border-radius:10px !important;}',
            '.dtu-library-section-header{display:flex !important;align-items:center !important;justify-content:space-between !important;gap:8px !important;margin:0 0 8px !important;padding:0 !important;background:transparent !important;}',
            '.dtu-library-section-title{margin:0 !important;font-size:12px !important;font-weight:700 !important;letter-spacing:0.7px !important;text-transform:uppercase !important;color:' + sectionTitle + ' !important;background:transparent !important;}',
            '.dtu-library-actions{display:flex !important;align-items:center !important;gap:8px !important;background:transparent !important;}',
            'button.dtu-library-action-btn{appearance:none !important;border:1px solid ' + actionBorder + ' !important;background:' + actionBg + ' !important;color:' + panelText + ' !important;border-radius:7px !important;cursor:pointer !important;padding:4px 10px !important;font-size:11px !important;font-weight:650 !important;line-height:1.2 !important;white-space:nowrap !important;min-height:26px !important;}',
            'button.dtu-library-action-btn:hover{background:' + actionBgHover + ' !important;border-color:var(--dtu-ad-accent) !important;color:var(--dtu-ad-accent-soft) !important;}',
            '.dtu-library-link-grid{display:grid !important;grid-template-columns:repeat(3,minmax(0,1fr)) !important;gap:8px !important;background:transparent !important;}',
            'a.dtu-library-link-item{display:flex !important;align-items:center !important;justify-content:center !important;min-height:44px !important;padding:9px 10px !important;border-radius:9px !important;background:' + rowBg + ' !important;border:1px solid ' + panelBorder + ' !important;color:' + panelText + ' !important;text-decoration:none !important;text-align:center !important;font-size:12px !important;font-weight:650 !important;line-height:1.25 !important;white-space:normal !important;overflow-wrap:anywhere !important;transition:background-color .16s ease,border-color .16s ease,transform .16s ease !important;}',
            'a.dtu-library-link-item:hover{background:' + rowBgHover + ' !important;border-color:var(--dtu-ad-accent) !important;color:var(--dtu-ad-accent-soft) !important;transform:translateY(-1px) !important;}',
            '.dtu-library-feed-list{display:flex !important;flex-direction:column !important;gap:8px !important;background:transparent !important;}',
            'a.dtu-library-feed-item{display:flex !important;align-items:flex-start !important;gap:11px !important;padding:10px !important;border-radius:10px !important;background:' + rowBg + ' !important;border:1px solid ' + panelBorder + ' !important;text-decoration:none !important;color:' + panelText + ' !important;transition:background-color .16s ease,border-color .16s ease,transform .16s ease !important;}',
            'a.dtu-library-feed-item:hover{background:' + rowBgHover + ' !important;border-color:var(--dtu-ad-accent) !important;transform:translateY(-1px) !important;}',
            '.dtu-library-date-badge{position:relative !important;display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:center !important;flex-shrink:0 !important;min-width:46px !important;height:50px !important;border-radius:9px !important;overflow:hidden !important;background:' + dateBg + ' !important;border:1px solid ' + panelBorder + ' !important;}',
            '.dtu-library-date-badge::before{content:\"\" !important;position:absolute !important;top:0 !important;left:0 !important;right:0 !important;height:3px !important;background:var(--dtu-ad-accent) !important;}',
            '.dtu-library-date-day{margin:3px 0 1px !important;font-size:17px !important;font-weight:780 !important;line-height:1 !important;color:' + panelText + ' !important;}',
            '.dtu-library-date-month{margin:0 !important;font-size:9px !important;font-weight:700 !important;line-height:1 !important;letter-spacing:0.55px !important;text-transform:uppercase !important;color:var(--dtu-ad-accent-soft) !important;}',
            '.dtu-library-item-content{min-width:0 !important;flex:1 1 auto !important;background:transparent !important;}',
            '.dtu-library-news-badge{display:inline-flex !important;align-items:center !important;padding:2px 7px !important;margin:0 0 4px !important;border-radius:999px !important;background:' + actionBg + ' !important;border:1px solid ' + actionBorder + ' !important;color:var(--dtu-ad-accent-soft) !important;font-size:9px !important;font-weight:760 !important;line-height:1.2 !important;letter-spacing:0.5px !important;text-transform:uppercase !important;}',
            '.dtu-library-item-title{margin:0 0 4px !important;font-size:13px !important;font-weight:700 !important;line-height:1.35 !important;color:' + panelText + ' !important;display:-webkit-box !important;-webkit-line-clamp:2 !important;line-clamp:2 !important;-webkit-box-orient:vertical !important;overflow:hidden !important;}',
            '.dtu-library-item-meta{margin:0 !important;font-size:11px !important;line-height:1.35 !important;color:' + muted + ' !important;white-space:normal !important;overflow-wrap:anywhere !important;}',
            '.dtu-library-state-msg{margin:0 !important;padding:16px 12px !important;border-radius:9px !important;border:1px dashed ' + panelBorder + ' !important;background:' + stateBg + ' !important;text-align:center !important;color:' + muted + ' !important;font-size:12px !important;font-style:italic !important;}',
            '@media (max-width: 900px){.dtu-library-feed-grid{grid-template-columns:1fr !important;}.dtu-library-link-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}}',
            '@media (max-width: 520px){.dtu-library-modal-overlay{padding:8px !important;}.dtu-library-panel{width:calc(100vw - 16px) !important;max-height:calc(100vh - 16px) !important;border-radius:12px !important;}.dtu-library-header{padding:12px 14px 10px !important;}.dtu-library-content{padding:12px 14px 14px !important;}.dtu-library-link-grid{grid-template-columns:1fr !important;}}'
        ].join('');

        if (style.textContent !== css) style.textContent = css;
    }

    function requestLibraryEvents(cb, forceRefresh) {
        sendRuntimeMessage({ type: 'dtu-library-events', forceRefresh: !!forceRefresh }, function (resp) {
            if (resp && resp.ok) _libraryEventsCache = resp;
            if (cb) cb(resp);
        });
    }

    function requestLibraryNews(cb, forceRefresh) {
        sendRuntimeMessage({ type: 'dtu-library-news', forceRefresh: !!forceRefresh }, function (resp) {
            if (resp && resp.ok) _libraryNewsCache = resp;
            if (cb) cb(resp);
        });
    }

    function removeLibraryNavDropdown() {
        var item = document.querySelector('.dtu-library-nav-item');
        if (item) item.remove();
        hideLibraryPanel();
    }

    function hideLibraryPanel() {
        var overlay = document.querySelector('.dtu-library-modal-overlay');
        if (overlay) overlay.remove();
        var panel = document.querySelector('.dtu-library-panel');
        if (panel) panel.remove();
        var backdrop = document.querySelector('.dtu-library-backdrop');
        if (backdrop) backdrop.remove();
        if (_libraryEscHandler) {
            try { document.removeEventListener('keydown', _libraryEscHandler); } catch (eEsc) { }
            _libraryEscHandler = null;
        }
        document.querySelectorAll('.dtu-library-nav-item .d2l-dropdown-opener[aria-expanded="true"]').forEach(function (btn) {
            btn.setAttribute('aria-expanded', 'false');
        });
    }

    // Find the "Study Rules" nav item so we can insert Library before it.
    function findStudyRulesNavItem() {
        var mainWrapper = document.querySelector('.d2l-navigation-s-main-wrapper');
        if (!mainWrapper) return null;
        var items = mainWrapper.querySelectorAll('.d2l-navigation-s-item');
        for (var i = 0; i < items.length; i++) {
            // Study Rules is a plain link (not a dropdown), check text
            var link = items[i].querySelector('a.d2l-navigation-s-link');
            if (link && /Study\s*Rules/i.test(link.textContent)) return items[i];
            // Also check dropdown group text
            var groupText = items[i].querySelector('.d2l-navigation-s-group-text');
            if (groupText && /Study\s*Rules/i.test(groupText.textContent)) return items[i];
        }
        return null;
    }

    function insertLibraryNavDropdown() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isLibraryEnabled()) {
            removeLibraryNavDropdown();
            return;
        }

        // Already inserted?
        if (document.querySelector('.dtu-library-nav-item')) return;

        var mainWrapper = document.querySelector('.d2l-navigation-s-main-wrapper');
        if (!mainWrapper) return;

        // Create the nav item wrapper (matches native nav items)
        var navItem = document.createElement('div');
        navItem.className = 'd2l-navigation-s-item dtu-library-nav-item';
        navItem.setAttribute('role', 'listitem');
        markExt(navItem);

        // Create a dropdown container
        var dropdown = document.createElement('d2l-dropdown');
        markExt(dropdown);

        // Create the opener button (matches the native dropdown buttons)
        var openerBtn = document.createElement('button');
        openerBtn.className = 'd2l-navigation-s-group d2l-dropdown-opener';
        openerBtn.setAttribute('aria-expanded', 'false');
        openerBtn.setAttribute('aria-haspopup', 'true');
        markExt(openerBtn);

        var wrapper = document.createElement('span');
        wrapper.className = 'd2l-navigation-s-group-wrapper';
        var textSpan = document.createElement('span');
        textSpan.className = 'd2l-navigation-s-group-text';
        textSpan.textContent = 'Library';
        var chevron = document.createElement('d2l-icon');
        chevron.setAttribute('icon', 'tier1:chevron-down');

        wrapper.appendChild(textSpan);
        wrapper.appendChild(chevron);
        openerBtn.appendChild(wrapper);
        dropdown.appendChild(openerBtn);
        navItem.appendChild(dropdown);

        // Insert before "Study Rules" if found, otherwise append
        var studyRules = findStudyRulesNavItem();
        if (studyRules && studyRules.parentNode === mainWrapper) {
            mainWrapper.insertBefore(navItem, studyRules);
        } else {
            // Fallback: insert before the bus departures or "More" item
            var busWidget = mainWrapper.querySelector('.dtu-bus-departures');
            var moreItem = mainWrapper.querySelector('.d2l-navigation-s-more');
            if (moreItem && moreItem.parentNode === mainWrapper) {
                mainWrapper.insertBefore(navItem, moreItem);
            } else if (busWidget && busWidget.parentNode === mainWrapper) {
                mainWrapper.insertBefore(navItem, busWidget);
            } else {
                mainWrapper.appendChild(navItem);
            }
        }

        // Instead of using Brightspace's d2l-dropdown-menu (which is complicated to
        // wire up), we use a custom panel that opens on click.
        openerBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var existing = document.querySelector('.dtu-library-panel');
            if (existing) {
                hideLibraryPanel();
                openerBtn.setAttribute('aria-expanded', 'false');
            } else {
                showLibraryPanel(openerBtn);
                openerBtn.setAttribute('aria-expanded', 'true');
            }
        });
    }

    function showLibraryPanel(anchorBtn) {
        hideLibraryPanel();
        ensureLibraryRuntimeStyles();

        var overlay = document.createElement('div');
        overlay.className = 'dtu-library-modal-overlay';
        markExt(overlay);
        overlay.addEventListener('mousedown', function (e) {
            if (e.target !== overlay) return;
            hideLibraryPanel();
            anchorBtn.setAttribute('aria-expanded', 'false');
        });

        _libraryEscHandler = function (e) {
            if (!e || e.key !== 'Escape') return;
            hideLibraryPanel();
            anchorBtn.setAttribute('aria-expanded', 'false');
        };
        document.addEventListener('keydown', _libraryEscHandler);

        var panel = document.createElement('div');
        panel.className = 'dtu-library-panel';
        markExt(panel);

        // Header
        var header = document.createElement('div');
        header.className = 'dtu-library-header';

        var headerTitle = document.createElement('div');
        headerTitle.className = 'dtu-library-title';
        headerTitle.textContent = 'DTU Library';

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'dtu-library-close';
        closeBtn.textContent = '×';
        closeBtn.title = 'Close';
        closeBtn.addEventListener('click', function () {
            hideLibraryPanel();
            anchorBtn.setAttribute('aria-expanded', 'false');
        });

        header.appendChild(headerTitle);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // Main Content Scroll Area
        var content = document.createElement('div');
        content.className = 'dtu-library-content';
        var layout = document.createElement('div');
        layout.className = 'dtu-library-layout';

        // Quick Links section
        var linksSection = document.createElement('div');
        linksSection.className = 'dtu-library-section';

        var linksHeader = document.createElement('div');
        linksHeader.className = 'dtu-library-section-header';

        var linksTitle = document.createElement('div');
        linksTitle.className = 'dtu-library-section-title';
        linksTitle.textContent = 'Quick Links';

        linksHeader.appendChild(linksTitle);
        linksSection.appendChild(linksHeader);

        var links = [
            { text: 'Book Study Room', url: 'https://www.supersaas.com/schedule/DTU_Library/Study_Areas_-_Lyngby' },
            { text: 'All Library Bookings', url: 'https://www.supersaas.com/schedule/DTU_Library/' },
            { text: 'DTU FindIt', url: 'https://findit.dtu.dk/' },
            { text: 'Printing', url: 'https://databar.dtu.dk/print' },
            { text: 'Events Calendar', url: 'https://www.bibliotek.dtu.dk/en/use-the-library/events/calendar' },
            { text: 'Library News', url: 'https://www.bibliotek.dtu.dk/en/news' }
        ];

        var linksGrid = document.createElement('div');
        linksGrid.className = 'dtu-library-link-grid';

        links.forEach(function (lnk) {
            var a = document.createElement('a');
            a.className = 'dtu-library-link-item';
            a.href = lnk.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = lnk.text;
            linksGrid.appendChild(a);
        });

        linksSection.appendChild(linksGrid);
        layout.appendChild(linksSection);

        // Events section
        var eventsSection = createLibraryFeedSection('Upcoming Events', 'events');
        var feedGrid = document.createElement('div');
        feedGrid.className = 'dtu-library-feed-grid';
        feedGrid.appendChild(eventsSection.container);

        // News section
        var newsSection = createLibraryFeedSection('Library News', 'news');
        feedGrid.appendChild(newsSection.container);
        layout.appendChild(feedGrid);
        content.appendChild(layout);

        panel.appendChild(content);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // Fetch data
        requestLibraryEvents(function (resp) {
            renderLibraryFeedItems(eventsSection, resp, 'events');
        });
        requestLibraryNews(function (resp) {
            renderLibraryFeedItems(newsSection, resp, 'news');
        });
    }

    function createLibraryFeedSection(title, type) {
        var container = document.createElement('div');
        container.className = 'dtu-library-section';
        container.setAttribute('data-dtu-library-feed-type', type);

        var header = document.createElement('div');
        header.className = 'dtu-library-section-header';

        var h3 = document.createElement('div');
        h3.className = 'dtu-library-section-title';
        h3.textContent = title;

        var actions = document.createElement('div');
        actions.className = 'dtu-library-actions';

        var refreshBtn = document.createElement('button');
        refreshBtn.type = 'button';
        refreshBtn.className = 'dtu-library-action-btn';
        refreshBtn.textContent = 'Refresh';
        refreshBtn.setAttribute('aria-label', 'Refresh ' + title.toLowerCase());

        actions.appendChild(refreshBtn);

        header.appendChild(h3);
        header.appendChild(actions);
        container.appendChild(header);

        var body = document.createElement('div');
        body.className = 'dtu-library-feed-list';

        // Loading placeholder
        var loading = document.createElement('div');
        loading.className = 'dtu-library-state-msg';
        loading.textContent = 'Loading...';
        body.appendChild(loading);

        container.appendChild(body);

        return { container: container, body: body, refreshBtn: refreshBtn, itemEls: [] };
    }

    function renderLibraryFeedItems(section, resp, type) {
        var body = section.body;
        while (body.firstChild) body.removeChild(body.firstChild);
        section.itemEls = [];

        // Attach refresh handler once.
        if (!section._dtuRefreshHooked && section.refreshBtn) {
            section._dtuRefreshHooked = true;
            section.refreshBtn.addEventListener('click', function (e) {
                try { e.preventDefault(); } catch (e0) { }
                // Re-render loading state quickly.
                while (body.firstChild) body.removeChild(body.firstChild);
                var loading = document.createElement('div');
                loading.className = 'dtu-library-state-msg';
                loading.textContent = 'Loading...';
                body.appendChild(loading);

                if (type === 'events') {
                    requestLibraryEvents(function (r) {
                        renderLibraryFeedItems(section, r, type);
                    }, true);
                } else {
                    requestLibraryNews(function (r) {
                        renderLibraryFeedItems(section, r, type);
                    }, true);
                }
            });
        }

        var items = null;
        if (resp && resp.ok) {
            items = (type === 'events') ? resp.events : resp.news;
        }

        if (resp && resp.ok === false) {
            var err = document.createElement('div');
            err.className = 'dtu-library-state-msg';

            var suffix = '';
            if (resp.error === 'http' && resp.status) suffix = ' (HTTP ' + resp.status + ')';
            else if (resp.error) suffix = ' (' + String(resp.error) + ')';
            err.textContent = 'Failed to load ' + (type === 'events' ? 'events' : 'news') + suffix + '.';
            body.appendChild(err);

            if (resp.message) {
                var msg = document.createElement('div');
                msg.textContent = String(resp.message);
                msg.style.cssText = 'font-size: 10px; margin-top: 4px; opacity: 0.7;';
                err.appendChild(msg);
            }
            return;
        }

        if (!items || items.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'dtu-library-state-msg';
            empty.textContent = type === 'events' ? 'No upcoming events' : 'No news available';
            body.appendChild(empty);
            return;
        }

        // Create item elements
        var itemEls = [];
        items.forEach(function (item) {
            var row = document.createElement('a');
            row.className = 'dtu-library-feed-item';
            row.href = item.url;
            row.target = '_blank';
            row.rel = 'noopener noreferrer';

            if (type === 'events') {
                // Date badge for events
                var badge = document.createElement('div');
                badge.className = 'dtu-library-date-badge';

                var dayText = String((item && item.day) || '').trim();
                var monthText = String((item && item.month) || '').trim();
                if ((!dayText || !monthText) && item && item.excerpt) {
                    var parsed = String(item.excerpt).match(/(\d{1,2})[.\-/\s]+([a-zA-Z]{3,9})/);
                    if (parsed) {
                        if (!dayText) dayText = parsed[1];
                        if (!monthText) monthText = parsed[2];
                    }
                }
                if (!dayText) dayText = '--';
                if (!monthText) monthText = 'TBA';

                var dayEl = document.createElement('div');
                dayEl.className = 'dtu-library-date-day';
                dayEl.textContent = dayText;

                var monthEl = document.createElement('div');
                monthEl.className = 'dtu-library-date-month';
                monthEl.textContent = monthText;

                badge.appendChild(dayEl);
                badge.appendChild(monthEl);
                row.appendChild(badge);
            } else {
                // Badge tag for news
                if (item.badge) {
                    // We'll prepend this to the title or content if needed, 
                    // but for now let's just create it. 
                    // Actually, the new styling might not explicitly support a separate badge column
                    // effectively unless we just put it in the content.
                    // The CSS had dtu-library-news-badge.
                }
            }

            var content = document.createElement('div');
            content.className = 'dtu-library-item-content';

            // News badge inside content if news
            if (type === 'news' && item.badge) {
                var tag = document.createElement('div');
                tag.className = 'dtu-library-news-badge';
                tag.textContent = item.badge;
                content.appendChild(tag);
            }

            var titleEl = document.createElement('div');
            titleEl.className = 'dtu-library-item-title';
            titleEl.textContent = item.title;

            var subEl = document.createElement('div');
            subEl.className = 'dtu-library-item-meta';
            subEl.textContent = type === 'events' ? item.excerpt : (item.date || item.excerpt);

            content.appendChild(titleEl);
            content.appendChild(subEl);
            row.appendChild(content);

            body.appendChild(row);
            itemEls.push(row);
        });
        section.itemEls = itemEls;
    }

    function insertDeadlinesToggle() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        const placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return;
        if (placeholder.querySelector && placeholder.querySelector('#deadlines-toggle')) return;

        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });
        if (!targetList) return;

        const li = document.createElement('li');
        li.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        const label = document.createElement('label');
        label.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; '
            + 'font-size: 14px; background-color: #2d2d2d !important; background: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'deadlines-toggle';
        toggle.checked = isDeadlinesEnabled();
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: var(--dtu-ad-accent);';

        toggle.addEventListener('change', function () {
            localStorage.setItem(DEADLINES_ENABLED_KEY, toggle.checked.toString());
            insertDeadlinesHomepageWidget();
        });

        label.appendChild(toggle);
        label.appendChild(document.createTextNode('Deadlines Widget'));
        li.appendChild(label);
        targetList.appendChild(li);
    }

    function insertSearchWidgetToggle() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        const placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return;
        if (placeholder.querySelector && placeholder.querySelector('#search-widget-toggle')) return;

        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });
        if (!targetList) return;

        const li = document.createElement('li');
        li.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        const label = document.createElement('label');
        label.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; '
            + 'font-size: 14px; background-color: #2d2d2d !important; background: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'search-widget-toggle';
        toggle.checked = isSearchWidgetEnabled();
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: var(--dtu-ad-accent);';

        toggle.addEventListener('change', function () {
            localStorage.setItem(SEARCH_WIDGET_ENABLED_KEY, toggle.checked.toString());
            insertDeadlinesHomepageWidget();
        });

        label.appendChild(toggle);
        label.appendChild(document.createTextNode('Search Courses Widget'));
        li.appendChild(label);
        targetList.appendChild(li);
    }

    function getAfterDarkAdminToolsList() {
        const placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return null;
        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });
        return targetList;
    }

    function insertAfterDarkFeatureToggle(id, labelText, featureKey) {
        const placeholder = getAdminToolsPlaceholder();
        if (placeholder && placeholder.querySelector && placeholder.querySelector('#' + id)) return;
        const targetList = getAfterDarkAdminToolsList();
        if (!targetList) return;

        const li = document.createElement('li');
        li.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        const label = document.createElement('label');
        label.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; '
            + 'font-size: 14px; background-color: #2d2d2d !important; background: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = id;
        toggle.checked = isFeatureFlagEnabled(featureKey);
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: var(--dtu-ad-accent);';

        toggle.addEventListener('change', function () {
            setFeatureFlagEnabled(featureKey, toggle.checked);

            // Apply immediately on pages where the feature is visible.
            if (featureKey === FEATURE_BOOK_FINDER_KEY) {
                if (toggle.checked) {
                    insertBookFinderLinks();
                } else {
                    // Remove any injected bars and reset markers.
                    document.querySelectorAll('[data-book-finder-bar]').forEach(function (el) { el.remove(); });
                    document.querySelectorAll('[data-book-finder-injected]').forEach(function (el) {
                        el.removeAttribute('data-book-finder-injected');
                    });
                }
            }
            if (featureKey === FEATURE_CAMPUSNET_GPA_TOOLS_KEY && window.location.hostname === 'campusnet.dtu.dk') {
                insertGPARow();
                insertECTSProgressBar();
                insertGPASimulator();
            }
            if (featureKey === FEATURE_KURSER_GRADE_STATS_KEY && window.location.hostname === 'kurser.dtu.dk') {
                insertKurserGradeStats();
            }
            if (featureKey === FEATURE_KURSER_TEXTBOOK_LINKER_KEY && window.location.hostname === 'kurser.dtu.dk') {
                insertKurserTextbookLinks();
            }
            if (featureKey === FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY && window.location.hostname === 'studieplan.dtu.dk') {
                scheduleStudyplanExamCluster(80);
            }
            if (featureKey === FEATURE_KURSER_COURSE_EVAL_KEY && window.location.hostname === 'kurser.dtu.dk') {
                insertKurserCourseEvaluation();
            }
            if (featureKey === FEATURE_KURSER_ROOM_FINDER_KEY && window.location.hostname === 'kurser.dtu.dk') {
                insertKurserRoomFinder();
            }
            if (featureKey === FEATURE_SMART_ROOM_LINKER_KEY) {
                if (toggle.checked) {
                    scheduleSmartRoomLinkerScan(null, 140);
                } else {
                    removeSmartRoomLinks();
                }
                if (window.location.hostname === 'kurser.dtu.dk') {
                    // Re-render Room Finder lines to switch between plain text and links.
                    insertKurserRoomFinder();
                }
            }
            if (featureKey === FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY && window.location.hostname === 'kurser.dtu.dk') {
                annotateKurserSchedulePlacement();
            }
            if (featureKey === FEATURE_CONTENT_SHORTCUT_KEY && window.location.hostname === 'learn.inside.dtu.dk') {
                if (toggle.checked) {
                    _contentShortcutsLastEnabled = true;
                    insertContentButtons();
                    startContentButtonBootstrap();
                } else {
                    _contentShortcutsLastEnabled = false;
                    removeContentButtons();
                }
            }
            if (featureKey === FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY && window.location.hostname === 'learn.inside.dtu.dk') {
                if (toggle.checked) {
                    insertDTULearnNavResourceLinks();
                } else {
                    removeDTULearnNavResourceLinks();
                }
            }
            if (featureKey === FEATURE_PARTICIPANT_INTEL_KEY) {
                if (window.location.hostname === 'campusnet.dtu.dk') {
                    insertParticipantIntelligence();
                    insertCampusnetSemesterTwinWidget();
                }
                if (window.location.hostname === 'learn.inside.dtu.dk') {
                    removeDTULearnSemesterTwinWidget();
                }
            }
            if (featureKey === FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY) {
                if (window.location.hostname === 'campusnet.dtu.dk') {
                    insertCampusnetSemesterTwinWidget();
                }
                if (window.location.hostname === 'learn.inside.dtu.dk') {
                    removeDTULearnSemesterTwinWidget();
                }
            }
            if (featureKey === FEATURE_KURSER_MYLINE_BADGES_KEY && window.location.hostname === 'kurser.dtu.dk') {
                insertKurserMyLineBadge();
            }
            if (featureKey === FEATURE_LIBRARY_DROPDOWN_KEY && window.location.hostname === 'learn.inside.dtu.dk') {
                if (toggle.checked) {
                    insertLibraryNavDropdown();
                } else {
                    removeLibraryNavDropdown();
                }
            }
        });

        label.appendChild(toggle);
        label.appendChild(document.createTextNode(labelText));
        li.appendChild(label);
        targetList.appendChild(li);
    }

    function insertAfterDarkFeatureToggles() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;

        insertAfterDarkFeatureToggle('feature-book-finder-toggle', 'Book links (Learn)', FEATURE_BOOK_FINDER_KEY);
        insertAfterDarkFeatureToggle('feature-content-shortcut-toggle', 'Course card Content shortcut', FEATURE_CONTENT_SHORTCUT_KEY);
        insertAfterDarkFeatureToggle('feature-learn-nav-resource-links-toggle', 'Navigation Quick Links (Learn)', FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY);
        insertAfterDarkFeatureToggle('feature-kurser-grade-stats-toggle', 'Kurser Grade Stats', FEATURE_KURSER_GRADE_STATS_KEY);
        insertAfterDarkFeatureToggle('feature-kurser-course-eval-toggle', 'Course Evaluation (Kurser)', FEATURE_KURSER_COURSE_EVAL_KEY);
        insertAfterDarkFeatureToggle('feature-kurser-room-finder-toggle', 'Room Finder (Kurser)', FEATURE_KURSER_ROOM_FINDER_KEY);
        insertAfterDarkFeatureToggle('feature-smart-room-linker-toggle', 'Smart Room Links (MazeMap)', FEATURE_SMART_ROOM_LINKER_KEY);
        insertAfterDarkFeatureToggle('feature-kurser-textbook-linker-toggle', 'Textbook links (Kurser)', FEATURE_KURSER_TEXTBOOK_LINKER_KEY);
        insertAfterDarkFeatureToggle('feature-kurser-schedule-annotation-toggle', 'Schedule Annotation (Kurser)', FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY);
        insertAfterDarkFeatureToggle('feature-kurser-myline-badges-toggle', 'MyLine Curriculum Badges (Kurser)', FEATURE_KURSER_MYLINE_BADGES_KEY);
        insertAfterDarkFeatureToggle('feature-campusnet-gpa-tools-toggle', 'CampusNet GPA Tools', FEATURE_CAMPUSNET_GPA_TOOLS_KEY);
        insertAfterDarkFeatureToggle('feature-participant-intel-toggle', 'Participant Intelligence (CampusNet)', FEATURE_PARTICIPANT_INTEL_KEY);
        insertAfterDarkFeatureToggle('feature-participant-intel-demographics-toggle', 'Course Composition', FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY);
        insertAfterDarkFeatureToggle('feature-participant-intel-shared-history-toggle', 'Shared Course History', FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY);
        insertAfterDarkFeatureToggle('feature-participant-intel-semester-twins-toggle', 'Semester Twins', FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY);
        insertAfterDarkFeatureToggle('feature-participant-intel-retention-toggle', 'Retention Radar', FEATURE_PARTICIPANT_INTEL_RETENTION_KEY);
        insertAfterDarkFeatureToggle('feature-studyplan-exam-cluster-toggle', 'Studyplan Exam Cluster', FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY);
        insertAfterDarkFeatureToggle('library-dropdown-toggle', 'Library', FEATURE_LIBRARY_DROPDOWN_KEY);
    }

    function syncAfterDarkFeatureToggleStates() {
        if (!IS_TOP_WINDOW) return;
        const mapping = [
            { id: 'feature-book-finder-toggle', key: FEATURE_BOOK_FINDER_KEY },
            { id: 'feature-content-shortcut-toggle', key: FEATURE_CONTENT_SHORTCUT_KEY },
            { id: 'feature-learn-nav-resource-links-toggle', key: FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY },
            { id: 'feature-kurser-grade-stats-toggle', key: FEATURE_KURSER_GRADE_STATS_KEY },
            { id: 'feature-kurser-course-eval-toggle', key: FEATURE_KURSER_COURSE_EVAL_KEY },
            { id: 'feature-kurser-room-finder-toggle', key: FEATURE_KURSER_ROOM_FINDER_KEY },
            { id: 'feature-smart-room-linker-toggle', key: FEATURE_SMART_ROOM_LINKER_KEY },
            { id: 'feature-kurser-textbook-linker-toggle', key: FEATURE_KURSER_TEXTBOOK_LINKER_KEY },
            { id: 'feature-kurser-schedule-annotation-toggle', key: FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY },
            { id: 'feature-kurser-myline-badges-toggle', key: FEATURE_KURSER_MYLINE_BADGES_KEY },
            { id: 'feature-campusnet-gpa-tools-toggle', key: FEATURE_CAMPUSNET_GPA_TOOLS_KEY },
            { id: 'feature-participant-intel-toggle', key: FEATURE_PARTICIPANT_INTEL_KEY },
            { id: 'feature-participant-intel-demographics-toggle', key: FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY },
            { id: 'feature-participant-intel-shared-history-toggle', key: FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY },
            { id: 'feature-participant-intel-semester-twins-toggle', key: FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY },
            { id: 'feature-participant-intel-retention-toggle', key: FEATURE_PARTICIPANT_INTEL_RETENTION_KEY },
            { id: 'feature-studyplan-exam-cluster-toggle', key: FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY },
            { id: 'library-dropdown-toggle', key: FEATURE_LIBRARY_DROPDOWN_KEY }
        ];
        mapping.forEach(function (m) {
            const el = document.querySelector('#' + m.id);
            if (el) el.checked = isFeatureFlagEnabled(m.key);
        });
    }

    // ===== STANDALONE SETTINGS MODAL =====
    // Completely independent of Brightspace's admin tools dropdown.
    // Opens as a fixed modal overlay (same pattern as bus config modal / Library panel).

    function applyFeatureToggleImmediately(featureKey, enabled) {
        if (featureKey === FEATURE_BOOK_FINDER_KEY) {
            if (enabled) { insertBookFinderLinks(); }
            else {
                document.querySelectorAll('[data-book-finder-bar]').forEach(function (el) { el.remove(); });
                document.querySelectorAll('[data-book-finder-injected]').forEach(function (el) { el.removeAttribute('data-book-finder-injected'); });
            }
        }
        if (featureKey === FEATURE_CAMPUSNET_GPA_TOOLS_KEY && window.location.hostname === 'campusnet.dtu.dk') {
            insertGPARow(); insertECTSProgressBar(); insertGPASimulator();
        }
        if (featureKey === FEATURE_KURSER_GRADE_STATS_KEY && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserGradeStats();
        }
        if (featureKey === FEATURE_KURSER_TEXTBOOK_LINKER_KEY && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserTextbookLinks();
        }
        if (featureKey === FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY && window.location.hostname === 'studieplan.dtu.dk') {
            scheduleStudyplanExamCluster(80);
        }
        if (featureKey === FEATURE_KURSER_COURSE_EVAL_KEY && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserCourseEvaluation();
        }
        if (featureKey === FEATURE_KURSER_ROOM_FINDER_KEY && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserRoomFinder();
        }
        if (featureKey === FEATURE_SMART_ROOM_LINKER_KEY) {
            if (enabled) { scheduleSmartRoomLinkerScan(null, 140); }
            else { removeSmartRoomLinks(); }
            if (window.location.hostname === 'kurser.dtu.dk') { insertKurserRoomFinder(); }
        }
        if (featureKey === FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY && window.location.hostname === 'kurser.dtu.dk') {
            annotateKurserSchedulePlacement();
        }
        if (featureKey === FEATURE_CONTENT_SHORTCUT_KEY && window.location.hostname === 'learn.inside.dtu.dk') {
            if (enabled) { _contentShortcutsLastEnabled = true; insertContentButtons(); startContentButtonBootstrap(); }
            else { _contentShortcutsLastEnabled = false; removeContentButtons(); }
        }
        if (featureKey === FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY && window.location.hostname === 'learn.inside.dtu.dk') {
            if (enabled) { insertDTULearnNavResourceLinks(); }
            else { removeDTULearnNavResourceLinks(); }
        }
        if (featureKey === FEATURE_PARTICIPANT_INTEL_KEY) {
            if (window.location.hostname === 'campusnet.dtu.dk') { insertParticipantIntelligence(); insertCampusnetSemesterTwinWidget(); }
            if (window.location.hostname === 'learn.inside.dtu.dk') { removeDTULearnSemesterTwinWidget(); }
        }
        if (featureKey === FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY) {
            if (window.location.hostname === 'campusnet.dtu.dk') { insertCampusnetSemesterTwinWidget(); }
            if (window.location.hostname === 'learn.inside.dtu.dk') { removeDTULearnSemesterTwinWidget(); }
        }
        if (featureKey === FEATURE_KURSER_MYLINE_BADGES_KEY && window.location.hostname === 'kurser.dtu.dk') {
            insertKurserMyLineBadge();
        }
        if (featureKey === FEATURE_LIBRARY_DROPDOWN_KEY && window.location.hostname === 'learn.inside.dtu.dk') {
            if (enabled) { insertLibraryNavDropdown(); }
            else { removeLibraryNavDropdown(); }
        }
    }

    function hideSettingsModal() {
        var overlay = document.querySelector('.dtu-settings-modal-overlay');
        if (overlay) overlay.remove();
        // Update gear aria-expanded
        try {
            var settingsBtn = document.querySelector('.dtu-settings-nav-item button');
            if (settingsBtn) settingsBtn.setAttribute('aria-expanded', 'false');
        } catch (e) { }
    }

    function showSettingsModal() {
        if (!IS_TOP_WINDOW) return;
        // Remove any existing instance
        hideSettingsModal();

        var isDark = !!darkModeEnabled;

        // -- Toggle definitions --
        // Each entry: { tid, getState, onChange, hasEdit?, onEdit? }
        var toggleHandlers = {
            'dark-mode-toggle': {
                getState: function () { return darkModeEnabled; },
                onChange: function (checked) { saveDarkModePreference(checked); location.reload(); }
            },
            'mojangles-toggle': {
                getState: function () { return isMojanglesEnabled(); },
                onChange: function (checked) { localStorage.setItem('mojanglesTextEnabled', checked.toString()); insertMojanglesText(); }
            },
            'bus-departures-toggle': {
                getState: function () { return isBusEnabled(); },
                onChange: function (checked, input) {
                    if (checked && (isApiQuotaExhausted() || isDailyLimitReached())) {
                        input.checked = false;
                        showQuotaExhaustedMessage(isApiQuotaExhausted() ? 'monthly' : 'daily');
                        return;
                    }
                    localStorage.setItem(BUS_ENABLED_KEY, checked.toString());
                    if (checked) {
                        var config = getBusConfig();
                        if (!config || !config.lines || config.lines.length === 0) { hideSettingsModal(); showBusConfigModal(); }
                        else { _lastBusFetch = 0; updateBusDepartures(); }
                    } else { insertBusDisplay(); }
                },
                hasEdit: true,
                onEdit: function () { hideSettingsModal(); showBusConfigModal(); }
            },
            'deadlines-toggle': {
                getState: function () { return isDeadlinesEnabled(); },
                onChange: function (checked) { localStorage.setItem(DEADLINES_ENABLED_KEY, checked.toString()); insertDeadlinesHomepageWidget(); }
            },
            'search-widget-toggle': {
                getState: function () { return isSearchWidgetEnabled(); },
                onChange: function (checked) { localStorage.setItem(SEARCH_WIDGET_ENABLED_KEY, checked.toString()); insertDeadlinesHomepageWidget(); }
            }
        };

        // Feature flag toggles
        var featureFlagToggles = [
            { id: 'feature-content-shortcut-toggle', key: FEATURE_CONTENT_SHORTCUT_KEY },
            { id: 'feature-learn-nav-resource-links-toggle', key: FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY },
            { id: 'library-dropdown-toggle', key: FEATURE_LIBRARY_DROPDOWN_KEY },
            { id: 'feature-campusnet-gpa-tools-toggle', key: FEATURE_CAMPUSNET_GPA_TOOLS_KEY },
            { id: 'feature-studyplan-exam-cluster-toggle', key: FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY },
            { id: 'feature-participant-intel-toggle', key: FEATURE_PARTICIPANT_INTEL_KEY },
            { id: 'feature-participant-intel-demographics-toggle', key: FEATURE_PARTICIPANT_INTEL_DEMOGRAPHICS_KEY },
            { id: 'feature-participant-intel-shared-history-toggle', key: FEATURE_PARTICIPANT_INTEL_SHARED_HISTORY_KEY },
            { id: 'feature-participant-intel-semester-twins-toggle', key: FEATURE_PARTICIPANT_INTEL_SEMESTER_TWINS_KEY },
            { id: 'feature-participant-intel-retention-toggle', key: FEATURE_PARTICIPANT_INTEL_RETENTION_KEY },
            { id: 'feature-kurser-grade-stats-toggle', key: FEATURE_KURSER_GRADE_STATS_KEY },
            { id: 'feature-book-finder-toggle', key: FEATURE_BOOK_FINDER_KEY },
            { id: 'feature-kurser-textbook-linker-toggle', key: FEATURE_KURSER_TEXTBOOK_LINKER_KEY },
            { id: 'feature-kurser-course-eval-toggle', key: FEATURE_KURSER_COURSE_EVAL_KEY },
            { id: 'feature-kurser-myline-badges-toggle', key: FEATURE_KURSER_MYLINE_BADGES_KEY },
            { id: 'feature-kurser-room-finder-toggle', key: FEATURE_KURSER_ROOM_FINDER_KEY },
            { id: 'feature-smart-room-linker-toggle', key: FEATURE_SMART_ROOM_LINKER_KEY },
            { id: 'feature-kurser-schedule-annotation-toggle', key: FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY }
        ];
        featureFlagToggles.forEach(function (ft) {
            toggleHandlers[ft.id] = {
                getState: function () { return isFeatureFlagEnabled(ft.key); },
                onChange: function (checked) { setFeatureFlagEnabled(ft.key, checked); applyFeatureToggleImmediately(ft.key, checked); }
            };
        });

        // -- Category definitions --
        var categories = [
            {
                id: 'appearance', label: 'Appearance', desc: 'Theme and visual settings', items: [
                    { tid: 'dark-mode-toggle', title: 'Dark Mode', desc: 'Global dark theme for all DTU sites' },
                    { kind: 'accent-theme', title: 'Accent Color', desc: 'Official DTU color presets plus custom (default: DTU Corporate Red)' },
                    { tid: 'mojangles-toggle', title: 'Mojangles Font', desc: 'Use the Minecraft font for headers' }
                ]
            },
            {
                id: 'interface', label: 'Interface', desc: 'Navigation and UI helpers', items: [
                    { tid: 'feature-learn-nav-resource-links-toggle', title: 'Navigation Quick Links', desc: 'Adds Panopto and CampusNet to the Student Resources menu' }
                ]
            },
            {
                id: 'dashboard', label: 'Dashboard', desc: 'DTU Learn homepage widgets', items: [
                    { tid: 'bus-departures-toggle', title: 'Bus Departures', desc: 'Show live bus departure times around campus' },
                    { tid: 'deadlines-toggle', title: 'Deadlines Widget', desc: 'Timeline of upcoming assignments' },
                    { tid: 'search-widget-toggle', title: 'Course Search', desc: 'Quick course search on the dashboard' },
                    { tid: 'feature-content-shortcut-toggle', title: 'Content Shortcut', desc: 'Direct link to course content from cards' },
                    { tid: 'library-dropdown-toggle', title: 'Library', desc: 'Quick links and live events/news from DTU Library' }
                ]
            },
            {
                id: 'study-tools', label: 'Study Tools', desc: 'Academic planning features', items: [
                    { tid: 'feature-campusnet-gpa-tools-toggle', title: 'GPA Calculator', desc: 'Weighted grade average on CampusNet' },
                    { tid: 'feature-studyplan-exam-cluster-toggle', title: 'Exam Cluster Warning', desc: 'Highlight exam schedule conflicts' }
                ]
            },
            {
                id: 'social', label: 'Social', desc: 'Participant intelligence tools', items: [
                    { tid: 'feature-participant-intel-toggle', title: 'Participant Intelligence', desc: 'Master switch for the whole suite' },
                    { tid: 'feature-participant-intel-demographics-toggle', title: 'Course Composition', desc: 'Program breakdown on CampusNet participant pages' },
                    { tid: 'feature-participant-intel-shared-history-toggle', title: 'Shared Course History', desc: 'Badges on participant lists + profile history card' },
                    { tid: 'feature-participant-intel-semester-twins-toggle', title: 'Semester Twins', desc: 'Widget on the CampusNet frontpage' },
                    { tid: 'feature-participant-intel-retention-toggle', title: 'Retention Radar', desc: 'Tracks Users enrollment count over time' }
                ]
            },
            {
                id: 'course-catalog', label: 'Course Catalog', desc: 'Enhancements for kurser.dtu.dk', items: [
                    { tid: 'feature-kurser-grade-stats-toggle', title: 'Grade Statistics', desc: 'Show pass rates and grade histograms' },
                    { tid: 'feature-book-finder-toggle', title: 'Book Finder', desc: 'Find textbooks from DTU Learn pages' },
                    { tid: 'feature-kurser-textbook-linker-toggle', title: 'Textbook Links', desc: 'Direct links to textbooks on DTU FindIt' },
                    { tid: 'feature-kurser-course-eval-toggle', title: 'Course Evaluation', desc: 'Show evaluation scores on course pages' },
                    { tid: 'feature-kurser-myline-badges-toggle', title: 'MyLine Curriculum Badges', desc: 'Mark courses as Mandatory/Core/Elective pool based on your study line' },
                    { tid: 'feature-kurser-room-finder-toggle', title: 'Room Finder', desc: 'Clickable room numbers with locations' },
                    { tid: 'feature-smart-room-linker-toggle', title: 'Smart Room Links', desc: 'Turn room mentions into MazeMap links (click-to-resolve)' },
                    { tid: 'feature-kurser-schedule-annotation-toggle', title: 'Schedule Annotation', desc: 'Enhanced schedule view on course pages' }
                ]
            }
        ];

        // -- Inject CSS (reuse existing styles or create) --
        var styleEl = document.querySelector('#dtu-settings-styles');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dtu-settings-styles';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = ''
            + '.dtu-am-root,.dtu-am-root *{box-sizing:border-box}'
            + '.dtu-am-root{display:flex;width:100%;max-width:100%;height:600px;max-height:calc(100vh - 140px);'
            + 'overflow:hidden;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
            + 'background:var(--dtu-am-content-bg) !important;color:var(--dtu-am-text) !important}'
            + '.dtu-am-sidebar{width:170px;min-width:170px;overflow-x:hidden;overflow-y:auto;'
            + 'padding:14px 0;display:flex;flex-direction:column;gap:1px;'
            + 'background:var(--dtu-am-sidebar-bg) !important;border-right:1px solid var(--dtu-am-border) !important}'
            + '.dtu-am-content{flex:1;min-width:0;min-height:0;height:100%;display:flex;flex-direction:column;'
            + 'overflow-x:hidden;overflow-y:auto;padding:20px 34px 20px 24px;'
            + 'background:var(--dtu-am-content-bg) !important}'
            + '.dtu-am-content::-webkit-scrollbar,.dtu-am-sidebar::-webkit-scrollbar{width:0;height:0}'
            + '.dtu-am-content,.dtu-am-sidebar{-ms-overflow-style:none;scrollbar-width:none}'
            + '.dtu-am-sidebar-hd{padding:0 14px 10px;border-bottom:1px solid var(--dtu-am-border) !important;margin-bottom:6px}'
            + '.dtu-am-brand{font-size:14px;font-weight:700;color:var(--dtu-am-text) !important}'
            + '.dtu-am-sub{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'
            + 'color:var(--dtu-am-muted) !important;margin-top:2px}'
            + '.dtu-am-panel{display:none !important}'
            + '.dtu-am-panel.dtu-active{display:block !important}'
            + '.dtu-am-panel-title{font-size:18px;font-weight:600;color:var(--dtu-am-text) !important;margin:0 0 2px}'
            + '.dtu-am-panel-desc{font-size:12px;color:var(--dtu-am-muted) !important;margin-bottom:16px}'
            + '.dtu-nav-i{padding:8px 14px;cursor:pointer;border-radius:6px;margin:2px 6px;transition:background .15s;user-select:none;-webkit-user-select:none;'
            + 'font-size:13px;color:var(--dtu-am-text) !important;border-left:3px solid transparent}'
            + '.dtu-nav-i:hover{background:var(--dtu-am-hover) !important}'
            + '.dtu-nav-i.dtu-active{background:var(--dtu-am-active-bg) !important;border-left-color:var(--dtu-am-accent) !important;'
            + 'color:var(--dtu-am-active-text) !important;font-weight:600}'
            + '.dtu-set-row{display:flex;align-items:center;justify-content:space-between;gap:16px;'
            + 'padding:12px 0;border-bottom:1px solid var(--dtu-am-border) !important}'
            + '.dtu-set-row:last-child{border-bottom:none}'
            + '.dtu-am-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}'
            + '.dtu-am-title{font-size:13px;font-weight:600;color:var(--dtu-am-text) !important;'
            + 'white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%}'
            + '.dtu-am-desc{font-size:11px;color:var(--dtu-am-muted) !important;line-height:1.25;'
            + 'white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%}'
            + '.dtu-am-link{font-size:11px;line-height:1.25;color:var(--dtu-am-action) !important;'
            + 'text-decoration:none !important;margin-top:1px}'
            + '.dtu-am-link:hover{text-decoration:underline !important;color:var(--dtu-am-accent) !important}'
            + '.dtu-am-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}'
            + '.dtu-am-edit{background:transparent;border:1px solid var(--dtu-am-border) !important;'
            + 'color:var(--dtu-am-action) !important;padding:6px 10px;border-radius:8px;cursor:pointer;'
            + 'font-size:12px;font-weight:700;line-height:1;white-space:nowrap}'
            + '.dtu-am-swatch{width:14px;height:14px;border-radius:999px;flex:0 0 auto;'
            + 'background:var(--dtu-am-accent) !important;border:1px solid var(--dtu-am-border) !important}'
            + '.dtu-am-select{min-width:140px;width:200px;max-width:240px;flex:0 1 auto;padding:6px 10px;border-radius:10px;'
            + 'background:var(--dtu-am-input-bg) !important;background-color:var(--dtu-am-input-bg) !important;'
            + 'color:var(--dtu-am-text) !important;border:1px solid var(--dtu-am-border) !important;'
            + 'font-size:12px;font-weight:700;cursor:pointer}'
            + '.dtu-am-select:focus{outline:none;border-color:var(--dtu-am-accent) !important;'
            + 'box-shadow:0 0 0 3px var(--dtu-am-accent-ring) !important}'
            + '.dtu-am-color{width:36px;height:30px;padding:0;border-radius:8px;cursor:pointer;'
            + 'border:1px solid var(--dtu-am-border) !important;'
            + 'background:var(--dtu-am-input-bg) !important;background-color:var(--dtu-am-input-bg) !important}'
            + '.dtu-tog{position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0}'
            + '.dtu-tog input{opacity:0;width:0;height:0;position:absolute}'
            + '.dtu-tog-sl{position:absolute;cursor:pointer;inset:0;'
            + 'background:var(--dtu-am-toggle-off) !important;background-color:var(--dtu-am-toggle-off) !important;'
            + 'border-radius:22px;transition:background .2s}'
            + '.dtu-tog-sl::before{content:"";position:absolute;height:16px;width:16px;left:3px;bottom:3px;'
            + 'background:#fff !important;border-radius:50%;transition:transform .2s}'
            + '.dtu-tog input:checked+.dtu-tog-sl{background:var(--dtu-am-accent) !important;background-color:var(--dtu-am-accent) !important}'
            + '.dtu-tog input:checked+.dtu-tog-sl::before{transform:translateX(18px)}';

        // -- Build modal overlay --
        var overlay = document.createElement('div');
        overlay.className = 'dtu-settings-modal-overlay';
        markExt(overlay);
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000000;display:flex;align-items:center;justify-content:center;'
            + 'background:transparent !important;background-color:transparent !important;'
            + 'backdrop-filter:blur(4px) !important;-webkit-backdrop-filter:blur(4px) !important;';

        // Click outside to close
        overlay.addEventListener('mousedown', function (e) {
            if (e.target === overlay) hideSettingsModal();
        });

        // Escape to close
        function onEsc(e) { if (e.key === 'Escape') { hideSettingsModal(); document.removeEventListener('keydown', onEsc); } }
        document.addEventListener('keydown', onEsc);

        // -- Modal card --
        var modal = document.createElement('div');
        markExt(modal);
        var modalW = Math.min(900, Math.floor(window.innerWidth - 40));
        modal.style.cssText = 'width:' + modalW + 'px;max-height:calc(100vh - 80px);border-radius:14px;overflow:hidden;'
            + 'box-shadow:0 20px 60px rgba(0,0,0,' + (isDark ? '0.7' : '0.25') + ');'
            + 'border:1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') + ';';

        // -- Build settings container (sidebar + content) --
        var container = document.createElement('div');
        markExt(container);
        container.className = 'dtu-am-root';
        applyAfterDarkAdminMenuThemeVars(container);

        // -- Sidebar --
        var sidebar = document.createElement('nav');
        markExt(sidebar);
        sidebar.className = 'dtu-am-sidebar';

        var sidebarHeader = document.createElement('div');
        markExt(sidebarHeader);
        sidebarHeader.className = 'dtu-am-sidebar-hd';
        var sidebarBrand = document.createElement('div');
        markExt(sidebarBrand);
        sidebarBrand.className = 'dtu-am-brand';
        sidebarBrand.textContent = 'DTU After Dark';
        var sidebarSub = document.createElement('div');
        markExt(sidebarSub);
        sidebarSub.className = 'dtu-am-sub';
        sidebarSub.textContent = 'Settings';
        sidebarHeader.appendChild(sidebarBrand);
        sidebarHeader.appendChild(sidebarSub);
        sidebar.appendChild(sidebarHeader);

        // -- Content area --
        var contentArea = document.createElement('div');
        markExt(contentArea);
        contentArea.className = 'dtu-am-content';

        var panels = {};
        var navItems = [];
        var firstCat = null;

        categories.forEach(function (cat) {
            if (!firstCat) firstCat = cat.id;

            // Nav item
            var navItem = document.createElement('div');
            markExt(navItem);
            navItem.className = 'dtu-nav-i' + (cat.id === firstCat ? ' dtu-active' : '');
            navItem.textContent = cat.label;
            navItem.setAttribute('data-cat', cat.id);
            sidebar.appendChild(navItem);
            navItems.push(navItem);

            // Panel
            var panel = document.createElement('div');
            markExt(panel);
            panel.className = 'dtu-am-panel' + (cat.id === firstCat ? ' dtu-active' : '');

            var panelTitle = document.createElement('div');
            markExt(panelTitle);
            panelTitle.className = 'dtu-am-panel-title';
            panelTitle.textContent = cat.label;
            panel.appendChild(panelTitle);

            var panelDesc = document.createElement('div');
            markExt(panelDesc);
            panelDesc.className = 'dtu-am-panel-desc';
            panelDesc.textContent = cat.desc;
            panel.appendChild(panelDesc);

            // Setting rows
            cat.items.forEach(function (item) {
                if (item && item.kind === 'accent-theme') {
                    var row0 = document.createElement('div');
                    markExt(row0);
                    row0.className = 'dtu-set-row';

                    var info0 = document.createElement('div');
                    markExt(info0);
                    info0.className = 'dtu-am-info';

                    var title0 = document.createElement('div');
                    markExt(title0);
                    title0.textContent = item.title;
                    title0.className = 'dtu-am-title';

                    var desc0 = document.createElement('div');
                    markExt(desc0);
                    desc0.textContent = item.desc;
                    desc0.className = 'dtu-am-desc';

                    var source0 = document.createElement('a');
                    markExt(source0);
                    source0.className = 'dtu-am-link';
                    source0.href = 'https://designguide.dtu.dk/colours';
                    source0.target = '_blank';
                    source0.rel = 'noopener noreferrer';
                    source0.textContent = 'Source: designguide.dtu.dk/colours';

                    info0.appendChild(title0);
                    info0.appendChild(desc0);
                    info0.appendChild(source0);

                    var actions0 = document.createElement('div');
                    markExt(actions0);
                    actions0.className = 'dtu-am-actions';

                    var swatch = document.createElement('span');
                    markExt(swatch);
                    swatch.className = 'dtu-am-swatch';
                    swatch.setAttribute('aria-hidden', 'true');
                    actions0.appendChild(swatch);

                    var sel = document.createElement('select');
                    markExt(sel);
                    sel.className = 'dtu-am-select';
                    sel.setAttribute('data-dtu-accent-theme-select', '1');

                    var ordered = ACCENT_THEME_ORDER.slice();
                    Object.keys(ACCENT_THEMES).forEach(function (k) {
                        if (ordered.indexOf(k) === -1) ordered.push(k);
                    });
                    ordered.forEach(function (k) {
                        var t = ACCENT_THEMES[k];
                        if (!t) return;
                        var opt = document.createElement('option');
                        opt.value = k;
                        opt.textContent = t.label || k;
                        sel.appendChild(opt);
                    });
                    try { sel.value = _accentThemeId; } catch (eSel) { }

                    sel.addEventListener('change', function () {
                        setAccentThemeId(sel.value);
                    });

                    var color = document.createElement('input');
                    markExt(color);
                    color.type = 'color';
                    color.className = 'dtu-am-color';
                    color.setAttribute('data-dtu-accent-custom-input', '1');
                    try { color.value = _accentCustomHex || ACCENT_CUSTOM_DEFAULT; } catch (eC0) { }
                    color.style.display = (_accentThemeId === 'custom') ? '' : 'none';
                    function onPickCustomColor() {
                        // Important: store/apply the picked hex BEFORE switching theme.
                        // setAccentThemeId() triggers syncAccentThemeUi() which can update the input value;
                        // doing it first would overwrite the user's picked color before we read it.
                        var picked = '';
                        try { picked = color.value; } catch (eV0) { picked = ''; }
                        if (picked) setAccentCustomHex(picked);
                        setAccentThemeId('custom');
                        try { sel.value = 'custom'; } catch (eS1) { }
                    }
                    // Firefox can fire `change` (not `input`) for the color picker dialog.
                    color.addEventListener('input', onPickCustomColor);
                    color.addEventListener('change', onPickCustomColor);

                    actions0.appendChild(sel);
                    actions0.appendChild(color);
                    row0.appendChild(info0);
                    row0.appendChild(actions0);
                    panel.appendChild(row0);
                    return;
                }

                var handler = toggleHandlers[item.tid];
                if (!handler) return;

                var row = document.createElement('div');
                markExt(row);
                row.className = 'dtu-set-row';

                var info = document.createElement('div');
                markExt(info);
                info.className = 'dtu-am-info';

                var titleEl = document.createElement('div');
                markExt(titleEl);
                titleEl.textContent = item.title;
                titleEl.className = 'dtu-am-title';

                var descEl = document.createElement('div');
                markExt(descEl);
                descEl.textContent = item.desc;
                descEl.className = 'dtu-am-desc';

                info.appendChild(titleEl);
                info.appendChild(descEl);

                var actions = document.createElement('div');
                markExt(actions);
                actions.className = 'dtu-am-actions';

                // Toggle switch
                var togLabel = document.createElement('label');
                markExt(togLabel);
                togLabel.className = 'dtu-tog';
                var input = document.createElement('input');
                input.type = 'checkbox';
                input.id = item.tid + '-modal';
                input.checked = handler.getState();
                var slider = document.createElement('span');
                markExt(slider);
                slider.className = 'dtu-tog-sl';
                togLabel.appendChild(input);
                togLabel.appendChild(slider);

                input.addEventListener('change', function () {
                    handler.onChange(input.checked, input);
                });

                // Edit button (for bus departures)
                if (handler.hasEdit) {
                    var editBtn = document.createElement('button');
                    markExt(editBtn);
                    editBtn.type = 'button';
                    editBtn.textContent = 'Edit';
                    editBtn.className = 'dtu-am-edit';
                    editBtn.addEventListener('click', function (e) {
                        try { e.preventDefault(); } catch (e0) { }
                        try { e.stopPropagation(); } catch (e1) { }
                        if (handler.onEdit) handler.onEdit();
                    });
                    function syncEditVis() { editBtn.style.display = handler.getState() ? 'inline-flex' : 'none'; }
                    syncEditVis();
                    input.addEventListener('change', syncEditVis);
                    actions.appendChild(editBtn);
                }

                actions.appendChild(togLabel);
                row.appendChild(info);
                row.appendChild(actions);
                panel.appendChild(row);
            });

            panels[cat.id] = panel;
            contentArea.appendChild(panel);
        });

        // Sidebar navigation
        function showCat(catId) {
            if (!catId) return;
            navItems.forEach(function (n) { n.classList.remove('dtu-active'); });
            navItems.forEach(function (n) { if (n.getAttribute('data-cat') === catId) n.classList.add('dtu-active'); });
            Object.keys(panels).forEach(function (id) {
                var p = panels[id];
                if (!p) return;
                try { p.style.display = ''; } catch (e0) { }
                p.classList.toggle('dtu-active', id === catId);
            });
            try { contentArea.scrollTop = 0; } catch (e1) { }
        }

        navItems.forEach(function (navItem) {
            function activate(e) {
                try { if (e) e.preventDefault(); } catch (e0) { }
                try { if (e) e.stopPropagation(); } catch (e1) { }
                showCat(navItem.getAttribute('data-cat'));
            }
            navItem.addEventListener('pointerdown', activate);
            navItem.addEventListener('mousedown', activate);
            navItem.addEventListener('click', activate);
        });

        // Disclaimer footer
        var disclaimerFooter = document.createElement('div');
        markExt(disclaimerFooter);
        disclaimerFooter.style.cssText = 'padding:12px 18px 14px;font-size:10.5px;line-height:1.45;color:var(--dtu-am-muted);border-top:1px solid var(--dtu-am-border);margin-top:auto;';
        disclaimerFooter.textContent = 'DTU After Dark is unofficial and not affiliated with DTU, Arcanic, or any service provider. '
            + 'Information shown (exam dates, deadlines, grades, bus times) may be inaccurate or outdated. '
            + 'Always verify critical information through official DTU channels. '
            + 'The developer(s) accept no responsibility for any consequences arising from the use of this extension.';
        contentArea.appendChild(disclaimerFooter);

        container.appendChild(sidebar);
        container.appendChild(contentArea);
        modal.appendChild(container);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    // Settings nav item in the bottom nav bar (same pattern as Library dropdown)
    function insertSettingsNavItem() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (document.querySelector('.dtu-settings-nav-item')) return;

        var mainWrapper = document.querySelector('.d2l-navigation-s-main-wrapper');
        if (!mainWrapper) return;

        var navItem = document.createElement('div');
        navItem.className = 'd2l-navigation-s-item dtu-settings-nav-item';
        navItem.setAttribute('role', 'listitem');
        markExt(navItem);

        var dropdown = document.createElement('d2l-dropdown');
        markExt(dropdown);

        var openerBtn = document.createElement('button');
        openerBtn.className = 'd2l-navigation-s-group d2l-dropdown-opener';
        openerBtn.setAttribute('aria-expanded', 'false');
        openerBtn.setAttribute('aria-haspopup', 'true');
        markExt(openerBtn);

        var wrapper = document.createElement('span');
        wrapper.className = 'd2l-navigation-s-group-wrapper';
        var textSpan = document.createElement('span');
        textSpan.className = 'd2l-navigation-s-group-text';
        textSpan.textContent = 'Settings';
        var chevron = document.createElement('d2l-icon');
        chevron.setAttribute('icon', 'tier1:chevron-down');

        wrapper.appendChild(textSpan);
        wrapper.appendChild(chevron);
        openerBtn.appendChild(wrapper);
        dropdown.appendChild(openerBtn);
        navItem.appendChild(dropdown);

        // Insert at the end of the nav bar (before "More" if it exists)
        var moreItem = mainWrapper.querySelector('.d2l-navigation-s-more');
        if (moreItem && moreItem.parentNode === mainWrapper) {
            mainWrapper.insertBefore(navItem, moreItem);
        } else {
            mainWrapper.appendChild(navItem);
        }

        openerBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var existing = document.querySelector('.dtu-settings-modal-overlay');
            if (existing) {
                hideSettingsModal();
            } else {
                showSettingsModal();
                openerBtn.setAttribute('aria-expanded', 'true');
            }
        });
    }

    function restructureAdminToolsPanel() {
        if (!IS_TOP_WINDOW) return;
        var placeholder = getAdminToolsPlaceholder();
        if (!placeholder) {
            adminToolsDbg('restructure_skip_no_placeholder', null);
            return;
        }
        // Avoid restructuring a hidden/stale placeholder; only do it when the user likely has the gear menu open.
        try {
            var dd0 = closestComposed(placeholder, 'd2l-dropdown-content');
            if (!adminToolsLikelyOpen(placeholder, dd0)) {
                adminToolsDbg('restructure_skip_not_visible', {
                    placeholderRect: safeRect(placeholder),
                    dropdownRect: safeRect(dd0),
                    sinceGearMs: (function () { try { return Date.now() - (_adminToolsLastGearInteractionTs || 0); } catch (e) { return null; } })()
                });
                return;
            }
        } catch (eVis) { }
        adminToolsDbg('restructure_enter', {
            marker: placeholder.getAttribute ? placeholder.getAttribute('data-dtu-restructured') : null
        });
        adminToolsDbg('restructure_target', {
            placeholderRect: safeRect(placeholder),
            dropdownRect: safeRect(closestComposed(placeholder, 'd2l-dropdown-content'))
        });

        function applyAdminMenuThemeVars(rootEl) {
            applyAfterDarkAdminMenuThemeVars(rootEl);
        }

        // Already restructured? Keep theme vars in sync and bail.
        if (placeholder.getAttribute('data-dtu-restructured') === '1') {
            try {
                var existingRoot = placeholder.querySelector('.dtu-am-root');
                if (existingRoot) {
                    applyAdminMenuThemeVars(existingRoot);
                    // Keep dropdown sizing stable across open/close cycles.
                    try { setTimeout(applyFixedAdminToolsDropdownSizing, 0); } catch (e1) { }
                    adminToolsDbg('restructure_already_done', { hasRoot: true });
                    return;
                }
            } catch (e0) { }
            // Marker was set but the UI is gone (Brightspace can re-render the dropdown).
            // Clear it so we rebuild.
            try { placeholder.removeAttribute('data-dtu-restructured'); } catch (e2) { }
            adminToolsDbg('restructure_marker_cleared_rebuild', null);
        }

        // Find the DTU After Dark column
        var afterDarkCol = null;
        var orgCol = null;
        placeholder.querySelectorAll('.d2l-admin-tools-column').forEach(function (col) {
            var h2 = col.querySelector('h2');
            if (!h2) return;
            var txt = normalizeWhitespace(h2.textContent || '');
            if (txt === 'DTU After Dark') afterDarkCol = col;
            else if (txt === 'Organization Related') orgCol = col;
        });

        if (!afterDarkCol) {
            adminToolsDbg('restructure_skip_no_after_dark_col', {
                colCount: (function () { try { return placeholder.querySelectorAll('.d2l-admin-tools-column').length; } catch (e) { return null; } })()
            });
            return;
        }

        // Collect existing toggle elements by ID (input elements directly)
        var toggleMap = {};
        afterDarkCol.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
            if (input.id) toggleMap[input.id] = input;
        });

        var isDark = darkModeEnabled;
        var sidebarBg = isDark ? '#2d2d2d' : '#f3f4f6';
        var contentBg = isDark ? '#2d2d2d' : '#ffffff';
        var textColor = isDark ? '#e0e0e0' : '#1f2937';
        var mutedColor = isDark ? '#888' : '#6b7280';
        var borderClr = isDark ? '#333' : '#e5e7eb';
        var hoverBg = isDark ? '#333' : '#e5e7eb';
        var activeText = isDark ? '#ff6b6b' : '#990000';
        var activeBg = isDark ? 'rgba(153,0,0,0.13)' : 'rgba(153,0,0,0.07)';
        var toggleOff = isDark ? '#555' : '#ccc';

        // Inject / update admin menu styles (class-based; theme is controlled by CSS variables on .dtu-am-root).
        var styleEl = document.querySelector('#dtu-settings-styles');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dtu-settings-styles';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = ''
            + '.dtu-am-root,.dtu-am-root *{box-sizing:border-box}'
            + '.dtu-am-root{display:flex;width:100%;max-width:100%;height:var(--dtu-am-height,600px);max-height:calc(100vh - 140px);'
            + 'overflow:hidden;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif;'
            + 'background:var(--dtu-am-content-bg) !important;color:var(--dtu-am-text) !important}'
            + '.dtu-am-sidebar{width:170px;min-width:170px;overflow-x:hidden;overflow-y:auto;'
            + 'padding:14px 0;display:flex;flex-direction:column;gap:1px;'
            + 'background:var(--dtu-am-sidebar-bg) !important;border-right:1px solid var(--dtu-am-border) !important}'
            + '.dtu-am-content{flex:1;min-width:0;min-height:0;height:100%;'
            + 'overflow-x:hidden;overflow-y:auto;padding:20px 34px 20px 24px;'
            + 'background:var(--dtu-am-content-bg) !important}'
            + '.dtu-am-content::-webkit-scrollbar,.dtu-am-sidebar::-webkit-scrollbar{width:0;height:0}'
            + '.dtu-am-content,.dtu-am-sidebar{-ms-overflow-style:none;scrollbar-width:none}'
            + '.dtu-am-sidebar-hd{padding:0 14px 10px;border-bottom:1px solid var(--dtu-am-border) !important;margin-bottom:6px}'
            + '.dtu-am-brand{font-size:14px;font-weight:700;color:var(--dtu-am-text) !important}'
            + '.dtu-am-sub{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'
            + 'color:var(--dtu-am-muted) !important;margin-top:2px}'
            + '.dtu-am-panel{display:none !important}'
            + '.dtu-am-panel.dtu-active{display:block !important}'
            + '.dtu-am-panel-title{font-size:18px;font-weight:600;color:var(--dtu-am-text) !important;margin:0 0 2px}'
            + '.dtu-am-panel-desc{font-size:12px;color:var(--dtu-am-muted) !important;margin-bottom:16px}'
            + '.dtu-nav-i{padding:8px 14px;cursor:pointer;border-radius:6px;margin:2px 6px;transition:background .15s;user-select:none;-webkit-user-select:none;'
            + 'font-size:13px;color:var(--dtu-am-text) !important;border-left:3px solid transparent}'
            + '.dtu-nav-i:hover{background:var(--dtu-am-hover) !important}'
            + '.dtu-nav-i.dtu-active{background:var(--dtu-am-active-bg) !important;border-left-color:var(--dtu-am-accent) !important;'
            + 'color:var(--dtu-am-active-text) !important;font-weight:600}'
            + '.dtu-set-row{display:flex;align-items:center;justify-content:space-between;gap:16px;'
            + 'padding:12px 0;border-bottom:1px solid var(--dtu-am-border) !important}'
            + '.dtu-set-row:last-child{border-bottom:none}'
            + '.dtu-am-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}'
            + '.dtu-am-title{font-size:13px;font-weight:600;color:var(--dtu-am-text) !important;'
            + 'white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%}'
            + '.dtu-am-desc{font-size:11px;color:var(--dtu-am-muted) !important;line-height:1.25;'
            + 'white-space:normal;overflow-wrap:anywhere;word-break:break-word;max-width:100%}'
            + '.dtu-am-link{font-size:11px;line-height:1.25;color:var(--dtu-am-action) !important;'
            + 'text-decoration:none !important;margin-top:1px}'
            + '.dtu-am-link:hover{text-decoration:underline !important;color:var(--dtu-am-accent) !important}'
            + '.dtu-am-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}'
            + '.dtu-am-edit{background:transparent;border:1px solid var(--dtu-am-border) !important;'
            + 'color:var(--dtu-am-action) !important;padding:6px 10px;border-radius:8px;cursor:pointer;'
            + 'font-size:12px;font-weight:700;line-height:1;white-space:nowrap}'
            + '.dtu-am-swatch{width:14px;height:14px;border-radius:999px;flex:0 0 auto;'
            + 'background:var(--dtu-am-accent) !important;border:1px solid var(--dtu-am-border) !important}'
            + '.dtu-am-select{min-width:140px;width:200px;max-width:240px;flex:0 1 auto;padding:6px 10px;border-radius:10px;'
            + 'background:var(--dtu-am-input-bg) !important;background-color:var(--dtu-am-input-bg) !important;'
            + 'color:var(--dtu-am-text) !important;border:1px solid var(--dtu-am-border) !important;'
            + 'font-size:12px;font-weight:700;cursor:pointer}'
            + '.dtu-am-select:focus{outline:none;border-color:var(--dtu-am-accent) !important;'
            + 'box-shadow:0 0 0 3px var(--dtu-am-accent-ring) !important}'
            + '.dtu-am-color{width:36px;height:30px;padding:0;border-radius:8px;cursor:pointer;'
            + 'border:1px solid var(--dtu-am-border) !important;'
            + 'background:var(--dtu-am-input-bg) !important;background-color:var(--dtu-am-input-bg) !important}'
            + '.dtu-tog{position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0}'
            + '.dtu-tog input{opacity:0;width:0;height:0;position:absolute}'
            + '.dtu-tog-sl{position:absolute;cursor:pointer;inset:0;'
            + 'background:var(--dtu-am-toggle-off) !important;background-color:var(--dtu-am-toggle-off) !important;'
            + 'border-radius:22px;transition:background .2s}'
            + '.dtu-tog-sl::before{content:\"\";position:absolute;height:16px;width:16px;left:3px;bottom:3px;'
            + 'background:#fff !important;border-radius:50%;transition:transform .2s}'
            + '.dtu-tog input:checked+.dtu-tog-sl{background:var(--dtu-am-accent) !important;background-color:var(--dtu-am-accent) !important}'
            + '.dtu-tog input:checked+.dtu-tog-sl::before{transform:translateX(18px)}';

        // Category definitions with descriptions
        var categories = [
            {
                id: 'appearance', label: 'Appearance', desc: 'Theme and visual settings', items: [
                    { tid: 'dark-mode-toggle', title: 'Dark Mode', desc: 'Global dark theme for all DTU sites' },
                    { kind: 'accent-theme', title: 'Accent Color', desc: 'Official DTU color presets plus custom (default: DTU Corporate Red)' },
                    { tid: 'mojangles-toggle', title: 'Mojangles Font', desc: 'Use the Minecraft font for headers' }
                ]
            },
            {
                id: 'interface', label: 'Interface', desc: 'Navigation and UI helpers', items: [
                    { tid: 'feature-learn-nav-resource-links-toggle', title: 'Navigation Quick Links', desc: 'Adds Panopto and CampusNet to the Student Resources menu' }
                ]
            },
            {
                id: 'dashboard', label: 'Dashboard', desc: 'DTU Learn homepage widgets', items: [
                    { tid: 'bus-departures-toggle', title: 'Bus Departures', desc: 'Show live bus departure times around campus' },
                    { tid: 'deadlines-toggle', title: 'Deadlines Widget', desc: 'Timeline of upcoming assignments' },
                    { tid: 'search-widget-toggle', title: 'Course Search', desc: 'Quick course search on the dashboard' },
                    { tid: 'feature-content-shortcut-toggle', title: 'Content Shortcut', desc: 'Direct link to course content from cards' },
                    { tid: 'library-dropdown-toggle', title: 'Library', desc: 'Quick links and live events/news from DTU Library' }
                ]
            },
            {
                id: 'study-tools', label: 'Study Tools', desc: 'Academic planning features', items: [
                    { tid: 'feature-campusnet-gpa-tools-toggle', title: 'GPA Calculator', desc: 'Weighted grade average on CampusNet' },
                    { tid: 'feature-studyplan-exam-cluster-toggle', title: 'Exam Cluster Warning', desc: 'Highlight exam schedule conflicts' }
                ]
            },
            {
                id: 'social', label: 'Social', desc: 'Participant intelligence tools', items: [
                    { tid: 'feature-participant-intel-toggle', title: 'Participant Intelligence', desc: 'Master switch for the whole suite' },
                    { tid: 'feature-participant-intel-demographics-toggle', title: 'Course Composition', desc: 'Program breakdown on CampusNet participant pages' },
                    { tid: 'feature-participant-intel-shared-history-toggle', title: 'Shared Course History', desc: 'Badges on participant lists + profile history card' },
                    { tid: 'feature-participant-intel-semester-twins-toggle', title: 'Semester Twins', desc: 'Widget on the CampusNet frontpage' },
                    { tid: 'feature-participant-intel-retention-toggle', title: 'Retention Radar', desc: 'Tracks Users enrollment count over time' }
                ]
            },
            {
                id: 'course-catalog', label: 'Course Catalog', desc: 'Enhancements for kurser.dtu.dk', items: [
                    { tid: 'feature-kurser-grade-stats-toggle', title: 'Grade Statistics', desc: 'Show pass rates and grade histograms' },
                    { tid: 'feature-book-finder-toggle', title: 'Book Finder', desc: 'Find textbooks from DTU Learn pages' },
                    { tid: 'feature-kurser-textbook-linker-toggle', title: 'Textbook Links', desc: 'Direct links to textbooks on DTU FindIt' },
                    { tid: 'feature-kurser-course-eval-toggle', title: 'Course Evaluation', desc: 'Show evaluation scores on course pages' },
                    { tid: 'feature-kurser-myline-badges-toggle', title: 'MyLine Curriculum Badges', desc: 'Mark courses as Mandatory/Core/Elective pool based on your study line' },
                    { tid: 'feature-kurser-room-finder-toggle', title: 'Room Finder', desc: 'Clickable room numbers with locations' },
                    { tid: 'feature-smart-room-linker-toggle', title: 'Smart Room Links', desc: 'Turn room mentions into MazeMap links (click-to-resolve)' },
                    { tid: 'feature-kurser-schedule-annotation-toggle', title: 'Schedule Annotation', desc: 'Enhanced schedule view on course pages' }
                ]
            }
        ];

        // === Build the settings panel ===
        var container = document.createElement('div');
        markExt(container);
        container.className = 'dtu-am-root';
        applyAdminMenuThemeVars(container);

        // -- Sidebar --
        var sidebar = document.createElement('nav');
        markExt(sidebar);
        sidebar.className = 'dtu-am-sidebar';

        // Sidebar header
        var sidebarHeader = document.createElement('div');
        markExt(sidebarHeader);
        sidebarHeader.className = 'dtu-am-sidebar-hd';
        var sidebarBrand = document.createElement('div');
        markExt(sidebarBrand);
        sidebarBrand.className = 'dtu-am-brand';
        sidebarBrand.textContent = 'DTU After Dark';
        var sidebarSub = document.createElement('div');
        markExt(sidebarSub);
        sidebarSub.className = 'dtu-am-sub';
        sidebarSub.textContent = 'Settings';
        sidebarHeader.appendChild(sidebarBrand);
        sidebarHeader.appendChild(sidebarSub);
        sidebar.appendChild(sidebarHeader);

        // -- Content area --
        var contentArea = document.createElement('div');
        markExt(contentArea);
        contentArea.className = 'dtu-am-content';

        var panels = {};
        var navItems = [];
        var firstCat = null;

        categories.forEach(function (cat) {
            // Skip categories with no available toggles
            var hasAny = false;
            cat.items.forEach(function (item) { if (toggleMap[item.tid]) hasAny = true; });
            if (!hasAny) return;
            if (!firstCat) firstCat = cat.id;

            // Nav item
            var navItem = document.createElement('div');
            markExt(navItem);
            navItem.className = 'dtu-nav-i' + (cat.id === firstCat ? ' dtu-active' : '');
            navItem.textContent = cat.label;
            navItem.setAttribute('data-cat', cat.id);
            sidebar.appendChild(navItem);
            navItems.push(navItem);

            // Panel
            var panel = document.createElement('div');
            markExt(panel);
            panel.className = 'dtu-am-panel' + (cat.id === firstCat ? ' dtu-active' : '');

            // Panel header
            var panelTitle = document.createElement('div');
            markExt(panelTitle);
            panelTitle.className = 'dtu-am-panel-title';
            panelTitle.textContent = cat.label;
            panel.appendChild(panelTitle);

            var panelDesc = document.createElement('div');
            markExt(panelDesc);
            panelDesc.className = 'dtu-am-panel-desc';
            panelDesc.textContent = cat.desc;
            panel.appendChild(panelDesc);

            // Setting rows
            cat.items.forEach(function (item) {
                if (item && item.kind === 'accent-theme') {
                    var row0 = document.createElement('div');
                    markExt(row0);
                    row0.className = 'dtu-set-row';

                    // Left: title + description
                    var info0 = document.createElement('div');
                    markExt(info0);
                    info0.className = 'dtu-am-info';

                    var title0 = document.createElement('div');
                    markExt(title0);
                    title0.textContent = item.title;
                    title0.className = 'dtu-am-title';

                    var desc0 = document.createElement('div');
                    markExt(desc0);
                    desc0.textContent = item.desc;
                    desc0.className = 'dtu-am-desc';

                    var source0 = document.createElement('a');
                    markExt(source0);
                    source0.className = 'dtu-am-link';
                    source0.href = 'https://designguide.dtu.dk/colours';
                    source0.target = '_blank';
                    source0.rel = 'noopener noreferrer';
                    source0.textContent = 'Source: designguide.dtu.dk/colours';

                    info0.appendChild(title0);
                    info0.appendChild(desc0);
                    info0.appendChild(source0);

                    // Right: actions (accent picker)
                    var actions0 = document.createElement('div');
                    markExt(actions0);
                    actions0.className = 'dtu-am-actions';

                    var swatch = document.createElement('span');
                    markExt(swatch);
                    swatch.className = 'dtu-am-swatch';
                    swatch.setAttribute('aria-hidden', 'true');
                    actions0.appendChild(swatch);

                    var sel = document.createElement('select');
                    markExt(sel);
                    sel.className = 'dtu-am-select';
                    sel.setAttribute('data-dtu-accent-theme-select', '1');

                    var ordered = ACCENT_THEME_ORDER.slice();
                    Object.keys(ACCENT_THEMES).forEach(function (k) {
                        if (ordered.indexOf(k) === -1) ordered.push(k);
                    });
                    ordered.forEach(function (k) {
                        var t = ACCENT_THEMES[k];
                        if (!t) return;
                        var opt = document.createElement('option');
                        opt.value = k;
                        opt.textContent = t.label || k;
                        sel.appendChild(opt);
                    });
                    try { sel.value = _accentThemeId; } catch (eSel) { }

                    sel.addEventListener('change', function () {
                        setAccentThemeId(sel.value);
                    });

                    var color = document.createElement('input');
                    markExt(color);
                    color.type = 'color';
                    color.className = 'dtu-am-color';
                    color.setAttribute('data-dtu-accent-custom-input', '1');
                    try { color.value = _accentCustomHex || ACCENT_CUSTOM_DEFAULT; } catch (eC0) { }
                    color.style.display = (_accentThemeId === 'custom') ? '' : 'none';
                    function onPickCustomColor() {
                        // Important: store/apply the picked hex BEFORE switching theme.
                        // setAccentThemeId() triggers syncAccentThemeUi() which can update the input value;
                        // doing it first would overwrite the user's picked color before we read it.
                        var picked = '';
                        try { picked = color.value; } catch (eV0) { picked = ''; }
                        if (picked) setAccentCustomHex(picked);
                        setAccentThemeId('custom');
                        try { sel.value = 'custom'; } catch (eS1) { }
                    }
                    // Firefox can fire `change` (not `input`) for the color picker dialog.
                    color.addEventListener('input', onPickCustomColor);
                    color.addEventListener('change', onPickCustomColor);

                    actions0.appendChild(sel);
                    actions0.appendChild(color);
                    row0.appendChild(info0);
                    row0.appendChild(actions0);
                    panel.appendChild(row0);
                    return;
                }

                var input = toggleMap[item.tid];
                if (!input) return;

                var row = document.createElement('div');
                markExt(row);
                row.className = 'dtu-set-row';

                // Left: title + description
                var info = document.createElement('div');
                markExt(info);
                info.className = 'dtu-am-info';

                var titleEl = document.createElement('div');
                markExt(titleEl);
                titleEl.textContent = item.title;
                titleEl.className = 'dtu-am-title';

                var descEl = document.createElement('div');
                markExt(descEl);
                descEl.textContent = item.desc;
                descEl.className = 'dtu-am-desc';

                info.appendChild(titleEl);
                info.appendChild(descEl);

                // Right: actions (toggle + optional buttons)
                var actions = document.createElement('div');
                markExt(actions);
                actions.className = 'dtu-am-actions';

                // Toggle switch (moves the existing input, preserving event listeners)
                var togLabel = document.createElement('label');
                markExt(togLabel);
                togLabel.className = 'dtu-tog';
                // Old versions used inline styles to hide the input; the new CSS handles it.
                try { input.removeAttribute('style'); } catch (e0) { }
                togLabel.appendChild(input);
                var slider = document.createElement('span');
                markExt(slider);
                slider.className = 'dtu-tog-sl';
                togLabel.appendChild(slider);

                // Bus Departures: add "Edit" button when enabled (opens configuration modal)
                if (item.tid === 'bus-departures-toggle') {
                    var editBtn = document.createElement('button');
                    markExt(editBtn);
                    editBtn.type = 'button';
                    editBtn.textContent = 'Edit';
                    editBtn.className = 'dtu-am-edit';
                    editBtn.addEventListener('click', function (e) {
                        try { e.preventDefault(); } catch (e0) { }
                        try { e.stopPropagation(); } catch (e00) { }

                        // Close Admin Tools dropdown first so only the modal remains in focus.
                        try {
                            var gearBtn = document.querySelector('button[aria-label="Admin Tools"]');
                            if (gearBtn) gearBtn.click();
                        } catch (e01) { }
                        try {
                            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                        } catch (e02) { }

                        setTimeout(function () {
                            try { showBusConfigModal(); } catch (e1) { }
                        }, 60);
                    });

                    function syncEditVisibility() {
                        var enabled = false;
                        try { enabled = isBusEnabled(); } catch (e2) { enabled = !!input.checked; }
                        editBtn.style.display = enabled ? 'inline-flex' : 'none';
                    }
                    syncEditVisibility();
                    input.addEventListener('change', function () { syncEditVisibility(); });

                    actions.appendChild(editBtn);
                }

                actions.appendChild(togLabel);

                row.appendChild(info);
                row.appendChild(actions);
                panel.appendChild(row);
            });

            panels[cat.id] = panel;
            contentArea.appendChild(panel);
        });

        function showSettingsCategory(catId) {
            if (!catId) return;
            navItems.forEach(function (n) { n.classList.remove('dtu-active'); });
            navItems.forEach(function (n) {
                if (n.getAttribute('data-cat') === catId) n.classList.add('dtu-active');
            });
            Object.keys(panels).forEach(function (id) {
                var p = panels[id];
                if (!p) return;
                try { p.style.display = ''; } catch (e0) { }
                p.classList.toggle('dtu-active', id === catId);
            });
            try { contentArea.scrollTop = 0; } catch (e1) { }
            try { contentArea.scrollLeft = 0; } catch (e2) { }
        }

        // Nav handlers: some D2L dropdown setups can swallow "click" events, so also listen on pointer/mouse down.
        navItems.forEach(function (navItem) {
            function activate(e) {
                try { if (e) e.preventDefault(); } catch (e0) { }
                try { if (e) e.stopPropagation(); } catch (e1) { }
                showSettingsCategory(navItem.getAttribute('data-cat'));
            }
            navItem.addEventListener('pointerdown', activate);
            navItem.addEventListener('mousedown', activate);
            navItem.addEventListener('click', activate);
        });

        // Disclaimer footer at the bottom of the content area
        var disclaimerFooter = document.createElement('div');
        markExt(disclaimerFooter);
        disclaimerFooter.style.cssText = 'padding:12px 18px 14px;font-size:10.5px;line-height:1.45;color:var(--dtu-am-muted);border-top:1px solid var(--dtu-am-border);margin-top:auto;';
        disclaimerFooter.textContent = 'DTU After Dark is unofficial and not affiliated with DTU, Arcanic, or any service provider. '
            + 'Information shown (exam dates, deadlines, grades, bus times) may be inaccurate or outdated. '
            + 'Always verify critical information through official DTU channels. '
            + 'The developer(s) accept no responsibility for any consequences arising from the use of this extension.';
        contentArea.appendChild(disclaimerFooter);

        container.appendChild(sidebar);
        container.appendChild(contentArea);

        function applyFixedAdminToolsDropdownSizing() {
            try {
                var dd = closestComposed(placeholder, 'd2l-dropdown-content');
                if (!dd) return;

                // Keep a stable width and clamp to the viewport to avoid horizontal scrollbars.
                var margin = 16;
                var desiredW = 1037; // D2L default; wide enough for toggles + wrapped descriptions.
                var maxFit = Math.max(360, Math.floor(window.innerWidth - margin * 2));
                var finalW = Math.min(desiredW, maxFit);

                dd.setAttribute('min-width', String(finalW));
                dd.setAttribute('max-width', String(finalW));
                dd.style.setProperty('min-width', finalW + 'px', 'important');
                dd.style.setProperty('width', finalW + 'px', 'important');
                dd.style.setProperty('max-width', finalW + 'px', 'important');
                dd.style.setProperty('box-sizing', 'border-box', 'important');
                dd.style.setProperty('overflow-x', 'hidden', 'important');

                // If a previous run forced a bad left/right, reset to safe defaults.
                try {
                    var leftRaw = String(dd.style.left || '').trim();
                    if (leftRaw === 'auto') dd.style.setProperty('left', margin + 'px', 'important');
                } catch (e0) { }
                try {
                    var rightRaw = String(dd.style.right || '').trim();
                    if (rightRaw && rightRaw !== 'auto') dd.style.setProperty('right', 'auto', 'important');
                } catch (e1) { }

                // Ensure it doesn't spill off-screen (only adjust position when it is actually open).
                try {
                    var isOpened = dd.hasAttribute('opened') || dd.hasAttribute('_opened');
                    if (!isOpened) return;

                    var r = dd.getBoundingClientRect();
                    if (r && r.right > window.innerWidth - margin) {
                        var newLeft = Math.max(margin, Math.floor(window.innerWidth - finalW - margin));
                        dd.style.setProperty('left', newLeft + 'px', 'important');
                        dd.style.setProperty('right', 'auto', 'important');
                    } else if (r && r.left < margin) {
                        dd.style.setProperty('left', margin + 'px', 'important');
                        dd.style.setProperty('right', 'auto', 'important');
                    }
                } catch (e2) { }
            } catch (e) { }
        }

        function measureTextWidthFromEl(measureRoot, el) {
            if (!measureRoot || !el) return 0;
            var txt = normalizeWhitespace(el.textContent || '');
            if (!txt) return 0;
            var span = document.createElement('span');
            span.textContent = txt;
            span.style.whiteSpace = 'nowrap';
            span.style.display = 'inline-block';
            try {
                var cs = getComputedStyle(el);
                if (cs) {
                    span.style.fontFamily = cs.fontFamily;
                    span.style.fontSize = cs.fontSize;
                    span.style.fontWeight = cs.fontWeight;
                    span.style.letterSpacing = cs.letterSpacing;
                    span.style.textTransform = cs.textTransform;
                }
            } catch (e) { }
            measureRoot.appendChild(span);
            var w = 0;
            try { w = span.getBoundingClientRect().width || 0; } catch (e2) { }
            try { span.remove(); } catch (e3) { }
            return w;
        }

        function autoSizeAdminToolsDropdownToContent() {
            try {
                var dd = closestComposed(placeholder, 'd2l-dropdown-content');
                if (!dd) return;

                // Measurement root (offscreen) to avoid UI flicker.
                var meas = document.createElement('div');
                meas.setAttribute('data-dtu-ext', '1');
                meas.style.cssText = 'position:fixed;left:-10000px;top:-10000px;visibility:hidden;pointer-events:none;';
                document.body.appendChild(meas);

                var maxHeaderW = 0;
                contentArea.querySelectorAll('div').forEach(function (el) {
                    // Only consider our panel headers (big title + small subtitle) to avoid measuring whole DOM.
                    if (!el || !el.isConnected) return;
                    if (el.getAttribute && el.getAttribute('data-dtu-ext') !== '1') return;
                    var fs = '';
                    try { fs = String(getComputedStyle(el).fontSize || ''); } catch (e0) { }
                    if (fs !== '18px' && fs !== '12px') return;
                    var w = measureTextWidthFromEl(meas, el);
                    if (w > maxHeaderW) maxHeaderW = w;
                });

                var maxInfoW = 0;
                contentArea.querySelectorAll('.dtu-set-row').forEach(function (row) {
                    if (!row || !row.isConnected) return;
                    var titleEl = row.querySelector('div > div'); // title in info block
                    var w1 = measureTextWidthFromEl(meas, titleEl);
                    maxInfoW = Math.max(maxInfoW, w1);
                });

                var maxActionsW = 0;
                contentArea.querySelectorAll('.dtu-set-row').forEach(function (row) {
                    if (!row || !row.isConnected) return;
                    var actions = row.querySelector('div[style*=\"gap:10px\"], div[style*=\"gap: 10px\"], div');
                    // Prefer our actions container: last child in the row.
                    var kids = row.children;
                    if (kids && kids.length) actions = kids[kids.length - 1];
                    if (!actions || !actions.getBoundingClientRect) return;
                    try {
                        var w = actions.getBoundingClientRect().width || 0;
                        if (w > maxActionsW) maxActionsW = w;
                    } catch (e1) { }
                });

                try { meas.remove(); } catch (e2) { }

                var sidebarW = 170;
                try { sidebarW = Math.ceil(sidebar.getBoundingClientRect().width || sidebarW); } catch (e3) { }

                var padL = 24, padR = 34;
                try {
                    var csA = getComputedStyle(contentArea);
                    padL = parseFloat(csA.paddingLeft) || padL;
                    padR = parseFloat(csA.paddingRight) || padR;
                } catch (e4) { }

                // Row needs enough space for info + actions + breathing room.
                var rowNeed = maxInfoW + maxActionsW + 44;
                var innerNeed = Math.max(maxHeaderW, rowNeed);
                var totalNeed = Math.ceil(sidebarW + padL + padR + innerNeed + 10);

                var margin = 16;

                // Hard bounds so we don't break smaller windows; still try to fit the longest string.
                var maxFit = Math.max(360, Math.floor(window.innerWidth - margin * 2));
                var finalW = Math.min(maxFit, Math.max(600, totalNeed));

                // Prefer both attributes (D2L supports them) and inline styles (fallback).
                dd.setAttribute('min-width', String(finalW));
                dd.setAttribute('max-width', String(finalW));
                dd.style.setProperty('min-width', finalW + 'px', 'important');
                dd.style.setProperty('width', finalW + 'px', 'important');
                dd.style.setProperty('max-width', finalW + 'px', 'important');
                dd.style.setProperty('box-sizing', 'border-box', 'important');
                dd.style.setProperty('overflow-x', 'hidden', 'important');

                function clampDropdownPositionWithinViewport() {
                    try {
                        var r = dd.getBoundingClientRect();
                        if (r && r.right > window.innerWidth - margin) {
                            dd.style.setProperty('right', margin + 'px', 'important');
                            dd.style.setProperty('left', 'auto', 'important');
                        }
                    } catch (e0) { }
                    try {
                        var r2 = dd.getBoundingClientRect();
                        if (r2 && r2.left < margin) {
                            dd.style.setProperty('left', margin + 'px', 'important');
                            dd.style.setProperty('right', 'auto', 'important');
                        }
                    } catch (e1) { }
                }

                function freezeAdminToolsPanelHeight() {
                    try {
                        var csCA = null;
                        try { csCA = getComputedStyle(contentArea); } catch (e2) { }
                        var padT = csCA ? (parseFloat(csCA.paddingTop) || 0) : 0;
                        var padB = csCA ? (parseFloat(csCA.paddingBottom) || 0) : 0;
                        var areaW = 0;
                        try { areaW = Math.max(420, Math.floor(contentArea.getBoundingClientRect().width || 0)); } catch (e3) { areaW = 420; }

                        var maxPanelH = 0;
                        Object.keys(panels).forEach(function (id) {
                            var p = panels[id];
                            if (!p) return;

                            var prev = {
                                display: p.style.display,
                                position: p.style.position,
                                visibility: p.style.visibility,
                                left: p.style.left,
                                top: p.style.top,
                                width: p.style.width
                            };

                            var needsTemp = prev.display === 'none';
                            if (needsTemp) {
                                p.style.display = 'block';
                                p.style.position = 'absolute';
                                p.style.visibility = 'hidden';
                                p.style.left = '-10000px';
                                p.style.top = '0';
                                p.style.width = areaW + 'px';
                            }

                            var h = 0;
                            try { h = Math.ceil(p.getBoundingClientRect().height || 0); } catch (e4) { h = 0; }
                            if (h > maxPanelH) maxPanelH = h;

                            if (needsTemp) {
                                p.style.display = prev.display;
                                p.style.position = prev.position;
                                p.style.visibility = prev.visibility;
                                p.style.left = prev.left;
                                p.style.top = prev.top;
                                p.style.width = prev.width;
                            }
                        });

                        var sidebarH = 0;
                        try { sidebarH = Math.ceil(sidebar.getBoundingClientRect().height || 0); } catch (e5) { sidebarH = 0; }
                        var targetH = Math.max(sidebarH, Math.ceil(padT + maxPanelH + padB));

                        if (targetH > 0) {
                            contentArea.style.setProperty('min-height', targetH + 'px', 'important');
                            contentArea.style.setProperty('height', targetH + 'px', 'important');
                            container.style.setProperty('min-height', targetH + 'px', 'important');
                            container.style.setProperty('height', targetH + 'px', 'important');
                        }
                    } catch (e) { }
                }

                function patchDropdownShadowScrolling() {
                    try {
                        dd.style.setProperty('max-height', 'none', 'important');
                        dd.style.setProperty('overflow-y', 'visible', 'important');
                    } catch (e6) { }

                    var sr = null;
                    try { sr = dd.shadowRoot; } catch (e7) { sr = null; }
                    if (!sr) return;

                    // Hide scrollbars inside the dropdown shadow DOM (Firefox + Chromium).
                    try {
                        if (!sr.querySelector('#dtu-admin-tools-dd-scrollstyle')) {
                            var st = document.createElement('style');
                            st.id = 'dtu-admin-tools-dd-scrollstyle';
                            st.textContent = ':host{max-height:none !important;overflow:visible !important;}'
                                + '*{scrollbar-width:none !important;}'
                                + '*::-webkit-scrollbar{width:0 !important;height:0 !important;}';
                            sr.appendChild(st);
                        }
                    } catch (e8) { }

                    try {
                        var slot = sr.querySelector('slot');
                        if (!slot) return;

                        // Walk up from the <slot> and remove internal scroll constraints.
                        var el = slot.parentElement;
                        while (el) {
                            var cs = null;
                            try { cs = getComputedStyle(el); } catch (e9) { cs = null; }
                            if (cs) {
                                if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') {
                                    el.style.setProperty('overflow-x', 'hidden', 'important');
                                }
                                if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
                                    el.style.setProperty('overflow-y', 'visible', 'important');
                                    el.style.setProperty('max-height', 'none', 'important');
                                    el.style.setProperty('height', 'auto', 'important');
                                }
                                if (cs.maxHeight && cs.maxHeight !== 'none') {
                                    el.style.setProperty('max-height', 'none', 'important');
                                }
                            }
                            el = el.parentElement;
                        }
                    } catch (e10) { }
                }

                function finalizeAdminToolsDropdownLayout() {
                    try { freezeAdminToolsPanelHeight(); } catch (e11) { }
                    try { clampDropdownPositionWithinViewport(); } catch (e13) { }
                }

                // Shadow DOM patches are very invasive (modify dropdown internal elements).
                // Defer them well past the initial render to avoid triggering Brightspace auto-close.
                function deferredShadowPatches() {
                    try { patchDropdownShadowScrolling(); } catch (e12) { }
                    try { clampDropdownPositionWithinViewport(); } catch (e15) { }
                }

                try { requestAnimationFrame(finalizeAdminToolsDropdownLayout); } catch (e14) { setTimeout(finalizeAdminToolsDropdownLayout, 0); }
                setTimeout(finalizeAdminToolsDropdownLayout, 80);
                setTimeout(deferredShadowPatches, 400);
            } catch (e) {
                // ignore
            }
        }

        // Replace the old column content with the settings panel
        var heading = afterDarkCol.querySelector('h2');
        if (heading) heading.style.display = 'none';

        var list = afterDarkCol.querySelector('ul.d2l-list');
        if (list) {
            // Hide existing children instead of removing them to avoid focusout events
            // that cause Brightspace to auto-close the dropdown.
            Array.prototype.forEach.call(list.children, function (child) {
                child.style.setProperty('display', 'none', 'important');
            });
            list.style.cssText = 'list-style:none;padding:0;margin:0;max-width:100%;overflow-x:hidden;box-sizing:border-box;';
            var liWrap = document.createElement('li');
            markExt(liWrap);
            liWrap.style.cssText = 'list-style:none;padding:0;margin:0;width:100%;max-width:100%;';
            liWrap.appendChild(container);
            list.appendChild(liWrap);
        }

        markExt(afterDarkCol);
        afterDarkCol.style.cssText = 'padding:0 !important;background:transparent !important;background-color:transparent !important;'
            + 'width:100% !important;max-width:100% !important;float:none !important;display:block !important;overflow-x:hidden !important;';

        // Also force parent containers to not constrain width
        placeholder.style.cssText = (placeholder.style.cssText || '')
            + ';width:100% !important;display:block !important;';
        var adminRoot = closestComposed(placeholder, '.d2l-admin-tools');
        if (adminRoot) {
            adminRoot.style.setProperty('width', '100%', 'important');
            // Remove the d2l-clear float fixer that breaks layout
            var clearDiv = adminRoot.querySelector('.d2l-clear');
            if (clearDiv) clearDiv.style.setProperty('display', 'none', 'important');
        }

        // Hide the Organization Related column
        if (orgCol) {
            orgCol.style.setProperty('display', 'none', 'important');
        }

        // Keep a stable dropdown window; internal panes handle scrolling.
        setTimeout(applyFixedAdminToolsDropdownSizing, 0);
        setTimeout(applyFixedAdminToolsDropdownSizing, 80);

        placeholder.setAttribute('data-dtu-restructured', '1');
        adminToolsDbg('restructure_done', {
            hasRoot: !!(placeholder.querySelector && placeholder.querySelector('.dtu-am-root')),
            hasStyles: !!document.querySelector('#dtu-settings-styles')
        });
    }

    function isDTULearnQuizSubmissionsPage() {
        return window.location.hostname === 'learn.inside.dtu.dk'
            && /\/d2l\/lms\/quizzing\/user\/quiz_submissions\.d2l$/i.test(window.location.pathname);
    }

    function styleQuizSubmissionHistogram(rootNode) {
        if (!isDTULearnQuizSubmissionsPage()) return;

        var root = (rootNode && rootNode.querySelectorAll) ? rootNode : document;
        function forceDark1(el) {
            if (!el || !el.style) return;
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            el.style.setProperty('border-color', '#404040', 'important');
        }

        // Grade rows with blue/white graph bars should keep a dark-1 row background.
        root.querySelectorAll('tr').forEach(function (row) {
            if (!row.querySelector('img[src*="Framework.GraphBar"]')) return;

            row.querySelectorAll('td.d_tl.d_tm.d_tn, td.d_tr.d_tm.d_tn').forEach(function (td) { forceDark1(td); });
            row.querySelectorAll('.d2l-grades-score, .dco, .dco_c').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('background-image', 'none', 'important');
            });
            row.querySelectorAll('label').forEach(function (label) {
                if (!label || !label.style) return;
                label.style.setProperty('color', '#e0e0e0', 'important');
                label.style.setProperty('background-color', '#1a1a1a', 'important');
                label.style.setProperty('background-image', 'none', 'important');
            });
        });
    }

    // ===== API RATE LIMITING =====
    // Per-user daily limit to protect the shared API key (resets each day)
    var DAILY_API_LIMIT = 200; // max API calls per user per day
    var API_CALLS_KEY = 'dtuDarkModeBusApiCalls';
    var API_QUOTA_KEY = 'dtuDarkModeBusQuotaExhausted';
    var BUS_FETCH_TIMEOUT_MS = 8000;
    var _apiQuotaExhausted = false;

    function getLocalDateString() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function getDailyApiCount() {
        try {
            var data = JSON.parse(localStorage.getItem(API_CALLS_KEY) || '{}');
            var today = getLocalDateString();
            if (data.date !== today) return { date: today, count: 0 };
            return data;
        } catch (e) {
            return { date: getLocalDateString(), count: 0 };
        }
    }

    function incrementApiCount() {
        var data = getDailyApiCount();
        data.count++;
        localStorage.setItem(API_CALLS_KEY, JSON.stringify(data));
        return data.count;
    }

    function isDailyLimitReached() {
        return getDailyApiCount().count >= DAILY_API_LIMIT;
    }

    // Server-side quota exhaustion (HTTP 429/403) â€” persists until next month
    function isApiQuotaExhausted() {
        if (_apiQuotaExhausted) return true;
        var stored = localStorage.getItem(API_QUOTA_KEY);
        if (!stored) return false;
        var exhaustedDate = new Date(stored);
        var now = new Date();
        if (now.getMonth() !== exhaustedDate.getMonth() || now.getFullYear() !== exhaustedDate.getFullYear()) {
            localStorage.removeItem(API_QUOTA_KEY);
            _apiQuotaExhausted = false;
            return false;
        }
        _apiQuotaExhausted = true;
        return true;
    }

    function setApiQuotaExhausted() {
        _apiQuotaExhausted = true;
        localStorage.setItem(API_QUOTA_KEY, new Date().toISOString());
        localStorage.setItem(BUS_ENABLED_KEY, 'false');
        var toggle = document.querySelector('#bus-departures-toggle');
        if (toggle) {
            toggle.checked = false;
            // Keep any settings UI in sync (e.g. Bus "Edit" button visibility).
            try { toggle.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { }
        }
    }

    // Get departures for a specific stop
    async function getDepartures(stopId) {
        if (isApiQuotaExhausted()) return [];
        if (isDailyLimitReached()) {
            showQuotaExhaustedMessage('daily');
            return [];
        }
        const url = REJSEPLANEN_API + '/departureBoard?accessId=' + encodeURIComponent(REJSEPLANEN_KEY)
            + '&format=json&id=' + encodeURIComponent(stopId);

        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timeoutId = null;
        if (controller) {
            timeoutId = setTimeout(function () {
                controller.abort();
            }, BUS_FETCH_TIMEOUT_MS);
        }

        try {
            const fetchOptions = controller ? { signal: controller.signal } : undefined;
            const resp = await fetch(url, fetchOptions);
            if (resp.status === 429 || resp.status === 403) {
                setApiQuotaExhausted();
                showQuotaExhaustedMessage('monthly');
                return [];
            }
            if (!resp.ok) return [];
            const data = await resp.json();
            const deps = data.DepartureBoard ? data.DepartureBoard.Departure : (data.Departure || []);
            const arr = !Array.isArray(deps) ? (deps ? [deps] : []) : deps;
            arr.forEach(d => {
                if (!d.line) {
                    if (d.ProductAtStop && d.ProductAtStop.line) d.line = d.ProductAtStop.line;
                    else if (d.Product && d.Product[0] && d.Product[0].line) d.line = d.Product[0].line;
                }
            });
            incrementApiCount();
            return arr;
        } catch (e) {
            return [];
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    // Show a notification when API limits are hit
    function showQuotaExhaustedMessage(type) {
        if (document.querySelector('.dtu-quota-exhausted')) return;

        var isDaily = type === 'daily';
        var notice = document.createElement('div');
        markExt(notice);
        notice.className = 'dtu-quota-exhausted';
        notice.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; '
            + 'background: linear-gradient(135deg, var(--dtu-ad-accent) 0%, var(--dtu-ad-accent-deep) 100%); '
            + 'color: #fff; padding: 16px 20px; border-radius: 12px; '
            + 'font-family: "Helvetica Neue",Helvetica,Arial,sans-serif; font-size: 13px; line-height: 1.5; '
            + 'max-width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); '
            + 'animation: dtuSlideIn 0.3s ease-out;';

        var title = document.createElement('div');
        markExt(title);
        title.style.cssText = 'font-weight: 700; font-size: 14px; margin-bottom: 6px;';
        title.textContent = 'Bus Departures Paused';

        var msg = document.createElement('div');
        markExt(msg);
        msg.style.opacity = '0.95';
        var countdownEl = null;
        var countdownInterval = null;

        if (isDaily) {
            msg.textContent = 'You\u2019ve used ' + getDailyApiCount().count + '/' + DAILY_API_LIMIT
                + ' bus lookups today.';

            // Countdown to local midnight
            countdownEl = document.createElement('div');
            markExt(countdownEl);
            countdownEl.style.cssText = 'margin-top: 8px; font-size: 13px; font-weight: 600; '
                + 'font-variant-numeric: tabular-nums; letter-spacing: 0.5px;';

            function updateCountdown() {
                var now = new Date();
                var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
                var diff = midnight.getTime() - now.getTime();
                if (diff <= 0) {
                    countdownEl.textContent = 'Bus times are available now! Reload the page.';
                    if (countdownInterval) clearInterval(countdownInterval);
                    return;
                }
                var h = Math.floor(diff / 3600000);
                var m = Math.floor((diff % 3600000) / 60000);
                var s = Math.floor((diff % 60000) / 1000);
                countdownEl.textContent = 'Bus times available in '
                    + String(h).padStart(2, '0') + ':'
                    + String(m).padStart(2, '0') + ':'
                    + String(s).padStart(2, '0');
            }
            updateCountdown();
            countdownInterval = setInterval(updateCountdown, 1000);
        } else {
            msg.textContent = 'The monthly API request limit for Rejseplanen has been reached. '
                + 'Bus departures have been turned off and will automatically resume next month.';
            localStorage.setItem(BUS_ENABLED_KEY, 'false');
            var toggle = document.querySelector('#bus-departures-toggle');
            if (toggle) {
                toggle.checked = false;
                try { toggle.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { }
            }
        }

        var dismiss = document.createElement('button');
        markExt(dismiss);
        dismiss.style.cssText = 'margin-top: 10px; background: rgba(255,255,255,0.15); color: #fff; '
            + 'border: 1px solid rgba(255,255,255,0.3); padding: 6px 16px; border-radius: 6px; '
            + 'cursor: pointer; font-size: 12px; font-weight: 600;';
        dismiss.textContent = 'Got it';
        dismiss.addEventListener('click', function () {
            if (countdownInterval) clearInterval(countdownInterval);
            notice.style.transition = 'opacity 0.3s';
            notice.style.opacity = '0';
            setTimeout(function () { notice.remove(); }, 300);
        });

        notice.appendChild(title);
        notice.appendChild(msg);
        if (countdownEl) notice.appendChild(countdownEl);
        notice.appendChild(dismiss);
        document.body.appendChild(notice);
    }

    // Calculate minutes until a departure
    function minutesUntilDeparture(dep) {
        const timeStr = dep.rtTime || dep.time;
        const dateStr = dep.rtDate || dep.date;
        if (!timeStr || !dateStr) return null;
        let depDate;
        if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            depDate = new Date(year + '-' + parts[1] + '-' + parts[0] + 'T' + timeStr);
        } else {
            depDate = new Date(dateStr + 'T' + timeStr);
        }
        if (isNaN(depDate.getTime())) return null;
        return Math.round((depDate.getTime() - Date.now()) / 60000);
    }

    // Check if a departure is delayed and by how many minutes
    function isDelayed(dep) {
        if (!dep.rtTime || !dep.time) return false;
        return dep.rtTime !== dep.time;
    }

    function getDelayMinutes(dep) {
        if (!dep.rtTime || !dep.time || dep.rtTime === dep.time) return 0;
        var scheduled = dep.time.split(':');
        var realtime = dep.rtTime.split(':');
        if (scheduled.length < 2 || realtime.length < 2) return 0;
        var sMins = parseInt(scheduled[0], 10) * 60 + parseInt(scheduled[1], 10);
        var rMins = parseInt(realtime[0], 10) * 60 + parseInt(realtime[1], 10);
        var diff = rMins - sMins;
        // Handle midnight wrap (e.g. scheduled 23:58, realtime 00:01)
        if (diff < -720) diff += 1440;
        return diff > 0 ? diff : 0;
    }

    // Format the time display, showing delay as (+N)
    function formatDepartureTime(dep) {
        const mins = minutesUntilDeparture(dep);
        if (mins === null) return dep.rtTime || dep.time;
        if (mins <= 0) return 'Now';
        if (mins < 60) return mins + ' min';
        return (dep.rtTime || dep.time).substring(0, 5);
    }

    function formatDelayTag(dep) {
        var delay = getDelayMinutes(dep);
        if (delay <= 0) return '';
        return ' (+' + delay + ')';
    }

    // Fetch departures sequentially, stopping early once we have 2 per configured line
    var DEPS_PER_LINE = 2;

    async function fetchBusDepartures() {
        if (isApiQuotaExhausted()) return [];
        const config = getBusConfig();
        if (!config || !config.stopIds || config.stopIds.length === 0) return [];

        _busFetchInProgress = true;
        const allDeps = [];
        const seen = new Set();
        // Track how many departures we have per line
        const lineCounts = {};
        config.lines.forEach(function (l) { lineCounts[l.line] = 0; });

        function hasEnough() {
            return config.lines.every(function (l) { return lineCounts[l.line] >= DEPS_PER_LINE; });
        }

        try {
            // Fetch stops one by one, stop early when we have enough
            for (var i = 0; i < config.stopIds.length; i++) {
                if (hasEnough()) break;
                var deps = await getDepartures(config.stopIds[i]);
                deps.forEach(function (dep) {
                    var configLine = config.lines.find(function (l) { return l.line === dep.line; });
                    if (!configLine) return;
                    if (lineCounts[dep.line] >= DEPS_PER_LINE) return;
                    var matchesDir = configLine.directions.some(function (d) {
                        return dep.direction && dep.direction.includes(d);
                    });
                    if (!matchesDir) return;

                    var key = dep.line + '|' + dep.direction + '|' + dep.time + '|' + dep.date;
                    if (seen.has(key)) return;
                    seen.add(key);

                    lineCounts[dep.line]++;
                    allDeps.push({
                        line: dep.line,
                        direction: dep.direction,
                        time: formatDepartureTime(dep),
                        delayTag: formatDelayTag(dep),
                        minutes: minutesUntilDeparture(dep),
                        stop: dep.stop || '',
                        delayed: isDelayed(dep),
                        type: dep.type
                    });
                });
            }
        } catch (e) {
            // Silently fail
        }

        _busFetchInProgress = false;
        allDeps.sort(function (a, b) { return (a.minutes || 999) - (b.minutes || 999); });
        return allDeps;
    }

    // Insert or update the bus departure display in the navigation bar
    function insertBusDisplay() {
        if (!isDTULearnHomepage() || !isBusEnabled()) {
            const existing = document.querySelector('.dtu-bus-departures');
            if (existing) existing.remove();
            return;
        }

        // Bus stays in the old navigation main wrapper row.
        const mainWrapper = document.querySelector('.d2l-navigation-s-main-wrapper');
        if (!mainWrapper) return;

        let container = document.querySelector('.dtu-bus-departures');
        if (!container) {
            container = document.createElement('div');
            container.className = 'dtu-bus-departures';
            container.setAttribute('role', 'listitem');
            mainWrapper.appendChild(container);
        } else if (container.parentElement !== mainWrapper) {
            try {
                mainWrapper.appendChild(container);
            } catch (e) {
                // ignore
            }
        }

        // Ensure correct placement + theme even if the widget was injected by an older version.
        container.style.cssText = 'display: flex; gap: 12px; padding: 8px 14px; '
            + 'font-size: 12px; margin-left: auto; margin-right: 12px; '
            + 'border-left: 2px solid var(--dtu-ad-accent); align-self: center; border-radius: 0 6px 6px 0; '
            + (darkModeEnabled
                ? 'background: #2d2d2d !important; color: #e0e0e0 !important;'
                : 'background: #ffffff !important; color: #333 !important;');

        // Clear existing content
        while (container.firstChild) container.removeChild(container.firstChild);

        if (_cachedDepartures.length === 0) {
            var empty = document.createElement('span');
            empty.style.cssText = 'color: ' + (darkModeEnabled ? '#888' : '#999') + ' !important; font-style: italic; font-size: 11px;';
            empty.textContent = _busFetchInProgress ? 'Loading bus times...' : 'No upcoming buses';
            container.appendChild(empty);
            return;
        }

        // Group departures by line, sort each group earliest-first
        var lineGroups = {};
        _cachedDepartures.forEach(function (dep) {
            if (!lineGroups[dep.line]) lineGroups[dep.line] = [];
            lineGroups[dep.line].push(dep);
        });
        // Fixed alphabetical order so columns never swap
        var lineOrder = Object.keys(lineGroups).sort();
        // Sort departures within each line: earliest first
        lineOrder.forEach(function (line) {
            lineGroups[line].sort(function (a, b) { return (a.minutes != null ? a.minutes : 999) - (b.minutes != null ? b.minutes : 999); });
        });

        // One column per line, side by side
        lineOrder.forEach(function (line, li) {
            var col = document.createElement('div');
            col.style.cssText = 'display: flex; flex-direction: column; gap: 2px; min-width: 0;'
                + (li < lineOrder.length - 1 ? ' padding-right: 12px; border-right: 1px solid ' + (darkModeEnabled ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)') + ';' : '');

            // Line header badge
            var color = LINE_COLORS[line] || '#1565c0';
            var badge = document.createElement('span');
            badge.style.cssText = 'display: inline-block; background-color: ' + color + ' !important; color: #fff !important; '
                + 'padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; margin-bottom: 3px; '
                + 'letter-spacing: 0.3px; text-align: center; align-self: flex-start;';
            badge.textContent = line;
            col.appendChild(badge);

            // Departure rows
            lineGroups[line].forEach(function (dep) {
                var row = document.createElement('div');
                row.style.cssText = 'display: flex; align-items: center; gap: 6px; white-space: nowrap;';

                var dir = document.createElement('span');
                dir.style.cssText = 'color: ' + (darkModeEnabled ? '#b0b0b0' : '#666') + ' !important; overflow: hidden; text-overflow: ellipsis; flex: 1; font-size: 11px;';
                dir.textContent = dep.direction;

                var time = document.createElement('span');
                var timeColor = dep.delayed
                    ? (darkModeEnabled ? '#ffa726' : '#e65100')
                    : (darkModeEnabled ? '#66bb6a' : '#2e7d32');
                time.style.cssText = 'font-weight: bold; font-size: 11px; color: ' + timeColor + ' !important;';
                time.textContent = dep.time;

                row.appendChild(dir);
                row.appendChild(time);

                if (dep.delayTag) {
                    var delay = document.createElement('span');
                    delay.style.cssText = 'font-size: 10px; color: ' + (darkModeEnabled ? '#ffa726' : '#e65100') + ' !important; font-weight: 600;';
                    delay.textContent = dep.delayTag;
                    row.appendChild(delay);
                }
                col.appendChild(row);
            });

            container.appendChild(col);
        });
    }

    // ===== SMART POLLING: Visibility API + Intelligent Backoff =====
    // Determine poll interval based on soonest departure
    function getSmartPollInterval() {
        if (_cachedDepartures.length === 0) return 60000; // 60s default
        var soonest = Infinity;
        _cachedDepartures.forEach(function (dep) {
            if (dep.minutes != null && dep.minutes < soonest) soonest = dep.minutes;
        });
        if (soonest <= 15) return 60000;  // â‰¤15 min away: poll every 60s (minimum)
        return 120000;                     // >15 min: every 2 min
    }

    var _busPollingTimer = null;

    function startBusPolling() {
        stopBusPolling();
        if (!isDTULearnHomepage() || !isBusEnabled()) return;
        // Schedule next poll based on how soon the next bus is
        var interval = getSmartPollInterval();
        _busPollingTimer = setTimeout(async function pollCycle() {
            if (document.hidden || !isDTULearnHomepage() || !isBusEnabled()) return;
            if (!_busFetchInProgress) {
                _lastBusFetch = Date.now();
                _cachedDepartures = await fetchBusDepartures();
                insertBusDisplay();
            }
            // Re-schedule with updated interval
            var nextInterval = getSmartPollInterval();
            _busPollingTimer = setTimeout(pollCycle, nextInterval);
        }, interval);
    }

    function stopBusPolling() {
        if (_busPollingTimer) {
            clearTimeout(_busPollingTimer);
            _busPollingTimer = null;
        }
    }

    // Visibility API: pause when tab is hidden, resume when visible
    document.addEventListener('visibilitychange', function () {
        if (!IS_TOP_WINDOW) return;
        if (document.hidden) {
            stopBusPolling();
        } else {
            // Tab became visible â€” do an immediate refresh then resume polling
            updateBusDepartures();
        }
    });

    // Orchestrate: fetch + update display + start smart polling
    async function updateBusDepartures() {
        if (!IS_TOP_WINDOW) return;
        if (!isDTULearnHomepage() || !isBusEnabled()) {
            stopBusPolling();
            insertBusDisplay();
            return;
        }
        const config = getBusConfig();
        if (!config) return;

        const now = Date.now();
        var interval = getSmartPollInterval();
        if (now - _lastBusFetch >= interval && !_busFetchInProgress) {
            _lastBusFetch = now;
            _cachedDepartures = await fetchBusDepartures();
        }
        insertBusDisplay();
        startBusPolling();
    }

    // ===== BUS SETUP PROMPT (first-time) =====
    function showBusSetupPrompt() {
        if (!IS_TOP_WINDOW) return;
        if (!isDTULearnHomepage()) return;
        if (localStorage.getItem(BUS_SETUP_DONE_KEY)) return;
        if (document.querySelector('.dtu-bus-setup-prompt')) return;

        const prompt = document.createElement('div');
        prompt.className = 'dtu-bus-setup-prompt';
        prompt.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; '
            + 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); '
            + 'border: 1px solid #1565c0; border-radius: 12px; padding: 20px 24px; '
            + 'box-shadow: 0 8px 32px rgba(21,101,192,0.3), 0 0 0 1px rgba(21,101,192,0.1); '
            + 'max-width: 360px; font-family: sans-serif; '
            + 'transform: translateX(120%); transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);';

        // Slide in after a frame
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                prompt.style.transform = 'translateX(0)';
            });
        });

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px;';

        const busIcon = document.createElement('span');
        busIcon.style.cssText = 'font-size: 28px; line-height: 1;';
        busIcon.textContent = '\uD83D\uDE8C';

        const title = document.createElement('div');
        title.style.cssText = 'color: #fff; font-size: 16px; font-weight: bold;';
        title.textContent = 'Never miss your bus!';

        header.appendChild(busIcon);
        header.appendChild(title);

        const desc = document.createElement('div');
        desc.style.cssText = 'color: #b0b0b0; font-size: 13px; margin-bottom: 16px; line-height: 1.5;';
        desc.textContent = 'Get live departure times for buses near DTU right here on your homepage.';

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 10px;';

        const setupBtn = document.createElement('button');
        setupBtn.style.cssText = 'background: #1565c0; color: #fff; border: none; padding: 8px 20px; '
            + 'border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; flex: 1; '
            + 'transition: background 0.2s;';
        setupBtn.textContent = 'Set it up';
        setupBtn.addEventListener('mouseenter', () => { setupBtn.style.background = '#1976d2'; });
        setupBtn.addEventListener('mouseleave', () => { setupBtn.style.background = '#1565c0'; });
        setupBtn.addEventListener('click', () => {
            prompt.style.transform = 'translateX(120%)';
            setTimeout(() => { prompt.remove(); showBusConfigModal(); }, 300);
        });

        const dismissBtn = document.createElement('button');
        dismissBtn.style.cssText = 'background: transparent; color: #666; border: 1px solid #444; '
            + 'padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; '
            + 'transition: border-color 0.2s, color 0.2s;';
        dismissBtn.textContent = 'Not now';
        dismissBtn.addEventListener('mouseenter', () => { dismissBtn.style.borderColor = '#666'; dismissBtn.style.color = '#999'; });
        dismissBtn.addEventListener('mouseleave', () => { dismissBtn.style.borderColor = '#444'; dismissBtn.style.color = '#666'; });
        dismissBtn.addEventListener('click', () => {
            localStorage.setItem(BUS_SETUP_DONE_KEY, 'dismissed');
            prompt.style.transform = 'translateX(120%)';
            setTimeout(() => prompt.remove(), 300);
        });

        btnRow.appendChild(setupBtn);
        btnRow.appendChild(dismissBtn);
        prompt.appendChild(header);
        prompt.appendChild(desc);
        prompt.appendChild(btnRow);
        document.body.appendChild(prompt);
    }

    // ===== BUS CONFIGURATION MODAL =====
    function showBusConfigModal() {
        if (!IS_TOP_WINDOW) return;
        const existing = document.querySelector('.dtu-bus-config-modal');
        if (existing) existing.remove();


        const MAX_LINES = 2;
        const isDarkTheme = isDarkModeEnabled();
        const modalTheme = isDarkTheme
            ? {
                background: 'rgba(30,30,30,0.92)',
                text: '#e0e0e0',
                heading: '#fff',
                subtle: '#999',
                muted: '#888',
                border: '#404040',
                softBorder: '#555',
                overlayShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
                overlayBorder: '1px solid rgba(255,255,255,0.08)',
                hoverRow: '#383838',
                hoverAddCard: 'rgba(255,255,255,0.03)'
            }
            : {
                background: 'rgba(255,255,255,0.96)',
                text: '#1f2937',
                heading: '#111827',
                subtle: '#4b5563',
                muted: '#6b7280',
                border: '#d1d5db',
                softBorder: '#9ca3af',
                overlayShadow: '0 12px 48px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.08)',
                overlayBorder: '1px solid rgba(15,23,42,0.12)',
                hoverRow: '#f3f4f6',
                hoverAddCard: 'rgba(17,24,39,0.04)'
            };

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'dtu-bus-config-modal';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000000; '
            + 'background: transparent !important; backdrop-filter: blur(16px) brightness(2.5); '
            + '-webkit-backdrop-filter: blur(16px) brightness(2.5); '
            + 'display: flex; align-items: center; justify-content: center; '
            + 'font-family: sans-serif; opacity: 0; transition: opacity 0.3s;';
        requestAnimationFrame(function () { overlay.style.opacity = '1'; });

        var modal = document.createElement('div');
        modal.style.cssText = 'background: ' + modalTheme.background + '; border-radius: 14px; padding: 28px; max-width: 480px; '
            + 'width: 90%; max-height: 80vh; overflow-y: auto; color: ' + modalTheme.text + '; '
            + 'box-shadow: ' + modalTheme.overlayShadow + '; '
            + 'border: ' + modalTheme.overlayBorder + ';';

        function dismissModal() {
            var config = getBusConfig();
            if (!config || !config.lines || config.lines.length === 0) {
                localStorage.setItem(BUS_ENABLED_KEY, 'false');
                var toggle = document.querySelector('#bus-departures-toggle');
                if (toggle) {
                    toggle.checked = false;
                    try { toggle.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { }
                }
            }
            overlay.style.opacity = '0';
            setTimeout(function () { overlay.remove(); }, 200);
        }

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) dismissModal();
        });

        // ---- Manage View: show configured lines with delete, add button ----
        function renderManageView() {
            while (modal.firstChild) modal.removeChild(modal.firstChild);
            var config = getBusConfig();

            var titleEl = document.createElement('h2');
            titleEl.style.cssText = 'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: ' + modalTheme.heading + '; letter-spacing: -0.3px;';
            titleEl.textContent = 'Bus Lines';
            modal.appendChild(titleEl);

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: ' + modalTheme.subtle + '; line-height: 1.4;';
            subtitle.textContent = 'Manage your configured bus lines (max ' + MAX_LINES + ').';
            modal.appendChild(subtitle);

            var lineCount = (config && config.lines) ? config.lines.length : 0;

            // Show each configured line as a card
            if (config && config.lines) {
                config.lines.forEach(function (lineCfg, idx) {
                    var color = LINE_COLORS[lineCfg.line] || '#1565c0';
                    var card = document.createElement('div');
                    card.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px 14px; '
                        + 'border: 1px solid ' + modalTheme.border + '; border-radius: 8px; margin-bottom: 8px;';

                    var badge = document.createElement('span');
                    badge.style.cssText = 'background-color: ' + color + '; color: #fff; padding: 4px 0; '
                        + 'border-radius: 5px; font-weight: 800; font-size: 16px; min-width: 48px; text-align: center;';
                    badge.textContent = lineCfg.line;

                    var info = document.createElement('div');
                    info.style.cssText = 'flex: 1; font-size: 13px; color: ' + modalTheme.subtle + '; overflow: hidden; text-overflow: ellipsis;';
                    info.textContent = lineCfg.directions.join(', ');

                    var delBtn = document.createElement('button');
                    delBtn.style.cssText = 'background: transparent; border: 1px solid ' + modalTheme.softBorder + '; color: ' + modalTheme.muted + '; '
                        + 'width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; '
                        + 'display: flex; align-items: center; justify-content: center; transition: all 0.15s;';
                    delBtn.textContent = '\u00D7';
                    delBtn.addEventListener('mouseenter', function () { delBtn.style.borderColor = 'var(--dtu-ad-accent)'; delBtn.style.color = '#ef5350'; });
                    delBtn.addEventListener('mouseleave', function () { delBtn.style.borderColor = modalTheme.softBorder; delBtn.style.color = modalTheme.muted; });
                    (function (capturedIdx) {
                        delBtn.addEventListener('click', function () {
                            config.lines.splice(capturedIdx, 1);
                            saveBusConfig(config);
                            _lastBusFetch = 0;
                            _cachedDepartures = [];
                            updateBusDepartures();
                            renderManageView();
                        });
                    })(idx);

                    card.appendChild(badge);
                    card.appendChild(info);
                    card.appendChild(delBtn);
                    modal.appendChild(card);
                });
            }

            // Add Line button (only if under cap)
            if (lineCount < MAX_LINES) {
                var addBtn = document.createElement('button');
                addBtn.style.cssText = 'background: transparent; color: #66b3ff; border: 1px dashed ' + modalTheme.softBorder + '; '
                    + 'padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; width: 100%; '
                    + 'margin-top: 4px; transition: border-color 0.15s, color 0.15s;';
                addBtn.textContent = '+ Add Bus Line';
                addBtn.addEventListener('mouseenter', function () { addBtn.style.borderColor = '#66b3ff'; });
                addBtn.addEventListener('mouseleave', function () { addBtn.style.borderColor = modalTheme.softBorder; });
                addBtn.addEventListener('click', function () { renderAddLineView(); });
                modal.appendChild(addBtn);
            } else {
                var capNote = document.createElement('div');
                capNote.style.cssText = 'font-size: 12px; color: ' + modalTheme.muted + '; font-style: italic; margin-top: 8px; text-align: center;';
                capNote.textContent = 'Maximum of ' + MAX_LINES + ' bus lines reached. Remove one to add another.';
                modal.appendChild(capNote);
            }

            // Done button
            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 20px;';
            var doneBtn = document.createElement('button');
            doneBtn.style.cssText = 'background: #1565c0; color: #fff; border: none; padding: 8px 24px; '
                + 'border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;';
            doneBtn.textContent = 'Done';
            doneBtn.addEventListener('click', function () {
                overlay.style.opacity = '0';
                setTimeout(function () { overlay.remove(); }, 200);
            });
            btnRow.appendChild(doneBtn);
            modal.appendChild(btnRow);
        }

        // ---- Add Line View: pick one bus line to add ----
        function renderAddLineView() {
            while (modal.firstChild) modal.removeChild(modal.firstChild);
            var config = getBusConfig() || { stopIds: DTU_AREA_STOP_IDS.slice(), lines: [] };
            if (config.lines.length >= MAX_LINES) { renderManageView(); return; }
            var configuredLineNames = config.lines.map(function (l) { return l.line; });

            var titleEl = document.createElement('h2');
            titleEl.style.cssText = 'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: ' + modalTheme.heading + '; letter-spacing: -0.3px;';
            titleEl.textContent = 'Add Bus Line';
            modal.appendChild(titleEl);

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: ' + modalTheme.subtle + '; line-height: 1.4;';
            subtitle.textContent = 'Select a bus line to add:';
            modal.appendChild(subtitle);

            var grid = document.createElement('div');
            grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px;';

            var availableLines = DTU_BUS_LINES.filter(function (bus) { return configuredLineNames.indexOf(bus.line) === -1; });

            availableLines.forEach(function (bus) {
                var color = LINE_COLORS[bus.line] || '#1565c0';
                var card = document.createElement('button');
                card.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 14px 16px; '
                    + 'cursor: pointer; border-radius: 8px; border: 2px solid ' + modalTheme.border + '; background: transparent; '
                    + 'transition: border-color 0.15s, background 0.15s; text-align: left;';
                card.addEventListener('mouseenter', function () { card.style.borderColor = color; card.style.backgroundColor = modalTheme.hoverAddCard; });
                card.addEventListener('mouseleave', function () { card.style.borderColor = modalTheme.border; card.style.backgroundColor = 'transparent'; });

                var badge = document.createElement('span');
                badge.style.cssText = 'background-color: ' + color + '; color: #fff; padding: 6px 0; '
                    + 'border-radius: 6px; font-weight: 800; font-size: 18px; min-width: 56px; text-align: center; '
                    + 'letter-spacing: 0.5px;';
                badge.textContent = bus.line;

                var label = document.createElement('span');
                label.style.cssText = 'font-size: 13px; color: ' + modalTheme.muted + ';';
                label.textContent = bus.name;

                card.appendChild(badge);
                card.appendChild(label);
                grid.appendChild(card);

                card.addEventListener('click', function () { renderDirectionView(bus.line); });
            });

            modal.appendChild(grid);

            // Back button
            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;';
            var backBtn = document.createElement('button');
            backBtn.style.cssText = 'background: transparent; color: ' + modalTheme.muted + '; border: 1px solid ' + modalTheme.softBorder + '; '
                + 'padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px;';
            backBtn.textContent = config.lines.length > 0 ? 'Back' : 'Cancel';
            backBtn.addEventListener('click', function () {
                var c = getBusConfig();
                if (c && c.lines && c.lines.length > 0) { renderManageView(); }
                else { dismissModal(); }
            });
            btnRow.appendChild(backBtn);
            modal.appendChild(btnRow);
        }

        // ---- Direction View: pick directions for one line, then save ----
        async function renderDirectionView(selectedLine) {
            while (modal.firstChild) modal.removeChild(modal.firstChild);

            var color = LINE_COLORS[selectedLine] || '#1565c0';

            var titleEl = document.createElement('h2');
            titleEl.style.cssText = 'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: ' + modalTheme.heading + '; letter-spacing: -0.3px;';
            titleEl.textContent = 'Pick Directions';
            modal.appendChild(titleEl);

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: ' + modalTheme.subtle + '; line-height: 1.4;';

            var lineTag = document.createElement('span');
            lineTag.style.cssText = 'background-color: ' + color + '; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 13px;';
            lineTag.textContent = selectedLine;
            subtitle.appendChild(document.createTextNode('Select directions for '));
            subtitle.appendChild(lineTag);
            subtitle.appendChild(document.createTextNode(':'));
            modal.appendChild(subtitle);

            // Loading
            var statusEl = document.createElement('div');
            statusEl.style.cssText = 'font-size: 13px; color: ' + modalTheme.muted + ';';
            statusEl.textContent = 'Finding available directions...';
            modal.appendChild(statusEl);

            // Fetch departures to discover directions
            var allDepartures = [];
            for (var si = 0; si < DTU_AREA_STOP_IDS.length; si++) {
                var deps = await getDepartures(DTU_AREA_STOP_IDS[si]);
                for (var di = 0; di < deps.length; di++) allDepartures.push(deps[di]);
            }

            var dirSet = new Map();
            allDepartures.forEach(function (d) {
                if (d.line === selectedLine && d.direction && !dirSet.has(d.direction)) {
                    dirSet.set(d.direction, d.direction);
                }
            });
            var directions = Array.from(dirSet.values());

            statusEl.remove();

            if (directions.length === 0) {
                var noDir = document.createElement('div');
                noDir.style.cssText = 'font-size: 13px; color: ' + modalTheme.muted + '; font-style: italic; padding: 8px 0;';
                noDir.textContent = 'No departures found for ' + selectedLine + ' right now. Try again later.';
                modal.appendChild(noDir);
            }

            var dirCheckboxes = [];
            directions.forEach(function (direction) {
                var row = document.createElement('label');
                row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 12px; '
                    + 'cursor: pointer; border-radius: 6px; margin-bottom: 2px; transition: background 0.15s;';
                row.addEventListener('mouseenter', function () { row.style.backgroundColor = modalTheme.hoverRow; });
                row.addEventListener('mouseleave', function () { row.style.backgroundColor = 'transparent'; });

                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = true;
                cb.style.cssText = 'width: 16px; height: 16px; accent-color: var(--dtu-ad-accent); cursor: pointer;';

                var arrow = document.createElement('span');
                arrow.style.cssText = 'color: #66bb6a; font-size: 13px;';
                arrow.textContent = '\u2192';

                var dirText = document.createElement('span');
                dirText.style.cssText = 'font-size: 14px; color: ' + modalTheme.text + ';';
                dirText.textContent = direction;

                row.appendChild(cb);
                row.appendChild(arrow);
                row.appendChild(dirText);
                modal.appendChild(row);
                dirCheckboxes.push({ direction: direction, cb: cb });
            });

            // Error area
            var errorEl = document.createElement('div');
            errorEl.style.cssText = 'font-size: 13px; color: #ef5350; margin-top: 8px; display: none;';
            modal.appendChild(errorEl);

            // Button row
            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;';

            var backBtn = document.createElement('button');
            backBtn.style.cssText = 'background: transparent; color: ' + modalTheme.muted + '; border: 1px solid ' + modalTheme.softBorder + '; '
                + 'padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px;';
            backBtn.textContent = 'Back';
            backBtn.addEventListener('click', function () { renderAddLineView(); });

            var saveBtn = document.createElement('button');
            saveBtn.style.cssText = 'background: #1565c0; color: #fff; border: none; padding: 8px 20px; '
                + 'border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;';
            saveBtn.textContent = 'Add Line';

            saveBtn.addEventListener('click', function () {
                var selectedDirs = dirCheckboxes.filter(function (dc) { return dc.cb.checked; }).map(function (dc) { return dc.direction; });
                if (selectedDirs.length === 0) {
                    errorEl.textContent = 'Please select at least one direction.';
                    errorEl.style.display = 'block';
                    return;
                }

                var config = getBusConfig() || { stopIds: DTU_AREA_STOP_IDS.slice(), lines: [] };
                config.lines.push({ line: selectedLine, directions: selectedDirs });
                if (!config.stopIds || config.stopIds.length === 0) {
                    config.stopIds = DTU_AREA_STOP_IDS.slice();
                }
                saveBusConfig(config);
                localStorage.setItem(BUS_ENABLED_KEY, 'true');
                localStorage.setItem(BUS_SETUP_DONE_KEY, 'configured');
                _lastBusFetch = 0;
                _cachedDepartures = [];
                updateBusDepartures();
                renderManageView();
            });

            btnRow.appendChild(backBtn);
            btnRow.appendChild(saveBtn);
            modal.appendChild(btnRow);
        }

        // Decide which view to show initially
        var config = getBusConfig();
        if (config && config.lines && config.lines.length > 0) {
            renderManageView();
        } else {
            renderAddLineView();
        }

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    // ===== BUS TOGGLE IN ADMIN TOOLS =====
    function insertBusToggle() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        const placeholder = getAdminToolsPlaceholder();
        if (!placeholder) return;
        if (placeholder.querySelector && placeholder.querySelector('#bus-departures-toggle')) return;

        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && normalizeWhitespace(h2.textContent) === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });

        if (!targetList) return;

        const li = document.createElement('li');
        li.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';

        const label = document.createElement('label');
        label.style.cssText = darkModeEnabled
            ? 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; '
            + 'font-size: 14px; background-color: #2d2d2d !important; background: #2d2d2d !important;'
            : 'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = 'bus-departures-toggle';
        toggle.checked = isBusEnabled();
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: var(--dtu-ad-accent);';

        toggle.addEventListener('change', () => {
            if (toggle.checked && (isApiQuotaExhausted() || isDailyLimitReached())) {
                toggle.checked = false;
                showQuotaExhaustedMessage(isApiQuotaExhausted() ? 'monthly' : 'daily');
                return;
            }
            localStorage.setItem(BUS_ENABLED_KEY, toggle.checked.toString());
            if (toggle.checked) {
                const config = getBusConfig();
                if (!config || !config.lines || config.lines.length === 0) {
                    showBusConfigModal();
                } else {
                    _lastBusFetch = 0;
                    updateBusDepartures();
                }
            } else {
                insertBusDisplay();
            }
        });

        label.appendChild(toggle);
        label.appendChild(document.createTextNode('Bus Departures'));
        li.appendChild(label);

        const config = getBusConfig();
        if (config && config.lines && config.lines.length > 0) {
            const editBtn = document.createElement('button');
            editBtn.style.cssText = darkModeEnabled
                ? 'background: transparent; color: #66b3ff; border: none; cursor: pointer; font-size: 12px; padding: 0; margin-left: 4px; text-decoration: underline;'
                : 'background: transparent; border: none; cursor: pointer; font-size: 12px; padding: 0; margin-left: 4px; text-decoration: underline;';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showBusConfigModal();
            });
            li.appendChild(editBtn);
        }

        targetList.appendChild(li);
    }

    // NOTE: Do not mutate the Admin Tools dropdown while it is closed.
    // Admin Tools menu enhancements (toggles + restructuring) are applied only when the user opens the gear dropdown
    // via hookAdminToolsGearEnhancer() -> scheduleAdminToolsEnhance().

    // ===== BOOK FINDER LINKS (DTU Learn course pages) =====
    // Detect ISBN numbers and book titles on course pages and inject
    // links to find/buy them at DTU Findit, Polyteknisk, DBA.dk, Facebook Marketplace.

    function isDTULearnCoursePage() {
        return window.location.hostname === 'learn.inside.dtu.dk'
            && /^\/d2l\/(home|le)\/\d+/.test(window.location.pathname);
    }

    // ISBN regex: matches "ISBN: 978-...", "ISBN-13: ...", "ISBN:978...", etc.
    const ISBN_REGEX = /\bISBN[-\s]?(?:1[03])?[\s:]*\s*([\dXx][\d\s-]{8,}[\dXx])\b/gi;
    // Bare ISBN-13 starting with 978/979 without "ISBN" prefix
    const BARE_ISBN13_REGEX = /\b(97[89][\d-]{10,})\b/g;
    // Keywords that signal a book reference nearby (English + Danish)
    const BOOK_KEYWORDS = /\b(textbook|text\s*book|course\s*book|required\s*reading|recommended\s*reading|suggested\s*reading|book|reading\s*list|literature|edition|ed\.|bog|l\u00e6rebog|kursus\s*bog|anbefalet\s*l\u00e6sning|litteratur|pensum)\b/i;
    // Quoted Title Case strings (supports straight and curly quotes)
    const QUOTED_TITLE_REGEX = /["\u201C\u201D]([A-Z][A-Za-z]*(?:\s+(?:[A-Z][A-Za-z]*|and|the|of|in|for|to|a|an|with|&)){2,})["\u201C\u201D]/g;

    function normalizeISBN(raw) {
        return raw.replace(/[\s-]/g, '').replace(/x$/i, 'X');
    }

    function isValidISBN13(digits) {
        if (digits.length !== 13 || !/^\d{13}$/.test(digits)) return false;
        var sum = 0;
        for (var i = 0; i < 12; i++) {
            sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
        }
        return (10 - (sum % 10)) % 10 === parseInt(digits[12]);
    }

    function isValidISBN10(digits) {
        if (digits.length !== 10) return false;
        var sum = 0;
        for (var i = 0; i < 9; i++) {
            if (!/\d/.test(digits[i])) return false;
            sum += parseInt(digits[i]) * (10 - i);
        }
        var last = digits[9] === 'X' ? 10 : parseInt(digits[9]);
        if (isNaN(last)) return false;
        return (sum + last) % 11 === 0;
    }

    function isTitleCase(str) {
        var words = str.trim().split(/\s+/);
        if (words.length < 3) return false;
        if (!/^[A-Z]/.test(words[0])) return false;
        var minor = /^(a|an|the|and|but|or|for|nor|of|in|to|with|on|at|by|&)$/i;
        var capitalizedCount = 0;
        for (var w = 0; w < words.length; w++) {
            if (/^[A-Z]/.test(words[w])) capitalizedCount++;
            else if (!minor.test(words[w])) return false; // non-minor word not capitalized = not Title Case
        }
        return capitalizedCount >= Math.ceil(words.length / 2);
    }

    function createBookFinderBar(isbn, title) {
        var bar = document.createElement('div');
        bar.setAttribute('data-book-finder-bar', 'true');
        bar.style.cssText = darkModeEnabled
            ? 'display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; margin: 4px 0; '
            + 'background-color: #2d2d2d !important; border: 1px solid #404040; border-radius: 4px; '
            + 'font-size: 12px; line-height: 1.4; color: #e0e0e0;'
            : 'display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; margin: 4px 0; '
            + 'background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; '
            + 'font-size: 12px; line-height: 1.4; color: #333;';

        var label = document.createElement('span');
        label.textContent = '\uD83D\uDCD6 ';
        label.style.cssText = 'font-weight: bold; white-space: nowrap;';
        bar.appendChild(label);

        var linkColor = darkModeEnabled ? '#66b3ff' : '#1a73e8';
        var sepColor = darkModeEnabled ? '#555' : '#ccc';
        var searchQuery = title ? encodeURIComponent(title) : '';
        var links = [];

        // DTU Findit (library)
        if (isbn) {
            links.push({ text: 'DTU Library', url: 'https://findit.dtu.dk/en/catalog?q=isbn:' + isbn });
        } else if (title) {
            links.push({ text: 'DTU Library', url: 'https://findit.dtu.dk/en/catalog?q=' + searchQuery });
        }

        // Polyteknisk bookshop (ISBN only - direct product page)
        if (isbn) {
            links.push({ text: 'Polyteknisk', url: 'https://www.polyteknisk.dk/home/Detaljer/' + isbn });
        }

        // DBA.dk (used marketplace)
        if (title) {
            links.push({ text: 'DBA', url: 'https://www.dba.dk/soeg/?soeg=' + searchQuery });
        } else if (isbn) {
            links.push({ text: 'DBA', url: 'https://www.dba.dk/soeg/?soeg=' + isbn });
        }

        // Facebook Marketplace
        if (title) {
            links.push({ text: 'Marketplace', url: 'https://www.facebook.com/marketplace/search/?query=' + searchQuery });
        } else if (isbn) {
            links.push({ text: 'Marketplace', url: 'https://www.facebook.com/marketplace/search/?query=' + isbn });
        }

        for (var i = 0; i < links.length; i++) {
            if (i > 0) {
                var sep = document.createElement('span');
                sep.textContent = '|';
                sep.style.cssText = 'color: ' + sepColor + ';';
                bar.appendChild(sep);
            }
            var a = document.createElement('a');
            a.href = links[i].url;
            a.textContent = links[i].text;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.style.cssText = 'color: ' + linkColor + ' !important; text-decoration: none; white-space: nowrap; '
                + 'padding: 2px 6px; border-radius: 3px;';
            bar.appendChild(a);
        }

        return bar;
    }

    function insertBookFinderLinks() {
        if (!IS_TOP_WINDOW) return;
        if (!isDTULearnCoursePage()) return;
        if (!isFeatureFlagEnabled(FEATURE_BOOK_FINDER_KEY)) {
            document.querySelectorAll('[data-book-finder-bar]').forEach(function (el) { el.remove(); });
            document.querySelectorAll('[data-book-finder-injected]').forEach(function (el) {
                el.removeAttribute('data-book-finder-injected');
            });
            return;
        }

        var contentArea = document.querySelector('.d2l-page-main')
            || document.querySelector('#ContentView')
            || document.querySelector('.d2l-le-content')
            || document.body;
        if (!contentArea) return;

        // --- Pass 1: ISBN detection via TreeWalker ---
        var walker = document.createTreeWalker(contentArea, NodeFilter.SHOW_TEXT, null);
        var isbnHits = [];
        var textNode;
        while ((textNode = walker.nextNode())) {
            if (textNode.parentElement && textNode.parentElement.closest('[data-book-finder-injected]')) continue;
            if (textNode.parentElement && /^(SCRIPT|STYLE|NOSCRIPT|INPUT|TEXTAREA)$/i.test(textNode.parentElement.tagName)) continue;

            var text = textNode.textContent;
            var match;

            ISBN_REGEX.lastIndex = 0;
            while ((match = ISBN_REGEX.exec(text)) !== null) {
                var raw = normalizeISBN(match[1]);
                if (isValidISBN13(raw) || isValidISBN10(raw)) {
                    isbnHits.push({ node: textNode, isbn: raw, title: null });
                }
            }

            BARE_ISBN13_REGEX.lastIndex = 0;
            while ((match = BARE_ISBN13_REGEX.exec(text)) !== null) {
                var rawBare = normalizeISBN(match[1]);
                if (isValidISBN13(rawBare) && !isbnHits.some(function (h) { return h.isbn === rawBare; })) {
                    isbnHits.push({ node: textNode, isbn: rawBare, title: null });
                }
            }
        }

        // --- Pass 2: Book title detection ---
        var titleHits = [];
        var containers = contentArea.querySelectorAll('p, li, div, td, span, dd, section');
        for (var c = 0; c < containers.length; c++) {
            var container = containers[c];
            if (container.closest('[data-book-finder-injected]')) continue;
            if (container.querySelector('[data-book-finder-bar]')) continue;
            // Skip containers that are too large (likely wrapper divs)
            if (container.children.length > 20) continue;

            var cText = container.textContent;
            if (!BOOK_KEYWORDS.test(cText)) continue;

            // Check "Textbook:" / "Bog:" pattern â€” keyword with colon followed by book info
            var keyColonMatch = cText.match(/\b(textbook|text\s*book|course\s*book|required\s*reading|recommended\s*reading|suggested\s*reading|bog|l\u00e6rebog|kursus\s*bog|anbefalet\s*l\u00e6sning|pensum|litteratur)s?\s*:\s*(.+)/i);
            if (keyColonMatch) {
                // Extract the text after the keyword, strip trailing noise
                var bookInfo = keyColonMatch[2]
                    .replace(/\.\s*See\s+(more|also)\b.*/i, '')       // English: "See more..."
                    .replace(/\.\s*Se\s+(mere|ogs\u00e5)\b.*/i, '')   // Danish: "Se mere..."
                    .replace(/\s*\((?:Kapitel|Chapter|kap\.).*/i, '')  // Parenthetical chapter refs
                    .trim();
                // Remove trailing period
                bookInfo = bookInfo.replace(/\.\s*$/, '').trim();
                if (bookInfo.length >= 10 && !titleHits.some(function (h) { return h.title === bookInfo; })) {
                    titleHits.push({ element: container, title: bookInfo, isbn: null });
                }
            }

            // Check quoted titles
            if (!keyColonMatch) {
                QUOTED_TITLE_REGEX.lastIndex = 0;
                var qMatch;
                while ((qMatch = QUOTED_TITLE_REGEX.exec(cText)) !== null) {
                    var candidateTitle = qMatch[1].trim();
                    if (isTitleCase(candidateTitle) && !titleHits.some(function (h) { return h.title === candidateTitle; })) {
                        titleHits.push({ element: container, title: candidateTitle, isbn: null });
                    }
                }

                // Check <em> and <i> tags
                var emEls = container.querySelectorAll('em, i');
                for (var e = 0; e < emEls.length; e++) {
                    var emText = emEls[e].textContent.trim();
                    if (isTitleCase(emText) && emText.split(/\s+/).length >= 3
                        && !titleHits.some(function (h) { return h.title === emText; })) {
                        titleHits.push({ element: container, title: emText, isbn: null });
                    }
                }
            }
        }

        // --- Inject link bars for ISBN hits ---
        for (var ib = 0; ib < isbnHits.length; ib++) {
            var hit = isbnHits[ib];
            var blockParent = hit.node.parentElement
                ? hit.node.parentElement.closest('p, div, li, td, blockquote, dd, section')
                : null;
            if (!blockParent) blockParent = hit.node.parentElement;
            if (!blockParent || blockParent.getAttribute('data-book-finder-injected')) continue;

            // Try to extract a nearby title for DBA/Marketplace search
            var nearbyTitle = null;
            var parentText = blockParent.textContent;
            QUOTED_TITLE_REGEX.lastIndex = 0;
            var nearby = QUOTED_TITLE_REGEX.exec(parentText);
            if (nearby && isTitleCase(nearby[1].trim())) nearbyTitle = nearby[1].trim();

            blockParent.setAttribute('data-book-finder-injected', 'true');
            var bar = createBookFinderBar(hit.isbn, nearbyTitle);
            blockParent.parentNode.insertBefore(bar, blockParent.nextSibling);
        }

        // --- Inject link bars for title hits ---
        for (var ti = 0; ti < titleHits.length; ti++) {
            var tHit = titleHits[ti];
            var tBlock = tHit.element.closest('p, div, li, td, blockquote, dd, section') || tHit.element;
            if (tBlock.getAttribute('data-book-finder-injected')) continue;
            // Skip if an ISBN bar was already injected in this container
            if (tBlock.querySelector('[data-book-finder-bar]')) continue;

            tBlock.setAttribute('data-book-finder-injected', 'true');
            var tBar = createBookFinderBar(null, tHit.title);
            tBlock.parentNode.insertBefore(tBar, tBlock.nextSibling);
        }

        // --- PDF scanning disabled for now (tabled) ---
    }

    // Book Finder runs from runTopWindowFeatureChecks(...) to respect feature toggles.

    // ===== TEXTBOOK LINKER (kurser.dtu.dk Course literature) =====
    var _kurserTextbookLinkerTimer = null;
    var _finditAvailabilityCache = Object.create(null);

    function isKurserLiteratureLabel(text) {
        if (!text) return false;
        var normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) return false;
        if (normalized.length > 130) return false;

        var lower = normalized.toLowerCase();
        if (/^(course\s+literature|literature|kursuslitteratur|litteratur)\s*:?\s*$/.test(lower)) return true;

        // Accept common variants, e.g. "Course literature and material".
        if (/\b(literature|litteratur|kursuslitteratur)\b/.test(lower)) {
            if (/\b(course|kursus|reading|pensum|material|materials|materiale)\b/.test(lower)) return true;
            // Short standalone labels that still clearly indicate literature.
            if (lower.split(' ').length <= 4) return true;
        }
        return false;
    }

    function isNotesOnlyLiterature(text) {
        if (!text) return true;
        var normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) return true;
        if (/^(none|n\/a|-)\s*$/i.test(normalized)) return true;
        if (/^notes?\s+provided\.?$/i.test(normalized)) return true;
        if (/^lecture\s+notes?\s+provided\.?$/i.test(normalized)) return true;
        if (/^notes?\s+will\s+be\s+provided\.?$/i.test(normalized)) return true;
        return false;
    }

    function findKurserLiteratureContainers() {
        var found = [];
        var seen = new Set();
        function addCandidate(el) {
            if (!el || el.nodeType !== 1) return;
            if (seen.has(el)) return;
            var txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!txt) return;
            if (txt.length > 7000) return;
            seen.add(el);
            found.push(el);
        }

        // Table layout: [label][content]
        document.querySelectorAll('tr').forEach(function (tr) {
            var cells = tr.querySelectorAll('th, td');
            if (cells.length < 2) return;
            var label = (cells[0].textContent || '').replace(/\s+/g, ' ').trim();
            if (!isKurserLiteratureLabel(label)) return;
            addCandidate(cells[cells.length - 1]);
        });

        // Definition list layout: <dt>label</dt><dd>content</dd>
        document.querySelectorAll('dt').forEach(function (dt) {
            if (!isKurserLiteratureLabel((dt.textContent || '').trim())) return;
            var dd = dt.nextElementSibling;
            while (dd && dd.tagName && dd.tagName.toLowerCase() !== 'dd') dd = dd.nextElementSibling;
            addCandidate(dd);
        });

        // Generic heading/label layout.
        document.querySelectorAll('h1, h2, h3, h4, strong, b, label, div, span, p').forEach(function (el) {
            var label = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!isKurserLiteratureLabel(label)) return;
            if (label.length > 50) return;

            var candidate = null;
            if (el.nextElementSibling) {
                candidate = el.nextElementSibling;
            } else if (el.parentElement) {
                var siblings = Array.prototype.filter.call(el.parentElement.children, function (ch) {
                    return ch !== el && ((ch.innerText || ch.textContent || '').replace(/\s+/g, ' ').trim().length > 0);
                });
                if (siblings.length === 1) {
                    candidate = siblings[0];
                } else if (siblings.length > 1) {
                    candidate = siblings.reduce(function (best, cur) {
                        var bestLen = (best.innerText || best.textContent || '').length;
                        var curLen = (cur.innerText || cur.textContent || '').length;
                        return curLen > bestLen ? cur : best;
                    });
                }
            }
            addCandidate(candidate);
        });

        // Inline layout: "Course literature: [1] ...".
        document.querySelectorAll('p, div, td, dd, span, li').forEach(function (el) {
            var txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!txt || txt.length < 20 || txt.length > 3000) return;
            if (!/\b(course\s+literature|literature|kursuslitteratur|litteratur)\b\s*:/i.test(txt)) return;
            addCandidate(el);
        });

        return found;
    }

    function getKurserBarSectionData(barEl) {
        if (!barEl) return { text: '', lines: [], insertBeforeNode: null };
        var raw = '';
        var collected = [];
        var current = '';
        var node = barEl.nextSibling;
        var insertBeforeNode = null;

        function normalizeFragment(text) {
            return (text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        }
        function appendFragment(text) {
            var t = normalizeFragment(text);
            if (!t) return;
            current = current ? (current + ' ' + t) : t;
        }
        function flushCurrent() {
            var t = normalizeFragment(current);
            if (t) collected.push(t);
            current = '';
        }

        while (node) {
            if (node.nodeType === 1 && node.classList && node.classList.contains('bar')) {
                insertBeforeNode = node;
                break;
            }
            if (node.nodeType === 3) {
                var txtNodeText = node.textContent || '';
                raw += txtNodeText;
                appendFragment(txtNodeText);
            } else if (node.nodeType === 1) {
                if (node.tagName && node.tagName.toUpperCase() === 'BR') {
                    raw += '\n';
                    flushCurrent();
                } else if (node.tagName && /^(UL|OL)$/i.test(node.tagName)) {
                    flushCurrent();
                    var listItems = node.querySelectorAll('li');
                    listItems.forEach(function (li) {
                        var liTxt = normalizeFragment(li.innerText || li.textContent || '');
                        if (liTxt) collected.push(liTxt);
                    });
                } else {
                    var elementText = node.innerText || node.textContent || '';
                    raw += '\n' + elementText + '\n';
                    if (node.tagName && /^(P|DIV|SECTION|TABLE|TR)$/i.test(node.tagName)) {
                        flushCurrent();
                        appendFragment(elementText);
                        flushCurrent();
                    } else {
                        appendFragment(elementText);
                    }
                }
            }
            node = node.nextSibling;
        }
        flushCurrent();

        var lines = [];
        collected.forEach(function (line) {
            splitKurserLiteratureText(line).forEach(function (part) {
                var txt = (part || '').trim();
                if (!txt) return;
                if (/^recommended\s*:?\s*$/i.test(txt)) return;
                if (/^required\s*:?\s*$/i.test(txt)) return;
                lines.push(txt);
            });
        });

        return {
            text: raw,
            lines: lines,
            insertBeforeNode: insertBeforeNode
        };
    }

    function shouldMergeWrappedLiteratureLine(prev, next) {
        if (!prev || !next) return false;
        if (/^\s*(?:\[\s*\d+\s*\]|\d+\s*[.)])/.test(next)) return false;
        if (/^\s*(recommended|required|remarks|last\s+updated)\b/i.test(next)) return false;
        if (/^\s*[A-Z][A-Za-z'.\-]{1,30},\s*[A-Z]/.test(next) && /[.!?]\s*$/.test(prev)) return false;
        if (/\b(?:and|or|of|for|to|in|on|the|a|an|isbn:?|edition|ed\.)\s*$/i.test(prev)) return true;
        if (/[,:\-]\s*$/.test(prev)) return true;
        if (!/[.!?;]\s*$/.test(prev)) return true;
        if (next.length <= 35) return true;
        return false;
    }

    function splitKurserLiteratureText(raw) {
        var txt = (raw || '').replace(/\u00a0/g, ' ').trim();
        if (!txt) return [];

        // Normalize multiple spaces but keep line boundaries for merge heuristics.
        txt = txt.replace(/[ \t]{2,}/g, ' ');
        var lines = txt.split(/\r?\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (lines.length > 1) {
            var merged = [];
            lines.forEach(function (line) {
                if (!merged.length) {
                    merged.push(line);
                    return;
                }
                var prev = merged[merged.length - 1];
                if (shouldMergeWrappedLiteratureLine(prev, line)) {
                    merged[merged.length - 1] = (prev + ' ' + line).replace(/\s+/g, ' ').trim();
                } else {
                    merged.push(line);
                }
            });

            var expanded = [];
            merged.forEach(function (line) {
                var bracketParts = line.split(/(?=\[\s*\d+\s*\])/g).map(function (s) { return s.trim(); }).filter(Boolean);
                if (bracketParts.length > 1) {
                    bracketParts.forEach(function (p) { expanded.push(p); });
                    return;
                }
                expanded.push(line);
            });
            return expanded;
        }

        // Single-line fallbacks: split on citation markers.
        var one = txt.replace(/\s+/g, ' ').trim();
        var splitByBracket = one.split(/(?=\[\s*\d+\s*\])/g).map(function (s) { return s.trim(); }).filter(Boolean);
        if (splitByBracket.length > 1) return splitByBracket;

        var splitByNumber = one.split(/(?=\b\d+\s*[.)]\s*[A-Z])/g).map(function (s) { return s.trim(); }).filter(Boolean);
        if (splitByNumber.length > 1) return splitByNumber;

        var splitBySemicolon = one.split(/\s*;\s*/g).map(function (s) { return s.trim(); }).filter(Boolean);
        if (splitBySemicolon.length > 1) return splitBySemicolon;

        return [one];
    }

    function extractISBNFromCitationLine(line) {
        if (!line) return null;
        var m = line.match(/\bISBN[-\s]?(?:1[03])?[\s:]*\s*([\dXx][\d\s-]{8,}[\dXx])\b/i);
        if (m && m[1]) {
            var isbn = normalizeISBN(m[1]);
            if (isValidISBN13(isbn) || isValidISBN10(isbn)) return isbn;
        }

        var b = line.match(/\b(97[89][\d-]{10,})\b/);
        if (b && b[1]) {
            var isbn13 = normalizeISBN(b[1]);
            if (isValidISBN13(isbn13)) return isbn13;
        }
        return null;
    }

    function countCapitalizedWords(line) {
        if (!line) return 0;
        return (line.match(/\b[A-Z][A-Za-z'`\-]{1,}\b/g) || []).length;
    }

    function countInitials(line) {
        if (!line) return 0;
        return (line.match(/\b[A-Z]\./g) || []).length;
    }

    function isLikelyBibliographicNameTitlePattern(line) {
        if (!line) return false;
        var txt = line.replace(/\s+/g, ' ').trim();
        if (!txt) return false;
        if (txt.split(/\s+/).length < 4 || txt.split(/\s+/).length > 65) return false;

        var lower = txt.toLowerCase();
        if (/^(the|this|that|in|it|course|other|recommended|required|notes?)\b/.test(lower)) return false;

        var capitals = countCapitalizedWords(txt);
        var initials = countInitials(txt);
        var connectorCount = (txt.match(/\s(?:and|&)\s|,/gi) || []).length;
        var punctuationCount = (txt.match(/[,.]/g) || []).length;

        // User-observed pattern: many capitalized names/words separated by and/,&,.,,
        if ((capitals + initials) < 5) return false;
        if (connectorCount === 0 && punctuationCount < 2) return false;
        return true;
    }

    function parseKurserCitationLine(rawLine) {
        if (!rawLine) return null;
        var line = rawLine.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        if (!line) return null;
        if (isNotesOnlyLiterature(line)) return null;
        if (/https?:\/\//i.test(line)) return null;

        var isbn = extractISBNFromCitationLine(line);
        var leadingCitationPattern = /^\s*(?:\[\s*\d+\s*\]|\d+\s*[.)])\s*/;
        var hasLeadingCitation = leadingCitationPattern.test(line);

        // Remove leading citation markers like [1], 1), 1.
        line = line.replace(leadingCitationPattern, '');
        // Remove explicit ISBN fragments from title parsing.
        line = line.replace(/\bISBN[-\s]?(?:1[03])?[\s:]*\s*[\dXx][\d\s-]{8,}[\dXx]\b/ig, '').trim();
        line = line
            .replace(/\(\s*all\s+editions?\s+are\s+ok\s*\)/ig, '')
            .replace(/\ball\s+editions?\s+are\s+ok\b/ig, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        var author = '';
        var title = '';

        // Typical pattern: "Author, Title."
        var citationMatch = line.match(/^([^,]{2,140}),\s*([^.;][^.;]{2,220})/);
        var hasAuthorTitle = !!citationMatch;
        var publisherHint = /\b(press|wiley|springer|pearson|elsevier|cambridge|oxford|mcgraw|macmillan|routledge|cengage|crc)\b/i;
        var editionHint = /\b(edition|ed\.|e-book|ebook)\b/i;
        var genericNoise = /\b(in\s+addition|supplements?\s+will\s+be\s+provided|it\s+is\s+not\s+required|other\s+books?\s+on\s+the\s+same\s+topic|course\s+compendium|research\s+articles?|will\s+be\s+made\s+accessible|can\s+be\s+used\s+as\s+well|follow\s+the\s+course|notations?\s+in\s+the\s+course\s+material|freely\s+available)\b/i;
        var hasNameTitlePattern = isLikelyBibliographicNameTitlePattern(line);

        var hasStandaloneTitle = !hasAuthorTitle
            && /^[A-Z0-9][A-Za-z0-9&'()\-:,.\s]{8,}$/.test(line)
            && line.split(/\s+/).length >= 3
            && (publisherHint.test(line) || editionHint.test(line) || hasNameTitlePattern);

        // Confidence model for very mixed lecturer input formats.
        var confidence = 0;
        if (isbn) confidence += 4;
        if (hasLeadingCitation) confidence += 2;
        if (hasAuthorTitle) confidence += 2;
        if (hasStandaloneTitle) confidence += 2;
        if (hasNameTitlePattern) confidence += 2;
        if (publisherHint.test(line)) confidence += 1;
        if (editionHint.test(line)) confidence += 1;
        if (genericNoise.test(line) && !publisherHint.test(line)) confidence -= 3;
        if (/https?:\/\//i.test(line)) confidence -= 3;
        if (line.length < 12) confidence -= 1;

        if (confidence < 2) return null;

        if (citationMatch) {
            author = citationMatch[1].trim();
            title = citationMatch[2].trim();
        } else {
            // Fallback: treat remaining line as title.
            title = line;
        }

        title = title
            .replace(/\s*\((?:eds?|ed\.|chapter|kapitel)[^)]+\)\s*/ig, ' ')
            .replace(/[;,.:\-]\s*$/, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        if (!title && !isbn) return null;
        if (title && title.length < 3 && !isbn) return null;

        var queryText = line
            .replace(/\bpp?\.?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/\bpages?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/\b,?\s*pp?\s*[-:]?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/[;,.]\s*$/, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        if (!isbn && (!queryText || queryText.length < 4)) return null;

        return {
            raw: rawLine,
            author: author,
            title: title,
            isbn: isbn,
            queryText: queryText
        };
    }

    function cleanKurserCitationQuery(query) {
        return (query || '')
            .replace(/\bpp?\.?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/\bpages?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/\b,?\s*pp?\s*[-:]?\s*\d+\s*(?:[-–]\s*\d+)?\b/ig, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/[;,.]\s*$/, '')
            .trim();
    }

    function buildKurserFinditUrl(citation) {
        if (!citation) return null;
        var query = '';
        if (citation.isbn) {
            query = 'isbn:' + citation.isbn;
        } else if (citation.queryText) {
            query = cleanKurserCitationQuery(citation.queryText);
        } else {
            var parts = [];
            if (citation.title) parts.push(citation.title);
            if (citation.author) parts.push(citation.author);
            query = parts.join(' - ');
        }
        if (!query) return null;
        return 'https://findit.dtu.dk/en/catalog?utf8=%E2%9C%93&type=book&q=' + encodeURIComponent(query);
    }

    function buildKurserGoogleBooksUrl(citation) {
        if (!citation) return null;
        var query = '';
        if (citation.isbn) {
            query = 'isbn:' + citation.isbn;
        } else if (citation.queryText) {
            query = cleanKurserCitationQuery(citation.queryText);
        } else {
            var parts = [];
            if (citation.title) parts.push(citation.title);
            if (citation.author) parts.push(citation.author);
            query = parts.join(' - ');
        }
        if (!query) return null;
        return 'https://books.google.com/books?q=' + encodeURIComponent(query);
    }

    function checkFinditOnlineAccess(url, cb) {
        if (!url) {
            cb(false);
            return;
        }
        if (_finditAvailabilityCache[url] && _finditAvailabilityCache[url].done) {
            cb(!!_finditAvailabilityCache[url].onlineAccess);
            return;
        }
        if (_finditAvailabilityCache[url] && _finditAvailabilityCache[url].pending) {
            _finditAvailabilityCache[url].callbacks.push(cb);
            return;
        }

        _finditAvailabilityCache[url] = { pending: true, callbacks: [cb] };
        sendRuntimeMessage({ type: 'dtu-findit-availability', url: url }, function (response) {
            var onlineAccess = !!(response && response.ok && response.onlineAccess);
            var pending = _finditAvailabilityCache[url];
            _finditAvailabilityCache[url] = { done: true, onlineAccess: onlineAccess };
            if (pending && Array.isArray(pending.callbacks)) {
                pending.callbacks.forEach(function (fn) {
                    try { fn(onlineAccess); } catch (e) { }
                });
            }
        });
    }

    function styleLibraryBadgeAsOnline(badge) {
        if (!badge || !badge.style) return;
        badge.textContent = 'Free PDF ✅';
        badge.style.setProperty('background-color', '#2e7d32', 'important');
        badge.style.setProperty('border-color', '#43a047', 'important');
        badge.style.setProperty('color', '#ffffff', 'important');
    }

    function createKurserLibraryBadge(url) {
        var badge = document.createElement('a');
        markExt(badge);
        badge.setAttribute('data-dtu-textbook-linker', '1');
        badge.setAttribute('data-dtu-textbook-linker-kind', 'library');
        badge.href = url;
        badge.target = '_blank';
        badge.rel = 'noopener noreferrer';
        badge.textContent = 'Check Library';
        badge.style.cssText = darkModeEnabled
            ? 'display: inline-block; margin-left: 8px; padding: 2px 7px; border-radius: 10px; '
            + 'font-size: 11px; line-height: 1.3; font-weight: 600; text-decoration: none; '
            + 'background: rgba(102,179,255,0.14); color: #7cc0ff; border: 1px solid rgba(102,179,255,0.55);'
            : 'display: inline-block; margin-left: 8px; padding: 2px 7px; border-radius: 10px; '
            + 'font-size: 11px; line-height: 1.3; font-weight: 600; text-decoration: none; '
            + 'background: #eef6ff; color: #1a73e8; border: 1px solid #9dc7ff;';
        return badge;
    }

    function createKurserGoogleBooksBadge(url) {
        var badge = document.createElement('a');
        markExt(badge);
        badge.setAttribute('data-dtu-textbook-linker', '1');
        badge.setAttribute('data-dtu-textbook-linker-kind', 'google-books');
        badge.href = url;
        badge.target = '_blank';
        badge.rel = 'noopener noreferrer';
        badge.textContent = 'Google Books';
        badge.style.cssText = darkModeEnabled
            ? 'display: inline-block; margin-left: 8px; padding: 2px 7px; border-radius: 10px; '
            + 'font-size: 11px; line-height: 1.3; font-weight: 600; text-decoration: none; '
            + 'background: rgba(255,183,77,0.14); color: #ffcc80; border: 1px solid rgba(255,183,77,0.55);'
            : 'display: inline-block; margin-left: 8px; padding: 2px 7px; border-radius: 10px; '
            + 'font-size: 11px; line-height: 1.3; font-weight: 600; text-decoration: none; '
            + 'background: #fff6e8; color: #8a4b00; border: 1px solid #f0c07a;';
        return badge;
    }

    function extractLiteratureLineTargets(container) {
        var items = [];
        var blockCandidates = container.querySelectorAll('li, p');

        if (blockCandidates.length) {
            blockCandidates.forEach(function (node) {
                var raw = (node.innerText || node.textContent || '');
                splitKurserLiteratureText(raw).forEach(function (txt) {
                    if (!txt) return;
                    items.push({ text: txt, anchor: node });
                });
            });
        } else {
            var raw = (container.innerText || container.textContent || '');
            splitKurserLiteratureText(raw).forEach(function (txt) {
                items.push({ text: txt, anchor: container });
            });
        }

        var seen = Object.create(null);
        return items.filter(function (item) {
            if (!item.text || seen[item.text]) return false;
            seen[item.text] = true;
            return true;
        });
    }

    function injectKurserTextbookBadges(container, lines) {
        var fallback = null;
        var injected = 0;
        var seenKeys = Object.create(null);

        lines.forEach(function (item) {
            var parsed = parseKurserCitationLine(item.text);
            if (!parsed) return;
            var libraryUrl = buildKurserFinditUrl(parsed);
            var googleBooksUrl = buildKurserGoogleBooksUrl(parsed);
            if (!libraryUrl && !googleBooksUrl) return;

            var key = (parsed.isbn || cleanKurserCitationQuery(parsed.queryText || parsed.title || '')).toLowerCase();
            if (!key) key = libraryUrl || googleBooksUrl;
            if (seenKeys[key]) return;
            seenKeys[key] = true;

            var libraryBadge = null;
            var googleBadge = null;
            if (libraryUrl) {
                libraryBadge = createKurserLibraryBadge(libraryUrl);
                checkFinditOnlineAccess(libraryUrl, function (hasOnlineAccess) {
                    if (hasOnlineAccess) styleLibraryBadgeAsOnline(libraryBadge);
                });
            }
            if (googleBooksUrl) {
                googleBadge = createKurserGoogleBooksBadge(googleBooksUrl);
            }

            var badgeGroup = null;
            if (libraryBadge || googleBadge) {
                badgeGroup = document.createElement('span');
                markExt(badgeGroup);
                badgeGroup.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; flex-wrap: nowrap; white-space: nowrap;';
                if (libraryBadge) badgeGroup.appendChild(libraryBadge);
                if (googleBadge) badgeGroup.appendChild(googleBadge);
            }

            if (item.anchor !== container) {
                if (item.anchor.querySelector('[data-dtu-textbook-linker]')) return;
                if (badgeGroup) {
                    item.anchor.appendChild(document.createTextNode(' '));
                    item.anchor.appendChild(badgeGroup);
                }
                injected++;
                return;
            }

            // Fallback when the literature block is plain text lines in one container.
            if (!fallback) {
                fallback = document.createElement('div');
                markExt(fallback);
                fallback.setAttribute('data-dtu-textbook-linker-fallback', '1');
                fallback.style.cssText = 'margin-top: 8px; display: flex; flex-direction: column; gap: 4px;';
                container.appendChild(fallback);
            }
            var row = document.createElement('div');
            markExt(row);
            row.style.cssText = 'display: flex; align-items: center; flex-wrap: wrap; gap: 6px;';
            var excerpt = document.createElement('span');
            markExt(excerpt);
            excerpt.style.cssText = 'font-size: 12px; opacity: 0.85;';
            var clean = item.text.replace(/\s+/g, ' ').trim();
            excerpt.textContent = clean.length > 90 ? (clean.slice(0, 87) + '...') : clean;
            row.appendChild(excerpt);
            if (badgeGroup) row.appendChild(badgeGroup);
            fallback.appendChild(row);
            injected++;
        });

        return injected;
    }

    function processKurserLiteratureBarSections() {
        var bars = document.querySelectorAll('.bar');
        if (!bars.length) return;

        bars.forEach(function (bar) {
            var label = (bar.textContent || '').replace(/\s+/g, ' ').trim();
            if (!isKurserLiteratureLabel(label)) return;
            if (bar.getAttribute('data-dtu-textbook-linker-scanned') === '1') return;

            var attempts = parseInt(bar.getAttribute('data-dtu-textbook-linker-attempts') || '0', 10);
            if (attempts >= 5) return;
            bar.setAttribute('data-dtu-textbook-linker-attempts', String(attempts + 1));

            var section = getKurserBarSectionData(bar);
            if (!section || !section.lines.length) return;
            if (isNotesOnlyLiterature((section.text || '').replace(/\s+/g, ' ').trim())) {
                bar.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            // Already restructured?
            var existingHost = bar.parentElement
                ? bar.parentElement.querySelector('[data-dtu-textbook-linker-bar-host-for="' + label.toLowerCase() + '"]')
                : null;
            if (existingHost && existingHost.querySelector('[data-dtu-textbook-linker]')) {
                bar.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            // Deduplicate lines
            var seenLines = Object.create(null);
            var uniqueLines = [];
            section.lines.forEach(function (line) {
                var key = line.toLowerCase().replace(/\s+/g, ' ').trim();
                if (seenLines[key]) return;
                seenLines[key] = true;
                uniqueLines.push(line);
            });

            // Hide original content nodes between this bar and the next bar
            // (preserved in DOM for easy rollback -- just remove the wrapper)
            var node = bar.nextSibling;
            var toHide = [];
            while (node) {
                if (node.nodeType === 1 && node.classList && node.classList.contains('bar')) break;
                if (node.nodeType === 1 && node.hasAttribute('data-dtu-textbook-linker-bar-host')) { node = node.nextSibling; continue; }
                if (node.nodeType === 1 && node.hasAttribute('data-dtu-textbook-original')) { node = node.nextSibling; continue; }
                toHide.push(node);
                node = node.nextSibling;
            }
            if (toHide.length) {
                var originalWrap = document.createElement('div');
                originalWrap.style.display = 'none';
                originalWrap.setAttribute('data-dtu-textbook-original', '1');
                markExt(originalWrap);
                bar.insertAdjacentElement('afterend', originalWrap);
                toHide.forEach(function (n) { originalWrap.appendChild(n); });
            }

            // Build structured literature container
            var host = document.createElement('div');
            markExt(host);
            host.setAttribute('data-dtu-textbook-linker-bar-host', '1');
            host.setAttribute('data-dtu-textbook-linker-bar-host-for', label.toLowerCase());
            host.style.cssText = 'margin: 8px 0 12px; padding: 0 8px;';

            // Insert host after bar (skip past the hidden original wrapper)
            var insertRef = bar.nextSibling;
            while (insertRef && insertRef.nodeType === 1 && insertRef.hasAttribute('data-dtu-textbook-original')) {
                insertRef = insertRef.nextSibling;
            }
            if (insertRef) {
                bar.parentNode.insertBefore(host, insertRef);
            } else if (bar.parentNode) {
                bar.parentNode.appendChild(host);
            }

            var accentColor = darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)';
            var textColor = darkModeEnabled ? '#e0e0e0' : '#333';
            var mutedColor = darkModeEnabled ? '#888' : '#777';
            var dividerColor = darkModeEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

            var injectedCount = 0;
            var seenKeys = Object.create(null);

            uniqueLines.forEach(function (lineText) {
                var parsed = parseKurserCitationLine(lineText);
                if (!parsed) return;
                var libraryUrl = buildKurserFinditUrl(parsed);
                var googleBooksUrl = buildKurserGoogleBooksUrl(parsed);
                if (!libraryUrl && !googleBooksUrl) return;

                var key = (parsed.isbn || cleanKurserCitationQuery(parsed.queryText || parsed.title || '')).toLowerCase();
                if (!key) key = libraryUrl || googleBooksUrl;
                if (seenKeys[key]) return;
                seenKeys[key] = true;

                // Divider between entries
                if (injectedCount > 0) {
                    var divider = document.createElement('div');
                    markExt(divider);
                    divider.style.cssText = 'border-top: 1px solid ' + dividerColor + '; margin: 6px 0;';
                    host.appendChild(divider);
                }

                var row = document.createElement('div');
                markExt(row);
                row.setAttribute('data-dtu-textbook-linker', '1');
                row.style.cssText = 'display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 6px 0; flex-wrap: wrap;';

                // Citation text
                var citationEl = document.createElement('span');
                markExt(citationEl);
                citationEl.style.cssText = 'font-size: 13px; color: ' + textColor + '; flex: 1 1 auto; min-width: 200px; line-height: 1.5;';
                citationEl.textContent = lineText;
                row.appendChild(citationEl);

                // Action links
                var actions = document.createElement('span');
                markExt(actions);
                actions.style.cssText = 'display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; white-space: nowrap;';

                if (libraryUrl) {
                    var finditLink = document.createElement('a');
                    markExt(finditLink);
                    finditLink.setAttribute('data-dtu-textbook-linker', '1');
                    finditLink.setAttribute('data-dtu-textbook-linker-kind', 'library');
                    finditLink.href = libraryUrl;
                    finditLink.target = '_blank';
                    finditLink.rel = 'noopener noreferrer';
                    finditLink.textContent = 'DTU FindIt';
                    finditLink.style.cssText = 'font-size: 12px; font-weight: 600; text-decoration: none; '
                        + 'color: ' + accentColor + '; padding: 2px 8px; border-radius: 3px; '
                        + 'border: 1px solid ' + (darkModeEnabled ? 'rgba(var(--dtu-ad-accent-deep-rgb),0.35)' : 'rgba(var(--dtu-ad-accent-deep-rgb),0.2)') + '; '
                        + 'background: ' + (darkModeEnabled ? 'rgba(var(--dtu-ad-accent-deep-rgb),0.18)' : 'rgba(var(--dtu-ad-accent-deep-rgb),0.05)') + ';';
                    actions.appendChild(finditLink);

                    checkFinditOnlineAccess(libraryUrl, function (hasOnlineAccess) {
                        if (hasOnlineAccess) {
                            finditLink.textContent = 'Free PDF';
                            finditLink.style.setProperty('color', darkModeEnabled ? '#81c784' : '#2e7d32', 'important');
                            finditLink.style.setProperty('border-color', darkModeEnabled ? 'rgba(129,199,132,0.5)' : '#43a047', 'important');
                            finditLink.style.setProperty('background', darkModeEnabled ? 'rgba(46,125,50,0.15)' : 'rgba(46,125,50,0.06)', 'important');
                        }
                    });
                }

                if (googleBooksUrl) {
                    var googleLink = document.createElement('a');
                    markExt(googleLink);
                    googleLink.setAttribute('data-dtu-textbook-linker', '1');
                    googleLink.setAttribute('data-dtu-textbook-linker-kind', 'google-books');
                    googleLink.href = googleBooksUrl;
                    googleLink.target = '_blank';
                    googleLink.rel = 'noopener noreferrer';
                    googleLink.textContent = 'Google Books';
                    googleLink.style.cssText = 'font-size: 12px; text-decoration: none; color: ' + mutedColor + ';';
                    actions.appendChild(googleLink);
                }

                row.appendChild(actions);
                host.appendChild(row);
                injectedCount++;
            });

            if (injectedCount > 0 || attempts >= 4) {
                bar.setAttribute('data-dtu-textbook-linker-scanned', '1');
            }
        });
    }

    function restoreKurserLiteratureOriginals() {
        document.querySelectorAll('[data-dtu-textbook-original]').forEach(function (wrapper) {
            var parent = wrapper.parentNode;
            if (!parent) { wrapper.remove(); return; }
            while (wrapper.firstChild) {
                parent.insertBefore(wrapper.firstChild, wrapper);
            }
            wrapper.remove();
        });
    }

    function insertKurserTextbookLinks() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_KURSER_TEXTBOOK_LINKER_KEY)) {
            document.querySelectorAll('[data-dtu-textbook-linker], [data-dtu-textbook-linker-bar-host], [data-dtu-textbook-linker-fallback]').forEach(function (el) {
                el.remove();
            });
            restoreKurserLiteratureOriginals();
            document.querySelectorAll('[data-dtu-textbook-linker-scanned], [data-dtu-textbook-linker-attempts]').forEach(function (el) {
                el.removeAttribute('data-dtu-textbook-linker-scanned');
                el.removeAttribute('data-dtu-textbook-linker-attempts');
            });
            return;
        }
        if (!isKurserCoursePage()) return;

        // First handle the common kurser.dtu.dk "single .box with .bar sections" layout.
        processKurserLiteratureBarSections();

        var containers = findKurserLiteratureContainers();
        if (!containers.length) return;

        containers.forEach(function (container) {
            if (!container || container.getAttribute('data-dtu-textbook-linker-scanned') === '1') return;
            var attempts = parseInt(container.getAttribute('data-dtu-textbook-linker-attempts') || '0', 10);
            if (attempts >= 5) return;
            container.setAttribute('data-dtu-textbook-linker-attempts', String(attempts + 1));

            if (container.querySelector('[data-dtu-textbook-linker]')) {
                container.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            var fullText = (container.innerText || container.textContent || '').replace(/\s+/g, ' ').trim();
            if (isNotesOnlyLiterature(fullText)) {
                container.setAttribute('data-dtu-textbook-linker-scanned', '1');
                return;
            }

            var lines = extractLiteratureLineTargets(container);
            if (!lines.length) {
                return;
            }

            var injected = injectKurserTextbookBadges(container, lines);
            if (injected > 0) {
                container.setAttribute('data-dtu-textbook-linker-scanned', '1');
            }
        });
    }

    function scheduleKurserTextbookLinker(delayMs) {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'kurser.dtu.dk') return;
        if (!isFeatureFlagEnabled(FEATURE_KURSER_TEXTBOOK_LINKER_KEY)) {
            document.querySelectorAll('[data-dtu-textbook-linker], [data-dtu-textbook-linker-bar-host], [data-dtu-textbook-linker-fallback]').forEach(function (el) {
                el.remove();
            });
            restoreKurserLiteratureOriginals();
            document.querySelectorAll('[data-dtu-textbook-linker-scanned], [data-dtu-textbook-linker-attempts]').forEach(function (el) {
                el.removeAttribute('data-dtu-textbook-linker-scanned');
                el.removeAttribute('data-dtu-textbook-linker-attempts');
            });
            return;
        }
        if (_kurserTextbookLinkerTimer) return;
        _kurserTextbookLinkerTimer = setTimeout(function () {
            _kurserTextbookLinkerTimer = null;
            insertKurserTextbookLinks();
        }, delayMs || 550);
    }

    // ===== COURSE GRADE STATISTICS (kurser.dtu.dk) =====
    var _gradeStatsRequested = false;
    var _gradeStatsCourseCode = null;

    function isKurserCoursePage() {
        return window.location.hostname === 'kurser.dtu.dk'
            && /\/course\/(?:\d{4}-\d{4}\/)?[A-Za-z0-9]+/i.test(window.location.pathname);
    }

    function getKurserCourseCode() {
        var match = window.location.pathname.match(/\/course\/(?:\d{4}-\d{4}\/)?([A-Za-z0-9]+)/i);
        if (!match || !match[1]) return null;
        return match[1].toUpperCase();
    }

    function findKurserCourseTitleElement(courseCode) {
        var headings = Array.prototype.slice.call(document.querySelectorAll('h1, h2'));
        if (!headings.length) return null;
        var normalizedCode = (courseCode || '').toUpperCase();

        for (var i = 0; i < headings.length; i++) {
            var txt = (headings[i].textContent || '').trim().toUpperCase();
            if (normalizedCode && txt.indexOf(normalizedCode) === 0) return headings[i];
        }

        // DTU course pages commonly use an h2 title.
        var styledH2 = document.querySelector('h2[style*="font-family:verdana"]');
        if (styledH2) return styledH2;

        return document.querySelector('h1') || document.querySelector('h2');
    }

    function findKurserGradeStatsInsertAnchor(titleEl) {
        if (!titleEl) return null;
        var titleCol = titleEl.closest('.col-sm-9, .col-md-9, .col-lg-9, [class*="col-"]');
        if (titleCol && titleCol.parentElement) {
            var row = titleCol.parentElement;
            var cls = row.className || '';
            if (/\brow\b/.test(cls)) return row;
        }
        return titleEl;
    }

    function buildGradeStatsSemesters() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth(); // 0-11
        var startYear = (month <= 5) ? (year - 1) : year;
        var semesters = [];
        for (var y = startYear; y >= startYear - 6; y--) {
            semesters.push('Winter-' + y);
            semesters.push('Summer-' + y);
        }
        return semesters;
    }

    function sendRuntimeMessage(msg, cb) {
        try {
            if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
                var p = browser.runtime.sendMessage(msg);
                if (p && typeof p.then === 'function') {
                    p.then(cb).catch(function () { cb(null); });
                    return;
                }
                cb(p);
                return;
            }
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage(msg, cb);
                return;
            }
        } catch (e) {
            // ignore
        }
        if (cb) cb(null);
    }

    function markExt(el) {
        if (el && el.setAttribute) el.setAttribute('data-dtu-ext', '1');
    }

    // ===== MYLINE CURRICULUM BADGES (kurser.dtu.dk, from sdb.dtu.dk/myline) =====
    var _mylineCache = null;
    var _mylineCacheTs = 0;
    var _mylineInFlight = false;
    var MYLINE_CLIENT_TTL_MS = 1000 * 60 * 10; // keep a short in-page cache; background has longer TTL

    function getMyLineCurriculum(cb, forceRefresh) {
        var now = Date.now();
        if (!forceRefresh && _mylineCache && (now - _mylineCacheTs) < MYLINE_CLIENT_TTL_MS) {
            if (cb) cb(_mylineCache);
            return;
        }
        if (_mylineInFlight) {
            setTimeout(function () { getMyLineCurriculum(cb, forceRefresh); }, 120);
            return;
        }
        _mylineInFlight = true;
        sendRuntimeMessage({ type: 'dtu-sdb-myline', forceRefresh: !!forceRefresh }, function (resp) {
            _mylineInFlight = false;
            _mylineCache = resp || null;
            _mylineCacheTs = Date.now();
            if (cb) cb(_mylineCache);
        });
    }

    function getMyLineKindLabel(kind) {
        if (kind === 'mandatory') return 'Mandatory (my line)';
        if (kind === 'core') return 'Core (my line)';
        if (kind === 'elective_pool') return 'Elective pool (my line)';
        if (kind === 'project') return 'Project track (my line)';
        if (kind === 'approved_elective') return 'Approved elective (my line)';
        return '';
    }

    function buildMyLinePill(kind, isDark) {
        var pill = document.createElement('span');
        markExt(pill);
        pill.setAttribute('data-dtu-myline-pill', kind || '');
        pill.textContent = getMyLineKindLabel(kind) || 'My line';
        pill.style.cssText = 'display:inline-flex;align-items:center;gap:6px;'
            + 'padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;line-height:1.35;'
            + 'white-space:nowrap;';

        var fg = isDark ? '#e0e0e0' : '#222';
        var bg = isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.18)';
        var border = isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.30)';

        if (kind === 'mandatory') {
            fg = '#c62828';
            bg = isDark ? 'rgba(198,40,40,0.18)' : 'rgba(198,40,40,0.12)';
            border = isDark ? 'rgba(198,40,40,0.35)' : 'rgba(198,40,40,0.28)';
        } else if (kind === 'core') {
            fg = isDark ? '#ff6b6b' : '#990000';
            bg = isDark ? 'rgba(198,40,40,0.14)' : 'rgba(198,40,40,0.10)';
            border = isDark ? 'rgba(198,40,40,0.28)' : 'rgba(198,40,40,0.22)';
        } else if (kind === 'elective_pool') {
            fg = isDark ? '#93c5fd' : '#1d4ed8';
            bg = isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.10)';
            border = isDark ? 'rgba(59,130,246,0.30)' : 'rgba(29,78,216,0.22)';
        } else if (kind === 'project') {
            fg = isDark ? '#fbbf24' : '#b45309';
            bg = isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.10)';
            border = isDark ? 'rgba(245,158,11,0.30)' : 'rgba(180,83,9,0.22)';
        } else if (kind === 'approved_elective') {
            fg = isDark ? '#86efac' : '#166534';
            bg = isDark ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.10)';
            border = isDark ? 'rgba(34,197,94,0.30)' : 'rgba(22,101,52,0.22)';
        }

        pill.style.setProperty('color', fg, 'important');
        pill.style.setProperty('background', bg, 'important');
        pill.style.setProperty('background-color', bg, 'important');
        pill.style.setProperty('border', '1px solid ' + border, 'important');
        return pill;
    }

    function insertKurserMyLineBadge() {
        if (!IS_TOP_WINDOW) return;
        if (!isKurserCoursePage()) return;

        var courseCode = getKurserCourseCode();
        if (!courseCode) return;

        var titleEl = findKurserCourseTitleElement(courseCode);
        if (!titleEl) return;

        var existing = document.querySelector('[data-dtu-myline-badge]');
        if (!isFeatureFlagEnabled(FEATURE_KURSER_MYLINE_BADGES_KEY)) {
            if (existing) existing.remove();
            return;
        }
        if (existing) {
            var exCourse = String(existing.getAttribute('data-dtu-myline-course') || '').toUpperCase();
            if (exCourse === courseCode) return;
            existing.remove();
        }

        var host = document.createElement('div');
        host.setAttribute('data-dtu-myline-badge', '1');
        host.setAttribute('data-dtu-myline-course', courseCode);
        markExt(host);
        host.style.cssText = 'margin-top:6px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;';

        var status = document.createElement('span');
        markExt(status);
        status.textContent = 'Checking your study line plan...';
        status.style.cssText = 'font-size:12px;opacity:0.65;';
        host.appendChild(status);

        // Place directly under the course title.
        titleEl.insertAdjacentElement('afterend', host);

        getMyLineCurriculum(function (plan) {
            if (!host.isConnected) return;
            while (host.firstChild) host.removeChild(host.firstChild);

            var isDark = darkModeEnabled;

            if (!plan || !plan.ok) {
                // Keep this non-intrusive: only show an enable hint when we couldn't read the plan.
                var hint = document.createElement('span');
                markExt(hint);
                hint.style.cssText = 'font-size:12px;opacity:0.7;';

                if (plan && plan.error === 'not_logged_in') {
                    hint.textContent = 'My line badges: open sdb.dtu.dk/myline while logged in, then reload.';
                } else {
                    var reason = (plan && plan.error) ? String(plan.error) : 'unknown';
                    var extra = '';
                    if (plan && plan.error === 'http' && typeof plan.status === 'number') extra = ' (HTTP ' + plan.status + ')';
                    hint.textContent = 'My line badges unavailable (could not read sdb.dtu.dk/myline).';
                    hint.title = 'Reason: ' + reason + extra + '. If this is your first time, open sdb.dtu.dk/myline once while logged in, then reload the course page.';
                }
                host.appendChild(hint);
                return;
            }

            var kinds = plan.kinds || {};
            var info = kinds[courseCode] || null;
            if (!info || !info.kind) {
                // If the course is not part of the parsed plan, don't show anything.
                host.remove();
                return;
            }

            var pill = buildMyLinePill(info.kind, isDark);
            var titleParts = [];
            if (plan.programTitle) titleParts.push(plan.programTitle);
            if (plan.updatedLabel) titleParts.push('Study plan updated: ' + plan.updatedLabel);
            titleParts.push('Source: sdb.dtu.dk/myline');
            pill.title = titleParts.join('\n');
            host.appendChild(pill);

            if (plan.programTitle) {
                var prog = document.createElement('span');
                markExt(prog);
                prog.textContent = plan.programTitle;
                prog.style.cssText = 'font-size:12px;opacity:0.7;white-space:nowrap;';
                prog.style.setProperty('color', isDark ? '#e0e0e0' : '#222', 'important');
                host.appendChild(prog);
            }
        }, false);
    }

    function insertKurserGradeStats() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_KURSER_GRADE_STATS_KEY)) {
            var existingStats = document.querySelector('[data-dtu-grade-stats]');
            if (existingStats) existingStats.remove();
            _gradeStatsRequested = false;
            _gradeStatsCourseCode = null;
            return;
        }
        if (!isKurserCoursePage()) return;

        var courseCode = getKurserCourseCode();
        if (!courseCode) return;

        var existingStats = document.querySelector('[data-dtu-grade-stats]');
        if (existingStats) {
            var existingCourse = String(existingStats.getAttribute('data-dtu-grade-stats-course') || '').toUpperCase();
            if (existingCourse === courseCode) return;
            existingStats.remove();
            _gradeStatsRequested = false;
        }
        var titleEl = findKurserCourseTitleElement(courseCode);
        if (!titleEl) return;
        var insertAnchor = findKurserGradeStatsInsertAnchor(titleEl);
        if (!insertAnchor || !insertAnchor.parentNode) return;

        var container = document.createElement('div');
        container.setAttribute('data-dtu-grade-stats', '1');
        container.setAttribute('data-dtu-grade-stats-course', courseCode);
        markExt(container);
        container.style.cssText = darkModeEnabled
            ? 'margin: 10px 0 12px 0; padding: 12px 14px; border-radius: 6px; width: 100%; max-width: none; box-sizing: border-box; '
            + 'background-color: #2d2d2d; border: 1px solid #404040; color: #e0e0e0; font-family: inherit;'
            : 'margin: 10px 0 12px 0; padding: 12px 14px; border-radius: 6px; width: 100%; max-width: none; box-sizing: border-box; '
            + 'background-color: #ffffff; border: 1px solid #e0e0e0; color: #222; font-family: inherit;';

        var title = document.createElement('div');
        markExt(title);
        title.textContent = 'Grade Statistics';
        title.style.cssText = 'font-weight: 700; font-size: 14px; margin-bottom: 6px;';
        container.appendChild(title);

        var status = document.createElement('div');
        markExt(status);
        status.textContent = 'Loading grade stats...';
        status.style.cssText = 'font-size: 13px; opacity: 0.9;';
        container.appendChild(status);

        insertAnchor.insertAdjacentElement('afterend', container);

        if (_gradeStatsRequested && _gradeStatsCourseCode === courseCode) return;
        _gradeStatsRequested = true;
        _gradeStatsCourseCode = courseCode;

        sendRuntimeMessage({
            type: 'dtu-grade-stats',
            courseCode: courseCode,
            semesters: buildGradeStatsSemesters()
        }, function (response) {
            var iterations = [];
            if (response && response.ok && Array.isArray(response.iterations) && response.iterations.length) {
                iterations = response.iterations;
            } else if (response && response.ok && response.data) {
                iterations = [{ semester: response.semester || '', data: response.data }];
            }
            if (!iterations.length) {
                status.textContent = 'No Data Available';
                return;
            }

            var latest = iterations[0];
            var data = latest.data || {};
            var semester = latest.semester || '';
            var grades = ['12', '10', '7', '4', '02', '00', '-3'];
            var total = data.total || 0;
            var isPassFail = data.mode === 'pass_fail';

            status.textContent = '';

            var passPct = (data.passRate || 0);
            var passColor = passPct > 85 ? '#4caf50' : (passPct > 70 ? '#ffb300' : '#ef5350');
            var softSurface = darkModeEnabled ? '#252525' : '#f6f8fb';
            var softBorder = darkModeEnabled ? '#3b3b3b' : '#dce2ea';
            var mutedText = darkModeEnabled ? '#bababa' : '#5e6976';

            var layout = document.createElement('div');
            markExt(layout);
            layout.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); '
                + 'gap: 14px; margin-top: 8px; align-items: stretch;';
            container.appendChild(layout);

            var infoCol = document.createElement('div');
            markExt(infoCol);
            infoCol.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
            layout.appendChild(infoCol);

            var summary = document.createElement('div');
            markExt(summary);
            summary.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(125px, 1fr)); '
                + 'gap: 10px; padding: 10px 12px; border-radius: 6px; '
                + 'border: 1px solid ' + softBorder + '; background: ' + softSurface + ';';
            infoCol.appendChild(summary);

            var passWrap = document.createElement('div');
            markExt(passWrap);
            var passLabel = document.createElement('div');
            markExt(passLabel);
            passLabel.textContent = 'Pass Rate';
            passLabel.style.cssText = 'font-size: 11px; letter-spacing: 0.02em; opacity: 0.85;';
            passWrap.appendChild(passLabel);
            var passRate = document.createElement('div');
            markExt(passRate);
            passRate.textContent = passPct.toFixed(1) + '%';
            passRate.style.cssText = 'font-size: 26px; line-height: 1.15; font-weight: 700;';
            passRate.style.setProperty('color', passColor, 'important');
            passWrap.appendChild(passRate);
            summary.appendChild(passWrap);

            var avgWrap = document.createElement('div');
            markExt(avgWrap);
            var avgLabel = document.createElement('div');
            markExt(avgLabel);
            avgLabel.textContent = isPassFail ? 'Assessment' : 'Average Grade';
            avgLabel.style.cssText = 'font-size: 11px; letter-spacing: 0.02em; opacity: 0.85;';
            avgWrap.appendChild(avgLabel);
            var avg = document.createElement('div');
            markExt(avg);
            avg.textContent = isPassFail ? 'Pass/Fail' : ((typeof data.average === 'number' && isFinite(data.average)) ? data.average.toFixed(2) : 'n/a');
            avg.style.cssText = 'font-size: ' + (isPassFail ? '17px' : '21px') + '; line-height: 1.15; font-weight: 650;';
            avgWrap.appendChild(avg);
            summary.appendChild(avgWrap);

            if (semester) {
                var semWrap = document.createElement('div');
                markExt(semWrap);
                var semLabel = document.createElement('div');
                markExt(semLabel);
                semLabel.textContent = 'Latest Offering';
                semLabel.style.cssText = 'font-size: 11px; letter-spacing: 0.02em; opacity: 0.85;';
                semWrap.appendChild(semLabel);

                var sem = document.createElement('div');
                markExt(sem);
                sem.textContent = semester;
                sem.style.cssText = 'font-size: 15px; line-height: 1.15; color: ' + mutedText + ';';
                semWrap.appendChild(sem);
                summary.appendChild(semWrap);
            }

            if (iterations.length > 1) {
                var historyCard = document.createElement('div');
                markExt(historyCard);
                historyCard.style.cssText = 'padding: 10px 12px; border-radius: 6px; '
                    + 'border: 1px solid ' + softBorder + '; background: ' + softSurface + ';';
                infoCol.appendChild(historyCard);

                var historyTitle = document.createElement('div');
                markExt(historyTitle);
                historyTitle.textContent = 'Last 3 offerings';
                historyTitle.style.cssText = 'font-size: 12px; font-weight: 600; margin-bottom: 5px;';
                historyCard.appendChild(historyTitle);

                iterations.slice(0, 3).forEach(function (iter, idx) {
                    if (!iter || !iter.data) return;
                    var iterRow = document.createElement('div');
                    markExt(iterRow);
                    iterRow.style.cssText = 'display: grid; grid-template-columns: minmax(80px, 1fr) auto auto; '
                        + 'gap: 10px; align-items: baseline; padding: 4px 0;'
                        + (idx > 0 ? (' border-top: 1px solid ' + softBorder + ';') : '');

                    var iterSem = document.createElement('span');
                    markExt(iterSem);
                    iterSem.textContent = iter.semester || '';
                    iterSem.style.cssText = 'font-size: 12px; color: ' + mutedText + ';';
                    iterRow.appendChild(iterSem);

                    var iterPassPct = (iter.data.passRate || 0);
                    var iterPass = document.createElement('span');
                    markExt(iterPass);
                    var iterPassColor = iterPassPct > 85 ? '#4caf50' : (iterPassPct > 70 ? '#ffb300' : '#ef5350');
                    iterPass.textContent = 'Pass: ' + iterPassPct.toFixed(1) + '%';
                    iterPass.style.cssText = 'font-size: 12px; font-weight: 700;';
                    iterPass.style.setProperty('color', iterPassColor, 'important');
                    iterRow.appendChild(iterPass);

                    var iterAvg = document.createElement('span');
                    markExt(iterAvg);
                    if (iter.data && iter.data.mode === 'pass_fail') {
                        iterAvg.textContent = 'Scale: Pass/Fail';
                    } else {
                        var iterAverage = (iter.data && typeof iter.data.average === 'number' && isFinite(iter.data.average))
                            ? iter.data.average.toFixed(2)
                            : 'n/a';
                        iterAvg.textContent = 'Avg: ' + iterAverage;
                    }
                    iterAvg.style.cssText = 'font-size: 12px; color: ' + mutedText + ';';
                    iterRow.appendChild(iterAvg);

                    historyCard.appendChild(iterRow);
                });
            }

            var chartCard = document.createElement('div');
            markExt(chartCard);
            chartCard.style.cssText = 'display: flex; flex-direction: column; '
                + 'padding: 10px 12px; border-radius: 6px; border: 1px solid ' + softBorder + '; '
                + 'background: ' + softSurface + ';';
            layout.appendChild(chartCard);

            var chartHeader = document.createElement('div');
            markExt(chartHeader);
            chartHeader.style.cssText = 'display: flex; justify-content: space-between; gap: 8px; align-items: baseline;';
            chartCard.appendChild(chartHeader);

            var chartTitle = document.createElement('div');
            markExt(chartTitle);
            chartTitle.textContent = isPassFail ? 'Result Distribution' : 'Grade Distribution';
            chartTitle.style.cssText = 'font-size: 12px; font-weight: 600;';
            chartHeader.appendChild(chartTitle);

            var chartMetaWrap = document.createElement('div');
            markExt(chartMetaWrap);
            chartMetaWrap.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; text-align: right;';
            chartMetaWrap.title = 'This count is for the latest offering only, not summed across multiple offerings.';

            var chartMeta = document.createElement('div');
            markExt(chartMeta);
            chartMeta.textContent = total + ' students';
            chartMeta.style.cssText = 'font-size: 11px; color: ' + mutedText + ';';
            chartMetaWrap.appendChild(chartMeta);

            var chartMetaScope = document.createElement('div');
            markExt(chartMetaScope);
            chartMetaScope.textContent = semester ? (semester + ' only (not summed)') : 'Latest offering only (not summed)';
            chartMetaScope.style.cssText = 'font-size: 10px; color: ' + mutedText + '; opacity: 0.9;';
            chartMetaWrap.appendChild(chartMetaScope);

            chartHeader.appendChild(chartMetaWrap);

            var chart = document.createElement('div');
            markExt(chart);
            chart.style.cssText = 'display: flex; align-items: flex-end; gap: 10px; height: 128px; margin-top: 8px;';

            var series = [];
            if (isPassFail) {
                var pf = data.passFailCounts || {};
                series = [
                    { key: 'pass', label: 'Pass', count: pf.passed || 0, color: '#66bb6a' },
                    { key: 'fail', label: 'Fail', count: pf.failed || 0, color: '#ef5350' },
                    { key: 'noshow', label: 'No-show', count: pf.noShow || 0, color: darkModeEnabled ? '#90a4ae' : '#607d8b' }
                ];
            } else {
                series = grades.map(function (g) {
                    var isPass = (g === '02' || g === '4' || g === '7' || g === '10' || g === '12');
                    return {
                        key: g,
                        label: g,
                        count: data.counts && data.counts[g] ? data.counts[g] : 0,
                        color: isPass ? '#66b3ff' : '#ef5350'
                    };
                });
            }

            var maxCount = 0;
            series.forEach(function (s) {
                var c = s.count || 0;
                if (c > maxCount) maxCount = c;
            });

            series.forEach(function (s) {
                var count = s.count || 0;
                var height = maxCount ? Math.round((count / maxCount) * 88) : 0;
                if (count > 0 && height < 4) height = 4;

                var wrap = document.createElement('div');
                markExt(wrap);
                wrap.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1 1 0; min-width: 30px;';

                var countLabel = document.createElement('div');
                markExt(countLabel);
                countLabel.textContent = String(count);
                countLabel.style.cssText = 'font-size: 11px; color: ' + mutedText + '; min-height: 14px;';
                wrap.appendChild(countLabel);

                var barTrack = document.createElement('div');
                markExt(barTrack);
                barTrack.style.cssText = 'height: 90px; width: 100%; display: flex; align-items: flex-end;';

                var bar = document.createElement('div');
                markExt(bar);
                var barColor = s.color;
                bar.style.cssText = 'width: 100%; height: ' + height + 'px; border-radius: 4px;';
                bar.style.setProperty('background', barColor, 'important');
                bar.style.setProperty('background-color', barColor, 'important');
                if (height === 0) {
                    bar.style.setProperty('background', 'transparent', 'important');
                    bar.style.setProperty('background-color', 'transparent', 'important');
                    bar.style.border = darkModeEnabled ? '1px solid #555' : '1px solid #c4c9cf';
                }
                bar.title = s.label + ': ' + count + ' students';

                barTrack.appendChild(bar);
                wrap.appendChild(barTrack);

                var label = document.createElement('div');
                markExt(label);
                label.textContent = s.label;
                label.style.cssText = 'font-size: 11px; opacity: 0.9;';

                wrap.appendChild(label);
                chart.appendChild(wrap);
            });

            chartCard.appendChild(chart);
        });
    }

    // ===== COURSE EVALUATION (kurser.dtu.dk, from evaluering.dtu.dk) =====
    var _courseEvalRequested = false;
    var _courseEvalCourseCode = null;
    var _courseEvalRetryTimer = null;

    function insertKurserCourseEvaluation() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_KURSER_COURSE_EVAL_KEY)) {
            var existingEval = document.querySelector('[data-dtu-course-eval]');
            if (existingEval) existingEval.remove();
            _courseEvalRequested = false;
            _courseEvalCourseCode = null;
            return;
        }
        if (!isKurserCoursePage()) return;

        var courseCode = getKurserCourseCode();
        if (!courseCode) return;

        var container = null;
        var status = null;

        var existingEval = document.querySelector('[data-dtu-course-eval]');
        if (existingEval) {
            var existingCourse = String(existingEval.getAttribute('data-dtu-course-eval-code') || '').toUpperCase();
            if (existingCourse === courseCode) {
                container = existingEval;
                if (container.getAttribute('data-dtu-course-eval-loaded') === '1') return;
                status = container.querySelector('[data-dtu-course-eval-status]');
                if (!status) {
                    var divs = container.querySelectorAll('div');
                    if (divs && divs.length) status = divs[divs.length - 1];
                }
            } else {
                existingEval.remove();
                _courseEvalRequested = false;
                _courseEvalCourseCode = null;
            }
        }

        var baseStyle = darkModeEnabled
            ? 'margin: 10px 0 12px 0; padding: 12px 14px; border-radius: 6px; width: 100%; max-width: none; box-sizing: border-box; '
            + 'background-color: #2d2d2d; border: 1px solid #404040; color: #e0e0e0; font-family: inherit;'
            : 'margin: 10px 0 12px 0; padding: 12px 14px; border-radius: 6px; width: 100%; max-width: none; box-sizing: border-box; '
            + 'background-color: #ffffff; border: 1px solid #e0e0e0; color: #222; font-family: inherit;';

        if (!container) {
            // Find insert anchor: after grade stats panel if it exists, else after title
            var gradeStats = document.querySelector('[data-dtu-grade-stats]');
            var insertAnchor = gradeStats;
            if (!insertAnchor) {
                var titleEl = findKurserCourseTitleElement(courseCode);
                insertAnchor = titleEl ? findKurserGradeStatsInsertAnchor(titleEl) : null;
            }
            if (!insertAnchor || !insertAnchor.parentNode) return;

            container = document.createElement('div');
            container.setAttribute('data-dtu-course-eval', '1');
            container.setAttribute('data-dtu-course-eval-code', courseCode);
            markExt(container);
            container.style.cssText = baseStyle;

            var title = document.createElement('div');
            markExt(title);
            title.textContent = 'Course Evaluation';
            title.style.cssText = 'font-weight: 700; font-size: 14px; margin-bottom: 6px;';
            container.appendChild(title);

            status = document.createElement('div');
            markExt(status);
            status.setAttribute('data-dtu-course-eval-status', '1');
            status.textContent = 'Loading evaluation data...';
            status.style.cssText = 'font-size: 13px; opacity: 0.9;';
            container.appendChild(status);

            insertAnchor.insertAdjacentElement('afterend', container);
        } else {
            // Best-effort: keep the loading panel readable if the user toggles dark mode.
            container.style.cssText = baseStyle;
            if (!status || !status.parentNode) {
                status = document.createElement('div');
                container.appendChild(status);
            }
            markExt(status);
            status.setAttribute('data-dtu-course-eval-status', '1');
        }

        var nextTryAt = parseInt(container.getAttribute('data-dtu-course-eval-nexttry') || '0', 10) || 0;
        if (nextTryAt && Date.now() < nextTryAt) return;
        if (nextTryAt) container.removeAttribute('data-dtu-course-eval-nexttry');

        if (_courseEvalRequested && _courseEvalCourseCode === courseCode) return;
        _courseEvalRequested = true;
        _courseEvalCourseCode = courseCode;

        status.textContent = 'Loading evaluation data...';

        function scheduleCourseEvalRetry(ms) {
            _courseEvalRequested = false;
            var delay = ms || 5000;
            try { container.setAttribute('data-dtu-course-eval-nexttry', String(Date.now() + delay)); } catch (e) { }

            // startHostFeatureBootstrap() stops once the container exists, so ensure we retry even if the page becomes static.
            try {
                if (_courseEvalRetryTimer) clearTimeout(_courseEvalRetryTimer);
                _courseEvalRetryTimer = setTimeout(function () {
                    _courseEvalRetryTimer = null;
                    try { insertKurserCourseEvaluation(); } catch (e) { }
                }, delay + 30);
            } catch (e) {
                // ignore
            }
        }

        function fetchAndRenderEvaluation(latestEvalUrl, latestEvalLabel) {
            if (!latestEvalUrl) {
                status.textContent = 'No evaluations available';
                scheduleCourseEvalRetry(8000);
                return;
            }

            // Step 2: Fetch the evaluation page via background.js
            sendRuntimeMessage({
                type: 'dtu-course-evaluation',
                url: latestEvalUrl
            }, function (response) {
                if (!response || !response.ok || !response.data) {
                    var reason = (response && response.error) ? response.error : 'unknown';
                    status.textContent = 'No evaluation data available';
                    console.log('[DTU After Dark] Course eval: background fetch failed', reason, response);
                    scheduleCourseEvalRetry(12000);
                    return;
                }
                container.setAttribute('data-dtu-course-eval-loaded', '1');
                renderCourseEvaluationPanel(container, response.data, latestEvalUrl, latestEvalLabel);
            });
        }

        // Fast path: many kurser pages already have the evaluation links in the DOM (sometimes injected after load).
        // Prefer reading from the current DOM before fetching /info.
        try {
            var domLinks = [];
            var sel = 'a[href*="evaluering.dtu.dk/kursus/"], a[href^=\"//evaluering.dtu.dk/kursus/\"], a[href^=\"evaluering.dtu.dk/kursus/\"]';
            var anchors = document.querySelectorAll(sel);
            for (var i = 0; i < anchors.length; i++) {
                var a = anchors[i];
                if (!a || !a.getAttribute) continue;
                var href = String(a.getAttribute('href') || '').trim();
                if (!href) continue;
                if (/^\/\//.test(href)) href = 'https:' + href;
                if (/^evaluering\.dtu\.dk\//i.test(href)) href = 'https://' + href;
                if (!/\/kursus\//i.test(href)) continue;
                if (href.toUpperCase().indexOf('/KURSUS/' + courseCode + '/') === -1) continue;
                var m = href.match(/\/kursus\/\d+\/(\d+)(?:[/?#]|$)/i);
                var id = m ? (parseInt(m[1], 10) || 0) : 0;
                domLinks.push({
                    url: href,
                    text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
                    id: id
                });
            }

            if (domLinks.length) {
                domLinks.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
                var bestDom = domLinks[0];
                console.log('[DTU After Dark] Course eval: found eval URL in DOM', bestDom.url);
                fetchAndRenderEvaluation(bestDom.url, bestDom.text || 'Evaluation results');
                return;
            }
        } catch (e) {
            // ignore and fall back to /info fetch below
        }

        // Step 1: Fetch the /info page (same origin, public -- no cookies needed)
        // IMPORTANT: use credentials:'omit' to avoid ASP.NET session lock conflicts
        // that can crash the main page when fetched concurrently during page load.
        var courseBasePath = null;
        try {
            // Preserve optional year segment in the URL, e.g. /course/2025-2026/22050
            var baseMatch = window.location.pathname.match(/\/course\/(?:\d{4}-\d{4}\/)?[A-Za-z0-9]+/i);
            courseBasePath = (baseMatch && baseMatch[0]) ? baseMatch[0] : null;
        } catch (e) {
            courseBasePath = null;
        }
        if (!courseBasePath) {
            courseBasePath = '/course/' + encodeURIComponent(courseCode);
        }
        var infoUrl = window.location.origin + courseBasePath + '/info';

        // kurser.dtu.dk sometimes returns a short stub response without cookies/session established.
        // Try an anonymous fetch first (to avoid session-lock server crashes), then fall back to a
        // cookie-bearing fetch only if the response looks suspiciously small.
        var infoFetchCreds = 'omit';
        try {
            infoFetchCreds = String(container.getAttribute('data-dtu-course-eval-info-cred') || 'omit');
        } catch (e) {
            infoFetchCreds = 'omit';
        }

        if (infoFetchCreds !== 'omit' && document.readyState !== 'complete') {
            status.textContent = 'Waiting for page to finish loading...';
            scheduleCourseEvalRetry(900);
            return;
        }

        var infoFetchOpts = { credentials: infoFetchCreds, cache: 'no-store' };
        try { infoFetchOpts.headers = { 'Accept': 'text/html' }; } catch (e) { }

        fetch(infoUrl, infoFetchOpts)
            .then(function (res) {
                if (!res.ok) throw new Error('info_http_' + res.status);
                return res.text();
            })
            .then(function (infoHtml) {
                // Parse evaluation links from the info page.
                // DTU has changed the kurser.dtu.dk markup before, so keep this robust.
                function normalizeEvalHref(href) {
                    href = String(href || '').trim();
                    if (!href) return null;

                    // Decode the most common entity in href attributes.
                    href = href.replace(/&amp;/gi, '&');

                    // Protocol-relative URL: //evaluering.dtu.dk/...
                    if (/^\/\//.test(href)) href = 'https:' + href;

                    // Absolute URL.
                    if (/^https?:\/\//i.test(href)) {
                        if (!/\/\/evaluering\.dtu\.dk(\/|$)/i.test(href)) return null;
                        return href;
                    }

                    // Missing scheme.
                    if (/^evaluering\.dtu\.dk(\/|$)/i.test(href)) return 'https://' + href;

                    // Rare fallback: relative evaluering URL pasted without host.
                    if (/^\/kursus\/\d+/i.test(href)) return 'https://evaluering.dtu.dk' + href;

                    return null;
                }

                function pushEvalLink(url, text) {
                    if (!url) return;
                    var cleanText = String(text || '').replace(/\s+/g, ' ').trim();
                    if (!cleanText) cleanText = 'Evaluation results';
                    evalLinks.push({ url: url, text: cleanText });
                }

                var evalLinks = [];

                // Prefer DOM parsing (more robust than regex).
                try {
                    if (typeof DOMParser !== 'undefined') {
                        var doc = new DOMParser().parseFromString(infoHtml, 'text/html');
                        var anchors = (doc && doc.querySelectorAll) ? doc.querySelectorAll('a[href]') : [];
                        for (var i = 0; i < anchors.length; i++) {
                            var a = anchors[i];
                            if (!a || !a.getAttribute) continue;
                            var url = normalizeEvalHref(a.getAttribute('href'));
                            if (!url) continue;
                            pushEvalLink(url, a.textContent || '');
                        }
                    }
                } catch (e) {
                    // Ignore and fall back to regex parsing below.
                }

                // Regex fallback: scan anchors for evaluering.dtu.dk links.
                if (!evalLinks.length) {
                    var evalLinkRegex = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
                    var linkMatch;
                    while ((linkMatch = evalLinkRegex.exec(infoHtml)) !== null) {
                        var url = normalizeEvalHref(linkMatch[1]);
                        if (!url) continue;
                        var text = String(linkMatch[2] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                        pushEvalLink(url, text);
                    }
                }

                // Last-resort: scrape any URLs that look like evaluering links.
                if (!evalLinks.length) {
                    var urlRegex = /(https?:\/\/evaluering\.dtu\.dk\/[^\s"'<>]+|\/\/evaluering\.dtu\.dk\/[^\s"'<>]+)/gi;
                    var urlMatch;
                    while ((urlMatch = urlRegex.exec(infoHtml)) !== null) {
                        var url = normalizeEvalHref(urlMatch[1]);
                        if (!url) continue;
                        pushEvalLink(url, '');
                    }
                }

                // De-dupe URLs (info page can repeat the same link).
                if (evalLinks.length > 1) {
                    var seen = {};
                    var uniq = [];
                    for (var i = 0; i < evalLinks.length; i++) {
                        var u = evalLinks[i] && evalLinks[i].url;
                        if (!u || seen[u]) continue;
                        seen[u] = 1;
                        uniq.push(evalLinks[i]);
                    }
                    evalLinks = uniq;
                }

                // Pick the most recent evaluation when possible (highest numeric ID).
                var bestEval = null;
                var bestId = -1;
                for (var i = 0; i < evalLinks.length; i++) {
                    var m = String(evalLinks[i].url || '').match(/\/kursus\/\d+\/(\d+)(?:[/?#]|$)/i);
                    var id = m ? (parseInt(m[1], 10) || 0) : 0;
                    if (!bestEval || id > bestId) {
                        bestEval = evalLinks[i];
                        bestId = id;
                    }
                }

                if (!bestEval) {
                    var htmlLen = infoHtml ? infoHtml.length : 0;
                    var looksSuspicious = htmlLen > 0 && htmlLen < 1500;

                    // If the anonymous fetch returned a tiny response, retry once with cookies after the page is loaded.
                    if (infoFetchCreds === 'omit' && looksSuspicious && !container.getAttribute('data-dtu-course-eval-cookie-tried')) {
                        container.setAttribute('data-dtu-course-eval-cookie-tried', '1');
                        container.setAttribute('data-dtu-course-eval-info-cred', 'same-origin');
                        status.textContent = 'Loading evaluation data...';
                        console.log('[DTU After Dark] Course eval: /info response looked suspicious (len:', htmlLen, ') - retrying with cookies after load for', courseCode);
                        scheduleCourseEvalRetry(document.readyState === 'complete' ? 1600 : 2600);
                        return;
                    }

                    status.textContent = 'No evaluations available';
                    console.log('[DTU After Dark] Course eval: no eval links found in /info page for', courseCode, '(html length:', htmlLen, ', creds:', infoFetchCreds, ')');
                    if (looksSuspicious) scheduleCourseEvalRetry(8000);
                    return;
                }

                // Use the most recent evaluation link (when determinable).
                var latestEvalUrl = bestEval.url;
                var latestEvalLabel = bestEval.text;
                console.log('[DTU After Dark] Course eval: found eval URL', latestEvalUrl);
                try { container.removeAttribute('data-dtu-course-eval-info-cred'); } catch (e) { }
                fetchAndRenderEvaluation(latestEvalUrl, latestEvalLabel);
            })
            .catch(function (err) {
                status.textContent = 'Could not load evaluation data';
                console.log('[DTU After Dark] Course eval error:', err && err.message || err);
                scheduleCourseEvalRetry(8000);
            });
    }

    function renderCourseEvaluationPanel(container, data, evalUrl, evalLabel) {
        // Clear loading status
        container.innerHTML = '';
        markExt(container);

        var softSurface = darkModeEnabled ? '#252525' : '#f6f8fb';
        var softBorder = darkModeEnabled ? '#3b3b3b' : '#dce2ea';
        var mutedText = darkModeEnabled ? '#bababa' : '#5e6976';
        var accentColor = darkModeEnabled ? '#e0e0e0' : '#222';

        function normalizeEvalQuestionNumber(n) {
            return String(n || '').trim().replace(/[.:]+$/, '');
        }

        // Default evaluation satisfaction schema on evaluering.dtu.dk uses 1.1-1.5.
        // Prefer those for the summary to avoid mixing in extra 1.x questions that vary by course.
        var EVAL_SATISFACTION_KEYS = ['1.1', '1.2', '1.3', '1.4', '1.5'];
        var satisfactionQuestions = [];
        if (data && Array.isArray(data.questions) && data.questions.length) {
            var byKey = {};
            data.questions.forEach(function (q) {
                if (!q) return;
                var key = normalizeEvalQuestionNumber(q.number);
                if (EVAL_SATISFACTION_KEYS.indexOf(key) === -1) return;
                byKey[key] = {
                    number: key,
                    text: q.text || '',
                    options: q.options || [],
                    totalResponses: q.totalResponses || 0,
                    average: Number(q.average) || 0
                };
            });
            EVAL_SATISFACTION_KEYS.forEach(function (key) {
                if (byKey[key]) satisfactionQuestions.push(byKey[key]);
            });
        }

        // --- Header row ---
        var headerRow = document.createElement('div');
        markExt(headerRow);
        headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;';

        var titleEl = document.createElement('div');
        markExt(titleEl);
        titleEl.textContent = 'Course Evaluation';
        titleEl.style.cssText = 'font-weight: 700; font-size: 14px;';
        headerRow.appendChild(titleEl);

        var periodChip = document.createElement('span');
        markExt(periodChip);
        periodChip.textContent = data.period || '';
        periodChip.style.cssText = 'font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; '
            + 'background: ' + (darkModeEnabled ? 'rgba(var(--dtu-ad-accent-deep-rgb),0.25)' : 'rgba(var(--dtu-ad-accent-deep-rgb),0.1)') + '; '
            + 'color: ' + (darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)') + ';';
        headerRow.appendChild(periodChip);

        container.appendChild(headerRow);

        // --- Response rate summary ---
        var summaryCard = document.createElement('div');
        markExt(summaryCard);
        summaryCard.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); '
            + 'gap: 10px; padding: 10px 12px; border-radius: 6px; margin-bottom: 10px; '
            + 'border: 1px solid ' + softBorder + '; background: ' + softSurface + ';';

        // Response rate
        var rrWrap = document.createElement('div');
        markExt(rrWrap);
        var rrLabel = document.createElement('div');
        markExt(rrLabel);
        rrLabel.textContent = 'Response Rate';
        rrLabel.style.cssText = 'font-size: 11px; letter-spacing: 0.02em; opacity: 0.85;';
        rrWrap.appendChild(rrLabel);
        var rrValue = document.createElement('div');
        markExt(rrValue);
        rrValue.textContent = data.responseRate.toFixed(1) + '%';
        rrValue.style.cssText = 'font-size: 22px; line-height: 1.15; font-weight: 700;';
        var rrColor = data.responseRate > 50 ? '#4caf50' : (data.responseRate > 30 ? '#ffb300' : '#ef5350');
        rrValue.style.setProperty('color', rrColor, 'important');
        rrWrap.appendChild(rrValue);
        summaryCard.appendChild(rrWrap);

        // Respondents
        var respWrap = document.createElement('div');
        markExt(respWrap);
        var respLabel = document.createElement('div');
        markExt(respLabel);
        respLabel.textContent = 'Respondents';
        respLabel.style.cssText = 'font-size: 11px; letter-spacing: 0.02em; opacity: 0.85;';
        respWrap.appendChild(respLabel);
        var respValue = document.createElement('div');
        markExt(respValue);
        respValue.textContent = data.respondents + ' / ' + data.eligible;
        respValue.style.cssText = 'font-size: 15px; line-height: 1.15; color: ' + mutedText + ';';
        respWrap.appendChild(respValue);
        summaryCard.appendChild(respWrap);

        // Overall average (of questions 1.1-1.5)
        var overallQuestions = satisfactionQuestions.length ? satisfactionQuestions : (data.questions || []);
        if (overallQuestions && overallQuestions.length) {
            var overallSum = 0;
            var overallCount = 0;
            overallQuestions.forEach(function (q) {
                if (q.average > 0) {
                    overallSum += q.average;
                    overallCount++;
                }
            });
            if (overallCount > 0) {
                var overallAvg = overallSum / overallCount;
                var avgWrap = document.createElement('div');
                markExt(avgWrap);
                var avgLabel = document.createElement('div');
                markExt(avgLabel);
                avgLabel.textContent = 'Overall';
                avgLabel.style.cssText = 'font-size: 11px; letter-spacing: 0.02em; opacity: 0.85;';
                avgWrap.appendChild(avgLabel);
                var avgValue = document.createElement('div');
                markExt(avgValue);
                avgValue.textContent = overallAvg.toFixed(2) + ' / 5';
                avgValue.style.cssText = 'font-size: 22px; line-height: 1.15; font-weight: 700;';
                var avgColor = overallAvg >= 4 ? '#4caf50' : (overallAvg >= 3 ? '#ffb300' : '#ef5350');
                avgValue.style.setProperty('color', avgColor, 'important');
                avgWrap.appendChild(avgValue);
                summaryCard.appendChild(avgWrap);
            }
        }

        container.appendChild(summaryCard);

        // --- Question breakdown bars ---
        var QUESTION_SHORT_LABELS = {
            '1.1': 'Learned a lot',
            '1.2': 'Aligns with objectives',
            '1.3': 'Motivating',
            '1.4': 'Feedback opportunity',
            '1.5': 'Clear expectations'
        };

        var questionsForUi = satisfactionQuestions.length ? satisfactionQuestions : (data.questions || []);
        if (questionsForUi && questionsForUi.length) {
            var questionsCard = document.createElement('div');
            markExt(questionsCard);
            questionsCard.style.cssText = 'padding: 10px 12px; border-radius: 6px; margin-bottom: 10px; '
                + 'border: 1px solid ' + softBorder + '; background: ' + softSurface + ';';

            var qTitle = document.createElement('div');
            markExt(qTitle);
            qTitle.textContent = 'Student Satisfaction';
            qTitle.style.cssText = 'font-size: 12px; font-weight: 600; margin-bottom: 8px;';
            questionsCard.appendChild(qTitle);

            questionsForUi.forEach(function (q, idx) {
                var row = document.createElement('div');
                markExt(row);
                row.style.cssText = 'display: grid; grid-template-columns: minmax(130px, 1fr) 1fr auto; gap: 8px; align-items: center; padding: 4px 0;'
                    + (idx > 0 ? (' border-top: 1px solid ' + softBorder + ';') : '');

                // Label
                var label = document.createElement('div');
                markExt(label);
                var qNum = normalizeEvalQuestionNumber(q.number);
                label.textContent = QUESTION_SHORT_LABELS[qNum] || qNum;
                label.style.cssText = 'font-size: 12px; color: ' + mutedText + ';';
                label.title = q.text;
                row.appendChild(label);

                // Bar
                var barWrap = document.createElement('div');
                markExt(barWrap);
                barWrap.style.cssText = 'height: 8px; border-radius: 4px; overflow: hidden; '
                    + 'background: ' + (darkModeEnabled ? '#1a1a1a' : '#e8e8e8') + ';';
                var bar = document.createElement('div');
                markExt(bar);
                var pct = q.average > 0 ? ((q.average / 5) * 100) : 0;
                var barColor = q.average >= 4 ? '#4caf50' : (q.average >= 3 ? '#ffb300' : '#ef5350');
                bar.style.cssText = 'height: 100%; border-radius: 4px; width: ' + pct.toFixed(1) + '%;';
                bar.style.setProperty('background', barColor, 'important');
                barWrap.appendChild(bar);
                row.appendChild(barWrap);

                // Score
                var score = document.createElement('div');
                markExt(score);
                score.textContent = q.average.toFixed(2);
                score.style.cssText = 'font-size: 12px; font-weight: 700; min-width: 32px; text-align: right;';
                score.style.setProperty('color', barColor, 'important');
                row.appendChild(score);

                questionsCard.appendChild(row);
            });

            container.appendChild(questionsCard);
        }

        // --- Workload section (gauge meter) ---
        if (data.workload && data.workload.options && data.workload.options.length) {
            var workloadCard = document.createElement('div');
            markExt(workloadCard);
            workloadCard.style.cssText = 'padding: 10px 12px; border-radius: 6px; margin-bottom: 8px; '
                + 'border: 1px solid ' + softBorder + '; background: ' + softSurface + ';';

            var wTitle = document.createElement('div');
            markExt(wTitle);
            wTitle.textContent = 'Workload';
            wTitle.style.cssText = 'font-size: 12px; font-weight: 600; margin-bottom: 8px;';
            workloadCard.appendChild(wTitle);

            // Compute weighted average position (1-5 scale, map to 0-100%)
            var wAvg = data.workload.average || 3;
            var gaugePos = ((wAvg - 1) / 4) * 100; // 1->0%, 3->50%, 5->100%
            var gaugeLabel = wAvg <= 1.5 ? 'Much less' : wAvg <= 2.5 ? 'Less' : wAvg <= 3.5 ? 'As expected' : wAvg <= 4.5 ? 'More' : 'Much more';
            var gaugeColor = wAvg <= 2.5 ? '#66bb6a' : wAvg <= 3.5 ? '#90a4ae' : wAvg <= 4.25 ? '#ffb74d' : '#ef5350';

            // Scale labels row
            var scaleLabels = document.createElement('div');
            markExt(scaleLabels);
            scaleLabels.style.cssText = 'display: flex; justify-content: space-between; font-size: 10px; color: ' + mutedText + '; margin-bottom: 4px;';
            ['Much less', 'Less', 'As expected', 'More', 'Much more'].forEach(function (lbl) {
                var sp = document.createElement('span');
                sp.textContent = lbl;
                scaleLabels.appendChild(sp);
            });
            workloadCard.appendChild(scaleLabels);

            // Gradient track
            var track = document.createElement('div');
            markExt(track);
            track.style.cssText = 'position: relative; height: 10px; border-radius: 5px; overflow: visible; '
                + 'background: linear-gradient(to right, #66bb6a, #a5d6a7 25%, #90a4ae 50%, #ffb74d 75%, #ef5350);';
            // Marker
            var marker = document.createElement('div');
            markExt(marker);
            marker.style.cssText = 'position: absolute; top: -3px; width: 16px; height: 16px; border-radius: 50%; '
                + 'border: 2px solid ' + (darkModeEnabled ? '#e0e0e0' : '#333') + '; '
                + 'transform: translateX(-50%); box-shadow: 0 1px 3px rgba(0,0,0,0.3);';
            marker.style.left = gaugePos.toFixed(1) + '%';
            marker.style.setProperty('background', gaugeColor, 'important');
            track.appendChild(marker);
            workloadCard.appendChild(track);

            // Value label below
            var valLabel = document.createElement('div');
            markExt(valLabel);
            valLabel.style.cssText = 'text-align: center; margin-top: 8px; font-size: 13px; font-weight: 600;';
            valLabel.style.setProperty('color', gaugeColor, 'important');
            valLabel.textContent = gaugeLabel + ' (' + wAvg.toFixed(2) + ' / 5)';
            workloadCard.appendChild(valLabel);

            container.appendChild(workloadCard);
        }

        // --- Footer with source link ---
        var footer = document.createElement('div');
        markExt(footer);
        footer.style.cssText = 'font-size: 11px; color: ' + mutedText + '; display: flex; justify-content: space-between; align-items: center;';
        var sourceLink = document.createElement('a');
        sourceLink.href = evalUrl;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = 'View full evaluation';
        sourceLink.style.cssText = 'color: ' + (darkModeEnabled ? '#66b3ff' : '#1565c0') + '; text-decoration: none;';
        footer.appendChild(sourceLink);
        var respNote = document.createElement('span');
        respNote.textContent = data.respondents + ' responses';
        footer.appendChild(respNote);
        container.appendChild(footer);
    }

    /* ===================================================================
     *  Smart Room Linker (MazeMap)
     *  Detects building/room mentions site-wide and turns them into MazeMap
     *  links. IDs are resolved lazily on click via background fetch.
     * =================================================================== */

    var MAZEMAP_CAMPUS_ID = 89; // DTU Lyngby
    var _smartRoomLinkerTimer = null;
    var _smartRoomLinkerPendingRoot = null;
    var _smartRoomLinkerLastScanTs = 0;
    var _smartRoomLinkerDidFullScan = false;
    var _smartRoomLinkerTooltipEl = null;
    var _smartRoomLinkerScannedShadowRoots = new WeakSet();
    var _smartRoomLinkerHtmlBlockProbeTimer = null;
    var _smartRoomLinkerShadowSweepTimer = null;
    var _smartRoomLinkerGlobalClickBound = false;

    var _mazemapResolveCache = {}; // key -> { ok, poiId, identifier, kind, ts }
    var MAZEMAP_RESOLVE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

    function shouldRunSmartRoomLinkerInThisWindow() {
        if (!isFeatureFlagEnabled(FEATURE_SMART_ROOM_LINKER_KEY)) return false;
        if (!isSmartRoomLinkerAllowedOnHost()) return false;
        if (IS_TOP_WINDOW) return true;
        // DTU Learn Content uses same-origin iframes (smart-curriculum). Enable there too.
        return window.location.hostname === 'learn.inside.dtu.dk';
    }

    function normalizeMazemapBuilding(building) {
        return String(building || '').trim().toUpperCase();
    }

    function normalizeMazemapRoom(room) {
        return String(room || '').trim().toUpperCase();
    }

    function buildMazemapSharePoiUrl(poiId) {
        // Best UX: opens POI directly without forcing directions mode.
        return 'https://use.mazemap.com/#v=1&campusid=' + MAZEMAP_CAMPUS_ID
            + '&sharepoitype=poi&sharepoi=' + encodeURIComponent(String(poiId));
    }

    function buildMazemapSearchUrl(query) {
        // Fallback: opens MazeMap with the search filled in (user can pick result).
        return 'https://use.mazemap.com/#v=1&campusid=' + MAZEMAP_CAMPUS_ID
            + '&search=' + encodeURIComponent(String(query || '').trim());
    }

    function getMazemapInlineLinkStyleString() {
        var isDark = darkModeEnabled;
        var color = isDark ? '#5cafff' : '#1565c0';
        var border = isDark ? 'rgba(92,175,255,0.75)' : 'rgba(21,101,192,0.55)';
        return ''
            + 'color:' + color + ' !important;'
            + 'text-decoration:none !important;'
            + 'border-bottom:1px dotted ' + border + ' !important;'
            + 'padding:0 2px;'
            + 'border-radius:4px;'
            + 'cursor:pointer;';
    }

    function parseBuildingRoomFromTextOrQuery(s) {
        var t = String(s || '');
        if (!t) return null;

        // Common: "308-012" / "308.012" / "B325.047" / "B116-A081"
        var m = t.match(/\bB?\s*([0-9]{3}[A-Za-z]?)\s*[.\-]\s*([A-Za-z]?\s*[0-9]{1,4}\s*[A-Za-z]?)\b/i);
        if (m) {
            // Avoid obvious false-positives like "(227.91 KB)"
            var tail = t.slice((m.index || 0) + m[0].length);
            var r0 = String((m[2] || '').replace(/\s+/g, ''));
            if (/^\s*(?:KB|MB|GB|TB)\b/i.test(tail)) return null;
            if (m[0].indexOf('.') !== -1 && /^[0-9]+$/.test(r0) && r0.length <= 2) return null;
            return {
                building: normalizeMazemapBuilding(m[1]),
                room: normalizeMazemapRoom(r0)
            };
        }

        // Brightspace content often uses: "B.308/aud 12" or "B.308/101"
        m = t.match(/\bB\s*[.\s]*([0-9]{3}[A-Za-z]?)\s*\/\s*(?:aud(?:itorium)?\.?\s*)?([0-9]{1,4}[A-Za-z]?)\b/i);
        if (m) {
            return {
                building: normalizeMazemapBuilding(m[1]),
                room: normalizeMazemapRoom((m[2] || '').replace(/\s+/g, ''))
            };
        }

        // "Building 220, Room 110D" / "Bygning 220"
        m = t.match(/\b(?:Building|Bygning)\s*([0-9]{3}[A-Za-z]?)\b/i);
        if (m) {
            var b = normalizeMazemapBuilding(m[1]);
            // Try to find a room after this match.
            var rest = t.slice((m.index || 0) + m[0].length);
            var rMatch = rest.match(/\b(?:Room|Lokale|Lok\.?|Rum|R|Auditorium|Aud\.?|AUD|SA)\s*([A-Za-z]?\s*[0-9]{1,4}\s*[A-Za-z]?)\b/i);
            return {
                building: b,
                room: rMatch ? normalizeMazemapRoom((rMatch[1] || '').replace(/\s+/g, '')) : ''
            };
        }

        return null;
    }

    function ensureMazemapGlobalClickHandler() {
        if (_smartRoomLinkerGlobalClickBound) return;
        _smartRoomLinkerGlobalClickBound = true;

        document.addEventListener('click', function (ev) {
            try {
                if (!isFeatureFlagEnabled(FEATURE_SMART_ROOM_LINKER_KEY)) return;
                var a = null;
                var t = ev && ev.target ? ev.target : null;
                if (t && t.nodeType === 3) t = t.parentElement;
                if (t && t.closest) a = t.closest('[data-dtu-mazemap-link]');

                // Shadow DOM retargeting: clicks inside d2l-html-block's shadow root will not
                // have the link as `event.target` outside the shadow. Use composedPath when available.
                if (!a && ev && typeof ev.composedPath === 'function') {
                    var path = ev.composedPath() || [];
                    for (var i = 0; i < path.length; i++) {
                        var el = path[i];
                        if (!el || el.nodeType !== 1 || !el.getAttribute) continue;
                        if (el.getAttribute('data-dtu-mazemap-link') === '1') {
                            a = el;
                            break;
                        }
                    }
                }
                if (!a) return;
                if (a.getAttribute('data-dtu-mazemap-bound') === '1') return;

                ev.preventDefault();

                var b = a.getAttribute('data-dtu-mazemap-building') || '';
                var r = a.getAttribute('data-dtu-mazemap-room') || '';

                // If sanitized, infer from href/search or text.
                if (!b) {
                    var href = a.getAttribute('href') || '';
                    var parsed = null;
                    try {
                        var u = new URL(href, window.location.origin);
                        var q = u.searchParams.get('search') || '';
                        parsed = parseBuildingRoomFromTextOrQuery(q);
                    } catch (e1) { }
                    if (!parsed) parsed = parseBuildingRoomFromTextOrQuery(a.textContent || '');
                    if (parsed) {
                        b = parsed.building;
                        r = parsed.room || '';
                    }
                }

                b = normalizeMazemapBuilding(b);
                r = normalizeMazemapRoom(r);
                if (!b) return;

                var query = r ? (b + '-' + r) : ('Bygning ' + b);
                showMazemapTooltip(a, 'Locating ' + query + '...', 'info');

                resolveMazemapRoom(b, r, function (res) {
                    if (res && res.ok && typeof res.poiId === 'number') {
                        var url = buildMazemapSharePoiUrl(res.poiId);
                        removeMazemapTooltip();
                        showMazemapTooltip(a, 'Opening MazeMap...', 'info');
                        setTimeout(removeMazemapTooltip, 900);
                        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (e2) { }
                        return;
                    }

                    var fallbackUrl = buildMazemapSearchUrl(query);
                    removeMazemapTooltip();
                    showMazemapTooltip(a, (r ? 'Room not found. Opening search...' : 'Building not found. Opening search...'), 'error');
                    setTimeout(removeMazemapTooltip, 1400);
                    try { window.open(fallbackUrl, '_blank', 'noopener,noreferrer'); } catch (e3) { }
                });
            } catch (e) {
                // ignore
            }
        }, true);
    }

    function ensureMazemapSmartRoomStyles() {
        var id = 'dtu-mazemap-smart-room-style';
        if (document.getElementById(id)) return;
        var color = darkModeEnabled ? '#5cafff' : '#1565c0';
        var glow = darkModeEnabled ? 'rgba(92,175,255,0.22)' : 'rgba(21,101,192,0.18)';
        var border = darkModeEnabled ? 'rgba(92,175,255,0.75)' : 'rgba(21,101,192,0.55)';
        var styleEl = document.createElement('style');
        styleEl.id = id;
        markExt(styleEl);
        styleEl.textContent = ''
            + '[data-dtu-mazemap-link]{'
            + 'color:' + color + ' !important;'
            + 'text-decoration:none !important;'
            + 'border-bottom:1px dotted ' + border + ' !important;'
            + 'padding:0 2px;'
            + 'border-radius:4px;'
            + 'cursor:pointer;'
            + 'display:inline-flex;'
            + 'align-items:center;'
            + 'gap:4px;'
            + 'line-height:1.2;'
            + '}'
            + '[data-dtu-mazemap-link]:hover{'
            + 'text-decoration:underline !important;'
            + 'box-shadow:0 0 0 2px ' + glow + ' !important;'
            + '}'
            + '[data-dtu-mazemap-link][data-dtu-mazemap-loading=\"1\"]{'
            + 'opacity:0.85;'
            + 'border-bottom-style:solid !important;'
            + '}'
            + '[data-dtu-mazemap-icon]{display:inline-flex;flex:0 0 auto;}'
            + '@keyframes dtuMazemapSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
            + '[data-dtu-mazemap-spinner]{'
            + 'width:12px;height:12px;'
            + 'border:2px solid currentColor;'
            + 'border-top-color:transparent;'
            + 'border-radius:50%;'
            + 'box-sizing:border-box;'
            + 'animation:dtuMazemapSpin .85s linear infinite;'
            + 'display:block;'
            + '}';
        (document.head || document.documentElement).appendChild(styleEl);
    }

    function getMazemapPinGlyph() {
        // Use a universally-visible glyph for a map pin.
        // This renders consistently across Shadow DOM / sanitized HTML paths.
        return '📍';
    }

    function removeMazemapTooltip() {
        if (_smartRoomLinkerTooltipEl && _smartRoomLinkerTooltipEl.parentNode) {
            _smartRoomLinkerTooltipEl.parentNode.removeChild(_smartRoomLinkerTooltipEl);
        }
        _smartRoomLinkerTooltipEl = null;
    }

    function showMazemapTooltip(anchorEl, text, tone) {
        removeMazemapTooltip();
        if (!anchorEl || !anchorEl.getBoundingClientRect) return null;
        var rect = anchorEl.getBoundingClientRect();
        var tip = document.createElement('div');
        markExt(tip);
        tip.setAttribute('data-dtu-mazemap-tooltip', '1');
        tip.textContent = String(text || '');
        var isDark = darkModeEnabled;
        var bg = isDark ? '#1a1a1a' : '#ffffff';
        var border = isDark ? '#404040' : '#d1d5db';
        var fg = isDark ? '#e0e0e0' : '#111827';
        var accent = (tone === 'error') ? 'var(--dtu-ad-status-danger)' : 'var(--dtu-ad-status-info)';
        tip.style.cssText = 'position:fixed;z-index:999999;max-width:280px;'
            + 'padding:6px 10px;border-radius:8px;font-size:12px;'
            + 'box-shadow:' + (isDark ? '0 10px 28px rgba(0,0,0,0.45)' : '0 10px 28px rgba(15,23,42,0.16)') + ';'
            + 'pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        tip.style.setProperty('background', bg, 'important');
        tip.style.setProperty('background-color', bg, 'important');
        tip.style.setProperty('border', '1px solid ' + border, 'important');
        tip.style.setProperty('color', fg, 'important');
        tip.style.setProperty('border-left', '3px solid ' + accent, 'important');

        // Position near the link, but keep inside viewport.
        var top = Math.max(8, rect.top - 34);
        var left = Math.min(Math.max(8, rect.left), window.innerWidth - 300);
        tip.style.top = Math.round(top) + 'px';
        tip.style.left = Math.round(left) + 'px';

        (document.body || document.documentElement).appendChild(tip);
        _smartRoomLinkerTooltipEl = tip;
        return tip;
    }

    function setMazemapLinkLoading(linkEl, loading) {
        if (!linkEl) return;
        if (loading) linkEl.setAttribute('data-dtu-mazemap-loading', '1');
        else linkEl.removeAttribute('data-dtu-mazemap-loading');
        var icon = linkEl.querySelector('[data-dtu-mazemap-icon]');
        if (!icon) return;
        if (loading) {
            // Spinner CSS doesn't cross Shadow DOM boundaries; use a simple text indicator.
            icon.textContent = '...';
        } else {
            icon.textContent = getMazemapPinGlyph();
        }
    }

    function applyMazemapSmartLinkInlineStyle(a) {
        if (!a || !a.style) return;
        var isDark = darkModeEnabled;
        var color = isDark ? '#5cafff' : '#1565c0';
        var border = isDark ? 'rgba(92,175,255,0.75)' : 'rgba(21,101,192,0.55)';
        a.style.setProperty('color', color, 'important');
        a.style.setProperty('text-decoration', 'none', 'important');
        a.style.setProperty('border-bottom', '1px dotted ' + border, 'important');
        a.style.setProperty('padding', '0 2px', 'important');
        a.style.setProperty('border-radius', '4px', 'important');
        a.style.setProperty('cursor', 'pointer', 'important');
        a.style.setProperty('display', 'inline-flex', 'important');
        a.style.setProperty('align-items', 'center', 'important');
        a.style.setProperty('gap', '4px', 'important');
        a.style.setProperty('line-height', '1.2', 'important');
    }

    function applyMazemapSmartIconInlineStyle(icon) {
        if (!icon || !icon.style) return;
        icon.style.setProperty('display', 'inline-flex', 'important');
        icon.style.setProperty('align-items', 'center', 'important');
        icon.style.setProperty('justify-content', 'center', 'important');
        icon.style.setProperty('flex', '0 0 auto', 'important');
        icon.style.setProperty('font-size', '12px', 'important');
        icon.style.setProperty('line-height', '1', 'important');
    }

    function resolveMazemapRoom(building, room, cb) {
        var b = normalizeMazemapBuilding(building);
        var r = normalizeMazemapRoom(room);
        if (!b) { if (cb) cb(null); return; }
        var key = b + '-' + (r || '');
        var now = Date.now();
        var cached = _mazemapResolveCache[key];
        if (cached && cached.ts && (now - cached.ts) < MAZEMAP_RESOLVE_CACHE_TTL_MS) {
            if (cb) cb(cached);
            return;
        }

        sendRuntimeMessage({ type: 'dtu-mazemap-resolve', building: b, room: r }, function (resp) {
            var out = null;
            if (resp && resp.ok && typeof resp.poiId === 'number') {
                out = {
                    ok: true,
                    poiId: resp.poiId,
                    identifier: resp.identifier || '',
                    kind: resp.kind || 'room',
                    queryUsed: resp.queryUsed || '',
                    ts: Date.now()
                };
            } else {
                out = { ok: false, error: (resp && resp.error) ? resp.error : 'not_found', ts: Date.now() };
            }
            _mazemapResolveCache[key] = out;
            if (cb) cb(out);
        });
    }

    function createMazemapSmartLink(building, room, labelText) {
        ensureMazemapSmartRoomStyles();
        ensureMazemapGlobalClickHandler();
        var b = normalizeMazemapBuilding(building);
        var r = normalizeMazemapRoom(room);
        var query = r ? (b + '-' + r) : ('Bygning ' + b);

        var a = document.createElement('a');
        markExt(a);
        a.setAttribute('data-dtu-mazemap-link', '1');
        a.setAttribute('data-dtu-mazemap-bound', '1');
        a.setAttribute('data-dtu-mazemap-building', b);
        if (r) a.setAttribute('data-dtu-mazemap-room', r);
        a.setAttribute('data-dtu-mazemap-text', String(labelText || query));
        a.href = buildMazemapSearchUrl(query);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = r ? 'Open in MazeMap (click to resolve exact location)' : 'Open building in MazeMap';
        a.textContent = String(labelText || query);
        // Shadow DOM doesn't see document-level CSS; ensure it looks like a link everywhere.
        applyMazemapSmartLinkInlineStyle(a);

        var icon = document.createElement('span');
        markExt(icon);
        icon.setAttribute('data-dtu-mazemap-icon', '1');
        icon.textContent = getMazemapPinGlyph();
        applyMazemapSmartIconInlineStyle(icon);
        a.appendChild(icon);

        a.addEventListener('click', function (ev) {
            // Respect normal browser gestures (open in new tab etc.) but always resolve before navigating.
            try { ev.preventDefault(); } catch (e1) { }

            var link = a;
            if (link.getAttribute('data-dtu-mazemap-loading') === '1') return;

            setMazemapLinkLoading(link, true);
            showMazemapTooltip(link, 'Locating ' + query + '...', 'info');

            resolveMazemapRoom(b, r, function (res) {
                setMazemapLinkLoading(link, false);
                if (res && res.ok && typeof res.poiId === 'number') {
                    var url = buildMazemapSharePoiUrl(res.poiId);
                    removeMazemapTooltip();
                    showMazemapTooltip(link, 'Opening MazeMap...', 'info');
                    setTimeout(removeMazemapTooltip, 900);
                    try {
                        window.open(url, '_blank', 'noopener,noreferrer');
                    } catch (e2) {
                        // Fallback: just set href and click
                        link.href = url;
                        link.click();
                    }
                    return;
                }

                // Fallback: open search view (still useful when exact room can't be resolved).
                var fallbackUrl = buildMazemapSearchUrl(query);
                removeMazemapTooltip();
                showMazemapTooltip(link, (r ? 'Room not found. Opening search...' : 'Building not found. Opening search...'), 'error');
                setTimeout(removeMazemapTooltip, 1400);
                try {
                    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
                } catch (e3) {
                    link.href = fallbackUrl;
                    link.click();
                }
            });
        });

        return a;
    }

    function isSmartRoomLinkerAllowedOnHost() {
        var host = window.location.hostname || '';
        if (host === 's.brightspace.com') return false;
        return true;
    }

    function getSmartRoomMatches(text) {
        var t = String(text || '');
        if (!t) return [];

        // Quick reject to keep scanning cheap.
        if (!/\d{3}/.test(t)) return [];
        if (!/(bygning|building|auditorium|\baud\b|\bB\s*[.\s]*\d{3}|\b\d{3}\s*[.\-]\s*\d)/i.test(t)) return [];

        var matches = [];

        // e.g. "Building 308, Room 012", "Bygning 101, lokale 1", "B308 R101"
        var reA = /\b(?:Building|Bygning|B)\s*([0-9]{3}[A-Za-z]?)\s*(?:,|\s)\s*(?:Room|Lokale|Lok\.?|Rum|R|Auditorium|Aud\.?|Seminar(?:\s*Room)?|Group(?:\s*Room)?|Exercise(?:\s*Room)?|AUD|SA)\s*([0-9]{1,4}[A-Za-z]?)\b/gi;
        var m;
        while ((m = reA.exec(t)) !== null) {
            matches.push({
                start: m.index,
                end: m.index + m[0].length,
                building: m[1],
                room: m[2],
                text: m[0]
            });
        }

        // Brightspace course content often uses: "B.308/aud 12" or "B.308/101,109,117"
        // If it's an auditorium (single room), linkify the whole "B.308/aud 12" chunk for clarity.
        // Otherwise linkify only the room tokens to avoid shifting running text.
        var reD2 = /\bB\s*[.\s]*([0-9]{3}[A-Za-z]?)\s*\/\s*aud(?:itorium)?\.?\s*([0-9]{1,4}[A-Za-z]?)\b/gi;
        while ((m = reD2.exec(t)) !== null) {
            matches.push({
                start: m.index,
                end: m.index + m[0].length,
                building: m[1],
                room: m[2],
                text: m[0]
            });
        }

        var reD = /\bB\s*[.\s]*([0-9]{3}[A-Za-z]?)\s*\/\s*(?:aud(?:itorium)?\.?\s*)?([0-9]{1,4}[A-Za-z]?)\b/gi;
        while ((m = reD.exec(t)) !== null) {
            var full = m[0] || '';
            var token = m[2] || '';
            var fullU = full.toUpperCase();
            var tokU = String(token).toUpperCase();
            var off = fullU.lastIndexOf(tokU);
            if (off < 0) off = full.length - token.length;
            var absStart = m.index + off;
            matches.push({
                start: absStart,
                end: absStart + token.length,
                building: m[1],
                room: token,
                text: token
            });
        }

        var reE = /\bB\s*[.\s]*([0-9]{3}[A-Za-z]?)\s*\/\s*([0-9]{1,4}[A-Za-z]?(?:\s*,\s*[0-9]{1,4}[A-Za-z]?)+)\b/gi;
        while ((m = reE.exec(t)) !== null) {
            var bld = m[1];
            var list = m[2] || '';
            if (!list) continue;
            var full2 = m[0] || '';
            var baseOff = (full2.toUpperCase().indexOf(list.toUpperCase()));
            if (baseOff < 0) baseOff = full2.length - list.length;
            var baseAbs = m.index + baseOff;

            var tokRe = /[0-9]{1,4}[A-Za-z]?/g;
            var tm;
            while ((tm = tokRe.exec(list)) !== null) {
                var tok = tm[0];
                if (!tok) continue;
                matches.push({
                    start: baseAbs + tm.index,
                    end: baseAbs + tm.index + tok.length,
                    building: bld,
                    room: tok,
                    text: tok
                });
            }
        }

        // e.g. "308.012", "308-012", "B325.047", "B116-A081", "303-042"
        var reB = /\bB?\s*([0-9]{3}[A-Za-z]?)\s*[.\-]\s*([A-Za-z]?\s*[0-9]{1,4}\s*[A-Za-z]?)\b/g;
        while ((m = reB.exec(t)) !== null) {
            var roomRaw = (m[2] || '').replace(/\s+/g, '');

            // Avoid file sizes like "(227.91 KB)".
            var tail = t.slice(m.index + m[0].length, m.index + m[0].length + 12);
            if (/^\s*(?:KB|MB|GB|TB)\b/i.test(tail)) continue;
            // Also avoid common decimal patterns: "227.91" etc.
            if (m[0].indexOf('.') !== -1) {
                var digits = roomRaw.replace(/[^0-9]/g, '');
                if (digits.length > 0 && digits.length <= 2) continue;
                // "227.91 K" (where K is part of KB/MB/...) can sneak in as a trailing room letter.
                if (/[KMGT]$/i.test(roomRaw) && /^\s*B\b/i.test(tail)) continue;
            }

            matches.push({
                start: m.index,
                end: m.index + m[0].length,
                building: m[1],
                room: roomRaw,
                text: m[0]
            });
        }

        // Building-only mentions: "Meeting point: Building 202, ...", "bygning 306 og bygning 358"
        var reC = /\b(?:Building|Bygning)\s*([0-9]{3}[A-Za-z]?)\b/gi;
        while ((m = reC.exec(t)) !== null) {
            matches.push({
                start: m.index,
                end: m.index + m[0].length,
                building: m[1],
                room: '',
                text: m[0]
            });
        }

        if (!matches.length) return [];
        matches.sort(function (a, b) {
            if (a.start !== b.start) return a.start - b.start;
            return b.end - a.end;
        });

        // De-overlap
        var out = [];
        var lastEnd = -1;
        for (var i = 0; i < matches.length; i++) {
            var mm = matches[i];
            if (!mm || mm.start < lastEnd) continue;
            lastEnd = mm.end;
            out.push(mm);
        }
        return out;
    }

    function isSmartRoomLinkerSkippableElement(el) {
        if (!el || el.nodeType !== 1) return true;
        if (el.closest && el.closest('[data-dtu-mazemap-link],[data-dtu-ext]')) return true;
        var tag = (el.tagName || '').toUpperCase();
        if (!tag) return true;
        if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') return true;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return true;
        if (tag === 'CODE' || tag === 'PRE') return true;
        if (el.isContentEditable) return true;
        return false;
    }

    function wrapSmartRoomsInTextNode(textNode) {
        if (!textNode || textNode.nodeType !== 3) return 0;
        var parent = textNode.parentElement;
        if (!parent || isSmartRoomLinkerSkippableElement(parent)) return 0;

        var text = textNode.nodeValue || '';
        var matches = getSmartRoomMatches(text);
        if (!matches.length) return 0;

        var frag = document.createDocumentFragment();
        var last = 0;
        for (var i = 0; i < matches.length; i++) {
            var m = matches[i];
            if (!m) continue;
            if (m.start > last) {
                frag.appendChild(document.createTextNode(text.slice(last, m.start)));
            }
            var link = createMazemapSmartLink(m.building, m.room || '', m.text);
            frag.appendChild(link);
            last = m.end;
        }
        if (last < text.length) {
            frag.appendChild(document.createTextNode(text.slice(last)));
        }
        parent.replaceChild(frag, textNode);
        return matches.length;
    }

    function createMazemapSmartLinkHtmlElement(doc, building, room, labelText) {
        if (!doc || !doc.createElement) return null;
        var b = normalizeMazemapBuilding(building);
        var r = normalizeMazemapRoom(room);
        if (!b) return null;

        var query = r ? (b + '-' + r) : ('Bygning ' + b);
        var href = buildMazemapSearchUrl(query);

        var a = doc.createElement('a');
        a.setAttribute('data-dtu-mazemap-link', '1');
        a.setAttribute('data-dtu-mazemap-building', b);
        if (r) a.setAttribute('data-dtu-mazemap-room', r);
        a.setAttribute('data-dtu-mazemap-text', String(labelText || query));
        a.setAttribute('href', href);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        a.setAttribute('title', r ? 'Open in MazeMap (click to resolve exact location)' : 'Open building in MazeMap');

        // Inline style because this may render inside Shadow DOM (Brightspace).
        // (Document-level CSS does not apply into shadow roots.)
        // Keep it "text-like" to avoid adding visual leading spacing in running text.
        var style = getMazemapInlineLinkStyleString()
            + 'padding:0 !important;'
            + 'display:inline;'
            + 'line-height:inherit;';
        a.setAttribute('style', style);

        var txt = doc.createElement('span');
        txt.textContent = String(labelText || query);
        a.appendChild(txt);

        // Brightspace may sanitize style properties on nested elements.
        // Use the same pin glyph as the regular DOM linker so the UI stays consistent.
        var icon = doc.createElement('span');
        icon.setAttribute('data-dtu-mazemap-icon', '1');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = getMazemapPinGlyph();
        icon.setAttribute('style', 'display:inline;'
            + 'margin-left:4px;'
            + 'font-size:0.95em;'
            + 'opacity:0.9;'
            + 'text-decoration:none;');
        a.appendChild(icon);

        return a;
    }

    function linkifyD2lHtmlBlockAttribute(block) {
        if (!block || !block.getAttribute || !block.setAttribute) return false;
        var raw = String(block.getAttribute('html') || '');
        if (!raw) return false;
        if (raw.indexOf('data-dtu-mazemap-link') !== -1) return false;
        // Quick reject: keep cheap, but include DTU Learn content formats like "B.308/aud 12".
        if (!/(bygning|building|auditorium|\baud\b|\bB\s*[.\s]*\d{3}|\b\d{3}\s*[.\-]\s*\d)/i.test(raw)) return false;

        var doc;
        try {
            doc = new DOMParser().parseFromString(raw, 'text/html');
        } catch (eParse) {
            return false;
        }
        if (!doc || !doc.body) return false;

        var did = false;
        var replaced = 0;
        var maxReplacements = 40;

        // Collect nodes first (TreeWalker is live; replacing nodes while walking can skip content).
        var nodes = [];
        try {
            var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
            var n;
            while ((n = walker.nextNode())) nodes.push(n);
        } catch (eWalk) {
            return false;
        }

        for (var i = 0; i < nodes.length; i++) {
            if (replaced >= maxReplacements) break;
            var textNode = nodes[i];
            if (!textNode || textNode.nodeType !== 3) continue;
            var parent = textNode.parentNode;
            if (!parent) continue;
            var pTag = (parent.nodeName || '').toUpperCase();
            if (pTag === 'A' || pTag === 'SCRIPT' || pTag === 'STYLE') continue;

            var text = textNode.nodeValue || '';
            var matches = getSmartRoomMatches(text);
            if (!matches.length) continue;

            var frag = doc.createDocumentFragment();
            var last = 0;
            for (var j = 0; j < matches.length; j++) {
                if (replaced >= maxReplacements) break;
                var m = matches[j];
                if (!m) continue;
                if (m.start > last) frag.appendChild(doc.createTextNode(text.slice(last, m.start)));
                var a = createMazemapSmartLinkHtmlElement(doc, m.building, m.room || '', m.text);
                if (a) {
                    frag.appendChild(a);
                    replaced++;
                    did = true;
                } else {
                    frag.appendChild(doc.createTextNode(text.slice(m.start, m.end)));
                }
                last = m.end;
            }
            if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
            try {
                parent.replaceChild(frag, textNode);
            } catch (eReplace) { /* ignore */ }
        }

        if (!did) return false;

        var out = '';
        try { out = doc.body.innerHTML; } catch (eSer) { out = ''; }
        if (!out) return false;
        if (out === raw) return false;

        try {
            block.setAttribute('html', out);
            // Also set the property when available (some D2L components react to it).
            try { block.html = out; } catch (eProp) { }
            return true;
        } catch (e) {
            return false;
        }
    }

    function linkifyD2lHtmlBlocksInRoot(root) {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!root || !root.querySelectorAll) return;
        var blocks = root.querySelectorAll('d2l-html-block[html]');
        if (!blocks || !blocks.length) return;
        ensureMazemapGlobalClickHandler();
        for (var i = 0; i < blocks.length && i < 80; i++) {
            linkifyD2lHtmlBlockAttribute(blocks[i]);
        }
    }

    function runSmartRoomLinkerScan(rootNode) {
        if (!shouldRunSmartRoomLinkerInThisWindow()) return;

        var root = (rootNode && (rootNode.nodeType === 1 || rootNode.nodeType === 11))
            ? rootNode
            : (document.body || document.documentElement);
        if (!root) return;

        // If no rootNode was provided, avoid hammering full-page scans repeatedly.
        var now = Date.now();
        if (!rootNode) {
            if (_smartRoomLinkerDidFullScan && (now - _smartRoomLinkerLastScanTs) < 8000) return;
            _smartRoomLinkerDidFullScan = true;
        }
        _smartRoomLinkerLastScanTs = now;

        ensureMazemapSmartRoomStyles();
        ensureMazemapGlobalClickHandler();

        var isShadow = root && root.nodeType === 11;

        // Brightspace announcements store the real text inside d2l-html-block's `html` attribute,
        // and render it inside shadow roots. Patch the attribute so links exist even if we
        // cannot reach a closed shadow root.
        try {
            if (window.location.hostname === 'learn.inside.dtu.dk' && !isShadow) {
                linkifyD2lHtmlBlocksInRoot(root);
            }
        } catch (ePatch) { }

        // Tight budgets for full-page scans; more generous for Shadow DOM fragments / HTML block renderers.
        var isHtmlBlockRendered = (!isShadow && root.nodeType === 1 && root.classList && root.classList.contains('d2l-html-block-rendered'));
        var maxTextNodes = (isShadow || isHtmlBlockRendered) ? 1600 : 420;
        var maxMs = (isShadow || isHtmlBlockRendered) ? 85 : 28;
        var start = Date.now();
        var processed = 0;

        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                try {
                    if (!node || node.nodeType !== 3) return NodeFilter.FILTER_REJECT;
                    var p = node.parentElement;
                    if (!p || isSmartRoomLinkerSkippableElement(p)) return NodeFilter.FILTER_REJECT;
                    var v = node.nodeValue || '';
                    if (!v || v.length < 6) return NodeFilter.FILTER_REJECT;
                    // Quick signal that the text might contain a location.
                    if (!/\d{3}/.test(v)) return NodeFilter.FILTER_REJECT;
                    if (!/(bygning|building|auditorium|\baud\b|\bB\s*[.\s]*\d{3}|\b\d{3}\s*[.\-]\s*\d)/i.test(v)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                } catch (e) {
                    return NodeFilter.FILTER_REJECT;
                }
            }
        }, false);

        var node;
        while ((node = walker.nextNode())) {
            processed++;
            wrapSmartRoomsInTextNode(node);
            if (processed >= maxTextNodes) break;
            if ((Date.now() - start) > maxMs) break;
        }
    }

    function scheduleSmartRoomLinkerScan(rootNode, delayMs) {
        if (!shouldRunSmartRoomLinkerInThisWindow()) return;
        if (_smartRoomLinkerTimer) {
            // Keep the earliest/most specific root to reduce scan size.
            if (_smartRoomLinkerPendingRoot == null && rootNode) _smartRoomLinkerPendingRoot = rootNode;
            return;
        }
        _smartRoomLinkerPendingRoot = rootNode || null;
        _smartRoomLinkerTimer = setTimeout(function () {
            _smartRoomLinkerTimer = null;
            var pending = _smartRoomLinkerPendingRoot;
            _smartRoomLinkerPendingRoot = null;
            try { runSmartRoomLinkerScan(pending); } catch (e) { }
        }, delayMs || 420);
    }

    function seedSmartRoomLinkerShadowRoot(shadowRoot) {
        if (!shadowRoot || shadowRoot.nodeType !== 11) return;
        // Only relevant on Brightspace/DTU Learn where content lives in Shadow DOM.
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isFeatureFlagEnabled(FEATURE_SMART_ROOM_LINKER_KEY)) return;
        if (_smartRoomLinkerScannedShadowRoots.has(shadowRoot)) return;
        _smartRoomLinkerScannedShadowRoots.add(shadowRoot);

        // Prefer scanning the rendered HTML containers (announcements etc.) first to avoid
        // spending the scan budget on unrelated shadow DOM noise.
        try {
            var targets = [];
            if (shadowRoot.querySelectorAll) {
                shadowRoot.querySelectorAll('.d2l-html-block-rendered').forEach(function (el) { targets.push(el); });
                shadowRoot.querySelectorAll('.d2l-datalist, .vui-list, .d2l-datalist-no-padding').forEach(function (el) { targets.push(el); });
            }
            if (targets.length) {
                for (var i = 0; i < targets.length && i < 12; i++) {
                    scheduleSmartRoomLinkerScan(targets[i], 520);
                }
                // Also do a light shadow-root scan as a fallback.
                scheduleSmartRoomLinkerScan(shadowRoot, 820);
                // And seed any nested open shadow roots under this one (d2l-html-block etc.).
                try { seedSmartRoomLinkerNestedShadowRoots(shadowRoot); } catch (eNest0) { }
                return;
            }
        } catch (e1) { }

        scheduleSmartRoomLinkerScan(shadowRoot, 650);
        try { seedSmartRoomLinkerNestedShadowRoots(shadowRoot); } catch (eNest1) { }
    }

    function seedSmartRoomLinkerNestedShadowRoots(shadowRoot) {
        if (!shadowRoot || shadowRoot.nodeType !== 11) return;
        if (!shadowRoot.querySelectorAll) return;

        // Traverse only the shadow root subtree (not the whole document).
        var walker = document.createTreeWalker(shadowRoot, NodeFilter.SHOW_ELEMENT, null);
        var node = walker.nextNode();
        var scanned = 0;
        var start = Date.now();
        while (node) {
            scanned++;
            if (node.shadowRoot) {
                seedSmartRoomLinkerShadowRoot(node.shadowRoot);
            }
            if (scanned > 800) break;
            if ((Date.now() - start) > 35) break;
            node = walker.nextNode();
        }
    }

    function scheduleSmartRoomLinkerShadowSweep(delayMs) {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!shouldRunSmartRoomLinkerInThisWindow()) return;
        if (_smartRoomLinkerShadowSweepTimer) return;
        _smartRoomLinkerShadowSweepTimer = setTimeout(function () {
            _smartRoomLinkerShadowSweepTimer = null;
            try {
                var base = document.body || document.documentElement;
                if (!base) return;

                // Find open shadow roots of D2L custom elements (d2l-*) in the light DOM.
                var walker = document.createTreeWalker(base, NodeFilter.SHOW_ELEMENT, null);
                var node = walker.nextNode();
                var scanned = 0;
                var start = Date.now();
                while (node) {
                    scanned++;
                    var tag = (node.tagName || '').toLowerCase();
                    if (tag && tag.indexOf('d2l-') === 0 && node.shadowRoot) {
                        seedSmartRoomLinkerShadowRoot(node.shadowRoot);
                    }
                    if (scanned > 1800) break;
                    if ((Date.now() - start) > 55) break;
                    node = walker.nextNode();
                }
            } catch (e) { }
        }, delayMs || 900);
    }

    function scheduleSmartRoomLinkerHtmlBlockProbe(delayMs) {
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!shouldRunSmartRoomLinkerInThisWindow()) return;
        if (_smartRoomLinkerHtmlBlockProbeTimer) return;
        _smartRoomLinkerHtmlBlockProbeTimer = setTimeout(function () {
            _smartRoomLinkerHtmlBlockProbeTimer = null;
            try {
                var blocks = document.querySelectorAll('d2l-html-block');
                for (var i = 0; i < blocks.length && i < 80; i++) {
                    var b = blocks[i];
                    try { linkifyD2lHtmlBlockAttribute(b); } catch (eLinkify) { }
                    if (b && b.shadowRoot) {
                        seedSmartRoomLinkerShadowRoot(b.shadowRoot);
                    }
                }
            } catch (e) { }
        }, delayMs || 650);
    }

    function removeSmartRoomLinks() {
        removeMazemapTooltip();
        document.querySelectorAll('[data-dtu-mazemap-link]').forEach(function (a) {
            try {
                var txt = a.getAttribute('data-dtu-mazemap-text') || (a.textContent || '');
                a.replaceWith(document.createTextNode(txt));
            } catch (e) { }
        });
    }

    function runFrameFeatureChecks(rootNode) {
        // Lightweight features that should run inside same-origin iframes too (e.g. DTU Learn Content).
        if (IS_TOP_WINDOW) return;

        // Site-wide: turn room mentions into MazeMap links (lazy-resolve on click).
        if (isFeatureFlagEnabled(FEATURE_SMART_ROOM_LINKER_KEY)) {
            scheduleSmartRoomLinkerScan(rootNode, 520);
            scheduleSmartRoomLinkerHtmlBlockProbe(700);
            scheduleSmartRoomLinkerShadowSweep(820);
        } else {
            removeSmartRoomLinks();
        }
    }

    /* ===================================================================
     *  Room Finder for kurser.dtu.dk
     *  Shows building / room data from bundled TimeEdit scrape.
     *  Data file: data/rooms_spring_2026.json
     *  TODO (May 2026): Re-scrape TimeEdit for fall semester & update JSON.
     * =================================================================== */

    var _roomFinderDataCache = null;     // parsed JSON (all courses)
    var _roomFinderDataLoading = false;
    var _roomFinderDataCallbacks = [];

    function loadRoomFinderData(cb) {
        if (_roomFinderDataCache) { cb(_roomFinderDataCache); return; }
        _roomFinderDataCallbacks.push(cb);
        if (_roomFinderDataLoading) return;
        _roomFinderDataLoading = true;

        var jsonUrl = '';
        try {
            if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
                jsonUrl = browser.runtime.getURL('data/rooms_spring_2026.json');
            } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                jsonUrl = chrome.runtime.getURL('data/rooms_spring_2026.json');
            }
        } catch (e) { /* ignore */ }

        if (!jsonUrl) {
            _roomFinderDataLoading = false;
            _roomFinderDataCallbacks.forEach(function (fn) { fn(null); });
            _roomFinderDataCallbacks = [];
            return;
        }

        fetch(jsonUrl)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                _roomFinderDataCache = data;
                _roomFinderDataLoading = false;
                _roomFinderDataCallbacks.forEach(function (fn) { fn(data); });
                _roomFinderDataCallbacks = [];
            })
            .catch(function () {
                _roomFinderDataLoading = false;
                _roomFinderDataCallbacks.forEach(function (fn) { fn(null); });
                _roomFinderDataCallbacks = [];
            });
    }

    var ROOM_TYPE_LABELS = {
        'AUD': 'Auditorium',
        'GR': 'Group Room',
        'EPX': 'Exercise Room',
        'EXP': 'Exercise Room',
        'SA': 'Seminar Room',
        'ON': 'Online'
    };

    function insertKurserRoomFinder() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_KURSER_ROOM_FINDER_KEY)) {
            var ex = document.querySelector('[data-dtu-room-finder]');
            if (ex) ex.remove();
            return;
        }
        if (!isKurserCoursePage()) return;

        var courseCode = getKurserCourseCode();
        if (!courseCode) return;

        // Already rendered for this course?
        var existing = document.querySelector('[data-dtu-room-finder]');
        if (existing) {
            var existingCode = existing.getAttribute('data-dtu-room-finder-code') || '';
            if (existingCode.toUpperCase() === courseCode) return;
            existing.remove();
        }

        // Find the "Location" row in the Course information table
        var locationRow = null;
        var infoBox = document.querySelector('.box.information');
        if (infoBox) {
            var labels = infoBox.querySelectorAll('td > label');
            for (var i = 0; i < labels.length; i++) {
                if ((labels[i].textContent || '').trim() === 'Location') {
                    locationRow = labels[i].closest('tr');
                    break;
                }
            }
        }
        if (!locationRow || !locationRow.parentNode) return;

        var tr = document.createElement('tr');
        tr.setAttribute('data-dtu-room-finder', '1');
        tr.setAttribute('data-dtu-room-finder-code', courseCode);
        markExt(tr);

        var tdLabel = document.createElement('td');
        markExt(tdLabel);
        var lbl = document.createElement('label');
        lbl.textContent = 'Rooms';
        lbl.style.cssText = 'color: ' + (darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)') + ';';
        tdLabel.appendChild(lbl);
        tr.appendChild(tdLabel);

        var tdValue = document.createElement('td');
        markExt(tdValue);
        tdValue.textContent = 'Loading...';
        tr.appendChild(tdValue);

        locationRow.insertAdjacentElement('afterend', tr);

        loadRoomFinderData(function (allRooms) {
            if (!allRooms) {
                tdValue.textContent = 'Room data unavailable.';
                return;
            }

            var rooms = allRooms[courseCode] || allRooms[courseCode.replace(/^0+/, '')];
            if (!rooms || !rooms.length) {
                tr.remove();
                return;
            }

            // Filter out ON (online) entries unless they're the only ones
            var physicalRooms = rooms.filter(function (r) { return r.type !== 'ON'; });
            if (!physicalRooms.length) physicalRooms = rooms;

            // Separate lecture rooms (AUD/SA) from exercise/group rooms
            var lectureRooms = [];
            var exerciseRooms = [];
            physicalRooms.forEach(function (r) {
                if (r.type === 'AUD' || r.type === 'SA') {
                    lectureRooms.push(r);
                } else {
                    exerciseRooms.push(r);
                }
            });

            // Sort each group by building + room number
            var sortByBldRoom = function (a, b) {
                var bldCmp = parseInt(a.building) - parseInt(b.building);
                if (bldCmp !== 0) return bldCmp;
                return a.room.localeCompare(b.room);
            };
            lectureRooms.sort(sortByBldRoom);
            exerciseRooms.sort(sortByBldRoom);

            tdValue.innerHTML = '';
            markExt(tdValue);

            var accentColor = darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)';
            var textColor = darkModeEnabled ? '#e0e0e0' : '#333';
            var mutedColor = darkModeEnabled ? '#999' : '#666';

            // Lecture rooms: "Building 308, Auditorium 012"
            lectureRooms.forEach(function (r) {
                var line = document.createElement('div');
                markExt(line);
                line.style.cssText = 'font-size: 13px; line-height: 1.6; color: ' + textColor + ';';
                var typeLabel = r.type === 'SA' ? 'Seminar Room' : 'Auditorium';
                line.appendChild(document.createTextNode('Building ' + r.building + ', ' + typeLabel + ' '));
                if (isFeatureFlagEnabled(FEATURE_SMART_ROOM_LINKER_KEY)) {
                    line.appendChild(createMazemapSmartLink(r.building, r.room, r.room));
                } else {
                    line.appendChild(document.createTextNode(r.room));
                }
                tdValue.appendChild(line);
            });

            // Exercise/group rooms: group by building, then list room numbers
            if (exerciseRooms.length) {
                var byBuilding = {};
                exerciseRooms.forEach(function (r) {
                    if (!byBuilding[r.building]) byBuilding[r.building] = [];
                    byBuilding[r.building].push(r.room);
                });
                var buildings = Object.keys(byBuilding).sort(function (a, b) { return parseInt(a) - parseInt(b); });
                buildings.forEach(function (bld) {
                    var roomNums = byBuilding[bld];
                    var line = document.createElement('div');
                    markExt(line);
                    line.style.cssText = 'font-size: 12px; line-height: 1.6; color: ' + mutedColor + ';';
                    var label = roomNums.length === 1 ? 'Room' : 'Rooms';
                    line.appendChild(document.createTextNode('Exercises: ' + label + ' '));
                    for (var ri = 0; ri < roomNums.length; ri++) {
                        if (ri > 0) line.appendChild(document.createTextNode(', '));
                        if (isFeatureFlagEnabled(FEATURE_SMART_ROOM_LINKER_KEY)) {
                            line.appendChild(createMazemapSmartLink(bld, roomNums[ri], roomNums[ri]));
                        } else {
                            line.appendChild(document.createTextNode(roomNums[ri]));
                        }
                    }
                    line.appendChild(document.createTextNode(' (Building ' + bld + ')'));
                    tdValue.appendChild(line);
                });
            }

            // Source tag
            var src = document.createElement('div');
            markExt(src);
            src.style.cssText = 'font-size: 10px; margin-top: 2px; color: ' + accentColor + ';';
            src.textContent = 'Data: TimeEdit location service';
            tdValue.appendChild(src);
        });
    }

    // DTU schedule slot -> weekday + time mapping
    var SCHEDULE_SLOT_MAP = {
        '1A': 'Monday 08:00-12:00',
        '1B': 'Thursday 13:00-17:00',
        '2A': 'Monday 13:00-17:00',
        '2B': 'Thursday 08:00-12:00',
        '3A': 'Tuesday 08:00-12:00',
        '3B': 'Friday 13:00-17:00',
        '4A': 'Tuesday 13:00-17:00',
        '4B': 'Friday 08:00-12:00',
        '5A': 'Wednesday 08:00-12:00',
        '5B': 'Wednesday 13:00-17:00'
    };

    function annotateKurserSchedulePlacement() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY)) {
            // Restore original text when feature is disabled
            document.querySelectorAll('[data-dtu-schedule-annotated]').forEach(function (cell) {
                var original = cell.getAttribute('data-dtu-schedule-original');
                if (original !== null) cell.textContent = original;
                cell.removeAttribute('data-dtu-schedule-annotated');
                cell.removeAttribute('data-dtu-schedule-original');
            });
            return;
        }
        if (!isKurserCoursePage()) return;

        var infoBox = document.querySelector('.box.information');
        if (!infoBox) return;

        var rows = infoBox.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
            var cells = rows[i].querySelectorAll('td');
            if (cells.length < 2) continue;

            var labelCell = cells[0];
            var valueCell = cells[1];
            var labelText = (labelCell.textContent || '').trim().toLowerCase();

            if (labelText.indexOf('schedule') === -1
                && labelText.indexOf('skema') === -1
                && labelText.indexOf('date of exam') === -1
                && labelText.indexOf('eksamen') === -1) continue;

            if (valueCell.getAttribute('data-dtu-schedule-annotated')) continue;

            var text = valueCell.textContent || '';
            // Match slot codes like F3A, E5B -- negative lookahead avoids duplicating if already annotated
            var annotated = text.replace(/\b([FE]?)([1-5])([AB])\b(?!\s*\()/gi, function (match, season, num, slot) {
                var key = num + slot.toUpperCase();
                var dayTime = SCHEDULE_SLOT_MAP[key];
                if (!dayTime) return match;
                return match + ' (' + dayTime + ')';
            });

            // Full-group codes like F3, E5 (both A and B slots)
            annotated = annotated.replace(/\b([FE])([1-5])\b(?![AB0-9\s]*\()/gi, function (match, season, num) {
                var keyA = num + 'A';
                var keyB = num + 'B';
                var dayA = SCHEDULE_SLOT_MAP[keyA];
                var dayB = SCHEDULE_SLOT_MAP[keyB];
                if (!dayA || !dayB) return match;
                return match + ' (' + dayA + ' & ' + dayB + ')';
            });

            if (annotated !== text) {
                valueCell.setAttribute('data-dtu-schedule-original', text);
                valueCell.textContent = annotated;
                valueCell.setAttribute('data-dtu-schedule-annotated', '1');
            }
        }
    }

    function fixEvalueringResultCharts() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'evaluering.dtu.dk') return;

        // Keep the "text answers" toolbar row compact and transparent.
        document.querySelectorAll('.mx-s.hide-on-print, .mx-s.hide-on-print .flex.flex--content-between').forEach(function (row) {
            row.style.setProperty('background', 'transparent', 'important');
            row.style.setProperty('background-color', 'transparent', 'important');
            row.style.setProperty('height', 'auto', 'important');
            row.style.setProperty('min-height', '0', 'important');
        });

        // Chart scripts wait until legend headers are not pure black before drawing.
        document.querySelectorAll('.comparison__legend > .legend__header').forEach(function (header) {
            var bg = '';
            try {
                bg = window.getComputedStyle(header).backgroundColor || '';
            } catch (e) { }
            if (bg === 'rgb(0, 0, 0)') {
                header.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                header.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                header.style.setProperty('color', '#ffffff', 'important');
            }
        });

        // Keep chart canvases and wrappers transparent to avoid giant dark blocks.
        document.querySelectorAll('canvas[id^="CanvasQuestion_"]').forEach(function (canvas) {
            canvas.style.setProperty('background', 'transparent', 'important');
            canvas.style.setProperty('background-color', 'transparent', 'important');

            var wrap = canvas.parentElement;
            if (wrap && wrap.style) {
                wrap.style.setProperty('background', 'transparent', 'important');
                wrap.style.setProperty('background-color', 'transparent', 'important');
            }

            var content = canvas.closest('.question__content');
            if (content && content.style) {
                content.style.setProperty('background', 'transparent', 'important');
                content.style.setProperty('background-color', 'transparent', 'important');
            }
        });
    }

    function fixCampusnetHeaderStyling() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'campusnet.dtu.dk') return;

        function clearInlineForSelector(selector, props) {
            document.querySelectorAll(selector).forEach(function (el) {
                if (!el || !el.style) return;
                props.forEach(function (prop) { el.style.removeProperty(prop); });
            });
        }

        function applyCampusnetAccentElements() {
            var accentDeepHex = getResolvedAccentDeep();
            var accentDeepHoverHex = (getAccentThemeById(_accentThemeId) || {}).accentDeepHover || '#990000';
            var accentHex = (getAccentThemeById(_accentThemeId) || {}).accent || '#990000';
            var accentHoverHex = (getAccentThemeById(_accentThemeId) || {}).accentHover || '#b30000';
            var accentSoftHex = (getAccentThemeById(_accentThemeId) || {}).accentSoft || accentHex;
            var linkColor = darkModeEnabled ? accentSoftHex : accentDeepHex;
            var linkHoverColor = darkModeEnabled ? accentHex : accentHoverHex;

            document.querySelectorAll('.widget__header').forEach(function (header) {
                if (!header || !header.style) return;
                header.style.setProperty('background', accentDeepHex, 'important');
                header.style.setProperty('background-color', accentDeepHex, 'important');
                header.style.setProperty('border-bottom-color', accentDeepHoverHex, 'important');
                header.style.setProperty('color', '#ffffff', 'important');
            });

            document.querySelectorAll('.widget__header .widget__title, h2.widget__title').forEach(function (title) {
                if (!title || !title.style) return;
                title.style.setProperty('color', '#ffffff', 'important');
                title.style.setProperty('background', 'transparent', 'important');
                title.style.setProperty('background-color', 'transparent', 'important');
            });

            // Widget service icons: accent only the outer circle/background layer.
            // Keep inner glyphs (including chat bubble/user/heart marks) white for readability.
            document.querySelectorAll('.widget__header .widget__icon, .widget__header .widget__icon .service-icon').forEach(function (wrap) {
                if (!wrap || !wrap.style) return;
                wrap.style.setProperty('background', 'transparent', 'important');
                wrap.style.setProperty('background-color', 'transparent', 'important');
                wrap.style.setProperty('border', '0', 'important');
                wrap.style.setProperty('border-radius', '999px', 'important');
                wrap.style.setProperty('box-shadow', 'none', 'important');
                wrap.style.setProperty('overflow', 'hidden', 'important');
            });
            document.querySelectorAll('.widget__header .widget__icon .icon__base').forEach(function (base) {
                if (!base || !base.style) return;
                base.style.setProperty('background', 'transparent', 'important');
                base.style.setProperty('background-color', 'transparent', 'important');
                base.style.setProperty('background-image', 'none', 'important');
                base.style.setProperty('border', '0', 'important');
                base.style.setProperty('opacity', '0', 'important');
            });
            document.querySelectorAll('.widget__header .widget__icon .icon__content').forEach(function (icon) {
                if (!icon || !icon.style) return;
                icon.style.setProperty('background', accentHex, 'important');
                icon.style.setProperty('background-color', accentHex, 'important');
                icon.style.setProperty('border-color', accentHex, 'important');
                icon.style.setProperty('border-radius', '999px', 'important');
                icon.style.setProperty('color', '#ffffff', 'important');
                icon.style.setProperty('fill', '#ffffff', 'important');
                icon.style.setProperty('stroke', '#ffffff', 'important');
            });
            document.querySelectorAll('.widget__header .widget__icon .icon__identifier').forEach(function (icon) {
                if (!icon || !icon.style) return;
                icon.style.setProperty('background', 'transparent', 'important');
                icon.style.setProperty('background-color', 'transparent', 'important');
                icon.style.setProperty('color', '#ffffff', 'important');
                icon.style.setProperty('fill', '#ffffff', 'important');
                icon.style.setProperty('stroke', '#ffffff', 'important');
            });

            document.querySelectorAll('.nav__icon .fa-circle').forEach(function (icon) {
                if (!icon || !icon.style) return;
                icon.style.setProperty('color', accentHex, 'important');
            });
            document.querySelectorAll('.nav__icon .fa-stack-1x, .nav__icon .fa-heart, .nav__icon .fa-user').forEach(function (icon) {
                if (!icon || !icon.style) return;
                icon.style.setProperty('color', '#ffffff', 'important');
            });
            document.querySelectorAll('.nav__icon, .nav__icon .fa-stack, .nav__icon i').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('border', '0', 'important');
                el.style.setProperty('box-shadow', 'none', 'important');
            });

            // CampusNet course/group burger blocks: accent background.
            document.querySelectorAll('.group-menu__item, .group-menu__item-burger').forEach(function (el) {
                if (!el || !el.style) return;
                var panelBg = accentDeepHex;
                var panelBorder = accentDeepHex;
                el.style.setProperty('background', panelBg, 'important');
                el.style.setProperty('background-color', panelBg, 'important');
                el.style.setProperty('border-color', panelBorder, 'important');
            });
            document.querySelectorAll('.group-menu__item header, .group-menu__item-burger header').forEach(function (el) {
                if (!el || !el.style) return;
                var headerBg = accentDeepHex;
                var headerBorder = darkModeEnabled ? '#404040' : accentDeepHex;
                el.style.setProperty('background', headerBg, 'important');
                el.style.setProperty('background-color', headerBg, 'important');
                el.style.setProperty('border-color', headerBorder, 'important');
            });

            if (!darkModeEnabled) {
                // CampusNet light mode only: CN Inside + language + user text black.
                document.querySelectorAll(
                    '.header__top a[href*="/cnnet/frontpage"] td span > b, '
                    + '.header__top a[href*="/cnnet/frontpage"] td span'
                ).forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('color', '#000000', 'important');
                });
                document.querySelectorAll('.header__top a[href*="/cnnet/frontpage"]').forEach(function (a) {
                    if (!a || !a.style) return;
                    a.querySelectorAll('span, b').forEach(function (el) {
                        if (!el || !el.style) return;
                        var txt = '';
                        try { txt = (el.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); } catch (eTxt0) { txt = ''; }
                        if (!txt) return;
                        if (/^cn inside$/i.test(txt)) {
                            el.style.setProperty('color', '#000000', 'important');
                        }
                    });
                });
                document.querySelectorAll('section.header .header__top .ml-s, section.header .header__top .ml-s span').forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('color', '#000000', 'important');
                });
                var headerTop = document.querySelector('section.header .header__top, .header__top');
                if (headerTop) {
                    headerTop.querySelectorAll('a, span').forEach(function (el) {
                        if (!el || !el.style) return;
                        if (el.closest('.nav__icon, .fa-stack, .service-icon, .icon__content, .icon__identifier')) return;
                        var txt = '';
                        try { txt = (el.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); } catch (eTxt) { txt = ''; }
                        if (!txt) return;
                        if (/^dansk$/i.test(txt) || /\(s\d{6,}\)/i.test(txt)) {
                            el.style.setProperty('color', '#000000', 'important');
                        }
                    });
                }

                // CampusNet light mode only: these links/titles should be black, not accent-colored.
                document.querySelectorAll('.groupLinksTable a.item__link, .groupLinksTable a.item__link .item__title, a.item__link[href*="/participants"] .item__title, a.item__link[href*="/calendar/default.aspx"] .item__title, a.item__link[href*="/mcq"] .item__title').forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('color', '#000000', 'important');
                });
                document.querySelectorAll('nav#breadcrumb.actualbreadcrumb a[href="/cnnet/"]').forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('color', '#000000', 'important');
                });
            }

            document.querySelectorAll('.widget a[href], .widget__body a[href], .widget__content a[href]').forEach(function (a) {
                if (!a || !a.style) return;
                if (a.closest('nav, #breadcrumb, .nav__dropdown, .group-menu__item, .group-menu__item-burger')) return;
                if (!darkModeEnabled && (a.matches('.groupLinksTable a.item__link') || a.closest('.groupLinksTable'))) return;
                var cls = (a.className || '').toString();
                if (/\barc-button\b/.test(cls)) return;
                a.style.setProperty('color', linkColor, 'important');
                if (!a.hasAttribute('data-dtu-accent-link')) {
                    a.setAttribute('data-dtu-accent-link', '1');
                    a.addEventListener('mouseenter', function () {
                        try { a.style.setProperty('color', linkHoverColor, 'important'); } catch (e0) { }
                    }, true);
                    a.addEventListener('mouseleave', function () {
                        try { a.style.setProperty('color', linkColor, 'important'); } catch (e1) { }
                    }, true);
                }
            });

            // Grades table: accent header links and course numbers
            var gradesTable = document.querySelector('table.gradesList');
            if (gradesTable) {
                // Header row: "Number", "Title", "Grade", "ECTS", "Date" links
                gradesTable.querySelectorAll('tr.gradesListHeader td a').forEach(function (a) {
                    if (!a || !a.style) return;
                    a.style.setProperty('color', linkColor, 'important');
                    if (!a.hasAttribute('data-dtu-accent-link')) {
                        a.setAttribute('data-dtu-accent-link', '1');
                        a.addEventListener('mouseenter', function () {
                            try { a.style.setProperty('color', linkHoverColor, 'important'); } catch (e0) { }
                        }, true);
                        a.addEventListener('mouseleave', function () {
                            try { a.style.setProperty('color', linkColor, 'important'); } catch (e1) { }
                        }, true);
                    }
                });
                // Course number cells: accent the link or plain text in the first column
                gradesTable.querySelectorAll('tr.context_direct, tr.context_alternating').forEach(function (row) {
                    if (!row) return;
                    var firstTd = row.querySelector('td:first-child');
                    if (!firstTd) return;
                    var link = firstTd.querySelector('a');
                    if (link) {
                        link.style.setProperty('color', linkColor, 'important');
                        if (!link.hasAttribute('data-dtu-accent-link')) {
                            link.setAttribute('data-dtu-accent-link', '1');
                            link.addEventListener('mouseenter', function () {
                                try { link.style.setProperty('color', linkHoverColor, 'important'); } catch (e0) { }
                            }, true);
                            link.addEventListener('mouseleave', function () {
                                try { link.style.setProperty('color', linkColor, 'important'); } catch (e1) { }
                            }, true);
                        }
                    } else {
                        // Plain-text course code (e.g. KU006) -- accent the cell text
                        firstTd.style.setProperty('color', linkColor, 'important');
                    }
                });
            }

            // Nav dropdown wrapper (article) -- accent border
            // Override all border-side colors AND the shorthand to beat the site's `border: ... solid #990000`.
            function forceAccentBorder(el) {
                if (!el || !el.style) return;
                el.style.setProperty('border-color', accentDeepHex, 'important');
                el.style.setProperty('border-top-color', accentDeepHex, 'important');
                el.style.setProperty('border-right-color', accentDeepHex, 'important');
                el.style.setProperty('border-bottom-color', accentDeepHex, 'important');
                el.style.setProperty('border-left-color', accentDeepHex, 'important');
            }
            document.querySelectorAll(
                '.nav__dropdown, article.nav__dropdown, '
                + '.nav__dropdown--group, article.nav__dropdown--group, '
                + '.flex--last, .nav__dropdown .flex--last'
            ).forEach(forceAccentBorder);
            if (darkModeEnabled) {
                document.querySelectorAll(
                    '.nav__dropdown, article.nav__dropdown, '
                    + '.nav__dropdown--group, article.nav__dropdown--group, '
                    + '.flex--last, .nav__dropdown .flex--last'
                ).forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('background', '#2d2d2d', 'important');
                    el.style.setProperty('background-color', '#2d2d2d', 'important');
                    el.style.setProperty('border-color', '#404040', 'important');
                });
                document.querySelectorAll('.group-multi-column').forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('background', '#2d2d2d', 'important');
                    el.style.setProperty('background-color', '#2d2d2d', 'important');
                });
            }

            // Nav dropdown section headers ("Courses", "Projects", "Groups", "Shortcuts") -- accent background + border
            document.querySelectorAll('.group-menu__item-burger').forEach(function (section) {
                forceAccentBorder(section);
                var header = section.querySelector(':scope > header');
                if (header && header.style) {
                    header.style.setProperty('background-color', accentDeepHex, 'important');
                    header.style.setProperty('background', accentDeepHex, 'important');
                }
                var title = section.querySelector('h2.item__title');
                if (title && title.style) {
                    title.style.setProperty('background', 'transparent', 'important');
                    title.style.setProperty('background-color', 'transparent', 'important');
                    title.style.setProperty('background-image', 'none', 'important');
                    title.style.setProperty('color', '#ffffff', 'important');
                }
                var icon = section.querySelector('.group-menu__item-burger-expander');
                if (icon && icon.style) {
                    icon.style.setProperty('background', 'transparent', 'important');
                    icon.style.setProperty('background-color', 'transparent', 'important');
                    icon.style.setProperty('background-image', 'none', 'important');
                    icon.style.setProperty('color', '#ffffff', 'important');
                }
            });
        }

        if (!darkModeEnabled) {
            clearInlineForSelector(
                '.nav__dropdown--group a, '
                + 'article.nav__dropdown--group a, '
                + '.group-menu__item a, '
                + '.group-menu__item-burger a, '
                + 'nav#breadcrumb.actualbreadcrumb, '
                + 'nav#breadcrumb.actualbreadcrumb a, '
                + 'nav#breadcrumb.actualbreadcrumb a.last, '
                + 'article.header__search #searchTextfield, '
                + '.header__search #searchTextfield, '
                + 'main.main.arc-row, '
                + 'main.main.arc-row > section.main__content#koContainer, '
                + 'main.main.arc-row > section.main__content#koContainer > #ctl00_ContentBox.main__content--box, '
                + '#ctl00_ContentBox.main__content--box, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage > form#aspnetForm, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage > form#aspnetForm > div, '
                + '.gradesPoints > h2, '
                + '.gradesPublicationTitle, '
                + '.gradesPdfTitle, '
                + '.gradesDtuPaperTitle, '
                + '.gradesPublishedResultsTitle, '
                + '.gradesPoints > table:not(.gradesList), '
                + '.gradesPoints > table:not(.gradesList) tr, '
                + '.gradesPoints > table:not(.gradesList) td, '
                + '.messageText, '
                + '.messageText .postTeaser, '
                + '.messageText .messageTruncatebar, '
                + '.messageTruncatebar, '
                + '.arc-toolbar.mb-l, '
                + '.arc-toolbar.mb-l .flex, '
                + '.arc-toolbar.mb-l .filter-participants, '
                + '.arc-toolbar.mb-l .arc-buttongroup--multi, '
                + '.arc-toolbar.mb-l .arc-dropdown, '
                + '.arc-toolbar.mb-l .arc-dropdown__text, '
                + '.arc-toolbar.mb-l #query, '
                + '.arc-toolbar.mb-l input[type=\"text\"], '
                + '.arc-toolbar.mb-l .arc-button, '
                + '.arc-toolbar.mb-l .arc-button--hollow-default, '
                + '.arc-toolbar.mb-l .arc-button--medium, '
                + '.arc-toolbar.mb-l .arc-dropdown__list, '
                + '.arc-toolbar.mb-l .arc-dropdown__list-item, '
                + '.ui-participant-informationbox, '
                + '.ui-participant-informationbox.participant-active, '
                + '.ui-participant-placeholder, '
                + '.ui-participants-infolist, '
                + '.ui-participant-infobox, '
                + '.ui-participant-infobox .info-header',
                [
                    'background',
                    'background-color',
                    'background-image',
                    'color',
                    'border-color',
                    'border-top-color',
                    'filter',
                    'mix-blend-mode'
                ]
            );
            applyCampusnetAccentElements();
            return;
        }

        // Nav dropdown group links (Courses, Groups, Shortcuts) -- force light text
        document.querySelectorAll('.nav__dropdown--group a, article.nav__dropdown--group a, .group-menu__item a, .group-menu__item-burger a').forEach(function (link) {
            if (!link || !link.style) return;
            link.style.setProperty('color', '#e0e0e0', 'important');
        });
        // Category titles: accent background, white text.
        try {
            document.querySelectorAll('h4.category__title').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                el.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
            });
            document.querySelectorAll('h4.category__title a, h4.category__title .arc-menu-burger-expander, h4.category__title .toggle-category').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('color', '#ffffff', 'important');
            });
        } catch (eCat) { }

        // Accent service icons: tint the inner icon layer (icon__content), not wrapper/base.
        // CampusNet uses layered <i> elements; avoid recoloring glyph/logo layers.
        try {
            var iconKinds = '.icon--messages, .icon--events, .icon--filesharing, .icon--mcq, .icon--mcq-small, .icon--participants, .icon--participants-small, .icon--calendar, .icon--calendar-small';
            document.querySelectorAll('span.service-icon, span.item__icon').forEach(function (wrap) {
                if (!wrap || !wrap.querySelector) return;
                var hasKind = false;
                try { hasKind = !!wrap.querySelector('.icon__content' + iconKinds + ', .icon__identifier' + iconKinds); } catch (e0) { hasKind = false; }
                if (!hasKind) return;

                if (wrap.style) {
                    // Keep wrapper clean and circular so lower layers cannot bleed outside.
                    wrap.style.setProperty('background', 'transparent', 'important');
                    wrap.style.setProperty('background-color', 'transparent', 'important');
                    wrap.style.setProperty('border', '0', 'important');
                    wrap.style.setProperty('border-color', 'transparent', 'important');
                    wrap.style.setProperty('border-radius', '999px', 'important');
                    wrap.style.setProperty('box-shadow', 'none', 'important');
                    wrap.style.setProperty('overflow', 'hidden', 'important');
                }

                var base = null;
                try { base = wrap.querySelector('.icon__base'); } catch (e1) { base = null; }
                if (base && base.style) {
                    base.style.setProperty('background', 'transparent', 'important');
                    base.style.setProperty('background-color', 'transparent', 'important');
                    base.style.setProperty('border-color', 'transparent', 'important');
                    base.style.setProperty('background-image', 'none', 'important');
                    base.style.setProperty('border', '0', 'important');
                    base.style.setProperty('box-shadow', 'none', 'important');
                    base.style.setProperty('opacity', '0', 'important');
                }

                wrap.querySelectorAll('.icon__content').forEach(function (icon) {
                    if (!icon || !icon.style) return;
                    icon.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                    icon.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                    icon.style.setProperty('border-color', 'var(--dtu-ad-accent)', 'important');
                    icon.style.setProperty('border-radius', '999px', 'important');
                    icon.style.setProperty('color', '#ffffff', 'important');
                    icon.style.setProperty('fill', '#ffffff', 'important');
                    icon.style.setProperty('stroke', '#ffffff', 'important');
                    icon.style.removeProperty('filter');
                    icon.style.removeProperty('mix-blend-mode');
                });
                wrap.querySelectorAll('.icon__identifier').forEach(function (icon) {
                    if (!icon || !icon.style) return;
                    icon.style.setProperty('background', 'transparent', 'important');
                    icon.style.setProperty('background-color', 'transparent', 'important');
                    icon.style.setProperty('color', '#ffffff', 'important');
                    icon.style.setProperty('fill', '#ffffff', 'important');
                    icon.style.setProperty('stroke', '#ffffff', 'important');
                    icon.style.removeProperty('filter');
                    icon.style.removeProperty('mix-blend-mode');
                });
            });
        } catch (eIco) { }

        // Accent course/group header bars
        try {
            document.querySelectorAll('.box.mainContentPageTemplate .boxHeader').forEach(function (h) {
                if (!h || !h.style) return;
                h.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('border-bottom', '2px solid var(--dtu-ad-accent-deep-hover)', 'important');
            });
            document.querySelectorAll('.box.mainContentPageTemplate .boxHeader h2').forEach(function (h2) {
                if (!h2 || !h2.style) return;
                h2.style.setProperty('background-color', 'transparent', 'important');
                h2.style.setProperty('background', 'transparent', 'important');
                h2.style.setProperty('color', '#ffffff', 'important');
            });
            document.querySelectorAll('#afrapporteringWidget .boxHeader').forEach(function (h) {
                if (!h || !h.style) return;
                h.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('border-bottom', '2px solid var(--dtu-ad-accent-deep-hover)', 'important');
            });
            document.querySelectorAll('#afrapporteringWidget .boxHeader h2').forEach(function (h2) {
                if (!h2 || !h2.style) return;
                h2.style.setProperty('color', '#ffffff', 'important');
            });
            document.querySelectorAll('#afrapporteringWidget .lessonplan__progressbar .progressbar__percentage').forEach(function (p) {
                if (!p || !p.style) return;
                p.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                p.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
            });
            document.querySelectorAll('.box.widget .boxHeader').forEach(function (h) {
                if (!h || !h.style) return;
                h.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                h.style.setProperty('border-bottom', '2px solid var(--dtu-ad-accent-deep-hover)', 'important');
            });
            document.querySelectorAll('.box.widget .boxHeader h2').forEach(function (h2) {
                if (!h2 || !h2.style) return;
                h2.style.setProperty('color', '#ffffff', 'important');
            });
        } catch (eHdr) { }

        var breadcrumb = document.querySelector('nav#breadcrumb.actualbreadcrumb');
        if (breadcrumb && breadcrumb.style) {
            breadcrumb.style.setProperty('background', '#2d2d2d', 'important');
            breadcrumb.style.setProperty('background-color', '#2d2d2d', 'important');
            breadcrumb.style.setProperty('color', '#e0e0e0', 'important');
        }

        document.querySelectorAll('nav#breadcrumb.actualbreadcrumb a, nav#breadcrumb.actualbreadcrumb a.last').forEach(function (link) {
            if (!link || !link.style) return;
            link.style.setProperty('background', '#2d2d2d', 'important');
            link.style.setProperty('background-color', '#2d2d2d', 'important');
            link.style.setProperty('color', '#e0e0e0', 'important');
        });

        var searchInput = document.querySelector('article.header__search #searchTextfield, .header__search #searchTextfield');
        if (searchInput && searchInput.style) {
            searchInput.style.setProperty('background', '#1a1a1a', 'important');
            searchInput.style.setProperty('background-color', '#1a1a1a', 'important');
            searchInput.style.setProperty('color', '#e0e0e0', 'important');
            searchInput.style.setProperty('border-color', '#505050', 'important');
        }

        // Participants page toolbar: force dark 1 to avoid dark-2 striping from site/global rules.
        try {
            document.querySelectorAll(
                '.arc-toolbar.mb-l, '
                + 'article.arc-toolbar.mb-l, '
                + '.arc-toolbar.mb-l .flex, '
                + '.arc-toolbar.mb-l .filter-participants, '
                + '.arc-toolbar.mb-l .arc-buttongroup--multi, '
                + '.arc-toolbar.mb-l .arc-dropdown, '
                + '.arc-toolbar.mb-l .arc-dropdown__text'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
            });
            document.querySelectorAll(
                '.arc-toolbar.mb-l #query, '
                + '.arc-toolbar.mb-l input[type="text"], '
                + '.arc-toolbar.mb-l .arc-button, '
                + '.arc-toolbar.mb-l .arc-button--hollow-default, '
                + '.arc-toolbar.mb-l .arc-button--medium'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('border-color', '#404040', 'important');
            });
            document.querySelectorAll('.arc-toolbar.mb-l .arc-dropdown__list').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('border-color', '#404040', 'important');
            });
            document.querySelectorAll('.arc-toolbar.mb-l .arc-dropdown__list-item').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('border-color', '#404040', 'important');
            });
        } catch (eTb) { }

        // Participants page detail panels: force dark 2 for the expanded info box content.
        try {
            var dark2 = '#2d2d2d';
            var border2 = '#404040';
            document.querySelectorAll(
                '.ui-participant-informationbox, '
                + '.ui-participant-informationbox.participant-active, '
                + '.ui-participant-placeholder, '
                + '.ui-participants-infolist, '
                + '.ui-participant-infobox, '
                + '.ui-participant-infobox .info-header'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', dark2, 'important');
                el.style.setProperty('background-color', dark2, 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('border-color', border2, 'important');
            });
        } catch (ePt) { }

        // Grades page main container should be dark 1.
        // Apply inline to beat site CSS and broad form rules.
        var path = (window.location.pathname || '').toLowerCase();
        var onGradesPage = path.indexOf('/cnnet/grades/grades.aspx') !== -1
            || !!document.querySelector('#ctl00_ContentBox.main__content--box > .gradesPage');
        if (onGradesPage) {
            // Prevent dark-2 bleed on the large lower area of the grades page layout.
            document.querySelectorAll(
                'main.main.arc-row, '
                + 'main.main.arc-row > section.main__content#koContainer, '
                + 'main.main.arc-row > section.main__content#koContainer > #ctl00_ContentBox.main__content--box'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background-image', 'none', 'important');
            });

            document.querySelectorAll(
                '#ctl00_ContentBox.main__content--box, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage > form#aspnetForm, '
                + '#ctl00_ContentBox.main__content--box > .gradesPage > form#aspnetForm > div'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
            });

            // Grade page section headers should be dark 1 (not the default dark 2 bars).
            document.querySelectorAll(
                '.gradesPoints > h2, '
                + '.gradesPublicationTitle, '
                + '.gradesPdfTitle, '
                + '.gradesDtuPaperTitle, '
                + '.gradesPublishedResultsTitle'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('background-image', 'none', 'important');
            });

            // Keep "Total points for this education" table stable across postbacks.
            document.querySelectorAll(
                '.gradesPoints > table:not(.gradesList), '
                + '.gradesPoints > table:not(.gradesList) tr, '
                + '.gradesPoints > table:not(.gradesList) td'
            ).forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('border-color', '#404040', 'important');
                var inlineStyle = (el.getAttribute && el.getAttribute('style')) || '';
                if (!/color\s*:/i.test(inlineStyle)) {
                    el.style.setProperty('color', '#e0e0e0', 'important');
                }
            });
        }

        // Message truncation bars sometimes keep a site gradient despite stylesheet overrides.
        // Set inline styles so CampusNet cannot repaint it back to light.
        document.querySelectorAll('.messageText').forEach(function (el) {
            if (!el || !el.style) return;
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
        });

        document.querySelectorAll('.messageText .postTeaser').forEach(function (el) {
            if (!el || !el.style) return;
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
        });

        document.querySelectorAll('.messageText .messageTruncatebar, .messageTruncatebar').forEach(function (el) {
            if (!el || !el.style) return;
            var darkFade = 'linear-gradient(to bottom, rgba(26,26,26,0), rgba(26,26,26,0.95) 65%, #1a1a1a 100%)';
            el.style.setProperty('background', darkFade, 'important');
            el.style.setProperty('background-image', darkFade, 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
            el.style.setProperty('border-top-color', '#404040', 'important');
            el.style.setProperty('filter', 'none', 'important');
            el.style.setProperty('mix-blend-mode', 'normal', 'important');
        });

        // Keep accent-critical CampusNet elements themed in both dark and light mode.
        applyCampusnetAccentElements();
    }

    // ===== KURSER.DTU.DK ACCENT ELEMENTS (light mode) =====
    function applyKurserAccentElements() {
        if (window.location.hostname !== 'kurser.dtu.dk') return;
        if (darkModeEnabled) return;

        var linkColor = 'var(--dtu-ad-accent-deep)';
        var linkHoverColor = 'var(--dtu-ad-accent-hover)';

        function accentLink(a) {
            if (!a || !a.style) return;
            // Skip nav tab links (they sit on an accent-deep background with white text)
            if (a.closest && a.closest('.mofoclass')) return;
            a.style.setProperty('color', linkColor, 'important');
            a.style.setProperty('text-decoration', 'underline', 'important');
            if (!a.hasAttribute('data-dtu-accent-link')) {
                a.setAttribute('data-dtu-accent-link', '1');
                a.addEventListener('mouseenter', function () {
                    try { a.style.setProperty('color', linkHoverColor, 'important'); } catch (e) { }
                }, true);
                a.addEventListener('mouseleave', function () {
                    try { a.style.setProperty('color', linkColor, 'important'); } catch (e) { }
                }, true);
            }
        }

        // Course info box links: .CourseLink, .menulink, mailto links, schedule/exam links
        var infoBox = document.querySelector('.box.information');
        if (infoBox) {
            infoBox.querySelectorAll('a.CourseLink, a.menulink, a[href^="mailto:"], a[href*="kurser.dtu.dk/schedule"], a[href*="student.dtu.dk/eksamen"], a[href*="kurser.dtu.dk/course"]').forEach(accentLink);
        }

        // "se flere" expander spans in #studiebox
        document.querySelectorAll('#studiebox .expander').forEach(function (span) {
            if (!span || !span.style) return;
            span.style.setProperty('color', linkColor, 'important');
            span.style.setProperty('cursor', 'pointer', 'important');
        });

        // Kursusevalueringer + Karakterhistorik links (evaluering.dtu.dk, karakterer.dtu.dk)
        document.querySelectorAll('.box a[href*="evaluering.dtu.dk"], .box a[href*="karakterer.dtu.dk"]').forEach(accentLink);

        // External literature / homepage links inside the info box
        if (infoBox) {
            infoBox.querySelectorAll('a[href]:not(.CourseLink):not(.menulink):not([href^="mailto:"]):not([data-dtu-accent-link])').forEach(function (a) {
                if (!a || !a.style) return;
                var href = a.getAttribute('href') || '';
                // Skip javascript: links, MazeMap links, and anchors
                if (/^(javascript:|#)/.test(href)) return;
                if (a.hasAttribute('data-dtu-mazemap-link')) return;
                accentLink(a);
            });
        }

        // "Ryd søgefelter" link on /search
        document.querySelectorAll('a[href="/search"]').forEach(accentLink);

        // Top bar (.dturedbackground) accent is now handled by enforceDtuRedBackgroundZoneDark2()
        // which runs for kurser.dtu.dk in runTopWindowFeatureChecks().
    }

    // ===== EXAM CLUSTER OUTLOOK (STUDYPLAN) [START] =====
    // Easy rollback: remove this block plus the scheduler call in runTopWindowFeatureChecks(...).
    var _studyplanExamClusterTimer = null;
    var _studyplanExamClusterRequestInFlight = false;
    var _studyplanExamClusterLastSig = '';
    var _studyplanExamClusterLastRenderedSig = '';
    var _studyplanExamClusterLastCalendar = null;

    function normalizeExamClusterText(text) {
        return (text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function normalizeExamSlotToken(rawToken) {
        var raw = normalizeExamClusterText(rawToken).toUpperCase().replace(/\s+/g, '');
        if (!raw) return '';
        var compact = raw.replace('-', '');
        if (/^[EF]\d[AB]$/.test(compact)) return compact.slice(0, 2) + '-' + compact.slice(2);
        if (/^[EF]\d$/.test(compact)) return compact;
        return '';
    }

    function formatIsoDateForDisplay(iso) {
        var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return iso || '';
        return m[3] + '/' + m[2] + ' ' + m[1];
    }

    function parseIsoToUtcTs(iso) {
        var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        var y = parseInt(m[1], 10);
        var mo = parseInt(m[2], 10);
        var d = parseInt(m[3], 10);
        if (!y || !mo || !d) return null;
        return Date.UTC(y, mo - 1, d);
    }

    function startOfTodayUtcTs() {
        var now = new Date();
        return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    }

    function diffDaysUtc(fromTs, toTs) {
        var dayMs = 24 * 60 * 60 * 1000;
        return Math.round((toTs - fromTs) / dayMs);
    }

    function getTableCellColspan(cell) {
        if (!cell) return 1;
        var span = parseInt(cell.getAttribute('colspan') || '1', 10);
        return (isNaN(span) || span < 1) ? 1 : span;
    }

    function getRowCellTextByVisualIndex(row, visualIndex) {
        if (!row || typeof visualIndex !== 'number' || visualIndex < 0) return '';
        var cells = row.querySelectorAll('th, td');
        var col = 0;
        for (var i = 0; i < cells.length; i++) {
            var span = getTableCellColspan(cells[i]);
            if (visualIndex >= col && visualIndex < (col + span)) {
                return normalizeExamClusterText(cells[i].innerText || cells[i].textContent || '');
            }
            col += span;
        }
        return '';
    }

    function getStudyplanExamTableColumnIndexes(tableEl) {
        var out = { placement: -1, result: -1 };
        if (!tableEl) return out;

        var headerRow = null;
        var rows = tableEl.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].querySelector('th')) {
                headerRow = rows[i];
                break;
            }
        }
        if (!headerRow) return out;

        var col = 0;
        var cells = headerRow.querySelectorAll('th, td');
        cells.forEach(function (cell) {
            var txt = normalizeExamClusterText(cell.textContent || '').toLowerCase();
            if (out.placement === -1 && /\b(placering|placement)\b/.test(txt)) out.placement = col;
            if (out.result === -1 && /\b(resultat|result)\b/.test(txt)) out.result = col;
            col += getTableCellColspan(cell);
        });
        return out;
    }

    function getStudyplanTablePeriodText(tableEl) {
        if (!tableEl) return '';
        var cached = tableEl.getAttribute('data-dtu-exam-period-text');
        if (cached) return cached;

        var period = '';
        var rows = tableEl.querySelectorAll('tr');
        for (var i = 0; i < rows.length && i < 4; i++) {
            var firstCell = rows[i].querySelector('th, td');
            if (!firstCell) continue;
            var txt = normalizeExamClusterText(firstCell.textContent || '');
            if (!txt) continue;
            if (/(week|weeks|uger|spring|for\u00e5r|autumn|efter\u00e5r|summer|sommer|winter|vinter|eksamen|exam|januar|january|februar|february|juni|june|juli|july|august|december|may|maj)/i.test(txt)) {
                period = txt;
                break;
            }
        }

        tableEl.setAttribute('data-dtu-exam-period-text', period);
        return period;
    }

    function parseStudyplanPlacementTokens(text) {
        var out = [];
        var seen = Object.create(null);
        var regex = /\b([EF]\d(?:\s*-\s*[AB]|[AB])?)\b/gi;
        var m;
        while ((m = regex.exec(text || '')) !== null) {
            var token = normalizeExamSlotToken(m[1]);
            if (!token || seen[token]) continue;
            seen[token] = true;
            out.push(token);
        }
        return out;
    }

    function parseStudyplanMonthTags(text) {
        var lower = normalizeExamClusterText(text).toLowerCase();
        var tags = [];
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
        if (/\bwinter\b|\bvinter/.test(lower)) add('winter_period');
        if (/\bsummer\b|\bsommer/.test(lower)) add('summer_period');
        if (/\bre-?exam\b|\breeksamen\b/.test(lower)) add('reexam');
        return tags;
    }

    function studyplanMonthTagToNumber(tag) {
        if (tag === 'january') return 1;
        if (tag === 'february') return 2;
        if (tag === 'may') return 5;
        if (tag === 'june') return 6;
        if (tag === 'july') return 7;
        if (tag === 'august') return 8;
        if (tag === 'december') return 12;
        return null;
    }

    function extractStudyplanExplicitMonthTags(text) {
        return parseStudyplanMonthTags(text).filter(function (tag) {
            return studyplanMonthTagToNumber(tag) !== null;
        });
    }

    function inferStudyplanPeriodInfo(periodText) {
        var text = normalizeExamClusterText(periodText);
        if (!text) return null;

        var lower = text.toLowerCase();
        var years = [];
        var yearSeen = Object.create(null);
        var yearRegex = /\b(20\d{2})\b/g;
        var yearMatch;
        while ((yearMatch = yearRegex.exec(lower)) !== null) {
            var y = parseInt(yearMatch[1], 10);
            if (!isNaN(y) && !yearSeen[y]) {
                yearSeen[y] = true;
                years.push(y);
            }
        }

        var nowYear = new Date().getFullYear();
        var baseYear = years.length ? years[years.length - 1] : nowYear;
        var startYear = baseYear;
        var endYear = baseYear;
        var startMonth = null;
        var endMonth = null;
        var kind = 'unknown';

        var has13Weeks = /13\s*[- ]?(?:weeks?|uger)/.test(lower);
        var hasSpring = /(?:\bspring\b|\bfor\u00e5r\b)/.test(lower);
        var hasAutumn = /(?:\bautumn\b|\bfall\b|\befter\u00e5r\b)/.test(lower);
        var hasSummerExam = /(?:\bsummer\s+exam\b|\bsommereksamen\b)/.test(lower);
        var hasWinterExam = /(?:\bwinter\s+exam\b|\bvintereksamen\b)/.test(lower);
        var hasJune = /(?:\bjune\b|\bjuni\b)/.test(lower);
        var hasJuly = /(?:\bjuly\b|\bjuli\b)/.test(lower);
        var hasAugust = /\baugust\b/.test(lower);

        if (has13Weeks && hasSpring) {
            kind = 'spring_13w';
            startMonth = 2;
            endMonth = 5;
        } else if (has13Weeks && hasAutumn) {
            kind = 'autumn_13w';
            startMonth = 8;
            endMonth = 12;
        } else if (hasJune && hasJuly && hasAugust) {
            kind = 'summer_jja';
            startMonth = 6;
            endMonth = 8;
        } else if (hasSummerExam) {
            kind = 'summer_exam';
            startMonth = 5;
            endMonth = 6;
        } else if (hasWinterExam) {
            kind = 'winter_exam';
            startMonth = 12;
            endMonth = 1;
            if (years.length >= 2) {
                startYear = years[0];
                endYear = years[1];
            } else {
                endYear = startYear + 1;
            }
        } else {
            var monthTags = extractStudyplanExplicitMonthTags(text);
            if (monthTags.length) {
                var monthNums = monthTags
                    .map(studyplanMonthTagToNumber)
                    .filter(function (n) { return typeof n === 'number' && isFinite(n); })
                    .sort(function (a, b) { return a - b; });
                if (monthNums.length) {
                    kind = 'month_range';
                    startMonth = monthNums[0];
                    endMonth = monthNums[monthNums.length - 1];
                }
            }
        }

        if (startMonth === null || endMonth === null) {
            return {
                text: text,
                kind: kind,
                startTs: null,
                endTs: null
            };
        }

        var startTs = Date.UTC(startYear, startMonth - 1, 1);
        var endTs = Date.UTC(endYear, endMonth, 0);

        // Handle ranges that cross year boundaries (example: Dec -> Jan).
        if (endTs < startTs && startYear === endYear) {
            endYear = startYear + 1;
            endTs = Date.UTC(endYear, endMonth, 0);
        }

        return {
            text: text,
            kind: kind,
            startTs: startTs,
            endTs: endTs
        };
    }

    function isStudyplanPeriodCurrentOrFuture(periodInfo, todayTs) {
        if (!periodInfo || typeof periodInfo.endTs !== 'number' || !isFinite(periodInfo.endTs)) return true;
        return periodInfo.endTs >= todayTs;
    }

    function isStudyplanPeriodCurrent(periodInfo, todayTs) {
        if (!periodInfo || typeof periodInfo.startTs !== 'number' || typeof periodInfo.endTs !== 'number') return false;
        return periodInfo.startTs <= todayTs && periodInfo.endTs >= todayTs;
    }

    function isLikelyCompletedStudyplanResult(resultText) {
        var txt = normalizeExamClusterText(resultText);
        if (!txt) return false;
        if (/^[-–—]$/.test(txt)) return false;
        if (/^(12|10|7|4|02|00|-3)\b/.test(txt)) return true;
        if (/^(BE(?:\s*\(.*\))?|best[a\u00e5]et|passed?)$/i.test(txt)) return true;
        if (/\b(ikke\s+best[a\u00e5]et|not\s+passed|failed)\b/i.test(txt)) return true;
        if (/[✓✔]/.test(txt)) return true;
        return false;
    }

    function extractStudyplanCourseName(anchor, code, row) {
        var text = '';
        if (anchor && anchor.closest) {
            var anchorCell = anchor.closest('td, th');
            if (anchorCell) {
                text = normalizeExamClusterText(anchorCell.innerText || anchorCell.textContent || '');
            }
        }
        if (!text && row) {
            var cells = row.querySelectorAll('td, th');
            for (var i = 0; i < cells.length; i++) {
                var cellText = normalizeExamClusterText(cells[i].innerText || cells[i].textContent || '');
                if (!cellText) continue;
                if (new RegExp('\\b' + String(code || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(cellText)) {
                    text = cellText;
                    break;
                }
            }
        }
        if (!text && row) {
            text = normalizeExamClusterText(row.innerText || row.textContent || '');
        }
        if (!text) return '';
        var esc = String(code || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp('\\b' + esc + '\\b', 'i'), '').trim();
        text = text.replace(/\b([EF]\d(?:-?[AB])?|january|february|may|june|july|august|december)\b/ig, '').trim();
        text = text.replace(/\b(placement|status|ects)\b/ig, '').trim();
        text = text.replace(/\s{2,}/g, ' ').trim();
        return text.slice(0, 120);
    }

    function findStudyplanCourseInRow(row) {
        if (!row) return null;

        var anchors = row.querySelectorAll('a');
        for (var i = 0; i < anchors.length; i++) {
            var txt = normalizeExamClusterText(anchors[i].textContent || '');
            var m = txt.match(/\b([A-Za-z]{2}\d{3}|\d{5})\b/);
            if (m && m[1]) {
                return {
                    code: m[1].toUpperCase(),
                    anchor: anchors[i]
                };
            }
        }

        var rowText = normalizeExamClusterText(row.textContent || '');
        var rowMatch = rowText.match(/\b([A-Za-z]{2}\d{3}|\d{5})\b/);
        if (rowMatch && rowMatch[1]) {
            return {
                code: rowMatch[1].toUpperCase(),
                anchor: null
            };
        }
        return null;
    }
    function parseStudyplanSemesterNumber(text) {
        var m = normalizeExamClusterText(text).match(/\b(\d{1,2})\.\s*(semester|term)\b/i);
        if (!m || !m[1]) return null;
        var n = parseInt(m[1], 10);
        return isNaN(n) ? null : n;
    }

    function detectCurrentStudyplanPeriodLabel(courses, todayTs) {
        if (!Array.isArray(courses) || !courses.length) return '';
        var counts = Object.create(null);
        var bestText = '';
        var bestCount = 0;
        courses.forEach(function (c) {
            if (!c || !c.periodIsCurrent || !c.periodText) return;
            var key = c.periodText;
            counts[key] = (counts[key] || 0) + 1;
            if (counts[key] > bestCount) {
                bestCount = counts[key];
                bestText = key;
            }
        });
        if (bestText) return bestText;

        var nearest = null;
        courses.forEach(function (c) {
            if (!c || !c.periodText) return;
            var endTs = (typeof c.periodEndTs === 'number') ? c.periodEndTs : null;
            if (endTs !== null && endTs < todayTs) return;
            var startTs = (typeof c.periodStartTs === 'number') ? c.periodStartTs : null;
            var refTs = startTs !== null ? startTs : (endTs !== null ? endTs : null);
            if (refTs === null) return;
            if (!nearest || refTs < nearest.ts) nearest = { ts: refTs, text: c.periodText };
        });
        if (nearest && nearest.text) return nearest.text;

        for (var i = 0; i < courses.length; i++) {
            if (courses[i] && courses[i].periodText) return courses[i].periodText;
        }
        return '';
    }

    function findStudyplanSemesterNumberForTable(table) {
        if (!table) return null;
        var cached = table.getAttribute('data-dtu-semester-num');
        if (cached) {
            var cachedNum = parseInt(cached, 10);
            if (!isNaN(cachedNum)) return cachedNum;
        }

        var found = null;
        var scope = table;
        for (var up = 0; scope && up < 6 && found === null; up++) {
            var prev = scope.previousElementSibling;
            var hops = 0;
            while (prev && hops < 16) {
                var txt = normalizeExamClusterText(prev.textContent || '');
                if (txt && txt.length <= 180) {
                    var num = parseStudyplanSemesterNumber(txt);
                    if (num !== null) {
                        found = num;
                        break;
                    }
                }
                prev = prev.previousElementSibling;
                hops++;
            }
            scope = scope.parentElement;
        }

        table.setAttribute('data-dtu-semester-num', found === null ? '' : String(found));
        return found;
    }

    function getStudyplanRowPeriodText(row, fallback) {
        if (!row) return fallback || '';
        var probe = row;
        var hops = 0;
        while (probe && hops < 10) {
            var firstCell = probe.querySelector('th, td');
            if (firstCell) {
                var txt = normalizeExamClusterText(firstCell.textContent || '');
                if (txt && txt.length <= 120
                    && /(week|weeks|uger|exam|eksamen|januar|january|februar|february|maj|may|juni|june|juli|july|august|december|spring|for\u00e5r|autumn|efter\u00e5r|summer|sommer|winter|vinter)/i.test(txt)) {
                    return txt;
                }
            }
            probe = probe.previousElementSibling;
            hops++;
        }
        return fallback || '';
    }

    function collectStudyplanUpcomingExamCourses() {
        if (!IS_TOP_WINDOW) return [];
        if (window.location.hostname !== 'studieplan.dtu.dk') return [];

        var todayTs = startOfTodayUtcTs();
        var candidateTables = [];
        document.querySelectorAll('table').forEach(function (table) {
            var idx = getStudyplanExamTableColumnIndexes(table);
            if (idx.placement < 0) return;

            var semesterNum = findStudyplanSemesterNumberForTable(table);
            var tablePeriodText = getStudyplanTablePeriodText(table);
            var hasCandidate = false;

            table.querySelectorAll('tr').forEach(function (row) {
                if (hasCandidate) return;
                var courseInfo = findStudyplanCourseInRow(row);
                if (!courseInfo || !courseInfo.code) return;
                var placementText = getRowCellTextByVisualIndex(row, idx.placement);
                var resultText = getRowCellTextByVisualIndex(row, idx.result);

                if (isLikelyCompletedStudyplanResult(resultText)) return;
                var rowPeriodText = getStudyplanRowPeriodText(row, tablePeriodText);
                var rowPeriodInfo = inferStudyplanPeriodInfo(rowPeriodText);
                if (!isStudyplanPeriodCurrentOrFuture(rowPeriodInfo, todayTs)) return;
                var tokens = parseStudyplanPlacementTokens(placementText);
                if (!tokens.length) {
                    tokens = parseStudyplanPlacementTokens(normalizeExamClusterText((placementText ? (placementText + ' ') : '') + rowPeriodText));
                }
                var placementMonthTags = extractStudyplanExplicitMonthTags(placementText);
                var rowPeriodMonthTags = extractStudyplanExplicitMonthTags(rowPeriodText);
                if (!placementMonthTags.length && !tokens.length && rowPeriodMonthTags.length) {
                    placementMonthTags = rowPeriodMonthTags.slice();
                }
                var monthTags = placementMonthTags.length ? placementMonthTags : parseStudyplanMonthTags(rowPeriodText);
                if (tokens.length || monthTags.length) {
                    hasCandidate = true;
                } else if (rowPeriodInfo && (typeof rowPeriodInfo.startTs === 'number' || typeof rowPeriodInfo.endTs === 'number')) {
                    // Keep current/future period rows even when placement text is missing.
                    hasCandidate = true;
                }
            });

            if (hasCandidate) {
                candidateTables.push({
                    table: table,
                    semesterNum: semesterNum
                });
            }
        });

        if (!candidateTables.length) return [];

        var maxSemester = null;
        candidateTables.forEach(function (c) {
            if (typeof c.semesterNum === 'number' && isFinite(c.semesterNum)) {
                if (maxSemester === null || c.semesterNum > maxSemester) maxSemester = c.semesterNum;
            }
        });

        var selectedTables;
        if (maxSemester === null) {
            selectedTables = [candidateTables[candidateTables.length - 1].table];
        } else {
            selectedTables = candidateTables
                .filter(function (c) { return c.semesterNum === maxSemester; })
                .map(function (c) { return c.table; });
        }

        var out = [];
        var seen = Object.create(null);

        selectedTables.forEach(function (table) {
            var idx = getStudyplanExamTableColumnIndexes(table);
            var tablePeriodText = getStudyplanTablePeriodText(table);
            var semesterNum = findStudyplanSemesterNumberForTable(table);

            table.querySelectorAll('tr').forEach(function (row) {
                var courseInfo = findStudyplanCourseInRow(row);
                if (!courseInfo || !courseInfo.code) return;
                var code = courseInfo.code;
                var anchor = courseInfo.anchor;
                var placementText = getRowCellTextByVisualIndex(row, idx.placement);
                var resultText = getRowCellTextByVisualIndex(row, idx.result);

                if (isLikelyCompletedStudyplanResult(resultText)) return;
                var rowPeriodText = getStudyplanRowPeriodText(row, tablePeriodText);
                var rowPeriodInfo = inferStudyplanPeriodInfo(rowPeriodText);
                if (!isStudyplanPeriodCurrentOrFuture(rowPeriodInfo, todayTs)) return;
                var tokens = parseStudyplanPlacementTokens(placementText);
                if (!tokens.length) {
                    tokens = parseStudyplanPlacementTokens(normalizeExamClusterText((placementText ? (placementText + ' ') : '') + rowPeriodText));
                }
                var placementMonthTags = extractStudyplanExplicitMonthTags(placementText);
                var rowPeriodMonthTags = extractStudyplanExplicitMonthTags(rowPeriodText);
                if (!placementMonthTags.length && !tokens.length && rowPeriodMonthTags.length) {
                    placementMonthTags = rowPeriodMonthTags.slice();
                }
                var monthTags = placementMonthTags.length ? placementMonthTags : parseStudyplanMonthTags(rowPeriodText);
                if (!tokens.length && !monthTags.length) {
                    if (!rowPeriodInfo || (typeof rowPeriodInfo.startTs !== 'number' && typeof rowPeriodInfo.endTs !== 'number')) {
                        return;
                    }
                }

                var key = code + '|' + tokens.join(',') + '|' + monthTags.join(',');
                if (seen[key]) return;
                seen[key] = true;

                out.push({
                    code: code,
                    name: extractStudyplanCourseName(anchor, code, row),
                    placementText: placementText,
                    periodText: rowPeriodText,
                    tokens: tokens,
                    monthTags: monthTags,
                    placementMonthTags: placementMonthTags,
                    semesterNumber: semesterNum,
                    periodKind: rowPeriodInfo ? rowPeriodInfo.kind : '',
                    periodIsCurrent: isStudyplanPeriodCurrent(rowPeriodInfo, todayTs),
                    periodStartTs: rowPeriodInfo && typeof rowPeriodInfo.startTs === 'number' ? rowPeriodInfo.startTs : null,
                    periodEndTs: rowPeriodInfo && typeof rowPeriodInfo.endTs === 'number' ? rowPeriodInfo.endTs : null
                });
            });
        });

        var currentRows = out.filter(function (c) { return !!c.periodIsCurrent; });
        var anchorTs = null;
        if (currentRows.length) {
            currentRows.forEach(function (c) {
                if (typeof c.periodStartTs === 'number') {
                    if (anchorTs === null || c.periodStartTs < anchorTs) anchorTs = c.periodStartTs;
                }
            });
            if (anchorTs === null) anchorTs = todayTs;
        } else {
            out.forEach(function (c) {
                if (typeof c.periodStartTs === 'number' && c.periodStartTs >= todayTs) {
                    if (anchorTs === null || c.periodStartTs < anchorTs) anchorTs = c.periodStartTs;
                } else if (typeof c.periodEndTs === 'number' && c.periodEndTs >= todayTs) {
                    if (anchorTs === null || todayTs < anchorTs) anchorTs = todayTs;
                }
            });
        }

        if (anchorTs === null) return out;

        var fromAnchor = out.filter(function (c) {
            if (typeof c.periodStartTs === 'number' && typeof c.periodEndTs === 'number') {
                return c.periodEndTs >= anchorTs;
            }
            if (typeof c.periodStartTs === 'number') return c.periodStartTs >= anchorTs;
            if (typeof c.periodEndTs === 'number') return c.periodEndTs >= anchorTs;
            return true;
        });

        return fromAnchor.length ? fromAnchor : out;
    }

    function buildStudyplanExamCourseSig(courses) {
        if (!Array.isArray(courses) || !courses.length) return 'none';
        return courses.map(function (c) {
            return [
                c.code,
                c.tokens.join(','),
                c.monthTags.join(','),
                (Array.isArray(c.placementMonthTags) ? c.placementMonthTags.join(',') : ''),
                c.placementText,
                c.periodText,
                c.semesterNumber || ''
            ].join('|');
        }).join('||');
    }

    function arrayIntersects(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) return false;
        var set = Object.create(null);
        a.forEach(function (v) { set[v] = true; });
        for (var i = 0; i < b.length; i++) {
            if (set[b[i]]) return true;
        }
        return false;
    }

    function getExamEntryDateTs(entry) {
        if (entry && typeof entry.dateTs === 'number' && isFinite(entry.dateTs)) return entry.dateTs;
        if (entry && entry.dateIso) return parseIsoToUtcTs(entry.dateIso);
        return null;
    }

    function normalizeExamCalendarEntry(entry) {
        if (!entry) return null;
        var ts = getExamEntryDateTs(entry);
        if (ts === null) return null;
        return {
            dateTs: ts,
            dateIso: entry.dateIso || '',
            dateLabel: entry.dateLabel || '',
            period: normalizeExamClusterText(entry.period || ''),
            text: normalizeExamClusterText(entry.text || ''),
            codes: Array.isArray(entry.codes) ? entry.codes.map(function (c) { return String(c || '').toUpperCase(); }) : [],
            tokens: Array.isArray(entry.tokens) ? entry.tokens.map(function (t) { return normalizeExamSlotToken(t); }).filter(Boolean) : [],
            tags: Array.isArray(entry.tags) ? entry.tags.map(function (t) { return String(t || '').toLowerCase(); }) : []
        };
    }
    function chooseExamEntryForCourse(course, entries, todayTs) {
        if (!course || !Array.isArray(entries) || !entries.length) return null;

        function getIsoMonth(iso) {
            var mm = String(iso || '').match(/^\d{4}-(\d{2})-\d{2}$/);
            if (!mm || !mm[1]) return null;
            var n = parseInt(mm[1], 10);
            return isNaN(n) ? null : n;
        }

        var placementMonthTags = Array.isArray(course.placementMonthTags) ? course.placementMonthTags : [];
        var strictCandidates = [];
        var fallbackCandidates = [];

        entries.forEach(function (entry) {
            if (!entry) return;

            var score = 0;
            var reason = '';
            var entryTextTags = parseStudyplanMonthTags(entry.text || '');
            var textMonthMatch = placementMonthTags.length && arrayIntersects(placementMonthTags, entryTextTags);
            var periodMonthMatch = placementMonthTags.length && arrayIntersects(placementMonthTags, entry.tags);
            var isoMonth = getIsoMonth(entry.dateIso);
            var dateMonthMatch = false;
            if (placementMonthTags.length && isoMonth !== null) {
                for (var i = 0; i < placementMonthTags.length; i++) {
                    var num = studyplanMonthTagToNumber(placementMonthTags[i]);
                    if (num !== null && num === isoMonth) {
                        dateMonthMatch = true;
                        break;
                    }
                }
            }
            var placementMonthMatch = textMonthMatch || periodMonthMatch || dateMonthMatch;
            var periodTagMatch = arrayIntersects(course.monthTags, entry.tags);
            var isReplacementExam = /\breplacement\s+exam\b|\berstatningseksamen\b/i.test(entry.text || '');
            var tokenMatch = arrayIntersects(course.tokens, entry.tokens);
            var codeMatch = entry.codes.indexOf(course.code) !== -1;

            if (codeMatch) {
                score = 360;
                reason = 'course';
            } else if (tokenMatch) {
                score = 260;
                reason = 'slot';
            } else if (textMonthMatch) {
                score = 225;
                reason = 'month_exact';
                if (/\b3-?weeks?\s+course\b|\b3-?ugers?\s+kursus\b/i.test(entry.text || '')) {
                    score += 20;
                }
                if (isReplacementExam && course.monthTags.indexOf('reexam') === -1) {
                    score -= 25;
                }
            } else if (periodTagMatch) {
                score = placementMonthTags.length ? 70 : 120;
                reason = 'period';
                if (isReplacementExam && course.monthTags.indexOf('reexam') === -1) {
                    score -= 20;
                }
            }
            if (!score) return;

            var candidate = {
                score: score,
                reason: reason,
                entry: entry,
                upcoming: entry.dateTs >= todayTs,
                placementMonthMatch: !!placementMonthMatch
            };

            if (placementMonthTags.length) {
                if (placementMonthMatch) strictCandidates.push(candidate);
                else fallbackCandidates.push(candidate);
            } else {
                strictCandidates.push(candidate);
            }
        });

        // Hard safety: explicit month placement must not map cross-month.
        if (placementMonthTags.length) {
            if (!strictCandidates.length) return null;
            strictCandidates.sort(function (a, b) {
                if (a.score !== b.score) return b.score - a.score;
                if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
                if (a.upcoming && b.upcoming) return a.entry.dateTs - b.entry.dateTs;
                return b.entry.dateTs - a.entry.dateTs;
            });
            return strictCandidates[0];
        }

        var candidates = strictCandidates.length ? strictCandidates : fallbackCandidates;
        if (!candidates.length) return null;
        candidates.sort(function (a, b) {
            if (a.score !== b.score) return b.score - a.score;
            if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
            if (a.upcoming && b.upcoming) return a.entry.dateTs - b.entry.dateTs;
            return b.entry.dateTs - a.entry.dateTs;
        });
        return candidates[0];
    }

    function mapStudyplanCoursesToExamDates(courses, rawEntries) {


        var todayTs = startOfTodayUtcTs();
        var entries = (rawEntries || []).map(normalizeExamCalendarEntry).filter(Boolean);
        var mapped = [];

        courses.forEach(function (course) {
            var match = chooseExamEntryForCourse(course, entries, todayTs);
            if (!match || !match.entry) return;
            var dayDelta = diffDaysUtc(todayTs, match.entry.dateTs);
            mapped.push({
                code: course.code,
                name: course.name,
                placementText: course.placementText,
                periodText: course.periodText,
                matchReason: match.reason,
                dateTs: match.entry.dateTs,
                dateIso: match.entry.dateIso,
                dateLabel: match.entry.dateLabel || formatIsoDateForDisplay(match.entry.dateIso),
                examPeriod: match.entry.period,
                examText: match.entry.text,
                daysUntil: dayDelta
            });
        });

        mapped = mapped.filter(function (item) {
            return item.dateTs >= todayTs;
        });

        mapped.sort(function (a, b) {
            return a.dateTs - b.dateTs;
        });

        for (var i = 1; i < mapped.length; i++) {
            mapped[i].gapFromPrev = diffDaysUtc(mapped[i - 1].dateTs, mapped[i].dateTs);
        }
        if (mapped.length) mapped[0].gapFromPrev = null;
        return mapped;
    }

    function buildExamClusterWarnings(mapped) {
        var warnings = [];
        if (!Array.isArray(mapped) || mapped.length < 2) return warnings;

        var byDate = Object.create(null);
        mapped.forEach(function (item) {
            if (!item || !item.dateIso) return;
            if (!byDate[item.dateIso]) byDate[item.dateIso] = [];
            byDate[item.dateIso].push(item);
        });

        Object.keys(byDate).forEach(function (iso) {
            var items = byDate[iso];
            if (items.length >= 2) {
                warnings.push({
                    level: 'critical',
                    text: items.length + ' exams on ' + formatIsoDateForDisplay(iso)
                });
            }
        });

        for (var i = 1; i < mapped.length; i++) {
            var gap = mapped[i].gapFromPrev;
            if (typeof gap !== 'number') continue;
            if (gap === 1) {
                warnings.push({
                    level: 'high',
                    text: '1 day between ' + mapped[i - 1].code + ' and ' + mapped[i].code
                });
            }
        }

        var denseAdded = false;
        for (var start = 0; start < mapped.length && !denseAdded; start++) {
            for (var end = start + 2; end < mapped.length; end++) {
                var span = diffDaysUtc(mapped[start].dateTs, mapped[end].dateTs);
                if (span <= 4) {
                    warnings.push({
                        level: 'medium',
                        text: (end - start + 1) + ' exams within ' + (span + 1) + ' days'
                    });
                    denseAdded = true;
                    break;
                }
            }
        }

        return warnings;
    }

    function summarizeExamClusterWarnings(warnings) {
        var out = {
            level: null,
            sameDay: 0,
            oneDay: 0,
            dense: null
        };
        if (!Array.isArray(warnings) || !warnings.length) return out;

        warnings.forEach(function (w) {
            if (!w || !w.text) return;
            if (w.level === 'critical') out.level = 'critical';
            else if (!out.level && w.level === 'high') out.level = 'high';
            else if (!out.level && w.level === 'medium') out.level = 'medium';

            if (/exams on/i.test(w.text)) out.sameDay++;
            if (/1 day between/i.test(w.text)) out.oneDay++;
            if (!out.dense && /within\s+\d+\s+days/i.test(w.text)) out.dense = w.text;
        });

        return out;
    }

    function clearNodeChildren(node) {
        if (!node) return;
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function ensureStudyplanExamClusterContainer() {
        var container = document.querySelector('[data-dtu-exam-cluster]');
        if (!container) {
            container = document.createElement('div');
            markExt(container);
            container.setAttribute('data-dtu-exam-cluster', '1');
            container.style.cssText = darkModeEnabled
                ? 'margin: 10px 0 12px 0; padding: 12px 14px; border-radius: 6px; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; '
                + 'background-color: #2d2d2d; border: 1px solid #404040; color: #e0e0e0; font-family: inherit;'
                : 'margin: 10px 0 12px 0; padding: 12px 14px; border-radius: 6px; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; '
                + 'background-color: #ffffff; border: 1px solid #e0e0e0; color: #222; font-family: inherit;';

            var title = document.createElement('div');
            markExt(title);
            title.setAttribute('data-dtu-exam-cluster-title', '1');
            title.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;flex-wrap:wrap;';
            var titleText = document.createElement('span');
            markExt(titleText);
            titleText.textContent = 'Exam Timeline and Clash Risk';
            titleText.style.cssText = 'font-weight:700;font-size:14px;';
            title.appendChild(titleText);
            container.appendChild(title);

            var body = document.createElement('div');
            markExt(body);
            body.setAttribute('data-dtu-exam-cluster-body', '1');
            body.style.cssText = 'font-size: 12px; line-height: 1.35;';
            container.appendChild(body);
        }

        var preferredParent = null;
        var preferredBefore = null;
        var fixedPanel = document.querySelector('.col-md-6 .fixed.scrollLocked');
        if (fixedPanel) {
            preferredParent = fixedPanel;
            preferredBefore = fixedPanel.querySelector('div[style*="margin-top:10px"]');
        }

        if (!preferredParent) {
            var anchor = document.querySelector('.box');
            if (anchor && anchor.parentNode) {
                preferredParent = anchor.parentNode;
                preferredBefore = anchor;
            }
        }

        if (preferredParent) {
            var needsMove = container.parentNode !== preferredParent;
            if (needsMove) {
                preferredParent.insertBefore(container, preferredBefore || null);
            }
        } else if (!container.parentNode && document.body) {
            document.body.insertBefore(container, document.body.firstChild);
        }

        return container;
    }

    function renderExamClusterStatus(body, text, isWarn) {
        clearNodeChildren(body);
        var el = document.createElement('div');
        markExt(el);
        el.textContent = text;
        var statusColor = isWarn
            ? (darkModeEnabled ? 'var(--dtu-ad-status-warning)' : 'var(--dtu-ad-status-warning-strong)')
            : 'var(--dtu-ad-status-info)';
        el.style.cssText = 'font-size: 12px; color: ' + statusColor + ';';
        body.appendChild(el);
        body.setAttribute('data-dtu-exam-cluster-state', isWarn ? 'warn' : 'info');
    }

    function renderStudyplanExamCluster(courses, mapped, response, errorText) {
        var container = ensureStudyplanExamClusterContainer();
        var body = container.querySelector('[data-dtu-exam-cluster-body]');
        if (!body) return;

        if (errorText) {
            renderExamClusterStatus(body, errorText, true);
            return;
        }
        if (!courses.length) {
            renderExamClusterStatus(body, 'No upcoming courses with exam placement found in Study Planner.', false);
            return;
        }
        if (!mapped.length) {
            renderExamClusterStatus(body, 'No matching exam dates found for current planned courses.', true);
            return;
        }

        clearNodeChildren(body);
        var isDark = !!darkModeEnabled;
        var muted = isDark ? '#bababa' : '#5e6976';
        var softBorder = isDark ? '#3b3b3b' : '#dce2ea';
        // Use dark 1 for timeline cards to avoid "double dark" (dark 2 on dark UIs feels muddy).
        var softBg = isDark ? '#1a1a1a' : '#f6f8fb';
        var railBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
        var safeClr = 'var(--dtu-ad-status-success)';
        var cautionClr = isDark ? 'var(--dtu-ad-status-warning)' : 'var(--dtu-ad-status-warning-strong)';
        var dangerClr = 'var(--dtu-ad-status-danger)';
        var infoClr = 'var(--dtu-ad-status-info)';
        var todayTs = startOfTodayUtcTs();
        // Keep period detection available for future use, but do not surface it in the UI by default.
        // var currentPeriodLabel = detectCurrentStudyplanPeriodLabel(courses, todayTs);

        // Inject animation keyframes once (used for the tightest-gap pulse).
        try {
            if (!document.querySelector('#dtu-exam-cluster-tl-style')) {
                var st = document.createElement('style');
                st.id = 'dtu-exam-cluster-tl-style';
                st.textContent = '@keyframes dtuExamTightGapPulse{'
                    + '0%{transform:scale(1);box-shadow:0 0 0 0 rgba(var(--dtu-exam-pulse-rgb,232,63,72),0.35);}'
                    + '55%{transform:scale(1.03);box-shadow:0 0 0 8px rgba(var(--dtu-exam-pulse-rgb,232,63,72),0);}'
                    + '100%{transform:scale(1);box-shadow:0 0 0 0 rgba(var(--dtu-exam-pulse-rgb,232,63,72),0);}'
                    + '}';
                document.head.appendChild(st);
            }
        } catch (eS) { }

        var upcoming = mapped.filter(function (m) { return m.daysUntil >= 0; });
        var nextItem = upcoming.length ? upcoming[0] : mapped[0];
        var tightestGap = null;
        mapped.forEach(function (m) {
            if (typeof m.gapFromPrev !== 'number') return;
            if (tightestGap === null || m.gapFromPrev < tightestGap) tightestGap = m.gapFromPrev;
        });

        function formatShortWeekdayMonthDayUtc(ts) {
            var d = new Date(ts);
            var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            var wd = weekdays[d.getUTCDay()];
            var mon = months[d.getUTCMonth()];
            var day = d.getUTCDate();
            return wd + ', ' + mon + ' ' + day;
        }

        function classifyGap(days) {
            if (typeof days !== 'number') return { level: 'none', color: muted };
            if (days < 3) return { level: 'danger', color: dangerClr };
            if (days <= 7) return { level: 'caution', color: cautionClr };
            return { level: 'safe', color: safeClr };
        }

        function computeGapHeight(days) {
            if (typeof days !== 'number') return 20;
            var d = Math.max(0, days);
            // Keep relative density cues, but add more breathing room around gap pills.
            var h = 14 + (d * 3.6);
            if (h < 24) h = 24;
            if (h > 96) h = 96;
            return Math.round(h);
        }

        // (No separate "Next exam" header -- first timeline card is promoted to hero.)

        var warnings = buildExamClusterWarnings(mapped);
        if (warnings.length) {
            var riskSummary = summarizeExamClusterWarnings(warnings);
            var riskBox = document.createElement('div');
            markExt(riskBox);
            var riskBorder = riskSummary.level === 'critical'
                ? dangerClr
                : (riskSummary.level === 'high' ? cautionClr : infoClr);
            var riskBg = riskSummary.level === 'critical'
                ? (darkModeEnabled ? 'rgba(var(--dtu-ad-status-danger-rgb),0.14)' : 'rgba(var(--dtu-ad-status-danger-rgb),0.10)')
                : (riskSummary.level === 'high'
                    ? (darkModeEnabled ? 'rgba(var(--dtu-ad-status-warning-rgb),0.14)' : 'rgba(var(--dtu-ad-status-warning-strong-rgb),0.10)')
                    : (darkModeEnabled ? 'rgba(var(--dtu-ad-status-info-rgb),0.12)' : 'rgba(var(--dtu-ad-status-info-rgb),0.08)'));
            riskBox.style.cssText = 'margin-bottom:8px; padding:8px 10px; border-radius:6px; border:1px solid ' + riskBorder + '; background:' + riskBg + ';';

            var riskTitle = document.createElement('div');
            markExt(riskTitle);
            riskTitle.style.cssText = 'font-size:11px; font-weight:700; margin-bottom:3px; '
                + 'color:' + (darkModeEnabled ? '#f2f2f2' : '#1f2937') + ';';
            riskTitle.textContent = riskSummary.level === 'critical' ? 'Risk summary: High'
                : (riskSummary.level === 'high' ? 'Risk summary: Elevated' : 'Risk summary');
            riskBox.appendChild(riskTitle);

            var details = [];
            if (riskSummary.sameDay > 0) details.push(riskSummary.sameDay + ' same-day clash' + (riskSummary.sameDay > 1 ? 'es' : ''));
            if (riskSummary.oneDay > 0) details.push(riskSummary.oneDay + ' one-day gap');
            if (riskSummary.dense) {
                var denseText = String(riskSummary.dense).replace(/^.*?:\s*/, '');
                details.push(denseText);
            }
            if (!details.length) details.push('Tight exam clustering detected');

            var riskText = document.createElement('div');
            markExt(riskText);
            riskText.style.cssText = 'font-size:11px; color:' + (darkModeEnabled ? '#d9d9d9' : '#374151') + ';';
            riskText.textContent = details.join(' · ');
            riskBox.appendChild(riskText);

            body.appendChild(riskBox);
        }

        // --- Visual timeline ---
        var timeline = document.createElement('div');
        markExt(timeline);
        timeline.setAttribute('data-dtu-exam-timeline', '1');
        timeline.style.cssText = 'position:relative;display:flex;flex-direction:column;gap:0;';
        // Cap height and scroll inside the widget so it stays usable in the fixed Study Planner side panel.
        try {
            var maxH = Math.max(250, Math.min(430, Math.floor(window.innerHeight * 0.44)));
            timeline.style.setProperty('max-height', maxH + 'px', 'important');
        } catch (eH) {
            timeline.style.setProperty('max-height', '400px', 'important');
        }
        timeline.style.setProperty('overflow-y', 'auto', 'important');
        timeline.style.setProperty('padding-right', '6px', 'important');

        // Tightest gap pill -- insert into the title row (same horizontal line)
        if (tightestGap !== null) {
            var titleRow = container.querySelector('[data-dtu-exam-cluster-title]');
            if (titleRow) {
                // Remove any previous pill (re-render)
                var oldPill = titleRow.querySelector('[data-dtu-exam-tightest]');
                if (oldPill) oldPill.remove();

                var tgMeta = classifyGap(tightestGap);
                var tgPill = document.createElement('span');
                markExt(tgPill);
                tgPill.setAttribute('data-dtu-exam-tightest', '1');
                tgPill.textContent = 'Tightest gap: ' + tightestGap + 'd';
                tgPill.style.cssText = 'padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;flex-shrink:0;';
                tgPill.style.setProperty('color', tgMeta.color, 'important');
                tgPill.style.setProperty('border', '1px solid ' + tgMeta.color, 'important');
                var tgPillBg = isDark
                    ? (tgMeta.level === 'danger' ? 'rgba(var(--dtu-ad-status-danger-rgb),0.15)' : (tgMeta.level === 'caution' ? 'rgba(var(--dtu-ad-status-warning-rgb),0.12)' : 'rgba(var(--dtu-ad-status-success-rgb),0.10)'))
                    : (tgMeta.level === 'danger' ? 'rgba(var(--dtu-ad-status-danger-rgb),0.08)' : (tgMeta.level === 'caution' ? 'rgba(var(--dtu-ad-status-warning-strong-rgb),0.06)' : 'rgba(var(--dtu-ad-status-success-rgb),0.06)'));
                tgPill.style.setProperty('background', tgPillBg, 'important');
                tgPill.style.setProperty('background-color', tgPillBg, 'important');
                if (tgMeta.level === 'danger') {
                    tgPill.style.setProperty('--dtu-exam-pulse-rgb', '232,63,72');
                    tgPill.style.setProperty('animation', 'dtuExamTightGapPulse 1.4s ease-out infinite', 'important');
                }
                titleRow.appendChild(tgPill);
            }
        }

        body.appendChild(timeline);

        function buildGapBlock(gapDays) {
            var meta = classifyGap(gapDays);
            var h = computeGapHeight(gapDays);

            // Wrapper: centers the pill badge on the rail line
            var row = document.createElement('div');
            markExt(row);
            row.style.cssText = 'position:relative;z-index:2;display:flex;align-items:center;'
                + 'height:' + h + 'px;min-height:' + h + 'px;padding:4px 0;margin:2px 0;';

            // Rail segment (colored bar behind the pill)
            var railCol = document.createElement('div');
            markExt(railCol);
            railCol.style.cssText = 'width:22px;flex:0 0 22px;position:relative;display:flex;justify-content:center;align-self:stretch;';
            var seg = document.createElement('div');
            markExt(seg);
            seg.setAttribute('aria-hidden', 'true');
            seg.style.cssText = 'position:absolute;left:9px;top:0;bottom:0;width:4px;border-radius:999px;';
            seg.style.setProperty('background', meta.color, 'important');
            seg.style.setProperty('background-color', meta.color, 'important');
            railCol.appendChild(seg);
            row.appendChild(railCol);

            // Pill badge anchored to the rail
            var pill = document.createElement('div');
            markExt(pill);
            var txt = (gapDays === 0) ? 'Same day' : (gapDays + 'd gap');
            pill.textContent = txt;
            pill.style.cssText = 'margin-left:-4px;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;'
                + 'white-space:nowrap;line-height:1.4;z-index:3;';
            var pillBg = isDark
                ? (meta.level === 'danger' ? 'rgba(var(--dtu-ad-status-danger-rgb),0.18)' : (meta.level === 'caution' ? 'rgba(var(--dtu-ad-status-warning-rgb),0.15)' : 'rgba(var(--dtu-ad-status-success-rgb),0.12)'))
                : (meta.level === 'danger' ? 'rgba(var(--dtu-ad-status-danger-rgb),0.12)' : (meta.level === 'caution' ? 'rgba(var(--dtu-ad-status-warning-strong-rgb),0.10)' : 'rgba(var(--dtu-ad-status-success-rgb),0.08)'));
            pill.style.setProperty('background', pillBg, 'important');
            pill.style.setProperty('background-color', pillBg, 'important');
            pill.style.setProperty('color', meta.color, 'important');
            pill.style.setProperty('border', '1px solid ' + meta.color, 'important');
            if (meta.level === 'danger') {
                pill.style.setProperty('--dtu-exam-pulse-rgb', '232,63,72');
                pill.style.setProperty('animation', 'dtuExamTightGapPulse 1.4s ease-out infinite', 'important');
            }
            row.appendChild(pill);

            return row;
        }

        function buildExamCard(item, idx, accentColor, gapRisk) {
            var isHero = (idx === 0);
            var borderAccent = isHero ? 'var(--dtu-ad-accent)' : accentColor;
            var riskLevel = gapRisk ? gapRisk.level : 'none';

            var row = document.createElement('div');
            markExt(row);
            row.style.cssText = 'position:relative;z-index:1;display:flex;gap:12px;align-items:stretch;';

            // --- Rail column with connector + node ---
            var rail = document.createElement('div');
            markExt(rail);
            rail.style.cssText = 'width:22px;flex:0 0 22px;position:relative;display:flex;justify-content:center;';

            var connector = document.createElement('div');
            markExt(connector);
            connector.setAttribute('aria-hidden', 'true');
            connector.style.cssText = 'position:absolute;left:9px;top:0;bottom:0;width:4px;border-radius:999px;z-index:0;';
            connector.style.setProperty('background', railBg, 'important');
            connector.style.setProperty('background-color', railBg, 'important');
            rail.appendChild(connector);

            var nodeWrap = document.createElement('div');
            markExt(nodeWrap);
            nodeWrap.style.cssText = 'position:relative;z-index:1;margin-top:' + (isHero ? '10px' : '10px') + ';';

            var node = document.createElement('div');
            markExt(node);
            node.setAttribute('aria-hidden', 'true');
            var nodeSize = isHero ? 14 : 10;
            node.style.cssText = 'width:' + nodeSize + 'px;height:' + nodeSize + 'px;border-radius:999px;box-sizing:border-box;';
            node.style.setProperty('background', isDark ? '#1a1a1a' : '#ffffff', 'important');
            node.style.setProperty('background-color', isDark ? '#1a1a1a' : '#ffffff', 'important');
            node.style.setProperty('border', (isHero ? '3px' : '2.5px') + ' solid ' + borderAccent, 'important');
            node.style.setProperty('box-shadow', isDark ? '0 0 0 2px #2d2d2d' : '0 0 0 2px #ffffff', 'important');

            nodeWrap.appendChild(node);
            rail.appendChild(nodeWrap);

            // --- Card ---
            var card = document.createElement('div');
            markExt(card);
            card.style.cssText = 'flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;'
                + 'padding:' + (isHero ? '8px 12px' : '6px 10px') + ';border-radius:8px;';

            // Risk-tinted background for danger/caution gaps
            var cardBg = softBg;
            var cardBorder = softBorder;
            if (riskLevel === 'danger') {
                cardBg = isDark ? 'rgba(var(--dtu-ad-status-danger-rgb),0.10)' : 'rgba(var(--dtu-ad-status-danger-rgb),0.06)';
                cardBorder = isDark ? 'rgba(var(--dtu-ad-status-danger-rgb),0.35)' : 'rgba(var(--dtu-ad-status-danger-rgb),0.25)';
            } else if (riskLevel === 'caution' && !isHero) {
                cardBg = isDark ? 'rgba(var(--dtu-ad-status-warning-rgb),0.08)' : 'rgba(var(--dtu-ad-status-warning-strong-rgb),0.05)';
                cardBorder = isDark ? 'rgba(var(--dtu-ad-status-warning-rgb),0.24)' : 'rgba(var(--dtu-ad-status-warning-strong-rgb),0.20)';
            }
            card.style.setProperty('background', cardBg, 'important');
            card.style.setProperty('background-color', cardBg, 'important');
            card.style.setProperty('border', '1px solid ' + cardBorder, 'important');
            card.style.setProperty('border-left', (isHero ? '4px' : '3px') + ' solid ' + borderAccent, 'important');
            card.style.setProperty('color', isDark ? '#e0e0e0' : '#1f2937', 'important');

            // --- Left: code + name ---
            var left = document.createElement('div');
            markExt(left);
            left.style.cssText = 'min-width:0;flex:1;display:flex;flex-direction:column;gap:1px;';

            // Hero badge row
            if (isHero) {
                var heroBadge = document.createElement('span');
                markExt(heroBadge);
                heroBadge.textContent = 'Next up';
                heroBadge.style.cssText = 'display:inline-block;padding:1px 7px;border-radius:999px;font-size:9px;font-weight:700;'
                    + 'text-transform:uppercase;letter-spacing:0.6px;margin-bottom:2px;width:fit-content;';
                heroBadge.style.setProperty('background', 'var(--dtu-ad-accent)', 'important');
                heroBadge.style.setProperty('background-color', 'var(--dtu-ad-accent)', 'important');
                heroBadge.style.setProperty('color', '#fff', 'important');
                left.appendChild(heroBadge);
            }

            var code = document.createElement('div');
            markExt(code);
            code.textContent = item.code;
            code.style.cssText = 'font-weight:700;font-size:' + (isHero ? '13px' : '12px') + ';';
            left.appendChild(code);

            var name = document.createElement('div');
            markExt(name);
            name.textContent = item.name || '';
            name.style.cssText = 'font-size:11px;opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            name.style.setProperty('background-color', 'transparent', 'important');
            name.style.setProperty('background', 'transparent', 'important');
            left.appendChild(name);

            // --- Right: date + countdown for hero ---
            var right = document.createElement('div');
            markExt(right);
            right.style.cssText = 'text-align:right;flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:0;';

            if (isHero && nextItem) {
                var countdown = document.createElement('div');
                markExt(countdown);
                var cdText = nextItem.daysUntil === 0 ? 'Today' : ('in ' + nextItem.daysUntil + 'd');
                countdown.textContent = cdText;
                countdown.style.cssText = 'font-weight:700;font-size:18px;line-height:1.1;';
                countdown.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
                right.appendChild(countdown);
            }

            var date = document.createElement('div');
            markExt(date);
            date.textContent = formatShortWeekdayMonthDayUtc(item.dateTs);
            date.style.cssText = 'font-weight:600;font-size:11px;color:' + muted + ';';
            right.appendChild(date);

            card.appendChild(left);
            card.appendChild(right);

            row.appendChild(rail);
            row.appendChild(card);
            return row;
        }

        var maxItems = 8;
        var timelineItems = mapped.slice(0, maxItems);
        timelineItems.forEach(function (item, idx) {
            var gapRisk = null;
            if (idx > 0 && typeof item.gapFromPrev === 'number') {
                timeline.appendChild(buildGapBlock(item.gapFromPrev));
                gapRisk = classifyGap(item.gapFromPrev);
            }

            var accent = muted;
            if (gapRisk) accent = gapRisk.color;
            timeline.appendChild(buildExamCard(item, idx, accent, gapRisk));
        });

        if (mapped.length > maxItems) {
            var more = document.createElement('div');
            markExt(more);
            more.textContent = 'Showing next ' + maxItems + ' of ' + mapped.length + ' exams';
            more.style.cssText = 'margin-top:6px;font-size:10px;text-align:right;color:' + (isDark ? '#9aa1aa' : '#6b7280') + ';';
            body.appendChild(more);
        }

        var disclaimer = document.createElement('div');
        markExt(disclaimer);
        disclaimer.style.cssText = 'margin-top:8px; text-align:right; font-size:10px; '
            + 'color:' + (darkModeEnabled ? '#9aa1aa' : '#6b7280') + ';';
        disclaimer.textContent = 'Please double-check dates in the official DTU exam schedule.';
        body.appendChild(disclaimer);
    }
    // ===== GRADE COUNTDOWN (on studyplan course rows) =====
    var GRADE_COUNTDOWN_ATTR = 'data-dtu-grade-countdown';

    function addWorkdays(startTs, numDays) {
        var d = new Date(startTs);
        var added = 0;
        while (added < numDays) {
            d.setDate(d.getDate() + 1);
            var dow = d.getDay();
            if (dow !== 0 && dow !== 6) added++;
        }
        return d.getTime();
    }

    function formatGradeDate(ts) {
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var d = new Date(ts);
        return d.getDate() + ' ' + months[d.getMonth()];
    }

    function injectGradeCountdowns(mapped) {
        // Remove old badges
        document.querySelectorAll('[' + GRADE_COUNTDOWN_ATTR + ']').forEach(function (el) { el.remove(); });

        if (!mapped || !mapped.length) return;

        var now = Date.now();
        var isDark = darkModeEnabled;

        // Find all course code links on the page
        var codeLinks = document.querySelectorAll('a.coursecode');
        var codeLinkMap = {};
        codeLinks.forEach(function (a) {
            var code = (a.textContent || '').trim();
            if (code) codeLinkMap[code] = a;
        });

        mapped.forEach(function (m) {
            if (!m.dateTs || !m.code) return;

            // Exam must be in the past (after 17:00 on exam day)
            var examEndTs = m.dateTs + (17 * 60 * 60 * 1000);
            if (now < examEndTs) return;

            var gradeByTs = addWorkdays(m.dateTs, 20);
            var gradeDate = formatGradeDate(gradeByTs);
            var daysLeft = Math.ceil((gradeByTs - now) / (1000 * 60 * 60 * 24));

            var link = codeLinkMap[m.code];
            if (!link) return;

            // Find the name span next to the course code link
            var nameSpan = link.nextElementSibling;
            if (!nameSpan) nameSpan = link.parentElement;

            var badge = document.createElement('span');
            markExt(badge);
            badge.setAttribute(GRADE_COUNTDOWN_ATTR, '1');

            var isOverdue = daysLeft < 0;
            var isSoon = daysLeft >= 0 && daysLeft <= 3;
            var badgeColor, badgeBg;

            if (isOverdue) {
                var overdueDays = Math.abs(daysLeft);
                badgeColor = isDark ? '#ff8a80' : '#c62828';
                badgeBg = isDark ? 'rgba(255,138,128,0.12)' : 'rgba(198,40,40,0.08)';
                badge.textContent = 'Grade ' + overdueDays + 'd overdue';
                badge.title = 'Grade was due by ' + gradeDate + ' per DTU rules (20 workdays after exam). Now ' + overdueDays + ' day' + (overdueDays !== 1 ? 's' : '') + ' past the deadline.';
            } else if (isSoon) {
                badgeColor = isDark ? '#ffd380' : '#e65100';
                badgeBg = isDark ? 'rgba(255,211,128,0.12)' : 'rgba(230,81,0,0.08)';
                badge.textContent = 'Grade ~' + daysLeft + 'd';
                badge.title = 'Grade expected by ' + gradeDate + ' (' + daysLeft + ' workday' + (daysLeft !== 1 ? 's' : '') + ' left)';
            } else {
                badgeColor = isDark ? '#81c784' : '#2e7d32';
                badgeBg = isDark ? 'rgba(129,199,132,0.12)' : 'rgba(46,125,50,0.08)';
                badge.textContent = 'Grade by ' + gradeDate;
                badge.title = 'Grade expected within 20 workdays after exam (' + daysLeft + ' days left)';
            }

            badge.style.cssText = 'display: inline-block; margin-left: 6px; padding: 1px 6px; '
                + 'border-radius: 4px; font-size: 10px; font-weight: 600; white-space: nowrap; '
                + 'vertical-align: middle; '
                + 'color: ' + badgeColor + '; background: ' + badgeBg + ';';

            nameSpan.parentElement.insertBefore(badge, nameSpan.nextSibling);
        });
    }

    function insertStudyplanExamCluster() {
        if (!IS_TOP_WINDOW) return;
        if (!isFeatureFlagEnabled(FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY)) {
            var existing = document.querySelector('[data-dtu-exam-cluster]');
            if (existing) existing.remove();
            _studyplanExamClusterLastRenderedSig = '';
            _studyplanExamClusterLastCalendar = null;
            return;
        }
        if (window.location.hostname !== 'studieplan.dtu.dk') return;

        var courses = collectStudyplanUpcomingExamCourses();
        var courseSig = buildStudyplanExamCourseSig(courses);

        if (!courses.length) {
            if (_studyplanExamClusterLastRenderedSig !== 'none') {
                _studyplanExamClusterLastRenderedSig = 'none';
                renderStudyplanExamCluster(courses, [], null, null);
            }
            return;
        }

        if (_studyplanExamClusterRequestInFlight) {
            _studyplanExamClusterLastSig = courseSig;
            return;
        }

        if (courseSig === _studyplanExamClusterLastRenderedSig
            && _studyplanExamClusterLastCalendar
            && Array.isArray(_studyplanExamClusterLastCalendar.entries)
            && _studyplanExamClusterLastCalendar.entries.length) {
            return;
        }

        _studyplanExamClusterRequestInFlight = true;
        _studyplanExamClusterLastSig = courseSig;
        var requestedSig = courseSig;

        var container = ensureStudyplanExamClusterContainer();
        var body = container.querySelector('[data-dtu-exam-cluster-body]');
        if (body && !body.firstChild) renderExamClusterStatus(body, 'Loading exam calendar...', false);

        sendRuntimeMessage({ type: 'dtu-exam-calendar' }, function (response) {
            _studyplanExamClusterRequestInFlight = false;

            if (requestedSig !== _studyplanExamClusterLastSig) {
                scheduleStudyplanExamCluster(120);
                return;
            }

            if (!response || !response.ok || !Array.isArray(response.entries)) {
                _studyplanExamClusterLastCalendar = null;
                _studyplanExamClusterLastRenderedSig = requestedSig;
                var errText = 'Exam calendar unavailable right now.';
                if (response && response.debug && Array.isArray(response.debug.attempts) && response.debug.attempts.length) {
                    var firstAttempt = response.debug.attempts[0];
                    if (firstAttempt && firstAttempt.step) errText += ' (' + firstAttempt.step + ')';
                }
                renderStudyplanExamCluster(courses, [], response, errText);
                return;
            }

            _studyplanExamClusterLastCalendar = response;
            _studyplanExamClusterLastRenderedSig = requestedSig;
            var mapped = mapStudyplanCoursesToExamDates(courses, response.entries);
            renderStudyplanExamCluster(courses, mapped, response, null);
            injectGradeCountdowns(mapped);
        });
    }

    function scheduleStudyplanExamCluster(delayMs) {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'studieplan.dtu.dk') return;
        if (!isFeatureFlagEnabled(FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY)) return;
        if (_studyplanExamClusterTimer) return;
        _studyplanExamClusterTimer = setTimeout(function () {
            _studyplanExamClusterTimer = null;
            insertStudyplanExamCluster();
        }, delayMs || 800);
    }
    // ===== EXAM CLUSTER OUTLOOK (STUDYPLAN) [END] =====

    function styleStudyPlannerTabLink(anchor) {
        if (!anchor || !anchor.style) return;
        var color = getResolvedAccentDeep();
        anchor.style.setProperty('background', color, 'important');
        anchor.style.setProperty('background-color', color, 'important');
        anchor.style.setProperty('color', '#ffffff', 'important');
        anchor.style.setProperty('border-color', color, 'important');
    }

    function styleStudyPlannerTabs() {
        if (!IS_TOP_WINDOW) return;
        var host = window.location.hostname;
        if (host !== 'studieplan.dtu.dk' && host !== 'kurser.dtu.dk') return;

        // Style all nav tabs inside .mofoclass on both kurser.dtu.dk and studieplan.dtu.dk
        document.querySelectorAll('.mofoclass li[role="presentation"] > a').forEach(function (a) {
            styleStudyPlannerTabLink(a);
        });

        if (host === 'kurser.dtu.dk') {
            document.querySelectorAll('li[role="presentation"] > a[href="/search"], li[role="presentation"] > a[href$="/search"]').forEach(function (a) {
                styleStudyPlannerTabLink(a);
            });

            document.querySelectorAll('li[role="presentation"] > a[href="/course/gotoStudyplanner"], li[role="presentation"] > a[href$="/course/gotoStudyplanner"]').forEach(function (a) {
                styleStudyPlannerTabLink(a);
            });
        }

        document.querySelectorAll('li[role="presentation"] > a[href="#"]').forEach(function (a) {
            var txt = (a.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (txt === 'studieplanlæggeren' || txt === 'study planner' || txt === 'course search') {
                styleStudyPlannerTabLink(a);
            }
        });

        // Study Planner top-right links (Guide / Dansk) sometimes sit outside .dturedbackground
        // and ship with broken inline styles like "background-color:  !important;".
        // Force them onto the accent bar anyway so the user's accent applies consistently.
        if (host === 'studieplan.dtu.dk') {
            try {
                // Dark mode: prefer a lighter accent so text "pills" stand out against dark UI.
                // Light mode: prefer the deeper accent so it reads like the official DTU bar.
                var pillBg = darkModeEnabled ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
                var pillBgHover = darkModeEnabled ? 'var(--dtu-ad-accent-hover)' : 'var(--dtu-ad-accent-deep-hover)';

                var topLinks = document.querySelectorAll(
                    'a[href*="studieplanlaeggeren"], a[href^="javascript:setLanguage("], a[href^="javascript:setLanguage\\("]'
                );
                topLinks.forEach(function (a) {
                    if (!a || !a.style) return;
                    a.style.setProperty('color', '#ffffff', 'important');
                    // Make hover readable even if the anchor is inline.
                    a.style.setProperty('padding', '2px 4px', 'important');
                    a.style.setProperty('border-radius', '4px', 'important');
                    a.style.setProperty('text-decoration', 'none', 'important');
                    a.style.setProperty('background-color', 'transparent', 'important');
                    a.style.setProperty('background', 'transparent', 'important');

                    var pr = a.closest ? a.closest('.pull-right') : null;
                    if (pr && pr.style) {
                        pr.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                        pr.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                        pr.style.setProperty('background-image', 'none', 'important');
                    }
                    var span = a.parentElement && a.parentElement.tagName === 'SPAN' ? a.parentElement : null;
                    if (span && span.style) {
                        span.style.setProperty('background-color', pillBg, 'important');
                        span.style.setProperty('background', pillBg, 'important');
                        span.style.setProperty('background-image', 'none', 'important');
                        span.style.setProperty('border-color', pillBg, 'important');
                    }

                    // Optional hover polish: best-effort, no handlers if already present.
                    if (!a.hasAttribute('data-dtu-accent-pill')) {
                        a.setAttribute('data-dtu-accent-pill', '1');
                        a.addEventListener('mouseenter', function () {
                            try {
                                var sp = a.parentElement && a.parentElement.tagName === 'SPAN' ? a.parentElement : null;
                                if (sp && sp.style) {
                                    sp.style.setProperty('background-color', pillBgHover, 'important');
                                    sp.style.setProperty('background', pillBgHover, 'important');
                                    sp.style.setProperty('border-color', pillBgHover, 'important');
                                }
                            } catch (e0) { }
                        }, true);
                        a.addEventListener('mouseleave', function () {
                            try {
                                var sp = a.parentElement && a.parentElement.tagName === 'SPAN' ? a.parentElement : null;
                                if (sp && sp.style) {
                                    sp.style.setProperty('background-color', pillBg, 'important');
                                    sp.style.setProperty('background', pillBg, 'important');
                                    sp.style.setProperty('border-color', pillBg, 'important');
                                }
                            } catch (e1) { }
                        }, true);
                    }
                });

                document.querySelectorAll('.pull-right .seperator').forEach(function (sep) {
                    if (!sep || !sep.style) return;
                    sep.style.setProperty('color', 'rgba(255,255,255,0.6)', 'important');
                    sep.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                    sep.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                });
                document.querySelectorAll('.pull-right .caret').forEach(function (caret) {
                    if (!caret || !caret.style) return;
                    caret.style.setProperty('border-top-color', '#ffffff', 'important');
                    caret.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                    caret.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                });
            } catch (eSp) { }
        }

        // Accent color for .dturedbackground bar
        document.querySelectorAll('.dturedbackground').forEach(function (el) {
            el.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
            el.style.setProperty('color', '#ffffff', 'important');
            el.style.setProperty('border-color', 'var(--dtu-ad-accent-deep)', 'important');
            // Children: container, row, col, pull-right and all child spans
            el.querySelectorAll('.container, .row, .col-md-12, .pull-right, .pull-right > span').forEach(function (child) {
                child.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                child.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                child.style.setProperty('background-image', 'none', 'important');
                child.style.setProperty('border-color', 'var(--dtu-ad-accent-deep)', 'important');
            });
            el.querySelectorAll('.dropdown-toggle.red').forEach(function (btn) {
                btn.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                btn.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                btn.style.setProperty('color', '#ffffff', 'important');
            });
            el.querySelectorAll('.dropdown-menu.red').forEach(function (menu) {
                menu.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                menu.style.setProperty('border-color', 'var(--dtu-ad-accent-deep-hover)', 'important');
            });
            el.querySelectorAll('a').forEach(function (a) {
                a.style.setProperty('color', '#ffffff', 'important');
            });
            // Separators and carets -- force accent background to override broken inline styles
            el.querySelectorAll('.seperator').forEach(function (sep) {
                sep.style.setProperty('color', 'rgba(255,255,255,0.6)', 'important');
                sep.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                sep.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
            });
            el.querySelectorAll('.caret').forEach(function (caret) {
                caret.style.setProperty('border-top-color', '#ffffff', 'important');
            });
        });

        // Accent border for semester headings
        document.querySelectorAll('h3[data-bind*="SemesterNumber"]').forEach(function (h3) {
            h3.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
            h3.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
            h3.style.setProperty('color', '#ffffff', 'important');
            h3.style.setProperty('border-bottom-width', '2px', 'important');
            h3.style.setProperty('border-bottom-style', 'solid', 'important');
            h3.style.setProperty('border-bottom-color', 'var(--dtu-ad-accent-deep)', 'important');
        });

        // Accent color for course code links
        document.querySelectorAll('a.coursecode').forEach(function (a) {
            a.style.setProperty('color', 'var(--dtu-ad-accent)', 'important');
        });

        // Planned course tables (drop zones) sit on dark UI in dark mode; use a lighter accent for readability.
        // Keep basket/sidebar course codes on the primary accent.
        try {
            var plannedCourseLinks = document.querySelectorAll('.inverse .overlayArea a.coursecode');
            plannedCourseLinks.forEach(function (a) {
                if (!a || !a.style) return;
                a.style.setProperty('color', darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
            });
        } catch (ePlan) { }

        // Basket course codes: also use a lighter accent in dark mode for readability.
        try {
            document.querySelectorAll('a.coursecode[data-bind*="basketCourseGroup"]').forEach(function (a) {
                if (!a || !a.style) return;
                a.style.setProperty('color', darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
            });
        } catch (eBasket) { }

        // Exam results tables: use a lighter accent in dark mode for readability against dark UI.
        // Keep basket/planning course codes on the main accent.
        try {
            document.querySelectorAll('.inverse table.table-bordered').forEach(function (tbl) {
                if (!tbl || !tbl.querySelectorAll) return;
                var isExamTable = false;
                try {
                    if (tbl.querySelector('td.result')) isExamTable = true;
                    if (!isExamTable) {
                        var th = tbl.querySelector('thead th');
                        var t = th ? (th.textContent || '').toLowerCase() : '';
                        if (t.indexOf('exam') >= 0) isExamTable = true;
                    }
                } catch (e0) { }
                if (!isExamTable) return;

                var cc = tbl.querySelectorAll('a.coursecode');
                cc.forEach(function (a) {
                    if (!a || !a.style) return;
                    a.style.setProperty('color', darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent-deep)', 'important');
                });
            });
        } catch (eExam) { }

        // Accent color for btn-dtured buttons
        document.querySelectorAll('.btn-dtured').forEach(function (btn) {
            btn.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
            btn.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
            btn.style.setProperty('color', '#ffffff', 'important');
            btn.style.setProperty('border-color', 'var(--dtu-ad-accent-deep)', 'important');
        });
    }

    function forceDTULearnAccentInRoot(root) {
        if (!root || !root.querySelectorAll) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;

        var badgeBg = darkModeEnabled ? 'var(--dtu-ad-accent)' : 'var(--dtu-ad-accent-deep)';
        var dark1 = '#1a1a1a';

        function hasAccessibilityWasLink(container) {
            if (!container || !container.querySelector) return false;
            try {
                var anchors = container.querySelectorAll('a[href]');
                for (var i = 0; i < anchors.length; i++) {
                    var href = anchors[i].getAttribute('href') || '';
                    if (!href) continue;
                    try {
                        var u = new URL(href, window.location.origin);
                        var p = (u.pathname || '').toLowerCase().replace(/\/+$/, '');
                        if (p === '/was' || p.endsWith('/was')) return true;
                    } catch (eHref) {
                        var h = href.toLowerCase();
                        if (h.indexOf('learn.inside.dtu.dk/was') >= 0) return true;
                        if (/(^|\/)was(\?|#|$)/.test(h)) return true;
                    }
                }
            } catch (eA0) { }
            try {
                if (container.querySelector('d2l-html-block[html*="learn.inside.dtu.dk/was"], d2l-html-block[html*="&gt;Accessibility&lt;"]')) return true;
            } catch (eA1) { }
            return false;
        }

        try {
            root.querySelectorAll('d2l-labs-navigation-band').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', 'var(--dtu-ad-accent-deep)', 'important');
                el.style.setProperty('background-color', 'var(--dtu-ad-accent-deep)', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
            });
        } catch (e0) { }

        try {
            root.querySelectorAll('.d2l-w2d-count, .d2l-w2d-heading-3-count').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', badgeBg, 'important');
                el.style.setProperty('background-color', badgeBg, 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
                el.style.setProperty('border-radius', '999px', 'important');
                el.style.setProperty('padding', '0 7px', 'important');
                el.style.setProperty('min-width', '18px', 'important');
                el.style.setProperty('text-align', 'center', 'important');
                // Brightspace sometimes applies inset borders/shadows that show as a "ring".
                el.style.setProperty('border', '0', 'important');
                el.style.setProperty('outline', '0', 'important');
                el.style.setProperty('box-shadow', 'none', 'important');
            });
            root.querySelectorAll('.d2l-count-badge-number').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', badgeBg, 'important');
                el.style.setProperty('background-color', badgeBg, 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
                el.style.setProperty('border-color', '#ffffff', 'important');
                el.style.setProperty('outline', '0', 'important');
                el.style.setProperty('box-shadow', 'none', 'important');
            });
            root.querySelectorAll('.d2l-count-badge-number > div').forEach(function (el) {
                if (!el || !el.style) return;
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
            });
        } catch (e1) { }

        try {
            root.querySelectorAll('.uw-text').forEach(function (el) {
                if (!el || !el.style) return;
                // Dark mode: use the "soft" accent so it reads like a highlighted title on dark UI.
                // Light mode: use the primary accent for better contrast on white backgrounds.
                el.style.setProperty('color', darkModeEnabled ? 'var(--dtu-ad-accent-soft)' : 'var(--dtu-ad-accent)', 'important');
            });
        } catch (e2) { }

        // DTU Learn light mode: keep key navigation/headline links neutral black
        // instead of accent-colored blue.
        try {
            if (!darkModeEnabled) {
                root.querySelectorAll(
                    'a.d2l-homepage-heading-link, '
                    + 'a.d2l-homepage-heading-link h2, '
                    + '.d2l-navigation-s-item a.d2l-navigation-s-link'
                ).forEach(function (el) {
                    if (!el || !el.style) return;
                    el.style.setProperty('color', '#000000', 'important');
                });
            }
        } catch (e2b) { }

        // DTU Learn accessibility widget block: keep the content padding surface dark 1.
        // Only force background; leave text/link colors to normal rules.
        try {
            if (darkModeEnabled) {
                root.querySelectorAll('.d2l-widget-content-padding').forEach(function (el) {
                    if (!el || !el.style) return;
                    if (!hasAccessibilityWasLink(el)) return;
                    el.style.setProperty('background', dark1, 'important');
                    el.style.setProperty('background-color', dark1, 'important');
                    el.style.setProperty('background-image', 'none', 'important');
                    var content = el.closest ? el.closest('.d2l-widget-content') : null;
                    if (content && content.style) {
                        content.style.setProperty('background', dark1, 'important');
                        content.style.setProperty('background-color', dark1, 'important');
                        content.style.setProperty('background-image', 'none', 'important');
                    }
                });
            }
        } catch (e3) { }
    }

    // Inject light-mode accent badge CSS into a shadow root (idempotent).
    function injectLightAccentBadgeStyles(shadowRoot) {
        if (!shadowRoot) return;
        var id = 'dtu-ad-light-accent-badges';
        if (shadowRoot.getElementById && shadowRoot.getElementById(id)) return;
        // querySelector fallback (some shadow roots lack getElementById)
        try { if (shadowRoot.querySelector('#' + id)) return; } catch (e0) { }
        var style = document.createElement('style');
        style.id = id;
        style.textContent = lightAccentBadgeStyles;
        shadowRoot.appendChild(style);
    }

    // Recursively walk shadow roots starting from a DOM subtree and apply
    // accent badge overrides (both inline + injected CSS).
    function walkShadowRootsForAccent(rootEl, visited, depth) {
        if (!rootEl || depth > 12) return;
        if (!visited) visited = new WeakSet();
        var scope = rootEl;
        if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) return;

        // If this is a shadow root, apply inline overrides + inject CSS
        if (scope.nodeType === 11) {
            try { forceDTULearnAccentInRoot(scope); } catch (e0) { }
            if (!darkModeEnabled) {
                try { injectLightAccentBadgeStyles(scope); } catch (e1) { }
            }
        }

        // Walk children looking for shadow hosts via TreeWalker (avoids building a huge NodeList).
        try {
            var tw = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT, null);
            var n = tw.nextNode();
            var steps = 0;
            while (n && steps < 8000) {
                steps++;
                if (n.shadowRoot && !visited.has(n.shadowRoot)) {
                    visited.add(n.shadowRoot);
                    walkShadowRootsForAccent(n.shadowRoot, visited, depth + 1);
                }
                n = tw.nextNode();
            }
        } catch (eWalk) { }
    }

    function forceDTULearnAccentElements(root) {
        if (!root) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;

        // Always apply to the full document first. In our unified observer pipeline we often
        // call this with a small mutation root that doesn't include the badges.
        try { forceDTULearnAccentInRoot(document); } catch (eDoc) { }

        // Apply in the current root (document, element subtree, or shadow root).
        try { forceDTULearnAccentInRoot(root); } catch (e0) { }

        // Recursively walk into open shadow roots and apply accent overrides + CSS.
        try {
            var visited = new WeakSet();
            walkShadowRootsForAccent(document, visited, 0);
            if (root !== document && root.nodeType === 11) {
                walkShadowRootsForAccent(root, visited, 0);
            }
        } catch (eWalk) { }
    }

    // ===== UNIFIED SCHEDULING =====
    // Replaces 8 separate setIntervals and 6 MutationObservers with
    // ONE master interval + ONE unified MutationObserver for much lower CPU usage.

    // Force html/body to dark 1 (overrides any site inline styles)
    function enforcePageBackground() {
        document.documentElement.style.setProperty('background-color', '#1a1a1a', 'important');
        document.documentElement.style.setProperty('background', '#1a1a1a', 'important');
        if (document.body) {
            document.body.style.setProperty('background-color', '#1a1a1a', 'important');
            document.body.style.setProperty('background', '#1a1a1a', 'important');
        }
    }

    // Run immediately (dark mode only)
    if (darkModeEnabled) enforcePageBackground();

    function usesBrightspaceShadowDom() {
        var host = window.location.hostname;
        return host === 'learn.inside.dtu.dk' || host === 's.brightspace.com';
    }

    function runDarkModeChecks(rootNode) {
        if (!darkModeEnabled) return;
        var useBrightspaceShadowDom = usesBrightspaceShadowDom();

        if (rootNode && rootNode.nodeType === 1) {
            if (useBrightspaceShadowDom) {
                processElement(rootNode);
                sweepForLateShadowRoots(rootNode);
                replaceLogoImage(rootNode);
                styleQuizSubmissionHistogram(rootNode);
            } else {
                // Non-Brightspace hosts don't need heavy shadow-root rescans per mutation.
                preserveTypeboxColors(rootNode);
            }
            return;
        }

        enforcePageBackground();
        if (useBrightspaceShadowDom) {
            pollForHtmlBlocks();
            pollForMultiselects();
            pollOverrideDynamicStyles();
            if (document.body) processElement(document.body);
            sweepForLateShadowRoots();
            replaceLogoImage();
            styleQuizSubmissionHistogram();
        }
        preserveTypeboxColors();
    }

    let _bookFinderTimer = null;

    function scheduleBookFinderScan(delayMs) {
        if (!IS_TOP_WINDOW || !isDTULearnCoursePage()) return;
        if (!isFeatureFlagEnabled(FEATURE_BOOK_FINDER_KEY)) return;
        if (_bookFinderTimer) return;
        _bookFinderTimer = setTimeout(function () {
            _bookFinderTimer = null;
            insertBookFinderLinks();
        }, delayMs || 800);
    }

    function removeDTULearnMSTeamsCourseConnector(rootNode) {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (!isDTULearnCoursePage()) return;

        var scope = (rootNode && rootNode.querySelectorAll) ? rootNode : document;
        var widgets = [];
        try {
            widgets = scope.querySelectorAll('.d2l-widget, .d2l-tile');
        } catch (e0) {
            widgets = [];
        }

        widgets.forEach(function (widget) {
            if (!widget || !widget.querySelector) return;
            var heading = widget.querySelector('.d2l-widget-header h2, h2.d2l-heading');
            var title = '';
            try { title = (heading ? heading.textContent : '').replace(/\s+/g, ' ').trim(); } catch (e1) { title = ''; }
            if (!/ms teams course connector/i.test(title)) return;
            if (widget.remove) widget.remove();
        });
    }

    function runTopWindowFeatureChecks(rootNode, refreshBus) {
        if (!IS_TOP_WINDOW) return;

        var host = window.location.hostname;
        if (host === 'learn.inside.dtu.dk' || host === 'campusnet.dtu.dk' || host === 'studieplan.dtu.dk' || host === 'kurser.dtu.dk' || host === 'sites.dtu.dk') {
            try { replaceLogoImage(rootNode || document); } catch (eLogoTop) { }
        }
        if (ENABLE_CONTEXT_CAPTURE_DEV_TOOL) {
            setupContextCaptureHotkey();
            insertContextCaptureHelper();
        }
        styleStudyPlannerTabs();
        fixEvalueringResultCharts();
        fixCampusnetHeaderStyling();
        applyKurserAccentElements();
        if (host === 'studieplan.dtu.dk' || host === 'campusnet.dtu.dk' || host === 'kurser.dtu.dk') {
            enforceDtuRedBackgroundZoneDark2();
        }

        if (host === 'learn.inside.dtu.dk') {
            insertMojanglesText();
            if (isFeatureFlagEnabled(FEATURE_LEARN_NAV_RESOURCE_LINKS_KEY)) {
                insertDTULearnNavResourceLinks();
            } else {
                removeDTULearnNavResourceLinks();
            }
            // Re-apply accent on key DTU Learn UI elements; global darkening can otherwise flatten these.
            try { forceDTULearnAccentElements(rootNode || document); } catch (eAcc) { }
            insertLibraryNavDropdown();
            insertSettingsNavItem();
            removeDTULearnMSTeamsCourseConnector(rootNode || document);
            if (isFeatureFlagEnabled(FEATURE_CONTENT_SHORTCUT_KEY)) {
                insertContentButtons(rootNode);
                startContentButtonBootstrap();
            } else {
                removeContentButtons();
            }
            // Settings are accessible via the nav bar "Settings" button and the gear icon.
            insertDeadlinesHomepageWidget();
            removeDTULearnSemesterTwinWidget();
            if (refreshBus && isDTULearnHomepage()) {
                updateBusDepartures();
            }
            scheduleBookFinderScan(refreshBus ? 300 : 900);
        }
        if (host === 'campusnet.dtu.dk') {
            insertGPARow();
            insertECTSProgressBar();
            insertGPASimulator();
            insertParticipantIntelligence();
            insertCampusnetSemesterTwinWidget();
        }
        if (host === 'studieplan.dtu.dk') {
            scheduleStudyplanExamCluster(refreshBus ? 260 : 760);
        }
        if (host === 'kurser.dtu.dk') {
            insertKurserGradeStats();
            insertKurserCourseEvaluation();
            insertKurserRoomFinder();
            annotateKurserSchedulePlacement();
            insertKurserMyLineBadge();
            scheduleKurserTextbookLinker(refreshBus ? 240 : 620);
        }

        // Site-wide: turn room mentions into MazeMap links (lazy-resolve on click).
        if (isFeatureFlagEnabled(FEATURE_SMART_ROOM_LINKER_KEY)) {
            scheduleSmartRoomLinkerScan(rootNode, refreshBus ? 260 : 720);
            scheduleSmartRoomLinkerHtmlBlockProbe(refreshBus ? 420 : 900);
            scheduleSmartRoomLinkerShadowSweep(refreshBus ? 420 : 1100);
        } else {
            removeSmartRoomLinks();
        }
    }

    function shouldUseUnifiedObserver() {
        // Chrome can spend excessive time in mutation processing on these
        // highly dynamic pages; run feature checks from load/visibility hooks instead.
        var host = window.location.hostname;
        if (host === 'studieplan.dtu.dk' || host === 'kurser.dtu.dk') return false;
        return true;
    }

    var _hostFeatureBootstrapTimer = null;
    var _campusnetLogoFastTimer = null;

    function startCampusnetLogoFastBootstrap() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'campusnet.dtu.dk') return;
        if (_campusnetLogoFastTimer) return;

        var attempts = 0;
        _campusnetLogoFastTimer = setInterval(function () {
            attempts++;
            try { replaceLogoImage(); } catch (eLogoFast) { }

            var done = false;
            try {
                done = !!document.querySelector('img.header__logo[data-dark-mode-replaced="true"], img[src*="DTULogo_Corp_Red_RGB.png"][data-dark-mode-replaced="true"]');
            } catch (eDone) { done = false; }

            if (done || attempts >= 45) {
                clearInterval(_campusnetLogoFastTimer);
                _campusnetLogoFastTimer = null;
            }
        }, 60);
    }

    function startHostFeatureBootstrap() {
        if (!IS_TOP_WINDOW) return;
        if (_hostFeatureBootstrapTimer) return;
        var host = window.location.hostname;
        if (host === 'campusnet.dtu.dk') {
            startCampusnetLogoFastBootstrap();
            return;
        }
        if (host !== 'studieplan.dtu.dk' && host !== 'kurser.dtu.dk') return;

        var attempts = 0;
        _hostFeatureBootstrapTimer = setInterval(function () {
            attempts++;
            runTopWindowFeatureChecks(null, false);

            var done = false;
            if (host === 'studieplan.dtu.dk') {
                done = !!document.querySelector('[data-dtu-exam-cluster]');
            } else if (host === 'kurser.dtu.dk') {
                done = !!document.querySelector('[data-dtu-grade-stats]')
                    || !!document.querySelector('[data-dtu-course-eval]')
                    || !!document.querySelector('[data-dtu-room-finder]')
                    || !!document.querySelector('[data-dtu-textbook-linker]')
                    || !!document.querySelector('[data-dtu-textbook-linker-bar-host]')
                    || !!document.querySelector('[data-dtu-myline-badge]');
            }

            if (done || attempts >= 35) {
                clearInterval(_hostFeatureBootstrapTimer);
                _hostFeatureBootstrapTimer = null;
            }
        }, 500);
    }

    var _hostLightObserver = null;
    var _hostLightRefreshTimer = null;

    function isExternalNode(node) {
        if (!node) return false;
        var el = node.nodeType === 1 ? node : node.parentElement;
        if (!el) return false;
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return true;
        return !!(el.closest && el.closest('[data-dtu-ext]'));
    }

    function scheduleHostLightRefresh(delayMs) {
        if (_hostLightRefreshTimer) return;
        _hostLightRefreshTimer = setTimeout(function () {
            _hostLightRefreshTimer = null;
            var host = window.location.hostname;
            if (host === 'studieplan.dtu.dk') {
                scheduleStudyplanExamCluster(110);
                // Studieplan can re-render its header/logo after initial load; re-apply logo override.
                try { replaceLogoImage(); } catch (eLogo1) { }
                return;
            }
            if (host === 'kurser.dtu.dk') {
                insertKurserGradeStats();
                insertKurserCourseEvaluation();
                insertKurserRoomFinder();
                annotateKurserSchedulePlacement();
                insertKurserMyLineBadge();
                scheduleKurserTextbookLinker(110);
                // Kurser can also swap logos late; keep it stable in dark mode.
                try { replaceLogoImage(); } catch (eLogo2) { }
            }
        }, delayMs || 180);
    }

    function startHostLightObserver() {
        if (!IS_TOP_WINDOW) return;
        var host = window.location.hostname;
        if (host !== 'studieplan.dtu.dk' && host !== 'kurser.dtu.dk') return;
        if (_hostLightObserver) return;
        if (!document.documentElement) return;

        _hostLightObserver = new MutationObserver(function (mutations) {
            var shouldRefresh = false;

            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.type !== 'childList') continue;
                if ((mutation.addedNodes && mutation.addedNodes.length) || (mutation.removedNodes && mutation.removedNodes.length)) {
                    var relevant = false;
                    for (var a = 0; mutation.addedNodes && a < mutation.addedNodes.length; a++) {
                        var addedNode = mutation.addedNodes[a];
                        if (!isExternalNode(addedNode)) {
                            relevant = true;
                            break;
                        }
                    }
                    if (!relevant) {
                        for (var r = 0; mutation.removedNodes && r < mutation.removedNodes.length; r++) {
                            var removedNode = mutation.removedNodes[r];
                            if (!isExternalNode(removedNode)) {
                                relevant = true;
                                break;
                            }
                        }
                    }
                    if (relevant) {
                        shouldRefresh = true;
                        break;
                    }
                }
            }

            if (shouldRefresh) {
                scheduleHostLightRefresh(host === 'studieplan.dtu.dk' ? 140 : 180);
            }
        });

        _hostLightObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    startHostFeatureBootstrap();
    startHostLightObserver();

    // Unified MutationObserver â€” handles style re-overrides immediately,
    // and debounces heavier processing (shadow roots, logos, etc.)
    let _heavyWorkTimer = null;
    let _pendingMutationRoots = [];
    let _pendingMutationRootSet = new Set();
    let _mutationQueueOverflow = false;
    const MAX_PENDING_MUTATION_ROOTS = 220;
    const MAX_ROOTS_PER_FLUSH = 48;
    var _suppressHeavyWork = false; // Set true during our own DOM changes to avoid UI freezes

    function enqueueMutationRoot(node) {
        if (!node || node.nodeType !== 1 || !node.isConnected) return;
        if (node.hasAttribute && node.hasAttribute('data-dtu-ext')) return;
        if (node.closest && node.closest('[data-dtu-ext]')) return;
        if (_mutationQueueOverflow) return;
        if (_pendingMutationRootSet.has(node)) return;
        _pendingMutationRootSet.add(node);
        _pendingMutationRoots.push(node);
        if (_pendingMutationRoots.length > MAX_PENDING_MUTATION_ROOTS) {
            _mutationQueueOverflow = true;
        }
    }

    function dedupeMutationRoots(roots) {
        var unique = [];
        roots.forEach(function (root) {
            if (!root || root.nodeType !== 1 || !root.isConnected) return;
            var skip = false;
            for (var i = 0; i < unique.length; i++) {
                var existing = unique[i];
                if (existing === root || existing.contains(root)) {
                    skip = true;
                    break;
                }
                if (root.contains(existing)) {
                    unique.splice(i, 1);
                    i--;
                }
            }
            if (!skip) unique.push(root);
        });
        return unique;
    }

    function handleMutations(mutations) {
        if (_suppressHeavyWork) return;
        let needsHeavyWork = false;

        for (const mutation of mutations) {
            if (darkModeEnabled) {
                // Style / class attribute changes â€” apply dark overrides immediately
                if (mutation.type === 'attributes') {
                    const el = mutation.target;
                    if (el && el.hasAttribute && el.hasAttribute('data-dtu-ext')) continue;
                    if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
                        try {
                            if (el && el.closest && el.closest('.navigation-container .navigation-tree')) {
                                forceLessonsTocDark1(el);
                            }
                        } catch (eTocAttr2) { }
                        try {
                            forceD2LActionButtonsDark1(el);
                        } catch (eActionAttr2) { }
                        if (el.matches) {
                            if (el.matches(LIGHTER_DARK_SELECTORS)) {
                                applyLighterDarkStyle(el);
                            } else if (el.matches(DARK_SELECTORS)) {
                                applyDarkStyle(el);
                            }
                        }
                        if (el.matches && el.matches('.dturedbackground')) {
                            forceDtuRedBackgroundDark2(el);
                        }
                        if (el.classList && el.classList.contains('typebox')) {
                            preserveSingleTypeboxColor(el);
                        }
                    }
                    if (mutation.attributeName === 'src' && el.matches
                        && el.matches(
                            'd2l-labs-navigation-link-image.d2l-navigation-s-logo, '
                            + 'd2l-labs-navigation-link-image[text="My Home"], '
                            + 'img.logo-img, '
                            + 'img.header__logo, '
                            + 'img[src*="dtulogo_colour.png"], '
                            + 'img[src*="dtulogo2_colour.png"], '
                            + 'img[src*="DTULogo_Corp_Red_RGB.png"]'
                        )) {
                        replaceLogoImage(el);
                    }
                }
            }

            // New nodes added â€” schedule feature checks (and dark styles if enabled)
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.hasAttribute && node.hasAttribute('data-dtu-ext')) return;
                        if (node.closest && node.closest('[data-dtu-ext]')) return;
                        try {
                            if (node.closest && node.closest('.navigation-container .navigation-tree')) {
                                forceLessonsTocDark1(node);
                            }
                        } catch (eTocNode2) { }
                        try {
                            forceD2LActionButtonsDark1(node);
                        } catch (eActionNode2) { }
                        enqueueMutationRoot(node);
                        if (darkModeEnabled) {
                            if (node.matches && node.matches(DARK_SELECTORS)) applyDarkStyle(node);
                            if (node.matches && node.matches(LIGHTER_DARK_SELECTORS)) applyLighterDarkStyle(node);
                            forceLessonsTocDark1(node);
                            forceD2LActionButtonsDark1(node);
                            if (node.matches && node.matches('.dturedbackground')) {
                                forceDtuRedBackgroundDark2(node);
                            }
                            if (node.querySelectorAll) {
                                // Avoid full descendant scans on every mutation in Chrome;
                                // runDarkModeChecks(root) handles deeper processing in a debounced batch.
                                if (node.querySelector('.dturedbackground')) {
                                    node.querySelectorAll('.dturedbackground').forEach(forceDtuRedBackgroundDark2);
                                }
                            }
                        }
                        needsHeavyWork = true;
                    }
                });
            }
        }

        // Debounce heavy operations (features always, dark-mode styling conditionally)
        if (needsHeavyWork && !_heavyWorkTimer) {
            _heavyWorkTimer = setTimeout(() => {
                _heavyWorkTimer = null;

                var queueOverflow = _mutationQueueOverflow;
                _mutationQueueOverflow = false;
                var roots = _pendingMutationRoots.filter(function (root) {
                    return root && root.nodeType === 1 && root.isConnected;
                });
                _pendingMutationRoots = [];
                _pendingMutationRootSet.clear();
                if (queueOverflow) {
                    runDarkModeChecks();
                    runTopWindowFeatureChecks(null, false);
                    return;
                }
                if (roots.length === 0) return;
                roots = dedupeMutationRoots(roots);
                if (roots.length > MAX_ROOTS_PER_FLUSH) {
                    roots = roots.slice(roots.length - MAX_ROOTS_PER_FLUSH);
                }

                if (darkModeEnabled) {
                    roots.forEach(root => {
                        runDarkModeChecks(root);
                    });
                    // Some hosts (CampusNet / Studyplanner) render logos late; apply per-mutation-root
                    // so we catch late-added header DOM without relying on `src` changes.
                    try {
                        roots.forEach(function (r) { replaceLogoImage(r); });
                    } catch (eLogoM) { }
                }
                runTopWindowFeatureChecks(roots[roots.length - 1] || null, false);
            }, 200);
        }
    }

    function startUnifiedObserver() {
        const observer = new MutationObserver(handleMutations);
        const observeOptions = {
            childList: true,
            subtree: true
        };
        if (darkModeEnabled) {
            observeOptions.attributes = true;
            // Also watch `src` so host pages that swap logo/image sources after load
            // get immediately re-overridden (e.g. Studyplanner / CampusNet logos).
            observeOptions.attributeFilter = ['style', 'class', 'src'];
        }
        observer.observe(document.documentElement, observeOptions);
    }

    // Start observer immediately on documentElement (exists at document_start)
    // Handles both dark-mode styling (when enabled) and feature insertion (always)
    if (shouldUseUnifiedObserver()) {
        if (document.documentElement) {
            startUnifiedObserver();
        } else {
            document.addEventListener('DOMContentLoaded', startUnifiedObserver);
        }
    }

    var _didRunPrimaryBootstrap = false;
    function runPrimaryBootstrap() {
        if (_didRunPrimaryBootstrap) return;
        _didRunPrimaryBootstrap = true;
        waitForCustomElements().then(function () {
            runDarkModeChecks();
            runTopWindowFeatureChecks(null, true);
            // Logos often appear after initial HTML parsing (or get swapped by site JS).
            // Re-apply after primary bootstrap + a couple delayed passes.
            try { replaceLogoImage(); } catch (eLogo0) { }
            startHostFeatureBootstrap();
            startHostLightObserver();
            startContentButtonBootstrap();
            setTimeout(function () { runDarkModeChecks(); runTopWindowFeatureChecks(null, true); }, 500);
            setTimeout(function () { runDarkModeChecks(); runTopWindowFeatureChecks(null, true); }, 1500);
            setTimeout(function () { try { replaceLogoImage(); } catch (eLogoA) { } }, 650);
            setTimeout(function () { try { replaceLogoImage(); } catch (eLogoB) { } }, 1850);
            setTimeout(showOnboardingHint, 2000);
            setTimeout(showBusSetupPrompt, 2500);
        });
    }

    // Page load: run all checks a few times to catch late-loading elements
    window.addEventListener('load', function () {
        runPrimaryBootstrap();
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(runPrimaryBootstrap, 0);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(runPrimaryBootstrap, 0);
        });
    }

    window.addEventListener('pageshow', function () {
        setTimeout(function () {
            runTopWindowFeatureChecks(null, true);
            startHostFeatureBootstrap();
            startHostLightObserver();
        }, 30);
    });

    window.addEventListener('focus', function () {
        setTimeout(function () {
            runTopWindowFeatureChecks(null, true);
            startHostFeatureBootstrap();
            startHostLightObserver();
        }, 40);
    });

    // Re-process when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(function () {
                runDarkModeChecks();
                runTopWindowFeatureChecks(null, true);
                startHostFeatureBootstrap();
                startHostLightObserver();
                startContentButtonBootstrap();
            }, 100);
        }
    });

    // Lightweight safety-net for late-created Brightspace shadow roots.
    if (darkModeEnabled && IS_TOP_WINDOW) {
        setInterval(function () {
            if (document.hidden) return;
            sweepForLateShadowRoots();
        }, 15000);
    }
})();
