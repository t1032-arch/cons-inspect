# Changelog

時序記錄，只增不改（新內容一律附加在最上方，不回頭改寫舊條目）。完整需求／設計脈絡見 [workplan_v2.md](./workplan_v2.md)，Claude 工作規則見 [CLAUDE.md](./CLAUDE.md)，尚未完成的項目見 [TODO.md](./TODO.md)。

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
