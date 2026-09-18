# TODO

尚未完成的項目。做完就從這份清單刪除該條（紀錄「做過什麼」是 [CHANGELOG.md](./CHANGELOG.md) 的責任，這裡只放「還沒做」）。

1. `npm audit` 有 moderate/high 漏洞（vite/esbuild 的 dev-server 漏洞、react-router-dom 的 open redirect），需要 major version 升級才能修（vite 5→8、react-router-dom 6→7）。已與使用者確認先擱置，不影響目前功能開發。
2. **小 UX 缺口**：一般使用者用網址直接訪問自己沒被指派的案件時，畫面會永遠卡在「載入案件資料中…」（RLS 讓查詢回傳空值，`project` state 永遠是 `null`），沒有任何「你沒有權限」或「案件不存在」的提示。不是安全性問題（資料確實沒有外洩），但體驗不好，建議加逾時或空值判斷顯示提示訊息。
3. **手機／平板真機測試尚未做**：目前所有測試都只在桌面版 Chrome 做過，響應式版面、觸控簽名、相機拍照都還沒在真實裝置上驗證過。已有正式網址 `https://cons-inspect.netlify.app`，可直接拿手機測試。
4. **沒有自動化測試**：目前完全依賴人工/live 瀏覽器測試，沒有任何 unit/integration test，每次修改都要重新手動走一次驗證流程。
5. **目前是手動部署**：`netlify deploy --prod` 是本機手動觸發的一次性部署，還沒接上 GitHub 自動部署（push 到 main 就自動 build+deploy）。要接的話到 Netlify Dashboard 連結 GitHub repo。
6. 簽名預覽功能（2026-09-18 新增）尚未用真實資料做過瀏覽器實測——需要一筆真的透過填報精靈上傳過簽名的紀錄，點「顯示簽名預覽」確認能正確從 Drive 抓取顯示。

## 已知殘留物（非阻塞，供之後想到時清理）

- Drive 根資料夾（13001 帳號）下 `測試案件-QA請忽略`、`測試案件-照片測試-QA請忽略` 等測試用子資料夾，以及離線佇列測試留下的匿名巡檢紀錄資料夾。皆為純測試殘留、無真實資料，Supabase 端已清除乾淨，只有 Drive 端的空資料夾需手動去根資料夾清理。
- 使用者另一個共用同個 Supabase 專案、部署在 Netlify 的舊專案，尚未把該專案的 Netlify 網域加進 Supabase Redirect URLs（不影響 cons-inspect，記錄供之後一併補上）。
