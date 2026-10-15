# Lumen

Lumen is a fast, minimal new-tab page for Chromium browsers (Chrome, Brave, Edge, Arc, Vivaldi).

**Status:** design phase. We are iterating on HTML prototypes in `prototypes/`. Production code starts only after the layout is final.

## Product principles
1. **As fast as the browser's default new tab.** No network requests on load, a tiny JS bundle, system fonts, and media pre-compressed when uploaded.
2. **Minimal and calm.** Every widget can be hidden; the default is close to empty.
3. **Your data stays yours.** Stored locally, with export/import. No account and no backend.

## v1 scope
- Clock and world clocks
- Search bar
- Favorites / speed dial (1 or 2 rows, configurable items per row, open in same or new tab)
- Tasks and notes (exploring)
- Custom background: gradient, image (auto-compressed), video (limited)
- Toolbar popup: save the current site to Favorites
- Export / import (JSON); optional `chrome.storage.sync` for settings and favorites

**Out of v1:** full bookmark manager and collections (Raindrop-style), weather, accounts, paid features.

## Running the prototypes
Open `prototypes/index.html` in a browser. No build step.

## Planned stack (not set up yet)
WXT (Manifest V3 extension framework) + TypeScript, with a minimal UI layer for the new-tab page.

## Docs
- [Design log](docs/design-log.md): every iteration and the reasoning behind each decision. Mirrors the Figma case-study file.
