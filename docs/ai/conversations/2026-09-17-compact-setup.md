# Compact setup layout — 2026-09-17

## User request (verbatim)

> I am now thinking it's too long. I should be able to see everything I need to set it up in one screen height, and I currently cannot.

## Response summary and implementation choices

Reworked the homepage into three desktop columns: configuration, preview/link, and Toolscreen instructions. Replaced the large promotional introduction with a short heading and kept the streaming requirement prominent. Theme selection uses compact swatch tiles; option rows keep their labels and accessible descriptions. Shortened repeated copy and reduced vertical padding while retaining the main control text sizes, all five themes, preview, dimensions, position, required Toolscreen toggles, and sequential sparkle guide.

The chosen desktop acceptance target is 1280 × 720 CSS pixels at normal zoom; the user did not supply their screen dimensions. At narrower widths the page reflows and scrolls naturally. No fixed height, page scaling, or hidden overflow is used to force a fit. Additional explanatory material stays below the essential workspace. The Clear-theme contrast note appears with the preview to avoid extending the options column.

## Files and validation

- Changed `index.html` and `src/styles/setup.css`; added browser assertions for workspace bounds before generation, after generation with Clear selected, and after copying at 1280 × 720, 1366 × 768, and 1920 × 1080.
- Updated README, specification, and this conversation index.
- The first screen-fit check found remaining overflow at 1280 × 720; header and option spacing were tightened further. A TypeScript tuple annotation in the new test was also corrected.
- Final TypeScript check and production build passed. All 10 deterministic browser tests passed in headless Edge, including the new desktop-fit test at all three sizes and the existing mobile overflow, guide sequence, clipboard, theme, and overlay checks.
- Visually reviewed the 1280 × 720 generated/copied Clear-theme screenshot and the mobile screenshot. Essential setup fits within the desktop viewport without scrolling; supplementary help remains below it. Mobile stays readable and scrollable.

The user's exact browser size and zoom remain unspecified. The layout was verified against the sizes above, rather than claiming it fits every possible screen height.
