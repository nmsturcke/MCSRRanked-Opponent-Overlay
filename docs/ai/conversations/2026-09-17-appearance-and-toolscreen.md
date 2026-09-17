# Appearance and Toolscreen setup - 2026-09-17

## User prompt (verbatim)

> It looks good. Can we make the text a bit bigger though in the main index page?
>
> Let's also add a few more appearance styles:
> - dark purple + bright blue / pink
> - light (white or light gray + black text)
> - fully transparent background (though I'm not sure how this would work accessibility-wise)
> - any other you can think of
>
> let's also add indications about what size to give on toolscreen (390 x 170 for full with twitch, 390 x 140 without twitch, 390 x 76 for slim) and how to put it in the "default" position (where MCSRR usually puts opponent, which we do by setting the X to -10, Y to 215, relative to Top Right (Screen)), and also they should enable "Transparent" and "Refresh on Update" in Toolscreen

## Response summary

- Increased the home page's small text by roughly three pixels, with responsive layout adjustments; preserved compact in-game typography.
- Added Neon dusk, Paper, Clear, and Forest alongside the original Dark amber theme. Selection updates the preview and generated URL, and works on the opponent page. Forest is the extra design choice authorized by the user's invitation.
- Clear uses outlined/shadowed white text with no panel or visible border. Its picker note explains that readability depends on the scene and suggests a solid theme when needed; no absolute accessibility claim is made.
- Added a Toolscreen settings panel with the exact supplied dimensions, position, and both required checkbox names. The size recommendation updates as fields are toggled. Slim means name and optional head, with statistics and Twitch disabled.
- Reduced the metrics top spacing by two pixels to fit the full card without Twitch inside a 140-pixel viewport.
- Updated the README, current specification, and conversation index.

## Validation

- TypeScript checking and production build passed.
- All 40 unit tests and all 8 deterministic headless Edge browser tests passed.
- Browser checks covered theme selection through generated links, preview changes, transparent-theme panel/border removal, text shadow, and the exact advertised overlay viewports. Existing retry/recovery and idle-transparency tests still passed.
- Reviewed desktop/mobile setup screenshots and the Neon dusk and Clear overlay screenshots. Mobile has no horizontal overflow.
- No dependency changes, API changes, or deployment. Toolscreen positions use values supplied by the user and were not independently tested in-game.

This record contains the request, result, verification, and concise rationale; it does not contain private internal model reasoning.
