// Dark mode script to inject styles into Shadow DOM elements
(function() {
    'use strict';

    // ===== DARK MODE TOGGLE =====
    const DARK_MODE_KEY = 'dtuDarkModeEnabled';

    // Check dark mode preference: cookie (.dtu.dk cross-origin) → localStorage → default true
    function isDarkModeEnabled() {
        try {
            const match = document.cookie.match(/dtuDarkMode=(\w+)/);
            if (match) return match[1] !== 'false';
        } catch (e) { /* cookie access blocked in some iframes */ }
        const stored = localStorage.getItem(DARK_MODE_KEY);
        if (stored !== null) return stored === 'true';
        return true;
    }

    // Save preference to all available stores (localStorage + cookie + browser.storage)
    function saveDarkModePreference(enabled) {
        localStorage.setItem(DARK_MODE_KEY, String(enabled));
        try {
            if (location.hostname.endsWith('.dtu.dk')) {
                document.cookie = 'dtuDarkMode=' + enabled + '; domain=.dtu.dk; path=/; max-age=31536000; SameSite=Lax';
            }
        } catch (e) { /* cookie access blocked */ }
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
            browser.storage.local.set({ [DARK_MODE_KEY]: enabled });
        }
    }

    // Inject the dark mode CSS stylesheet via <link> element
    function injectDarkCSS() {
        if (document.getElementById('dtu-dark-mode-css')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = browser.runtime.getURL('darkmode.css');
        link.id = 'dtu-dark-mode-css';
        (document.head || document.documentElement).appendChild(link);
    }

    // Synchronous check — inject CSS immediately if enabled (runs at document_start)
    const darkModeEnabled = isDarkModeEnabled();
    if (darkModeEnabled) {
        injectDarkCSS();
    }

    // Async cross-origin check via browser.storage.local (covers s.brightspace.com etc.)
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        browser.storage.local.get(DARK_MODE_KEY).then(function(result) {
            var storedEnabled = result[DARK_MODE_KEY];
            if (storedEnabled === undefined) return; // no stored value yet
            // Sync local stores for faster sync check next time
            localStorage.setItem(DARK_MODE_KEY, String(storedEnabled));
            try {
                if (location.hostname.endsWith('.dtu.dk')) {
                    document.cookie = 'dtuDarkMode=' + storedEnabled + '; domain=.dtu.dk; path=/; max-age=31536000; SameSite=Lax';
                }
            } catch (e) {}
            // If mismatch between sync and async check, reload to correct
            if (storedEnabled !== darkModeEnabled && window === window.top) {
                location.reload();
            }
        }).catch(function() {});
    }

    // Dark mode toggle for light mode (re-enable): inserted via runFeatureChecks below

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

        /* List role containers */
        div[role="list"],
        [role="list"] {
            background-color: #2d2d2d !important;
            color: ${DARK_TEXT} !important;
        }

        /* Breadcrumb elements */
        d2l-breadcrumb,
        d2l-breadcrumbs,
        d2l-breadcrumb-current-page,
        .d2l-breadcrumb,
        .d2l-breadcrumbs {
            background-color: #2d2d2d !important;
            color: ${DARK_TEXT} !important;
        }

        /* Breadcrumb links and icons */
        a.d2l-link-small:not(.d2l-link-inline),
        d2l-icon[icon="tier1:chevron-right"],
        span[aria-current="page"] {
            background-color: #2d2d2d !important;
        }

        /* Inline links - lighter dark */
        a.d2l-link-inline {
            background-color: #2d2d2d !important;
        }

        /* Floating buttons */
        .d2l-floating-buttons-container,
        .d2l-floating-buttons,
        .d2l-floating-buttons-inner-container {
            background-color: #2d2d2d !important;
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

        /* Content shortcut button — use a.class to beat .d2l-card-container a specificity */
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
        }
        :host(:hover) a.dtu-dark-content-btn {
            opacity: 1 !important;
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
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        .d2l-menu,
        .d2l-menu-mvc,
        .d2l-contextmenu {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
        }

        .d2l-menu-item,
        .d2l-menu-item-text {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
        }

        .d2l-menu-item:hover,
        .d2l-menu-item:focus {
            background-color: #3d3d3d !important;
            color: ${DARK_TEXT} !important;
        }

        a, button {
            color: ${DARK_TEXT} !important;
            background-color: transparent !important;
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

        processNestedShadowRoots(shadowRoot);
    }

    // Function to process shadow roots nested inside a shadow root
    function processNestedShadowRoots(shadowRoot) {
        if (!shadowRoot) return;

        // Find all elements inside this shadow root
        const elements = shadowRoot.querySelectorAll('*');
        elements.forEach(element => {
            if (element.shadowRoot) {
                injectStylesIntoShadowRoot(element.shadowRoot, element);
            }
        });
    }

    // Function to specifically process d2l-html-block elements
    function processHtmlBlocks(root) {
        const htmlBlocks = root.querySelectorAll('d2l-html-block');
        htmlBlocks.forEach(block => {
            // Try immediately
            if (block.shadowRoot) {
                injectStylesIntoShadowRoot(block.shadowRoot, block);
            }
            // Also poll multiple times to catch late shadow root creation
            const delays = [50, 100, 200, 500, 1000, 2000];
            delays.forEach(delay => {
                setTimeout(() => {
                    if (block.shadowRoot) {
                        injectStylesIntoShadowRoot(block.shadowRoot, block);
                    }
                }, delay);
            });
        });
    }

    // Aggressively poll for d2l-html-block elements
    function pollForHtmlBlocks() {
        const htmlBlocks = document.querySelectorAll('d2l-html-block');
        htmlBlocks.forEach(block => {
            if (block.shadowRoot) {
                injectStylesIntoShadowRoot(block.shadowRoot, block);
            }
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
        .breadcrumb.linkset6 *
    `;

    // Selectors for elements that should be #2d2d2d (lighter dark)
    const LIGHTER_DARK_SELECTORS = `
        .d2l-navigation-s-main-wrapper,
        .d2l-navigation-s-main-wrapper *,
        .d2l-navigation-s-item,
        .d2l-navigation-s-group,
        .d2l-navigation-s-link,
        .dco a.d2l-link,
        .dco_c a.d2l-link,
        td.d_gn a.d2l-link,
        td.d_gc a.d2l-link,
        .d2l-inline,
        .d2l-inline a,
        .d2l-inline a.d2l-link,
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
        .d2l-floating-buttons-container,
        .d2l-floating-buttons,
        .d2l-floating-buttons-inner-container,
        table.d_FG,
        table.d_FG td,
        .d_fgh,
        .fct_w,
        .fl_n,
        .fl_top,
        div[role="list"]:not(.d2l-navigation-s-main-wrapper),
        d2l-breadcrumb,
        d2l-breadcrumbs,
        d2l-breadcrumb-current-page,
        span[aria-current="page"],
        a.d2l-link-small:not(.d2l-link-inline),
        d2l-icon[icon="tier1:chevron-right"],
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

    // Function to apply darkest style to an element (#1a1a1a)
    function applyDarkStyle(el) {
        if (!el || !el.style) return;
        // Skip extension-created elements (ECTS bar, GPA rows, sim rows, etc.)
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return;
        // Skip navigation wrapper elements
        if (el.closest && el.closest('.d2l-navigation-s-main-wrapper')) return;
        // Skip elements inside pagefooter (those should be dark 2)
        if (el.closest && el.closest('.pagefooter')) return;
        // Skip topmenuitems (should be dark 2)
        if (el.closest && el.closest('.topmenuitems')) return;
        // Skip pageheader descendants (should be dark 2), except breadcrumb.linkset6 (dark 1)
        if (el.closest && el.closest('.pageheader') && !el.closest('.breadcrumb.linkset6')) return;
        el.style.setProperty('background', '#1a1a1a', 'important');
        el.style.setProperty('background-color', '#1a1a1a', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        // Skip color on links — let CSS handle it (nav links grey, content links blue)
        if (el.tagName !== 'A') {
            el.style.setProperty('color', '#e0e0e0', 'important');
        }
    }

    // Function to apply lighter dark style to an element (#2d2d2d)
    function applyLighterDarkStyle(el) {
        if (!el || !el.style) return;
        // Skip extension-created elements (ECTS bar, GPA rows, sim rows, etc.)
        if (el.hasAttribute && el.hasAttribute('data-dtu-ext')) return;
        // Skip breadcrumb.linkset6 (should be dark 1)
        if (el.matches && el.matches('.breadcrumb.linkset6')) return;
        if (el.closest && el.closest('.breadcrumb.linkset6')) return;
        el.style.setProperty('background', '#2d2d2d', 'important');
        el.style.setProperty('background-color', '#2d2d2d', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        // Skip color on links — let CSS handle it (nav links grey, content links blue)
        if (el.tagName !== 'A') {
            el.style.setProperty('color', '#e0e0e0', 'important');
        }
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
        root.querySelectorAll('.dturedbackground').forEach(el => {
            el.style.setProperty('background', '#2d2d2d', 'important');
            el.style.setProperty('background-color', '#2d2d2d', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('border-color', '#2d2d2d', 'important');
            // Also force all children (spans, links, containers)
            el.querySelectorAll('.container, .row, .col-md-12, .pull-right, .pull-right > span, .pull-right > span > a').forEach(child => {
                child.style.setProperty('background', '#2d2d2d', 'important');
                child.style.setProperty('background-color', '#2d2d2d', 'important');
            });
        });
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
        // Skip if inside PDF viewer
        if (isInsideExcludedContainer(element)) {
            return;
        }

        if (element.shadowRoot) {
            injectStylesIntoShadowRoot(element.shadowRoot, element);
        }

        // Check all children (excluding PDF viewer contents)
        const children = element.querySelectorAll('*');
        children.forEach(child => {
            // Skip PDF viewer elements
            if (shouldExcludeElement(child) || isInsideExcludedContainer(child)) {
                return;
            }
            if (child.shadowRoot) {
                injectStylesIntoShadowRoot(child.shadowRoot, child);
            }
        });

        // Specifically process d2l-html-block elements
        processHtmlBlocks(element);

        processIframes(element);
    }

    function processIframes(root) {
        const iframes = root.querySelectorAll('iframe');
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

    // Initial processing (dark mode only — unified observer handles ongoing changes)
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
    function replaceLogoImage() {
        const newSrc = chrome.runtime.getURL('Corp_White_Transparent.png');

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
                        img.style.setProperty('max-height', '50px', 'important');
                        img.style.setProperty('width', 'auto', 'important');
                    }
                }
            });
        }

        // Check main document
        replaceInRoot(document);

        // Check all shadow roots recursively
        function checkShadowRoots(root) {
            if (!root) return;
            const elements = root.querySelectorAll('*');
            elements.forEach(el => {
                if (el.shadowRoot) {
                    replaceInRoot(el.shadowRoot);
                    checkShadowRoots(el.shadowRoot);
                }
            });
        }

        checkShadowRoots(document);
    }

    // Run logo replacement (dark mode only)
    if (darkModeEnabled) replaceLogoImage();

    // ===== MOJANGLES TEXT INSERTION =====
    // Insert Mojangles text image into the navigation header with Minecraft-style animation

    function isMojanglesEnabled() {
        const stored = localStorage.getItem('mojanglesTextEnabled');
        return stored === null ? true : stored === 'true';
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
        // If disabled, hide all existing Mojangles images (including in shadow DOM) and return
        if (!isMojanglesEnabled()) {
            findAllMojanglesImages(document).forEach(img => {
                img.style.display = 'none';
            });
            return;
        }

        // If enabled, make sure existing ones are visible
        findAllMojanglesImages(document).forEach(img => {
            img.style.display = '';
        });

        const mojanglesImgSrc = chrome.runtime.getURL(darkModeEnabled ? 'Mojangles text.png' : 'Mojangles text darkmode off.png');
        const isHomePage = /^\/d2l\/home\/?$/.test(window.location.pathname);

        // Helper function to insert in a given root
        function insertInRoot(root) {
            if (!root) return;

            // Find the navigation header container
            const headerContainers = root.querySelectorAll('.d2l-labs-navigation-header-container');
            headerContainers.forEach(container => {
                // Check if we already added the image
                if (container.querySelector('.mojangles-text-img')) return;

                // Create the image element
                const img = document.createElement('img');
                img.src = mojanglesImgSrc;
                img.className = 'mojangles-text-img';
                img.alt = 'Mojangles';

                // Find the DTU logo
                const logo = container.querySelector('d2l-navigation-link-image, a[href*="home"], img');

                if (!isHomePage) {
                    // Course page: smaller, static, positioned absolutely next to the logo
                    container.style.position = 'relative';
                    const containerRect = container.getBoundingClientRect();
                    const logoRect = logo ? logo.getBoundingClientRect() : null;
                    const leftPos = logoRect ? (logoRect.right - containerRect.left - 38) : 0;
                    img.style.cssText = `height: 10px; position: absolute; left: ${leftPos}px; top: calc(60% + 17px); transform: translateY(-50%) rotate(-20deg); z-index: 10; pointer-events: none;`;
                    container.appendChild(img);
                } else {
                    // Home page: normal size, inserted after logo
                    img.style.cssText = 'height: 20px; margin-left: 10px; vertical-align: middle; transform: rotate(-20deg);';
                    if (logo && logo.parentNode === container) {
                        logo.after(img);
                    } else if (container.firstElementChild) {
                        container.firstElementChild.after(img);
                    } else {
                        container.appendChild(img);
                    }

                    // Pulse animation only on home page
                    function animatePulse(timestamp) {
                        if (!img.isConnected) return; // Stop loop if element removed
                        const scale = 1 + 0.05 * Math.sin(timestamp / 127);
                        img.style.transform = `rotate(-20deg) scale(${scale})`;
                        requestAnimationFrame(animatePulse);
                    }
                    requestAnimationFrame(animatePulse);
                }
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

    // ===== FIRST-TIME ONBOARDING HINT =====
    // Show a hint pointing to the gear icon for the first 3 homepage visits
    function showOnboardingHint() {
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
    function preserveTypeboxColors() {
        const typeboxes = document.querySelectorAll('.typebox');
        typeboxes.forEach(typebox => {
            // Get the background-color from the element's style attribute
            const inlineStyle = typebox.getAttribute('style');
            if (inlineStyle) {
                // Extract background-color value
                const match = inlineStyle.match(/background-color:\s*([^;]+)/i);
                if (match && match[1]) {
                    const bgColor = match[1].trim();
                    // Reapply with !important to override CSS rules
                    typebox.style.setProperty('background-color', bgColor, 'important');
                }
            }
        });
    }

    // Run typebox preservation (dark mode only)
    if (darkModeEnabled) preserveTypeboxColors();

    // ===== CAMPUSNET GPA CALCULATION (campusnet.dtu.dk) =====
    // Calculate weighted GPA from the grades table and insert a summary row
    function insertGPARow() {
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

            // Check if passed: numeric grade >= 2, or "BE" (Bestået/Pass)
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
        codeInput.placeholder = 'Code';
        codeInput.value = entry.code || '';
        codeInput.style.cssText = 'width: 60px;';
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
        tdECTS.style.cssText = 'text-align: right; padding-right: 5px;';
        const ectsInput = document.createElement('input');
        ectsInput.type = 'number';
        ectsInput.className = 'gpa-sim-input';
        ectsInput.setAttribute('data-dtu-ext', '1');
        ectsInput.min = '1';
        ectsInput.max = '60';
        ectsInput.value = entry.ects || 5;
        ectsInput.style.cssText = 'width: 65px; text-align: left; padding-left: 6px;';
        ectsInput.addEventListener('input', () => { saveSimEntries(); updateProjectedGPA(); });
        tdECTS.appendChild(ectsInput);

        // Delete button
        const tdAction = document.createElement('td');
        tdAction.setAttribute('data-dtu-ext', '1');
        tdAction.style.cssText = 'text-align: center;';
        tdAction.style.setProperty('padding-left', '30px', 'important');
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'gpa-sim-delete-btn';
        delBtn.setAttribute('data-dtu-ext', '1');
        delBtn.textContent = '\u00D7';
        delBtn.title = 'Remove';
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
        addTd.style.cssText = 'text-align: left; padding: 4px 0;';
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

    // Standalone button CSS — injected into card shadow roots when dark mode styles aren't present
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
        }
        :host(:hover) a.dtu-dark-content-btn {
            opacity: 1 !important;
        }
        a.dtu-dark-content-btn:hover {
            background-color: rgba(0, 0, 0, 0.85) !important;
        }
    `;

    // Recursively find all elements matching a selector, traversing shadow roots
    function deepQueryAll(selector, root) {
        const results = [];
        if (!root) return results;
        const searchRoot = root.shadowRoot || root;
        results.push(...searchRoot.querySelectorAll(selector));
        searchRoot.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
                results.push(...deepQueryAll(selector, el.shadowRoot));
            }
        });
        return results;
    }

    function insertContentButtons() {
        if (!isDTULearnHomepage()) return;

        // Enrollment cards can be nested deep inside multiple shadow roots.
        const enrollmentCards = deepQueryAll('d2l-enrollment-card', document.body);
        enrollmentCards.forEach(ec => {
            const ecShadow = ec.shadowRoot;
            if (!ecShadow) return;

            const card = ecShadow.querySelector('d2l-card[href^="/d2l/home/"]');
            if (!card) return;

            const cardShadow = card.shadowRoot;
            if (!cardShadow) return;

            // Ensure content button CSS is in the shadow root (needed when dark mode is off)
            if (!cardShadow.querySelector('#dtu-content-btn-styles')) {
                const btnStyle = document.createElement('style');
                btnStyle.id = 'dtu-content-btn-styles';
                btnStyle.textContent = contentBtnShadowCSS;
                cardShadow.appendChild(btnStyle);
            }

            // Append to the card header (image area) for bottom-right positioning
            const header = cardShadow.querySelector('.d2l-card-header');
            const container = header || cardShadow.querySelector('.d2l-card-container');
            if (!container) return;
            if (container.querySelector('.dtu-dark-content-btn')) return;
            container.style.setProperty('position', 'relative', 'important');

            const courseIdMatch = card.getAttribute('href').match(/\/d2l\/home\/(\d+)/);
            if (!courseIdMatch) return;
            const courseId = courseIdMatch[1];

            // Styling is handled by cardShadowStyles CSS (.dtu-dark-content-btn)
            const btn = document.createElement('a');
            btn.className = 'dtu-dark-content-btn';
            btn.href = '/d2l/le/lessons/' + courseId;
            btn.title = 'Go to Content';
            btn.textContent = '\u{1F4D6}';
            btn.addEventListener('click', (e) => e.stopPropagation());

            container.appendChild(btn);
        });
    }

    // Run content buttons (unified observer handles updates)
    insertContentButtons();

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
    // 6015/6026: Rævehøjvej, DTU (Helsingørmotorvejen) — 150S, 300S, 40E, 15E
    // 474/496:   Rævehøjvej, DTU (Lundtoftegårdsvej)    — 150S, 300S, 40E, 15E
    // 497/473:   DTU (Anker Engelunds Vej)               — 300S
    const DTU_AREA_STOP_IDS = ['6015', '6026', '474', '496', '497', '473'];

    const BUS_ENABLED_KEY = 'dtuDarkModeBusEnabled';
    const BUS_CONFIG_KEY = 'dtuDarkModeBusConfig';
    const BUS_SETUP_DONE_KEY = 'dtuDarkModeBusSetupDone';

    let _lastBusFetch = 0;
    let _cachedDepartures = [];
    let _busFetchInProgress = false;

    function isBusEnabled() {
        return localStorage.getItem(BUS_ENABLED_KEY) === 'true';
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

    // ===== API RATE LIMITING =====
    // Per-user daily limit to protect the shared API key (resets each day)
    var DAILY_API_LIMIT = 200; // max API calls per user per day
    var API_CALLS_KEY = 'dtuDarkModeBusApiCalls';
    var API_QUOTA_KEY = 'dtuDarkModeBusQuotaExhausted';
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

    // Server-side quota exhaustion (HTTP 429/403) — persists until next month
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
        incrementApiCount();
        const url = REJSEPLANEN_API + '/departureBoard?accessId=' + encodeURIComponent(REJSEPLANEN_KEY)
            + '&format=json&id=' + encodeURIComponent(stopId);
        try {
            const resp = await fetch(url);
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
            return arr;
        } catch (e) {
            return [];
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

        const wrapper = document.querySelector('.d2l-navigation-s-main-wrapper');
        if (!wrapper) return;

        let container = document.querySelector('.dtu-bus-departures');
        if (!container) {
            container = document.createElement('div');
            container.className = 'dtu-bus-departures';
            container.setAttribute('role', 'listitem');
            container.style.cssText = 'display: flex; gap: 12px; padding: 8px 14px; '
                + 'margin-left: auto; background: linear-gradient(180deg, #2d2d2d 0%, #252525 100%) !important; '
                + 'color: #e0e0e0 !important; font-size: 12px; '
                + 'border-left: 2px solid #c62828; align-self: center; border-radius: 0 6px 6px 0;';
            wrapper.appendChild(container);
        }

        // Clear existing content
        while (container.firstChild) container.removeChild(container.firstChild);

        if (_cachedDepartures.length === 0) {
            var empty = document.createElement('span');
            empty.style.cssText = 'color: #888; font-style: italic; font-size: 11px;';
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
                + (li < lineOrder.length - 1 ? ' padding-right: 12px; border-right: 1px solid rgba(255,255,255,0.06);' : '');

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
                dir.style.cssText = 'color: #b0b0b0; overflow: hidden; text-overflow: ellipsis; flex: 1; font-size: 11px;';
                dir.textContent = dep.direction;

                var time = document.createElement('span');
                time.style.cssText = 'font-weight: bold; font-size: 11px; color: ' + (dep.delayed ? '#ffa726' : '#66bb6a') + ';';
                time.textContent = dep.time;

                row.appendChild(dir);
                row.appendChild(time);

                if (dep.delayTag) {
                    var delay = document.createElement('span');
                    delay.style.cssText = 'font-size: 10px; color: #ffa726; font-weight: 600;';
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
        if (soonest <= 15) return 60000;  // ≤15 min away: poll every 60s (minimum)
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
        if (document.hidden) {
            stopBusPolling();
        } else {
            // Tab became visible — do an immediate refresh then resume polling
            updateBusDepartures();
        }
    });

    // Orchestrate: fetch + update display + start smart polling
    async function updateBusDepartures() {
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
        const existing = document.querySelector('.dtu-bus-config-modal');
        if (existing) existing.remove();

        const MAX_LINES = 2;

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
        modal.style.cssText = 'background: rgba(30,30,30,0.92); border-radius: 14px; padding: 28px; max-width: 480px; '
            + 'width: 90%; max-height: 80vh; overflow-y: auto; color: #e0e0e0; '
            + 'box-shadow: 0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06); '
            + 'border: 1px solid rgba(255,255,255,0.08);';

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
            titleEl.style.cssText = 'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.3px;';
            titleEl.textContent = 'Bus Lines';
            modal.appendChild(titleEl);

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: #999; line-height: 1.4;';
            subtitle.textContent = 'Manage your configured bus lines (max ' + MAX_LINES + ').';
            modal.appendChild(subtitle);

            var lineCount = (config && config.lines) ? config.lines.length : 0;

            // Show each configured line as a card
            if (config && config.lines) {
                config.lines.forEach(function(lineCfg, idx) {
                    var color = LINE_COLORS[lineCfg.line] || '#1565c0';
                    var card = document.createElement('div');
                    card.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px 14px; '
                        + 'border: 1px solid #404040; border-radius: 8px; margin-bottom: 8px;';

                    var badge = document.createElement('span');
                    badge.style.cssText = 'background-color: ' + color + '; color: #fff; padding: 4px 0; '
                        + 'border-radius: 5px; font-weight: 800; font-size: 16px; min-width: 48px; text-align: center;';
                    badge.textContent = lineCfg.line;

                    var info = document.createElement('div');
                    info.style.cssText = 'flex: 1; font-size: 13px; color: #b0b0b0; overflow: hidden; text-overflow: ellipsis;';
                    info.textContent = lineCfg.directions.join(', ');

                    var delBtn = document.createElement('button');
                    delBtn.style.cssText = 'background: transparent; border: 1px solid #555; color: #888; '
                        + 'width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; '
                        + 'display: flex; align-items: center; justify-content: center; transition: all 0.15s;';
                    delBtn.textContent = '\u00D7';
                    delBtn.addEventListener('mouseenter', function() { delBtn.style.borderColor = '#c62828'; delBtn.style.color = '#ef5350'; });
                    delBtn.addEventListener('mouseleave', function() { delBtn.style.borderColor = '#555'; delBtn.style.color = '#888'; });
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
                addBtn.style.cssText = 'background: transparent; color: #66b3ff; border: 1px dashed #555; '
                    + 'padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; width: 100%; '
                    + 'margin-top: 4px; transition: border-color 0.15s, color 0.15s;';
                addBtn.textContent = '+ Add Bus Line';
                addBtn.addEventListener('mouseenter', function() { addBtn.style.borderColor = '#66b3ff'; });
                addBtn.addEventListener('mouseleave', function() { addBtn.style.borderColor = '#555'; });
                addBtn.addEventListener('click', function() { renderAddLineView(); });
                modal.appendChild(addBtn);
            } else {
                var capNote = document.createElement('div');
                capNote.style.cssText = 'font-size: 12px; color: #888; font-style: italic; margin-top: 8px; text-align: center;';
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
            titleEl.style.cssText = 'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.3px;';
            titleEl.textContent = 'Add Bus Line';
            modal.appendChild(titleEl);

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: #999; line-height: 1.4;';
            subtitle.textContent = 'Select a bus line to add:';
            modal.appendChild(subtitle);

            var grid = document.createElement('div');
            grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px;';

            var availableLines = DTU_BUS_LINES.filter(function(bus) { return configuredLineNames.indexOf(bus.line) === -1; });

            availableLines.forEach(function(bus) {
                var color = LINE_COLORS[bus.line] || '#1565c0';
                var card = document.createElement('button');
                card.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 14px 16px; '
                    + 'cursor: pointer; border-radius: 8px; border: 2px solid #404040; background: transparent; '
                    + 'transition: border-color 0.15s, background 0.15s; text-align: left;';
                card.addEventListener('mouseenter', function() { card.style.borderColor = color; card.style.backgroundColor = 'rgba(255,255,255,0.03)'; });
                card.addEventListener('mouseleave', function() { card.style.borderColor = '#404040'; card.style.backgroundColor = 'transparent'; });

                var badge = document.createElement('span');
                badge.style.cssText = 'background-color: ' + color + '; color: #fff; padding: 6px 0; '
                    + 'border-radius: 6px; font-weight: 800; font-size: 18px; min-width: 56px; text-align: center; '
                    + 'letter-spacing: 0.5px;';
                badge.textContent = bus.line;

                var label = document.createElement('span');
                label.style.cssText = 'font-size: 13px; color: #888;';
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
            backBtn.style.cssText = 'background: transparent; color: #888; border: 1px solid #555; '
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
            titleEl.style.cssText = 'margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.3px;';
            titleEl.textContent = 'Pick Directions';
            modal.appendChild(titleEl);

            var subtitle = document.createElement('p');
            subtitle.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: #999; line-height: 1.4;';

            var lineTag = document.createElement('span');
            lineTag.style.cssText = 'background-color: ' + color + '; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 13px;';
            lineTag.textContent = selectedLine;
            subtitle.appendChild(document.createTextNode('Select directions for '));
            subtitle.appendChild(lineTag);
            subtitle.appendChild(document.createTextNode(':'));
            modal.appendChild(subtitle);

            // Loading
            var statusEl = document.createElement('div');
            statusEl.style.cssText = 'font-size: 13px; color: #888;';
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
                noDir.style.cssText = 'font-size: 13px; color: #888; font-style: italic; padding: 8px 0;';
                noDir.textContent = 'No departures found for ' + selectedLine + ' right now. Try again later.';
                modal.appendChild(noDir);
            }

            var dirCheckboxes = [];
            directions.forEach(function(direction) {
                var row = document.createElement('label');
                row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 12px; '
                    + 'cursor: pointer; border-radius: 6px; margin-bottom: 2px; transition: background 0.15s;';
                row.addEventListener('mouseenter', function() { row.style.backgroundColor = '#383838'; });
                row.addEventListener('mouseleave', function() { row.style.backgroundColor = 'transparent'; });

                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = true;
                cb.style.cssText = 'width: 16px; height: 16px; accent-color: #c62828; cursor: pointer;';

                var arrow = document.createElement('span');
                arrow.style.cssText = 'color: #66bb6a; font-size: 13px;';
                arrow.textContent = '\u2192';

                var dirText = document.createElement('span');
                dirText.style.cssText = 'font-size: 14px; color: #e0e0e0;';
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
            backBtn.style.cssText = 'background: transparent; color: #888; border: 1px solid #555; '
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
        if (!isDTULearnHomepage()) return;
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
        updateBusDepartures();
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
        if (!isDTULearnCoursePage()) return;

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

            // Check "Textbook:" / "Bog:" pattern — keyword with colon followed by book info
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

    // Run Book Finder initially
    insertBookFinderLinks();

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

    // Master function that runs all periodic checks
    function runAllPeriodicChecks() {
        // Dark-mode-specific styling (skip when dark mode is off)
        if (darkModeEnabled) {
            enforcePageBackground();
            pollForHtmlBlocks();
            pollForMultiselects();
            pollOverrideDynamicStyles();
            if (document.body) processElement(document.body);
            replaceLogoImage();
            preserveTypeboxColors();
        }
        // Feature code (always runs regardless of dark mode)
        insertMojanglesText();
        insertMojanglesToggle();
        insertDarkModeToggle();
        insertGPARow();
        insertECTSProgressBar();
        insertGPASimulator();
        insertContentButtons();
        insertBusToggle();
        updateBusDepartures();
        insertBookFinderLinks();
    }

    // Single safety-net interval at 2000ms (MutationObserver handles real-time)
    setInterval(runAllPeriodicChecks, 2000);

    // Unified MutationObserver — handles style re-overrides immediately,
    // and debounces heavier processing (shadow roots, logos, etc.)
    let _heavyWorkTimer = null;
    var _suppressHeavyWork = false; // Set true during our own DOM changes to avoid UI freezes

    function handleMutations(mutations) {
        if (_suppressHeavyWork) return;
        let needsHeavyWork = false;

        for (const mutation of mutations) {
            if (darkModeEnabled) {
                // Style / class attribute changes — apply dark overrides immediately
                if (mutation.type === 'attributes') {
                    const el = mutation.target;
                    if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
                        if (el.matches) {
                            if (el.matches(LIGHTER_DARK_SELECTORS)) {
                                applyLighterDarkStyle(el);
                            } else if (el.matches(DARK_SELECTORS)) {
                                applyDarkStyle(el);
                            }
                        }
                        if (el.classList && el.classList.contains('typebox')) {
                            const inlineStyle = el.getAttribute('style');
                            if (inlineStyle) {
                                const match = inlineStyle.match(/background-color:\s*([^;]+)/i);
                                if (match && match[1]) {
                                    el.style.setProperty('background-color', match[1].trim(), 'important');
                                }
                            }
                        }
                    }
                }
            }

            // New nodes added — schedule feature checks (and dark styles if enabled)
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (darkModeEnabled) {
                            if (node.matches && node.matches(DARK_SELECTORS)) applyDarkStyle(node);
                            if (node.matches && node.matches(LIGHTER_DARK_SELECTORS)) applyLighterDarkStyle(node);
                            if (node.querySelectorAll) {
                                node.querySelectorAll(DARK_SELECTORS).forEach(applyDarkStyle);
                                node.querySelectorAll(LIGHTER_DARK_SELECTORS).forEach(applyLighterDarkStyle);
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
                if (darkModeEnabled) {
                    if (document.body) processElement(document.body);
                    replaceLogoImage();
                    preserveTypeboxColors();
                }
                insertMojanglesText();
                insertMojanglesToggle();
                insertDarkModeToggle();
                insertContentButtons();
                insertBusToggle();
            }, 200);
        }
    }

    function startUnifiedObserver() {
        const observer = new MutationObserver(handleMutations);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }

    // Start observer immediately on documentElement (exists at document_start)
    // Handles both dark-mode styling (when enabled) and feature insertion (always)
    if (document.documentElement) {
        startUnifiedObserver();
    } else {
        document.addEventListener('DOMContentLoaded', startUnifiedObserver);
    }

    // Page load: run all checks a few times to catch late-loading elements
    window.addEventListener('load', async () => {
        await waitForCustomElements();
        runAllPeriodicChecks();
        setTimeout(runAllPeriodicChecks, 500);
        setTimeout(runAllPeriodicChecks, 1500);
        setTimeout(showOnboardingHint, 2000);
        setTimeout(showBusSetupPrompt, 2500);
    });

    // Re-process when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(runAllPeriodicChecks, 100);
        }
    });
})();
