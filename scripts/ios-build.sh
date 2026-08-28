#!/usr/bin/env bash
#
# Unlock-and-build for iOS.
#
# Xcode's build system keeps a lock on build.db inside DerivedData.
# Two builders touching the same DerivedData (Xcode + xcodebuild, or
# a .xcodeproj window and a .xcworkspace window, or a stale
# XCBBuildService) produce:
#
#   error: unable to attach DB: ... build.db: database is locked
#   error: unable to initiate PIF transfer session (operation in progress?)
#
# This script clears every holder of that lock, then builds into a
# PROJECT-LOCAL DerivedData directory that nothing else touches. That
# removes the shared-lock failure mode entirely.
#
# Usage:
#   npm run ios:build            # build for a connected device
#   npm run ios:build -- sim     # build for the simulator instead
#
set -euo pipefail

MODE="${1:-device}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT/ios"
DERIVED="$ROOT/ios/build/DerivedData"

if [ ! -d "$IOS_DIR" ]; then
  echo "no ios/ directory — run: npx expo prebuild --platform ios" >&2
  exit 1
fi

echo "==> releasing any build locks"
osascript -e 'quit app "Xcode"' 2>/dev/null || true
pkill -9 xcodebuild 2>/dev/null || true
pkill -9 XCBBuildService 2>/dev/null || true
pkill -9 SWBBuildService 2>/dev/null || true
sleep 2

still_running="$(pgrep -l 'xcodebuild|XCBBuildService|SWBBuildService' || true)"
if [ -n "$still_running" ]; then
  echo "!! build processes still alive after kill:" >&2
  echo "$still_running" >&2
  echo "   reboot, or kill these PIDs by hand, then re-run." >&2
  exit 1
fi
echo "    clear"

echo "==> clearing stale derived data"
rm -rf "$DERIVED"
# The shared location is what Xcode.app uses; clearing it stops a
# half-written graph from poisoning the next Xcode-driven build too.
rm -rf "$HOME/Library/Developer/Xcode/DerivedData"/Nearcast-* 2>/dev/null || true

SCHEME="Nearcast"
WORKSPACE="$IOS_DIR/Nearcast.xcworkspace"

if [ ! -d "$WORKSPACE" ]; then
  echo "no $WORKSPACE — run: cd ios && pod install" >&2
  exit 1
fi

if [ "$MODE" = "sim" ]; then
  DEST="platform=iOS Simulator,name=iPhone 16"
  echo "==> building for simulator"
else
  DEST="generic/platform=iOS"
  echo "==> building for device"
fi

echo "==> derived data: $DERIVED"
set +e
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -destination "$DEST" \
  -derivedDataPath "$DERIVED" \
  -allowProvisioningUpdates \
  build 2>&1 | tee "$ROOT/ios/build/last-build.log" | \
  grep -E "error:|warning: .*(NearcastPlaces|deployment)|BUILD (SUCCEEDED|FAILED)|▸" || true
STATUS=${PIPESTATUS[0]}
set -e

echo
if [ "$STATUS" -eq 0 ]; then
  echo "BUILD SUCCEEDED — full log at ios/build/last-build.log"
  echo "open ios/Nearcast.xcworkspace and hit Run to install on the device."
else
  echo "BUILD FAILED (exit $STATUS) — full log at ios/build/last-build.log"
  echo "last 40 error lines:"
  grep -E "error:" "$ROOT/ios/build/last-build.log" | tail -40 || true
  exit "$STATUS"
fi
