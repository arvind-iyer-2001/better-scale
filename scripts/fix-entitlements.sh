#!/bin/bash
# Free Personal Team cannot use Push Notifications: strip aps-environment that the
# expo-notifications plugin writes on every prebuild. Keeps the HealthKit entitlement.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in ios/*/*.entitlements; do
  /usr/libexec/PlistBuddy -c "Delete :aps-environment" "$f" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Delete :com.apple.developer.healthkit.background-delivery" "$f" 2>/dev/null || true
  echo "patched $f"
  /usr/libexec/PlistBuddy -c "Print" "$f"
done
