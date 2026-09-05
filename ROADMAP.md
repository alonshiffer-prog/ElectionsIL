# ElectionsIL roadmap to MVP

## How to use this roadmap

This roadmap is a prioritized bridge from the repository snapshot audited on **2026-09-05** to the MVP in `PRODUCT_SPEC.md`. It is not a claim that a checked box remains healthy forever. A Lead Engineer should update milestone status and evidence as work lands; an independent Reviewer should verify the stated outcomes rather than accepting feature presence alone.

Do not mix live news/poll edits into roadmap implementation PRs unless the PR is explicitly a reviewed data change. Every milestone inherits the no-fabrication, attribution, copyright, neutrality, test/build, branch/PR, and no-auto-merge rules in `AGENTS.md`.

## Current-state audit

### Working capabilities

- **Static Hebrew RTL site:** React/Vite renders a responsive single-page dashboard from committed JSON. Hash navigation exposes news, polls, parties/people, and methodology without a backend.
- **News browsing:** source-attributed story cards retain direct original links, author when supplied, timestamps, categories, and explicitly labeled RSS excerpts. Search plus source/category filters and honest empty/no-results states exist.
- **Safe baseline ingestion:** six enabled sources are configured. Fetches have a hard timeout and bounded concurrency; one feed failure does not stop the rest; HTML is stripped; excerpts are capped; items are deduplicated by URL and sorted; existing stories from failed sources are protected. If every feed fails, the data file is unchanged and the command fails rather than generating fallback news.
- **Initial automated verification:** four ingestion tests cover timeout, partial concurrency/failure, retention under the item cap, and all-source failure. Basic JSON/news validation and a production build run in PR CI.
- **Reproducible dependency installation and stronger validation:** direct dependencies are pinned in a committed lockfile and workflows use `npm ci` on Node.js 22. Publication validation now checks source/news/poll structures, types, safe URLs, dates, uniqueness, source references, RSS excerpt provenance/length, store limits, and poll seat vectors. Ingestion also rejects malformed items independently, generates stable URL-derived identifiers, validates before publishing, and replaces the news file atomically.
- **Automation and delivery:** a scheduled/manual workflow attempts ingestion every three hours at minute 17, validates and commits changed news; pushes to `main` and successful update runs trigger a validated GitHub Pages build/deployment. Recent repository history shows roughly three-hour data commits in the currently inspected period.
- **Trust-oriented scaffolding:** the UI and README state independence/neutrality, identify RSS excerpts, avoid fabricated seeded news/polls, link corrections to GitHub Issues, and reserve separate treatment for future poll averages and coverage comparison.

### Confirmed gaps and weaknesses

- **Severe source concentration:** the audited `public/data/news.json` has 110 stories—108 ynet and two BBC News—even though six feeds are enabled. Four configured sources contribute no retained stories. This confirms the live snapshot is overwhelmingly dominated by ynet with only limited BBC content; it does not by itself distinguish endpoint failure from zero election-relevant matches.
- **Feed health is not durable:** fetch failures appear only in ephemeral logs. There is no stored last success/error, HTTP/parse status, item/relevant count, retry/backoff, concentration metric, stale threshold, or alert. Broken, incompatible, redirected, blocked, or simply irrelevant feeds cannot be distinguished from the published dataset.
- **Schedule reliability is not monitored:** the cron exists and recent commits show current activity, but GitHub schedules are not guaranteed timers and the project has no missed-run detector or freshness alert. The reported history that scheduled updates have not always fired reliably cannot be proven or disproven from workflow YAML alone; it must be treated as an operational risk until monitored over an agreed window.
- **Broad relevance and simple classification:** a single regular expression accepts generic election terms, allowing foreign-election or incidental stories. First-match keyword categories default to “parties.” There is no representative quality corpus, confidence, review queue, or explanation per item.
- **Weak normalization:** deterministic URL-derived IDs are now unique, but deduplication remains exact-URL only; feeds can produce URL variants and syndication duplicates. Entity arrays and clusters are empty in the audited dataset, so party/person filtering and comparison are mostly scaffolding.
- **Incomplete poll product:** the poll store has party names but no polls, ingestion/provenance workflow, complete schema, validation, accessible table, or average implementation.
- **Static profiles:** party names/leaders/colors live in `src/main.jsx` without citations, stable entity IDs, “as of” dates, maintenance source, or complete person pages. Such facts can age silently.
- **UI reliability/accessibility:** loading has no explicit fetch-error path; the green automatic-update badge reflects a label rather than measured health. Charts lack equivalent tables, and no automated accessibility or browser smoke tests exist. RTL/mobile CSS exists but has no documented cross-browser/assistive review.
- **Validation/testing gaps:** structural publication validation now covers the current source, news, and poll files and focused tests exercise key invalid boundaries. Versioned standalone schema documents, health/entity schemas, component/end-to-end tests, and broader updater normalization/classification cases remain absent.
- **Reproducibility/maintenance debt:** dependencies and transitive resolution are now locked and workflows use `npm ci`, but Actions remain version tags rather than pinned commits. Source, entity, methodology, and incident ownership are undocumented.
- **Workflow/data risks:** scheduled runs still commit directly to the checked-out branch with write permission, although serialized runs and a pre-push rebase now reduce update/update and update/human races. Deployment has overlapping triggers and no end-to-end post-deploy health check or documented rollback. Routine generated commits can obscure operational failures and concurrent edits to publication data can still require manual recovery.

### Audit limitations

- This audit inspected all tracked project code, workflows, tests, configuration, schemas/data shape, current source distribution, and recent Git history. It did not alter election/news data.
- A local feed probe could not reach any configured endpoint from the execution environment, so it is not evidence that all feeds are externally down. GitHub Actions run history and Pages settings were unavailable in the checkout. Source repair must use workflow logs and verified publisher endpoints in an environment with network/repository access.

## Milestone 0 — Agree on policy and measurable acceptance gates (P0)

**Goal:** remove the few decisions an autonomous engineer must not guess.

### Outcomes

- Owner approves source inclusion/exclusion principles, authoritative poll/profile sources, publisher/language scope, corrections/contact policy, and whether poll averaging is required for the initial MVP.
- Define measurable freshness, schedule-success and source-concentration thresholds, the production observation window, and alert owner/channel. Start with the seven-day recommendation in the product spec unless the owner chooses otherwise.
- Record the current static architecture and the decision to retain or evolve it in an ADR. Define where operational health history can live without confusing it with editorial content.
- Convert the MVP Definition of Done into reviewable release criteria/issues, each with evidence expectations and an owner.

### Exit evidence

Approved policy/methodology documents and ADRs exist; thresholds and ownership are explicit; no implementation depends on invented editorial rules.

## Milestone 1 — Make builds and publication data trustworthy (P0)

**Goal:** create a deterministic safety net before expanding the product or feeds.

### Outcomes

- Pin dependency ranges, commit a lockfile, replace automation installs with reproducible clean installation, and document supported Node.js 22 commands.
- Introduce explicit versioned schemas for sources, news, health, entities, and polls. Expand validation to types, safe absolute URLs, valid dates, uniqueness, source references, excerpt provenance/length, arrays, poll vectors and cross-file relationships.
- Add focused ingestion tests for malformed XML/items/dates, zero relevant results, canonical URL/duplicate behavior, sanitization, stable identifiers, ordering/caps, disabled sources, bad configuration, and atomic write behavior.
- Separate pure normalization/classification/merge logic from network and filesystem effects so deterministic tests do not contact live political sources.
- Add application smoke coverage for successful load plus empty, partial, malformed, stale, and failed-data states. Make the UI's update status derive from real metadata rather than always showing green.
- Harden CI permissions/timeouts/concurrency and publish clear diagnostic artifacts or summaries without publishing live test fixtures.

### Exit evidence

A clean Node.js 22 checkout passes reproducible install, tests, all schema validation, and production build. Failure-path tests prove no invalid/fabricated fallback is published, and the Reviewer can reproduce the gate locally.

## Milestone 2 — Restore source diversity and operational reliability (P0)

**Goal:** make automated news genuinely multi-source and detect when it stops being so.

### Outcomes

- Add durable per-run/per-source telemetry: attempt and success time, status/failure class, latency, fetched and relevant counts, output change, overall freshness, and source-share metrics. Explicitly distinguish fetch/HTTP/parse failure from a healthy feed with zero relevant stories.
- Inspect GitHub Actions history and each official/permitted endpoint. Repair parsers/headers/redirect handling or replace persistently broken feeds; disable a source only with a documented reason. Verify copyright/paywall/access terms and source metadata.
- Broaden the credible source portfolio according to approved policy, including Israeli and relevant international/multilingual coverage. Do not solve concentration by suppressing valid ynet stories blindly or by adding low-quality outlets.
- Add controlled retry/backoff, atomic output generation, workflow concurrency, safe handling of simultaneous human/data changes, and a manual recovery path. Decide whether routine data commits remain the delivery mechanism.
- Detect/alert on missed schedules, stale last success, repeated per-source errors, implausible volume changes, zero-output anomalies, and the approved concentration threshold. Document and exercise source-failure and missed-schedule runbooks.
- Validate the update-to-deploy chain and add a post-deployment freshness/smoke signal plus rollback instructions.

### Exit evidence

Multiple independently maintained sources contribute recent relevant items across the agreed observation window; no source silently exceeds the approved concentration threshold. Health evidence distinguishes failure from irrelevance, alerts are delivered to an accountable owner, schedules/deployments meet the agreed target, and a simulated failing source cannot corrupt or block healthy publication.

## Milestone 3 — Improve news quality and coverage comparison (P1)

**Goal:** turn a broad feed filter into useful, explainable election coverage.

### Outcomes

- Build a small, source-grounded, versioned evaluation corpus using links/metadata—not copied article bodies—to test Israeli-election relevance, categories, entities, deduplication, and clustering. Review it for outlet/language imbalance.
- Improve Israeli-election relevance and category rules with deterministic, inspectable signals first. Track false positives/negatives and allow safe “uncategorized/needs review” outcomes rather than forcing a misleading label.
- Add canonicalization and defensible cross-source/syndication deduplication while preserving distinct coverage.
- Implement stable entity records and aliases, then populate reviewable party/person tags with confidence/provenance appropriate to the method.
- Implement related-story clusters from content/entity/time signals with thresholds and no hard-coded political demo. Present side-by-side publisher material, disclose why grouping occurred and describe framing without judging which outlet is correct.
- Add language/direction metadata and correctly render Hebrew, Arabic, English, names, dates, numbers, and links.

### Exit evidence

Reviewed representative samples meet agreed relevance/category/entity/cluster quality targets; false matches fail safely; every comparison contains genuinely related, attributed stories from more than one source; algorithms and limitations are documented and regression-tested.

## Milestone 4 — Ship sourced party, person, and poll information (P1)

**Goal:** replace static scaffolding with maintained, verifiable reference and polling products.

### Outcomes

- Define stable party/person schemas with aliases, relationships, citations, official links, effective/“as of” dates, update ownership, and neutral ordering. Move time-sensitive profile facts out of component constants.
- Build accessible party and person routes/views with sourced facts, related coverage, explicit stale/missing states, and correct handling of renamed/merged/new/inactive entities.
- Establish a lawful, reviewable poll acquisition process. Store real source URLs and all reported methodology metadata without filling gaps; validate party mappings and reported values; expose individual polls in charts **and accessible tables**.
- If owner-approved for MVP, implement a versioned deterministic poll average with documented inclusion, window, weighting, rounding and missing-party rules. Test calculations against fixed fictional fixtures and label output “average, not prediction.” Otherwise remove/clarify any copy that promises an unavailable average.
- Publish Hebrew methodology for entity maintenance, polls, averages (if present), corrections, source attribution, limitations, and independence.

### Exit evidence

Representative profile facts and every production poll value trace to a source and date; individual polls are not predictions; accessible tables reproduce visual data; average results, if shipped, reproduce exactly from inputs and published method; independent editorial review finds no fabricated or partisan characterization.

## Milestone 5 — Accessibility, UX, and release hardening (P1)

**Goal:** prove that the complete product is usable and operable, not merely present.

### Outcomes

- Refine responsive information architecture, navigation, filters, loading, empty/no-results, fetch error, stale, partial-health and correction states on mobile and desktop without regressing RTL.
- Meet WCAG 2.2 AA across core journeys: semantics, headings/landmarks, focus, keyboard, screen-reader names/statuses, contrast, zoom/reflow, target sizes, bidirectional text, reduced motion, and chart alternatives.
- Add browser end-to-end tests for navigation, data loading, filters/search, original links, profiles, poll tables, comparison, and failure states; add automated accessibility checks backed by manual keyboard/screen-reader review.
- Set and measure appropriate performance budgets for a static site, audit dependency/security posture, least-privilege workflow permissions, untrusted feed handling, and absence of unnecessary personal-data collection.
- Exercise update failure, source replacement, correction, alert, rollback, and deployment runbooks. Complete the full MVP Definition of Done audit in a release-candidate PR.

### Exit evidence

All automated gates pass from a clean checkout; mobile/desktop and accessibility evidence is attached; monitoring and recovery drills succeed; the independent Reviewer signs off every Definition-of-Done item or records a release-blocking defect. The owner—not an agent—makes the merge/release decision.

## Post-MVP candidates (not release blockers)

- Richer historical research/export tools with licensing and provenance controls.
- Public machine-readable health/methodology endpoints and correction feeds.
- Carefully evaluated multilingual discovery or human-reviewed translations.
- More sophisticated clustering/classification only when it measurably improves the reviewed corpus and remains explainable, neutral, and safe.
- Architecture evolution beyond committed JSON/Pages if observed volume, health-history retention, or editorial workflow warrants it.

None of these should displace unresolved MVP integrity, source diversity, monitoring, polling provenance, accessibility, or reliability work.
