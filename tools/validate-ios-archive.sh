#!/bin/sh
set -eu

archive_path="${1:-}"
if [ -z "$archive_path" ]; then
  echo "Usage: tools/validate-ios-archive.sh <path-to-xcarchive>" >&2
  exit 64
fi

if [ ! -d "$archive_path" ]; then
  echo "Archive does not exist: $archive_path" >&2
  exit 66
fi

command -v plutil >/dev/null 2>&1 || {
  echo "Missing required command: plutil" >&2
  exit 69
}
command -v rg >/dev/null 2>&1 || {
  echo "Missing required command: rg" >&2
  exit 69
}
command -v sips >/dev/null 2>&1 || {
  echo "Missing required command: sips" >&2
  exit 69
}
command -v node >/dev/null 2>&1 || {
  echo "Missing required command: node" >&2
  exit 69
}

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_directory=$(dirname -- "$script_directory")

set -- "$archive_path"/Products/Applications/*.app
if [ "$#" -ne 1 ] || [ ! -d "$1" ]; then
  echo "Expected exactly one application in archive" >&2
  exit 65
fi

app_path="$1"
app_plist="$app_path/Info.plist"
root_manifest="$app_path/PrivacyInfo.xcprivacy"
source_manifest="$repository_directory/ios/XunZhangZhaiJu/Resources/PrivacyInfo.xcprivacy"
iphone_icon="$app_path/AppIcon60x60@2x.png"
ipad_icon="$app_path/AppIcon76x76@2x~ipad.png"

assert_equal() {
  field_name="$1"
  expected_value="$2"
  actual_value="$3"
  if [ "$expected_value" != "$actual_value" ]; then
    echo "$field_name mismatch: expected '$expected_value', got '$actual_value'" >&2
    exit 65
  fi
}

expected_version=$(sed -n 's/^[[:space:]]*MARKETING_VERSION:[[:space:]]*//p' "$repository_directory/ios/project.yml" | sed -n '1p')
expected_build=$(sed -n 's/^[[:space:]]*CURRENT_PROJECT_VERSION:[[:space:]]*//p' "$repository_directory/ios/project.yml" | sed -n '1p')
expected_bundle=$(sed -n 's/^[[:space:]]*PRODUCT_BUNDLE_IDENTIFIER:[[:space:]]*//p' "$repository_directory/ios/project.yml" | sed -n '1p')
expected_sync_url=$(sed -n 's/^[[:space:]]*SYNC_API_BASE_URL:[[:space:]]*//p' "$repository_directory/ios/project.yml" | sed -n '1p')

plutil -lint "$app_plist" >/dev/null
assert_equal "Bundle ID" "$expected_bundle" "$(plutil -extract CFBundleIdentifier raw "$app_plist")"
assert_equal "Marketing version" "$expected_version" "$(plutil -extract CFBundleShortVersionString raw "$app_plist")"
assert_equal "Build number" "$expected_build" "$(plutil -extract CFBundleVersion raw "$app_plist")"
assert_equal "Encryption declaration" "false" "$(plutil -extract ITSAppUsesNonExemptEncryption raw "$app_plist")"
assert_equal "Sync API" "$expected_sync_url" "$(plutil -extract SyncAPIBaseURL raw "$app_plist")"

device_families=$(plutil -extract UIDeviceFamily json -r -o - "$app_plist")
printf '%s' "$device_families" | rg -q '1'
printf '%s' "$device_families" | rg -q '2'

for icon_specification in "$iphone_icon:120:120" "$ipad_icon:152:152"; do
  icon_path=${icon_specification%:*:*}
  icon_dimensions=${icon_specification#*:}
  expected_width=${icon_dimensions%%:*}
  expected_height=${icon_dimensions##*:}
  if [ ! -f "$icon_path" ]; then
    echo "Compiled App Icon is missing: $icon_path" >&2
    exit 65
  fi
  icon_properties=$(sips -g pixelWidth -g pixelHeight -g hasAlpha "$icon_path")
  icon_width=$(printf '%s\n' "$icon_properties" | sed -n 's/^[[:space:]]*pixelWidth:[[:space:]]*//p')
  icon_height=$(printf '%s\n' "$icon_properties" | sed -n 's/^[[:space:]]*pixelHeight:[[:space:]]*//p')
  icon_alpha=$(printf '%s\n' "$icon_properties" | sed -n 's/^[[:space:]]*hasAlpha:[[:space:]]*//p')
  assert_equal "Compiled App Icon width" "$expected_width" "$icon_width"
  assert_equal "Compiled App Icon height" "$expected_height" "$icon_height"
  assert_equal "Compiled App Icon alpha" "no" "$icon_alpha"
done

if [ ! -f "$root_manifest" ] || ! cmp -s "$source_manifest" "$root_manifest"; then
  echo "Bundled root privacy manifest is missing or differs from source" >&2
  exit 65
fi

manifest_total=0
while IFS= read -r manifest_path; do
  plutil -lint "$manifest_path" >/dev/null
  manifest_total=$((manifest_total + 1))
done <<EOF
$(rg --files "$app_path" | rg 'PrivacyInfo\.xcprivacy$')
EOF

if [ "$manifest_total" -lt 1 ]; then
  echo "No privacy manifests found in archive" >&2
  exit 65
fi

node "$repository_directory/tools/validate-app-privacy.mjs" "$app_path"

echo "iOS archive validated: $expected_bundle $expected_version ($expected_build), iPhone+iPad icons, $manifest_total privacy manifests"
