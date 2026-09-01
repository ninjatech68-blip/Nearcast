#!/usr/bin/env bash
#
# Local iOS build + install — RELEASE by default.
#
# WHY RELEASE MATTERS
# A Debug build does NOT contain the JavaScript. It fetches the JS from the
# Metro dev server on this Mac at every launch, so the app only runs while the
# phone is on the same Wi-Fi — and dies at the splash screen otherwise. A
# Release build embeds the bundle, so the app runs anywhere, offline from the
# Mac, forever. Xcode's Run button defaults to DEBUG, which is how a Debug
# build ends up on the phone by accident. This script always builds Release
# unless you explicitly ask for debug, and it FAILS if the JS bundle did not
# get embedded — the check that catches the problem before the phone does.
#
# Usage:
#   npm run ios:build                 # Release, build + install on the device
#   npm run ios:build -- prebuild     # regenerate ios/ from app.json first
#   npm run ios:build -- debug        # Debug (needs Metro + same Wi-Fi)
#   npm run ios:build -- sim          # Debug for the simulator
#
# Signing: pass your Apple team id if the project has none saved yet:
#   DEVELOPMENT_TEAM=ABCDE12345 npm run ios:build
#
# NEW DEVICE (e.g. a second tester phone): a build for the generic iOS
# destination does NOT register a device with the team, so its provisioning
# profile omits it and the install fails with
#   "This provisioning profile cannot be installed on this device."
# Target the device explicitly and Xcode registers it and reissues the profile:
#   IOS_DEVICE_UDID=<udid> npm run ios:build
# The build then installs to that exact device rather than the first one found.
set -euo pipefail

ARG="${1:-device}"
CONFIG="Release"
MODE="device"
PREBUILD="auto"
case "$ARG" in
  sim)      MODE="sim";    CONFIG="Debug" ;;
  debug)    MODE="device"; CONFIG="Debug" ;;
  prebuild) MODE="device"; CONFIG="Release"; PREBUILD="force" ;;
  device|release) : ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT/ios"
DERIVED="$ROOT/ios/build/DerivedData"
cd "$ROOT"

# ---- 1. regenerate the native project when asked, or when missing ----
if [ "$PREBUILD" = "force" ] || [ ! -d "$IOS_DIR" ]; then
  echo "==> regenerating ios/ from app.json (expo prebuild)"
  npx expo prebuild --platform ios --clean
fi

# ---- 2. find the workspace + scheme (name comes from app.json) -------
WORKSPACE="$(/usr/bin/find "$IOS_DIR" -maxdepth 1 -name '*.xcworkspace' | head -1)"
if [ -z "$WORKSPACE" ]; then
  echo "!! no .xcworkspace in ios/ — run: npm run ios:build -- prebuild" >&2
  exit 1
fi
SCHEME="$(basename "$WORKSPACE" .xcworkspace)"
echo "==> workspace: $(basename "$WORKSPACE")"
echo "==> scheme:    $SCHEME"

# ---- 3. release any build locks (shared DerivedData deadlocks) -------
echo "==> releasing build locks"
osascript -e 'quit app "Xcode"' 2>/dev/null || true
pkill -9 xcodebuild 2>/dev/null || true
pkill -9 XCBBuildService 2>/dev/null || true
pkill -9 SWBBuildService 2>/dev/null || true
sleep 2
rm -rf "$DERIVED"
rm -rf "$HOME/Library/Developer/Xcode/DerivedData"/"$SCHEME"-* 2>/dev/null || true

# ---- 4. signing team ------------------------------------------------
TEAM="${DEVELOPMENT_TEAM:-}"
if [ -z "$TEAM" ]; then
  # Reuse whatever the generated project already has. Xcode writes the id
  # either bare or quoted — DEVELOPMENT_TEAM = ABCDE12345; and
  # DEVELOPMENT_TEAM = "ABCDE12345"; are both normal — so match both. The
  # bare-only pattern this used to have silently found nothing on a
  # project that did carry a team, and sent people hunting for an id the
  # file was already holding.
  TEAM="$(sed -nE 's/.*DEVELOPMENT_TEAM = "?([A-Z0-9]{10})"?;.*/\1/p' \
    "$IOS_DIR/$SCHEME.xcodeproj/project.pbxproj" 2>/dev/null | head -1 || true)"
  [ -n "$TEAM" ] && echo "==> reusing the team already in the project"
fi
TEAM_ARGS=()
if [ -n "$TEAM" ]; then
  echo "==> signing with team $TEAM"
  TEAM_ARGS=("DEVELOPMENT_TEAM=$TEAM" "CODE_SIGN_STYLE=Automatic")
else
  echo "!! no DEVELOPMENT_TEAM found. If signing fails, re-run as:" >&2
  echo "   DEVELOPMENT_TEAM=<your 10-char team id> npm run ios:build" >&2
  echo "   (find it: Xcode > Settings > Accounts > your team, or" >&2
  echo "    security find-identity -v -p codesigning)" >&2
  echo "   note: a fresh 'prebuild' writes a project with NO team, so" >&2
  echo "   the first build after one always needs the variable." >&2
fi

TARGET_UDID="${IOS_DEVICE_UDID:-}"
if [ "$MODE" = "sim" ]; then
  DEST="platform=iOS Simulator,name=iPhone 16"
elif [ -n "$TARGET_UDID" ]; then
  # building AT a specific device is what makes automatic signing register
  # it with the team and reissue a profile that includes it.
  DEST="id=$TARGET_UDID"
  echo "==> targeting device $TARGET_UDID (registers it for signing)"
else
  DEST="generic/platform=iOS"   # no UDID: avoids "destination not found"
fi

# ---- 5. build -------------------------------------------------------
echo "==> building $CONFIG for $MODE"
mkdir -p "$ROOT/ios/build"
set +e
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIG" \
  -destination "$DEST" \
  -derivedDataPath "$DERIVED" \
  -allowProvisioningUpdates \
  ${TEAM_ARGS[@]+"${TEAM_ARGS[@]}"} \
  build 2>&1 | tee "$ROOT/ios/build/last-build.log"
STATUS=${PIPESTATUS[0]}
set -e

if [ "$STATUS" -ne 0 ]; then
  echo
  echo "BUILD FAILED (exit $STATUS) — full log at ios/build/last-build.log"
  grep -E "error:" "$ROOT/ios/build/last-build.log" | tail -40 || true
  exit "$STATUS"
fi
echo "BUILD SUCCEEDED ($CONFIG)"

if [ "$MODE" = "sim" ]; then
  echo "simulator build done; open $(basename "$WORKSPACE") and Run."
  exit 0
fi

# ---- 6. locate the app ----------------------------------------------
APP="$(/usr/bin/find "$DERIVED/Build/Products/${CONFIG}-iphoneos" -maxdepth 1 -name '*.app' 2>/dev/null | head -1)"
if [ -z "$APP" ]; then
  echo "!! built, but no .app under ${CONFIG}-iphoneos" >&2
  exit 1
fi
echo "==> app: $APP"

# ---- 7. PROVE the JS bundle is embedded -----------------------------
# This is the whole point of a Release build. Without main.jsbundle the app
# falls back to Metro and dies at the splash screen off-network.
if [ "$CONFIG" = "Release" ]; then
  if [ ! -f "$APP/main.jsbundle" ]; then
    echo >&2
    echo "!! FAIL: main.jsbundle is NOT in the app bundle." >&2
    echo "!! This build would still need Metro and would crash at the splash" >&2
    echo "!! screen off your Mac's network. Not installing it." >&2
    echo "!! Fix: npm run ios:build -- prebuild   (regenerates the RN bundle phase)" >&2
    exit 1
  fi
  SIZE="$(du -h "$APP/main.jsbundle" | awk '{print $1}')"
  echo "==> JS bundle embedded: main.jsbundle ($SIZE)  <-- runs without Metro"
fi

# ---- 8. install on the connected device ------------------------------
if [ -n "$TARGET_UDID" ]; then
  echo "==> installing on the targeted device $TARGET_UDID"
  xcrun devicectl device install app --device "$TARGET_UDID" "$APP"
  echo
  echo "INSTALLED ($CONFIG) on $TARGET_UDID with the JS bundle embedded."
  echo "Quit Metro, unplug, leave this Mac's Wi-Fi — the app keeps working."
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
  echo "!! no connected device. Plug in + unlock the iPhone (Trust + Developer Mode)," >&2
  echo "   then: xcrun devicectl device install app --device <UDID> \"$APP\"" >&2
  exit 0
fi

echo "==> installing on device $DEVICE_ID"
xcrun devicectl device install app --device "$DEVICE_ID" "$APP"
echo
echo "INSTALLED ($CONFIG) with the JS bundle embedded."
echo "Quit Metro, unplug, leave this Mac's Wi-Fi — the app keeps working."
