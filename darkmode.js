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
        button.d2l-hpg-opener
    `;

    // Function to apply darkest style to an element (#1a1a1a)
    function applyDarkStyle(el) {
        if (!el || !el.style) return;
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

    // Run immediately (unified scheduling handles periodic checks)
    pollOverrideDynamicStyles();

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

    // Initial processing (unified observer handles ongoing changes)
    async function initialize() {
        await waitForCustomElements();
        processElement(document.body);
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
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

    // Run logo replacement (unified observer handles updates)
    replaceLogoImage();

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

        const mojanglesImgSrc = chrome.runtime.getURL('Mojangles text.png');
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
        column.style.cssText = 'background-color: #2d2d2d !important; color: #e0e0e0 !important;';

        const heading = document.createElement('h2');
        heading.className = 'd2l-heading vui-heading-4 d2l-heading-none';
        heading.textContent = 'DTU After Dark';
        heading.style.cssText = 'background-color: #2d2d2d !important; color: #e0e0e0 !important;';

        const list = document.createElement('ul');
        list.className = 'd2l-list';
        list.style.cssText = 'background-color: #2d2d2d !important;';

        const li = document.createElement('li');
        li.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px 0; background-color: #2d2d2d !important;';

        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; color: #e0e0e0; font-size: 14px; background-color: #2d2d2d !important; background: #2d2d2d !important;';

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

    // ===== FIRST-TIME ONBOARDING HINT =====
    // Show a hint pointing to the gear icon the first time the extension is used
    function showOnboardingHint() {
        if (localStorage.getItem('dtuDarkModeHintSeen')) return;

        // Find the gear icon — it lives inside shadow DOM
        function findGearIcon(root) {
            if (!root) return null;
            const icon = root.querySelector('d2l-icon[icon="tier3:gear"]');
            if (icon) return icon;
            const els = root.querySelectorAll('*');
            for (const el of els) {
                if (el.shadowRoot) {
                    const found = findGearIcon(el.shadowRoot);
                    if (found) return found;
                }
            }
            return null;
        }

        const gear = findGearIcon(document);
        if (!gear) return;

        // Get gear icon position
        const gearRect = gear.getBoundingClientRect();
        if (gearRect.width === 0) return; // not visible yet

        // Create the hint bubble
        const bubble = document.createElement('div');
        bubble.id = 'dtu-dark-hint';
        // Build hint bubble using DOM API (avoids innerHTML)
        const outer = document.createElement('div');
        outer.id = 'dtu-dark-hint-inner';
        Object.assign(outer.style, {
            position: 'fixed',
            top: (gearRect.bottom + 12) + 'px',
            left: (gearRect.left + gearRect.width / 2 - 120) + 'px',
            zIndex: '999999',
            pointerEvents: 'auto'
        });

        const card = document.createElement('div');
        Object.assign(card.style, {
            position: 'relative',
            background: 'linear-gradient(135deg, #c62828, #8e0000)',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '10px',
            fontFamily: "'Segoe UI', sans-serif",
            fontSize: '13px',
            lineHeight: '1.4',
            maxWidth: '240px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            animation: 'dtuHintBounce 2s ease-in-out infinite'
        });

        const arrow = document.createElement('div');
        Object.assign(arrow.style, {
            position: 'absolute',
            top: '-8px',
            left: '110px',
            width: '0',
            height: '0',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid #c62828'
        });

        const title = document.createElement('span');
        Object.assign(title.style, { fontWeight: 'bold', fontSize: '14px' });
        title.textContent = '\u2699 DTU After Dark';

        const desc = document.createElement('span');
        desc.style.opacity = '0.9';
        desc.textContent = 'Click the gear to customize your dark mode experience!';

        const dismiss = document.createElement('div');
        Object.assign(dismiss.style, { marginTop: '6px', fontSize: '11px', opacity: '0.7', textAlign: 'right' });
        dismiss.textContent = 'click to dismiss';

        card.appendChild(arrow);
        card.appendChild(title);
        card.appendChild(document.createElement('br'));
        card.appendChild(desc);
        card.appendChild(dismiss);
        outer.appendChild(card);
        bubble.appendChild(outer);

        // Add bounce animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes dtuHintBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(6px); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(bubble);

        // Dismiss on click
        bubble.addEventListener('click', () => {
            localStorage.setItem('dtuDarkModeHintSeen', 'true');
            bubble.style.transition = 'opacity 0.3s';
            bubble.style.opacity = '0';
            setTimeout(() => bubble.remove(), 300);
        });

        // Also dismiss after 15 seconds
        setTimeout(() => {
            if (document.querySelector('#dtu-dark-hint')) {
                localStorage.setItem('dtuDarkModeHintSeen', 'true');
                bubble.style.transition = 'opacity 0.3s';
                bubble.style.opacity = '0';
                setTimeout(() => bubble.remove(), 300);
            }
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

    // Run typebox preservation (unified observer handles updates)
    preserveTypeboxColors();

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

    // Run immediately
    enforcePageBackground();

    // Master function that runs all periodic checks
    function runAllPeriodicChecks() {
        enforcePageBackground();
        pollForHtmlBlocks();
        pollForMultiselects();
        pollOverrideDynamicStyles();
        if (document.body) processElement(document.body);
        replaceLogoImage();
        insertMojanglesText();
        insertMojanglesToggle();
        preserveTypeboxColors();
    }

    // Single safety-net interval at 2000ms (MutationObserver handles real-time)
    setInterval(runAllPeriodicChecks, 2000);

    // Unified MutationObserver — handles style re-overrides immediately,
    // and debounces heavier processing (shadow roots, logos, etc.)
    let _heavyWorkTimer = null;

    function handleMutations(mutations) {
        let needsHeavyWork = false;

        for (const mutation of mutations) {
            // Style / class attribute changes — apply dark overrides immediately
            if (mutation.type === 'attributes') {
                const el = mutation.target;
                if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
                    if (el.matches) {
                        // Lighter dark selectors take priority
                        if (el.matches(LIGHTER_DARK_SELECTORS)) {
                            applyLighterDarkStyle(el);
                        } else if (el.matches(DARK_SELECTORS)) {
                            applyDarkStyle(el);
                        }
                    }
                    // Preserve typebox custom colors
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

            // New nodes added — apply dark styles immediately, schedule heavy work
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // Immediate: apply dark/lighter styles to new nodes
                        if (node.matches && node.matches(DARK_SELECTORS)) applyDarkStyle(node);
                        if (node.matches && node.matches(LIGHTER_DARK_SELECTORS)) applyLighterDarkStyle(node);
                        if (node.querySelectorAll) {
                            node.querySelectorAll(DARK_SELECTORS).forEach(applyDarkStyle);
                            node.querySelectorAll(LIGHTER_DARK_SELECTORS).forEach(applyLighterDarkStyle);
                        }
                        needsHeavyWork = true;
                    }
                });
            }
        }

        // Debounce heavy operations (shadow root processing, logo, mojangles, etc.)
        if (needsHeavyWork && !_heavyWorkTimer) {
            _heavyWorkTimer = setTimeout(() => {
                _heavyWorkTimer = null;
                if (document.body) processElement(document.body);
                replaceLogoImage();
                insertMojanglesText();
                insertMojanglesToggle();
                preserveTypeboxColors();
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
    // so elements get dark-styled as the parser adds them to the DOM
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
    });

    // Re-process when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(runAllPeriodicChecks, 100);
        }
    });
})();
