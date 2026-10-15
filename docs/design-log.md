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
