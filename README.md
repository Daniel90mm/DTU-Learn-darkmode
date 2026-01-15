# DTU Learn Dark Mode 🌙

A Firefox extension that brings dark mode to DTU Learn (learn.inside.dtu.dk). No more bright white backgrounds burning your eyes during late-night study sessions!

## Features

- Dark backgrounds throughout DTU Learn
- Comfortable dark theme for all course pages
- Maintains DTU's red branding colors
- Easy on the eyes for long study sessions
- Smooth color transitions

## Installation Instructions

### Method 1: Temporary Installation (For Testing)

1. Open Firefox
2. Type `about:debugging` in the address bar and press Enter
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to this folder and select the `manifest.json` file
6. The extension is now active! Visit https://learn.inside.dtu.dk to see the dark mode

**Note:** Temporary add-ons are removed when you close Firefox. You'll need to reload it each time you restart the browser.

### Method 2: Permanent Installation (Unsigned)

Firefox requires extensions to be signed for permanent installation. For personal use:

1. Open Firefox
2. Type `about:config` in the address bar and press Enter
3. Search for `xpinstall.signatures.required`
4. Double-click to set it to `false` (Firefox Developer/Nightly only)
5. Type `about:addons` in the address bar
6. Click the gear icon ⚙️ → "Install Add-on From File..."
7. Select the `manifest.json` file from this folder

### Method 3: Development Mode (Recommended for Regular Use)

1. Open Firefox
2. Type `about:debugging` in the address bar
3. Click "This Firefox"
4. Click "Load Temporary Add-on..."
5. Select `manifest.json`
6. Bookmark `about:debugging` for quick reloading after browser restarts

## Files

- `manifest.json` - Extension configuration
- `darkmode.css` - All the dark mode styles

## Customization

Want to tweak the colors? Edit `darkmode.css`:

- Main background: `#1a1a1a` (very dark gray)
- Cards/widgets: `#2d2d2d` (dark gray)
- Text: `#e0e0e0` (light gray)
- Links: `#66b3ff` (light blue)
- DTU Red: `#c62828` (kept for branding)

After making changes, go to `about:debugging` and click "Reload" on the extension.

## Troubleshooting

**The dark mode isn't working:**
- Make sure you're on learn.inside.dtu.dk
- Check that the extension is enabled in `about:addons`
- Try reloading the extension in `about:debugging`

**Some elements are still bright:**
- Take a screenshot and let me know - I can add more CSS rules!

**Text is hard to read:**
- You can adjust the text color in `darkmode.css` (look for `color: #e0e0e0`)

## Contributing

Found an element that's still too bright? Want to improve the colors? Feel free to edit `darkmode.css` and share your improvements!

## Screenshots

Before: 🔆 Bright white background
After: 🌙 Comfortable dark theme

---

Made with 💙 for DTU students who study late at night