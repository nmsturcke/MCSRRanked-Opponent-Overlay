# Scope confirmation - 2026-09-17

## User prompt (verbatim)

> 1. No, you're right. It does only work if at least one of the players is streaming; so let's make sure that is obvious in the home page.
> 2. head: show the head (of the skin) of the opponent (we would probably need another API for this), headToHead: show the head to head W-D-L of the player against that opponent, wr: the opponent's winrate this season, elo: the opponent's elo (eloRate & eloRank), twitch: the opponent's Twitch account name
> 3. Current season
> 4. Yes. Transparency is very important. If API fails we should try again, if after X retries it doesn't work, let's just go transparent.
> 5. The previous opponent should disappear as soon as the match is over. 10 second detection delay is acceptable.
> 6. I don't think Toolscreen versions change much. We can also make an option for appearance which implements different colour schemes. Let's just have a dark one with high-contrast text (maybe orange), but not too distracting to the eye
> 7. JS is fine, TS is also fine if you consider typing is worth it

## Response summary and decisions

- Recorded the public-stream limitation as accepted scope and required prominent home-page copy.
- Defined all five toggles and current-season statistics, preserving the requested W-D-L order and configured player's perspective.
- Recorded full idle transparency, retry-then-hide behavior, the ten-second detection tolerance, and immediate clearing when disappearance is observed in the API.
- Explained that exact in-game match-end clearing cannot be guaranteed by polling the public feed.
- Selected vanilla TypeScript under the user's delegated language choice, for configuration, nullable data, and asynchronous state typing. No UI framework or backend is needed.
- Recorded the initial dark/orange appearance direction with room for future schemes.
- Asked whether draws count in opponent win rate and how many retries should precede transparency; proposed three retries after the initial failure and continued background recovery. No answer was assumed when this record was written.
- Clarified in the specification that Twitch information depends on available public data and must not be inferred from a Minecraft username.

## Changes and validation

- Added the [current specification](../../specification.md).
- Added this conversation record and linked both files from the documentation index.
- Marked the initial research report's open decisions as historical where superseded by the follow-up.
- Rechecked the official OpenAPI definitions for public profile connections and nullable Elo fields. No new live API probe or Toolscreen test was performed.
- Local Markdown links and code-fence balance passed validation across all six documentation/instruction files.
- Application code, dependencies, hosting, and deployment are unchanged; this turn refines the requested planning work.

These records contain concise rationale and evidence, not private internal model reasoning.
