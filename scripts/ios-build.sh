#!/usr/bin/env bash
#
# Build-and-install for iOS — RELEASE by default.
#
# WHY RELEASE MATTERS
# A Debug build does NOT contain the JavaScript. It downloads the JS from
# the Metro dev server on the Mac at every launch, so the app only works
# while the phone is on the same Wi-Fi as the Mac. A Release build embeds
# the JS bundle in the app, so it runs anywhere, offline from the Mac,
# forever. If the app "only runs on the Mac's Wi-Fi", it is a Debug build
# — reinstall Release with this script and that goes away.
#
# Xcode also keeps a lock on build.db inside DerivedData; two builders on
# the same DerivedData fail with "database is locked" / "unable to
# initiate PIF transfer session". This script clears every holder of that
# lock and builds into a project-local DerivedData nothing else touches.
#
# Usage:
#   npm run ios:build            # RELEASE build + install on the connected device
#   npm run ios:build -- debug   # Debug build (needs Metro / same Wi-Fi) — rarely wanted
#   npm run ios:build -- sim     # Debug build for the simulator
set -euo pipefail

ARG="${1:-device}"
CONFIG="Release"
MODE="device"
case "$ARG" in
  sim)   MODE="sim";   CONFIG="Debug" ;;   # simulator uses Metro; Debug is fine
  debug) MODE="device"; CONFIG="Debug" ;;
  device|release) MODE="device"; CONFIG="Release" ;;
esac

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
rm -rf "$HOME/Library/Developer/Xcode/DerivedData"/Nearcast-* 2>/dev/null || true

SCHEME="Nearcast"
WORKSPACE="$IOS_DIR/Nearcast.xcworkspace"

if [ ! -d "$WORKSPACE" ]; then
  echo "no $WORKSPACE — run: cd ios && pod install" >&2
  exit 1
fi

if [ "$MODE" = "sim" ]; then
  DEST="platform=iOS Simulator,name=iPhone 16"
else
  DEST="generic/platform=iOS"   # no UDID needed — avoids "destination not found"
fi

echo "==> building $CONFIG for $MODE"
echo "==> derived data: $DERIVED"
set +e
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIG" \
  -destination "$DEST" \
  -derivedDataPath "$DERIVED" \
  -allowProvisioningUpdates \
  build 2>&1 | tee "$ROOT/ios/build/last-build.log" | \
  grep -E "error:|warning: .*(NearcastPlaces|deployment)|BUILD (SUCCEEDED|FAILED)|▸" || true
STATUS=${PIPESTATUS[0]}
set -e

echo
if [ "$STATUS" -ne 0 ]; then
  echo "BUILD FAILED (exit $STATUS) — full log at ios/build/last-build.log"
  grep -E "error:" "$ROOT/ios/build/last-build.log" | tail -40 || true
  exit "$STATUS"
fi
echo "BUILD SUCCEEDED ($CONFIG) — full log at ios/build/last-build.log"

if [ "$MODE" = "sim" ]; then
  echo "simulator build done; open ios/Nearcast.xcworkspace and Run on a simulator."
  exit 0
fi

# ---- install the Release app onto the connected device --------------
APP="$(/usr/bin/find "$DERIVED/Build/Products/${CONFIG}-iphoneos" -maxdepth 1 -name '*.app' 2>/dev/null | head -1)"
if [ -z "$APP" ]; then
  echo "!! built, but no .app found under ${CONFIG}-iphoneos — install from Xcode (Run)." >&2
  exit 0
fi

echo "==> finding a connected device"
DEV_JSON="$ROOT/ios/build/devices.json"
xcrun devicectl list devices --json-output "$DEV_JSON" >/dev/null 2>&1 || true
DEVICE_ID="$(node -e '
  try {
    const d = require(process.argv[1]);
    const list = (d.result && d.result.devices) || [];
    const pick = list.find(x =>
      (x.connectionProperties && /connected/i.test(x.connectionProperties.tunnelState || "")) ||
      (x.connectionProperties && /paired/i.test(x.connectionProperties.pairingState || ""))
    ) || list[0];
    if (pick) process.stdout.write(pick.hardwareProperties?.udid || pick.identifier || "");
  } catch (e) {}
' "$DEV_JSON" 2>/dev/null || true)"

if [ -z "$DEVICE_ID" ]; then
  echo "!! no connected device found. Plug in + unlock the iPhone (Trust + Developer Mode)," >&2
  echo "   then: xcrun devicectl device install app --device <UDID> \"$APP\"" >&2
  echo "   or open ios/Nearcast.xcworkspace, pick the device, and Run." >&2
  exit 0
fi

echo "==> installing on device $DEVICE_ID"
xcrun devicectl device install app --device "$DEVICE_ID" "$APP"
echo
echo "INSTALLED ($CONFIG). This build embeds the JS bundle — it runs with Metro OFF"
echo "and off the Mac's network. You can quit Metro and disconnect."
