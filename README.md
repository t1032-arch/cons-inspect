# cons-inspect

學校施工巡檢填報紀錄系統：供校內承辦/行政/工程管理人員以手機或平板快速記錄施工現場的職安衛與環境狀況，含照片、簽名、Google Drive 儲存與離線暫存。

- Production：<https://cons-inspect.netlify.app>
- 技術棧：Vite + React + TypeScript + Tailwind CSS，Supabase（Postgres + Auth + RLS），Google Drive（照片/簽名儲存）

## 本機開發設定

```bash
git clone https://github.com/t1032-arch/cons-inspect
cd cons-inspect
npm install
```

在專案根目錄建立 `.env`（不會跟著 git 走，需手動建立）：

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID=
```

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`：Supabase Dashboard → Project Settings → API。本專案與「標案管理平台」共用同一個 Supabase 專案，用同一組值即可。`SUPABASE_SERVICE_ROLE_KEY` 只給本機測試腳本用，**不會**進前端 build，也不要放進 Netlify 環境變數。
- `VITE_GOOGLE_CLIENT_ID`：Google Cloud Console 專案 `cons-inspect`（獨立於其他姊妹專案，不共用）的 OAuth Web application 憑證，scope 需手動加入 `https://www.googleapis.com/auth/drive`（不在預設勾選清單中），並將 `http://localhost:5173` 加入「已授權的 JavaScript 來源」。
- `VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID`：「施工巡檢」根資料夾 ID，一般存取權設成「同網域使用者皆可編輯」。

```bash
npm run dev   # 必須跑在 5173，其他 port 會導致 Google OAuth origin_mismatch
```

## 文件

- [CLAUDE.md](./CLAUDE.md) — Claude Code 在此 repo 工作的現況操作手冊（架構、指令、環境陷阱）
- [workplan_v2.md](./workplan_v2.md) — 完整需求規格與設計決策
- [CHANGELOG.md](./CHANGELOG.md) — 開發時序記錄
- [TODO.md](./TODO.md) — 尚待完成事項
