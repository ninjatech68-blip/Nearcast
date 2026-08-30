# Discovery And Controlled Reach Implementation Plan

> **For agentic workers:** Execute checkbox tasks in order with test-first changes and one coherent commit per task.

**Goal:** Deliver a finite, explainable set of eligible intents after explicit reach expansion.

**Architecture:** SQL eligibility filters precede ranking. Every materialized delivery stores a stable explanation code and privacy-safe rendered reason.

**Tech Stack:** PostGIS, PostgreSQL functions, Edge Functions, Expo Router.

## Task 1: Approximate Geography

**Files:** `20260831030000_approximate_geography.sql`, `src/features/location/`, pgTAP tests

- [x] Test distance bands and prove exact coordinates never appear in discovery responses.
- [x] Store approximate geography with GIST index and convert results to coarse distance labels.
- [x] Verify blocked, expired, restricted, and out-of-range candidates return no rows.

Profiles carried only a city name, so discovery had nowhere to measure from.
They now hold an approximate home point, GIST indexed. It is deliberately
approximate: what a person is willing to be found near, not where they live.
Exact coordinates stay in `intent_private.exact_geography` and never enter a
discovery result.

Distance is reported as a band rather than a number, and that is a privacy
decision rather than a rounding convenience. A metre value is a coordinate in
disguise: readings taken from several intents would trilaterate a home address,
which is precisely what an approximate point exists to prevent. The client
receives only the band, so nothing downstream can reconstruct a distance.

`discover_intents` cannot leak a coordinate because its return type has no
column for one, and the suite pins that column list as a set so adding one fails
loudly. Eligibility is applied before anything else, in the plan's order:
lifecycle, reach, time, geography, blocks, restriction. An `origin_only` intent
is not discoverable at all, and an unplaced intent reports `unknown` rather than
being treated as nearby.

Ranking is deliberately absent. Eligibility is a correctness question and
ranking is a judgement, and mixing them would make it impossible to test either.

## Task 2: Reach Expansion

**Files:** `src/features/reach/`, `public.change_intent_reach`

- [x] Test no expansion without a matching current level, explicit target, and disclosure confirmation.
- [x] Implement ReachSelector with audience delta and privacy impact.
- [x] Log old/new reach and actor; keep reduction immediately available.

Widening is gated three ways: the caller must name the level they believe is
current, name the level they want, and confirm they have seen what the change
discloses. Any of the three missing is an implicit expansion, which the product
rules forbid. The expected-level check is what stops a stale screen widening
reach a second time without anyone intending it.

Narrowing needs none of that and is offered in one tap. Requiring a confirmation
to reduce exposure would make the safer action the harder one, which is the
wrong incentive to build in.

The audience delta is named, never counted. A number would be a fabricated
activity figure: the app cannot know how many people a level reaches without
querying a graph it must not expose, and a confident-looking count would imply
precision that does not exist. A test sweeps every delta string for digits.

The privacy impact is stated before the action, and it is honest about the limit
of a reduction: fewer people will see it from now on, but anyone who already saw
it may still remember it. Claiming otherwise would promise something the product
cannot deliver.

An expansion materialises the deliveries it authorises in the same transaction.
An expansion that reached nobody new would be a promise unkept.

## Task 3: Explainable Delivery

**Files:** `public.generate_deliveries`, `public.home_feed`, `src/features/feed/`

- [x] Test every delivered row has one approved explanation code and non-empty reason.
- [x] Apply eligibility in this order: lifecycle, reach, time, geography, explicit criteria, blocks, restriction, prior action.
- [x] Rank the surviving set by trust distance, geography, timing, relevance, recency, and fatigue.
- [x] Render a finite Home list with WhyYouSeeThis, hide, save, and not-relevant actions.

An intent reaches someone only through a materialised delivery row, and every
row carries a stable explanation code and a rendered sentence. The sentence is
stored at delivery time rather than derived later, so what a person reads is
what was true when the intent reached them, not a reconstruction from rules that
may since have changed. The client renders the stored sentence rather than
deriving its own from the code, because a client that derives can disagree with
the database that made the decision.

A rendered reason never names the origin group, the broadcaster's circle, or any
third party. "Someone you both know" is as specific as it gets: it explains the
connection without disclosing who forms it. A test sweeps every stored reason
for group and person names.

Generation is idempotent and never rewrites an existing row, so a reason someone
has already read cannot change under them. Prior action is applied last in the
eligibility order because it is the only filter about the recipient's history
rather than about whether they may see the intent at all.

Ranking is applied only to rows that already earned a delivery, and each
component is named so an ordering can be explained rather than defended: trust
distance, then geography band, then how soon the intent closes, then recency.
Fatigue is handled by the finite limit rather than by scoring, so a quiet day
shows a short list instead of padding it out. Hidden and not-relevant rows never
return, which is what makes the list end.

A card whose explanation is missing or whose code is not on the approved list is
dropped rather than shown. Inventing a reason would fabricate the provenance
this feature exists to guarantee.

`saved_at` was added to `intent_deliveries`; the plan asks for a save action and
the table had nowhere to record one.

## Task 4: Measurement

**Files:** `src/infrastructure/analytics/`, matching-quality query/dashboard spec

- [ ] Emit delivery, impression, detail-open, hide, and relevance-feedback events with approved properties only.
- [ ] Add a test asserting analytics serialization rejects prohibited keys.

## Exit Gate

Every feed card has a valid explanation, blocked users never receive each other's intents, exact geography is absent from delivery payloads, and alpha relevance review meets the roadmap gate.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Created discovery and controlled reach implementation plan |
| 2026-08-31 | Completed approximate geography, coarse distance bands, and eligibility filtering |
| 2026-08-31 | Completed explainable delivery, ranking, and the finite Home feed |
| 2026-08-31 | Completed controlled reach expansion with a three-way gate and immediate reduction |
