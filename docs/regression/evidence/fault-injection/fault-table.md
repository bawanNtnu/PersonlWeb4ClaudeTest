| 案例 | 注入的缺陷 | 工作坊：v2-8 | 工作坊：nav | 工作坊：audit | 獨立：static | 獨立：browser | 獨立：a11y |
|---|---|---|---|---|---|---|---|
| F00-baseline | 未注入（基準，應全部 PASS） | PASS ✅ | PASS ✅ | PASS ✅ | PASS ✅ | PASS ✅ | PASS ✅ |
| F01-nav-404 | 子選單連結指向不存在頁面 | 漏掉 | **抓到** | — | **抓到** | — | — |
| F02-mobile-missing | 手機選單少了「關於我」 | 漏掉 | **抓到** | — | **抓到** | — | — |
| F03-draft-json | AI 自寫 JSON 搜尋端點未過濾草稿 | 漏掉 | — | — | **抓到** | — | — |
| F04-short-title-leak | 首頁以純文字預告草稿標題（7 字中文標題） | 漏掉 | — | — | **抓到** | — | — |
| F05-drafts-folder-loaded | Collection 同時讀 articles/ 與 drafts/（drafts/ 依 Skill 資料夾模型未加 draft 旗標） | **抓到** | — | — | **抓到** | — | — |
| F06-footer-path-404 | 為自訂頁設定好看網址 path（生成器頁尾仍用 id） | 漏掉 | 漏掉 | — | **抓到** | — | — |
| F07-overflow-390 | 內頁麵包屑區塊設固定最小寬度 520px，手機水平溢出 | — | **抓到** | **抓到** | — | **抓到** | — |
| F08-low-contrast | 文章日期／中繼資料改為淺灰（約 1.8:1） | — | — | 漏掉 | — | — | **抓到** |
| F09-noindex-removed | Preview 移除 noindex | 漏掉 | — | — | **抓到** | — | — |
| F10-menu-focus | 手機選單關閉後焦點未回到按鈕 | — | 漏掉 | — | — | 漏掉 | — |
| F10b-menu-esc-blocked | 手機選單攔截 cancel，Esc 無法關閉 | — | 漏掉 | — | — | **抓到** | — |
| F11-no-exact-index | build 漏掉中文完整比對索引 | 漏掉 | — | — | **抓到** | **抓到** | — |
| F12-no-description | 所有頁面缺 meta description（對照組） | **抓到** | — | — | **抓到** | — | — |
| F13-draft-in-rss | RSS 未過濾草稿（對照組） | **抓到** | — | — | **抓到** | — | — |
| F14-reveal-stuck | Reveal 永遠不顯示內容（JS 不加 visible class） | — | — | 漏掉 | — | **抓到** | — |
