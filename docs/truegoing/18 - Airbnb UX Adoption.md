# 18 - Airbnb UX Adoption

**Written 2026-09-24.** The owner ruled: take as much of Airbnb's UX as the four rules allow. This document is the list, pattern by pattern, with what it becomes in Truegoing and where it lands in the contracts (`15`). Anything not listed under **Taken** was considered and is under **Not taken** with the reason. The four rules (`12 §2`) are not negotiable by this document.

## Taken

| Airbnb pattern | Truegoing version | Contract |
|---|---|---|
| Five-tab bar: Explore, Wishlists, Trips, Messages, Profile | **Plans · Going · Post · Messages · You.** Posting is a core act, so it takes the centre tab; Wishlists comes later as Saved | all |
| Search pill at the top that collapses into a compact header on scroll | `Near Sector 5 · This week · Badminton, Games, Cycling`, collapsing on scroll; tap opens a search sheet with three steps: where, when, what | B1, B2 |
| Category row of 3D icons with underline | Same, six categories, underline on the selected one, scrolls | B1, B2 |
| Full-screen filter sheet with live count and Clear all | Same, with When, Your interests, Plan type; no distance | B6 |
| Listing card: image, title, facts, rating | Card: 3D icon, sentence, `Thu 7pm · about 2 km`, host record with tick, why line | B2 |
| Listing page: hero, title, host card, about, house rules, report link, sticky bottom bar | **Plan page**: hero icon, sentence and facts, `Hosted by Aarav` card with record, About this plan, **How this works** (our disclosures in the house-rules slot), `Report this plan`, sticky bar with the time on the left and `Ask to go` on the right. Full page pushed, not a sheet | B3 |
| Map with price pills; tapping a pin shows a card carousel at the bottom | Map with icon discs; tapping shows the plan card in a bottom carousel, swipe between nearby plans | B1 |
| "Show map" floating pill over the list, "Show list" over the map | Same, the pill is how the two views switch, replacing the segmented control | B1, B2 |
| Trips tab: upcoming, past, with the reservation card and message host | **Going**: Needs you, Upcoming, Asked, Hosting, Past; each card opens the plan; `Message Aarav` on upcoming | E1 |
| Messages inbox with avatar, last line, unread dot, reservation context pinned in the thread | Same, the plan pinned at the top of each thread | F1 |
| Reserve flow confirmation with "You won't be charged yet" | Ask sheet with "If Aarav doesn't reply, that's a no" | B4 |
| Profile: big cards for Past trips, Connections; settings behind a gear | You: `What hosts see` card, Past plans card, Connected accounts; settings behind a gear | G1 |
| Superhost badge and host card | Regular host mark and host card | D1, B3 |
| Skeleton loaders shaped like the real card | Same on every list | all |
| Pull to refresh | Same | B1, B2, E1 |
| Share from the top right of a listing | Share from the top right of a plan | B3 |
| Empty states with the 3D objects as illustration | Same, three icons from the person's interests | B2 |
| Haptic on save and on booking | Haptic on ask sent, accepted, confirmed, block | all |
| Login sheet with Apple, Google, phone, "Log in or sign up" | Same order, same heading | A1 |
| Wishlists (save a listing with a heart) | **Saved**: bookmark, not heart, since hearts are on the refused list; marked Later | later |

## Not taken

| Airbnb pattern | Why not |
|---|---|
| Reviews and star ratings | Refused by rule; the record is facts, not opinions |
| Photo galleries | Plans have no photos in V1; the 3D icon is the picture |
| Price and payment flow | Nothing is paid |
| Guest counts on cards ("2 guests") | Real going counts are shown only on the plan page, never on cards, to keep popularity out of the feed |
| Map that follows the device | Location is one-shot and discarded (rule 4) |
| Host and guest profiles browsable from search | People are not browsable; a profile opens only from a plan or a chat |
| Instant Book | Host approval on every ask (rule 2); host-opened plans can return later as a decision |
| Exclamation marks in notifications | Voice rule |

## Changes to earlier documents

- `12 §5` navigation: three destinations plus a floating post button becomes **five tabs with Post in the centre**.
- `15`: B1 gains the collapsing pill, the marker card carousel and the Show list pill; B3 becomes a full page with a sticky bar; E1 becomes Going with five chips; Messages becomes its own tab (F0 inbox contract to be added with M3).
- `14 §6` layout updated to five tabs.
