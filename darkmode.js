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

    // Elements that should NOT have dark mode injected (keep original styling)
    const EXCLUDED_ELEMENTS = [
        'd2l-image-banner-overlay',      // Course banner
        'd2l-image-banner',               // Course banner components
        'team-widget',                    // Teams widget
        'd2l-organization-image',         // Course images
        'd2l-course-image'                // Course images
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
        }

        // Check if element ID suggests it should be excluded
        if (element.id) {
            if (element.id.includes('banner') ||
                element.id.includes('team') ||
                element.id.includes('overlayContent')) {
                return true;
            }
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

        // Check if we already injected styles
        const alreadyInjected = shadowRoot._darkModeInjected;

        // For enrollment cards, ALWAYS reprocess nested shadow roots
        // even if we already injected styles, because d2l-card might be added later
        const isEnrollmentCard = element && element.tagName &&
                                 element.tagName.toLowerCase() === 'd2l-enrollment-card';

        if (alreadyInjected && !isEnrollmentCard) {
            // Already processed and it's not an enrollment card, skip
            return;
        }

        if (!alreadyInjected) {
            // First time processing - inject styles
            const style = document.createElement('style');

            // Use element-specific styles based on tag name
            if (element && element.tagName) {
                const tagName = element.tagName.toLowerCase();

                if (tagName === 'd2l-icon') {
                    style.textContent = iconShadowStyles;
                } else if (tagName === 'd2l-enrollment-card') {
                    style.textContent = enrollmentCardShadowStyles;
                } else if (tagName === 'd2l-card') {
                    style.textContent = cardShadowStyles;
                } else {
                    style.textContent = shadowDOMStyles;
                }
            } else {
                style.textContent = shadowDOMStyles;
            }

            shadowRoot.appendChild(style);
            shadowRoot._darkModeInjected = true;
        }

        // ALWAYS process nested shadow roots for enrollment cards
        // This catches d2l-card elements that were created after initial processing
        if (isEnrollmentCard || !alreadyInjected) {
            processNestedShadowRoots(shadowRoot);
        }
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

    // Function to find and inject into all shadow roots
    function processElement(element) {
        if (element.shadowRoot) {
            injectStylesIntoShadowRoot(element.shadowRoot, element);
        }

        // Check all children
        const children = element.querySelectorAll('*');
        children.forEach(child => {
            if (child.shadowRoot) {
                injectStylesIntoShadowRoot(child.shadowRoot, child);
            }
        });
    }

    // Wait for critical custom elements to be defined before processing
    async function waitForCustomElements() {
        // Wait for the custom elements to be defined
        const elementsToWait = [
            'd2l-enrollment-card',
            'd2l-card',
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
