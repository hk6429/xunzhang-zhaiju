import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

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
  const output = execFileSync(
    "sips",
    ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "hasAlpha", screenshot.path],
    { encoding: "utf8" },
  );
  const width = property(output, "pixelWidth");
  const height = property(output, "pixelHeight");
  const hasAlpha = textProperty(output, "hasAlpha");
  if (!screenshot.accepted.some(([w, h]) => width === w && height === h)) {
    throw new Error(`${screenshot.path} 尺寸 ${width}x${height} 不在接受清單`);
  }
  if (hasAlpha !== "no") throw new Error(`${screenshot.path} 含有 alpha channel`);
}

const metadata = readFileSync("docs/app-store/metadata-zh-Hant.md", "utf8");
const name = lineValue(metadata, "名稱");
const subtitle = lineValue(metadata, "副標題");
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

console.log(
  `App Store 素材驗證通過：${screenshots.length} 張無透明通道截圖；`
  + `名稱 ${[...name].length} 字、副標題 ${[...subtitle].length} 字、`
  + `宣傳文字 ${[...promotional].length} 字、描述 ${[...description].length} 字、`
  + `關鍵字 ${keywordBytes} bytes。`,
);

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
