import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const screenshots = [
  {
    path: "artifacts/app-store/screenshots/iphone-17-pro-max-home.jpg",
    accepted: [[1260, 2736], [1290, 2796], [1320, 2868]],
  },
  {
    path: "artifacts/app-store/screenshots/ipad-pro-13-home.jpg",
    accepted: [[2064, 2752], [2048, 2732]],
  },
];

for (const screenshot of screenshots) {
  const { width, height, hasAlpha } = imageProperties(screenshot.path);
  if (!screenshot.accepted.some(([w, h]) => width === w && height === h)) {
    throw new Error(`${screenshot.path} 尺寸 ${width}x${height} 不在接受清單`);
  }
  if (hasAlpha !== "no") throw new Error(`${screenshot.path} 含有 alpha channel`);
}

const iconManifestPath = "ios/XunZhangZhaiJu/Resources/Assets.xcassets/AppIcon.appiconset/Contents.json";
const iconManifest = JSON.parse(readFileSync(iconManifestPath, "utf8"));
const iconEntry = iconManifest.images?.find(
  (entry) => entry.idiom === "universal" && entry.platform === "ios" && entry.size === "1024x1024",
);
if (!iconEntry?.filename) throw new Error("AppIcon.appiconset 缺少 iOS universal 1024x1024 圖檔");
const iconDirectory = dirname(iconManifestPath);
const iconPath = normalize(join(iconDirectory, iconEntry.filename));
if (!iconPath.startsWith(`${iconDirectory}/`)) throw new Error("App Icon filename 不可離開 appiconset");
const icon = imageProperties(iconPath, true);
if (icon.width !== 1024 || icon.height !== 1024) {
  throw new Error(`${iconPath} 尺寸必須為 1024x1024，目前為 ${icon.width}x${icon.height}`);
}
if (icon.format !== "png") throw new Error(`${iconPath} 必須為 PNG，目前為 ${icon.format}`);
if (icon.hasAlpha !== "no") throw new Error(`${iconPath} 含有 alpha channel`);

const metadata = readFileSync("docs/app-store/metadata-zh-Hant.md", "utf8");
const name = lineValue(metadata, "名稱");
const subtitle = lineValue(metadata, "副標題");
const supportURL = lineValue(metadata, "Support URL");
const privacyURL = lineValue(metadata, "Privacy Policy URL");
const promotional = section(metadata, "Promotional Text", "Description");
const description = section(metadata, "Description", "Keywords");
const keywords = section(metadata, "Keywords", "URLs").match(/`([^`]+)`/u)?.[1];
if (!keywords) throw new Error("找不到 Keywords");

boundedCharacters("名稱", name, 30);
boundedCharacters("副標題", subtitle, 30);
boundedCharacters("Promotional Text", promotional, 170);
boundedCharacters("Description", description, 4_000);
const keywordBytes = Buffer.byteLength(keywords, "utf8");
if (keywordBytes > 100) throw new Error(`Keywords 為 ${keywordBytes} bytes，超過 100`);

const publicPages = [
  {
    path: "support.html",
    url: "https://xunzhang-zhaiju.pages.dev/support.html",
    title: "使用支援｜尋章摘句",
    requiredText: "issues/new?template=support.yml",
  },
  {
    path: "privacy.html",
    url: "https://xunzhang-zhaiju.pages.dev/privacy.html",
    title: "隱私權政策｜尋章摘句",
    requiredText: "support.html",
  },
];
assertEqual("Support URL", publicPages[0].url, supportURL);
assertEqual("Privacy Policy URL", publicPages[1].url, privacyURL);

for (const page of publicPages) {
  const html = readFileSync(page.path, "utf8");
  if (!html.includes(`<title>${page.title}</title>`)) throw new Error(`${page.path} 缺少正確標題`);
  if (!html.includes(page.requiredText)) throw new Error(`${page.path} 缺少必要支援連結`);
  if (/【上線前|TODO|TBD/u.test(html)) throw new Error(`${page.path} 仍含發布前 placeholder`);
}

const homepage = readFileSync("index.html", "utf8");
for (const page of publicPages) {
  if (!homepage.includes(`href="${page.path}"`)) throw new Error(`首頁缺少 ${page.path} 入口`);
}

const profileView = readFileSync("ios/XunZhangZhaiJu/Features/Profile/ProfileView.swift", "utf8");
for (const page of publicPages) {
  if (!profileView.includes(page.url)) throw new Error(`SwiftUI 我的頁缺少 ${page.url}`);
}
const supportTemplate = readFileSync(".github/ISSUE_TEMPLATE/support.yml", "utf8");
if (!supportTemplate.includes("請勿填寫姓名、電子郵件、學校、班級")) {
  throw new Error("公開支援表單缺少個資提醒");
}

console.log(
  `App Store 素材驗證通過：1024x1024 無透明通道 PNG App Icon、${screenshots.length} 張無透明通道截圖；`
  + `名稱 ${[...name].length} 字、副標題 ${[...subtitle].length} 字、`
  + `宣傳文字 ${[...promotional].length} 字、描述 ${[...description].length} 字、`
  + `關鍵字 ${keywordBytes} bytes、${publicPages.length} 個公開頁面入口。`,
);

function imageProperties(path, includeFormat = false) {
  const keys = ["pixelWidth", "pixelHeight", "hasAlpha"];
  if (includeFormat) keys.push("format");
  const argumentsList = keys.flatMap((key) => ["-g", key]);
  const output = execFileSync("sips", [...argumentsList, path], { encoding: "utf8" });
  return {
    width: property(output, "pixelWidth"),
    height: property(output, "pixelHeight"),
    hasAlpha: textProperty(output, "hasAlpha"),
    format: includeFormat ? textProperty(output, "format") : undefined,
  };
}

function property(output, key) {
  const value = Number(textProperty(output, key));
  if (!Number.isInteger(value)) throw new Error(`無法讀取 ${key}`);
  return value;
}

function textProperty(output, key) {
  const match = output.match(new RegExp(`\\b${key}:\\s*([^\\n]+)`, "u"));
  if (!match) throw new Error(`無法讀取 ${key}`);
  return match[1].trim();
}

function lineValue(text, label) {
  const match = text.match(new RegExp(`^- ${label}：(.+)$`, "mu"));
  if (!match) throw new Error(`找不到 ${label}`);
  return match[1].trim();
}

function section(text, start, end) {
  const marker = `## ${start}\n\n`;
  const startIndex = text.indexOf(marker);
  const endIndex = text.indexOf(`\n\n## ${end}`, startIndex + marker.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`找不到 ${start} 區段`);
  return text.slice(startIndex + marker.length, endIndex).trim();
}

function boundedCharacters(label, value, maximum) {
  const count = [...value].length;
  if (count > maximum) throw new Error(`${label} 為 ${count} 字，超過 ${maximum}`);
}

function assertEqual(label, expected, actual) {
  if (actual !== expected) throw new Error(`${label} 應為 ${expected}，目前為 ${actual}`);
}
