# NearCast — Device QA Test Matrix

The QA that cannot be run headless: real devices, the hosted Supabase
stack, realtime, deep links, and everything visual. Automated coverage
(unit / component / pgTAP / typecheck / lint / bundle) is green in CI;
this matrix covers the tier that only a device and the live backend can
exercise. Every UI/UX bug found so far surfaced here, not in CI — so run
it deliberately.

**How to use:** work top to bottom on each device. Mark each row
Pass / Fail / N/A and note anything off. A row is Pass only if it behaves
correctly AND looks right (no clipping, overlap, or content under the
notch).

## 0. Preconditions

- [ ] `.env` points at the **hosted** `https://<ref>.supabase.co` (NOT
      127.0.0.1 / a 192.168.* / 10.* LAN address). Confirm the app does
      not log the "home-network address" warning.
- [ ] Latest migrations pushed (`supabase db push`), `messages` in the
      `supabase_realtime` publication.
- [ ] Magic Link email template uses `{{ .ConfirmationURL }}`;
      `nearcast://auth/callback` is in Redirect URLs.
- [ ] A **standalone/release** build (not a Metro dev run) installed on:
      - [ ] iPhone (iOS)
      - [ ] Android phone
- [ ] Two separate accounts (two emails): **A** and **B**.
- [ ] Seed run for the primary test account (dev_casts.sql) if a fuller
      feed is wanted.

Legend: ✅ pass · ❌ fail (note it) · ⭕ N/A

---

## 1. Auth — passwordless magic link

| # | Step | Expect | iOS | Android |
|---|---|---|---|---|
| 1.1 | Launch fresh (signed out) | signin fills the screen from the very top; no gap, no notch overlap | | |
| 1.2 | Enter email → "send magic link" | moves to "check your inbox" | | |
| 1.3 | Open the email **on the same phone** | subject/body reads "Verify & continue" (branded), not "Your sign-in link" | | |
| 1.4 | Tap "Verify & continue" | app opens automatically, lands in onboarding/home, no code typed | | |
| 1.5 | Force-quit + relaunch | still signed in (no signin flash) | | |
| 1.6 | Tap an already-used / old link | clear "link no longer valid/expired" message, back to signin, resend available | | |
| 1.7 | Tap the magic link on a **different** device | does NOT sign in (PKCE is device-bound) — expected, note behaviour | | |
| 1.8 | Airplane mode → "send magic link" | clear offline/error message, not a silent hang | | |
| 1.9 | Sign out (Profile) → relaunch | returns to signin; previous account's data not visible | | |

## 2. Onboarding

| # | Step | Expect | iOS | Android |
|---|---|---|---|---|
| 2.1 | Onboarding screen | fills from the top; no pull-to-dismiss revealing another screen | | |
| 2.2 | Name step | no back control on the first step | | |
| 2.3 | Home step | location auto-fetches; area fills in ("from your location") | | |
| 2.4 | Deny location permission | falls back to "tap to choose on the map", no crash | | |
| 2.5 | Tap the home field | map picker opens and **stays** (does NOT bounce to the name step) | | |
| 2.6 | Pick a place on the map | returns to the **home** step with it set | | |
| 2.7 | "add a neighbourhood" | opens the picker, returns to the **areas** step (not name) | | |
| 2.8 | Back "‹" on every step after the first | steps back one screen (interests→areas→home→name) | | |
| 2.9 | Pick interests, finish | lands on the feed; seeded areas do NOT persist (only what you chose) | | |

## 3. Feed & delivery gate

| # | Step | Expect | iOS | Android |
|---|---|---|---|---|
| 3.1 | Open feed (backend on) | loads from server; shows a spinner then content, not an instant "quiet" | | |
| 3.2 | Kill network, reopen feed | "couldn't load" (distinct from "quiet"), with retry — never a false empty | | |
| 3.3 | Feed with matches | each cast shows a "why you" line; tap it → signals + never-used list | | |
| 3.4 | Your own cast | never appears in your own feed | | |
| 3.5 | Swipe/skip a cast | it stays gone on refresh | | |
| 3.6 | Seed casts (if run) | ~10-11 appear, "your circle vouches · near you" | | |
| 3.7 | Nothing anywhere near/relevant | "quiet." empty state with a cast CTA, not an error | | |

## 4. Compose / publish

| # | Step | Expect | iOS | Android |
|---|---|---|---|---|
| 4.1 | Compose, step 1 | next disabled until a category AND text exist | | |
| 4.2 | Area row | prefilled from home; tapping opens the picker; selected address shows in the field, CTA stays "use this area" | | |
| 4.3 | Radius block | default 5 km selected; choices 2/5/10/25; no "slots"/headcount anywhere | | |
| 4.4 | Publish | succeeds (no "try again"); appears under "my casts", not your feed | | |
| 4.5 | Airplane mode → publish | written text kept, clear retry; no duplicate on retry | | |
| 4.6 | Date/time picker | sets a start; expiry copy makes sense | | |

## 5. Join → accept / decline / withdraw (needs A + B)

| # | Step | Expect | iOS | Android |
|---|---|---|---|---|
| 5.1 | B opens A's cast → "I'm in" + note | sends; B sees it under "waiting on" | | |
| 5.2 | A opens Activity | B's request appears under "your move" with the note | | |
| 5.3 | A accepts | A lands in the chat; request clears | | |
| 5.4 | B's Activity | shows accepted / a chat now exists | | |
| 5.5 | A declines a different request | silent to B (B sees nothing change) | | |
| 5.6 | B withdraws a pending request | silent to A | | |

## 6. Chat (needs A + B)

| # | Step | Expect | iOS | Android |
|---|---|---|---|---|
| 6.1 | Open chat (Activity → CHATS) | loads history; screen fills correctly | | |
| 6.2 | A sends a message | appears on B **live** (realtime); if not live, on B reopening | | |
| 6.3 | Emojis (quick-row + keyboard) | render both sides | | |
| 6.4 | 📍 share location (allow perms) | other side sees a tappable pin → opens Maps; approximate | | |
| 6.5 | Read ticks / unread badges | update after the other reads | | |
| 6.6 | Extend window (24h/7d/always) | label updates, system note appears | | |
| 6.7 | End chat | read-only, no reopen, composer gone | | |
| 6.8 | Send while offline | kept + clear failure, retry works | | |

## 7. Attendance (needs a completed plan — start time in the past)

| # | Step | Expect | iOS | Android |
|---|---|---|---|---|
| 7.1 | Activity after a past plan | "how did it go?" prompt appears | | |
| 7.2 | Report showed / didn't show | saves, prompt clears | | |
| 7.3 | Both sides report "showed" | Profile → receipts shows a receipt for that plan | | |
| 7.4 | Caster's profile | "with you" history line reflects real counts | | |
| 7.5 | Report offline | kept + retry | | |

## 8. Profile & settings

| # | Step | Expect | iOS | Android |
|---|---|---|---|---|
| 8.1 | Profile | name, area, signal, receipts row; NO fabricated "~N people" range | | |
| 8.2 | Areas | add/remove via the map picker; changes persist | | |
| 8.3 | Interests | toggles persist | | |
| 8.4 | Quiet hours | toggle + times persist | | |
| 8.5 | Block someone | their casts stop reaching you; silent to them | | |
| 8.6 | Delete account | clear consequences copy; removes profile, unpublishes casts | | |
| 8.7 | Legal links (terms/privacy/guidelines) | open and read true (no "exact spot" / OTP references) | | |

## 9. Cross-cutting — states on every write path
For compose, join, accept, message, report: verify **loading**, **error**,
**offline/queued**, **disabled**, and (where relevant) **restricted** states
render and recover. No silent failures; no success shown for a failed write.

| # | Check | iOS | Android |
|---|---|---|---|
| 9.1 | Every write shows a spinner while in flight | | |
| 9.2 | Every write shows a real error on failure (kept input) | | |
| 9.3 | Off-network is distinguished from empty everywhere | | |

## 10. Privacy / product-law spot checks
- [ ] A discoverable cast never shows an exact address — only the neighbourhood.
- [ ] No headcount / "slots" anywhere in the UI.
- [ ] A block is silent to the blocked person.
- [ ] Chat is in-app; no phone numbers exchanged.
- [ ] Nothing claims a fabricated count (users, confirmations, range).

## 11. Off-network / environment guard
- [ ] With the app pointed at hosted Supabase, sign-in + feed + chat all
      work on **cellular / away from home Wi-Fi**.
- [ ] The dev diagnostics never show the "home-network address" warning.

---

## Results summary (fill in and report back)

- Build tested: iOS ______  Android ______  · commit ______
- Blocking failures (must-fix before wider testing):
- Non-blocking issues (polish):
- Anything that couldn't be tested and why:
