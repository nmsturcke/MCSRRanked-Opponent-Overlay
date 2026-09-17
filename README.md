# Opponent — MCSR Ranked overlay

> This *should* be pretty obvious, but this has been pretty much entirely vibe-coded. I just had the idea and asked Codex to do it. There's a transcript and log of all conversations in the [docs](docs/) directory.

> [!NOTE]
> There is a public instance of this running on https://mcsr-opponent.nickyux.com/

A static setup page and a transparent Toolscreen browser overlay, built with vanilla TypeScript and CSS. No application server, login, or API key is required.

**At least one player must be streaming on Twitch with Public Stream enabled in MCSR Ranked.** The public feed does not expose every match. Whether a name hidden in-game is returned depends on the API; this project cannot supply identities absent from it.

## Run locally

Use Node.js 22.12+ on the 22.x LTS line, or Node.js 24+.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, enter your Minecraft username, select fields, and generate a link. Paste it into a Toolscreen browser overlay and enable **Transparent** and **Refresh on Update**. When using a local URL, keep the local server running.

The preview uses a fictional player and sample statistics. It makes no API requests until you validate a username. All five fields are enabled initially and can be switched off individually. Settings are explicit in the generated URL; changes require copying the updated URL into Toolscreen.

A soft highlight guides you from the username field to Generate, Copy, and the Toolscreen settings. Small sparkles drift briefly when the highlight moves; reduced-motion preferences keep them still. Changing a generated link highlights Copy again.

Desktop setup uses three compact columns for options, preview/link, and Toolscreen instructions. Essential setup is designed to fit a 1280 × 720 viewport at normal zoom; smaller screens and enlarged text reflow with natural scrolling. Additional help remains below the workspace.

## Fields and URL

| Parameter | Meaning |
| --- | --- |
| `user` | Minecraft username, used for resolution if no UUID is supplied |
| `uuid` | Stable account UUID; generated links include it to survive renames |
| `head` | Opponent skin head, supplied by MCHeads |
| `headToHead` | Your current-season ranked W–D–L against the opponent |
| `wr` | Opponent's seasonal ranked wins / all seasonal ranked matches, including draws |
| `elo` | Opponent's Elo rating and leaderboard position |
| `twitch` | Opponent's public Twitch account name, when available |
| `theme` | `dark-amber`, `neon-dusk`, `light`, `transparent`, or `forest` |
| `v` | Configuration version, currently `1` |

Flags take literal `true` or `false`. The original `headtohead` spelling is also supported. Unsupported versions, invalid values, or ambiguous configuration remain transparent; create a corrected link on the home page. Names and other API text are rendered as text, never HTML.

Example:

```text
/opponent/?v=1&user=Nickyux&head=true&headToHead=true&wr=true&elo=true&twitch=false&theme=dark-amber
```

## Appearance and Toolscreen settings

The home page previews each theme and includes it in the generated URL:

- **Dark amber**: charcoal with warm orange.
- **Neon dusk**: dark purple with bright blue and pink accents.
- **Paper** (`light`): light gray with dark text.
- **Clear** (`transparent`): no panel or visible border; white text with a dark outline/shadow. Readability depends on the gameplay behind it; use a solid theme when more contrast is needed.
- **Forest**: deep green with mint accents.

All themes become completely invisible while idle. The home page's larger text does not enlarge the in-game overlay.

Set the browser overlay dimensions in Toolscreen as follows:

| Layout | Width | Height |
| --- | --- | --- |
| Full, with Twitch | 390 | 170 |
| Full, without Twitch | 390 | 140 |
| Slim | 390 | 76 |

For slim, disable Head to head, Win rate, Elo & rank, and Twitch; the head is optional. The home page recommends a size based on the enabled fields, reserving space for Twitch even when that opponent's channel is unavailable.

To match the usual MCSR Ranked opponent position, set **Relative to: Top Right (Screen)**, **X: -10**, and **Y: 215**. Enable **Transparent** and **Refresh on Update** for every theme. These placement values were supplied by the user; actual in-game placement still depends on the Toolscreen setup.

## Lifecycle and recovery

- The live feed is polled every five seconds after the previous request finishes. API caching and network time add latency; ten seconds is an approximate healthy target, not a guarantee.
- The overlay clears on the first successful response without an unambiguous two-player match for the configured account. It cannot detect the exact in-game finish before the feed updates.
- After the initial failed live request plus three failed retries, the entire card becomes transparent. A rate-limit cooldown hides it immediately rather than retaining an unverifiable opponent for a prolonged delay.
- Retries continue while the page remains loaded, with jittered exponential backoff capped at one minute. Server retry instructions can extend that wait. There is no maximum attempt count.
- Optional statistics are fetched independently, refreshed at least once per minute during healthy polling, and retried on failure. Missing stats display `—`; a missing public Twitch name is omitted. Failed head images use a bundled fallback and retry.
- Opponent changes and disappearing matches invalidate pending requests. Timer regressions can trigger a same-opponent refresh, but the public feed does not provide a reliable live match ID.
- HTTP reads use `cache: "no-store"` to avoid the unexpectedly long browser-cache lifetime observed during research. This does not bypass the provider's own publication/cache delays.

## Build and host

```sh
npm run build
npm run preview
```

Publish the **contents of `dist/`** to an HTTPS static host. The build contains `index.html` and `opponent/index.html` and uses relative assets, so it can be hosted at a domain root or under a directory. Configure the host to serve directory index files and redirect `/opponent` to `/opponent/` if necessary. No server-side functions or SPA fallback are needed.

Use the home page on the deployed host to generate production links. A localhost link only works on the computer running the local server. No deployment is configured or performed by this repository.

Browser clients contact `api.mcsrranked.com`; enabled head images contact `mc-heads.net`. The app includes no analytics, cookies, or account storage. It does not share local storage between the setup browser and Toolscreen.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run test:browser
```

The browser suite launches headless Microsoft Edge against the production build on a dedicated local port and uses mocked API responses. On a machine without Edge, install a Playwright browser and select it:

```sh
npx playwright install chromium
```

Then set `PLAYWRIGHT_CHANNEL=chromium` in your shell before running `npm run test:browser`. Browser screenshots and failure traces are written to ignored `test-results/` files. The test server refuses to reuse an unrelated server on its port.

Unit tests cover configuration, API validation, statistics, timeouts, stale responses, match changes, retry recovery, rate limits, and request cancellation. Browser tests cover setup, clipboard, responsive layout, transparency, and recovery without reloading. Actual Toolscreen behavior and a known name-hidden match still require an in-game check.

An additional real-API smoke test is opt-in: set `LIVE_API_SMOKE=1` and run `npm run test:browser -- live-api.spec.ts`. It makes two public requests from the browser and can fail during an upstream outage. The ordinary test suite skips it.

## Project records

- [Current specification](docs/specification.md)
- [Conversation records and research](docs/ai/README.md)
- [Official Ranked API documentation](https://docs.mcsrranked.com/)
- [MCHeads avatar API](https://mc-heads.net/)
