#!/bin/sh
# ===============================================================
# Xcode Cloud post-clone.
# ===============================================================
# This is an Expo app: the ios/ project is generated, not committed
# (it's git-ignored). Xcode Cloud clones the repo, then runs THIS before
# resolving dependencies — so here we install Node + JS deps, write the
# .env the bundler inlines, generate the native iOS project (Podfile,
# xcodeproj, shared scheme), and install Pods. Xcode Cloud then archives
# the scheme, and the RN build phase embeds the JS bundle — a real,
# Metro-free Release.
#
# REQUIRED Xcode Cloud environment variables (set in the workflow):
#   EXPO_PUBLIC_SUPABASE_URL              https://<ref>.supabase.co
#   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY  the anon/publishable key
# OPTIONAL:
#   EXPO_PUBLIC_APP_ENV                   defaults to production
#   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
# ===============================================================
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "==> checking required environment variables"
# Fail loudly rather than shipping a build that cannot reach the backend.
missing=""
[ -z "$EXPO_PUBLIC_SUPABASE_URL" ] && missing="$missing EXPO_PUBLIC_SUPABASE_URL"
[ -z "$EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" ] && missing="$missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
if [ -n "$missing" ]; then
  echo "!! missing required environment variable(s):$missing" >&2
  echo "!! set them on the Xcode Cloud workflow (Environment), then re-run." >&2
  exit 1
fi
case "$EXPO_PUBLIC_SUPABASE_URL" in
  http*) : ;;
  *) echo "!! EXPO_PUBLIC_SUPABASE_URL must be a full https URL" >&2; exit 1 ;;
esac
echo "    supabase url: $EXPO_PUBLIC_SUPABASE_URL"

echo "==> installing Node"
brew install node || brew upgrade node || true
node --version
npm --version

echo "==> installing JS dependencies"
# `npm ci` is the reproducible path and requires the lockfile to match
# package.json exactly. If a dependency was added to package.json but its
# lockfile entries have not landed yet, npm ci fails hard — fall back to
# `npm install` so a build is never blocked on lockfile drift.
npm ci || {
  echo "!! npm ci failed (lockfile out of sync) — falling back to npm install"
  npm install
}

echo "==> writing .env for the bundler"
cat > .env <<EOF
EXPO_PUBLIC_APP_ENV=${EXPO_PUBLIC_APP_ENV:-production}
EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=${EXPO_PUBLIC_GOOGLE_PLACES_API_KEY}
EOF

echo "==> generating native iOS project (expo prebuild)"
npx expo prebuild --platform ios --no-install

echo "==> installing CocoaPods"
cd ios
pod install

# Print what was generated: if the Xcode Cloud workflow references a
# scheme name other than the one listed here, the build will fail to find
# it — this line is what tells you so.
echo "==> generated Xcode project + schemes:"
ls -d *.xcodeproj *.xcworkspace 2>/dev/null || true
ls *.xcodeproj/xcshareddata/xcschemes/ 2>/dev/null || true

echo "==> post-clone complete"
