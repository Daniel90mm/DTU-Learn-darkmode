// Dark mode script to inject styles into Shadow DOM elements
(function() {
    'use strict';

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
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
        }

        /* Breadcrumb elements */
        d2l-breadcrumb,
        d2l-breadcrumbs,
        d2l-breadcrumb-current-page,
        .d2l-breadcrumb,
        .d2l-breadcrumbs {
            background-color: #1a1a1a !important;
            color: ${DARK_TEXT} !important;
        }

        /* Breadcrumb links and icons */
        a.d2l-link-small:not(.d2l-link-inline),
        d2l-icon[icon="tier1:chevron-right"],
        span[aria-current="page"] {
            background-color: #1a1a1a !important;
        }

        /* Inline links - lighter dark */
        a.d2l-link-inline {
            background-color: #2d2d2d !important;
        }

        /* Floating buttons */
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
        html {
            background-color: ${DARK_BG} !important;
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
        [role="treeitem"] {
            background-color: ${DARK_BG} !important;
            color: ${DARK_TEXT} !important;
            border-color: ${DARK_BORDER} !important;
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

        p, span, div, strong, em, b, i {
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

    // Styles for HTML block content (module descriptions, lecturer info, etc.)
    const htmlBlockStyles = `
        /* Light text for readability on dark backgrounds */
        :host {
            color: #e0e0e0 !important;
        }

        /* Force ALL elements to have light text */
        *, *::before, *::after {
            color: #e0e0e0 !important;
        }

        div.d2l-html-block-rendered,
        div.d2l-html-block-rendered *,
        .d2l-html-block-rendered,
        .d2l-html-block-rendered * {
            color: #e0e0e0 !important;
        }

        /* Ensure all text elements are visible */
        p, span, div, h1, h2, h3, h4, h5, h6,
        strong, em, b, i, ul, ol, li {
            color: ${DARK_TEXT} !important;
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

    // Start polling for html blocks
    setInterval(pollForHtmlBlocks, 500);

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

    // Start polling for multiselect elements
    setInterval(pollForMultiselects, 500);

    // Selectors for elements that should be #1a1a1a (darkest)
    const DARK_SELECTORS = `
        div[role="list"]:not(.d2l-navigation-s-main-wrapper),
        .d2l-hpg-opener,
        button.d2l-hpg-opener,
        .empty-state-container,
        .d2l-floating-buttons-container,
        .d2l-floating-buttons,
        .d2l-floating-buttons-inner-container,
        d2l-breadcrumb,
        d2l-breadcrumbs,
        d2l-breadcrumb-current-page,
        span[aria-current="page"],
        a.d2l-link-small:not(.d2l-link-inline),
        d2l-breadcrumbs d2l-icon,
        d2l-breadcrumb d2l-icon,
        d2l-icon[icon="tier1:chevron-right"],
        table.d_FG,
        table.d_FG td,
        .d_fgh,
        .fct_w,
        .fl_n,
        .fl_top,
        .d2l-empty-state-description,
        .d2l-body-compact,
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
        .vui-fileviewer-generic-download
    `;

    // Selectors for elements that should be #2d2d2d (lighter dark)
    const LIGHTER_DARK_SELECTORS = `
        .d2l-navigation-s-main-wrapper,
        .d2l-navigation-s-main-wrapper *,
        .d2l-navigation-s-item,
        .d2l-navigation-s-group,
        .d2l-navigation-s-link,
        a.d2l-link-inline,
        .dco a.d2l-link,
        .dco_c a.d2l-link,
        td.d_gn a.d2l-link,
        td.d_gc a.d2l-link
    `;

    // Function to apply darkest style to an element (#1a1a1a)
    function applyDarkStyle(el) {
        if (!el || !el.style) return;
        // Skip navigation wrapper elements
        if (el.closest && el.closest('.d2l-navigation-s-main-wrapper')) return;
        el.style.setProperty('background-color', '#1a1a1a', 'important');
        el.style.setProperty('color', '#e0e0e0', 'important');
    }

    // Function to apply lighter dark style to an element (#2d2d2d)
    function applyLighterDarkStyle(el) {
        if (!el || !el.style) return;
        el.style.setProperty('background-color', '#2d2d2d', 'important');
        el.style.setProperty('color', '#e0e0e0', 'important');
    }

    // Function to aggressively override dynamically applied styles
    function overrideDynamicStyles(root) {
        // Apply darkest color to dark selectors
        const darkElements = root.querySelectorAll(DARK_SELECTORS);
        darkElements.forEach(applyDarkStyle);

        // Apply lighter dark color to navigation wrapper
        const lighterElements = root.querySelectorAll(LIGHTER_DARK_SELECTORS);
        lighterElements.forEach(applyLighterDarkStyle);
    }

    // MutationObserver to watch for style changes
    function setupStyleObserver(root) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const el = mutation.target;
                    // Check if it's a navigation wrapper element (lighter dark)
                    if (el.closest && el.closest('.d2l-navigation-s-main-wrapper')) {
                        applyLighterDarkStyle(el);
                    } else if (el.matches && el.matches(DARK_SELECTORS)) {
                        applyDarkStyle(el);
                    }
                }
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            // Check navigation wrapper elements first
                            if (node.matches && node.matches(LIGHTER_DARK_SELECTORS)) {
                                applyLighterDarkStyle(node);
                            } else if (node.matches && node.matches(DARK_SELECTORS)) {
                                applyDarkStyle(node);
                            }
                            // Check descendants
                            if (node.querySelectorAll) {
                                const lighterDescendants = node.querySelectorAll(LIGHTER_DARK_SELECTORS);
                                lighterDescendants.forEach(applyLighterDarkStyle);
                                const darkDescendants = node.querySelectorAll(DARK_SELECTORS);
                                darkDescendants.forEach(applyDarkStyle);
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

    // Setup observer on document
    setupStyleObserver(document.documentElement);

    // Poll to override dynamic styles
    function pollOverrideDynamicStyles() {
        overrideDynamicStyles(document);

        // Also check iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                const doc = iframe.contentDocument;
                if (doc && doc.body) {
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

    // Start polling for dynamic style overrides (fast interval)
    setInterval(pollOverrideDynamicStyles, 100);

    // Also run immediately and after short delays
    pollOverrideDynamicStyles();
    setTimeout(pollOverrideDynamicStyles, 500);
    setTimeout(pollOverrideDynamicStyles, 1000);
    setTimeout(pollOverrideDynamicStyles, 2000);
    setTimeout(pollOverrideDynamicStyles, 3000);
    setTimeout(pollOverrideDynamicStyles, 5000);

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

    // Initial processing
    async function initialize() {
        // Wait for custom elements to be defined first
        await waitForCustomElements();

        // Now process existing elements
        processElement(document.body);

        // Set up MutationObserver to catch dynamically added elements
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        processElement(node);

                        // Also check if this is a card element or contains cards
                        if (node.tagName &&
                            (node.tagName.toLowerCase() === 'd2l-enrollment-card' ||
                             node.tagName.toLowerCase() === 'd2l-card')) {
                            // Process immediately for cards, and recheck multiple times
                            setTimeout(() => processElement(node), 10);
                            setTimeout(() => processElement(node), 50);
                            setTimeout(() => processElement(node), 100);
                            setTimeout(() => processElement(node), 200);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });

        // Aggressive periodic check for cards (more frequent than before)
        setInterval(() => {
            processElement(document.body);
        }, 500);  // Check every 500ms instead of 1000ms
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Also try to process on load with VERY aggressive checks
    // Cards are loaded dynamically, so we need multiple attempts over longer period
    window.addEventListener('load', async () => {
        // Wait for custom elements first
        await waitForCustomElements();

        // Then do aggressive checking
        const checkTimes = [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7000];
        checkTimes.forEach(time => {
            setTimeout(() => processElement(document.body), time);
        });
    });

    // Listen for visibility changes (when user switches tabs back)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(() => processElement(document.body), 100);
            setTimeout(() => processElement(document.body), 500);
        }
    });

    // Listen for clicks on the page (like semester chevron clicks)
    document.addEventListener('click', async () => {
        // Wait a bit, then wait for custom elements, then check aggressively
        setTimeout(async () => {
            await waitForCustomElements();
            // Check for new cards multiple times after click
            const clickCheckTimes = [50, 200, 500, 1000, 1500, 2000, 2500, 3000, 3500];
            clickCheckTimes.forEach(time => {
                setTimeout(() => processElement(document.body), time);
            });
        }, 100);
    }, true);  // Use capture phase to catch all clicks
})();
