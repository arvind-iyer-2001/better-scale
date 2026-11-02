#!/bin/bash
# Re-applies the app icon and black splash screen to the generated ios/ project (ios/ is git-ignored and
# `expo prebuild` resets it). Run after prebuild: bash scripts/apply-native-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
uv run --with pillow python scripts/gen_icon.py
cp assets/icon.png ios/betterscale/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
D=ios/betterscale/Images.xcassets/SplashScreenLogo.imageset
mkdir -p "$D" && cp assets/splash-icon.png "$D/splash-icon.png"
cat > "$D/Contents.json" <<'J'
{ "images": [ { "idiom": "universal", "scale": "1x" }, { "idiom": "universal", "scale": "2x" }, { "idiom": "universal", "filename": "splash-icon.png", "scale": "3x" } ], "info": { "version": 1, "author": "xcode" } }
J
python3 - <<'P'
p = 'ios/betterscale/SplashScreen.storyboard'
s = open(p).read()
s = s.replace('image="SplashScreen" translatesAutoresizingMaskIntoConstraints', 'image="SplashScreenLogo" translatesAutoresizingMaskIntoConstraints')
s = s.replace('<rect key="frame" x="146.66666666666666" y="381" width="100" height="90.333333333333314"/>', '<rect key="frame" x="96.5" y="326" width="200" height="200"/>')
s = s.replace('<color key="backgroundColor" systemColor="systemBackgroundColor"/>', '<color key="backgroundColor" red="0.0" green="0.0" blue="0.0" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>')
s = s.replace('<image name="SplashScreenLogo" width="100" height="90.333335876464844"/>', '<image name="SplashScreenLogo" width="200" height="200"/>')
open(p, 'w').write(s)
P
echo done
