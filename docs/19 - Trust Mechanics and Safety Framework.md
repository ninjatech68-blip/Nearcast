# Trust Mechanics And Safety Framework

Status: adopted for the v2 frontend; the domain rules in this document are implemented as pure, tested modules under `src/features/casts/domain/` and must be re-enforced in PostgreSQL when the backend lands (invariants belong in both places, per `AGENTS.md`).

## 1. Delivery: why a cast reaches a person

Implemented in `domain/delivery.ts`. The product law is that every recommendation carries a stored, human-readable delivery reason. The framework makes that law structural:

**Hard gates (a cast is not delivered unless all pass):**
1. The viewer has not blocked the caster. Blocking beats every other signal.
2. **Distribute by place and intent, decide by trust.** The caster picks a **casting radius** in kilometres (default 5, see `domain/geo.ts`) and the gate is: someone the viewer is connected to reaches them at *any* distance — a friend's plan across town is still a friend's plan; a **stranger** reaches them only inside the radius AND with a shared thread (topic overlap), never place alone.
3. At least one positive signal fired. No signal, no delivery — there is no filler feed.

This replaced a four-level reach ladder (`origin_only` → `broader_approved`). The ladder's usable default was "friends of circles", which quietly rebuilt the group chat this app exists to get past: everyone it reached was already reachable. Trust did not go away — it moved to where it does more good, the caster deciding who to let in. Distance is measured between **area centroids only** (`domain/geo.ts`); nothing in that module is ever given a person's position, and an area we cannot place on the map falls back to name matching rather than silently reading as "far".

**Signals (each adds to the score and contributes a reason fragment):**
trust distance (shared circle > one link), in-radius area match, topic overlap with the viewer's own joins and saves, and coarse time-window fit. The reason line shown on the poster is generated from the two strongest fired signals. Score and reason are derived from the same list, so they cannot diverge, and a reason can never cite a signal that didn't fire — this is asserted by test.

**What delivery never reads (shown verbatim in-app on the why-tap):** exact location, contacts, messages, drafts typed before casting, and whose profiles the viewer looks at.

**The transparency surface:** every poster's "why you" line is tappable and shows the full fired-signal list plus the never-used list. Trust systems that explain themselves get gamed less and trusted more.

## 2. What a flake is, exactly

Implemented in `domain/attendance.ts`. A flake is never an opinion; it is a specific event sequence:

> You were matched into a plan, you did not cancel at least 2 hours before start, the confirmation window closed (start + 24h), and every other participant who reported at all reported you absent.

The boundaries that keep it fair:
- **Cancelling ≥ 2h before start is withdrawal** — no flake, no receipt. Backing out with notice is allowed behavior, not punished.
- **A late cancel (< 2h) is judged like a no-show**: the others' reports decide, not the cancellation itself.
- **Conflicting reports → disputed → neutral.** One person says you showed, another says you didn't: the tie always goes to no-penalty. Repeated disputes around one account become a pattern-review signal for moderation, never an automatic score.
- **Silence never creates a fact.** If nobody confirms anything, the plan is unverified: no receipts, no flakes.
- **Recovery is structural**: signal recovers the next time you show up, and nothing decays from absence.

## 3. How "plans made real" are verified

Same module. A receipt exists only when the confirmation quorum does:

- After a plan's start time, every participant is asked one question: did it happen, and who was there. Reports are per-person and independent.
- **Receipt** = every participant who reported marked you present, within the window. Unanimous presence, not self-declaration — you cannot confirm yourself into a receipt.
- **Unverified** = the window closes with no reports. Nothing is written. Most casual plans will end here and that is fine; receipts are meant to be earned, not automatic.
- **Anti-farming**: receipts between the same two people count at most once per 7 days (`receiptWeight`), so two friends cannot manufacture signal over a weekend. Backend phase adds: velocity caps per account, diversity weighting (receipts from new counterparties count fully), and colocation is deliberately NOT used — verifying attendance by GPS would require tracking exact location, which the product refuses to hold.

## 4. Photos

Adopted policy, partially implemented (the `Face` component and photo slots are live; capture is an onboarding-phase feature):

- **Every profile shows one photo.** It appears at the decision moments: the caster sheet, activity rows, and (when built) the plan room. Social trust needs a face.
- **Camera-only, verified.** Photos are captured in-app with the camera at onboarding — no gallery uploads — and re-verified against a liveness selfie when an account is reported. This is the anti-catfish layer: the photo on the profile is the person who holds the phone.
- **One photo, no grid, no filters.** The photo is identification, not performance. No galleries, no photo feeds.
- Fixture builds never fabricate human faces; placeholders are the app's own head-and-shoulders mark until real capture exists.

## 5. Safety: the threat model

The app moves strangers toward real-world meetings, so it is designed against the dark uses first. Threat → mitigation, with status:

| Threat | Mitigation | Status |
|---|---|---|
| Catfishing / fake identity | Invite-only entry through vouch chains; camera-only verified photo; phone verification; receipts history visible at the decision moment | photo policy adopted; capture + phone verify = onboarding phase |
| Luring to a location | Exact place hidden until BOTH sides accept; areas always approximate; no live location ever; first-meet nudge on the join sheet ("somewhere public is smart") | live in v2 FE |
| Predation on minors | 17+ App Store rating; no under-16 marketing; age attestation at onboarding; adult vouch chains make anonymous entry impossible | onboarding phase |
| Scams on GOT casts | No in-chat payments at launch; deal-like casts from unverified accounts flagged; caster receipts and flake record shown before joining | receipts live; screening = backend phase |
| Harassment | Silent block (the blocked person sees nothing change, removing retaliation); anonymous report; strike ladder ending in network removal that invalidates their vouches | block/report UI live; ladder = backend phase |
| Stalking | Approximate areas only; no last-seen, no online status, no activity trail visible to others; profiles show attendance facts, never movement | structural, live |
| Reputation gaming | Receipts require unanimous third-party confirmation; same-pair throttle; disputes go neutral; new accounts start mid-signal so zero is not a mark of newness | domain live |
| Data abuse | Push and analytics payloads carry ids only — never intent text, coordinates, contacts, or circle names (product law); delivery's never-used list is shown to users in-app | structural |
| Coordinated abuse (fake circles vouching each other) | Vouch chains are traceable: when an account is removed for harm, its vouches are re-examined and the inviter's range narrows. Vouching for someone is a stake, not a like | backend phase |

**The enforcement spine (backend phase):** report → human review within a target SLA → outcomes: warning, reach restriction (range floor), suspension, removal with vouch-chain review. Safety features are free forever and can never be weakened by any monetization line (doc 18's never-sell list).

**Escrowed honesty:** the plan room (doc 18, P0) is where reveal happens, and it is also the safety record — who agreed to meet whom, when, established by both sides. If something goes wrong, the report carries that context without the app ever having tracked anyone's location.

## 6. Slots: hidden, and therefore uncapped

A cast used to ask the caster how many joiners they wanted, defaulting to two. Nothing in the app asks any more, and no surface shows a headcount or a "1 slot left" line: the question was friction at the moment of casting, and the count turned asking into a race while making an empty plan read as a failure.

The consequence is deliberate and enforced in both places: a cast with no stated ceiling has **no ceiling**. A hidden default of two would silently refuse the third yes, which is worse than the question that was removed. `slots_wanted` is nullable with no default (`intents`), `private.enforce_slot_limit()` and `accept_response()` both treat null as uncapped, and an uncapped cast never transitions to `matched` on an accept — it stays live until it expires or the caster takes it down. A cast that genuinely carries a cap is still enforced exactly as before, so the field survives for whatever surfaces it later.

The caster's own row still shows how many people are *waiting on them*, because that is the thing they have to act on. That is a request count, not a plan size.

## Change Log

| Date | Change |
|---|---|
| 2026-08-27 | Initial framework: delivery, flakes, verification, photos, threat model |
| 2026-08-28 | Reach ladder replaced by a casting radius (§1); slots hidden and therefore uncapped (§6) |

