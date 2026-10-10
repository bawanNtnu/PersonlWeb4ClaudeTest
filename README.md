# 陽台觀察室（工作坊驗收用模擬網站）

> 本 Repo 是「Astro 架站工作坊」端對端驗收的**學員網站**。人物「阿蕨」與所有文章皆為虛構示範，不代表真實個人、資格或成效。

- 版型：工作坊 Layout A01 **field-notes 田野筆記**（側邊索引、超大三行標題、邊注、日期帳本）
- 品牌：植感 botanical，主色 `#3F6A4D`（`site-brief.json` → `site.config.json`）
- 技術：Astro 5 靜態網站 + Pagefind 全站搜尋，RSS／Sitemap／robots 由 `src/pages/*.js` 產生

## 日常維護（給學員）
| 想做的事 | 改哪裡 |
|---|---|
| 寫新文章 | 新增 `src/content/articles/<英文網址>.md`，先寫 `draft: true`，預覽沒問題再改成 `false` |
| 暫時撤回文章 | 把該篇改回 `draft: true`（網址會消失，Git 歷史仍保留原稿） |
| 改選單名稱、順序、新增頁面到選單 | 只改 `site.config.json` 的 `navigation`（桌機、手機、頁尾自動同步） |
| 新增植物分類 | `src/data/topics.ts` |

所有修改都走：**Branch → PR → 可開啟的 Preview → 學員確認 → 才 Merge**。不要直接改 `main`。

## 指令
```bash
npm install
npm run dev        # 本機開發
npm run build      # Astro build + Pagefind 索引
npm run qa:static  # 建置輸出檢查（路由、草稿隔離、RSS、Sitemap、內部連結）
npm run qa:browser # 真實 Chromium：四種寬度、導航一致性、手機選單、搜尋
```

## 網址與索引
`site.config.json` 的 `site` 是刻意的 `.invalid` 佔位；預覽在 Cloudflare Pages 會自動使用 `CF_PAGES_URL`。
**所有建置預設 `noindex` + `robots: Disallow`**；正式發布時設定環境變數 `SITE_URL=<正式網址>` 與 `SITE_INDEXABLE=true`。

## 驗收紀錄
見 `docs/acceptance/`。
