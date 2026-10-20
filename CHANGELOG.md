# Changelog

時序記錄，只增不改（新內容一律附加在最上方，不回頭改寫舊條目）。完整需求／設計脈絡見 [workplan_v2.md](./workplan_v2.md)，Claude 工作規則見 [CLAUDE.md](./CLAUDE.md)，尚未完成的項目見 [TODO.md](./TODO.md)。

## 2026-10-20

- 修正預設日期仍停在前一天（上一條 UTC 修正部署後使用者回報 10/20 開表單仍顯示 10/19；已確認線上 bundle 為新版）：真正原因是草稿還原。表單一打開就自動存草稿，未改過的預設日期／時間也被存入，草稿只在送出後刪除，因此前一天開過未送出的案件，之後開啟都還原成舊日期與舊時間。`InspectionFormPage.tsx` 新增 `dateTimeTouched` 隨草稿保存，只有使用者手動改過的日期／時間才沿用草稿值，否則改用現在時間；舊版草稿沒有此欄位，視為未改過（刻意改過的過去日期會被重設為今天，第一步可見、可再改）。`npm run build` 通過，尚未在瀏覽器實測。
- 新增照片 Ctrl+V 貼上（電腦版用，主要來源是 Google 相簿網頁「複製圖片」；手機不適用）。新增 `src/lib/clipboardImages.ts`：只取剪貼簿中的 `image/*` 檔案，游標在文字欄位（檔案欄位除外）時不攔截，避免搶走文字貼上。
  - `InspectionFormPage.tsx`：只在「現場照片」步驟監聽貼上，走既有 `handlePhotoSelect`（壓縮、檔名、離線佇列不變）。處理中加鎖，避免連續貼上／選檔拿到相同 `photo_NN` 編號；圖片解析失敗改為顯示錯誤，原本無提示。
  - `InspectionDetailPage.tsx`：貼上後先暫存預覽，按「上傳 N 張」才呼叫 `addPhotosToInspection`，避免誤按 Ctrl+V 直接寫入正式紀錄；不論成敗都清掉暫存（避免部分已落地佇列時重傳重複）。
  - 從 Google 相簿複製到的是畫面顯示的版本，需開大圖再複製，縮圖頁複製畫質不足。
- 照片功能（Drive 授權）防呆：原本未啟用照片功能時仍可選照片並送出，結果照片全標為上傳失敗、簽名被 `submitInspection` 直接略過，檢查頁卻顯示一切正常；頁面重新整理（手機切相機回來常發生）後授權消失、或 token 約 1 小時過期時也會發生同樣情況。
  - `googleDrive.ts`：記錄 `expires_in`，提早 5 分鐘視為過期，`isDriveEnabled()` 過期即回傳 false（詳細頁開太久後再操作也會重新要求授權，取代原本的 401）。
  - `InspectionFormPage.tsx`：選檔與貼上前檢查授權，未啟用不收並提示；照片步驟提示改為即時判斷（含過期）；檢查頁有照片或簽名但授權無效時顯示警告與「啟用照片功能」按鈕並停用送出，送出當下再檢查一次。無照片也無簽名的送出不受影響。
  - 已知限制：新增頁沒有刪除照片的功能，已加照片卻無法完成授權時會無法送出。
- 修正新增巡檢預設日期在台灣 00:00–07:59 顯示為前一天：`toISOString()` 是 UTC，改用本地年月日組字串。（草稿還原的日期不變，舊草稿仍會帶入當時的日期。）
- `npm run build` 通過；尚未在瀏覽器實際操作驗證貼上（含 Google 相簿來源）、授權防呆與過期流程。

## 2026-10-19

- 新增已送出紀錄的補簽／重簽（使用者回報：電腦上送出時沒簽名，回到手機找不到補簽的地方；原因是送出不強制簽名，詳細頁的簽名區塊只在已有簽名時才顯示，編輯功能也不含簽名）。
  - 新增 migration `0003_inspection_update_signature.sql`：`security definer` RPC `insp_update_signature`，admin 或該筆紀錄填報者（`created_by`）可呼叫，只更新 `signature_file_id` 並於同一交易寫入 `insp_inspection_edit_log`（記錄新舊 Drive 檔案 ID；舊簽名檔不刪除）。另收回 `anon` 的 execute（Supabase default privileges 會直接 grant 給 anon，`revoke ... from public` 收不到）。已透過 Supabase SQL Editor 套用到正式資料庫並查詢確認權限。
  - `editInspection.ts` 新增 `updateInspectionSignature()`；`InspectionDetailPage.tsx` 簽名區塊一律顯示（未簽名顯示「尚未簽名」），加上「補簽名／重新簽名」按鈕與簽名板。
- 報表 PDF 可選擇附上修改紀錄：詳細頁新增「PDF 顯示修改紀錄」勾選框（預設不勾，僅 admin 且有修改紀錄時顯示），勾選後 `InspectionPdfDocument.tsx` 於末尾印出「修改紀錄」區塊；簽名紀錄中的 Drive 檔案 ID 在 PDF 上隱藏。
- 兩項皆已部署到正式環境，`npx tsc -b` 通過；尚未在手機／瀏覽器上實際操作驗證補簽與 PDF 版面。

## 2026-10-05

- 修正手機填報只上傳 2 張照片、送出後變 5 張的問題：本機照片佇列 key 依案件固定（`draft-<projectId>`）且送出後從未清除，先前未送出或已上傳過的舊照片會被 `submitInspection` 一併建立紀錄（已上傳過的那些永遠停在「上傳中」）。`offlineQueue.ts` 新增 `deleteQueuedPhotos()`，送出／補上傳完成後清空佇列；送出時排除 `uploaded` 狀態的舊項目；`InspectionFormPage.tsx` 載入時把佇列照片還原到畫面，張數與編號和實際送出一致。該筆紀錄（`9df0079e`）多出的照片已由使用者在明細頁刪除、Drive 多餘檔案手動刪除後重新補上傳 2 張，確認正確。
- 部署注意：本次第一次部署時本機落後 `origin/main` 6 個 commit，以舊程式碼覆蓋了正式環境，隨即 rebase 到最新 `origin/main` 後重新部署。部署前務必先 `git fetch` 確認本機與遠端同步。

## 2026-09-24

- 照片預覽改為折衷方案：`InspectionDetailPage.tsx` 新增 `useEffect`，同一瀏覽器 session 內若已透過填報頁等流程取得 Drive 授權（`isDriveEnabled()`），進詳情頁會自動載入照片縮圖，不用使用者再點一次「顯示照片預覽」；若尚未授權則維持原本「不做靜默授權」政策，按鈕照常等使用者手動點擊觸發 OAuth。
- 修正建立時間／最後修改／修改紀錄時間顯示時區錯誤的問題：`created_at`／`updated_at`／`edited_at` 是 Postgres `timestamptz`，Supabase 回傳 UTC ISO 字串，`InspectionDetailPage.tsx` 原本直接印出來，畫面顯示比台灣時間少 8 小時。新增 `src/lib/formatDateTime.ts`（`toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })`）統一轉換，已在瀏覽器實測確認正確。
- 桌機 UI/UX 調整（使用者反映桌機瀏覽字體/連結觀感偏弱）：
  - `AppHeader.tsx` 導覽列（首頁／巡檢紀錄／後台管理／登出）與各頁「← 返回」連結，原本是淡灰色純底線，改為深色加粗、hover 才顯示底線
  - 各頁標題下方的副標文字（案件廠商/地點、巡檢日期時間/地點/人員）同步加深加粗
  - `ProjectListPage.tsx`／`ProjectDetailPage.tsx`／`HistoryPage.tsx` 補上 `mx-auto max-w-2xl`，桌機寬螢幕下內容不再滿版拉伸，跟其他頁面寬度一致
  - 全站 `text-xs`／`text-sm`／`text-xl` 加上 `md:` 響應式字級（桌機 ≥768px 才生效，手機版面完全不受影響），涵蓋 8 個檔案
- 部署事故記錄：這台電腦沒有 `.netlify/state.json`（被 `.gitignore`，本來就不隨 git 走），直接跑 `netlify deploy --prod` 時 CLI 沒有詢問要不要連結既有站台，而是自動建立了一個全新站台 `symphonious-halva-5e2788`。已發現後用 `netlify unlink` + `netlify link --id 7ad2f601-c31f-4d16-bc0a-ca3548b813a7` 重新連回 `cons-inspect`，再重新 `netlify deploy --prod` 部署到正確站台（`https://cons-inspect.netlify.app`）。誤建立的 `symphonious-halva-5e2788` 站台已確認並刪除（`netlify sites:delete`）。

## 2026-09-18

- 單筆紀錄詳情頁新增簽名預覽：`InspectionDetailPage.tsx` 比照既有「顯示照片預覽」模式新增 `handleShowSignature`，用 `fetchDriveFileAsObjectUrl(signature_file_id)` 抓取並顯示簽名圖片，blob URL 於卸載時釋放。`npx tsc -b` 通過。尚未實際用真機/瀏覽器點過按鈕驗證抓圖流程本身（Drive OAuth 授權彈窗不易透過瀏覽器自動化完整驗證），之後有真實簽名資料時應補一次實測。
- 拉入前次未同步的遠端變更（commit `e11ed4e`）：新增報表 PDF 匯出功能（`generateInspectionPdf.ts`、`InspectionPdfDocument.tsx`，含中文字型檔）、`submitInspection.ts`／`editInspection.ts` 修訂、新增 `ProjectDetailPage.tsx`、新增 Google Drive photo-delete 相關 migration `0002_inspection_owner_delete_photo.sql`、新增 `netlify.toml`。

## 2026-09-08（換到辦公室電腦接續）

- 照片縮圖抓取流程實測通過：走完整填報精靈、上傳 4 張照片、送出後在詳細頁點「顯示照片預覽」，4 張皆正確從 Drive 抓取顯示。
  - 附帶環境問題：dev server 若跑在非 5173 的 port，Google OAuth 會回傳 `origin_mismatch`（Google Cloud Console 的「已授權 JavaScript 來源」只登記了 `http://localhost:5173`）。換電腦或重啟環境時務必確保 dev server 跑在 5173。
- 巡檢紀錄查詢頁「只顯示有『不良』的紀錄」篩選功能實測通過。
- 修正離線佇列重大缺陷：`submitInspection.ts` 原本簽名上傳沒有包 try/catch，網路失敗會讓整筆送出「看起來」失敗，導致孤兒紀錄，且使用者重試會產生重複紀錄。已修正為 try/catch 吞掉錯誤、`signature_file_id` 留空並繼續處理照片。已用模擬 Drive fetch 失敗方式實測：修復前重試 2 次產生 2 筆孤兒重複紀錄；修復後同情境只產生 1 筆完整紀錄。目前規模下未加簽名重試佇列或 idempotency 機制（範圍已與使用者確認）。
- 新增：案件地點自動帶入巡檢表單（`InspectionFormPage.tsx`，若案件有 `location` 且使用者尚未輸入，自動帶入且可覆蓋編輯）。
- §7.3 表單草稿本機暫存實作並實測通過：頁面載入還原 IndexedDB 草稿，送出成功後清除草稿；與地點自動帶入互不覆蓋（皆用「若目前是空的才填入」判斷式）。
- `editInspection.ts` 的 edit_log 寫入時機修正：原本全部欄位更新完才一次寫入 log，中途失敗會讓已生效的異動完全沒有紀錄。已修正為每完成一項異動就立刻寫入對應 log。已用模擬中途失敗方式實測，無缺漏、無孤兒 log。
- `InspectionDetailPage.tsx` 的 `handleSave` 補上 catch 區塊：原本失敗時畫面無任何錯誤提示，且重試會拿舊資料重複 diff、重複寫入 log。已修正為顯示 `saveError`，並在 catch 內重新 `load()` 讓資料反映實際已生效的異動。
- 一般使用者（user）角色權限首次實測，全部通過：案件可見範圍、RLS 阻擋未指派案件、填報 insert policy、編輯/修改紀錄區塊對 user 隱藏、歷史紀錄範圍限制、`/admin/projects` 導回首頁，皆驗證正確。
- 已部署到 Netlify 正式環境（`https://cons-inspect.netlify.app`），完整流程（登入→建案→填報→Drive 授權→上傳→簽名→送出→詳情頁顯示）實測通過。
  - 附帶發現：使用者另一個共用同個 Supabase 專案的舊專案，當初沒把該專案的 Netlify 網域加進 Supabase Redirect URLs，導致該網域登入 OAuth 後會 fallback 導到「標案管理平台」。不影響 cons-inspect，記錄供之後補上。
  - 附帶記錄：這台電腦全域 `~/.claude/settings.json` 裡另一專案（`dae-reserve`）的 `autoMode.environment` 規則誤判 `netlify deploy --prod` 為受保護正式環境而擋下。已改用專案層級 `.claude/settings.local.json` allow list 解決，未動全域設定。

## 2026-09-08

- 新增修改紀錄功能：`editInspection.ts` + `InspectionDetailPage` admin-only 編輯 UI，逐欄位 diff 寫入 `insp_inspection_edit_log`，頁面顯示「修改紀錄」。已於瀏覽器實測。
- 新增照片縮圖顯示：`googleDrive.ts` 新增 `fetchDriveFileAsObjectUrl()`，沿用既有前端 Drive OAuth token。UI 已確認正常渲染，實際抓圖流程當時尚未實測（已於後續 2026-09-08 辦公室電腦 session 補測，見上）。
- 修正 `AdminProjectsPage` 新增案件時 date 欄位空字串導致 Postgres insert 失敗但錯誤被吞掉的問題：空字串轉 `null`，錯誤改用 inline 訊息顯示（原本 `alert()`，避免卡住瀏覽器自動化測試）。
- 新增登出功能：`src/components/AppHeader.tsx`（顯示登入者 email/角色 + 登出連結），掛在 `ProtectedRoute` 上。

## 2026-09-07

- 專案骨架建立：Vite + React + TypeScript + Tailwind。
- 路由：登入、案件列表、巡檢填報精靈（六步驟）、歷史紀錄、單筆紀錄查看、後台案件管理。
- `supabase/migrations/0001_init.sql` 於 Supabase Dashboard 執行完成，8 張 `insp_` 表與標案管理平台既有表並存於同一 schema。
- Google Drive OAuth Client ID、Drive 根資料夾建立完成並填入 `.env`。
- 兩位 admin 帳號寫入 `insp_user_roles`。
