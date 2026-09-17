# Guided setup highlights — 2026-09-17

## User request (verbatim)

> Okay, now I want the buttons to be highlighted in order. So first highlight "Your Minecraft username", once that is clicked/any value is in it, we highlight "Generate overlay link", once that has been clicked we highlight "Copy link" and then we highlight the "IN TOOLSCREEN" panel saying how to set it up
>
> I want the highlight to have some sparkles and flying particles, but not be overwhelmingly crazy, just enough for it to be obviously the next thing to click/pay attention to.

## Response summary and implementation choices

Implemented the requested sequence with one amber outline, soft glow, and four small decorative sparkles on the active target. Username focus or input advances to Generate. Copy becomes highlighted after a link is successfully generated, so lookup failures never direct users to a hidden control. Successful copying advances to the Toolscreen instructions; denied clipboard access keeps Copy highlighted until the full URL is manually copied.

The following are implementation choices supporting the requested behavior: particles drift for 4.8 seconds on each transition and settle, retaining the static highlight; reduced-motion preferences disable animation entirely. Decorations are hidden from assistive technology and ignore pointer events. Existing controls retain their keyboard behavior, and the guide never moves focus or scrolls automatically. Editing a username returns to Generate; changing settings after generation highlights Copy again because the URL has changed. Clipboard completion is ignored if the generated link has changed while the operation was pending.

## Files and validation

- Added `src/setup-guide.ts`; updated `src/setup.ts`, `src/styles/setup.css`, and the Generate button label in `index.html`.
- Updated browser coverage, README, specification, and conversation index.
- TypeScript check and production build passed.
- All nine deterministic browser tests passed in headless Edge, including sequential highlighting, changed settings, account lookup failure, clipboard fallback, reduced motion, and mobile overflow.
- Reviewed desktop and mobile screenshots. Actual in-game Toolscreen testing remains outside this homepage change.

No unresolved questions for this change.
