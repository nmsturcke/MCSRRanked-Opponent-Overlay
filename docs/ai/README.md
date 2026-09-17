# Project discussion and decision records

This directory implements the user's request to document project conversations and subsequent prompts. It records the information needed to understand decisions: requirements, evidence, recommendations, concise rationale, answers, and open questions. It does not contain private internal model reasoning.

## Structure

- `conversations/`: dated prompt records and summaries of assistant responses; record follow-up answers as they arrive.
- `research/`: dated investigations and proposed implementation details, with source links and verification limits.

Use `YYYY-MM-DD-short-topic.md` filenames. Add a numeric suffix when needed. Preserve earlier decisions and explicitly record later changes. A prompt may be quoted verbatim or clearly labeled as a summary; never describe a summary as an exact transcript. Redact secrets if a later prompt contains them.

For each substantive turn, record the request, response summary, confirmed decisions, unresolved questions, files changed, and checks performed. Record failed or incomplete checks when they affect the conclusion. Root `AGENTS.md` directs future repository agents to maintain these records; there is no automatic capture service.

## Current records

- [Current v1 specification](../specification.md)
- [Roomier 2xl spacing](conversations/2026-09-17-2xl-spacing.md)
- [Header spacing and taller swatches](conversations/2026-09-17-spacing-and-swatches.md)
- [MCHeads provider switch](conversations/2026-09-17-mcheads.md)
- [Compact setup layout](conversations/2026-09-17-compact-setup.md)
- [Guided setup highlights](conversations/2026-09-17-guided-setup.md)
- [Appearance and Toolscreen setup](conversations/2026-09-17-appearance-and-toolscreen.md)
- [Initial implementation](conversations/2026-09-17-implementation.md)
- [Win rate and background recovery](conversations/2026-09-17-winrate-and-recovery.md)
- [Confirmed scope and behavior](conversations/2026-09-17-scope-confirmation.md)
- [Initial project discussion](conversations/2026-09-17-project-discovery.md)
- [API feasibility and proposed implementation](research/2026-09-17-feasibility.md)
