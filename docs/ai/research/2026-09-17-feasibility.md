# MCSRR opponent overlay: feasibility and proposed implementation

Research date: 2026-09-17. Status: investigation and proposal; application implementation has not started. Product decisions below remain open unless identified as user requirements.

Follow-up: the user subsequently resolved scope, feature definitions, season, transparency, latency tolerance, appearance direction, and language discretion. See the [current v1 specification](../../specification.md) and [scope confirmation record](../conversations/2026-09-17-scope-confirmation.md). This report preserves the original investigation; its open-question list is historical and does not override those later answers.

## Conclusion

A small static application suits the setup page and overlay. Vanilla HTML, CSS, and JavaScript modules are sufficient. The main constraint is live data availability: the documented public feed covers matches with public streams, and is not documented as a complete list of ongoing ranked matches. Consequently, the requested username-only experience for every player is not established by the available API.

The API documentation also does not establish whether an opponent using name hiding will retain their real username and UUID in this feed. Seeing ordinary names in sampled responses does not answer that question. A controlled test with known name-hiding settings is required before promising that central behavior.

A backend or frontend framework cannot recover match identities that the upstream service does not provide. If universal coverage is mandatory, the next dependency is a supported source of that data or a change in project scope.

## Explicit user requirements

- A setup page accepts the player's Minecraft username and selectable display settings.
- It generates a URL that can be pasted into a Toolscreen browser overlay.
- The overlay identifies the opponent during a match and displays selected information with a minimal design.
- Potential settings include head-to-head W–L and the opponent's head. The example includes `wr`, whose meaning is not yet specified.
- The intended architecture has no application backend and uses the public MCSRR API.
- Investigate feasibility and provide implementation specifics before building the application; do not silently assume missing requirements.
- Maintain project prompt/response documentation.

## Evidence and its limits

### Documented API behavior

The [official API documentation](https://docs.mcsrranked.com/) gives a 500-request/10-minute limit and recommends `https://api.mcsrranked.com`. It describes a five-second cache there and a thirty-second cache at the alternate host. The rate-limit grouping mechanism is not specified on that page.

The [endpoint documentation source](https://docs.mcsrranked.com/assets/scripts/responses.js) describes `/live` as matches with public streams. Publishing a stream requires linking Twitch, making that connection public, enabling Public Stream, and streaming. `/users/{identifier}/live` requires a `Private-Key` and private-room host/co-host status; it is not a documented general ranked-queue lookup.

The same endpoint documentation describes versus results as total matches plus per-UUID wins, defaults the season to the current season, and documents a no-history response. It also says only public-stream players appear in the live player array. Actual samples included opponents with null stream URLs, so that wording cannot be used to guarantee exactly which participants will appear.

The [official OpenAPI schema](https://github.com/MCSR-Ranked/api-docs/blob/master/openapi.yaml) provides endpoint and object structure, but does not establish universal feed coverage or name-hiding behavior.

### Direct HTTP observations

Read-only requests were made without authentication, with `Origin: https://overlay.example`. These are observations from 2026-09-17, not permanent guarantees:

| Request | Observed result |
| --- | --- |
| `GET /live`, 10:03:33 UTC | HTTP 200; success envelope; 907 connected players reported; 15 visible matches; every visible match had at least one non-null stream URL. |
| `GET /live`, 10:04:49 UTC | HTTP 200; 906 connected players; 15 visible matches; every match again had a stream URL; response content changed. |
| `GET /users/Nickyux` | HTTP 200; returned nickname, UUID `7a349920e0ab4f658431fcaefcbf27be`, and statistics. |
| `GET /users/Nickyux/matches?count=1&type=2&excludedecay=true` | HTTP 200; returned a historical ranked match used only to identify a real pair for testing the versus endpoint. |
| `GET /users/Nickyux/versus/thienlam` | HTTP 200; ranked total 1; Nickyux wins 1; opponent wins 0. This is a historical example, not a current opponent identification. |

All sampled API responses included `Access-Control-Allow-Origin: *` and `Cache-Control: max-age=14400`. The first live and profile responses also showed the same rate-limit partition with the remaining count decreasing from 499 to 498. This supports budgeting those requests together, but does not prove whether the partition is IP-based.

The first and second live responses had different ETags and content. This proves change over the sampled interval, not a five-second freshness guarantee. The online-player count is not a count of players currently in matches and cannot establish how many matches were omitted.

The inspected live/history headers did not include `Access-Control-Expose-Headers`. Browser code must not depend on reading custom rate-limit headers; use HTTP 429 and a fallback delay if retry information is inaccessible.

These probes ran through PowerShell, not through a browser or Toolscreen. The successful CORS headers support ordinary credential-free browser requests, but end-to-end browser behavior, embedded-browser caching, transparency, and background timers remain untested.

No probe used a private key. No controlled anonymous-opponent test was performed. No complete match lifecycle was observed.

## Endpoint plan

Use `https://api.mcsrranked.com` as the proposed API base. Validate both HTTP status and the JSON success/error envelope.

| Need | Request | Proposed use |
| --- | --- | --- |
| Resolve configured player | `GET /users/{identifier}` | At setup validation and overlay initialization; obtain UUID and canonical nickname. |
| Discover visible opponent | `GET /live` | Poll and search `data.liveMatches` for the configured UUID. |
| Head-to-head | `GET /users/{selfUuid}/versus/{opponentUuid}` | On opponent discovery if enabled; use `data.results.ranked` for ranked W–L. |
| Opponent statistics | `GET /users/{opponentUuid}` | If additional profile statistics are enabled; avoid fetching just to repeat live-feed fields. |
| Historical versus details | `GET /users/{selfUuid}/versus/{opponentUuid}/matches` | Optional future detailed history; unnecessary for basic W–L. |
| Available historical seasons | `GET /users/{identifier}/seasons` | Investigate only if lifetime head-to-head is required. |

The endpoint routes and available query parameters are listed in the [OpenAPI specification](https://github.com/MCSR-Ranked/api-docs/blob/master/openapi.yaml). Ordinary match-history endpoints are not a substitute for live discovery.

For an optional head image, a candidate is `https://crafatar.com/avatars/{uuid}?size=64&overlay`; [Crafatar documents this interface](https://crafatar.com/). Provider choice and flat avatar versus rendered 3D head remain open. Load an image only when enabled, cache normally, and use a local fallback on failure.

## Proposed architecture

Recommendation: two static HTML entry points with shared JavaScript modules and CSS. A framework is not necessary for a form, a small overlay, and a polling controller. Readability comes from separating responsibilities and representing states explicitly.

Plain JavaScript with JSDoc is a suitable baseline. TypeScript and a build tool are an optional alternative if preferred for maintainability; they do not require a deployed backend. No package or framework has been chosen or installed.

Suggested layout, not yet created:

```text
index.html
opponent/index.html
src/
  setup.js
  opponent.js
  config.js
  api.js
  live.js
  stats.js
  render.js
styles/
  setup.css
  opponent.css
assets/
  avatar-fallback.svg
tests/
  fixtures/
docs/ai/
```

`config.js` owns URL parsing and validation. `api.js` owns transport, envelope validation, timeouts, and error classification. `live.js` owns polling and visibility state. `stats.js` owns numerical transformations. `render.js` owns DOM changes and can be shared with a setup preview.

Serve over HTTPS. A real `opponent/index.html` supports a directory-style `/opponent/` URL on a compatible static host. Final routing, redirects, base paths, and deployment configuration depend on the chosen host; no particular provider is assumed.

## Setup and URL contract

Proposed flow:

1. Accept and validate the username; fetch its profile only on deliberate validation, not every keystroke.
2. Confirm the returned account so a typo does not silently configure someone else.
3. Present the agreed settings with clear stat labels and a preview using explicitly labeled sample data.
4. Generate a complete URL with `URL` and `URLSearchParams`; provide copy and open-preview actions.
5. Explain the public-feed coverage limitation and the agreed Toolscreen setup procedure.

The existing `user`, `headtohead`, `wr`, and `head` names are examples, not an approved final contract. Recommendation: include a configuration version and resolved UUID so links survive username changes. For example, a future URL could use `v=1`, `uuid=...`, and explicit display toggles. Do not decide the meaning of `wr` or omitted parameters without user input.

All settings needed by Toolscreen should travel in the URL. Do not depend on browser local storage being shared with Toolscreen. A pasted URL is a configuration snapshot; subsequent edits in the setup page will require a new URL unless another persistence mechanism is deliberately added.

Reject malformed supported values with an actionable configuration message. Parse boolean values explicitly; the string `false` must not become truthy. Decide and version defaults before release. Do not place private keys in links. Treat external names as text with `textContent`; do not inject API content as HTML.

## Runtime behavior

The following algorithm is proposed for matches that the public feed exposes:

1. Parse configuration and resolve/validate the selected account.
2. Fetch the public live feed and normalize UUIDs for comparison.
3. Find entries containing the configured UUID. Render only when there is exactly one usable match with exactly two distinct participants and one unambiguous opponent. An incomplete or ambiguous response is unavailable data, not a reason to guess.
4. Render available identity immediately. Retrieve optional head-to-head and profile statistics independently, so their failure cannot erase a valid name.
5. Continue live polling. On an opponent change, clear previous optional fields immediately, cancel obsolete requests, and reject responses whose generation no longer matches the current opponent/session.
6. On a successful feed response without the player, enter `not-visible`. This does not prove that the player is offline or out of a match.
7. On a timeout, failed request, or invalid payload, enter a separate error/stale state. Never convert an API error into “not playing” or a zero record.

Suggested states: `initializing`, `invalid-config`, `not-visible`, `opponent-visible`, `partial-data`, `stale`, and `rate-limited`. Whether these states display text or become transparent is a user decision.

The public live schema lacks a reliable match ID and explicit lifecycle status. Comparing participants cannot distinguish consecutive games against the same opponent. A timer regression or disappearance/reappearance can prompt a stats refresh, but is only a heuristic. Use bounded stats-cache lifetimes as well; do not key them permanently by opponent alone. Exact end-of-match behavior cannot be promised from this feed.

Use transparent `html` and `body`, no page margins or scrollbars, and bounded text/image layout for the overlay. Font, size, background, layout, and Toolscreen positioning controls remain to be chosen. Test long names and missing avatars. No live progress or split information is required by the user's requested scope.

## Polling, cache handling, and recovery

Proposed starting interval: five seconds, subject to the user's acceptable detection delay. One such loop issues about 120 live requests per ten minutes, before profile/stat requests. A one-second loop would issue about 600, exceeding the documented 500 limit. Multiple tabs or overlays add traffic; the rate-limit grouping needs confirmation before estimating shared-network capacity.

Use an async loop that schedules the next request after completion, rather than overlapping requests with `setInterval`. Use an abortable timeout, jittered exponential error backoff, and one controller per page. For 429 responses, honor retry instructions if readable and otherwise wait conservatively. Do not automatically rotate hosts to evade a limit.

The observed four-hour HTTP cache lifetime can cause a naive browser poll to reuse old JSON. Recommendation: use `fetch(url, { cache: "no-store", credentials: "omit", signal })` for freshness-sensitive API reads, while controlling optional-stat caching in application memory. The [browser cache-mode documentation](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache) explains that `no-store` avoids reading and updating the browser HTTP cache. It does not guarantee bypassing upstream caches or instant API publication. Verify this behavior in Toolscreen before release.

Do not add arbitrary timestamp parameters on every request unless subsequent evidence shows a need. Keep the provider's intended shared caching effective where possible. Set a maximum age for treating identity as current; its duration and visible stale treatment need user input. A successful HTTP response alone does not prove the upstream match snapshot is fresh.

Test background/hidden behavior in the actual embedded browser before deciding to pause on `document.hidden`: the page may still be in use by the game. Recover after connectivity loss and machine sleep without creating duplicate loops.

## Statistics semantics

For a valid sampled versus response, let `r = data.results.ranked`:

```text
W = r[selfUuid]
L = r[opponentUuid]
D = r.total - W - L
```

Validate the numeric fields and the consistency of the total. The formula presents W–L from the configured player's perspective; that perspective is a recommendation awaiting confirmation. Do not turn missing or malformed data into zeros. Handle an explicitly recognized no-history response separately from an outage; a first-match fixture still needs verification.

Possible win-rate definitions are `W / (W + L)` excluding draws or `W / total` including them in the denominator. A zero denominator should display an agreed unavailable state. Neither formula is selected yet. An opponent's overall rate and the configured player's rate against that opponent are different statistics and require different labels.

Direct profile responses contained `statistics.season` and `statistics.total`, including `wins.ranked`, `loses.ranked` (the API's spelling), and `playedMatches.ranked`. Use those aggregates if overall profile stats are requested; validate their semantics rather than infer completion rate from win rate.

The versus endpoint's current-season default is documented. Lifetime versus aggregation has not been verified. Do not invent `season=all` or assume `season=0` means lifetime. If lifetime W–L is required, first establish a supported aggregate or verify enumeration and combination of relevant seasons, including completeness, caching, and request cost. Do not present a single page of recent matches as lifetime history.

## Validation before application release

The next implementation milestone should establish data feasibility before visual polish:

- Observe a known ranked match with public streaming and verify both participants appear.
- Repeat with name hiding enabled on a known opponent; compare the returned UUID and nickname against the known account.
- Observe a match where neither player streams and record whether it appears. Obtain authoritative clarification if universal coverage is required.
- Observe queueing, generation, start, finish, and rematch timing; measure actual detection latency.
- Test cross-origin fetch, fresh responses, transparent rendering, and continued polling in the selected Toolscreen version.

Once implementation begins, focused fixture tests should cover own-player position reversal, malformed/incomplete participants, no match visible, no previous head-to-head, draws, null ratings, unknown stats, timeouts, 429s, and an old opponent's delayed response. Integration checks should include direct navigation to the generated URL and recovery after a disconnect. These are planned checks, not completed tests.

## Open questions

1. Must it work when neither player is streaming, or is public-stream coverage sufficient for v1? Is another supported data source available?
2. Which fields are required for v1? What does `wr` mean? Is head a flat face or 3D render?
3. Are stats current-season or lifetime? Should W–L be shown from the configured player's perspective, and how should draws affect percentages?
4. Should an unseen match produce complete transparency or a status label? How should API failure and stale data look?
5. What detection delay is acceptable, and when should the overlay disappear after a match?
6. Which Toolscreen version and hosting provider should be targeted? Are there desired dimensions, colors, and font choices?
7. Is build tooling/TypeScript welcome, or is a directly editable no-build JavaScript project preferred?

No answer to these questions has been assumed. The first three grouped clarification prompts were sent during this investigation; answers should be appended to the conversation record when received.
