# MCSRR opponent overlay: current v1 specification

Updated: 2026-09-17. Scope: the static setup page and Toolscreen opponent overlay. This document incorporates the user's follow-up answers and supersedes unresolved product questions in the initial research where answered. The first implementation is now in this repository; see [the README](../README.md) for running, building, and testing it.

## Confirmed requirements

- Support matches exposed by the public-stream feed. Universal non-streaming coverage is not required.
- Make the streaming requirement obvious on the home page, before URL generation.
- Accept a Minecraft username and generate a URL containing the selected overlay settings.
- Display the opponent's identity and the enabled fields below.
- All statistics use the current season; head-to-head is from the configured player's perspective.
- Opponent win rate is current-season ranked wins divided by all current-season ranked matches, including draws in the denominator.
- When no match is visible, the overlay is completely transparent.
- Retry API failures; the implementation uses three failed retries after the initial failed live request before becoming transparent.
- Continue retrying failed requests in the background while the overlay is loaded, including while transparent, so it can recover automatically.
- Remove the previous opponent as soon as match completion is detected. A ten-second detection delay is acceptable.
- Appearance supports Dark amber, Neon dusk (dark purple with blue/pink), Paper (light gray with dark text), Clear (outlined white text without a panel), and Forest (deep green/mint). Transparency is essential.
- Use larger text on the home page, while preserving the compact overlay typography.
- Include Toolscreen dimensions 390 × 170 with Twitch, 390 × 140 without Twitch, and 390 × 76 for slim; show the default position X -10, Y 215 relative to Top Right (Screen), and instruct users to enable Transparent and Refresh on Update.
- JavaScript or TypeScript is acceptable; the assistant may choose based on the value of typing.
- Continue recording prompts, responses, evidence, and concise decision rationale.

## Display settings

| URL setting | User-defined meaning | Planned data source |
| --- | --- | --- |
| `head` | Opponent's skin head | MCHeads: `https://mc-heads.net/avatar/{uuid}/64`, including the skin's helm layer by default. Local fallback and background retries remain enabled. |
| `headToHead` | Player's W-D-L against this opponent | Current-season versus results, using ranked totals and UUID-keyed wins. |
| `wr` | Opponent's win rate this season | `100 * statistics.season.wins.ranked / statistics.season.playedMatches.ranked`; all matches, including draws, count in the denominator. |
| `elo` | Opponent's Elo rating and leaderboard rank | Opponent's `eloRate` and `eloRank` from the live profile. |
| `twitch` | Opponent's Twitch account name | Public Twitch connection from the opponent profile; validated opponent-specific live Twitch URL can be a fallback. |

The [official schema](https://github.com/MCSR-Ranked/api-docs/blob/master/openapi.yaml) defines profile connections as a map of objects with `id` and `name`, and permits null ratings and ranks. The exact Twitch connection behavior still needs a representative fixture; do not infer a Twitch account from the Minecraft username or mistake the other participant's stream URL for the opponent's. A missing public account is missing data, not proof the person has no Twitch account.

For valid versus data:

```text
wins   = results.ranked[selfUuid]
losses = results.ranked[opponentUuid]
draws  = results.ranked.total - wins - losses
display order = wins, draws, losses
```

For opponent win rate, use the opponent's overall current-season ranked statistics, not their head-to-head results against the configured player. For example, 6 wins, 2 draws, and 2 losses produce a 60% win rate. A zero match count or invalid aggregate produces an unavailable value rather than a fabricated percentage.

The rank is a leaderboard position, not an Elo tier. Handle a null rating or rank independently. Do not render either as zero. Do not issue extra profile requests solely for Elo when the live feed already contains the values.

Current-season behavior means the active season at use time, not a season number permanently embedded into the generated URL. Optional-stat caches must expire so a long-running overlay cannot indefinitely retain a previous season's statistics.

## Home-page streaming notice

Proposed visible copy:

> Only works when at least one player is streaming on Twitch with Public Stream enabled in MCSR Ranked. If neither player has a public stream, the overlay stays invisible.

Place this next to the setup introduction rather than only in an FAQ or tooltip. Also provide the documented prerequisites: link Twitch, make the connection public, enable Public Stream, and start streaming. This is the supported coverage requirement, not a guarantee of instantaneous API availability. The [endpoint definitions](https://docs.mcsrranked.com/assets/scripts/responses.js) describe those prerequisites.

## Architecture decision

Choose TypeScript with vanilla DOM code and CSS, with a small development/build toolchain producing static files. No UI framework or application backend is needed. The user explicitly delegated the JS/TS choice.

Rationale: typed URL configuration, nullable API fields, asynchronous opponent changes, and overlay states justify type checking. Keep runtime response validation as well: TypeScript cannot validate incoming JSON by itself. Dependency versions and build-tool configuration will be established during implementation, not guessed in this specification.

Retain the original module boundaries for configuration, API transport, polling, statistics, and rendering, using `.ts` source files. Final hosting provider remains unselected; generated output must work as a static site with a directly navigable opponent page.

The user subsequently requested implementation. The application is implemented locally; hosting and publication remain outside this turn's work.

## Transparency and lifecycle

Use transparent document and body backgrounds throughout the opponent page. The selected theme applies to the content only while an opponent is visible. On hide, remove the panel and every visible child, including backgrounds, shadows, placeholders, and status labels. Setup and diagnostics belong on the home page or an explicit preview, not on the idle in-game overlay.

On the first successful feed response with no usable match for the configured player, clear the opponent immediately with no additional grace period or fade-out. Cancel/invalidate in-flight detail requests so a late response cannot make the old opponent reappear.

An exact in-game completion instant is not observable from the documented public feed. The implementable behavior is immediate clearing once a fresh feed response no longer contains the match. Normal detection can still incur poll interval, API cache/publication delay, and network time. No unsupported end-of-match inference should be made from a timer or a split alone.

Retain a proposed five-second healthy poll cadence to leave room for the previously documented five-second API cache within an approximate ten-second detection goal. This is an engineering proposal, not a user-specified poll interval or hard timing guarantee. Healthy traffic is approximately 120 live calls per ten minutes, plus optional lookups. Explicit browser cache control remains necessary because of the headers observed during discovery.

For live-feed failures, the implementation uses the previously proposed three failed retries following the initial failed request, for four consecutive failed attempts total. This is an implementation default carried forward when the user said to implement, not a claim that the user separately selected the number. Reset the counter on a valid live response. Background recovery must continue while transparent: the hide threshold is not a limit on total attempts. Startup remains transparent until usable identity data arrives. A rate-limit response hides the card immediately during the shared cooldown to avoid retaining stale identity throughout a prolonged wait.

Use bounded exponential backoff with jitter for repeated failures, respecting readable server retry instructions and avoiding overlapping requests. A delay cap must not become an attempt cap. Return to the healthy polling cadence after recovery. Retry failed optional lookups while still relevant to the current opponent; invalidate them on an opponent change so recovery cannot restore stale data. Exact backoff timings remain implementation proposals.

Recommendation: optional profile, versus, or image failures affect their own fields rather than hiding a name supported by a healthy live feed. Missing public Twitch data is a normal absent field, not a transport failure. On an opponent change, clear all previous optional fields before starting new requests. Neither a failed request nor a malformed payload should produce invented statistics.

## Appearance

Dark amber remains the default. Additional user-requested options are Neon dusk (`neon-dusk`), Paper (`light`), and Clear (`transparent`); Forest (`forest`) is the additional scheme selected under the user's invitation. Theme tokens keep the layout consistent. Generated links carry the selection and original dark-amber links still work.

Clear removes the panel and visible borders, and outlines white text with dark shadows. The picker explains that contrast depends on the scene and recommends a solid theme if needed. It does not claim guaranteed accessibility over arbitrary gameplay. Every theme still hides fully when idle.

The main page's small text is approximately three pixels larger (with responsive adjustments). Overlay typography remains compact. Its metrics spacing was reduced by two pixels so the no-Twitch card fits the requested 140-pixel height.

The home page lists the three supplied Toolscreen dimensions and dynamically recommends a size: 170 pixels high when Twitch is enabled, 140 when any statistics are enabled without Twitch, and 76 for name/optional-head only. Width is 390 pixels throughout. For the usual opponent position, instructions specify Top Right (Screen), X -10, Y 215. Transparent and Refresh on Update should both be enabled. These instructions use the user's supplied values; an actual Toolscreen positioning test was not performed.

## Remaining decisions and verification

The user subsequently requested setup within one screen height. The home page now uses three columns on desktop: options, preview/generated link, and Toolscreen instructions. A short introduction, compact option rows, and small theme tiles replace the tall landing-page treatment. The streaming requirement, all toggles and themes, link controls, recommended size, all three size presets, position, and Toolscreen toggles remain in the essential workspace. Extra guidance and troubleshooting remain below. The implementation target is a 1280 × 720 CSS-pixel viewport at normal zoom; narrower screens and enlarged text can scroll naturally without fixed-height clipping.

The setup page now highlights one step at a time: username, Generate overlay link, Copy link, then the IN TOOLSCREEN panel. Focusing or entering the username advances to Generate. A successful lookup advances to Copy; failures keep the current actionable step. Successful clipboard copying (or manually copying the whole selected URL) advances to Toolscreen. Editing the username invalidates the link; changing options on a generated link highlights Copy again. Decoration uses a static amber glow and four small sparkles with one 4.8-second drift, disabled under reduced motion. It does not intercept clicks, move keyboard focus, or affect the opponent page.

The user resolved win-rate draw treatment (all matches count), confirmed continued background recovery, and requested implementation. Three retries after the initial failure is now the implemented default. The [follow-up record](ai/conversations/2026-09-17-winrate-and-recovery.md) preserves the earlier answer and the [implementation record](ai/conversations/2026-09-17-implementation.md) documents the resulting work.

Verified in headless Edge: real profile and live-feed CORS requests, generated links, responsive setup, toggles, match disappearance, transparent idle rendering, and recovery after repeated failures. The deterministic suite uses fixtures; a separate smoke test exercises the real public API.

Still unverified: behavior for a known name-hidden opponent, fresh CORS fetches inside Toolscreen, complete transparency in that embedded browser, exact match-end publication latency, and public Twitch connection examples. Not selecting a particular Toolscreen version does not remove the need for an eventual in-game check.

See the [initial feasibility report](ai/research/2026-09-17-feasibility.md) for API observations and the planned validation matrix.
