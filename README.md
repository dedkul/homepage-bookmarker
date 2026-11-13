# Lumen

A calm, fast new tab for Chrome. Your favorite sites, a clock, notes, and a wallpaper you choose. Nothing else.

**Status:** the extension is built and works as an unpacked extension. It isn't in the Chrome Web Store yet: Unsplash production approval and store review are still pending.

## Why it exists
Nobody stares at a new tab. You glance at it for a second before you type. Lumen is designed for that glance, and that one idea set three rules:

1. **Load instantly.** A small boot script paints the saved layout and wallpaper before the first frame. The next wallpaper is pre-loaded during idle time, so a shuffle never waits on the network.
2. **Ask nothing.** Every feature has one way in. Favorites, for example, are added and edited in one place: Settings › Favorites.
3. **Look calm.** Wallpaper first, information at the edges.

## Features
- Three layouts: **Dock** (bottom, left or right, with optional auto-hide and one or two rows), **Editorial** and **Strip**
- Clock (large, small or off) with four faces from the Geist family, plus an optional second time zone
- Search bar and up to 12 favorites
- Notes, with optional tasks (type `[ ]` at the start of a line) and simple formatting
- Backgrounds: solid colours, or photos from Unsplash search and your own uploads, shuffled from a set of up to 10
- Frosted, liquid or solid surfaces

## Privacy
No accounts, no analytics, no ads. Favorites, notes, settings and uploaded photos stay in your browser. Unsplash search goes through a small server proxy (`proxy/`), so the extension ships no API key.

## Install (unpacked)
1. Clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the `extension/` folder.
4. Open a new tab.

## Repo layout
| Path | What it is |
| --- | --- |
| `extension/` | The Manifest V3 extension: plain HTML, CSS and JS with no build step |
| `proxy/` | The Unsplash proxy, a single Vercel function that keeps the API key off the extension |
| `prototypes/` | The HTML prototype the extension was ported from. Run `python3 serve.py` inside it, then open http://localhost:5173 |
| `docs/design-log.md` | Every design decision and the reasoning behind it |

## How it was made
Lumen was designed in the browser: the HTML prototype, not Figma, became the source of truth, because Figma couldn't show the details that matter on a page you see for one second. It was built with [Claude](https://claude.com/claude-code) as an AI pair. I set the direction, judged what came back and rejected what didn't meet the bar.

- [Design log](docs/design-log.md)
- [Figma explorations](https://www.figma.com/design/XVdKJ8do088Mqgk2yfAEHV): the shipped product was designed in the browser, so these screens are explorations, not the spec.
