# Product

## Register

product

## Users
People who open dozens of new tabs a day in a Chromium browser (Chrome, Brave, Edge, Arc, Vivaldi). They glance at the page for one or two seconds, to check the time (often across two time zones, e.g. Sydney and Kolkata), to search, or to jump to a favorite site, and then they leave. The job is to get somewhere fast without the page getting in the way.

## Product Purpose
Lumen is a fast, minimal new-tab page: a clock and an optional second time zone, search, favorites (speed dial), an optional tasks and notes view, and a custom background. It exists because existing new-tab extensions feel slower than the browser's own tab. Success means it feels as instant as the default new tab, looks considerably better, and keeps all data local (no account, no backend). It is also a product-design portfolio case study, so the decision trail matters.

## Brand Personality
Calm, crafted, quick. Quiet by default, clearly made with care, never slower than a blink. Users can choose between three styles (Dock, Editorial, Bento); typography carries the character, and motion feels physical but short.

## Anti-references
- Generic SaaS dashboards: Inter everywhere, cards around every widget, grey labels, admin-panel density.
- (From the design log) Neon aurora gradients and decorative frosted glass, the 2023 look.

## Design Principles
1. **A glance, not a visit.** The time, search and favorites must read in under a second; style never costs legibility.
2. **Close to empty by default.** Every widget can be hidden; add only what earns its place.
3. **Speed is a feature people can feel.** No network on load, bundled fonts, no layout shift, instant first paint.
4. **Crafted details over decoration.** Character comes from typography, spacing and satisfying interactions, not ornaments.
5. **Your data stays yours.** Local storage with export and import; no account.

## Accessibility & Inclusion
Target WCAG 2.2 AA. Text must stay legible over user-chosen photos (the background overlay supports this). Visible keyboard focus everywhere, `/` focuses search, Escape closes panels. Full `prefers-reduced-motion` support. The time and labels must never depend on color alone.
