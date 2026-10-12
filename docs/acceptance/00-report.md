# Astro 架站工作坊｜端對端自主驗收報告

- **測試對象：** 工作坊分支預覽站 `https://feat-learner-site-maintenanc.personal-site-starter.pages.dev/`（使用者指定；原始入口 `/pr-preview/pr-45/` 已 404）
- **學員倉庫：** `bawanNtnu/PersonlWeb4ClaudeTest`，分支 `claude/sharp-curie-qwekui`
- **PR：** https://github.com/bawanNtnu/PersonlWeb4ClaudeTest/pull/1 （Draft，**未合併**）
- **最終網站 commit：** `921626b66dfe2ee6d950c0860e87c98b6211f4c4`
- **最終 Preview（不可變部署）：** https://569b4899.balcony-field-notes-qa.pages.dev/
- **分支最新 Preview（會隨推送更新）：** https://claude-sharp-curie-qwekui.balcony-field-notes-qa.pages.dev/
- **全部內容皆為模擬資料**：角色 B「阿蕨」為虛構學員，文章、經驗、引言均非真實個人、資格或成效，全站頂部有聲明。

狀態用語：**已完成操作**＝做了；**經過驗證**＝有自動化或人工證據；**符合交付標準**＝驗證通過且無已知高影響缺陷。

---

## 1. 角色 A／B 主要互動與決策
完整紀錄：`01-interview-and-planning.md`（訪談、規劃器）、`02-maintenance.md`（四類維護、兩輪意見）。

| 階段 | B（模擬學員）提出／選擇 | A 的處理與依據 |
|---|---|---|
| 訪談 | 想寫給「租屋、小陽台、一直養死植物」的人；不用本名、不放照片與聯絡方式 | 依 `01-AI-訪談主持人.md` 一次一問、AI 提案標記；產出四欄盤點 |
| 規劃器 | 比較 A01 田野筆記與 A03 學習實驗室後選 **field-notes**；植感色、主色調深為 `#3F6A4D`；選單改名並把「新手入門」排第一；`featured-work` + `footer-editorial` | 實際以 Playwright 操作 `/starter/` 並下載 `site-brief.json` |
| 第一輪意見 | ①最近紀錄要排前面、手機圖太大 ②精選卡片點不下去 ③寫一篇草稿先給我看 ④加「陽台工具」頁在新手入門底下 | 任務 1–4（見第 5 節） |
| 草稿預覽 | 「先給我看，但不要公開」 | Skill 警告公開 Preview 會洩露草稿 → 新增**只在本機**生效的 `SHOW_DRAFTS` 預覽（CF/CI 強制關閉） |
| 撤回 | 「先收起來，但不要刪」 | 說明三種撤回方式差異，B 選改回草稿 |
| 第二輪意見 | 手機選單子項目有怪底線、手機大標「陽／台」被拆開；A 自查 768 刊頭跑版 | 擴充 `MobileMenu`、標題 nowrap、刊頭對齊 |
| 最終人工檢視 | — | A 發現任務 1 造成的區段間距回歸並修正（`921626b`） |

## 2. 實際使用的工作坊資源與 Skills
- **網站：** `/`、`/guide/`、`/guide/prepare/`、`/starter/`（實際操作）、`/layouts/field-notes|learning-lab|essayist|curator/`、`/section-patterns/`、`/blocks/`、`/effects/`
- **下載：** `AI-建站資料包.zip`（2,023,941 bytes、353 檔，含 `astro-page-management` 等 15 個 Skills）；建站前 AI 訪談包（網頁內嵌 7 檔，另比對 ZIP 內 `docs/student-intake/`）
- **讀過並實際依循的 Skills：** `astro-starter-onboarding`、`astro-site-assembly`、`astro-layout-craft`、`astro-section-pattern-craft`、`astro-content-readiness`、`astro-ui-craft`（Registry 查詢）、`astro-motion-craft`（Reveal、reduced-motion）、`astro-content-publishing`、`astro-page-management`、`astro-site-maintenance`、`astro-pr-preview`、`astro-starter-deploy`、`astro-launch-health-check`（僅清單，因未上線）、`astro-navigation-tree-test`（互動部分）
- **工具：** `scripts/export-starter.mjs`（生成骨架，commit `e98f4fa` 原樣保留）、`verify-v2-8-output.mjs`、`verify-student-navigation.mjs`、`test-student-navigation-regressions.mjs`

## 3. 網站設計、內容與頁面架構
- **版型：** 移植 A01 field-notes 的結構特徵——等寬字刊頭＋日期、左側編號 rail（直排索引）、三行超大標題（第三行斜體強調）、拱形示意圖＋FIG. 圖說、右側 Margin note、日期帳本 ledger、Open question 收尾；內頁沿用 rail＋刊頭＋ledger。**不是**換色骨架（對照 `evidence/skeleton/`）。
- **品牌：** 五色盤 token（`src/styles/tokens.css`）；自架 Noto Serif TC + IBM Plex Mono；文字標誌（無 Logo 圖）；SVG favicon；兩張**標示為 AI 繪製示意圖**的 SVG。
- **頁面（15 個 HTML）：** 首頁、新手入門、└ 陽台工具、觀察筆記（關鍵字／標籤／月份篩選）、5 篇文章、植物分類＋3 個分類頁（無文章的分類不產生頁面）、關於我、404；另有 `rss.xml`、`sitemap.xml`、`robots.txt`、`search/exact-zh.json`、Pagefind 索引。
- **重用的工作坊元件：** Blocks：Breadcrumbs、ArticleSearch、TagCloud、ArchiveMonths、ArticleNavigation、RelatedArticles、ProcessSteps、ArticleCallout、FeatureGrid（擴充 href）、MobileMenu（擴充 level）、SiteSearchDialog、SiteFooter、SocialLinks、BackToTop；Effects：Reveal；Pattern：FeaturedWorkSection、footer-editorial 版式。
- **單一資料來源：** 導航 `site.config.json`；公開文章 `publishedArticles()`；分類 `src/data/topics.ts`。
- **索引政策：** 所有建置預設 `noindex` + `robots: Disallow`；正式上線需設定 `SITE_URL` 與 `SITE_INDEXABLE=true`。

## 4. GitHub 與 Preview
| 項目 | 值 |
|---|---|
| Branch | `claude/sharp-curie-qwekui` |
| PR | https://github.com/bawanNtnu/PersonlWeb4ClaudeTest/pull/1 （Draft；GitHub Checks：`verify` ✅、`Cloudflare Pages` ✅ @ `921626b`） |
| Cloudflare Pages 專案 | `balcony-field-notes-qa`（AI 經 Cloudflare API 建立、Git 整合本倉庫）；production branch＝`production-not-approved`、`production_deployments_enabled=false` |
| Production | **無**：截至 `921626b` 共 13 次部署，全部為 `preview`（之後的純文件 commit 同樣只產生 preview）；`https://balcony-field-notes-qa.pages.dev/` 回 404 |
| 最終 Preview | https://569b4899.balcony-field-notes-qa.pages.dev/ ，HTML `build-commit` = `921626b…` |

主要 commit：`e98f4fa` 骨架 → `0f52a36` v1 → `a74ce91` 任務1 → `c1d03b1`/`732e246` 任務2 → `b033e1d`/`de19285`/`2aae171`/`96070b4` 任務3 → `5fea114` 任務4 → `cbf9e60` 第二輪 → `921626b` 間距回歸修正。

## 5. 建站與四類維護任務驗收結果
| 任務 | 已完成操作 | 經過驗證 | 符合交付標準 |
|---|---|---|---|
| 建站 v1 | ✅ | ✅ static／browser／a11y；遠端 Preview | ✅ |
| 1 版面調整（首頁區段順序、手機圖） | ✅ | ✅ 像素比對：其他 52 張不變 | ⚠ 一開始引入間距回歸，`921626b` 已修正並重驗 |
| 2 元件修改（FeatureGrid href） | ✅ | ✅ 原版逐字相容測試＋反向測試、瀏覽器點擊、故障注入 | ✅ |
| 3 文章草稿→修改→發布準備→撤回 | ✅ | ✅ 每階段 static＋遠端 Preview；撤回後 56 張截圖與撤回前**像素完全相同** | ⚠ 舊部署網址仍可讀到曾發布內容（第 10 節 R1） |
| 4 新增頁面＋導航 | ✅ | ✅ 768／390 除新手入門外 26 張不變；子選單鍵盤、Escape、aria-current | ✅ |
| 第二輪意見修正 | ✅ | ✅ 1440／1280 全不變；MobileMenu 相容測試＋反向測試 | ✅ |

## 6. 四視口實際畫面截圖
來源皆為**外部最終 Preview**（`569b4899`）。倉庫內 `evidence/final/screens/`：首頁、陽台工具、觀察筆記、文章頁 × 1440／1280／768／390，以及桌機下拉、手機選單、搜尋、標籤篩選四張互動截圖。完整 15 路由 × 4 寬度 60 張在證據包 `screens-remote/`。

## 7. 自動化與人工模擬驗收證據（最終 commit `921626b`）
`evidence/final/summary.txt`（由 `scripts/qa/run-final.sh` 產生）：

| 檢查 | 結果 |
|---|---|
| static-checks（路由、草稿隔離含 Pagefind 解壓、RSS／Sitemap 雙向、內部連結、metadata、索引政策、導航一致、模擬聲明） | 128 PASS / 0 FAIL |
| 元件相容單元測試（Astro Container） | 4/4 |
| 靜態故障注入（11 種缺陷＋基準） | 12/12 正確偵測 |
| 瀏覽器（本機，4 寬度） | 244 PASS / 0 FAIL |
| 瀏覽器故障注入（8 種缺陷＋基準） | 9/9 正確偵測 |
| 無障礙 axe WCAG 2.1 A/AA × 8 頁 × 2 寬度＋色彩對比＋axe 反向測試 | 本機 25/25、遠端 25/25 |
| 遠端 Preview（build-commit＝SHA、Sitemap 全 200、草稿 404 與遠端隔離、noindex） | 26 PASS / 0 FAIL |
| 本機建置 vs 遠端 Preview 逐頁比對 | 16/16 一致（反向：舊部署 2/16） |
| 瀏覽器（**遠端 Preview**，4 寬度） | 244 PASS / 0 FAIL |
| 人工模擬（角色 B） | 兩輪意見，皆依截圖給出並由 A 修正後重驗 |

**驗證工具本身的驗證：** 每個檢查器都有反向測試或故障注入；遠端核對器以舊部署對新 SHA → 正確 FAIL；像素比對重拍同頁 0 差異（排除截圖不穩定）。

## 8. 問題、修復與重新驗證
| # | 問題 | 類型 | 修復 | 重驗 |
|---|---|---|---|---|
| 1 | 首頁 H1 斷行「陽／台」、kicker 被放大、手機 ledger 標籤換行、內頁 rail 擠壓 | 網站 | CSS 修正 | 截圖 |
| 2 | 文章表格與內文矛盾（五盆植物清單不一致） | 內容 | 修正表格 | 人工 |
| 3 | 404 頁被 Pagefind 索引 | 網站 | noindex 頁不加 `data-pagefind-body` | Indexed 14→13 |
| 4 | browser-checks 互動失敗時**崩潰而非 FAIL**（可能被誤讀為通過） | 驗證工具 | try/catch＋全域保護＋總是輸出 JSON | 故障注入 8/8→9/9 |
| 5 | 故障注入伺服器用 `spawnSync` 卡死事件迴圈 | 驗證工具 | 改非同步 spawn | — |
| 6 | **`c1d03b1` 推送時有 1 項瀏覽器 FAIL**（`;` 串接未擋下）；原因是測試對被覆蓋層遮住的元素用 `locator.click` | 流程＋驗證工具 | 測試改真實滑鼠座標；新增對應故障注入 | 210/210 |
| 7 | 遠端核對短 slug 子字串誤判（我自己的測試環境多複製 `m.md`） | 驗證工具 | 改以 `/articles/<slug>/` 完整路徑比對（static 同步修正） | 25/25 |
| 8 | 有子選單的父項目需先展開才點得到 | 驗證工具 | 測試先展開 | 244/244 |
| 9 | visual-diff `--expect-changed` 只支援前綴，誤判 15 張 | 驗證工具 | 支援子字串／`^` 前綴 | 60 張 |
| 10 | 元件相容測試受開發模式 `data-astro-source-*`、script 路徑、隨機 id 干擾 | 驗證工具 | 正規化後比對；反向測試確認仍能抓到真差異 | 4/4 |
| 11 | 任務 1 造成首頁區段間距回歸（像素比對只能確認「首頁預期變更」） | 網站（我的疏失） | `.fn-ledger` 上方留白 | 其他 56 張不變；最終全套重跑 |
| 12 | 一開始讀了正式站而非指定的分支預覽站 | 流程 | 使用者指正後全部重抓 | — |
| 13 | 撰寫報告時誤稱「訪談包網頁版與 ZIP 版不一致」（把字元數 2052 和位元組數 5132 相比） | 我的量測錯誤 | 逐位元組比對 7 檔皆相同，已更正 W3 | `cmp` 7/7 SAME |

## 9. 能力來源：工作坊 Skills vs 自行補充
| 來自工作坊 | 自行補充（工作坊未提供或需修正） |
|---|---|
| 訪談流程、規劃器與 Site Brief JSON、骨架生成器 | field-notes 的實際移植（生成器只做骨架） |
| 12 款版型原型、Section Pattern、54 Blocks、7 Effects 原始碼與 CSS | 從 ZIP 的 public CSS 抽出所需元件樣式並 token 化 |
| Preview-first 流程、草稿／撤回觀念、導航單一來源與一致性閘門、故障注入原則 | `search/exact-zh.json` 產生器（SiteSearchDialog 需要但 ZIP 未提供）、Pagefind 片段解壓檢查 |
| `verify-student-navigation` 的思路與自我回歸測試 | 本站的 static／browser／a11y／遠端／逐頁比對驗證器與兩套故障注入 |
| Cloudflare Pages 路線說明 | 用 Cloudflare API 建立 preview-only 專案（不存在的 production branch） |
| — | 本機限定草稿預覽、noindex 預設與 `SITE_INDEXABLE` 開關、`build-commit` 標記、rehype BASE_URL 外掛、像素比對 |

## 10. 尚未解決的問題與風險
| # | 風險 | 影響 | 建議 |
|---|---|---|---|
| R1 | **撤回不會影響舊的不可變部署網址**：`https://a53f1fcb.balcony-field-notes-qa.pages.dev/articles/monstera-first-split-leaf/` 仍回 200 | 曾進入 Preview 的草稿／撤回內容可被持有連結者讀取 | 由你決定是否刪除該部署（AI 未自行刪除）；正式使用可為 Preview 啟用 Cloudflare Access |
| R2 | 倉庫為 Public：草稿 Markdown（龜背芋）在 GitHub 上可讀 | 草稿並非機密 | 敏感草稿不要提交到公開倉庫，或改用私人倉庫 |
| R3 | 正式網址未決定（`site` 為 `.invalid` 佔位）、未設定 Production | 上線前需設定 `SITE_URL`、`SITE_INDEXABLE`、production branch | 依 `astro-launch-health-check` 上線後重驗 |
| R4 | `path` 擴充不在工作坊 StarterPlan 合約內 → 工作坊 `verify-v2-8-output` 失敗 | 日後若用工作坊工具驗證會誤報 | 工作坊合約加入自訂網址欄位（見 W10） |
| R5 | MobileMenu 以 `Math.random()` 產生 id | 建置不可重現，比對需正規化 | 改用固定或內容雜湊 id |
| R6 | 僅測 Chromium（含手機寬度模擬），未測 Safari／Firefox／實機 | iOS Safari 的 `<dialog>`、`<details>` 行為未驗證 | 實機抽測 |
| R7 | 效能（Lighthouse、CJK 字型子集下載量）未量測 | 首次載入可能偏重 | 量測後評估字型策略 |
| R8 | Cloudflare 專案 `balcony-field-notes-qa` 仍存在（免費方案資源） | — | 驗收結束後可由你刪除 |
| R9 | 16:9 手機裁切切掉 SVG 內的「示意圖」字樣（圖說仍標示） | 輕微 | 可改用專門的手機版 SVG |

### 工作坊缺陷清單（位置／影響／重現／建議）
| # | 位置 | 問題與重現 | 影響 | 建議 |
|---|---|---|---|---|
| W1 | 入口 `/pr-preview/pr-45/` | 所有路徑 404（正式站 `/guide/` 為 200） | 學員入口失效 | 指南固定使用穩定網址或分支預覽網址 |
| W2 | 前置準備 | 未說明 AI 雲端環境需允許的網域（`*.pages.dev`、npm、GitHub）；本次初始即被網路政策擋下 | 受限網路的 AI 無法開始 | 列出必要網域或提供離線包 |
| W3 | 訪談包（網頁內嵌版與 ZIP `docs/student-intake/` 逐位元組相同） | `README.md` 第 4 項後有字面 `\n5.`、`04-圖片與發布準備.md` 的「1A」段落有字面 `\n\n`，Markdown 顯示時第 4、5 項黏在一起、標題不換行 | 學員閱讀時排版錯亂 | 修正跳脫字元 |
| W4 | 規劃器 `/starter/` | 選單項目改名後，↑↓→←× 按鈕的 aria-label 仍是舊名稱（如「上移：開始閱讀」）；重現：改名「開始閱讀」→「新手入門」後檢查按鈕 aria-label | 螢幕閱讀器使用者聽到錯誤名稱 | 改名時同步更新 aria-label |
| W5 | 植感 botanical 色盤 | accent `#B48569` 對背景 `#F6F7EF` 僅 2.996:1，**連大字 3:1 都不足** | 學員若將 accent 用於文字即違反 WCAG | 調整預設值或標示「僅裝飾」 |
| W6 | `verify-v2-8-output --student-site` | 對**完全未適配**、全佔位內容、canonical 指向 example.com、robots Disallow 的骨架也回報 PASS | PASS 鑑別力低，易被當成完成 | 加入內容佔位偵測、site 設定檢查 |
| W7 | `verify-student-navigation` × 工作坊 `MobileMenu` | 比對 textContent 時把 MobileMenu 的 `aria-hidden` 「↗」算入 → **使用工作坊 MobileMenu 的任何網站必定 mismatch**。重現：`evidence/workshop-defects/repro-mobilemenu-arrow.mjs`（含↗ exit=1、不含 exit=0）。另：收合中的 `<details>` 連結被視為可見 | 正確網站被判 FAIL，學員無法分辨 | 改用 accessible name（排除 aria-hidden）或只比 URL 序列 |
| W8 | `SiteSearchDialog` | 需要 `search/exact-zh.json`，ZIP 內沒有產生器 | 直接使用時中文完整比對失效 | 隨元件提供 endpoint 範例 |
| W9 | `MobileMenu` | `Math.random()` id；子項目只能用文字前綴模擬層級（易出現底線／「└」朗讀問題） | 不可重現建置、雙層選單體驗差 | 固定 id、支援 level |
| W10 | StarterPlan 合約／生成器 | 自訂頁面網址只能是 `/page-xxx/`，無法指定可讀網址；`verify-v2-8-output` 亦假設 `/<id>/` | 學員網址不好看，或擴充後驗證器誤報 | 合約加入 `path` |
| W11 | `FeaturedWorkSection` | 卡片不可點，連結另列於下方（實際學員回饋「點不下去」） | 可用性 | 卡片整張連結（本次已在學員站擴充 FeatureGrid） |
| W12 | `astro-starter-onboarding` SKILL.md | 編號重複（兩個「4.」、兩個「7.」） | 輕微 | 校對 |
| W13 | Preview 指南／`astro-content-publishing` | 未提到 Cloudflare 每次部署網址永久保留，撤回不影響舊網址（見 R1） | 學員以為撤回即下線 | 指南加註並提供刪除舊部署或 Access 保護步驟 |
| W14 | AI 端 Cloudflare 連線（本環境） | 初始連線只有 Workers 唯讀工具，無 Pages 專案操作；更新連線後才可建立 | 指南 B 路線第一步依賴連線能力 | 指南保留「手動於 Dashboard 連接」主路徑（已有） |

## 11. 最終 PASS／FAIL／BLOCKED／NOT TESTED 明細
| 項目 | 結果 | 證據 |
|---|---|---|
| 網站建置（本機、GitHub Actions、Cloudflare） | PASS | `verify` ✅、Cloudflare deploy success @ `921626b` |
| 主要路由與內部連結 | PASS | static 128/128；遠端 Sitemap 全 200 |
| 導航目的地、aria-current、子選單鍵盤 | PASS | browser 244/244（本機＋遠端） |
| 電腦／手機版面 1440／1280／768／390 | PASS | 60 張遠端截圖無溢出；人工檢視 |
| 手機選單開關、Esc、焦點返回 | PASS | browser-checks |
| 草稿與公開內容隔離（含 Pagefind、遠端） | PASS | static＋remote＋Pagefind 解壓 |
| 舊部署網址上的撤回內容 | **FAIL（已知風險 R1）** | `a53f1fcb` 回 200 |
| 新增頁面整合（導航、Sitemap、搜尋、麵包屑） | PASS | static＋browser＋visual-diff |
| 修改共用元件後原頁面不受影響 | PASS | 像素比對＋原版相容單元測試 |
| SEO metadata、canonical、noindex | PASS | static＋remote（含 `x-robots-tag`） |
| Sitemap、RSS | PASS | static 雙向比對 |
| 全站搜尋（Pagefind＋中文完整比對）、文章篩選 | PASS | browser-checks |
| 無障礙（axe A/AA、對比） | PASS | 25/25 ×2 |
| Preview 可從外部開啟 | PASS | curl 經外部 proxy＋Playwright |
| PR 內容與 Preview 版本一致 | PASS | build-commit＝PR head SHA；逐頁比對 16/16 |
| 驗證器故障注入 | PASS | 12/12、9/9 |
| 工作坊 `verify-student-navigation` | FAIL（工具缺陷 W7，非網站缺陷） | `evidence/final/workshop-verify-student-navigation.*` |
| 工作坊 `verify-v2-8-output` | FAIL（R4／W10：path 擴充不在合約內） | `evidence/final/workshop-verify-v2-8-output.log` |
| Production 發布、DNS、合併 | NOT TESTED（依安全界線刻意不做） | — |
| `astro-launch-health-check`（正式站） | BLOCKED（無正式站） | — |
| 導航樹測試（真人） | NOT TESTED（無外部受測者，Skill 規定不得以模型代替） | — |
| Safari／Firefox／實機 | NOT TESTED | — |
| 效能／Lighthouse | NOT TESTED | — |

**整體判定：** 建站與四類維護任務**已完成並經驗證**；在 Preview 範圍內**符合交付標準**，但有一項已知高影響風險（R1 舊部署網址保留撤回內容）需要你決定處置。依安全界線未合併、未發布 Production。

## 12. 測試報告與證據包
- 倉庫內：`docs/acceptance/`（本報告、01、02、`evidence/`）
- 可下載證據包：`acceptance-evidence-921626b.zip`（另行提供；含 60 張遠端截圖、所有 JSON／log、規劃器輸出、骨架對照、維護前後截圖與 diff、工作坊缺陷重現腳本、工作坊資源檔案清單與雜湊）
- 重跑：`npm run build && npx astro preview --host 127.0.0.1 --port 4321` 後執行 `bash scripts/qa/run-final.sh <previewURL> <SHA>`
