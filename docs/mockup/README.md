# Nearcast — screen reference

Every screen in `app/` is the **app's own render**, not a reconstruction.

The app is exported for web, driven through sign-in and onboarding in a
headless browser at iPhone 16 Pro size, and each screen captured as the
DOM the app painted plus the CSS react-native-web compiled from its own
`StyleSheet.create`. Nothing here is retyped or eyeballed, so it cannot
drift from the code by anyone misreading it.

    app/<screen>.html   the rendered DOM + CSS, standalone, scripts stripped
    app/<screen>.png    the same screen as an image

## Reproducing

```bash
NEARCAST_WEB_MOCKUP=1 npx expo export --platform web --output-dir /tmp/nc-web
node capture/serve.js &                 # static host with dynamic-route rewrite
node capture/flow.js                    # sign-in, onboarding, the pager, modals
node capture/flow2.js                   # alerts, and the [id] detail routes
node capture/package.js                 # strip scripts, map fonts, write app/
```

`NEARCAST_WEB_MOCKUP=1` switches on two aliases in `metro.config.js` and
nothing else. It is never set for a native build.

## What is honest, and what is not

**True to the app.** Layout, spacing, colour, type scale, component
structure, copy, and every state the fixtures can reach. The CSS is the
app's own StyleSheets compiled by react-native-web, so values like
`letter-spacing:-0.8px` and `min-height:58px` are the ones that ship.

**Web-only artefacts, not app bugs.**

- **Icons fall back to text.** `Glyph` renders SF Symbols on iOS and a
  Material Symbols font elsewhere; the web build loads neither, so the
  dock shows `((•))`, `(:)`, `(!)`. On device these are real glyphs.
- **No native map.** `react-native-maps` has no web build, so the area
  picker's map is an empty box. Everything around it is real.
- **No blur, no haptics, no keyboard avoidance.** These are native.
- **Fixture data.** With no `EXPO_PUBLIC_SUPABASE_*` configured the app
  runs on `src/features/casts/fixtures.ts`, which is what makes the
  capture possible at all — but the names, counts and timings are
  fixtures, not production.

**Only this branch.** These are `claude/chat-push-notification-review`.
`claude/gifted-chat-integration-eval` differs — an invitation gate, a
six-step onboarding, one-time-code auth, replies and reactions — and
needs the same export run against that branch to be covered.
