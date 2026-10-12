# 回歸測試暫存站（模擬資料，請勿合併）

本分支是 Astro 架站工作坊**新版資源**（Cloudflare 固定版本 `efd6b288`）的獨立回歸驗收用暫存網站，
不是學員正式網站。內容與人物皆為虛構。驗收報告見 `docs/regression/`。

- 生成器原樣輸出：commit `710a4c0`
- 之後的修改：接入工作坊 Blocks／Effects／Editorial 配方，並依驗收結果修正

---

# 學員獨立 Astro Starter（第一階段）

此匯出功能只提供**可建置的網站骨架**。版型仍須由 AI 根據原始 Layout Library 做真實構圖移植，不可聲稱已完成 12 款版型的視覺還原。

- `npm install` → `npm run dev` → `npm run build`
- 發布前修改 `site.config.json` 的 `site`、`base`，填寫真實內容。
- 若使用 GitHub Pages 專案站，需要正確的 BASE_URL；Cloudflare 根網域通常使用 `/`。
- 使用 astro-site-assembly、astro-starter-deploy、astro-site-maintenance Skills。
- 未設定的服務、預約、文章不要假裝已經完成。
