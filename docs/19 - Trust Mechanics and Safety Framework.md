# Trust Mechanics And Safety Framework

Status: adopted for the v2 frontend; the domain rules in this document are implemented as pure, tested modules under `src/features/casts/domain/` and must be re-enforced in PostgreSQL when the backend lands (invariants belong in both places, per `AGENTS.md`).

## 1. Delivery: why a cast reaches a person

Implemented in `domain/delivery.ts`. The product law is that every recommendation carries a stored, human-readable delivery reason. The framework makes that law structural:

**Hard gates (a cast is not delivered unless all pass):**
1. The viewer has not blocked the caster. Blocking beats every other signal.
2. The caster's chosen reach permits it: `origin_only` requires a shared circle; `adjacent_network` requires a shared circle or one trusted link; `nearby_relevant` requires, for strangers, BOTH an approved-area match AND a shared thread (topic overlap) — never place alone; `broader_approved` requires at least an approved-area match.
3. At least one positive signal fired. No signal, no delivery — there is no filler feed.

**Signals (each adds to the score and contributes a reason fragment):**
trust distance (shared circle > one link), approved-area match, topic overlap with the viewer's own joins and saves, and coarse time-window fit. The reason line shown on the poster is generated from the two strongest fired signals. Score and reason are derived from the same list, so they cannot diverge, and a reason can never cite a signal that didn't fire — this is asserted by test.

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

## Change Log

| Date | Change |
|---|---|
| 2026-08-27 | Initial framework: delivery, flakes, verification, photos, threat model |
