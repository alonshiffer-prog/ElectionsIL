# ElectionsIL MVP product specification

## 1. Product purpose

ElectionsIL is to become a trustworthy, independent, politically neutral Hebrew information dashboard for Israeli elections. Its job is to make sourced election news, party and political-person reference information, and published polling easier to inspect—not to tell anyone what to believe or how to vote.

The MVP is a responsive, accessible, RTL-first static web product backed by reliable automated data pipelines. Every published political fact must be traceable to a credible source. If verified material is unavailable, the product must say so plainly; fabricated/demo political content is prohibited everywhere in production.

## 2. Starting point

The repository already supplies a compact React/Vite site with Hebrew RTL metadata and responsive styles. It displays committed JSON on GitHub Pages and includes:

- a news page with text search, source and keyword-category filters, source-attributed cards, short RSS excerpts, original links, and an honest empty state;
- UI scaffolding for coverage comparison, although current items have no clusters;
- an empty-state poll page plus charts that can render a populated poll schema;
- static party cards that can filter tagged stories, although ingestion does not currently populate party/person tags;
- a methodology page and independent/non-partisan messaging;
- a six-feed registry and scheduled RSS ingestion with concurrency, timeouts, keyword filtering, simple categorization, URL deduplication, failed-source retention, and no fabricated fallback;
- basic Node tests/data validation, PR CI, scheduled data commits, and GitHub Pages deployment.

This is a foundation, not yet the completed MVP. The committed news snapshot audited on 2026-09-05 contains 110 items: 108 from ynet and two from BBC News, with no populated clusters or entity tags. The poll list is empty. These facts describe the snapshot, not an editorial judgment or permanent state.

## 3. Users and core needs

- **Voters and residents:** quickly find current election developments and open the original reporting.
- **Researchers, journalists, and engaged readers:** compare how multiple credible publishers cover the same event and inspect poll methodology/history.
- **Maintainers and reviewers:** understand provenance, source health, transformations, corrections, and deployment status without reverse engineering the system.

Primary use is Hebrew and RTL on mobile, with full desktop support. Source material may be Hebrew, Arabic, or English and must be labeled and rendered without confusing its direction or provenance.

## 4. Product principles

1. **Truth before fullness:** no fabricated news, people, parties, quotes, polls, results, sources, or metadata. Honest empty/stale/partial states are valid outcomes.
2. **Source first:** preserve publisher attribution, author when provided, publication time, direct original URL, language, and whether text came from an RSS feed. ElectionsIL-authored text is explicitly separate.
3. **Independent and non-partisan:** no endorsement, opposition, ideological scoring, vote recommendation, or declaration that an outlet is politically “correct.” Ordering and comparisons use disclosed product rules.
4. **Respectful aggregation:** do not bypass paywalls/access controls or copy full articles. Use minimal permitted metadata and short source-provided excerpts; send readers to publishers.
5. **Methodological transparency:** disclose categorization, clustering, source selection, poll handling/averaging, limitations, freshness, and corrections.
6. **Resilient simplicity:** automated updates fail safely, preserve last known valid data, and expose degraded health. Prefer deterministic transformations to opaque AI output.

## 5. MVP functional requirements

### 5.1 Election news

- Update reliably on a documented cadence without manual content fabrication.
- Ingest a deliberately maintained range of credible Israeli and relevant international sources. One outlet must not routinely dominate because other configured feeds are broken, too broad, or incompatible.
- Normalize and validate stable IDs/canonical URLs, publisher, source type/language, author if supplied, publication time, title, permitted excerpt, excerpt provenance, and retrieval time.
- Keep the original headline and direct publisher link. Clearly label a source-provided RSS excerpt; do not present it as an ElectionsIL-authored summary. If translations or original summaries are later introduced, label their authoring/provenance and source language separately.
- Filter for Israeli-election relevance with documented, testable rules and a review path for false positives/negatives. Do not equate the mere occurrence of “election” (including foreign elections) with relevance.
- Deduplicate syndicated or URL-variant copies where defensible, retain valid data through partial failures, and show readers the last successful update plus a truthful stale/degraded state.
- Offer useful, stable categories such as polls, parties, people, campaigns, governance/law, economy, security, religion/state, sector-specific party coverage, coalition discussion, and fact-checking. Category labels must describe topic, not editorial approval.
- Provide usable search and source/category filtering. No-results and no-data states explain the distinction.

### 5.2 Source portfolio and health

- Maintain documented inclusion, exclusion, replacement, attribution, language, and licensing/access criteria. Diversity means credible variation in publisher, public/commercial model, language, geography, and audience—not a political truth score.
- Collect per-source last attempt/success, response/parse status, latency, item count, relevant-item count, and actionable failure reason. Track overall freshness and source share over a documented window.
- Surface health to maintainers through durable run output and alerts/issues or an equivalent mechanism. Detect missed schedules, repeated failures, stale output, empty results, unexpected volume changes, and excessive concentration.
- Repair or replace persistently broken feeds through verified official/permitted endpoints. A successful HTTP response with zero relevant items is distinct from a failed fetch.
- Prevent a malfunctioning source from blocking healthy sources or erasing retained content; prevent a total failure from creating a misleading update timestamp or deployment.

### 5.3 Parties and political people

- Provide discoverable pages/views for in-scope parties and significant political people, with stable slugs/IDs rather than only display-name string matching.
- Every factual profile field—such as role, leadership, list membership, or official link—has provenance and an “as of” date. Time-sensitive facts are updated or marked stale; missing facts remain absent.
- Connect news through deterministic entity records/aliases plus reviewable tagging. Show an honest empty state when no matching coverage exists.
- Keep presentation consistent and neutral. Colors, ordering, and descriptive text must not signal endorsement, importance, or predicted success; disclose the ordering rule.

### 5.4 Polls and averages

- Publish only real, verifiable polls with a source URL and, where reported: publisher/commissioner, pollster, publication date, fieldwork dates, sample size/population/mode, margin of error, undecided treatment, threshold/rounding notes, party values, and relevant questionnaire details.
- Validate that values map to stable party IDs and that metadata and seat/value vectors are internally coherent. Preserve the source's reported result without inventing missing fields.
- Let users inspect individual polls over time and clearly identify each as an individual poll, not a forecast.
- If MVP includes a poll average, show it in a visually and semantically separate section labeled **average, not prediction**. Publish its versioned formula, inclusion/exclusion policy, time window, weighting, rounding and missing-party handling; make the calculation deterministic and tested from stored poll inputs.
- Do not extrapolate an election winner, government, coalition likelihood, or probability.

### 5.5 Coverage comparison

- Group genuinely related stories using documented signals and a confidence/review policy; do not rely on a hard-coded demo cluster.
- Show original headlines, source-provided excerpts, timestamps, languages, and links side by side so readers can inspect emphasis and framing.
- Explain that comparison is descriptive. Do not rate ideological correctness, factual truth, or publisher worthiness merely from framing. Any future fact-check status must cite the fact-checking source and remain distinct from ElectionsIL's clustering.
- Avoid giving a high-volume outlet extra apparent authority; ordering/diversity rules are disclosed and deterministic where practical.

### 5.6 Trust, policy, and transparency

- Publish clear Hebrew pages/sections for methodology, source policy, attribution/copyright, poll-average methodology (when applicable), correction/contact procedure, data freshness/limitations, and the independent/non-partisan disclaimer.
- Material corrections identify what changed and when, link to evidence, and remain auditable through an appropriate public log and Git history.
- Clearly distinguish automated classifications/computations, source-provided text, and ElectionsIL-authored explanations.
- Do not claim continuous or healthy automation solely because a scheduled workflow exists; communicate observed state.

### 5.7 UX, accessibility, and quality

- Provide coherent responsive behavior on common narrow mobile and desktop viewports, with correct RTL layout and sensible bidirectional handling for foreign-language text, numbers, charts, and URLs.
- Meet WCAG 2.2 AA for the core journeys: semantic landmarks/headings, keyboard operation, visible focus, labels/instructions, contrast, zoom/reflow, accessible status/errors, chart alternatives or data tables, and reduced-motion support where relevant.
- Handle loading, malformed data, fetch failure, empty data, no search results, stale data, and partial source health without a blank page or misleading green status.
- Keep performance appropriate for a static Pages site and avoid unnecessary tracking or collection of personal data.

### 5.8 Operations and delivery

- Use repeatable Node.js 22 installs/builds with pinned dependencies and a lockfile. CI gates pull requests on tests, schema/data validation, and a production build.
- Scheduled ingestion is concurrency-safe and observable, has controlled retries/backoff, and updates publication data atomically. Avoid commit/deploy storms and races with human changes.
- Deployment publishes only validated artifacts from the intended `main` revision and has a documented rollback/recovery procedure.
- Monitoring detects and notifies maintainers of missed schedules, stale data, repeated source failures, invalid output, CI failures, and deployment failure. Document ownership and response steps.
- Secrets and permissions follow least privilege. Source content is untrusted and never executed or injected as raw markup.

## 6. Out of scope for the MVP

- Election-result prediction, win probabilities, coalition forecasts, voting advice, endorsements, or ideological publisher rankings.
- Full-article hosting, paywall bypass, or republishing content beyond permitted short metadata/excerpts.
- Fabricated placeholders disguised as live political information.
- User accounts, personalized political recommendations, comments, ad targeting, and collection of sensitive political preferences.
- An autonomous AI newsroom. AI may assist reviewed maintenance or classification only under explicit provenance and safeguards; deterministic and source-grounded behavior is preferred.

## 7. MVP definition of done

The Lead Engineer may call the initial product substantially complete only when **all** of the following are demonstrated in a release-candidate PR and independently reviewable evidence:

### Data integrity and editorial safety

- [ ] Production contains no fabricated/demo political content; every news item, profile fact, and poll datum is traceable to its original credible source.
- [ ] RSS excerpts are visibly identified as source-provided, publisher links remain direct, and copyright/paywall rules plus source inclusion criteria are documented.
- [ ] Invalid, empty, partial, stale, duplicate, and total-failure inputs fail safely without erasing valid retained data or reporting false freshness.
- [ ] Neutrality, methodology, limitations, attribution, corrections, and independent/non-partisan policies are published in clear Hebrew.

### News and source reliability

- [ ] A maintained portfolio of multiple working Israeli and international sources produces meaningfully diverse recent coverage; a documented concentration threshold/alert prevents silent single-source domination.
- [ ] Per-source health and overall freshness are persisted or otherwise durably observable, with alerts for missed schedules and repeated failures and a tested repair/replacement runbook.
- [ ] Scheduled ingestion and Pages publication complete on cadence through an agreed observation window (recommended: seven consecutive days), with failures detected and recovered rather than noticed manually.
- [ ] Categories, relevance filtering, canonical deduplication, and related-story clustering are useful on representative reviewed samples and have documented/tested rules and limitations.

### Product completeness

- [ ] News discovery, filters, empty/error/stale states, and source comparison work with real sourced data.
- [ ] Party and political-person pages use maintained entity data with citations and “as of” dates, and their news associations are reliable enough for reviewed representative cases.
- [ ] Real polls can be ingested and displayed with source/methodology metadata and accessible tabular presentation; no poll is labeled as a forecast.
- [ ] Any displayed poll average is deterministic, reproducible, tested, fully documented, separated from individual polls, and labeled as an average rather than a prediction. If no average is shipped, the MVP copy must not imply that one exists.

### Experience, engineering, and operations

- [ ] Core journeys pass a documented mobile/desktop, RTL/bidirectional, keyboard, screen-reader, reflow/zoom, contrast, and automated accessibility review targeting WCAG 2.2 AA.
- [ ] Focused unit/integration tests cover critical ingestion and calculation paths; schema validation covers all publication files; end-to-end smoke tests cover data load, navigation, filtering, original links, and empty/error states.
- [ ] Clean Node.js 22 installation, full tests, validation, and production build pass from the committed lockfile; PR and deployment workflows use those reproducible commands.
- [ ] Monitoring, alert ownership, deployment, rollback, correction, source-failure, and incident procedures are documented and have been exercised at least once without altering genuine data improperly.
- [ ] No unresolved release-blocking accessibility, data-integrity, security, copyright, editorial-provenance, CI, ingestion, or deployment defect remains; the Reviewer signs off and the owner chooses whether to merge.

## 8. Decisions that still require owner approval

The specification deliberately leaves these policy choices open rather than guessing:

- the authoritative scope and inclusion criteria for parties, political people, polls, and publishers, including multilingual and paywalled sources;
- the numeric source-concentration threshold, alert destination/owner, required observation window, and acceptable update freshness;
- the authoritative poll data acquisition process and whether a poll average belongs in the initial MVP release;
- the public corrections/contact channel, response commitment, and legal/privacy/copyright wording;
- whether the static committed-JSON/GitHub Pages architecture remains the desired operating model once health history and structured entity/poll data grow.

These choices should be recorded in ADRs or methodology/policy documents before dependent features are considered done.
