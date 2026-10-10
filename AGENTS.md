# AGENTS.md｜給之後維護這個網站的 AI

這是學員自己的獨立 Astro 網站，不是工作坊研究 Repo。**不要重跑 `export-starter.mjs` 覆蓋網站。**

## 單一資料來源
- 主導覽（桌機 `SiteNav`、手機 `MobileMenu`、頁尾、404、Sitemap、搜尋索引）：`site.config.json` → `navigation`。項目可用 `path` 指定網址，未指定時為 `/<id>/`；`parentId` 建立第二層（不支援第三層）。
- 公開文章：一律透過 `src/lib/site.ts` 的 `publishedArticles()`。列表、文章頁、RSS、Sitemap、`search/exact-zh.json` 都只用它，草稿才不會外洩。**不要直接呼叫 `getCollection('articles')`。**
- 分類：`src/data/topics.ts`（slug 發布後不要改）。

## 重用的工作坊元件
`src/components/blocks/`、`effects/`、`patterns/` 來自工作坊 AI 建站資料包（Blocks／Effects／Section Patterns）。樣式在 `src/styles/blocks-ported.css`，色彩只透過 `src/styles/tokens.css` 的 token。新增元件前先檢查這些目錄，避免重複造。

## 必經流程
Branch → PR → `npm run build` → `npm run qa:static` → `npm run qa:browser` → 真實 Preview（核對 Head SHA）→ 1440／1280／768／390 → 學員明確同意 → Merge。
