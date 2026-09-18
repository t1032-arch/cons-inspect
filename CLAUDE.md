# CLAUDE.md

給 Claude Code 在這個 repo 工作時使用的現況操作手冊。只放「現在」需要知道的東西；歷史沿革看 [CHANGELOG.md](./CHANGELOG.md)，完整需求／設計理由看 [workplan_v2.md](./workplan_v2.md)，還沒做的事看 [TODO.md](./TODO.md)。

## 專案

學校施工巡檢填報紀錄系統（Vite + React + TypeScript + Tailwind + Supabase + Google Drive）。Production：`https://cons-inspect.netlify.app`（Netlify site `cons-inspect`，account slug `t1032`）。

## 指令

```
npm install       # 含 npm pull 後務必重跑，這次 pull 曾漏跑導致 @react-pdf/renderer 型別找不到
npm run dev       # 務必跑在 5173，見下方「環境陷阱」
npx tsc -b        # 型別檢查
npm run build     # tsc -b && vite build
npm run lint
```

## 架構重點

- **共用 Supabase 專案**：與另一個「標案管理平台」專案共用同一個 Postgres/`public` schema。本專案表一律 `insp_` 前綴，**不與** `projects`／`procurement_items` 建外鍵。角色判斷讀自己的 `insp_user_roles`，**不沿用**標案管理平台的 `user_roles`（語意不同）。`auth.users` 是共用的（同一組 Google 帳號可登兩系統）。
- **Google Drive 串接**：OAuth scope 用 `drive`（不是 `drive.file`，因為要跨使用者共用資料夾）。不做靜默授權——需使用者主動點擊啟用。`requestAccessToken` 帶 `hint: user.email`。`tokenClient` 每次 GIS callback 後重置為 `null`。資料夾採巢狀結構（案件／巡檢紀錄各一層）——**這是本專案自己的設計**，「發文平台」姊妹專案實際上是單一固定 `FOLDER_ID` 扁平存檔，兩者不同，不要混淆。
- **離線佇列**：`src/lib/offlineQueue.ts` 用 IndexedDB。表單草稿與待上傳照片都先落地本機，送出不因單張照片上傳失敗而整筆失敗；簽名/照片上傳失敗一律 try/catch 吞掉、標記狀態繼續，不 throw 中斷整筆送出（`submitInspection.ts`）。
- **修改紀錄**：`editInspection.ts` 逐欄位/逐項目**各自獨立**更新＋寫入 `insp_inspection_edit_log`，不是全部更新完才一次寫入——避免中途失敗時已生效的異動遺漏紀錄。
- **權限**：`insp_is_admin()` 放行 admin 全部操作；一般使用者靠 RLS 依 `insp_project_assignees` 限定可見/可寫範圍，前端另外用 `role` 隱藏 admin-only UI（編輯按鈕、修改紀錄區塊、後台路由）。

## 環境陷阱

- **dev server 必須跑在 port 5173**：Google Cloud Console 的「已授權 JavaScript 來源」只登記了 `http://localhost:5173`，跑在其他 port（例如 5173 被佔用改用 5174）會讓 Drive OAuth 回傳 `origin_mismatch`。
- **`.env` 不會跟著 git 走**（故意排除，含 service role key）。換電腦要手動建立，需要的變數與取得方式見 [README.md](./README.md)。
- **全域 `~/.claude/settings.json` 可能誤傷本專案**：這台電腦上曾有另一個專案（`dae-reserve`）寫的 `autoMode.environment` 全域規則，把任何含 `prod`/`production` 字樣的目標都當受保護環境擋下，導致本專案 `netlify deploy --prod` 被誤判擋下。已用本專案 `.claude/settings.local.json` 的 `permissions.allow` 解決（放行 `netlify deploy`／`netlify sites:*`／`netlify env:*`），沒有動全域設定。之後遇到類似情況優先用專案層級 allow list，不要改全域規則。

## 文件分工

- `README.md`：人類看的專案介紹＋本機開發設定步驟
- `CLAUDE.md`（本檔）：Claude 每次工作要知道的現況（架構、指令、陷阱）
- `workplan_v2.md`：完整需求規格與設計決策的詳細理由（§1–21），定案後不常變動
- `CHANGELOG.md`：時序記錄，只增不改
- `TODO.md`：還沒做的事，做完就刪除該條
