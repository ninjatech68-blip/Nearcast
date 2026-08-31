# Nearcast Implementation Plan Index

Execute one plan at a time. A later plan may begin only when the earlier plan's exit gate is met or a documented product decision changes the order.

1. [Foundation](./01 - Foundation Implementation Plan.md)
2. [Intent Creation And Sharing](./02 - Intent Sharing Implementation Plan.md)
3. [Discovery And Controlled Reach](./03 - Discovery and Reach Implementation Plan.md)
4. [Responses And Coordination](./04 - Response and Coordination Implementation Plan.md)
5. [Trust, Safety, Analytics, And Release](./05 - Trust Safety and Release Implementation Plan.md)

## How To Read The Checkboxes

Trust them for what they say, and not for what their absence implies.

These plans went unmaintained through roughly 130 commits on the branch that
became trunk: substantial work shipped and reached real devices while every box
stayed empty. On 2026-08-31 the boxes covering work verified that day were
ticked, and several were annotated `[~]` where a task is genuinely part-done,
with the remainder named.

Every other empty box is unaudited rather than untouched. Some of that work
exists and was never recorded; some does not. Ticking them wholesale would have
been faster and would have made this document worthless, which is the failure it
is recovering from. The audit is outstanding, and until it happens the code and
`npm run verify` are the authority on what exists.

## Change Log

| Date | Change |
|---|---|
| 2026-08-24 | Added the ordered implementation plan index |
| 2026-08-31 | Recorded that the checkboxes went unmaintained, and how to read them until they are audited |
