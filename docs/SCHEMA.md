# 尋章摘句 — 凍結 Schema 與模組介面（v1，MVP＝前 10 關）

本檔為四個平行工作線的共同契約，**任何人不得修改本檔與 data/fixtures/**。
發現契約有問題，回報主線程，不要自行變更。

## MVP 範圍

- 第 1 章共 10 關，全部 5×5，內容＝常用成語（四字），每關 3–5 個目標。
- 方向只有 `E`（→ 橫向，左到右）與 `S`（↓ 直向，上到下）。無斜向、無反向。
- 純前端無框架、無 build step、無外部依賴。測試用 `node --test`。

## data/phrases.json（語料庫，單一事實來源）

```json
{
  "id": "p0001",
  "text": "一心一意",
  "type": "成語",
  "level": "常用",
  "source": "教育部成語典",
  "author": null,
  "origin_work": null,
  "meaning": "形容心思專一，毫無雜念。",
  "insight": "多用於形容做事專注投入，如：他一心一意準備會考。",
  "textbook": false
}
```

- `id`：`p` + 四位數字，穩定遞增。
- `text`：MVP 一律四字成語，繁體，無標點。
- `type`：MVP 只有 `"成語"`（枚舉保留：名句/唐詩/宋詞/元曲）。
- `level`：MVP 只有 `"常用"`（枚舉保留：進階/挑戰）。
- `source`：必填，MVP 一律 `"教育部成語典"`，且必須是該典真實收錄的成語，禁止捏造。
- `meaning`：白話釋義（知識卡用）。`insight`：一句用法或賞析（知識卡用）。
- `textbook`：是否為國中課本常見（布林，選填標記用）。

## data/levels.json（關卡，由 tools/generate-levels.mjs 預生成）

```json
{
  "levels": [
    {
      "id": 1,
      "chapter": 1,
      "size": 5,
      "directions": ["E", "S"],
      "targetDisplay": "text",
      "targets": [
        { "phraseId": "p0001", "start": [0, 0], "dir": "E" }
      ],
      "grid": [["一","心","一","意","風"], ["…共 5 列，每列 5 個單字"]]
    }
  ]
}
```

- 座標 `[row, col]`，0-based。`dir`: `E`=col 遞增、`S`=row 遞增。
- 目標句的路徑由 `start`+`dir`+字數推得，validate 必須重新掃描 grid 驗證一致。
- `targetDisplay`: MVP 一律 `"text"`（目標清單直接顯示句子）。
- `grid` 每格恰一個繁體中文字。

## 存檔（localStorage key `xzzj_save_v1`）

```json
{
  "v": 1,
  "levels": { "1": { "stars": 3, "found": ["p0001"] } },
  "ink": 4,
  "collection": ["p0001"],
  "quizStats": { "answered": 10, "correct": 7 }
}
```

星等規則：通關=1★；全程未用「直接揭示」=2★；完全未用任何提示=3★。

## 模組介面（js/，皆為瀏覽器 ES module；hints/learnquiz/collection 零 DOM 零 fetch，可被 node --test 直接 import）

### js/hints.js

```js
export const COSTS = { circle: 1, flash: 3, reveal: 5 };
export const EARN  = { choice: 1, fill: 2 };
export function createHintEngine(savedInk = 0) {
  return {
    getInk(),            // → number
    earn(kind),          // kind ∈ 'choice'|'fill'；只有 game 在「答對」時呼叫；回傳新餘額
    canSpend(tier),      // tier ∈ 'circle'|'flash'|'reveal' → boolean
    spend(tier),         // 扣款成功回 true；不足回 false 且不扣
    serialize()          // → number（存檔用餘額）
  };
}
```

不變式（tests 必鎖）：墨水只能由 `earn` 增加；`spend` 不足時不得變負；初始餘額=存檔值。

### js/learnquiz.js

```js
export function buildQuestions(phrases, targetIds, count) { /* → Question[] */ }
// Question = {
//   type: 'choice' | 'fill',
//   prompt: string,          // choice: 白話釋義；fill: 挖空句如「一［　］一意」
//   options?: string[4],     // choice 專用，含正解共 4 個成語，順序隨機
//   answer: string,          // choice: 正解成語全文；fill: 缺的那個字
//   phraseId: string
// }
```

- 題源優先從 `targetIds`（本關目標）抽，不足才從全庫補（「題目即提示」設計）。
- choice 的干擾選項從同 type 語料抽，不得與正解同義。
- fill 挖空位置隨機，一次只挖一字。
- 必須可傳入 seed 函式或以 Math.random 注入方式測試（介面：第 4 個選填參數 `rng = Math.random`）。

### js/collection.js

```js
export function createCollection(savedIds = []) {
  return {
    add(phraseId),   // 冪等；只有 game 在「關卡中真實找到」時呼叫
    has(phraseId),   // → boolean
    list(),          // → string[]（依加入順序）
    serialize()      // → string[]
  };
}
```

### 前端整合點（js/game.js 持有）

- 玩家答對學習題 → `hintEngine.earn(q.type === 'choice' ? 'choice' : 'fill')`
- 玩家在格中找到目標 → `collection.add(phraseId)` + 彈知識卡（meaning/insight/source）
- 提示三層：circle=圈出該句首字位置；flash=整句路徑高亮 2 秒；reveal=直接標記為已找到（該關星等封頂 1★）。

## 檔案所有權（不得越界寫檔）

| 工作線 | 只准寫 |
|---|---|
| A 語料 | `data/phrases.json`、`data/raw/**` |
| B 工具 | `tools/**` |
| C 前端 | `index.html`、`css/**`、`js/grid.js`、`js/game.js`、`js/progress.js`、`js/app.js` |
| D 學習模組 | `js/hints.js`、`js/learnquiz.js`、`js/collection.js`、`tests/**` |

共用凍結檔：`docs/SCHEMA.md`、`data/fixtures/**`。`data/levels.json` 由主線程事後執行產生器產出。

---

# Schema v2 增補（線索化＋填字模式）——本節同樣凍結

v2 兩大變更：**目標一律以創意線索呈現（不直接顯示成語）**；**新增 cross（填字）版型**。

## phrases.json v2：每條加 `clues`

```json
"clues": [
  { "style": "釋義", "text": "比喻拘泥成規不知變通。" },
  { "style": "急轉彎", "text": "有人在船上掉了劍，卻拿小刀在船邊做記號，他在幹嘛？" },
  { "style": "典故", "text": "楚國人的劍掉進江裡，他卻在船舷刻記號，打算靠岸再撈。" }
]
```

- `style` 枚舉：`釋義`（白話解釋猜謎）／`急轉彎`（腦筋急轉彎）／`典故`（典故情節描述，不點名成語）／`諧音`（諧音梗、雙關笑話）／`情境`（生活化情境短劇，台灣接地氣哏）。
- 每條至少 3 則：**必含 1 則「釋義」**（前期關卡用、最好猜）＋至少 2 則創意型（急轉彎/典故/諧音/情境擇二）。
- 硬規則：線索文字**不得包含完整成語**，也**不得包含成語中任兩個相鄰字連用**（如「守株待兔」的線索不得出現「守株」「株待」「待兔」字樣；單字出現允許；諧音同音異字允許）。
- 沒有典故的成語不硬編典故——換成急轉彈/諧音/情境即可，禁止捏造假典故。

## levels.json v2

```json
{
  "id": 7, "chapter": 1, "size": 7,
  "layout": "cross",              // "full"=尋句（灌滿干擾字）；"cross"=填字十字交叉
  "directions": ["E", "S"],
  "targetDisplay": "clue",        // v2 一律 "clue"
  "targets": [
    { "phraseId": "p0018", "start": [0,2], "dir": "S", "clueIndex": 1 }
  ],
  "grid": [[null, "…", null]],   // cross：目標路徑格存答案字元，其餘 null；full：同 v1 全字元
  "revealed": [[0,2], [2,4]]      // 僅 cross：預先顯示的格子（＝交叉點），其餘目標格畫空框
}
```

- `clueIndex` 指向該 phrase 的 `clues[clueIndex]`，產生器選定；validate 必驗 index 存在。
- 第一章配置：關 1–5 `full`（5×5；目標數 3,3,4,4,4）、關 6–7 `cross`（7×7、4 目標）、關 8–10 `cross`(8×8、5 目標)。
- 線索難度曲線：關 1–2 一律用「釋義」；關 3 起產生器輪換創意型（急轉彎/典故/諧音/情境），同一關內 style 盡量不重複。
- cross 擺盤規則：每個詞至少與另一個詞交叉一次（共用同一字），全部詞構成一個連通network；`revealed` = 恰好所有交叉格；無干擾字。
- validate 增驗：cross 的非 null 格都屬於某目標路徑；交叉格兩詞字元一致；revealed 恰等於交叉格集合；線索硬規則（不含完整成語、不含相鄰兩字連用）。

## 前端互動 v2

- 目標清單 chips：顯示 style 小標籤＋線索文字（不顯示成語）；找到/填對後翻面成成語＋劃線。
- `full` 關卡互動不變（拖選）。
- `cross` 關卡：null 格不渲染；revealed 格顯示字；其餘目標格畫空框。點任一目標格或其 chip → 選中該詞（路徑高亮＋線索顯示）→ 輸入框輸入四字成語 → 正確＝整詞填入（交叉連動）、collection.add、知識卡；錯誤＝紅閃。
- 提示三層在 cross 的對映：圈首字＝填顯該詞首格；閃現＝該詞全字暫顯 2 秒；揭示＝直接填入（仍 1★、不入圖鑑）。
- 存檔格式不變。
