#!/bin/sh
# ===============================================================
# Xcode Cloud post-clone.
# ===============================================================
# This is an Expo app: the ios/ project is generated, not committed
# (it's git-ignored). Xcode Cloud clones the repo, then runs THIS before
# resolving dependencies — so here we install Node + JS deps, write the
# .env the bundler inlines, generate the native iOS project (Podfile,
# xcodeproj, shared "Nearcast" scheme), and install Pods. After this,
# Xcode Cloud archives the scheme as usual and the RN build phase embeds
# the JS bundle (a real, Metro-free Release).
#
# REQUIRED Xcode Cloud environment variables (set in the workflow):
#   EXPO_PUBLIC_SUPABASE_URL              https://<ref>.supabase.co
#   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY  the anon/publishable key
#   EXPO_PUBLIC_APP_ENV                   production   (optional)
#   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY     optional
# Without the two SUPABASE vars the app builds but runs unconfigured.
# ===============================================================
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "==> installing Node"
brew install node || brew upgrade node || true
node --version
npm --version

echo "==> installing JS dependencies"
npm ci

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

echo "==> post-clone complete"
