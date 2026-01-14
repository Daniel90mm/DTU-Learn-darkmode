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
        if (!shadowRoot || shadowRoot._darkModeInjected) return;

        // Skip if element should be excluded
        if (shouldExcludeElement(element)) {
            shadowRoot._darkModeInjected = true; // Mark as processed but don't inject
            return;
        }

        const style = document.createElement('style');
        style.textContent = shadowDOMStyles;
        shadowRoot.appendChild(style);
        shadowRoot._darkModeInjected = true;
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

    // Initial processing
    function initialize() {
        // Process existing elements
        processElement(document.body);

        // Set up MutationObserver to catch dynamically added elements
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        processElement(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also check periodically for new shadow roots (backup method)
        setInterval(() => {
            processElement(document.body);
        }, 1000);
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Also try to process on load
    window.addEventListener('load', () => {
        setTimeout(initialize, 500);
        setTimeout(() => processElement(document.body), 1000);
        setTimeout(() => processElement(document.body), 2000);
    });
})();
