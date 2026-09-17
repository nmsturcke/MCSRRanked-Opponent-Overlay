# Initial project discussion — 2026-09-17

Status: research and proposal delivered; user choices pending. This is a record of the project prompt and a summary of the response, not a transcript of internal reasoning or every tool call.

## User prompt (verbatim)

> This is a project that will be used by MCSR Ranked Players. MCSR Ranked is Minecraft Speedrunning Ranked, a mod within Minecraft that allows you to 1v1 Speedrun aganist others. Most players use Toolscreen, a Minecraft "addon" that allows for many features to be added onto Minecraft. One of those features, and what matters to us, is a Browser overlay; IE any website can be embedded on top of their Minecraft client so they can see while playing.
>
> MCSR Ranked has an option to hide your name from your opponent. However, this is a paid-feature and many Pro Speedrunners are against it. I am too. MCSR Ranked (which from now on I'm going to call MCSRR for simplicity) also has an API which allows us to view the opponent of each live match.
>
> This project will make use of both of the above and create:
>
> 1. A "home screen" with a set-up page, which asks for the player's Minecraft username and maybe also gives a variety of settings available, such as viewing their W-L against their opponent, their opponent's head, etc. Once they have selected these options, it generates a URL, say: domain.com/opponent?user=Nickyux&headtohead=true&wr=false&head=false - This is the URL they will put into toolscreen to view their opponent when they come up
> 2. The /opponent page, or whatever endpoint we want to set it at; which is what will appear on their screen. This will have a minimal design, based on their settings, and just call the MCSRR API to fetch if they're in a match and, if they are, their opponent; showing what they have selected it to show.
>
> This project does not need a backend. The MCSRR API is open and can be called without Authorization keys, so I was planning on doing everything client-side.
>
> I was thinking of just using vanilla HTML/JS/CSS, but I'm not sure if maybe a slightly more complex framework is required. I would not say so, but maybe it would allow for better code readability or expansion in the future.
>
> First I want you to consider the prompt and the project, and whether my reasoning and thought process is lacking in any aspect. Is there something I'm missing? Is there something that will not work as I have described it to? Then, investigate the MCSRR API and search what Endpoints we'll need to call to make thi work.
>
> Come back with a detailed implementation of specifics, along with any questions or things that I may not have been specific on. Do not make assumptions unless I have explicitly said to.
>
> I also want all LLM's reasoning to be documented, so once you have come back with this, create a directory where you will document this conversation and any other prompts and include a summary of what has been prompted and how you replied.

## Request summary

Assess a static Toolscreen opponent overlay, investigate the real API and endpoints, propose a detailed implementation without silently choosing unspecified behavior, ask outstanding questions, and establish ongoing conversation records.

## Assistant response summary

- Recommended vanilla HTML/CSS/JavaScript modules for the two-page application. Optional build tooling can be chosen later; a framework is not needed for the requested UI.
- Identified the main feasibility gap: `/live` is documented for public-stream matches. Universal ranked-match coverage and exposure of name-hidden opponents are not established.
- Distinguished `/users/{identifier}/live`, which is documented for private-room hosts/co-hosts and requires a private key.
- Successfully probed the public live feed, the user's profile, historical matches, and one versus response. CORS wildcard headers support the client-only approach for those requests, subject to browser/Toolscreen testing.
- Identified a cache discrepancy: sampled HTTP responses advertised four hours while documentation describes a five-second API cache. Proposed explicit browser cache handling and actual embedded-browser verification.
- Specified conditional endpoint flow, UUID matching, optional stat loading, state handling, polling/backoff, stale-request protection, URL configuration, static routing, and statistics semantics in the linked research report.
- Kept feature choices, stats scope, draw handling, idle/error UI, acceptable latency, hosting, and tooling unselected.
- Explained that documentation can include evidence, conclusions, and concise rationale, but not private internal model reasoning.

Full proposal: [API feasibility and implementation plan](../research/2026-09-17-feasibility.md).

## Clarification prompts sent during research

1. Whether non-streaming matches must be supported or public-stream coverage is sufficient for v1.
2. Required v1 fields, the meaning of `wr`, season versus lifetime scope, perspective, and treatment of draws.
3. Behavior when no match is visible or the API fails, acceptable detection delay, Toolscreen version, and preferred hosting.

Additional questions are listed in the proposal. No answers had arrived when this record was written; recommendations are not recorded as user approvals.

## Work and validation

- Repository initially contained only Git metadata and no tracked project files.
- Reviewed official API documentation, its dynamically loaded endpoint definitions, the official OpenAPI schema, browser cache/CORS documentation, and a possible avatar provider.
- Initial shell network access failed inside the sandbox. Escalated read-only requests then succeeded.
- One documentation substring extraction failed because the current source's endpoint key differed from the cached version. A later targeted extraction successfully verified the current live-feed and private-room wording.
- No application code, dependencies, runtime tests, browser tests, deployment, private-key access, or controlled anonymous-opponent test was performed.
- Created root `AGENTS.md`, the documentation index, this conversation record, and the detailed research report. These instructions support future logging but do not constitute an automatic transcript recorder.
- Checked all local Markdown links and code-fence balance in the four documentation files; checks passed. Git status showed only the new documentation and agent instructions.
