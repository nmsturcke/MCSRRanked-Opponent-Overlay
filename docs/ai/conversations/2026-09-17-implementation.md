# Initial implementation - 2026-09-17

## User prompt (verbatim)

> Okay, let's implement it.

## Follow-up prompt (verbatim)

> Continue.

The assistant continued the same implementation and verification task, preserving the agreed scope.

## Response summary

Implemented the static TypeScript application: a responsive home/setup page, sample preview with active and idle modes, username validation, all five toggles, a dark amber appearance, URL generation/copying, and a separate transparent opponent page.

The runtime uses public live data to identify an unambiguous opponent by UUID and loads enabled profile/head-to-head/image data independently. It clears when the match disappears, handles unavailable values, rejects malformed responses, discards obsolete asynchronous responses, and keeps retrying after failures. Win rate counts all current-season ranked matches; W-D-L uses the configured player's perspective.

Implementation defaults: all display fields initially enabled; flat skin head; five-second healthy poll delay; eight-second request timeout; three failed retries following the first failed live request before hiding; bounded background retry delays; one-minute statistics refresh. A 429 response hides immediately and shares its cooldown across API requests. These are recorded as implementation choices rather than retroactively attributed to the user as separate instructions.

Added TypeScript checking, focused unit tests, headless browser checks, static build configuration, a lockfile, and a README with local use, static hosting, and verification instructions. No backend, private API keys, UI framework, or external deployment was added.

## Work and verification notes

- Dependencies required network escalation because the sandbox blocked the npm registry.
- Vite's config loader required escalation because sandbox parent-directory metadata reads were denied.
- Initial dependency audit identified a test-runner advisory. Updated Vitest to 4.1.11; installation audit reported zero vulnerabilities. npm's optional peer resolver crashed during the first update attempt; retrying with `--legacy-peer-deps` succeeded.
- The installed Node 23.9 runtime is outside Vitest's advertised supported Node lines. Unit tests nevertheless passed; the README recommends supported Node 22.12+ (22.x) or 24+ for development.
- Initial browser checks inadvertently reused an unrelated server on the default preview port. Changed the suite to a dedicated port and disallowed server reuse. No existing server was stopped or modified.
- Browser verification exposed an unbound native `fetch` call that mocked unit tests did not reproduce. Bound the default fetch function to the browser global; real and mocked browser requests then worked.
- Adjusted the browser recovery test's virtual-clock stepping so it allowed network responses to settle instead of artificially timing them out. No application retry behavior was weakened to make the test pass.
- TypeScript checking and the production build passed. All 34 unit tests and all 6 deterministic headless Edge browser tests passed.
- The separately enabled live API browser smoke test passed: username resolution returned the expected account UUID and a credential-free cross-origin live-feed read returned a valid success envelope. This test made two public API requests and is skipped in the ordinary offline-fixture suite.
- Reviewed desktop, mobile, and active-overlay screenshots. The mobile layout has no horizontal overflow; improved streaming-notice wrapping during review. The idle PNG's sampled alpha values were zero at the former card location and elsewhere in the canvas.
- A normal `npm ci --dry-run --ignore-scripts --offline` succeeded against the project lockfile without needing the peer-resolution workaround used during the dependency upgrade.

## Known boundaries

Name-hidden opponent behavior and actual Toolscreen rendering require an in-game check. Match end is detected when the public feed changes, not at an independently observable in-game event. Missing public Twitch information is not guessed. Hosting remains unselected; no site has been published. A local-only production preview was started on port 47830 for review.

See [the README](../../../README.md) and [current specification](../../specification.md) for exact behavior and commands. This log records evidence and concise decision rationale, not private internal model reasoning.
