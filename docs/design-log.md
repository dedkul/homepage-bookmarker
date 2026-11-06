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

---

## 2026-10-17 · v0.6 · Figma becomes the source of truth

**Feedback that triggered this:** the Figma file held screenshots, so nothing could be tweaked there. Hands-on testing surfaced four problems: (1) the opacity and blur sliders were hard to drag inside the scrolling sheet; (2) on long scrolls the Customize title and Done button scrolled out of view; (3) favorites couldn't be edited, only opened; (4) Bento had no way to turn Notes off.

### What's in Figma now ([file](https://www.figma.com/design/XVdKJ8do088Mqgk2yfAEHV))
- **Foundations:** colour variables with Dark and Light modes, radius and spacing variables, 17 text styles, 4 effect styles, and 7 background paint styles. Editing a style updates everything that uses it.
- **Components:** 13 icons and the following, with variants:
  - Button, Icon Button, Toggle, Segment, Slider, Swatch, Task, Badge
  - Search, Favorite, Favorite Add, Zone Chip, Bento Tile, Menu Item
  - Favorite Menu, Input, Favorite Editor, Toast, Customize Sheet
- **Screens:** the six v0.5 variations rebuilt from those components (not screenshots), plus Horizon with the dock revealed and Bento Soft/Mono with Notes off.
- **Interactions:** the sheet open, right-click menu, edit dialog, edit mode with Undo, the Bento notes toggle, and dragging a slider.
- **Explorations:** Dock III Rail, Dock IV Command, Editorial III Column, Bento III Strip.

### Decisions
| Change | Why |
|---|---|
| Sheet header (title, Done, tabs) is **sticky**, and the content is split into four tabs: Layout · Favorites · Background · General | Done is always one click away, and each tab is short enough that scrolling is rare. |
| Slider: full-width track, **32px hit area**, live value readout; build uses pointer capture and `touch-action: none` | A 170px native range was a small target, and the sheet scrolled when a drag started on it. |
| Edit favorites three ways: right-click menu (Open in new tab · Edit · Edit favorites · Remove), **edit mode** (× on each tile, drag to reorder), and the Favorites tab | Discoverable for mouse users, fast for bulk changes. Each opens the same Favorite Editor (link, name, site icon or monogram + colour). |
| Remove gives an **Undo toast** instead of "Are you sure?" | Confirm dialogs train people to click Yes without reading. Undo is safer and faster. |
| "Bento widgets" (Tasks, Notes toggles) appear only when Style = Bento; Notes off → grid re-centres vertically and Tasks matches the Favorites height | Settings that don't apply shouldn't be shown. Equal heights keep the grid feeling designed, not missing a piece. |

### Open
- Animations feel jerky in the HTML prototype; a motion pass happens later (the user's call).
- The HTML prototype has not been updated to v0.6 yet. Figma is ahead of it, by design.

---

## 2026-10-18 · v0.7 · Type explorations (impeccable skill)

**Trigger:** the user wanted to push typography further and test whether the `impeccable` design skill changes the output. HTML only, in `prototypes/type/`; nothing moves to Figma until one is picked.

**What the skill changed:** it asked for a `PRODUCT.md` brief first (register: product; personality: calm, crafted, quick; avoid generic SaaS dashboards). Its ban list flagged Instrument Serif (our current display face) and the "serif + mono labels + ruled lines" look (our Editorial style) as overused, so all four directions use new faces. It also pushed for fixed rem type scales, OKLCH colour, 150–250ms ease-out motion with no overshoot, and one font family where possible.

| Direction | Idea | Why it might win |
|---|---|---|
| A · Timetable (Archivo) | One family; **width** is the hierarchy: ultra-condensed time, extended labels. Zones as a departure board; favorites numbered 1–8 because the number is the keyboard shortcut | Fastest to scan; the numbers do a job |
| B · Optical (Bricolage Grotesque) | One family; the **optical-size** axis gives a characterful display cut for the time and monogram icons, and a plain text cut for labels. The second zone is a sentence | Warmest; closest to the current Dock |
| C · Watch face (Bodoni Moda + Hanken Grotesk) | Didone numerals on an oxblood dial with brass details; a working **sub-dial** with hands for the second zone | Most distinctive and portfolio-worthy |
| D · Daylight (Recursive) | The time's **weight, casualness and slant follow the sun** (light and casual at night, heavy at noon); a day line shows both zones | Ties the type to the name "Lumen" |

**Deliberate rule break:** impeccable caps display type at 6rem. The clocks go to 13–15rem because the time is the page's one job and is read from across a desk.
**Open:** fonts load from Google Fonts in the prototypes; the chosen family gets bundled (subset to the glyphs we use). Phone width is not a real target and wasn't fully verified.

**Outcome (2026-10-18): rejected.** The user didn't like any of the four directions, so the files were deleted. Direction stays with v0.6 in Figma.

## v0.9 · Broadsheet fixes (2026-11-03)
Figma frame 54:2 "Editorial · Broadsheet v0.9" sits next to the original 50:2, which is kept for the case study.
- Customize FAB removed from the bottom-right, where it competed with the search and favorites column. It is now an outlined "Customize" button at the end of the masthead, after the second clock, so all chrome lives in one row at the top.
- The lone "+ Add a favorite" row is replaced by a "Favorites … + Add" header row between search and the list. The index is now a clean 2×N with nothing hanging off it.
- The hero is bottom-aligned with the side column (56px margin), so the clock/greeting and the favorites list end on one baseline.
- Type unchanged: Geist, 3 sizes (252 / 22 / 13), Light for the clock only, flat background.

## v0.9 · Settings system (2026-11-03)
Figma board 56:2 "Settings — v0.9": one Notion-style window (880×600, 200px sidebar), one frame per section (Layout, Background, Clock, Favorites, Search, Notes).
- No Save button: every change applies live behind the window and saves automatically, so you can see the result while you choose.
- Dock position and auto-hide appear only when Dock is selected, to hide options that would do nothing.
- Background reuses the 51:180 picker content as-is.
- Favorites are capped at 12. Edit and Remove show on hover and rows reorder by dragging. Removing has Undo.
- Notes: checkboxes are optional. Completed tasks can be kept in place, moved to the bottom, or hidden.

## v0.9 · Prototype (2026-11-03)
prototypes/index.html + lumen.css + lumen.js replace the v0.5 files (dock/editorial/bento.html), which are deleted.
- Speed: an inline <head> script reads state and sets layout, mode and wallpaper before first paint (measured first paint ≈20 ms locally). The *next* wallpaper is picked during idle time on each tab and pre-warmed: remote photos through the HTTP cache, uploads as a downscaled copy in localStorage. So the shuffle never waits on the network or IndexedDB. config.local.js and the Wallhaven samples load only when Settings opens.
- Sources: live Unsplash search with the demo key (credit "Photo by X on Unsplash" with UTM links; download_location is called when a photo is added). Without a key it falls back to Picsum. Wallhaven uses canned results (wallhaven-sample.js; the API has no CORS). Uploads are downscaled to 2560px and stored in IndexedDB.
- Photo mode: the top-bar pill and Customize button get a flat dark backing, because they were unreadable on bright photos.
- Open issue: an odd number of favorites leaves the 2-column index uneven again (e.g. 7).

## v0.9.1 · Editorial fixes (2026-11-03)
Figma: new frame 65:65 "Editorial · Broadsheet v0.9.1" next to v0.9 (54:2, kept), plus "States" 65:130. Settings board 56:2 updated in place. Prototype updated to match.
- Logo text removed until there is a real logo. A short date ("TUE 3 NOV") takes the top-left; in Strip it sits under the time instead, so it doesn't appear twice.
- Greeting removed everywhere, and its setting too. The hero is just the clock.
- Clock set in Geist Serif (Vercel's new display serif; one weight, 400). Only the big clocks (Editorial, Dock) use it. Strip's 22px time stays in Geist, since a display serif breaks down at small sizes. In Figma the clock is outlined from the real font file, because Geist Serif isn't installed on this Mac.
- Notes and Customize are round icon-only buttons the height of the second-clock pill, so the right cluster reads as one family.
- Favorites: the "Favorites / + Add" header is gone; the label stated the obvious and cost a row. With an odd count, the free cell shows "+ Add" on hover. With an even count there is no Add on the page, so the index never grows a lone row; add from Settings › Favorites or swap one with Edit.
- Search had no visible focus, and in Dock the cursor hid inside the centred placeholder. Now clicking anywhere on the bar focuses it, a white line draws left to right (500 ms ease-out), the icon and placeholder brighten, and text is left-aligned so the cursor is visible.
- Settings: sidebar title removed; dock-only note removed for Editorial/Strip; `scrollbar-gutter: stable` stops the width jump when a tab starts scrolling; Change photo, Dim and Next photo share one 300 px column; the Dim slider is restyled; there is space under the photo grid.
- Copy: no long dashes anywhere in the UI.

## v0.9.2 · Color backgrounds, glass, motion pass (2026-11-03)
Figma: Settings 56:2 updated (keycap esc in all windows, no "Saved automatically", Color/Photo, Surfaces, new window 73:24 "Background, Color"); new screen 74:2 "Dock · Photo + Glass" with spec note 74:72. Prototype updated to match.
- Dark / Light became **Color**: 10 presets (5 dark, 5 light), a custom picker with a hex field, and up to 8 saved colors. Old Dark/Light settings migrate to the Ink and Paper presets.
  - Hex accepts 3 or 6 digits, with or without #. It previews live as you type; leaving the field with an invalid code restores the last color and says why.
  - Save is disabled for presets (tooltip says so) and for colors already saved. When 8 are saved, the hint explains how to make room.
  - Text tone is automatic: whichever of light or dark text has more contrast on the chosen color. Panels are tinted from the background color, so a navy page gets a navy-grey settings window instead of a neutral one.
- **Glass** (on by default) with one **Frost** slider: blur 6 to 24px and tint 25% to 65% move together, so there's one decision instead of two. Applies to the dock, strip, notes and top-bar buttons. The settings window stays solid, because forms need legibility more than atmosphere.
- **Esc** is a keycap (thicker bottom edge; it presses down 1px when clicked). "Saved automatically" is gone: live changes already show that they're saved.
- Motion pass (Emil Kowalski's rules):
  - Stronger ease-out curve, and press scale 0.97.
  - Search line draws in 300ms and retracts in 150ms.
  - Favorites no longer slide on hover; they're seen dozens of times a day.
  - Settings opened with the , key appears instantly.
  - Dock tooltips wait 400ms for the first one, then show instantly.
  - Auto-hide dock waits 400ms before hiding, so slipping off the edge doesn't snap it away.
  - Toasts use transitions with @starting-style, so a replaced toast retargets instead of restarting.
  - Wallpapers crossfade after the new photo has decoded.
  - Reduced motion keeps opacity and color changes and drops movement.

## v0.9.3 · Interface review pass (2026-11-03)
Ran a cross-discipline review (accessibility, layout, writing, typography, color, UI polish) on the prototype, then fixed every finding. Prototype only; Figma waits for approval.
- Accessibility: one visible 2px focus ring on every keyboard stop. Every settings control is named by its row label. Settings and the favorite dialog move focus in, keep Tab inside, make the page behind inert and return focus on close. Remove buttons for photos and saved colors are real buttons, not spans inside other buttons. Favorites can be reordered with ↑/↓ buttons as well as by dragging. Disabled rows are inert.
- Contrast was measured, not estimated. Muted text in light tones was 3.5 to 3.9:1, so it was raised to 0.68 alpha (4.8:1 or better on every light preset). Faint text (2.3 to 2.9:1) is now used only for decoration. The danger red is now per tone: #FF6369 on dark (5.7:1), #C62A2F on light (5.5:1).
- Layout: at 200% zoom the favorites were cut off and unreachable, and at 320px wide the page overflowed to 362px. The page now scrolls when it must, Editorial collapses to one column under 1000px, and settings stacks its sidebar on top under 720px.
- Writing:
  - "Settings" everywhere (the button said "Customize").
  - Every error says how to recover. Unsplash failures get a Try again button.
  - Plurals go through Intl.PluralRules.
  - Toggle labels describe the on state ("Show a second time zone", "Show checkboxes", "Glass surfaces").
- Toasts live in one persistent polite live region. Toasts with Undo stay until dismissed; plain ones pause while pointed at.
- Type: sizes in rem; no Light weight under 28px; tabular numbers in the second clock.
- Polish:
  - Concentric radii (dock 19, strip 24, segmented 11).
  - Icon strokes 1.5.
  - Thumbnail outlines.
  - Notes animate only when opened, not on every keystroke.
  - Scroll stays inside overlays.
- Conflict resolved: Emil's press scale was 0.97; the interfaces skill specifies 0.96 over 150ms ease-out and never while disabled. Chose 0.96, as the more recent instruction.

## v0.9.3 · Figma screens (2026-11-03)
New page "✦ v0.9.3 Screens" (81:2) holds 28 frames captured from the live prototype with real wallpapers, as editable layers. The old "Settings — v0.9" board (56:2) is deleted.
- Layouts (13):
  - Editorial: photo, search focused, hover Add, notes open, Ink, Paper.
  - Dock: bottom, tooltip, left auto-hide hidden and revealed, right on Sand.
  - Strip: photo, Forest.
- Settings (12): Layout (Dock and Editorial), Background (Color, invalid hex, My photos, Unsplash, Wallhaven, Upload), Clock, Favorites, Search, Notes.
- Dialogs & feedback (3): add favorite, edit favorite, removed toast with Undo.
- How: prototypes/figma.html + figma-states.js load any named state (?s=…) without touching saved settings. Photos are local copies of Unsplash photos (via Picsum) in figma-assets/, with photographer credits.
- Capture limits fixed in Figma: CSS color-mix() came through as transparent, so 100 fills were recomputed from each frame's background (solid panels, 45% glass). Backdrop blur did come through as background blur.

## 2026-11-04 · Clock font in Figma
Figma couldn't load Geist Serif, so the clocks on the v0.9.3 Screens page were switched to Geist Light (editable) at the user's request. The prototype still uses Geist Serif until the user decides. Live wallpapers are back under consideration (research pending).

## v0.9.4 · Synced from the user's Figma edits (2026-11-04)
Source: section "Edited Layouts" (119:7) on page 81:2. I diffed each edited frame against its captured original, layer by layer, and the user confirmed the list before anything changed.
- The masthead divider line is removed on every layout. The top bar now floats over the background with no rule under it.
- Top-right order is now time-zone pill, Notes, Settings. The two round buttons sit together at the edge, and the text pill leads.
- Settings window:
  - Sidebar padding is an even 16px.
  - The content panel's top padding is 32px.
  - The esc keycap is smaller (21px tall, 12px text) and has a 2px drop "key edge" instead of an inset one.
  - The dropdown text is inset 12px, and the dropdown is 228px wide.
- The clock font stays Geist Serif in the prototype (the user's choice). The Figma clocks stay Geist Light until Figma can load the serif.

## v0.9.5 · Settings get depth, a new slider, and an X link (2026-11-04)
- **Depth, not decoration.** The settings window looked flat. Two rules now apply, both lit from above. Raised things (the window, the selected nav item, segmented tabs, buttons, toggle knobs, the esc keycap) get a 1px top highlight and a gradient of 4% or less. Sunken things (slider tracks, inputs, segmented wells, the toggle track, empty photo slots, the upload tray) get a soft inner shadow. Every value comes from four tokens (`--hi`, `--sink`, `--sink-soft`, `--raise`), with separate values for light text tones. Row dividers fade out to the right, so the list reads as one surface rather than a table.
- **Slider** (from the user's reference video). The whole bar is the control. The label sits inside on the left and the value (Geist Mono) on the right. A thin handle rides the fill's edge and brightens on hover. Dragging past either end stretches the bar by up to about 10px, with eased resistance, and it springs back on release. Clicking the value lets you type a number; Enter confirms and Esc cancels. Keyboard users get arrows plus Enter to type. The native range input stays underneath for screen readers. Slider rows stack: the bar is full width with the description below, so the label isn't repeated outside the bar.
- **Upload**: a sunken tray with a small stack of three photos that fans out on hover or drag-over. The copy now reads "Room for 4 more photos (6 of 10 used). They stay on this computer.", which replaces "4 free slots", a phrase that confused the user.
- **Follow on X** (@feat_ashish) is pinned to the bottom of the settings sidebar and kept quiet. It never appears on the new tab. "Buy me a coffee" waits for a URL.
- **Figma** (page 81:2):
  - The full-screen layer named "Text" on 26 photo screens was the 30% photo dim. It is now locked and renamed "Photo dim", so canvas clicks pass through to what's below. It wasn't hidden, because hiding it would brighten every photo.
  - All 33 clocks now share one text style, "Clock". Figma's plugin API can't see the locally installed Geist Serif, so the style is still set to Geist Light. Changing the style's font once updates every clock.
  - Four new frames sit at the bottom of the Settings section: Layout, Color (Frost slider), My photos (Dim slider), and Upload. The capture lost color-mix gradients and turned row dividers into full fills; both were repaired by hand.

## v0.9.5.1 · No esc button (2026-11-04)
- The esc keycap in the settings header is gone. Clicking outside already closes the window and the Esc key still works, so the button added nothing. The header keeps its 21px height, so the content doesn't jump. Removed in the prototype and from all 17 settings frames in Figma.
- Geist Serif is still not set in Figma. The Figma MCP plugin only sees Figma's cloud fonts, not fonts installed on the Mac. The clocks share the "Clock" text style, so one manual font change in Figma updates all 33.

## v0.9.6 · Fewer flows, motion that follows the finger (2026-11-05, prototype only)
- **Toggles and segmented tabs animate.** Before, every click re-rendered the whole section, so states snapped. Now the control animates in place: the knob slides, the track color fades, and a raised pill slides between tab options. The section re-renders after the motion ends (260ms). The knob also widens slightly while pressed.
- **Dropdown chevron**: a custom chevron sits 12px from the edge (the native one sat flush against it).
- **Sidebar**: Lucide icons for each section. The footer link now reads "Follow @feat_ashish", because "X Follow on X" said X twice.
- **The Upload tab is gone.** My photos is the one place to manage the set. The empty "+" slots open the file picker, and images can be dropped anywhere on the grid. A line under the grid points to Unsplash and Wallhaven, which remain tabs. That removes a tab, a duplicate drop zone, and a dead end that showed glass settings but none of your uploads.
- **Search**:
  - Wallhaven search works for real now, through a small dev server (prototypes/serve.py), because Wallhaven blocks browser requests (no CORS); the extension will use host_permissions. Without serve.py the saved topics are used, and the page now says so instead of silently showing unrelated results.
  - Search runs on Enter, not on every keystroke, because the Unsplash demo key allows 50 requests an hour. An Enter button at the end of the field makes that discoverable and lights up once there's text.
  - An empty state ("Nothing found for …") replaces the blank grid.
- **Frost preview**: two of your own wallpapers sit under the Frost slider, each with a small glass dock built from your favorites. It reads the same --frost value as the real surfaces, so it changes live while you drag. Blur is scaled to the preview size.
- **Adding favorites, the same rule everywhere**: nothing at rest, an add affordance on hover or focus.
  - Dock and Strip: the "+" tile slides in when you point at the dock. Its tooltip now uses the same 13px text as the others; it had inherited the 22px "+" glyph size.
  - Editorial: an odd count shows "Add" in the free cell. An even count shows it just below the grid, in the page padding, so the layout never moves.
  - At 12 favorites the affordance disappears. Settings › Favorites says how many you have.
- **Kept the 12-favorite cap.** Twelve is 6 rows in Editorial, and a vertical dock of 12 tiles (576px) still fits a 720px-tall laptop screen. More would push the side docks off small screens and turn the new tab into the bookmark manager this product said it would never be.

## v0.9.7 · Favorites, edited where they live (2026-11-05, prototype only)
- **Wallhaven, root cause**: Wallhaven's API sends no `Access-Control-Allow-Origin` header (checked with curl), so a web page can't read it. Unsplash sends one, which is why it worked. serve.py passes searches through, but the user's tab wasn't served by it (none of their searches reached the server log). The prototype then fell back to four saved topics and said "Nothing found", which was false. It now says live search needs serve.py and links to localhost:5173. The extension has host_permissions and won't hit this.
- **Add favorite is inline.** The pop-up dialog is gone. "+ Add favorite" turns a new row at the bottom of the list into a form: favicon preview, then Web address (first, because the name fills itself in from it, shown live as the placeholder), then Name (optional), then Add and Cancel. Edit uses the same row in place. Enter saves and Esc cancels only the row.
  - Errors show inline: an invalid address, or a duplicate ("That's already in your favorites as GitHub.").
  - Add, Edit and right-click on the new-tab page all open Settings › Favorites with the row ready and the cursor in it. There's one place, and one way, to change favorites.
- **Primary button hover**: the depth rule had turned the hover fill dark under dark text. Hover now stays light.
- **No + in the dock or strip.** The hover-reveal + made the centered dock grow, so the icons slid sideways under the pointer. Adding lives in Settings. The + appears only when there are no favorites, so an empty dock is never a dead end. Editorial keeps its hover "Add" cell, because it never moves the layout.
- **Limits and edge cases.** There's one limit, 12, for every layout, because favorites are shared and switching layouts must never hide or drop any. Each layout absorbs small windows on its own:
  - Bottom or side dock: tiles shrink from 44px to as little as 30px when the dock would outgrow the window (12 tiles need 590px at full size, 466px at the smallest).
  - Strip: it shares one row with the clock and the search field. The search keeps at least 240px, the favorites that fit are shown, and the rest fold into a "+N" tile that opens a small list. At 1440px all 12 show; at 1000px, 10 show plus "+2"; at 520px, 1 shows plus "+11". This replaces the old rule that hid the strip's favorites entirely below 560px.
  - Editorial: 12 favorites is 6 rows.
  - With 0 favorites, every layout shows an add affordance, and Settings shows an empty state.
  - At 12 favorites, Add disappears and the count explains why.

## v0.9.8 · Notes become notes, the dock gets two rows (2026-11-05, prototype only)
- **Notes bug**: the panel collapsed into a 24px box in the corner. Its pop-in class `enter` collided with the new search button's `.enter` style. Renamed both (`pop-in`, `sbox-go`). New classes get a component prefix from now on.
- **Notes model**: every line is a plain note. A line becomes a task with the Task button in the panel header, or by typing `[ ]` (or `[x]`) at its start. Enter on a task starts another task; Enter on an empty task, or Backspace at the start of a task, turns it back into a note. "Move to bottom" and "Hide" apply to done tasks only, and notes never move. The global "Show checkboxes" setting is gone; old data migrates (lines with text that were tasks stay tasks).
- **Notes panel**: 8px closer to the top bar. The header label and its actions are centered on one line. The top-bar icon is now the Lucide sticky note, matching the sidebar.
- **Dock rows**: Settings › Layout › Rows (Columns on a side dock): One or Two. Two rows lay the favorites out as a grid, 6 per row with 12 favorites, filling row by row at the bottom and column by column on the sides. The option is disabled below 4 favorites, where it would change nothing. Tile shrinking on small windows uses the per-row count.
- **Settings sidebar**: one highlight slides between sections (240ms, transform only, so it costs nothing).
- **Scrollbars** in settings, notes and the "+N" panel: a thin rounded thumb that darkens when you reach for it.
- **Strip search**: the icon was 2.6px high because its box was the 21px text line with a 16px icon at the top; it's centered now. On focus the placeholder steps back, so the caret stands out.
- **New-favorite row**: a globe stands in for the favicon until an address is typed. The empty outlined square had read as a checkbox.
- **Demo states** for the 12-favorite edge cases: figma.html?s=twelve-dock-bottom, twelve-dock-bottom-two-rows, twelve-dock-left, twelve-dock-left-two-columns, twelve-strip, twelve-editorial.

## v0.9.9
- Notes icon: Lucide notepad-text (spiral pad) in the top bar and the settings sidebar. The folded sticky note read as "file".
- Settings icon: Lucide gear. The panel covers search, favorites and notes, so "settings" is more honest than a sliders/appearance icon.
- Two-row dock with an odd number of favorites: the one empty grid cell becomes a dashed "+" add slot, shown on dock hover (always on touch). The cell already exists in the grid, so the dock never moves. Not shown in one-row docks (that would widen the dock), at 12 favorites, or for an even count.

## v0.9.10
- Notes panel sits 12px below the Notes button (was 30px).
- Task button removed: typing [ ] at the start of a line is the one way to make a task. Two ways to do the same thing was noise.
- Notes is one writing surface: no indent on plain lines, no highlight block on the line being edited, long notes and tasks wrap (tasks with a hanging indent beside the checkbox), 22px line height with 6px between lines.
- Discord-style formatting: **bold**, *italic*, __underline__, ~~strike~~, `code`. The line being edited shows the raw markers; the other lines show the result.
- Editing: Enter splits the line at the caret, Shift+Enter breaks a line inside one note, Backspace at the start joins a line onto the one above (or turns a task back into a note), arrow keys move between lines.
- Settings: Rows/Columns is a 1/2 dropdown; Completed tasks is a dropdown (Keep in place, Move to bottom, Hide). "Move to bottom" was wrapping one word per line in the segmented control.
- Next version: sticky notes (a + creates a new note card) to replace the single panel.

## v0.9.11: Clock fonts, liquid glass, dim fix

- **Dim fix.** The dim layer is position:fixed and was painting over the main content (clock, search, Editorial favorites) because that content wasn't positioned. Main is now lifted above it.
- **Clock fonts.** Four lock-screen style choices at the top of Settings > Clock, shown as live samples of the current time: Serif (Geist Serif), Sans (Geist 200), Pixel (Geist Pixel Square), Dot (Geist Pixel Circle). Pixel faces come from Vercel's Geist family, so the type system stays one family. They apply to the large clock in Dock and Editorial; Strip keeps its small sans clock. Pixel fonts are 28 KB each and only download when picked.
- **Serif tracking** tightened from -0.02em to -0.055em; at 240px the gaps between digits read loose.
- **Glass is now a dropdown:** None / Frosted / Liquid (replaces the on/off toggle). Frost slider only applies to Frosted.
- **Liquid glass** is an SVG displacement map inside backdrop-filter, built per surface size in JS (no library). It bends the wallpaper in a narrow rim and keeps the middle clear, with a lit inset edge. Chromium only, which is fine for a Chrome extension; elsewhere it falls back to a light blur. Notes and the overflow menu keep more tint so text stays readable.
- **Plus signs are drawn, not typed.** The "+" glyph sits below center in its line box, so the add cells (Editorial ghost row, dock add slot, empty-dock add tile) now draw a 1.5px cross with CSS gradients, centered exactly.
- **Show clock: Large / Small / Off** (Settings > Clock). Covers both "minimal dock" and "clock off" with one control instead of a separate dock variant. Small moves the time into the top bar before the date ("8:25 AM  FRI 6 NOV") and drops the big clock, in Dock and Editorial alike. Strip keeps its own small clock; Off hides it. Font picker and Time format grey out when they no longer apply.
- **One add mark.** Replaced the hand-drawn crosses with a single `addMark()`: Lucide plus (14px) in a dashed rounded square the size of a favorite icon (26px Editorial, 28px dock). Used by the Editorial "Add" row, the dock's empty slot and the empty-dock add tile. Considered Untitled UI Icons (free tier has 1,181 icons, enough), but stayed on Lucide: near-identical style, React-only package, and its licence forbids redistributing the icons, which is murky for a public repo.
- **Clock merged into Layout.** Settings go from 6 tabs to 5. Clock options depend on the layout (Strip ignores the font; Large/Small/Off decides what the page shows), so they now sit under a "Clock" subheading in Layout. Split back out if Layout grows.
- **Scrollbar inset.** The custom scrollbar track now stops 14px short of each end (matching the 14px corner radius), so the thumb never runs into the rounded corners of settings, notes or the overflow menu.
- **Surfaces copy and Solid colors.** "Glass" became Surfaces > Style: Frosted glass (default) / Liquid glass / Solid. Each style shows only its own control: Frost slider, a performance warning for Liquid ("If new tabs open slowly or scrolling stutters, switch back to Frosted glass."), or Color: Black / White for Solid. Solid surfaces re-declare their own text tokens so they read on any page tone.
- **Wallhaven hidden** (`WALLHAVEN = false`) until Unsplash approves a production key; a second, user-uploaded image source could count against the application. Code kept.
- **Figma is not the build reference.** Captures can't render Geist Serif and flatten the settings shadows; the extension is built from the prototype's CSS and JS.
