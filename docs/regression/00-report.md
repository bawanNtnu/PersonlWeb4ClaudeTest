# Astro 架站工作坊｜新版資源獨立回歸驗收報告

| 項目 | 內容 |
|---|---|
| 測試對象 | Cloudflare Pages 固定版本 `https://efd6b288.personal-site-starter.pages.dev/`（`/guide/`、`/guide/prepare/`、`/starter/`） |
| 學員倉庫 | `bawanNtnu/PersonlWeb4ClaudeTest` |
| 基準 | 先前驗收 PR [#1](https://github.com/bawanNtnu/PersonlWeb4ClaudeTest/pull/1)（`8df8877`，Draft，**未修改**）與其報告 `docs/acceptance/00-report.md`（W1–W14、R1–R9） |
| 本次分支／PR | `claude/gracious-ptolemy-byvvj1` → Draft PR [#2](https://github.com/bawanNtnu/PersonlWeb4ClaudeTest/pull/2)（**請勿合併**） |
| 暫存站 Preview | `https://011d368a.balcony-field-notes-qa.pages.dev/`（網站 commit `85457d6`；之後的 commit 只加文件與驗證腳本，見第 6 節） |
| 測試日期 | 2026-10-12 |
| 內容 | 暫存站全部為**模擬資料**（虛構學員「阿蕨」） |

狀態用語：**PASS**＝實測通過；**FAIL**＝實測有缺陷；**PARTIAL**＝部分修正；**BLOCKED**＝無法進行；**NOT TESTED**＝刻意或無法測試。

---

## 0. 結論摘要

**建議：有條件交付。** 新版確實修好了上次實際建站遇到的大部分問題（W3、W4、W7、W8、W9、W11、W12、W13 已修正並實測確認；W2、W10 有改善）。從 `/guide/` 出發，可以順利下載資料包、操作規劃器、生成網站並部署成可開啟的 Cloudflare Preview，沒有遇到 BLOCKED。

但是本次也發現新版資源的**新缺陷**，其中三類會直接讓「CI／驗證器綠燈、網站實際壞掉」：

1. **生成器的自訂網址（`path`）只修了一半**：頁尾 Pattern 與首頁 Hero CTA 仍用 `id` 組網址 → 404。工作坊自己的 `verify-starter-export` 測試資料就會產生 5 個 404 連結，該工具仍回報 PASS（N2、N3、N5）。
2. **原生驗證器的盲點**：`verify-v2-8-output` 不檢查內部連結與 noindex，草稿閘門不掃 JSON 搜尋端點、且只比對 ≥8 字的標題（中文短標題會漏）（N6）。
3. **新增的 `audit.mjs` 視覺驗收工具**：對兩種標準「跳到主要內容」寫法都誤判 FAIL（生成器的輸出每一頁都 FAIL）；對比不足只給 WARN；被 Reveal 效果隱藏的內容既不量測也不出現在截圖中（N7–N9）。

另外規劃器有一個無障礙退化風險：鍵盤排序後焦點掉到頁面頂端（N1）。

上述缺陷都有變通方法，AI 也能在建站時自行補上（本次即如此），所以不構成 BLOCKED；但對**完全不會程式的學員**而言，他們只能看綠燈，因此建議在交付前至少修正 N1、N2、N3、N5、N6、N7（見第 8 節）。

---

## 1. PASS／FAIL／BLOCKED／NOT TESTED 總表

### 1.1 工作坊資源
| 項目 | 結果 | 證據 |
|---|---|---|
| `/guide/`、`/guide/prepare/`、`/starter/` 可開啟（HTTP 200、無 JS 錯誤） | PASS | `evidence/workshop/*.hdr`、`*.txt` |
| 工作坊站內 143 頁內部連結 | PASS（0 個非 200） | 第 2.1 節 |
| `/guide/` 下載 AI 建站資料包（實際點擊按鈕） | PASS（2,046,108 bytes、355 檔） | `evidence/workshop/downloads.sha256`、`pack-manifest.sha256` |
| `/guide/prepare/` 下載訪談包（實際點擊按鈕） | PASS（24,517 bytes、7 檔，與 ZIP 內 `docs/student-intake/` 逐位元組相同） | 同上 |
| 指南／前置準備頁 axe WCAG 2.1 A/AA（1440、390） | PASS（0 違規） | `evidence/workshop/axe-workshop-pages.json` |
| 規劃器操作並下載 Site Brief | PASS | `evidence/planner/` |
| 規劃器 axe | FAIL（1 項 serious：`#plan-preview` 可捲動區無法鍵盤聚焦，N16） | 同上 |
| 規劃器鍵盤排序 | **FAIL（N1）** | `evidence/planner/planner-kbd.mjs` |
| 規劃器改名後 aria-label（舊 W4） | PASS（已修正） | `planner-log.txt` |
| 規劃器四寬度無水平溢出 | PASS | `planner-log.txt` |
| 生成器 `export-starter.mjs`（規劃器 Brief） | PASS（build 成功、98 個內部連結全通） | 第 3.1 節 |
| 生成器（含自訂 `path`） | **FAIL（N2、N3、N4）** | `evidence/repro/` |
| `verify-v2-8-output --student-site` | PASS（本站）；鑑別力見第 5 節 | `evidence/tools-temp-site/` |
| `verify-student-navigation` | PASS（本站）；舊 W7 已修正 | 同上 |
| `verify-starter-export`（含完整 build） | **FAIL：自己的測試資料有 404 仍判 PASS（N5）** | `evidence/repro/verify-starter-export-full.log` |
| `test-draft-leakage-regressions`、`test-student-navigation-regressions` | PASS（7/7、7/7） | 第 3.2 節 |
| Editorial `audit.mjs` | **FAIL：誤報與漏報（N7–N10）** | `evidence/tools-temp-site/temp-audit*.log` |
| `build-student-search-index`（舊 W8） | PASS | 第 3.1 節 |

### 1.2 暫存測試站（以工作坊資源建出）
| 項目 | 結果 | 證據 |
|---|---|---|
| 網站規劃 → 生成 → 適配 → 建置（本機、GitHub Actions、Cloudflare） | PASS | 第 6 節 |
| 頁面與導航（桌機子選單鍵盤、手機選單、Esc、焦點、aria-current） | PASS | `evidence/remote/browser-remote.json`（233/233） |
| 文章與草稿管理（舊式 `draft:true`＋新式 `drafts/` 資料夾；HTML／RSS／Sitemap／JSON／Pagefind 片段） | PASS | static-checks 65/65；遠端草稿網址 404 |
| 共用元件（MobileMenu、SiteSearchDialog、BackToTop、Breadcrumbs、ArticleNavigation、FeaturedWorkSection、Reveal、H01、L01） | PASS（需 AI 補 token 橋接，N13） | 第 4 節 |
| 全站搜尋（Pagefind＋中文完整比對、草稿不出現、Ctrl+K） | PASS（遠端） | browser-remote |
| 響應式 1440／1280／768／390 | PASS（無溢出；目視檢查） | `evidence/screens/` |
| 無障礙 axe A/AA（10 路由 × 2 寬度＋選單開啟＋搜尋開啟） | PASS（本機 22/22、遠端 22/22） | `a11y-local.json`、`a11y-remote.json` |
| Cloudflare Preview 真實網址與部署版本 | PASS（`build-commit` = 推送 SHA） | 第 6 節 |
| GitHub Actions（生成器附的 `pr-check.yml`） | PASS，但只做 build（N19） | 第 6 節 |
| Production 隔離 | PASS（production 網域 404、無 production 部署） | 第 6 節 |
| 故障注入 | 見第 5 節 | `evidence/fault-injection/` |

### 1.3 既有「陽台觀察室」（PR #1，唯讀重驗）
| 項目 | 結果 | 說明 |
|---|---|---|
| 新版 `verify-v2-8-output` | PASS（先前因 `path` 失敗，W10 該部分已修正） | `evidence/tools-prior-site/balcony-v28-new.log` |
| 新版 `verify-student-navigation` | FAIL（**網站真實小缺陷**：桌機「新手入門・總覽／陽台工具」對手機「新手入門／新手入門・陽台工具」標籤不一致；先前被 W7 誤報遮蔽） | `balcony-nav-new-results.json` |
| 新版 `audit.mjs` | FAIL：跳過連結誤報（工具，N7）＋網站真實小缺陷：9–10px 等寬字、手機 3 個 <24px 觸控目標、H1 line-height 0.98（<1.04） | `audit-report.json` |
| R1 舊不可變部署仍可讀到撤回文章 | 仍存在（`a53f1fcb…/articles/monstera-first-split-leaf/` 回 200）；未刪除，待你決定 | 第 6 節 |

### 1.4 NOT TESTED／BLOCKED
| 項目 | 狀態 | 原因 |
|---|---|---|
| Production 發布、合併、DNS | NOT TESTED | 依指示不做 |
| `astro-launch-health-check` | NOT TESTED | 無正式站 |
| 真人導航樹測試（`astro-navigation-tree-test`） | NOT TESTED | Skill 規定不得以模型代替真人受測者 |
| Safari／Firefox／實機觸控 | NOT TESTED | 只有 Chromium；手機以寬度＋`hasTouch` 模擬 |
| GitHub Pages 路線（A 路線） | NOT TESTED | 本倉庫走 B 路線；指南已明示 GH Pages 無 PR Preview |
| 學員自行操作 GitHub／Cloudflare 授權畫面 | NOT TESTED | 由 AI 端連線完成，無真人操作 |
| 任何項目 BLOCKED | 無 | — |

---

## 2. 新版工作坊資源的實際使用紀錄

依網站實際引導順序（未使用 GitHub Pages 預覽路徑、未查詢老師倉庫或內部 PR）：

1. **`/guide/`**（200，`x-robots-tag: noindex`）：7 步驟。第 02 步的「下載 AI 建站資料包 ZIP」是 JS 按鈕（`#download-builder-zip`），以 Playwright 真實點擊下載。
2. **`/guide/prepare/`**：新增「AI 公司網路／雲端電腦提醒」列出 `github.com`、`api.github.com`、`registry.npmjs.org`、`*.pages.dev`（**舊 W2 修正**）；新增 Private Repo 與「舊 Preview 不會消失」說明（**舊 W13 修正**）。以按鈕下載訪談包（blob URL）。
3. **資料包**：依 `START-HERE.md` → `AGENTS.md` → `AGENT-HANDOFF.md` 閱讀；讀過並使用 `astro-starter-onboarding`、`astro-site-assembly`、`astro-content-publishing`、`astro-page-management`、`astro-pr-preview`、`astro-ui-craft`（Registry）、`astro-motion-craft`（Reveal）、**新增的** `astro-editorial-layout-design`（配方 H01、L01、`tokens.css`、`audit.mjs`、`checklists/visual-qa.md`）。
4. **`/starter/`**：知識型、A01 田野筆記、植感配色、主色 `#3F6A4D`、把「開始閱讀」改名「新手入門」並移到第一、新增自訂頁「陽台工具」並縮排為子選單、CTA 指向新手入門、精選內容放首頁、內容型頁腳 → 下載 `my-astro-site-plan.json`（`evidence/planner/site-brief.json`）。
5. **生成器**：`node scripts/export-starter.mjs site-brief.json <dir>` → 原樣提交為 `710a4c0`。
6. **適配**：接入 Blocks／Effects／Editorial 配方（第 4 節）→ `85457d6`。
7. **驗證工具**：`verify-v2-8-output`、`verify-student-navigation`、`verify-starter-export`、兩支自我回歸測試、`audit.mjs`。
8. **部署**：推送分支 → Cloudflare Git 整合自動建 Preview → Draft PR #2 觸發 `pr-check.yml`。

### 2.1 資料包與舊版差異（可觀察到的）
- 檔案數 353 → 355；新增 `START-HERE.md`、`AGENT-HANDOFF.md`（根目錄）、`.ai/astro-editorial-layout-design/`（40 個配方原始碼＋`audit.mjs`）、`scripts/build-student-search-index.mjs`、`scripts/verify-starter-export.mjs`、`scripts/test-draft-leakage-regressions.mjs`。
- 舊版 ZIP 本身未保存在倉庫中，故無法逐檔 diff；本次清單與雜湊見 `evidence/workshop/pack-manifest.sha256`，可作為下一輪基準。

---

## 3. 工作坊原生工具測試結果

### 3.1 生成器 `export-starter.mjs`
| 情境 | build | 內部連結 | `verify-v2-8-output` |
|---|---|---|---|
| 規劃器 Brief（無 `path`） | ✅ | 98/98 | PASS（4 頁佔位內容 NOTICE） |
| V1：工作坊 `verify-starter-export` 自己的 knowledge 測試資料（含 `path: start-here/tools/` 與 `footer-editorial`） | ✅ | **5 個 404**（每頁頁尾 → `/page-custom-guide/`） | **PASS** |
| V2：CTA 指向有自訂 `path` 的頁面 | ✅ | **1 個 404**（首頁 Hero 按鈕） | **PASS** |
| V3：文章頁設定 `path: notes/` | ✅（生成器接受） | 11 個 404（導航與 CTA → `/notes/`） | FAIL（正確抓到） |

另：骨架的 Pagefind 會索引 404 頁（無 `data-pagefind-body`），`exact-zh.json` 則正確排除 404。

### 3.2 驗證器在正常網站上的結果
| 工具 | 骨架 | 暫存站 | 既有陽台觀察室 |
|---|---|---|---|
| `verify-v2-8-output` | PASS | PASS | PASS（舊版 FAIL） |
| `verify-student-navigation` | PASS | PASS | FAIL（網站標籤真實不一致） |
| `audit.mjs` | — | 修正前每頁 FAIL（跳過連結誤報）→ 改寫跳過連結後 PASS | FAIL（誤報＋真實小缺陷） |
| `verify-starter-export`（FULL） | PASS（但含 N5 的 404） | — | — |
| 兩支自我回歸測試 | 7/7、7/7 PASS | — | — |

### 3.3 舊缺陷（W1–W14）回歸狀態
| # | 舊問題 | 新版狀態 | 證據 |
|---|---|---|---|
| W1 | `/pr-preview/pr-45/` 入口 404 | 已處理（改用 Cloudflare 固定網址；README 明言 pr-preview 不是學員入口） | README |
| W2 | 未列出受限網路需允許的網域 | **已修正** | prepare 頁 02 節 |
| W3 | 訪談包字面 `\n` | **已修正**（0 處；網頁版＝ZIP 版） | `cmp` 7/7 |
| W4 | 規劃器改名後 aria-label 未更新 | **已修正** | `planner-log.txt` |
| W5 | 植感 accent 對比 2.99:1 | **部分**：植感 accent 改 `#8A5A3E`（5.39:1）；紙墨 accent 2.62、石板 accent 2.88、植感 secondary 2.76 仍 <3:1（頁面有對比提醒） | `planner-log.txt` THEMES |
| W6 | 驗證器對未適配骨架也 PASS | 改為 NOTICE（符合「預設內容只提示」原則，視為已處理）；但鑑別力缺口轉到 N6 | — |
| W7 | 導航驗證器與 MobileMenu `↗` 不相容 | **已修正**（暫存站與陽台站實測皆不再誤報） | `temp-verify-nav.log` |
| W8 | SiteSearchDialog 缺 `exact-zh.json` 產生器 | **已修正**（生成器內建） | 建置 Log |
| W9 | MobileMenu `Math.random()` | **已修正**（內容雜湊 id） | 原始碼 |
| W10 | 合約不支援自訂網址 | **部分**：生成器、`verify-v2-8-output` 支援 `path`；但規劃器無欄位（N14），頁尾與 Hero CTA 忽略 `path`（N2、N3） | `evidence/repro/` |
| W11 | FeaturedWorkSection 卡片不可點 | **已修正**（傳 `href` 整張可點） | 暫存站首頁 |
| W12 | onboarding 編號重複 | **已修正**（1–9） | SKILL.md |
| W13 | 未說明舊 Preview 不會消失 | **已修正**（prepare、`astro-pr-preview`、`astro-content-publishing`） | — |
| W14 | AI 端 Cloudflare 連線只有唯讀 | 本環境已可讀寫 Pages（環境因素，非工作坊） | — |

---

## 4. 工作坊原生支援 vs AI 自行補充

| 工作坊原生提供（直接可用） | AI 自行補充（本次為讓網站正確必須做的） |
|---|---|
| 規劃器、Site Brief、生成器骨架、`site.config.json` 單一導航來源、桌機雙層選單 | 手機版改用工作坊 `MobileMenu`，並把生成器的導航資料轉成相同標籤（否則導航驗證器會判桌機／手機不一致） |
| Blocks（MobileMenu、SiteSearchDialog、BackToTop、Breadcrumbs、ArticleNavigation、FeatureGrid／FeaturedWorkSection）、Effects（Reveal）、Editorial 配方（H01、L01）及 CSS | **token 橋接**：生成器輸出 `--brand-*`，Blocks 需要 `--accent/--muted/--heading/--text/--surface/--radius`，配方需要 `--ed-*`；文件沒有對照表（N13） |
| 搜尋：Pagefind＋`exact-zh.json` 由生成器 build 腳本自動產生 | 在 `<main>` 加 `data-pagefind-body` 讓 404 不進 Pagefind |
| 草稿：`drafts/` 資料夾模型＋`draft:true` 相容 | — |
| — | H01 索引軌原本寫死 `href="#"`、圖說寫死「示意圖說」→ 改為 props（N18） |
| — | 主題頁、文章前後篇、麵包屑資料串接；`aria-current`（StudentNavigation／MobileMenu 皆沒有） |
| — | 預設 `noindex`、`build-commit` 標記（核對 Preview 版本用） |
| — | 依 `audit.mjs` 修正生成器頁尾 10.8px 字與 31px 觸控目標（N11）；為避開 N7 誤報改寫跳過連結 |
| `verify-v2-8-output`、`verify-student-navigation`、`audit.mjs` | 獨立驗證器 `scripts/qa/`：static（含內部連結、JSON／Pagefind 片段草稿掃描、Sitemap 雙向、noindex）、browser（4 寬度互動）、a11y（axe）、故障注入執行器 |

---

## 5. 故障注入與修復驗證

每個案例都從暫存站複製一份、只注入一個缺陷、重新 build，再以同一份輸出分別執行工作坊工具與獨立工具。執行器會在 `dist/__variant.txt` 寫入案例 ID，並確認伺服器回傳的確是該變體才開始測試。

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
| F10-menu-focus | 移除 `trigger.focus()` | — | 無效注入 | — | — | 無效注入 | — |
| F10b-menu-esc-blocked | 手機選單攔截 cancel，Esc 無法關閉 | — | 漏掉 | — | — | **抓到** | — |
| F11-no-exact-index | build 漏掉中文完整比對索引 | 漏掉 | — | — | **抓到** | **抓到** | — |
| F12-no-description | 所有頁面缺 meta description（對照組） | **抓到** | — | — | **抓到** | — | — |
| F13-draft-in-rss | RSS 未過濾草稿（對照組） | **抓到** | — | — | **抓到** | — | — |
| F14-reveal-stuck | Reveal 永遠不顯示內容（JS 不加 visible class） | — | — | 漏掉 | — | **抓到** | — |

（*＝本次獨立工具，非工作坊原生；「—」＝該工具不適用此類缺陷，未執行。）

**判讀**
- **基準 F00 六個工具全部 PASS**，代表每個「抓到」都來自注入的缺陷本身；移除缺陷（即 F00）即恢復 PASS，這同時是「修復後重驗」的證據。
- **工作坊工具正確抓到**：F02 手機選單缺項、F01 導航 404、F07 手機溢出（nav、audit）、F05 drafts 資料夾被公開、F12 缺 description、F13 RSS 草稿。舊版 W7 修正後，導航驗證器在本站不再誤報。
- **工作坊工具漏掉、且屬於其聲稱職責的**：F03、F04（草稿外洩，`astro-content-publishing` 規定「no gate, no PASS」）→ N6；F08（對比，checklist 要求 `contrastFail = 0`）→ N8；F14（內容永遠不顯示）→ N9。
- **不在工作坊工具範圍內**（記錄但不算工具缺陷）：F06 頁尾 404 不屬於「主要導覽」驗證範圍；F09 noindex、F11 搜尋索引、F10b 手機選單 Esc，目前沒有任何工作坊工具負責 → 學員網站只能靠 AI 自行補驗證。
- **F10 為無效注入**：拿掉 `trigger.focus()` 後，原生 `<dialog>` 關閉時 Chromium 仍自動把焦點還給開啟按鈕（已在變體中確認程式碼確實被移除、焦點仍正確返回），不是缺陷，因此兩個工具都沒報錯是正確的。另以 F10b（攔截 `cancel` 使 Esc 失效）作為有效的互動故障，瀏覽器檢查正確抓到。

**對網站實際修復的重驗**
| 問題（來源） | 修復 | 重驗 |
|---|---|---|
| 頁尾 10.8px、觸控 31px、品牌連結 34px（audit WARN；生成器 N11） | `public/site.css` 補規則 | audit 32 組（8 頁 × 4 寬度）全 0 FAIL／0 WARN |
| 跳過連結被 audit 判 FAIL（N7） | 改用 `translateY` 移出畫面、保持 ≥44px | 同上；鍵盤 Tab 仍可見 |
| 首頁 H1 5 行（A1） | 縮短文案 | 1440 → 3 行（截圖目視） |
| 404 被 Pagefind 索引（N12） | `data-pagefind-body` 僅加在非 noindex 頁 | 暫存站 Pagefind 只索引 9 個內容頁，404 未列入（骨架為 7 頁含 404）；static 檢查通過 |


---

## 6. 部署版本、Log 與截圖

### 6.1 部署與版本核對
| 項目 | 值 | 核對方式 |
|---|---|---|
| Cloudflare 專案 | `balcony-field-notes-qa`（先前建立；Git 整合本倉庫） | API：`production_branch = production-not-approved`、`production_deployments_enabled = false`、`preview_deployment_setting = all` |
| 網站 commit | `85457d6bc8c2869b19f433486225a31dace7b362` | PR #2 head（當時） |
| 部署 ID | `011d368a-ef8c-4587-9991-0ec21e9f208d`（environment = **preview**） | Cloudflare API |
| 不可變網址 | https://011d368a.balcony-field-notes-qa.pages.dev/ | 外部 `curl`：200、`x-robots-tag: noindex`、HTML `build-commit` = `85457d6…` |
| 分支別名 | https://claude-gracious-ptolemy-byvv.balcony-field-notes-qa.pages.dev/ | 同上（名稱被 Cloudflare 截斷，E2） |
| Production | `https://balcony-field-notes-qa.pages.dev/` → 404；部署清單無 production | 外部 `curl`＋API |
| 草稿 | `/articles/monstera-split-leaf/`、`/articles/winter-pothos/` → 404 | 外部 `curl` |
| 建置 Log | Node 22.22.0、`npm clean-install`、`astro build` 10 頁、Pagefind 9 頁、`exact-zh` 9 頁、部署成功 | `evidence/remote/cloudflare-build-log-85457d6.txt` |
| GitHub Checks（PR #2） | `Cloudflare Pages` ✅、`verify` ✅（`pr-check.yml`：只有 install＋build＋上傳 Artifact，N19） | PR #2 checks／job log |
| 遠端瀏覽器檢查 | 233 PASS／0 FAIL（含 build-commit＝SHA、noindex） | `evidence/remote/browser-remote.json` |
| 遠端 axe | 22／22 狀態 0 違規 | `evidence/tools-temp-site/a11y-remote.json` |
| 舊部署 R1 | `https://a53f1fcb.balcony-field-notes-qa.pages.dev/articles/monstera-first-split-leaf/` 仍 200（`build-commit` = `2aae171`） | 外部 `curl`；**未刪除** |

本報告與驗證腳本之後的 commit 只新增 `docs/`、`scripts/qa/`，不影響 `dist/` 內容；每次推送 Cloudflare 都會產生新的 preview 部署，最新部署的 SHA 核對結果記在 PR #2 說明中。

### 6.2 四寬度截圖（遠端 Preview `011d368a`，先逐段捲動觸發 Reveal 後整頁截圖）
- 首頁四寬度合成：`evidence/screens/home-4-widths.jpg`
- 首頁、陽台工具（`/page-custom-1/`）、文章列表、文章頁 × 1440／1280／768／390：`evidence/screens/*.jpg`
- 規劃器 1440／390：`evidence/planner/planner-*.png`
- 反例（audit.mjs 不捲動造成的空白截圖）：`evidence/tools-temp-site/audit-blank-reveal-home-1440.png`

目視結果：四寬度無水平捲動；1440／1280 桌機雙層選單、768／390 改為漢堡選單＋搜尋；Hero、最近紀錄、精選卡片、頁尾在各寬度正常重排；手機頁尾連結兩欄、觸控目標 ≥44px。


---

## 7. 缺陷清單（重現方式與影響）

分類：**[工作坊]** 工作坊資源缺陷；**[網站]** 學員網站缺陷；**[AI]** 本次 AI 自己造成；**[環境]** 執行環境。

### 7.1 新版工作坊資源的缺陷

| # | 類別 | 嚴重度 | 位置 | 問題 | 最小重現 | 影響 | 建議 |
|---|---|---|---|---|---|---|---|
| N1 | [工作坊] | 中 | `/starter/` 導航排序 | 用鍵盤（或點擊）按 ↑／↓／→ 後，清單重繪、焦點掉到 `BODY`；第二次 Enter 無作用，Tab 從清單頂端重來。頁面明示「觸控或鍵盤可使用 ↑ ↓ 排序」 | `evidence/planner/planner-kbd.mjs`：聚焦「上移：關於我」按 Enter → `document.activeElement` = BODY | 鍵盤／螢幕閱讀器使用者無法連續排序（WCAG 2.4.3） | 重繪後把焦點放回同一列的同一按鈕 |
| N2 | [工作坊] | 中 | 生成器 `SelectedPatterns.astro` 頁尾 | 頁尾連結用 `x.id+'/'`，忽略 `path` | `evidence/repro/v1-workshop-fixture.json`（就是 `verify-starter-export.mjs` 的 knowledge 資料）→ 每頁頁尾「閱讀指南」→ `/page-custom-guide/` 404 | 使用自訂網址＋任一頁腳樣式的網站，**每一頁**都有死連結 | 統一用 `x.path??x.id+'/'` |
| N3 | [工作坊] | 中 | 生成器 `index.astro` Hero CTA | `base+config.primaryCta.pageId+'/'`，忽略 `path`（頁首 CTA 正確） | `evidence/repro/v2-cta-custom-path.json` → 首頁主要按鈕 404 | 首頁最重要的按鈕失效 | 同上 |
| N4 | [工作坊] | 低 | 生成器驗證 | `articles` 項目可設 `path: notes/`，生成器接受，但文章頁固定在 `/articles/` | `evidence/repro/v3-articles-path.json`：導航與 CTA → `/notes/` 404（`verify-v2-8-output` 有抓到） | AI 改設定時容易犯錯 | 生成器拒絕 `articles` 的自訂 path，或真正支援 |
| N5 | [工作坊] | 中 | `verify-starter-export.mjs` | 只檢查檔案存在與字串，不檢查內部連結；自己的測試資料產生 5 個 404 仍輸出「Starter exporter checks passed」 | `FULL_STARTER_BUILD=1 node scripts/verify-starter-export.mjs` → exit 0（`evidence/repro/verify-starter-export-full.log`）＋ V1 連結檢查 5 broken | 工作坊自己的 CI 無法發現 N2／N3 | 加入 dist 內部連結檢查 |
| N6 | [工作坊] | 中 | `verify-v2-8-output.mjs --student-site` | (a) 不檢查內部連結（F01、F06 未抓到）；(b) 不檢查 noindex（F09）；(c) 草稿閘門只掃 HTML／RSS／Sitemap，不掃 JSON 端點（F03）；(d) 標題比對需 ≥8 字，7 字中文標題純文字外洩未抓到（F04）；(e) 不檢查搜尋索引是否產生（F11） | 第 5 節 F01、F03、F04、F06、F09、F11 | Skill 規定「no gate, no PASS」，但閘門本身會放過真實外洩 | 掃描 `dist/**/*.json` 與解壓 Pagefind 片段；中文標題門檻改以字元數 ≥4 或同時比對內文片段；加連結檢查 |
| N7 | [工作坊] | 中 | Editorial `audit.mjs` | 兩種標準跳過連結寫法都判 FAIL：`left:-9999px` → 「元素超出視窗」；`clip-path`＋1×1 → 「觸控目標 <24px」。**生成器自己的輸出每一頁都 FAIL** | 生成器骨架或 `evidence/tools-temp-site/temp-audit.log`（每頁 `a.skip L-9999`）、`temp-audit-after-fix.log`（`a.skip 1x1`） | 學員網站永遠紅燈，AI 可能為了過關而移除無障礙功能 | 排除 `.skip`／`:not(:focus)` 的跳過連結，或辨識視覺隱藏模式 |
| N8 | [工作坊] | 中 | `audit.mjs` 評分 | 對比不足只列 WARN、結束碼 0；但 `checklists/visual-qa.md` 規定 `contrastFail = 0` | F08：1.73:1 文字 → audit exit 0（axe 抓到） | 「腳本通過」不代表對比合格 | 對比不足列為 FAIL |
| N9 | [工作坊] | 中 | `audit.mjs` × Effects `Reveal` | 整頁截圖不捲動，Reveal 區段停在 opacity 0；量測又把 opacity 0 元素排除 → 截圖大片空白但全綠 | `evidence/tools-temp-site/audit-blank-reveal-home-1440.png`；F14 | 依 Skill「看截圖」的 AI 會看到空白或誤判；真正的「內容永遠不顯示」也抓不到 | 截圖前逐段捲動或以 `reducedMotion:'reduce'` 截圖；回報被隱藏的內容 |
| N10 | [工作坊] | 低 | `audit.mjs` 評分 | checklist 規定 `h1.lines ≤ 4`，但評分只在 ≤480px 且 >5 行時 WARN；桌機 5 行未提示 | 本次修正前首頁 1440 h1 = 5 行，audit 無任何提示 | 構圖問題漏報 | 依 checklist 實作 |
| N11 | [工作坊] | 低 | 生成器頁尾樣式 | `<small>` 在 13px 容器內 = 10.8px；頁尾連結 31px 高 → 違反 Editorial Skill「文字 ≥12px、觸控 ≥44px」 | `temp-audit.log` WARN | 生成器輸出與工作坊自身規範衝突 | 調整頁尾 CSS |
| N12 | [工作坊] | 低 | 文件一致性 | `astro-content-publishing` 寫「生成骨架預設只跑 Astro Build，不包含搜尋」，但新版生成器已在 build 中加入 Pagefind 與 `exact-zh.json`；骨架 Pagefind 會索引 404 | 比對 SKILL.md 與 `package.json` | AI 可能重複加搜尋或誤判 | 更新 Skill；骨架加 `data-pagefind-body` |
| N13 | [工作坊] | 低 | 整合文件 | 生成器 token（`--brand-*`、`--ink`、`--bg`）與 Blocks（`--accent/--muted/--heading/--text/--surface/--radius`）、配方（`--ed-*`）三套命名沒有對照表 | 直接把 Blocks 放進骨架 → 依後備色顯示，與品牌色不符 | 每個 AI 要自行推導 | 提供 token 橋接檔 |
| N14 | [工作坊] | 低 | `/starter/` | 自訂頁面沒有網址欄位（生成器已支援 `path`）→ 學員網址只能是 `/page-custom-1/` | `evidence/planner/site-brief.json` | 網址不好讀；AI 事後改 `path` 會觸發 N2／N3 | 規劃器加網址欄位 |
| N15 | [工作坊] | 低 | 配色預設（舊 W5 殘留） | 紙墨 accent 2.62:1、石板 accent 2.88:1、植感 secondary 2.76:1 | `planner-log.txt` THEMES | 若當文字色會不合格；頁面已有提醒 | 標示「僅裝飾」或調整 |
| N16 | [工作坊] | 低 | `/starter/` | axe serious：`#plan-preview` 可捲動區無可聚焦內容 | `axe-workshop-pages.json` | 鍵盤無法捲動預覽 | 加 `tabindex="0"` 與名稱 |
| N17 | [工作坊] | 低 | `SiteSearchDialog` | 有文字時第一次 Esc 只清空欄位（Chromium `type=search` 原生行為），第二次才關閉；按鈕標示「關閉搜尋（Esc）」 | 第 4 節、`browser-checks.mjs` 註解 | 輕微困惑 | 在 input 的 keydown 處理 Escape 直接關閉 |
| N18 | [工作坊] | 低 | 配方 H01 | 索引軌連結寫死 `href="#"`、圖說寫死「示意圖說」 | 原始碼 | 直接使用會有假連結 | 改為 props |
| N19 | [工作坊] | 低 | 生成器 `pr-check.yml` | 只做 build＋上傳 Artifact，不跑任何驗證器；`actions/*@v4` 觸發 Node 20 淘汰警告 | PR #2 `verify` job Log | GitHub 綠燈只代表能 build | workflow 加入 v2-8／連結檢查；更新 action 版本 |
| N20 | [工作坊] | 資訊 | 起始提示詞 | `/guide/`、`START-HERE.md`、`README.md` 給了三個不同的開場提示詞 | 三份文件 | 輕微 | 統一 |

### 7.2 網站缺陷（既有陽台觀察室，新工具新發現；依指示未修改 PR #1）
| # | 問題 | 影響 |
|---|---|---|
| S1 | 桌機選單「新手入門・總覽／陽台工具」與手機選單「新手入門／新手入門・陽台工具」標籤不一致（網址與順序一致） | 低；先前被 W7 誤報遮蔽 |
| S2 | 9–10px 等寬標籤、手機 3 個 <24px 觸控目標、H1 line-height 0.98 | 低；繼承自 A01 原型 |
| R1 | 舊不可變部署 `a53f1fcb` 仍可讀到撤回的文章 | 仍待你決定是否刪除該部署 |

### 7.3 AI 自行造成（本次已修正）
| # | 問題 | 修正 |
|---|---|---|
| A1 | 首頁 H1 在 1440 斷成 5 行（標題太長） | 縮短文案 → 3 行 |
| A2 | 我的 static-checks 正規式沒考慮 `data-astro-cid` 屬性 → 誤報 2 FAIL | 修正正規式 |
| A3 | browser-checks 搜尋固定等 1.2 秒，遠端 Pagefind WASM 較慢 → 誤報 4 FAIL | 改為等待狀態文字更新 |
| A4 | 故障注入執行器第一版用 `npx` 啟動伺服器，子行程殺不掉，後續案例都打到舊伺服器 → F01／F02／F07／F08 結果無效 | 改用行程群組＋`__variant.txt` 驗證；整輪重跑 |
| A5 | 第一版 F05（讀整個 `src/content`）因 id 含斜線直接 build 失敗，不是有意義的測試 | 改為較真實的 `{articles,drafts}` 版本 |
| A6 | F10（移除 `trigger.focus()`）不構成缺陷：原生 `<dialog>` 會自動還原焦點 | 標為無效注入，另加 F10b |
| A7 | 用 `pkill -f` 誤殺自己的 shell（環境操作失誤） | 改用 PID |

### 7.4 環境
| # | 問題 |
|---|---|
| E1 | 無頭 Chromium 對含中文的 `download` 檔名一律改為 `download`（無副檔名）；ASCII 檔名正常（`evidence/repro/dltest.mjs`）。非工作坊缺陷，但用無頭瀏覽器的 AI 代理會拿到沒有 `.zip` 的檔案，可考慮提供 ASCII 檔名 |
| E2 | Cloudflare 分支別名會截斷（`claude-gracious-ptolemy-byvv`），不可由分支名推測網址；需從部署 API 或 PR 檢查取得 |


---

## 8. 是否建議交付學員

**有條件建議交付**：新版可以帶完全不會程式的學員從 `/guide/` 走到一個能預覽的網站，而且上次卡住學員的問題大多已修正。但 AI 仍需要補 token 橋接、`aria-current`、noindex 與獨立驗證，學員不會知道這些步驟有沒有做到。

**交付前建議修正（依優先順序）**
1. N2、N3：生成器頁尾與 Hero CTA 改用 `path`（各一行）；N5：`verify-starter-export` 加連結檢查（它本來就該抓到）。
2. N6：`verify-v2-8-output` 加內部連結檢查、noindex 檢查、掃描 JSON 與 Pagefind 片段、修正中文短標題門檻。
3. N7、N8、N9：`audit.mjs` 排除視覺隱藏的跳過連結、對比不足改為 FAIL、截圖前捲動或以 reduced-motion 截圖。
4. N1、N16：規劃器排序後保留焦點；預覽區可聚焦。
5. N19：生成的 `pr-check.yml` 實際執行驗證器，避免「GitHub 綠燈」被當成驗收通過。

**可以之後再處理**：N4、N10–N15、N17、N18、N20；S1、S2 屬學員網站，可在下次維護時順便修正。

**需要你決定**：R1（是否刪除舊部署 `a53f1fcb`）；暫存 PR #2 與其 Preview 部署是否保留（我沒有刪除任何部署）。

**回答「是否真的解決了先前的問題、有沒有引入退化」**
- 已解決：W2、W3、W4、W7、W8、W9、W11、W12、W13（實測確認），W1 改為以固定網址交付。
- 部分解決：W5、W10。
- 新增功能帶來的新問題：Editorial `audit.mjs`（N7–N10）、`verify-starter-export`（N5）、生成器自訂網址（N2–N4）。
- 退化：沒有發現「舊版正常、新版變壞」的功能；N1（規劃器焦點）先前沒有測過，無法判定是不是退化。


---

## 9. 證據包

倉庫內 `docs/regression/evidence/`（約 3–4 MB）：

| 路徑 | 內容 |
|---|---|
| `workshop/` | 入口頁 HTTP 標頭與文字擷取、兩個 ZIP 的 SHA-256、資料包 355 檔清單與雜湊、工作坊頁面 axe 結果 |
| `planner/` | 規劃器操作腳本、操作 Log（含 W4／W5 量測）、鍵盤焦點重現腳本（N1）、下載的 `site-brief.json`、1440／390 截圖 |
| `repro/` | N2–N4 最小重現 Brief（V1–V3）、連結檢查器、`verify-starter-export` 完整 Log（N5）、中文下載檔名測試（E1） |
| `tools-temp-site/` | 暫存站上的工作坊工具 Log（v2-8、nav、audit 修正前／中／後）、本機與遠端 axe、本機瀏覽器結果、N9 空白截圖 |
| `tools-prior-site/` | 既有陽台觀察室在新版工具下的結果（v2-8、nav、audit） |
| `remote/` | 遠端瀏覽器檢查結果、Cloudflare 建置 Log |
| `screens/` | 遠端 Preview 四寬度截圖 |
| `fault-injection/` | 16 個案例的結果 JSON、表格、執行 Log、F08／F14 audit 報告 |

重跑方式（需先解壓工作坊資料包到 `$PACK`）：
```bash
npm ci && npm run build && npx astro preview --port 4321
node scripts/qa/static-checks.mjs .
node scripts/qa/browser-checks.mjs http://127.0.0.1:4321/ --shots
node scripts/qa/a11y-checks.mjs http://127.0.0.1:4321/
node $PACK/scripts/verify-v2-8-output.mjs --student-site "$PWD"
WORKSHOP_PACK=$PACK node scripts/qa/fault-injection.mjs /tmp/fi /tmp/fi.json
```

