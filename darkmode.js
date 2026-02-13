// Dark mode script to inject styles into Shadow DOM elements
(function() {
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
        } catch (e) {}
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                return { api: 'chrome', area: chrome.storage.local };
            }
        } catch (e) {}
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
                storage.area.set({ [DARK_MODE_KEY]: enabled }, function() {});
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
        } catch (e) {}
        if (storedEnabled !== darkModeEnabled && window === window.top) {
            location.reload();
        }
    }

    // Async cross-origin check via extension storage (covers s.brightspace.com etc.)
    var extensionStorage = getExtensionStorageArea();
    if (extensionStorage) {
        if (extensionStorage.api === 'browser') {
            extensionStorage.area.get(DARK_MODE_KEY).then(function(result) {
                applyStoredDarkModeValue(result[DARK_MODE_KEY]);
            }).catch(function() {});
        } else {
            extensionStorage.area.get([DARK_MODE_KEY], function(result) {
                if (chrome && chrome.runtime && chrome.runtime.lastError) return;
                applyStoredDarkModeValue(result ? result[DARK_MODE_KEY] : undefined);
            });
        }
    }

    function subscribeDarkModeStorageChanges() {
        var onChanged = function(changes, areaName) {
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
        } catch (e) {}
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener(onChanged);
            }
        } catch (e) {}
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

    const FEATURE_FLAG_DEFAULTS = {
        [FEATURE_BOOK_FINDER_KEY]: true,
        [FEATURE_KURSER_GRADE_STATS_KEY]: true,
        [FEATURE_KURSER_TEXTBOOK_LINKER_KEY]: true,
        [FEATURE_CONTENT_SHORTCUT_KEY]: true,
        [FEATURE_CAMPUSNET_GPA_TOOLS_KEY]: true,
        [FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY]: true,
        [FEATURE_KURSER_COURSE_EVAL_KEY]: true,
        [FEATURE_KURSER_ROOM_FINDER_KEY]: true,
        [FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY]: true
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
                storage.area.get(defaults).then(function(result) {
                    cb(result || Object.assign({}, defaults));
                }).catch(function() {
                    cb(Object.assign({}, defaults));
                });
            } else {
                storage.area.get(defaults, function(result) {
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
                storage.area.set(items).catch(function() {});
            } else {
                storage.area.set(items, function() {});
            }
        } catch (e) {
            // ignore
        }
    }

    function loadFeatureFlags(cb) {
        if (!IS_TOP_WINDOW) return;
        if (_featureFlagsLoaded) {
            if (cb) cb(_featureFlags);
            return;
        }
        storageLocalGet(FEATURE_FLAG_DEFAULTS, function(flags) {
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

    // Load feature flags early so cross-domain toggles work without a full refresh cycle.
    if (IS_TOP_WINDOW) {
        loadFeatureFlags(function() {
            try { syncAfterDarkFeatureToggleStates(); } catch (e) {}
            try { runTopWindowFeatureChecks(null, false); } catch (e) {}
        });
    }

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

        /* Preserve DTU red for important buttons */
        .d2l-button-primary,
        button[primary] {
            background-color: #c62828 !important;
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
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        button[aria-label^="Actions for"] d2l-icon[icon="tier1:chevron-down"] {
            background-color: #1a1a1a !important;
            background: #1a1a1a !important;
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
            background-color: #1a1a1a !important;
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

        /* Target the white rectangle inside list items */
        [slot="outside-control-container"] {
            background-color: #2d2d2d !important;
        }

        /* Selected/current item state - same dark 2 background */
        :host([current]) {
            background-color: #2d2d2d !important;
        }
        :host([current]) [slot="outside-control-container"] {
            background-color: #2d2d2d !important;
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

        observeInjectedShadowRoot(shadowRoot);
        processNestedShadowRoots(shadowRoot);
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

        var retryTimer = setTimeout(function() {
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
    }

    function observeInjectedShadowRoot(shadowRoot) {
        if (!shadowRoot || _observedShadowRoots.has(shadowRoot)) return;

        const observer = new MutationObserver(function(mutations) {
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
        const retryTimer = setTimeout(function() {
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
        header.header,
        div.main.row,
        form[action*="/Answer/Exclude/"],
        form[action*="/Answer/SaveAnswers/"],
        .header__title,
        .header__actions,
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

    // Function to apply darkest style to an element (#1a1a1a)
    function applyDarkStyle(el) {
        if (!el || !el.style) return;
        // Skip extension-created elements (ECTS bar, GPA rows, sim rows, etc.)
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return;
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
        // Skip extension-created elements (ECTS bar, GPA rows, sim rows, etc.)
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return;
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

    function forceDtuRedBackgroundDark2(el) {
        if (!el || !el.style) return;
        var styleAttr = (el.getAttribute && el.getAttribute('style')) || '';
        var hasDarkBg = /background(?:-color)?\s*:\s*(?:#2d2d2d|rgb\(\s*45\s*,\s*45\s*,\s*45\s*\))/i.test(styleAttr);
        var hasDarkBorder = /border-color\s*:\s*(?:#2d2d2d|rgb\(\s*45\s*,\s*45\s*,\s*45\s*\))/i.test(styleAttr);
        var hasNoBgImage = /background-image\s*:\s*none/i.test(styleAttr);
        if (hasDarkBg && hasDarkBorder && hasNoBgImage) return;

        el.style.setProperty('background', '#2d2d2d', 'important');
        el.style.setProperty('background-color', '#2d2d2d', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('border-color', '#2d2d2d', 'important');
    }

    function enforceDtuRedBackgroundZoneDark2() {
        if (!darkModeEnabled) return;
        var targets = document.querySelectorAll(
            '.dturedbackground, '
            + '.dturedbackground .container, '
            + '.dturedbackground .row, '
            + '.dturedbackground [class*="col-"], '
            + '.dturedbackground .pull-right, '
            + '.dturedbackground .pull-right span, '
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

        // Force white text on nav dropdown (Courses/Groups/Shortcuts menu)
        root.querySelectorAll('.nav__dropdown, article.nav__dropdown').forEach(dropdown => {
            dropdown.querySelectorAll('a, span, h2, li, div, header').forEach(el => {
                el.style.setProperty('color', '#ffffff', 'important');
            });
        });

        // Force dark 2 on DTU red background bar (studieplan.dtu.dk, campusnet.dtu.dk)
        root.querySelectorAll('.dturedbackground').forEach(forceDtuRedBackgroundDark2);
    }

    // MutationObserver to watch for style changes
    function setupStyleObserver(root) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const el = mutation.target;
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
    // Replace the "My Home" logo with custom white DTU logo for dark mode
    function replaceLogoImage(rootNode) {
        const newSrc = getExtensionUrl('images/Corp_White_Transparent.png');

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
            const logoImages = root.querySelectorAll('img[src*="/d2l/lp/navbars/"][src*="/theme/viewimage/"], img[alt="My Home"], img.websitelogoright__link-image, img[src*="dtulogo2_colour.png"], img[src*="dtulogo_colour.png"]');
            logoImages.forEach(img => {
                if (!img.dataset.darkModeReplaced) {
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

    // Run logo replacement (dark mode only)
    if (darkModeEnabled) replaceLogoImage();

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

    // ===== MOJANGLES TOGGLE IN ADMIN TOOLS =====
    function insertMojanglesToggle() {
        if (!IS_TOP_WINDOW) return;
        if (document.querySelector('#mojangles-toggle')) return;

        const placeholder = document.querySelector('#AdminToolsPlaceholderId');
        if (!placeholder) return;

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
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: #c62828;';

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

    // Run toggle insertion (unified observer handles updates)
    insertMojanglesToggle();

    // ===== DARK MODE TOGGLE (works in both dark and light modes) =====
    function insertDarkModeToggle() {
        if (!IS_TOP_WINDOW) return;
        if (document.querySelector('#dark-mode-toggle')) return;

        const placeholder = document.querySelector('#AdminToolsPlaceholderId');
        if (!placeholder) return;

        // Find or create the "DTU After Dark" column
        let targetList = null;
        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && h2.textContent === 'DTU After Dark') {
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
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: #c62828;';

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

    // Run dark mode toggle insertion
    insertDarkModeToggle();

    // ===== CONTEXT CAPTURE HELPER =====
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
        _contextCaptureToastTimer = setTimeout(function() {
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
        } catch (e) {}
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
        if (!IS_TOP_WINDOW) return;
        if (_contextCaptureActive) {
            showContextCaptureToast('Context capture is already active. Click an element or press Esc.', false);
            return;
        }

        _contextCaptureActive = true;
        showContextCaptureToast('Context capture active: click one element. Press Esc to cancel.', false);

        var clickHandler = async function(event) {
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

        var keydownHandler = function(event) {
            if (!_contextCaptureActive) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                stopContextCaptureMode();
                showContextCaptureToast('Context capture cancelled.', false);
            }
        };

        document.addEventListener('click', clickHandler, true);
        document.addEventListener('keydown', keydownHandler, true);

        _contextCaptureCleanup = function() {
            document.removeEventListener('click', clickHandler, true);
            document.removeEventListener('keydown', keydownHandler, true);
        };
    }

    function setupContextCaptureHotkey() {
        if (!IS_TOP_WINDOW || _contextCaptureHotkeyBound) return;

        document.addEventListener('keydown', function(event) {
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
        if (!IS_TOP_WINDOW) return;
        if (document.querySelector('#dtu-context-capture-btn')
            || document.querySelector('#dtu-context-capture-floating-btn')) return;

        // Preferred placement on DTU Learn homepage admin tools.
        if (!isDTULearnHomepage()) {
            insertContextCaptureFloatingHelper();
            return;
        }

        const placeholder = document.querySelector('#AdminToolsPlaceholderId');
        if (!placeholder) {
            insertContextCaptureFloatingHelper();
            return;
        }

        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && h2.textContent === 'DTU After Dark') {
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
            background: 'linear-gradient(135deg, #c62828, #8e0000)',
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
            borderBottom: '8px solid #c62828'
        });

        var title = document.createElement('span');
        Object.assign(title.style, { fontWeight: 'bold', fontSize: '14px' });
        title.textContent = '\u2699 DTU After Dark';

        var desc = document.createElement('span');
        desc.style.opacity = '0.9';
        desc.textContent = 'Click the gear to customize your dark mode experience!';

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
            setTimeout(function() { bubble.remove(); }, 300);
        }
        bubble.addEventListener('click', dismissBubble);

        // Auto-dismiss after 15 seconds
        setTimeout(function() {
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
        scope.querySelectorAll('.typebox').forEach(function(typebox) {
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

    // Run GPA insertion (unified observer handles updates)
    insertGPARow();

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
        if (!table || document.querySelector('.ects-progress-container')) return;

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
        const barColor = pct >= 100 ? '#4caf50' : pct >= 66 ? '#66b3ff' : pct >= 33 ? '#ffa726' : '#ef5350';
        barFill.style.cssText = 'height: 100%; border-radius: 9px; transition: width 0.3s; width: ' + pct + '%;';
        barFill.style.setProperty('background', barColor, 'important');
        barFill.style.setProperty('background-color', barColor, 'important');
        barFill.setAttribute('data-bar-color', barColor);

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

    // Run ECTS progress bar (unified observer handles updates)
    insertECTSProgressBar();

    // ===== CAMPUSNET GPA SIMULATOR (campusnet.dtu.dk) =====
    // Adds hypothetical grade rows to the grades table so users can simulate future GPA

    const DANISH_GRADES = [12, 10, 7, 4, 2, 0, -3];

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

        // Only show projected row if there are sim entries
        if (simECTS === 0) return;

        const currentGPA = actualECTS > 0 ? actualWeighted / actualECTS : 0;
        const projectedGPA = (actualECTS + simECTS) > 0
            ? (actualWeighted + simWeighted) / (actualECTS + simECTS) : 0;
        const delta = projectedGPA - currentGPA;

        const projRow = document.createElement('tr');
        projRow.className = 'gpa-projected-row';
        projRow.setAttribute('data-dtu-ext', '1');

        const tdLabel = document.createElement('td');
        tdLabel.setAttribute('data-dtu-ext', '1');
        tdLabel.colSpan = 2;
        tdLabel.style.cssText = 'text-align: left; font-weight: bold; padding: 8px 0;';
        tdLabel.style.setProperty('color', '#66b3ff', 'important');
        tdLabel.textContent = 'Projected GPA';

        const tdGrade = document.createElement('td');
        tdGrade.setAttribute('data-dtu-ext', '1');
        tdGrade.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold; white-space: nowrap;';
        tdGrade.style.setProperty('color', '#66b3ff', 'important');
        tdGrade.textContent = projectedGPA.toFixed(2);

        const tdECTS = document.createElement('td');
        tdECTS.setAttribute('data-dtu-ext', '1');
        tdECTS.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold;';
        tdECTS.style.setProperty('color', '#66b3ff', 'important');
        tdECTS.textContent = (actualECTS + simECTS);

        const tdDelta = document.createElement('td');
        tdDelta.setAttribute('data-dtu-ext', '1');
        tdDelta.style.cssText = 'text-align: right; padding-right: 5px; font-weight: bold; font-size: 12px;';
        if (delta > 0) {
            tdDelta.style.setProperty('color', '#4caf50', 'important');
            tdDelta.textContent = '+' + delta.toFixed(2);
        } else if (delta < 0) {
            tdDelta.style.setProperty('color', '#ef5350', 'important');
            tdDelta.textContent = delta.toFixed(2);
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
            document.querySelectorAll('.gpa-sim-row, .gpa-sim-add-row, .gpa-projected-row').forEach(function(el) {
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

        // Calculate projected GPA if there are saved entries
        if (savedEntries.length > 0) {
            updateProjectedGPA();
        }
    }

    // Run GPA simulator (unified observer handles updates)
    insertGPASimulator();

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
        } catch (e) {}
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
        _contentButtonBootstrapTimer = setInterval(function() {
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
        deepQueryAll('.dtu-dark-content-btn', scanRoot).forEach(function(btn) {
            try { btn.remove(); } catch (e) {}
        });
        deepQueryAll('#dtu-content-btn-styles', scanRoot).forEach(function(styleEl) {
            try { styleEl.remove(); } catch (e) {}
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
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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
        (groups || []).forEach(function(g) {
            const period = String(g && g.heading || '');
            (g && Array.isArray(g.items) ? g.items : []).forEach(function(item) {
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
        out.sort(function(a, b) { return a.nextTs - b.nextTs; });
        return out.slice(0, (typeof limit === 'number' && limit > 0) ? limit : 8);
    }

    function requestStudentDeadlines(forceRefresh, cb) {
        if (!IS_TOP_WINDOW) return;
        if (_deadlinesFetchInProgress) return;

        const now = Date.now();
        if (!forceRefresh && _deadlinesLastRequestAt && (now - _deadlinesLastRequestAt) < 1500) return;
        _deadlinesLastRequestAt = now;

        _deadlinesFetchInProgress = true;
        sendRuntimeMessage({ type: 'dtu-student-deadlines', forceRefresh: !!forceRefresh }, function(response) {
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
        courseRows.forEach(function(r) {
            r.kind = 'course';
            r.sourceUrl = courseUrl;
            out.push(r);
        });
        examRows.forEach(function(r) {
            r.kind = 'exam';
            r.sourceUrl = examUrl;
            out.push(r);
        });

        out.sort(function(a, b) { return a.nextTs - b.nextTs; });
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

        const expanded = localStorage.getItem(DEADLINES_EXPANDED_KEY) === 'true';
        if (chevronBtn) {
            chevronBtn.setAttribute('icon', expanded ? 'tier1:chevron-up' : 'tier1:chevron-down');
            chevronBtn.setAttribute('expanded', expanded ? 'true' : 'false');
            chevronBtn.setAttribute('text', expanded ? 'Show fewer deadlines' : 'Show more deadlines');
            chevronBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
        if (more) more.style.display = expanded ? 'block' : 'none';
        if (footer) footer.style.display = 'flex';

        if (!resp || !resp.ok) {
            if (summary) summary.textContent = '...';
            const loading = document.createElement('div');
            markExt(loading);
            loading.textContent = _deadlinesFetchInProgress ? 'Loading deadlines...' : 'Loading deadlines...';
            loading.style.cssText = 'font-size: 13px; color: ' + (darkModeEnabled ? '#b0b0b0' : '#6b7280') + ';';
            if (next) next.appendChild(loading);

            if (!_deadlinesFetchInProgress) {
                requestStudentDeadlines(false, function() { renderDeadlinesHomepageWidget(widget); });
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

        if (next) next.appendChild(createDeadlinesHomeRow(nextRow, todayTs, false));

        if (expanded && more) {
            for (let i = 1; i < rows.length; i++) {
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
            sources.querySelectorAll('a').forEach(function(a) {
                if (a.getAttribute('data-kind') === 'course') a.href = courseUrl;
                if (a.getAttribute('data-kind') === 'exam') a.href = examUrl;
            });
        }

        // Refresh at most once per day (and only if stale/missing).
        const now = Date.now();
        const fetchedAt = (resp && typeof resp.fetchedAt === 'number') ? resp.fetchedAt : 0;
        const stale = !fetchedAt || (now - fetchedAt) > DEADLINES_CACHE_TTL_MS;
        if (stale && !_deadlinesFetchInProgress) {
            requestStudentDeadlines(false, function() { renderDeadlinesHomepageWidget(widget); });
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
            chevronBtn.addEventListener('click', function() {
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
            refreshBtn.addEventListener('mouseenter', function() {
                refreshBtn.style.setProperty('color', darkModeEnabled ? '#ccc' : '#555', 'important');
            });
            refreshBtn.addEventListener('mouseleave', function() {
                refreshBtn.style.setProperty('color', darkModeEnabled ? '#888' : '#9ca3af', 'important');
            });
            refreshBtn.addEventListener('click', function() {
                refreshBtn.disabled = true;
                refreshBtn.style.opacity = '0.5';
                requestStudentDeadlines(true, function() { renderDeadlinesHomepageWidget(widget); });
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
            courseA.addEventListener('mouseenter', function() { courseA.style.textDecoration = 'underline'; });
            courseA.addEventListener('mouseleave', function() { courseA.style.textDecoration = 'none'; });

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
            examA.addEventListener('mouseenter', function() { examA.style.textDecoration = 'underline'; });
            examA.addEventListener('mouseleave', function() { examA.style.textDecoration = 'none'; });

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

        requestAnimationFrame(function() { overlay.style.opacity = '1'; });

        const modal = document.createElement('div');
        markExt(modal);
        modal.style.cssText = 'background: ' + theme.background + '; color: ' + theme.text + '; '
            + 'border: 1px solid ' + theme.border + '; border-radius: 14px; '
            + 'width: min(760px, 92vw); max-height: 82vh; overflow: auto; '
            + 'box-shadow: 0 16px 64px rgba(0,0,0,0.45); padding: 20px 22px;';

        function dismiss() {
            overlay.style.opacity = '0';
            setTimeout(function() { overlay.remove(); }, 160);
        }

        overlay.addEventListener('click', function(e) {
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
        refreshBtn.addEventListener('click', function() {
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
            a.addEventListener('mouseenter', function() { a.style.textDecoration = 'underline'; });
            a.addEventListener('mouseleave', function() { a.style.textDecoration = 'none'; });

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

            rows.forEach(function(r, idx) {
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

                requestStudentDeadlines(!!force, function(newResp) {
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
        rows.sort(function(a, b) { return a.nextTs - b.nextTs; });
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
                + 'border-radius: 8px; border-left: 2px solid #c62828; border: 1px solid ' + (darkModeEnabled ? '#404040' : '#d1d5db') + '; '
                + 'background: ' + (darkModeEnabled ? '#2d2d2d' : '#ffffff') + '; '
                + 'color: ' + (darkModeEnabled ? '#e0e0e0' : '#333') + '; '
                + 'font-size: 12px; cursor: pointer; line-height: 1.2;';

            // Beat global `button { ... !important }` rules in darkmode.css.
            btn.style.setProperty('background', darkModeEnabled ? '#2d2d2d' : '#ffffff', 'important');
            btn.style.setProperty('background-color', darkModeEnabled ? '#2d2d2d' : '#ffffff', 'important');
            btn.style.setProperty('color', darkModeEnabled ? '#e0e0e0' : '#333', 'important');
            btn.style.setProperty('border-color', darkModeEnabled ? '#404040' : '#d1d5db', 'important');
            btn.style.setProperty('border-left', '2px solid #c62828', 'important');

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

            btn.addEventListener('mouseenter', function() {
                btn.style.boxShadow = darkModeEnabled
                    ? '0 6px 20px rgba(0,0,0,0.35)'
                    : '0 8px 22px rgba(15,23,42,0.12)';
            });
            btn.addEventListener('mouseleave', function() {
                btn.style.boxShadow = 'none';
            });

            btn.addEventListener('click', function() {
                showDeadlinesModal(false);
            });

            btn.appendChild(title);
            btn.appendChild(summary);
            navWidgets.appendChild(btn);
        } else {
            // Update theme when dark mode toggles
            btn.style.setProperty('border-color', darkModeEnabled ? '#404040' : '#d1d5db', 'important');
            btn.style.setProperty('border-left', '2px solid #c62828', 'important');
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
            requestStudentDeadlines(false, function() { updateDeadlinesWidgetSummary(); });
        }
    }

    function insertDeadlinesToggle() {
        if (!IS_TOP_WINDOW) return;
        if (window.location.hostname !== 'learn.inside.dtu.dk') return;
        if (document.querySelector('#deadlines-toggle')) return;

        const placeholder = document.querySelector('#AdminToolsPlaceholderId');
        if (!placeholder) return;

        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && h2.textContent === 'DTU After Dark') {
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
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: #c62828;';

        toggle.addEventListener('change', function() {
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
        if (document.querySelector('#search-widget-toggle')) return;

        const placeholder = document.querySelector('#AdminToolsPlaceholderId');
        if (!placeholder) return;

        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && h2.textContent === 'DTU After Dark') {
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
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: #c62828;';

        toggle.addEventListener('change', function() {
            localStorage.setItem(SEARCH_WIDGET_ENABLED_KEY, toggle.checked.toString());
            insertDeadlinesHomepageWidget();
        });

        label.appendChild(toggle);
        label.appendChild(document.createTextNode('Search Courses Widget'));
        li.appendChild(label);
        targetList.appendChild(li);
    }

    function getAfterDarkAdminToolsList() {
        const placeholder = document.querySelector('#AdminToolsPlaceholderId');
        if (!placeholder) return null;
        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && h2.textContent === 'DTU After Dark') {
                targetList = col.querySelector('ul.d2l-list');
            }
        });
        return targetList;
    }

    function insertAfterDarkFeatureToggle(id, labelText, featureKey) {
        if (document.querySelector('#' + id)) return;
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
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: #c62828;';

        toggle.addEventListener('change', function() {
            setFeatureFlagEnabled(featureKey, toggle.checked);

            // Apply immediately on pages where the feature is visible.
            if (featureKey === FEATURE_BOOK_FINDER_KEY) {
                if (toggle.checked) {
                    insertBookFinderLinks();
                } else {
                    // Remove any injected bars and reset markers.
                    document.querySelectorAll('[data-book-finder-bar]').forEach(function(el) { el.remove(); });
                    document.querySelectorAll('[data-book-finder-injected]').forEach(function(el) {
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
        insertAfterDarkFeatureToggle('feature-kurser-grade-stats-toggle', 'Kurser Grade Stats', FEATURE_KURSER_GRADE_STATS_KEY);
        insertAfterDarkFeatureToggle('feature-kurser-course-eval-toggle', 'Course Evaluation (Kurser)', FEATURE_KURSER_COURSE_EVAL_KEY);
        insertAfterDarkFeatureToggle('feature-kurser-room-finder-toggle', 'Room Finder (Kurser)', FEATURE_KURSER_ROOM_FINDER_KEY);
        insertAfterDarkFeatureToggle('feature-kurser-textbook-linker-toggle', 'Textbook links (Kurser)', FEATURE_KURSER_TEXTBOOK_LINKER_KEY);
        insertAfterDarkFeatureToggle('feature-kurser-schedule-annotation-toggle', 'Schedule Annotation (Kurser)', FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY);
        insertAfterDarkFeatureToggle('feature-campusnet-gpa-tools-toggle', 'CampusNet GPA Tools', FEATURE_CAMPUSNET_GPA_TOOLS_KEY);
        insertAfterDarkFeatureToggle('feature-studyplan-exam-cluster-toggle', 'Studyplan Exam Cluster', FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY);
    }

    function syncAfterDarkFeatureToggleStates() {
        if (!IS_TOP_WINDOW) return;
        const mapping = [
            { id: 'feature-book-finder-toggle', key: FEATURE_BOOK_FINDER_KEY },
            { id: 'feature-content-shortcut-toggle', key: FEATURE_CONTENT_SHORTCUT_KEY },
            { id: 'feature-kurser-grade-stats-toggle', key: FEATURE_KURSER_GRADE_STATS_KEY },
            { id: 'feature-kurser-course-eval-toggle', key: FEATURE_KURSER_COURSE_EVAL_KEY },
            { id: 'feature-kurser-room-finder-toggle', key: FEATURE_KURSER_ROOM_FINDER_KEY },
            { id: 'feature-kurser-textbook-linker-toggle', key: FEATURE_KURSER_TEXTBOOK_LINKER_KEY },
            { id: 'feature-kurser-schedule-annotation-toggle', key: FEATURE_KURSER_SCHEDULE_ANNOTATION_KEY },
            { id: 'feature-campusnet-gpa-tools-toggle', key: FEATURE_CAMPUSNET_GPA_TOOLS_KEY },
            { id: 'feature-studyplan-exam-cluster-toggle', key: FEATURE_STUDYPLAN_EXAM_CLUSTER_KEY }
        ];
        mapping.forEach(function(m) {
            const el = document.querySelector('#' + m.id);
            if (el) el.checked = isFeatureFlagEnabled(m.key);
        });
    }

    function restructureAdminToolsPanel() {
        if (!IS_TOP_WINDOW) return;
        var placeholder = document.querySelector('#AdminToolsPlaceholderId');
        if (!placeholder) return;

        // Already restructured?
        if (placeholder.getAttribute('data-dtu-restructured') === '1') return;

        // Find the DTU After Dark column
        var afterDarkCol = null;
        var orgCol = null;
        placeholder.querySelectorAll('.d2l-admin-tools-column').forEach(function(col) {
            var h2 = col.querySelector('h2');
            if (!h2) return;
            if (h2.textContent === 'DTU After Dark') afterDarkCol = col;
            else if (h2.textContent === 'Organization Related') orgCol = col;
        });

        if (!afterDarkCol) return;

        // Define groups with toggle IDs
        var groups = [
            { label: 'Appearance', ids: ['dark-mode-toggle', 'mojangles-toggle'] },
            { label: 'Homepage', ids: ['bus-departures-toggle', 'deadlines-toggle', 'search-widget-toggle', 'feature-content-shortcut-toggle'] },
            { label: 'Course Tools', ids: ['feature-book-finder-toggle', 'feature-kurser-grade-stats-toggle', 'feature-kurser-textbook-linker-toggle', 'feature-kurser-course-eval-toggle', 'feature-kurser-room-finder-toggle', 'feature-kurser-schedule-annotation-toggle'] },
            { label: 'Academic', ids: ['feature-campusnet-gpa-tools-toggle', 'feature-studyplan-exam-cluster-toggle'] }
        ];

        // Collect existing toggle elements by ID
        var toggleMap = {};
        afterDarkCol.querySelectorAll('input[type="checkbox"]').forEach(function(input) {
            if (input.id) {
                var li = input.closest('li');
                if (li) toggleMap[input.id] = li;
            }
        });

        // Build new panel
        var isDark = darkModeEnabled;
        var bg1 = isDark ? '#1a1a1a' : '#f9fafb';
        var bg2 = isDark ? '#2d2d2d' : '#ffffff';
        var border = isDark ? '#333' : '#e5e7eb';
        var textMain = isDark ? '#e0e0e0' : '#1f2937';
        var textMuted = isDark ? '#888' : '#6b7280';

        // Replace the column content
        var list = afterDarkCol.querySelector('ul.d2l-list');
        if (!list) return;

        // Clear the list
        while (list.firstChild) list.removeChild(list.firstChild);
        list.style.cssText = 'list-style: none; padding: 0; margin: 0; '
            + 'display: flex; flex-direction: column; gap: 8px;';
        if (isDark) list.style.setProperty('background-color', bg2, 'important');

        groups.forEach(function(group) {
            // Check if any toggles exist for this group
            var hasToggles = false;
            group.ids.forEach(function(id) { if (toggleMap[id]) hasToggles = true; });
            if (!hasToggles) return;

            var section = document.createElement('li');
            markExt(section);
            section.style.cssText = 'padding: 6px 8px; border-radius: 8px; '
                + 'background: ' + bg1 + '; '
                + 'border: 1px solid ' + border + ';';
            if (isDark) {
                section.style.setProperty('background', bg1, 'important');
                section.style.setProperty('background-color', bg1, 'important');
            }

            var groupLabel = document.createElement('div');
            markExt(groupLabel);
            groupLabel.textContent = group.label;
            groupLabel.style.cssText = 'font-size: 10px; font-weight: 700; letter-spacing: 0.5px; '
                + 'text-transform: uppercase; color: ' + textMuted + '; margin-bottom: 5px;';
            section.appendChild(groupLabel);

            var row = document.createElement('div');
            markExt(row);
            row.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px 8px;';

            group.ids.forEach(function(id) {
                var oldLi = toggleMap[id];
                if (!oldLi) return;

                // Extract the checkbox and label text
                var input = oldLi.querySelector('input[type="checkbox"]');
                var oldLabel = oldLi.querySelector('label');
                var labelText = '';
                if (oldLabel) {
                    oldLabel.childNodes.forEach(function(n) {
                        if (n.nodeType === 3) labelText += n.textContent;
                    });
                }
                labelText = labelText.trim();
                if (!input || !labelText) return;

                var chip = document.createElement('label');
                markExt(chip);
                chip.style.cssText = 'display: inline-flex; align-items: center; gap: 5px; '
                    + 'cursor: pointer; font-size: 12px; padding: 3px 8px; border-radius: 6px; '
                    + 'background: ' + bg2 + '; '
                    + 'border: 1px solid ' + border + '; '
                    + 'color: ' + textMain + '; '
                    + 'white-space: nowrap; user-select: none;';
                if (isDark) {
                    chip.style.setProperty('background', bg2, 'important');
                    chip.style.setProperty('background-color', bg2, 'important');
                    chip.style.setProperty('color', textMain, 'important');
                    chip.style.setProperty('border-color', border, 'important');
                }

                // Restyle checkbox smaller
                input.style.cssText = 'width: 13px; height: 13px; cursor: pointer; accent-color: #c62828; margin: 0;';

                chip.appendChild(input);
                chip.appendChild(document.createTextNode(labelText));
                row.appendChild(chip);
            });

            section.appendChild(row);
            list.appendChild(section);
        });

        // Hide the Organization Related column
        if (orgCol) {
            orgCol.style.setProperty('display', 'none', 'important');
        }

        placeholder.setAttribute('data-dtu-restructured', '1');
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
        root.querySelectorAll('tr').forEach(function(row) {
            if (!row.querySelector('img[src*="Framework.GraphBar"]')) return;

            row.querySelectorAll('td.d_tl.d_tm.d_tn, td.d_tr.d_tm.d_tn').forEach(function(td) { forceDark1(td); });
            row.querySelectorAll('.d2l-grades-score, .dco, .dco_c').forEach(function(el) {
                if (!el || !el.style) return;
                el.style.setProperty('background-color', '#1a1a1a', 'important');
                el.style.setProperty('background', '#1a1a1a', 'important');
                el.style.setProperty('color', '#e0e0e0', 'important');
                el.style.setProperty('background-image', 'none', 'important');
            });
            row.querySelectorAll('label').forEach(function(label) {
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
        if (toggle) toggle.checked = false;
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
            timeoutId = setTimeout(function() {
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
        notice.className = 'dtu-quota-exhausted';
        notice.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; '
            + 'background: linear-gradient(135deg, #b71c1c 0%, #880e0e 100%); '
            + 'color: #fff; padding: 16px 20px; border-radius: 12px; '
            + 'font-family: "Segoe UI", sans-serif; font-size: 13px; line-height: 1.5; '
            + 'max-width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); '
            + 'animation: dtuSlideIn 0.3s ease-out;';

        var title = document.createElement('div');
        title.style.cssText = 'font-weight: 700; font-size: 14px; margin-bottom: 6px;';
        title.textContent = 'Bus Departures Paused';

        var msg = document.createElement('div');
        msg.style.opacity = '0.95';
        var countdownEl = null;
        var countdownInterval = null;

        if (isDaily) {
            msg.textContent = 'You\u2019ve used ' + getDailyApiCount().count + '/' + DAILY_API_LIMIT
                + ' bus lookups today.';

            // Countdown to local midnight
            countdownEl = document.createElement('div');
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
            if (toggle) toggle.checked = false;
        }

        var dismiss = document.createElement('button');
        dismiss.style.cssText = 'margin-top: 10px; background: rgba(255,255,255,0.15); color: #fff; '
            + 'border: 1px solid rgba(255,255,255,0.3); padding: 6px 16px; border-radius: 6px; '
            + 'cursor: pointer; font-size: 12px; font-weight: 600;';
        dismiss.textContent = 'Got it';
        dismiss.addEventListener('click', function() {
            if (countdownInterval) clearInterval(countdownInterval);
            notice.style.transition = 'opacity 0.3s';
            notice.style.opacity = '0';
            setTimeout(function() { notice.remove(); }, 300);
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
        config.lines.forEach(function(l) { lineCounts[l.line] = 0; });

        function hasEnough() {
            return config.lines.every(function(l) { return lineCounts[l.line] >= DEPS_PER_LINE; });
        }

        try {
            // Fetch stops one by one, stop early when we have enough
            for (var i = 0; i < config.stopIds.length; i++) {
                if (hasEnough()) break;
                var deps = await getDepartures(config.stopIds[i]);
                deps.forEach(function(dep) {
                    var configLine = config.lines.find(function(l) { return l.line === dep.line; });
                    if (!configLine) return;
                    if (lineCounts[dep.line] >= DEPS_PER_LINE) return;
                    var matchesDir = configLine.directions.some(function(d) {
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
        allDeps.sort(function(a, b) { return (a.minutes || 999) - (b.minutes || 999); });
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
            + 'border-left: 2px solid #c62828; align-self: center; border-radius: 0 6px 6px 0; '
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
        _cachedDepartures.forEach(function(dep) {
            if (!lineGroups[dep.line]) lineGroups[dep.line] = [];
            lineGroups[dep.line].push(dep);
        });
        // Fixed alphabetical order so columns never swap
        var lineOrder = Object.keys(lineGroups).sort();
        // Sort departures within each line: earliest first
        lineOrder.forEach(function(line) {
            lineGroups[line].sort(function(a, b) { return (a.minutes != null ? a.minutes : 999) - (b.minutes != null ? b.minutes : 999); });
        });

        // One column per line, side by side
        lineOrder.forEach(function(line, li) {
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
            lineGroups[line].forEach(function(dep) {
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
        _cachedDepartures.forEach(function(dep) {
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
    document.addEventListener('visibilitychange', function() {
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
        requestAnimationFrame(function() { overlay.style.opacity = '1'; });

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
                if (toggle) toggle.checked = false;
            }
            overlay.style.opacity = '0';
            setTimeout(function() { overlay.remove(); }, 200);
        }

        overlay.addEventListener('click', function(e) {
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
                config.lines.forEach(function(lineCfg, idx) {
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
                    delBtn.addEventListener('mouseenter', function() { delBtn.style.borderColor = '#c62828'; delBtn.style.color = '#ef5350'; });
                    delBtn.addEventListener('mouseleave', function() { delBtn.style.borderColor = modalTheme.softBorder; delBtn.style.color = modalTheme.muted; });
                    (function(capturedIdx) {
                        delBtn.addEventListener('click', function() {
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
                addBtn.addEventListener('mouseenter', function() { addBtn.style.borderColor = '#66b3ff'; });
                addBtn.addEventListener('mouseleave', function() { addBtn.style.borderColor = modalTheme.softBorder; });
                addBtn.addEventListener('click', function() { renderAddLineView(); });
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
            doneBtn.addEventListener('click', function() {
                overlay.style.opacity = '0';
                setTimeout(function() { overlay.remove(); }, 200);
            });
            btnRow.appendChild(doneBtn);
            modal.appendChild(btnRow);
        }

        // ---- Add Line View: pick one bus line to add ----
        function renderAddLineView() {
            while (modal.firstChild) modal.removeChild(modal.firstChild);
            var config = getBusConfig() || { stopIds: DTU_AREA_STOP_IDS.slice(), lines: [] };
            if (config.lines.length >= MAX_LINES) { renderManageView(); return; }
            var configuredLineNames = config.lines.map(function(l) { return l.line; });

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

            var availableLines = DTU_BUS_LINES.filter(function(bus) { return configuredLineNames.indexOf(bus.line) === -1; });

            availableLines.forEach(function(bus) {
                var color = LINE_COLORS[bus.line] || '#1565c0';
                var card = document.createElement('button');
                card.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 14px 16px; '
                    + 'cursor: pointer; border-radius: 8px; border: 2px solid ' + modalTheme.border + '; background: transparent; '
                    + 'transition: border-color 0.15s, background 0.15s; text-align: left;';
                card.addEventListener('mouseenter', function() { card.style.borderColor = color; card.style.backgroundColor = modalTheme.hoverAddCard; });
                card.addEventListener('mouseleave', function() { card.style.borderColor = modalTheme.border; card.style.backgroundColor = 'transparent'; });

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

                card.addEventListener('click', function() { renderDirectionView(bus.line); });
            });

            modal.appendChild(grid);

            // Back button
            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;';
            var backBtn = document.createElement('button');
            backBtn.style.cssText = 'background: transparent; color: ' + modalTheme.muted + '; border: 1px solid ' + modalTheme.softBorder + '; '
                + 'padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px;';
            backBtn.textContent = config.lines.length > 0 ? 'Back' : 'Cancel';
            backBtn.addEventListener('click', function() {
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
            allDepartures.forEach(function(d) {
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
            directions.forEach(function(direction) {
                var row = document.createElement('label');
                row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 12px; '
                    + 'cursor: pointer; border-radius: 6px; margin-bottom: 2px; transition: background 0.15s;';
                row.addEventListener('mouseenter', function() { row.style.backgroundColor = modalTheme.hoverRow; });
                row.addEventListener('mouseleave', function() { row.style.backgroundColor = 'transparent'; });

                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = true;
                cb.style.cssText = 'width: 16px; height: 16px; accent-color: #c62828; cursor: pointer;';

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
            backBtn.addEventListener('click', function() { renderAddLineView(); });

            var saveBtn = document.createElement('button');
            saveBtn.style.cssText = 'background: #1565c0; color: #fff; border: none; padding: 8px 20px; '
                + 'border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;';
            saveBtn.textContent = 'Add Line';

            saveBtn.addEventListener('click', function() {
                var selectedDirs = dirCheckboxes.filter(function(dc) { return dc.cb.checked; }).map(function(dc) { return dc.direction; });
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
        if (document.querySelector('#bus-departures-toggle')) return;

        const placeholder = document.querySelector('#AdminToolsPlaceholderId');
        if (!placeholder) return;

        const columns = placeholder.querySelectorAll('.d2l-admin-tools-column');
        let targetList = null;
        columns.forEach(col => {
            const h2 = col.querySelector('h2');
            if (h2 && h2.textContent === 'DTU After Dark') {
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
        toggle.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: #c62828;';

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

    // Run initial bus functions
    if (isDTULearnHomepage()) {
        insertDeadlinesToggle();
        insertSearchWidgetToggle();
        insertDeadlinesHomepageWidget();
        updateBusDepartures();
        restructureAdminToolsPanel();
    }

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
            document.querySelectorAll('[data-book-finder-bar]').forEach(function(el) { el.remove(); });
            document.querySelectorAll('[data-book-finder-injected]').forEach(function(el) {
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
                if (isValidISBN13(rawBare) && !isbnHits.some(function(h) { return h.isbn === rawBare; })) {
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
                if (bookInfo.length >= 10 && !titleHits.some(function(h) { return h.title === bookInfo; })) {
                    titleHits.push({ element: container, title: bookInfo, isbn: null });
                }
            }

            // Check quoted titles
            if (!keyColonMatch) {
                QUOTED_TITLE_REGEX.lastIndex = 0;
                var qMatch;
                while ((qMatch = QUOTED_TITLE_REGEX.exec(cText)) !== null) {
                    var candidateTitle = qMatch[1].trim();
                    if (isTitleCase(candidateTitle) && !titleHits.some(function(h) { return h.title === candidateTitle; })) {
                        titleHits.push({ element: container, title: candidateTitle, isbn: null });
                    }
                }

                // Check <em> and <i> tags
                var emEls = container.querySelectorAll('em, i');
                for (var e = 0; e < emEls.length; e++) {
                    var emText = emEls[e].textContent.trim();
                    if (isTitleCase(emText) && emText.split(/\s+/).length >= 3
                        && !titleHits.some(function(h) { return h.title === emText; })) {
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
        document.querySelectorAll('tr').forEach(function(tr) {
            var cells = tr.querySelectorAll('th, td');
            if (cells.length < 2) return;
            var label = (cells[0].textContent || '').replace(/\s+/g, ' ').trim();
            if (!isKurserLiteratureLabel(label)) return;
            addCandidate(cells[cells.length - 1]);
        });

        // Definition list layout: <dt>label</dt><dd>content</dd>
        document.querySelectorAll('dt').forEach(function(dt) {
            if (!isKurserLiteratureLabel((dt.textContent || '').trim())) return;
            var dd = dt.nextElementSibling;
            while (dd && dd.tagName && dd.tagName.toLowerCase() !== 'dd') dd = dd.nextElementSibling;
            addCandidate(dd);
        });

        // Generic heading/label layout.
        document.querySelectorAll('h1, h2, h3, h4, strong, b, label, div, span, p').forEach(function(el) {
            var label = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!isKurserLiteratureLabel(label)) return;
            if (label.length > 50) return;

            var candidate = null;
            if (el.nextElementSibling) {
                candidate = el.nextElementSibling;
            } else if (el.parentElement) {
                var siblings = Array.prototype.filter.call(el.parentElement.children, function(ch) {
                    return ch !== el && ((ch.innerText || ch.textContent || '').replace(/\s+/g, ' ').trim().length > 0);
                });
                if (siblings.length === 1) {
                    candidate = siblings[0];
                } else if (siblings.length > 1) {
                    candidate = siblings.reduce(function(best, cur) {
                        var bestLen = (best.innerText || best.textContent || '').length;
                        var curLen = (cur.innerText || cur.textContent || '').length;
                        return curLen > bestLen ? cur : best;
                    });
                }
            }
            addCandidate(candidate);
        });

        // Inline layout: "Course literature: [1] ...".
        document.querySelectorAll('p, div, td, dd, span, li').forEach(function(el) {
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
                    listItems.forEach(function(li) {
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
        collected.forEach(function(line) {
            splitKurserLiteratureText(line).forEach(function(part) {
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
        var lines = txt.split(/\r?\n+/).map(function(s) { return s.trim(); }).filter(Boolean);
        if (lines.length > 1) {
            var merged = [];
            lines.forEach(function(line) {
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
            merged.forEach(function(line) {
                var bracketParts = line.split(/(?=\[\s*\d+\s*\])/g).map(function(s) { return s.trim(); }).filter(Boolean);
                if (bracketParts.length > 1) {
                    bracketParts.forEach(function(p) { expanded.push(p); });
                    return;
                }
                expanded.push(line);
            });
            return expanded;
        }

        // Single-line fallbacks: split on citation markers.
        var one = txt.replace(/\s+/g, ' ').trim();
        var splitByBracket = one.split(/(?=\[\s*\d+\s*\])/g).map(function(s) { return s.trim(); }).filter(Boolean);
        if (splitByBracket.length > 1) return splitByBracket;

        var splitByNumber = one.split(/(?=\b\d+\s*[.)]\s*[A-Z])/g).map(function(s) { return s.trim(); }).filter(Boolean);
        if (splitByNumber.length > 1) return splitByNumber;

        var splitBySemicolon = one.split(/\s*;\s*/g).map(function(s) { return s.trim(); }).filter(Boolean);
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
        sendRuntimeMessage({ type: 'dtu-findit-availability', url: url }, function(response) {
            var onlineAccess = !!(response && response.ok && response.onlineAccess);
            var pending = _finditAvailabilityCache[url];
            _finditAvailabilityCache[url] = { done: true, onlineAccess: onlineAccess };
            if (pending && Array.isArray(pending.callbacks)) {
                pending.callbacks.forEach(function(fn) {
                    try { fn(onlineAccess); } catch (e) {}
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
            blockCandidates.forEach(function(node) {
                var raw = (node.innerText || node.textContent || '');
                splitKurserLiteratureText(raw).forEach(function(txt) {
                    if (!txt) return;
                    items.push({ text: txt, anchor: node });
                });
            });
        } else {
            var raw = (container.innerText || container.textContent || '');
            splitKurserLiteratureText(raw).forEach(function(txt) {
                items.push({ text: txt, anchor: container });
            });
        }

        var seen = Object.create(null);
        return items.filter(function(item) {
            if (!item.text || seen[item.text]) return false;
            seen[item.text] = true;
            return true;
        });
    }

    function injectKurserTextbookBadges(container, lines) {
        var fallback = null;
        var injected = 0;
        var seenKeys = Object.create(null);

        lines.forEach(function(item) {
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
                checkFinditOnlineAccess(libraryUrl, function(hasOnlineAccess) {
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

        bars.forEach(function(bar) {
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
            section.lines.forEach(function(line) {
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
                toHide.forEach(function(n) { originalWrap.appendChild(n); });
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

            var accentColor = darkModeEnabled ? '#e57373' : '#990000';
            var textColor = darkModeEnabled ? '#e0e0e0' : '#333';
            var mutedColor = darkModeEnabled ? '#888' : '#777';
            var dividerColor = darkModeEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

            var injectedCount = 0;
            var seenKeys = Object.create(null);

            uniqueLines.forEach(function(lineText) {
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
                        + 'border: 1px solid ' + (darkModeEnabled ? 'rgba(229,115,115,0.35)' : 'rgba(153,0,0,0.2)') + '; '
                        + 'background: ' + (darkModeEnabled ? 'rgba(153,0,0,0.18)' : 'rgba(153,0,0,0.05)') + ';';
                    actions.appendChild(finditLink);

                    checkFinditOnlineAccess(libraryUrl, function(hasOnlineAccess) {
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
        document.querySelectorAll('[data-dtu-textbook-original]').forEach(function(wrapper) {
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
            document.querySelectorAll('[data-dtu-textbook-linker], [data-dtu-textbook-linker-bar-host], [data-dtu-textbook-linker-fallback]').forEach(function(el) {
                el.remove();
            });
            restoreKurserLiteratureOriginals();
            document.querySelectorAll('[data-dtu-textbook-linker-scanned], [data-dtu-textbook-linker-attempts]').forEach(function(el) {
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

        containers.forEach(function(container) {
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
            document.querySelectorAll('[data-dtu-textbook-linker], [data-dtu-textbook-linker-bar-host], [data-dtu-textbook-linker-fallback]').forEach(function(el) {
                el.remove();
            });
            restoreKurserLiteratureOriginals();
            document.querySelectorAll('[data-dtu-textbook-linker-scanned], [data-dtu-textbook-linker-attempts]').forEach(function(el) {
                el.removeAttribute('data-dtu-textbook-linker-scanned');
                el.removeAttribute('data-dtu-textbook-linker-attempts');
            });
            return;
        }
        if (_kurserTextbookLinkerTimer) return;
        _kurserTextbookLinkerTimer = setTimeout(function() {
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
                    p.then(cb).catch(function() { cb(null); });
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
        }, function(response) {
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

                iterations.slice(0, 3).forEach(function(iter, idx) {
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
                series = grades.map(function(g) {
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
            series.forEach(function(s) {
                var c = s.count || 0;
                if (c > maxCount) maxCount = c;
            });

            series.forEach(function(s) {
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
            try { container.setAttribute('data-dtu-course-eval-nexttry', String(Date.now() + delay)); } catch (e) {}

            // startHostFeatureBootstrap() stops once the container exists, so ensure we retry even if the page becomes static.
            try {
                if (_courseEvalRetryTimer) clearTimeout(_courseEvalRetryTimer);
                _courseEvalRetryTimer = setTimeout(function() {
                    _courseEvalRetryTimer = null;
                    try { insertKurserCourseEvaluation(); } catch (e) {}
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
            }, function(response) {
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
                domLinks.sort(function(a, b) { return (b.id || 0) - (a.id || 0); });
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
        try { infoFetchOpts.headers = { 'Accept': 'text/html' }; } catch (e) {}

        fetch(infoUrl, infoFetchOpts)
            .then(function(res) {
                if (!res.ok) throw new Error('info_http_' + res.status);
                return res.text();
            })
            .then(function(infoHtml) {
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
                try { container.removeAttribute('data-dtu-course-eval-info-cred'); } catch (e) {}
                fetchAndRenderEvaluation(latestEvalUrl, latestEvalLabel);
            })
            .catch(function(err) {
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
            data.questions.forEach(function(q) {
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
            EVAL_SATISFACTION_KEYS.forEach(function(key) {
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
            + 'background: ' + (darkModeEnabled ? 'rgba(153,0,0,0.25)' : 'rgba(153,0,0,0.1)') + '; '
            + 'color: ' + (darkModeEnabled ? '#ff8a80' : '#990000') + ';';
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
            overallQuestions.forEach(function(q) {
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

            questionsForUi.forEach(function(q, idx) {
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
            ['Much less', 'Less', 'As expected', 'More', 'Much more'].forEach(function(lbl) {
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
            _roomFinderDataCallbacks.forEach(function(fn) { fn(null); });
            _roomFinderDataCallbacks = [];
            return;
        }

        fetch(jsonUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                _roomFinderDataCache = data;
                _roomFinderDataLoading = false;
                _roomFinderDataCallbacks.forEach(function(fn) { fn(data); });
                _roomFinderDataCallbacks = [];
            })
            .catch(function() {
                _roomFinderDataLoading = false;
                _roomFinderDataCallbacks.forEach(function(fn) { fn(null); });
                _roomFinderDataCallbacks = [];
            });
    }

    var ROOM_TYPE_LABELS = {
        'AUD': 'Auditorium',
        'GR':  'Group Room',
        'EPX': 'Exercise Room',
        'EXP': 'Exercise Room',
        'SA':  'Seminar Room',
        'ON':  'Online'
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
        lbl.style.cssText = 'color: ' + (darkModeEnabled ? '#e57373' : '#990000') + ';';
        tdLabel.appendChild(lbl);
        tr.appendChild(tdLabel);

        var tdValue = document.createElement('td');
        markExt(tdValue);
        tdValue.textContent = 'Loading...';
        tr.appendChild(tdValue);

        locationRow.insertAdjacentElement('afterend', tr);

        loadRoomFinderData(function(allRooms) {
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
            var physicalRooms = rooms.filter(function(r) { return r.type !== 'ON'; });
            if (!physicalRooms.length) physicalRooms = rooms;

            // Separate lecture rooms (AUD/SA) from exercise/group rooms
            var lectureRooms = [];
            var exerciseRooms = [];
            physicalRooms.forEach(function(r) {
                if (r.type === 'AUD' || r.type === 'SA') {
                    lectureRooms.push(r);
                } else {
                    exerciseRooms.push(r);
                }
            });

            // Sort each group by building + room number
            var sortByBldRoom = function(a, b) {
                var bldCmp = parseInt(a.building) - parseInt(b.building);
                if (bldCmp !== 0) return bldCmp;
                return a.room.localeCompare(b.room);
            };
            lectureRooms.sort(sortByBldRoom);
            exerciseRooms.sort(sortByBldRoom);

            tdValue.innerHTML = '';
            markExt(tdValue);

            var accentColor = darkModeEnabled ? '#e57373' : '#990000';
            var textColor = darkModeEnabled ? '#e0e0e0' : '#333';
            var mutedColor = darkModeEnabled ? '#999' : '#666';

            // Lecture rooms: "Building 308, Auditorium 012"
            lectureRooms.forEach(function(r) {
                var line = document.createElement('div');
                markExt(line);
                line.style.cssText = 'font-size: 13px; line-height: 1.6; color: ' + textColor + ';';
                var typeLabel = r.type === 'SA' ? 'Seminar Room' : 'Auditorium';
                line.textContent = 'Building ' + r.building + ', ' + typeLabel + ' ' + r.room;
                tdValue.appendChild(line);
            });

            // Exercise/group rooms: group by building, then list room numbers
            if (exerciseRooms.length) {
                var byBuilding = {};
                exerciseRooms.forEach(function(r) {
                    if (!byBuilding[r.building]) byBuilding[r.building] = [];
                    byBuilding[r.building].push(r.room);
                });
                var buildings = Object.keys(byBuilding).sort(function(a, b) { return parseInt(a) - parseInt(b); });
                buildings.forEach(function(bld) {
                    var roomNums = byBuilding[bld];
                    var line = document.createElement('div');
                    markExt(line);
                    line.style.cssText = 'font-size: 12px; line-height: 1.6; color: ' + mutedColor + ';';
                    var label = roomNums.length === 1 ? 'Room' : 'Rooms';
                    line.textContent = 'Exercises: ' + label + ' ' + roomNums.join(', ') + ' (Building ' + bld + ')';
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
            document.querySelectorAll('[data-dtu-schedule-annotated]').forEach(function(cell) {
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
            var annotated = text.replace(/\b([FE]?)([1-5])([AB])\b(?!\s*\()/gi, function(match, season, num, slot) {
                var key = num + slot.toUpperCase();
                var dayTime = SCHEDULE_SLOT_MAP[key];
                if (!dayTime) return match;
                return match + ' (' + dayTime + ')';
            });

            // Full-group codes like F3, E5 (both A and B slots)
            annotated = annotated.replace(/\b([FE])([1-5])\b(?![AB0-9\s]*\()/gi, function(match, season, num) {
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
        document.querySelectorAll('.mx-s.hide-on-print, .mx-s.hide-on-print .flex.flex--content-between').forEach(function(row) {
            row.style.setProperty('background', 'transparent', 'important');
            row.style.setProperty('background-color', 'transparent', 'important');
            row.style.setProperty('height', 'auto', 'important');
            row.style.setProperty('min-height', '0', 'important');
        });

        // Chart scripts wait until legend headers are not pure black before drawing.
        document.querySelectorAll('.comparison__legend > .legend__header').forEach(function(header) {
            var bg = '';
            try {
                bg = window.getComputedStyle(header).backgroundColor || '';
            } catch (e) {}
            if (bg === 'rgb(0, 0, 0)') {
                header.style.setProperty('background', '#990000', 'important');
                header.style.setProperty('background-color', '#990000', 'important');
                header.style.setProperty('color', '#ffffff', 'important');
            }
        });

        // Keep chart canvases and wrappers transparent to avoid giant dark blocks.
        document.querySelectorAll('canvas[id^="CanvasQuestion_"]').forEach(function(canvas) {
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
            document.querySelectorAll(selector).forEach(function(el) {
                if (!el || !el.style) return;
                props.forEach(function(prop) { el.style.removeProperty(prop); });
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
                + '.messageTruncatebar',
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
            return;
        }

        // Nav dropdown group links (Courses, Groups, Shortcuts) -- force light text
        document.querySelectorAll('.nav__dropdown--group a, article.nav__dropdown--group a, .group-menu__item a, .group-menu__item-burger a').forEach(function(link) {
            if (!link || !link.style) return;
            link.style.setProperty('color', '#e0e0e0', 'important');
        });

        var breadcrumb = document.querySelector('nav#breadcrumb.actualbreadcrumb');
        if (breadcrumb && breadcrumb.style) {
            breadcrumb.style.setProperty('background', '#2d2d2d', 'important');
            breadcrumb.style.setProperty('background-color', '#2d2d2d', 'important');
            breadcrumb.style.setProperty('color', '#e0e0e0', 'important');
        }

        document.querySelectorAll('nav#breadcrumb.actualbreadcrumb a, nav#breadcrumb.actualbreadcrumb a.last').forEach(function(link) {
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
            ).forEach(function(el) {
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
            ).forEach(function(el) {
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
            ).forEach(function(el) {
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
            ).forEach(function(el) {
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
        document.querySelectorAll('.messageText').forEach(function(el) {
            if (!el || !el.style) return;
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('background-image', 'none', 'important');
        });

        document.querySelectorAll('.messageText .postTeaser').forEach(function(el) {
            if (!el || !el.style) return;
            el.style.setProperty('background', '#1a1a1a', 'important');
            el.style.setProperty('background-color', '#1a1a1a', 'important');
            el.style.setProperty('color', '#e0e0e0', 'important');
        });

        document.querySelectorAll('.messageText .messageTruncatebar, .messageTruncatebar').forEach(function(el) {
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
        cells.forEach(function(cell) {
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
        return parseStudyplanMonthTags(text).filter(function(tag) {
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
                    .filter(function(n) { return typeof n === 'number' && isFinite(n); })
                    .sort(function(a, b) { return a - b; });
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
        courses.forEach(function(c) {
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
        courses.forEach(function(c) {
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
        document.querySelectorAll('table').forEach(function(table) {
            var idx = getStudyplanExamTableColumnIndexes(table);
            if (idx.placement < 0) return;

            var semesterNum = findStudyplanSemesterNumberForTable(table);
            var tablePeriodText = getStudyplanTablePeriodText(table);
            var hasCandidate = false;

            table.querySelectorAll('tr').forEach(function(row) {
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
        candidateTables.forEach(function(c) {
            if (typeof c.semesterNum === 'number' && isFinite(c.semesterNum)) {
                if (maxSemester === null || c.semesterNum > maxSemester) maxSemester = c.semesterNum;
            }
        });

        var selectedTables;
        if (maxSemester === null) {
            selectedTables = [candidateTables[candidateTables.length - 1].table];
        } else {
            selectedTables = candidateTables
                .filter(function(c) { return c.semesterNum === maxSemester; })
                .map(function(c) { return c.table; });
        }

        var out = [];
        var seen = Object.create(null);

        selectedTables.forEach(function(table) {
            var idx = getStudyplanExamTableColumnIndexes(table);
            var tablePeriodText = getStudyplanTablePeriodText(table);
            var semesterNum = findStudyplanSemesterNumberForTable(table);

            table.querySelectorAll('tr').forEach(function(row) {
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

        var currentRows = out.filter(function(c) { return !!c.periodIsCurrent; });
        var anchorTs = null;
        if (currentRows.length) {
            currentRows.forEach(function(c) {
                if (typeof c.periodStartTs === 'number') {
                    if (anchorTs === null || c.periodStartTs < anchorTs) anchorTs = c.periodStartTs;
                }
            });
            if (anchorTs === null) anchorTs = todayTs;
        } else {
            out.forEach(function(c) {
                if (typeof c.periodStartTs === 'number' && c.periodStartTs >= todayTs) {
                    if (anchorTs === null || c.periodStartTs < anchorTs) anchorTs = c.periodStartTs;
                } else if (typeof c.periodEndTs === 'number' && c.periodEndTs >= todayTs) {
                    if (anchorTs === null || todayTs < anchorTs) anchorTs = todayTs;
                }
            });
        }

        if (anchorTs === null) return out;

        var fromAnchor = out.filter(function(c) {
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
        return courses.map(function(c) {
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
        a.forEach(function(v) { set[v] = true; });
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
            codes: Array.isArray(entry.codes) ? entry.codes.map(function(c) { return String(c || '').toUpperCase(); }) : [],
            tokens: Array.isArray(entry.tokens) ? entry.tokens.map(function(t) { return normalizeExamSlotToken(t); }).filter(Boolean) : [],
            tags: Array.isArray(entry.tags) ? entry.tags.map(function(t) { return String(t || '').toLowerCase(); }) : []
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

        entries.forEach(function(entry) {
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
            strictCandidates.sort(function(a, b) {
                if (a.score !== b.score) return b.score - a.score;
                if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
                if (a.upcoming && b.upcoming) return a.entry.dateTs - b.entry.dateTs;
                return b.entry.dateTs - a.entry.dateTs;
            });
            return strictCandidates[0];
        }

        var candidates = strictCandidates.length ? strictCandidates : fallbackCandidates;
        if (!candidates.length) return null;
        candidates.sort(function(a, b) {
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

        courses.forEach(function(course) {
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

        mapped = mapped.filter(function(item) {
            return item.dateTs >= todayTs;
        });

        mapped.sort(function(a, b) {
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
        mapped.forEach(function(item) {
            if (!item || !item.dateIso) return;
            if (!byDate[item.dateIso]) byDate[item.dateIso] = [];
            byDate[item.dateIso].push(item);
        });

        Object.keys(byDate).forEach(function(iso) {
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

        warnings.forEach(function(w) {
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
                ? 'margin: 10px 0 12px 0; padding: 12px 14px; border-radius: 6px; width: 100%; box-sizing: border-box; '
                  + 'background-color: #2d2d2d; border: 1px solid #404040; color: #e0e0e0; font-family: inherit;'
                : 'margin: 10px 0 12px 0; padding: 12px 14px; border-radius: 6px; width: 100%; box-sizing: border-box; '
                  + 'background-color: #ffffff; border: 1px solid #e0e0e0; color: #222; font-family: inherit;';

            var title = document.createElement('div');
            markExt(title);
            title.textContent = 'Exam Timeline and Clash Risk';
            title.style.cssText = 'font-weight: 700; font-size: 14px; margin-bottom: 6px;';
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
        el.style.cssText = 'font-size: 12px; color: ' + (isWarn ? (darkModeEnabled ? '#ffd380' : '#8a4b00') : (darkModeEnabled ? '#bababa' : '#5e6976')) + ';';
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
        var muted = darkModeEnabled ? '#bababa' : '#5e6976';
        var softBorder = darkModeEnabled ? '#3b3b3b' : '#dce2ea';
        var softBg = darkModeEnabled ? '#252525' : '#f6f8fb';
        var todayTs = startOfTodayUtcTs();
        var currentPeriodLabel = detectCurrentStudyplanPeriodLabel(courses, todayTs);

        var summary = document.createElement('div');
        markExt(summary);
        summary.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:8px;';
        body.appendChild(summary);

        var upcoming = mapped.filter(function(m) { return m.daysUntil >= 0; });
        var nextItem = upcoming.length ? upcoming[0] : mapped[0];
        var tightestGap = null;
        mapped.forEach(function(m) {
            if (typeof m.gapFromPrev !== 'number') return;
            if (tightestGap === null || m.gapFromPrev < tightestGap) tightestGap = m.gapFromPrev;
        });

        function addChip(label, value) {
            var chip = document.createElement('div');
            markExt(chip);
            chip.style.cssText = 'padding: 5px 9px; border-radius: 999px; border: 1px solid ' + softBorder + '; background: ' + softBg + '; '
                + 'font-size: 11px; line-height: 1.2; flex: 0 1 auto; max-width: 100%;';
            chip.textContent = label + ': ' + value;
            summary.appendChild(chip);
        }

        if (currentPeriodLabel) addChip('Current period', currentPeriodLabel);
        if (nextItem) addChip('Next exam', formatIsoDateForDisplay(nextItem.dateIso) + ' (' + (nextItem.daysUntil >= 0 ? ('in ' + nextItem.daysUntil + 'd') : (Math.abs(nextItem.daysUntil) + 'd ago')) + ')');
        if (tightestGap !== null) addChip('Tightest gap', tightestGap + 'd');

        var warnings = buildExamClusterWarnings(mapped);
        if (warnings.length) {
            var riskSummary = summarizeExamClusterWarnings(warnings);
            var riskBox = document.createElement('div');
            markExt(riskBox);
            var riskBorder = darkModeEnabled
                ? (riskSummary.level === 'critical' ? '#a83a3a' : (riskSummary.level === 'high' ? '#8a6500' : '#2d5f99'))
                : (riskSummary.level === 'critical' ? '#d32f2f' : (riskSummary.level === 'high' ? '#ef6c00' : '#1976d2'));
            var riskBg = darkModeEnabled
                ? (riskSummary.level === 'critical' ? 'rgba(239,83,80,0.12)' : (riskSummary.level === 'high' ? 'rgba(255,179,0,0.12)' : 'rgba(102,179,255,0.10)'))
                : (riskSummary.level === 'critical' ? 'rgba(211,47,47,0.08)' : (riskSummary.level === 'high' ? 'rgba(239,108,0,0.08)' : 'rgba(25,118,210,0.08)'));
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

        var list = document.createElement('div');
        markExt(list);
        list.style.cssText = 'display:flex; flex-direction:column; gap:5px;';
        body.appendChild(list);

        var dateCounts = Object.create(null);
        mapped.forEach(function(item) {
            if (!item || !item.dateIso) return;
            dateCounts[item.dateIso] = (dateCounts[item.dateIso] || 0) + 1;
        });

        mapped.slice(0, 12).forEach(function(item, idx) {
            var nextGap = (idx + 1 < mapped.length) ? mapped[idx + 1].gapFromPrev : null;
            var isSameDayCluster = dateCounts[item.dateIso] > 1 || item.gapFromPrev === 0 || nextGap === 0;
            var isOneDayCluster = item.gapFromPrev === 1 || nextGap === 1;
            var isTwoDayCluster = item.gapFromPrev === 2 || nextGap === 2;
            var riskLevel = isSameDayCluster ? 'critical' : (isOneDayCluster ? 'high' : (isTwoDayCluster ? 'medium' : 'none'));

            var rowBorder = softBorder;
            var rowBg = softBg;
            if (riskLevel === 'critical') {
                rowBorder = darkModeEnabled ? '#a83a3a' : '#d32f2f';
                rowBg = darkModeEnabled ? 'rgba(239,83,80,0.12)' : 'rgba(211,47,47,0.08)';
            } else if (riskLevel === 'high') {
                rowBorder = darkModeEnabled ? '#8a6500' : '#ef6c00';
                rowBg = darkModeEnabled ? 'rgba(255,179,0,0.12)' : 'rgba(239,108,0,0.08)';
            } else if (riskLevel === 'medium') {
                rowBorder = darkModeEnabled ? '#2d5f99' : '#1976d2';
                rowBg = darkModeEnabled ? 'rgba(102,179,255,0.10)' : 'rgba(25,118,210,0.08)';
            }

            var row = document.createElement('div');
            markExt(row);
            row.style.cssText = 'display:grid; grid-template-columns: 95px 1fr 85px 80px; gap:8px; align-items:baseline; '
                + 'padding: 5px 7px; border-radius: 4px; border: 1px solid ' + rowBorder + '; background: ' + rowBg + ';';

            var cDate = document.createElement('span');
            markExt(cDate);
            cDate.textContent = formatIsoDateForDisplay(item.dateIso);
            cDate.style.cssText = 'font-size: 11px; color: ' + muted + ';';
            row.appendChild(cDate);

            var cCourse = document.createElement('span');
            markExt(cCourse);
            cCourse.textContent = item.code + (item.name ? (' ' + item.name) : '');
            cCourse.style.cssText = 'font-size: 12px;';
            row.appendChild(cCourse);

            var cPrep = document.createElement('span');
            markExt(cPrep);
            cPrep.textContent = item.daysUntil >= 0 ? ('in ' + item.daysUntil + 'd') : (Math.abs(item.daysUntil) + 'd ago');
            var prepColor = muted;
            if (item.daysUntil >= 0) {
                if (item.daysUntil <= 7) prepColor = darkModeEnabled ? '#ff8a80' : '#b71c1c';
                else if (item.daysUntil <= 21) prepColor = darkModeEnabled ? '#ffd180' : '#e65100';
                else prepColor = darkModeEnabled ? '#9ccc65' : '#2e7d32';
            }
            cPrep.style.cssText = 'font-size: 11px; color: ' + prepColor + '; text-align:right;';
            row.appendChild(cPrep);

            var cGap = document.createElement('span');
            markExt(cGap);
            cGap.textContent = (idx === 0 || typeof item.gapFromPrev !== 'number') ? 'first exam' : (item.gapFromPrev === 0 ? 'same day' : (item.gapFromPrev + 'd gap'));
            var gapColor = muted;
            if (typeof item.gapFromPrev === 'number') {
                if (item.gapFromPrev <= 0) gapColor = darkModeEnabled ? '#ef9a9a' : '#b71c1c';
                else if (item.gapFromPrev <= 2) gapColor = darkModeEnabled ? '#ffcc80' : '#ef6c00';
                else if (item.gapFromPrev >= 6) gapColor = darkModeEnabled ? '#a5d6a7' : '#2e7d32';
            }
            var riskText = '';
            if (riskLevel === 'critical') riskText = 'clash';
            else if (riskLevel === 'high') riskText = 'tight';
            else if (riskLevel === 'medium') riskText = 'close';
            if (riskText) cGap.textContent += ' · ' + riskText;
            cGap.style.cssText = 'font-size: 11px; color: ' + gapColor + '; text-align:right; font-weight:' + (riskLevel === 'none' ? '500' : '700') + ';';
            row.appendChild(cGap);

            list.appendChild(row);
        });

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
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var d = new Date(ts);
        return d.getDate() + ' ' + months[d.getMonth()];
    }

    function injectGradeCountdowns(mapped) {
        // Remove old badges
        document.querySelectorAll('[' + GRADE_COUNTDOWN_ATTR + ']').forEach(function(el) { el.remove(); });

        if (!mapped || !mapped.length) return;

        var now = Date.now();
        var isDark = darkModeEnabled;

        // Find all course code links on the page
        var codeLinks = document.querySelectorAll('a.coursecode');
        var codeLinkMap = {};
        codeLinks.forEach(function(a) {
            var code = (a.textContent || '').trim();
            if (code) codeLinkMap[code] = a;
        });

        mapped.forEach(function(m) {
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

        sendRuntimeMessage({ type: 'dtu-exam-calendar' }, function(response) {
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
        _studyplanExamClusterTimer = setTimeout(function() {
            _studyplanExamClusterTimer = null;
            insertStudyplanExamCluster();
        }, delayMs || 800);
    }
    // ===== EXAM CLUSTER OUTLOOK (STUDYPLAN) [END] =====

    function styleStudyPlannerTabLink(anchor) {
        if (!anchor || !anchor.style) return;
        anchor.style.setProperty('background-color', '#990000', 'important');
        anchor.style.setProperty('background', '#990000', 'important');
        anchor.style.setProperty('color', '#ffffff', 'important');
        anchor.style.setProperty('border-color', '#990000', 'important');
    }

    function styleStudyPlannerTabs() {
        if (!IS_TOP_WINDOW) return;
        var host = window.location.hostname;
        if (host !== 'studieplan.dtu.dk' && host !== 'kurser.dtu.dk') return;

        if (host === 'kurser.dtu.dk') {
            document.querySelectorAll('li[role="presentation"] > a[href="/search"], li[role="presentation"] > a[href$="/search"]').forEach(function(a) {
                styleStudyPlannerTabLink(a);
            });

            document.querySelectorAll('li[role="presentation"] > a[href="/course/gotoStudyplanner"], li[role="presentation"] > a[href$="/course/gotoStudyplanner"]').forEach(function(a) {
                styleStudyPlannerTabLink(a);
            });
        }

        document.querySelectorAll('li[role="presentation"] > a[href="#"]').forEach(function(a) {
            var txt = (a.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (txt === 'studieplanlÃ¦ggeren' || txt === 'study planner' || txt === 'course search') {
                styleStudyPlannerTabLink(a);
            }
        });
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
        _bookFinderTimer = setTimeout(function() {
            _bookFinderTimer = null;
            insertBookFinderLinks();
        }, delayMs || 800);
    }

    function runTopWindowFeatureChecks(rootNode, refreshBus) {
        if (!IS_TOP_WINDOW) return;

        var host = window.location.hostname;
        if (ENABLE_CONTEXT_CAPTURE_DEV_TOOL) {
            setupContextCaptureHotkey();
            insertContextCaptureHelper();
        }
        styleStudyPlannerTabs();
        fixEvalueringResultCharts();
        fixCampusnetHeaderStyling();
        if (host === 'studieplan.dtu.dk' || host === 'campusnet.dtu.dk') {
            enforceDtuRedBackgroundZoneDark2();
        }

        if (host === 'learn.inside.dtu.dk') {
            insertMojanglesText();
            insertMojanglesToggle();
            insertDarkModeToggle();
            if (isFeatureFlagEnabled(FEATURE_CONTENT_SHORTCUT_KEY)) {
                insertContentButtons(rootNode);
                startContentButtonBootstrap();
            } else {
                removeContentButtons();
            }
            insertBusToggle();
            insertDeadlinesToggle();
            insertSearchWidgetToggle();
            insertAfterDarkFeatureToggles();
            restructureAdminToolsPanel();
            insertDeadlinesHomepageWidget();
            if (refreshBus && isDTULearnHomepage()) {
                updateBusDepartures();
            }
            scheduleBookFinderScan(refreshBus ? 300 : 900);
        }
        if (host === 'campusnet.dtu.dk') {
            insertGPARow();
            insertECTSProgressBar();
            insertGPASimulator();
        }
        if (host === 'studieplan.dtu.dk') {
            scheduleStudyplanExamCluster(refreshBus ? 260 : 760);
        }
        if (host === 'kurser.dtu.dk') {
            insertKurserGradeStats();
            insertKurserCourseEvaluation();
            insertKurserRoomFinder();
            annotateKurserSchedulePlacement();
            scheduleKurserTextbookLinker(refreshBus ? 240 : 620);
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
    function startHostFeatureBootstrap() {
        if (!IS_TOP_WINDOW) return;
        if (_hostFeatureBootstrapTimer) return;
        var host = window.location.hostname;
        if (host !== 'studieplan.dtu.dk' && host !== 'kurser.dtu.dk') return;

        var attempts = 0;
        _hostFeatureBootstrapTimer = setInterval(function() {
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
                    || !!document.querySelector('[data-dtu-textbook-linker-bar-host]');
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
        _hostLightRefreshTimer = setTimeout(function() {
            _hostLightRefreshTimer = null;
            var host = window.location.hostname;
            if (host === 'studieplan.dtu.dk') {
                scheduleStudyplanExamCluster(110);
                return;
            }
            if (host === 'kurser.dtu.dk') {
                insertKurserGradeStats();
                insertKurserCourseEvaluation();
                insertKurserRoomFinder();
                annotateKurserSchedulePlacement();
                scheduleKurserTextbookLinker(110);
            }
        }, delayMs || 180);
    }

    function startHostLightObserver() {
        if (!IS_TOP_WINDOW) return;
        var host = window.location.hostname;
        if (host !== 'studieplan.dtu.dk' && host !== 'kurser.dtu.dk') return;
        if (_hostLightObserver) return;
        if (!document.documentElement) return;

        _hostLightObserver = new MutationObserver(function(mutations) {
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
        roots.forEach(function(root) {
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
                        && el.matches('d2l-labs-navigation-link-image.d2l-navigation-s-logo, d2l-labs-navigation-link-image[text="My Home"]')) {
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
                        enqueueMutationRoot(node);
                        if (darkModeEnabled) {
                            if (node.matches && node.matches(DARK_SELECTORS)) applyDarkStyle(node);
                            if (node.matches && node.matches(LIGHTER_DARK_SELECTORS)) applyLighterDarkStyle(node);
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
                var roots = _pendingMutationRoots.filter(function(root) {
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
            observeOptions.attributeFilter = ['style', 'class'];
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
        waitForCustomElements().then(function() {
            runDarkModeChecks();
            runTopWindowFeatureChecks(null, true);
            startHostFeatureBootstrap();
            startHostLightObserver();
            startContentButtonBootstrap();
            setTimeout(function() { runDarkModeChecks(); runTopWindowFeatureChecks(null, true); }, 500);
            setTimeout(function() { runDarkModeChecks(); runTopWindowFeatureChecks(null, true); }, 1500);
            setTimeout(showOnboardingHint, 2000);
            setTimeout(showBusSetupPrompt, 2500);
        });
    }

    // Page load: run all checks a few times to catch late-loading elements
    window.addEventListener('load', function() {
        runPrimaryBootstrap();
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(runPrimaryBootstrap, 0);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(runPrimaryBootstrap, 0);
        });
    }

    window.addEventListener('pageshow', function() {
        setTimeout(function() {
            runTopWindowFeatureChecks(null, true);
            startHostFeatureBootstrap();
            startHostLightObserver();
        }, 30);
    });

    window.addEventListener('focus', function() {
        setTimeout(function() {
            runTopWindowFeatureChecks(null, true);
            startHostFeatureBootstrap();
            startHostLightObserver();
        }, 40);
    });

    // Re-process when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(function() {
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
        setInterval(function() {
            if (document.hidden) return;
            sweepForLateShadowRoots();
        }, 15000);
    }
})();
