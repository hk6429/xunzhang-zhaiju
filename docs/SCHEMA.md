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
