# Win rate and background recovery - 2026-09-17

## User prompt (verbatim)

> Winrate should count all matches.
> Let's keep retrying in the background if it fails for whatever reason.

## Request and response summary

The user confirmed that the opponent's win-rate denominator includes every current-season ranked match, including draws, and that failed requests should continue retrying in the background.

The assistant updated the current specification accordingly. Win rate is `100 * wins / playedMatches`, using the opponent's seasonal ranked profile statistics. For example, 6 wins out of 10 matches is 60%, including when some matches are draws. A zero denominator remains unavailable.

Background retries continue while the overlay is loaded, including after it becomes transparent, and recover automatically when valid data becomes available. Recommended bounded backoff and cancellation of obsolete opponent lookups prevent excessive traffic and stale rendering. Hiding the overlay must not stop recovery.

The user did not select a numerical retry threshold for hiding. The earlier suggestion of three retries after the initial failure remains a proposal; this answer is not recorded as approving that number. No repeated clarification question was sent this turn.

## Changes and validation

- Updated [the specification](../../specification.md) to replace the unresolved win-rate question and distinguish the visibility threshold from unlimited background recovery attempts.
- Added this prompt/response record and linked it from [the index](../README.md).
- Documentation-only change; no application code, network probes, dependencies, or deployment changes.
- Local Markdown links and code-fence balance passed validation across all six Markdown files under `docs/`.
