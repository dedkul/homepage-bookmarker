# Design log

Each entry records what we explored, what we decided, and why. This is the source for the Figma case study.

---

## 2026-10-15 · v0.1 · Layout explorations

### Problem
Existing new-tab extensions (Momentum, Infinity, etc.) feel slower than the browser's own new tab. They load heavy JS bundles, fetch remote content, and draw a blank frame before the page appears. People open dozens of new tabs a day, so any lag is felt every time.

### Decisions made before exploring
| Decision | Why |
|---|---|
| Our own data store, not the browser's bookmarks | Full control over the data model and export format; v1 only needs favorites. |
| v1 = favorites (speed dial), not a bookmark manager | Keeps scope tight; Raindrop-style collections can come in v2. |
| Free, no backend | No accounts, no servers; privacy is a selling point. |
| Export/import is required; Chrome sync is optional | Chrome sync's ~100 KB limit fits settings and links but not images. |
| System fonts only | Zero font-loading cost on every tab. |

### Four directions (`prototypes/`)
All four show the same content so we compare layout only.

- **A · Focus:** centred stack (clock → search → favorites). Tasks and notes sit in a drawer.
  *Hypothesis:* the closest to a default new tab, so it feels instant and calm. *Risk:* tasks are hidden, so they may be forgotten.
- **B · Dock:** search centred, favorites in a bottom dock, clocks and tasks in corners.
  *Hypothesis:* a familiar macOS mental model; it keeps the centre clear. *Risk:* corners compete for attention and the dock sits far from the cursor.
- **C · Editorial:** split, typography-led layout.
  *Hypothesis:* the most distinctive and portfolio-worthy. *Risk:* it weakens the background image (the left half is mostly text) and is harder on narrow windows.
- **D · Bento:** a grid of widget cards.
  *Hypothesis:* scales best to v2 widgets. *Risk:* it looks like a dashboard, not a calm homepage, and the busy screen works against "light and fast".

### Open questions to test
- Should favorites scale tile size with the per-row count, or keep a fixed size?
- Do tasks and notes belong on the new tab at all, or are they v2?
- Background: does a photo or video change which layout works?

---

## 2026-10-15 · v0.2 · Narrowed to A (Focus) vs C (Editorial)

- **Dropped B (Dock) and D (Bento).** D read as a dashboard, not a calm homepage. B pushed favorites far from the centre. (Files kept for the case study.)
- **World clocks → one optional second time zone.** The user moves between two time zones, so three fixed cities was noise. The main clock is always local time. The second clock can be added, edited (label + IANA zone with autocomplete) or removed inline; Edit appears on hover.
  *Why inline, not in settings:* editing happens right where the clock is, so you don't have to hunt for it.

---

## 2026-10-15 · v0.3 · Three styles, no bookmarks, background overlay

- **Ship three user-selectable styles:** Dock (merged with Focus), Editorial, Bento. *Why:* the user liked all of them; three gives a real choice without overwhelming people. Constraint: each style is a CSS layer over one shared component set, so features are built once.
- **Bookmarks removed from the roadmap.** Favorites (speed dial) only. *Why:* keeps the product focused and simple.
- **Video background dropped (pending confirmation).** *Why:* speed is the core promise.
- **Background overlay:** colour picker + opacity (0–90%) + blur (0–30px). *Why:* fixes photos that are too bright or busy for legible text. *Perf note:* production bakes the blur into the stored image when it's saved, so it costs nothing at runtime. The prototype uses live CSS.
- **Onboarding planned:** a one-time welcome tab on install. Steps: pick favorites → pick style → background. Each step is skippable.

---

## 2026-10-15 · v0.4 · Name: Lumen

- **Chosen name: Lumen.** *Why:* it's short, easy to say and spell, so people can recommend it out loud. It suggests light and clarity, which fits a calm, fast homepage. It was picked from a shortlist (Cove, Porch, Europa, Hush, Nook).
- *Risk:* "Lumen" is common in tech. Before publishing, check the Chrome Web Store, domains and trademarks; a fallback is a qualifier like "Lumen Tab".
- **Confirmed:** video is out of v1 (the settings page shows a "coming soon" hint). The default zones are Sydney + India.

---

## 2026-10-16 · v0.5 · Three styles × two variations, real art direction

**Feedback that triggered this:** v0.1 had potential, but the visual design was low effort. The new bar is Product Hunt / Awwwards quality. The user handed art direction to Claude.

### Art direction
| Choice | Why |
|---|---|
| **Geist** (UI), **Instrument Serif** (display), **Geist Mono** (data) | One modern grotesque, one expressive serif, one mono: enough range for three styles without visual noise. All three are OFL licensed and **bundled in the extension** (~95 KB from disk, no network), so the "system fonts only" rule was revised: same speed, far more character. |
| Warm palette (ember, plum, sand, sea) instead of neon purple | Neon aurora gradients are a 2023 cliché. Warm tones feel calm and personal, which fits "feel-good". |
| Subtle film grain over every background | Removes the flat, digital look of gradients, like printed paper. It costs one tiny inline SVG. |
| Springy press (`scale .94`, overshoot easing), 4px hover lift, staggered entrance | Clicks should feel physical. Motion is short (under 0.7s) and fully disabled under `prefers-reduced-motion`. |
| Customize as a right side sheet with segmented controls, switches and background swatches | Settings stay one click away without leaving the page; changes preview live. |

### Variations
- **Dock · I Still:** centred clock, a pill showing the second clock with a day/night dot and the time difference, and a floating dock with macOS-style magnification (the hovered icon and its neighbours grow).
- **Dock · II Horizon:** the time sits low on the left like a horizon line, and search moves to the top. The dock **auto-hides** and slides up when the cursor nears the bottom edge, pushing the time up. This lets a background photo breathe.
- **Editorial · I Broadsheet:** a newspaper masthead (brand, date, second clock) over a large serif time. Favorites become a **typographic index** (01, 02… with an arrow on hover).
- **Editorial · II Gallery:** the background is the artwork. Time, search and favorites sit at the edges like museum labels; favorite names appear as tooltips.
- **Bento · I Soft:** rounded glass tiles: clock, second clock, favorites, tasks, notes.
- **Bento · II Mono:** an instrument panel: a hairline grid, Geist Mono everywhere, square corners, no blur or shadow.

### Usability details
`/` focuses search from anywhere · visible focus rings on everything · Escape closes panels · the second clock is edited inline, with time-zone autocomplete and validation · tasks and notes appear only in Bento, where widgets are the point, and stay off the calm styles · "Video background: Coming soon" appears in settings.
