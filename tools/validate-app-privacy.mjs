import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryPath = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(repositoryPath);

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error("用法：node tools/validate-app-privacy.mjs /path/to/XunZhangZhaiJu.xcarchive-or-app");
}

const contract = JSON.parse(readFileSync("docs/app-store/privacy-contract.json", "utf8"));
const absoluteInputPath = resolve(inputPath);
const appPath = absoluteInputPath.endsWith(".app")
  ? absoluteInputPath
  : join(absoluteInputPath, "Products/Applications/XunZhangZhaiJu.app");
const manifestOutput = execFileSync("find", [appPath, "-name", "PrivacyInfo.xcprivacy", "-print0"]);
const manifestPaths = manifestOutput.toString("utf8").split("\0").filter(Boolean).sort();
assertEqual("privacy manifest 數量", contract.manifestCount, manifestPaths.length);

const collectedData = new Map();
const requiredReasonAPIs = new Map();
const trackingDomains = new Set();
let tracking = false;

for (const manifestPath of manifestPaths) {
  const manifest = plist(manifestPath);
  tracking ||= manifest.NSPrivacyTracking === true;
  for (const domain of manifest.NSPrivacyTrackingDomains ?? []) trackingDomains.add(domain);

  for (const entry of manifest.NSPrivacyCollectedDataTypes ?? []) {
    const type = entry.NSPrivacyCollectedDataType;
    if (!type) throw new Error(`${manifestPath} collected data 缺少 type`);
    const aggregate = collectedData.get(type) ?? {
      type,
      linked: false,
      tracking: false,
      purposes: new Set(),
    };
    aggregate.linked ||= entry.NSPrivacyCollectedDataTypeLinked === true;
    aggregate.tracking ||= entry.NSPrivacyCollectedDataTypeTracking === true;
    for (const purpose of entry.NSPrivacyCollectedDataTypePurposes ?? []) aggregate.purposes.add(purpose);
    collectedData.set(type, aggregate);
  }

  for (const entry of manifest.NSPrivacyAccessedAPITypes ?? []) {
    const type = entry.NSPrivacyAccessedAPIType;
    if (!type) throw new Error(`${manifestPath} required-reason API 缺少 type`);
    const reasons = requiredReasonAPIs.get(type) ?? new Set();
    for (const reason of entry.NSPrivacyAccessedAPITypeReasons ?? []) reasons.add(reason);
    requiredReasonAPIs.set(type, reasons);
  }
}

const actualCollectedData = [...collectedData.values()]
  .map((entry) => ({
    type: entry.type,
    linked: entry.linked,
    tracking: entry.tracking,
    purposes: [...entry.purposes].sort(),
  }))
  .sort(byType);
const expectedCollectedData = contract.collectedData
  .map(({ labelZhHant: _label, ...entry }) => ({ ...entry, purposes: [...entry.purposes].sort() }))
  .sort(byType);
assertJSON("聚合 collected data", expectedCollectedData, actualCollectedData);

const actualRequiredReasonAPIs = [...requiredReasonAPIs.entries()]
  .map(([type, reasons]) => ({ type, reasons: [...reasons].sort() }))
  .sort(byType);
const expectedRequiredReasonAPIs = contract.requiredReasonAPIs
  .map((entry) => ({ ...entry, reasons: [...entry.reasons].sort() }))
  .sort(byType);
assertJSON("聚合 required-reason APIs", expectedRequiredReasonAPIs, actualRequiredReasonAPIs);
assertEqual("tracking", contract.tracking, tracking);
assertJSON("tracking domains", [...contract.trackingDomains].sort(), [...trackingDomains].sort());

const packageResolved = JSON.parse(
  readFileSync("ios/XunZhangZhaiJu.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved", "utf8"),
);
const actualPackages = Object.fromEntries(
  packageResolved.pins.map((pin) => [pin.identity, pin.state.version]).sort(([left], [right]) => left.localeCompare(right)),
);
assertJSON("Swift package pins", contract.packages, actualPackages);
for (const identity of Object.keys(actualPackages)) {
  const normalized = identity.toLowerCase().replaceAll(/[^a-z0-9]/gu, "");
  for (const term of contract.prohibitedPackageTerms) {
    if (normalized.includes(term)) throw new Error(`禁止的分析／廣告／回報套件：${identity}`);
  }
}

const entitlements = plist("ios/Config/XunZhangZhaiJu.entitlements");
if ("aps-environment" in entitlements) throw new Error("App 不應包含推播 aps-environment entitlement");
const sourceInfo = plist("ios/Config/Info.plist");
if ("NSUserTrackingUsageDescription" in sourceInfo) throw new Error("App 不應要求追蹤授權");
const archiveInfo = plist(join(appPath, "Info.plist"));
assertEqual("ITSAppUsesNonExemptEncryption", false, archiveInfo.ITSAppUsesNonExemptEncryption);

const binaryStrings = execFileSync("strings", [join(appPath, "XunZhangZhaiJu")], { encoding: "utf8" });
for (const expectedURL of [
  "https://xunzhang-zhaiju.pages.dev/privacy.html",
  "https://xunzhang-zhaiju.pages.dev/support.html",
]) {
  if (!binaryStrings.includes(expectedURL)) throw new Error(`Release binary 缺少 ${expectedURL}`);
}

const privacyDraft = readFileSync("docs/app-store/app-privacy.md", "utf8");
const publicPolicy = readFileSync("privacy.html", "utf8");
for (const entry of contract.collectedData) {
  if (!privacyDraft.includes(entry.labelZhHant)) throw new Error(`App Privacy 草案缺少：${entry.labelZhHant}`);
}
for (const label of ["姓名", "電子郵件", "電話號碼", "概略位置", "裝置 ID", "其他使用狀況資料"]) {
  if (!publicPolicy.includes(label)) throw new Error(`公開隱私政策缺少 Google Sign-In disclosure：${label}`);
}

console.log(
  `App privacy validated: ${manifestPaths.length} manifests, ${actualCollectedData.length} data types, `
  + `${actualRequiredReasonAPIs.length} required-reason API category, ${Object.keys(actualPackages).length} pinned packages, no tracking/ad/crash/push SDK.`,
);

function plist(path) {
  try {
    return JSON.parse(execFileSync("plutil", ["-convert", "json", "-o", "-", path], { encoding: "utf8" }));
  } catch (error) {
    throw new Error(`無法解析 plist：${basename(path)}`, { cause: error });
  }
}

function byType(left, right) {
  return left.type.localeCompare(right.type);
}

function assertEqual(label, expected, actual) {
  if (actual !== expected) throw new Error(`${label} 應為 ${String(expected)}，目前為 ${String(actual)}`);
}

function assertJSON(label, expected, actual) {
  const expectedJSON = JSON.stringify(expected);
  const actualJSON = JSON.stringify(actual);
  if (actualJSON !== expectedJSON) {
    throw new Error(`${label} 不一致\nexpected: ${expectedJSON}\nactual:   ${actualJSON}`);
  }
}
