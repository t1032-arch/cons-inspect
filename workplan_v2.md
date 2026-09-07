# 學校施工巡檢填報紀錄系統｜Work Plan v2

> 本版基於原始 work plan 修訂，整合以下討論結論：Google Drive 串接技術細節（沿用「發文平台」既有做法）、照片壓縮規格、現場離線佇列需求、案件指派權限、資料結構補強。變更處於各節內以「**v2 更新**」標示。

## 1. 專案目標

建立一套適用於學校施工管理的「施工巡檢填報紀錄系統」，供校內承辦人員、行政人員或工程管理相關人員使用。

系統需同時適用於：

- 較大規模工程
- 一般修繕
- 冷氣安裝
- 設備安裝
- 小型工程

巡檢重點以「現場容易辨識、可直接觀察的職安衛與施工環境狀況」為主，不以查驗證照、資格文件或專業檢測數據為主要目的。

核心設計原則：

1. 手機／平板優先
2. 操作快速
3. 每一巡檢項目可獨立判斷
4. 不預設評分值，避免誤填
5. 可拍照、簽名並保存完整紀錄
6. 可由後台管理承攬案件
7. 照片可串接 Google Drive 儲存
8. 保留備註欄，故不另設「其他巡檢項目」
9. **（v2 新增）現場網路不穩定時，填報資料與照片需先本機暫存，不因斷線遺失**

---

## 2. 使用角色

### 2.1 巡檢填報者

主要功能：

- 選擇承攬案件（**v2：僅顯示自己被指派的案件，見第18節**）
- 填寫巡檢日期、地點等基本資料
- 逐項選擇巡檢結果
- 填寫備註
- 拍照或上傳現場照片
- 手寫簽名
- 送出巡檢紀錄
- 查閱自己或權限範圍內的歷史紀錄

### 2.2 後台管理者

主要功能：

- 新增、編輯、停用承攬案件
- 管理案件基本資料
- **（v2 新增）指派特定填報者至特定案件**
- 查閱所有巡檢紀錄
- 依案件、日期、巡檢結果等條件查詢
- 查看照片與簽名
- 匯出巡檢紀錄
- 管理 Google Drive 儲存位置或案件資料夾

---

## 3. 承攬案件管理

後台可新增承攬案件，前端填報時由下拉選單選取。

### 建議案件欄位

- 案件名稱
- 工程／採購名稱
- 承攬廠商
- 施工地點
- 開工日期
- 預定完工日期
- 承辦單位
- 承辦人
- 備註
- 狀態：進行中／已完成／停用
- **（v2 新增）指派填報人員清單（多對多，見第18節權限設計）**

### 前端案件選擇

- 預設顯示「進行中」且「自己被指派」的案件
- 可搜尋案件名稱
- 不設「其他」巡檢項目
- 若有未列入案件，可由後台先新增案件後再填報

---

## 4. 巡檢表基本資料

每次巡檢建立一筆獨立紀錄。

### 建議欄位

- 承攬案件
- 巡檢日期
- 巡檢時間
- 巡檢地點
- 巡檢人員
- 天候（選配）
- 備註
- 現場照片
- 巡檢人員簽名

日期與時間可自動帶入當下時間，但允許修改。

---

## 5. 巡檢項目

每一項均提供以下四個選項：

- 良好
- 尚可
- 不良
- 不適用

### UI 規則

- 所有巡檢項目「無預設值」
- 使用者必須主動選擇
- 「不適用」使用不同色系顯示，避免與一般評價混淆
- 若選擇「不良」，建議介面提醒填寫備註或拍照，但不強制阻擋送出
- 手機畫面以短標題為主，必要時可點擊說明文字

### 巡檢項目清單

#### 1. 人員防護
是否配戴必要防護具，有無明顯危險行為。

#### 2. 區域隔離與警示
施工區、危險區是否有圍設或警示。

#### 3. 高處作業安全
梯具、施工架是否穩固，防墜措施是否適當。

#### 4. 施工用電安全
電線、插座、配電及電動工具有無明顯危險。

#### 5. 機具設備安全
機具、工具是否正常使用，有無明顯危險。

#### 6. 吊掛與重物作業
吊掛區是否管制，重物搬運是否安全。

#### 7. 動火與防火安全
動火周邊是否安全，滅火設備及鋼瓶是否妥善。

#### 8. 材料與現場整理
材料、工具及廢料是否整齊，通道是否暢通。

#### 9. 通風與照明
作業場所通風及照明是否足夠。

#### 10. 校園動線與環境
是否影響師生通行，粉塵、噪音等是否妥善控制。

**（v2 備註）項目文字（標題＋說明）不存進 `insp_inspection_items` 逐筆紀錄，改存於獨立定義表，見第16節。**

---

## 6. 備註欄

設置一個自由填寫的「備註」欄，供巡檢者記錄：

- 缺失位置
- 異常情況
- 改善要求
- 廠商回應
- 現場特殊狀況
- 其他無法歸類的事項

因此巡檢項目本身不另設「其他」。

---

## 7. 照片上傳（v2 大幅更新）

### 前端需求

- 可直接啟用手機相機拍照
- 可從裝置相簿選取照片
- 支援一次上傳多張照片
- 上傳前可預覽
- 可刪除尚未送出的照片
- 每張照片可選填簡短說明

### 7.1 照片壓縮規格（v2 新增）

上傳前一律先在瀏覽器端壓縮，目的是加快現場行動網路上傳速度，**不是為了節省 Drive 容量**（Drive 容量無虞）。

- 長邊（不論橫式/直式）上限 **1920px**，短邊依原比例縮放，不變形
- JPEG 品質 **0.82**
- 使用 `createImageBitmap` 讀取檔案並重繪至 canvas：此 API 會自動依 EXIF Orientation 校正方向，避免直拍照片顯示時歪斜
- 壓縮在使用者選取/拍攝完成、預覽畫面出現前執行；使用者看到的預覽即為實際上傳版本
- 若使用套件（`browser-image-compression`），啟用 `useWebWorker: true`，避免一次選取多張照片時壓縮卡住主畫面

```javascript
export async function compressImage(file, { maxDimension = 1920, quality = 0.82 } = {}) {
  const imageBitmap = await createImageBitmap(file);
  let { width, height } = imageBitmap;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(imageBitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}
```

壓縮後預期檔案大小約 600KB–1MB／張。

### 7.2 Google Drive 串接（v2：沿用「發文平台」既有驗證過的做法）

確定採用 Google Drive 儲存照片（容量無虞，不評估 Supabase Storage 替代方案）。串接方式直接沿用發文平台專案已驗證可行的設計：

- **OAuth scope 使用 `drive`，不是 `drive.file`**：巡檢照片屬跨使用者共用資料夾情境（不同填報人上傳到同一案件資料夾），`drive.file` 無法存取非本應用建立的檔案，必須用 `drive` scope
- **不做靜默授權（no silent token request on mount）**：頁面載入時顯示不可關閉的提示，引導使用者點擊啟用；使用者按下「我知道了」後出現黃色 banner，點擊「啟用照片功能」才觸發 GIS `requestAccessToken`；授權成功後 banner 轉綠色「相片功能已啟用」
- **`requestAccessToken` 帶入 `hint: user.email`**：避免使用者同時登入多組 Google 帳號時授權到錯誤帳號
- **`tokenClient` 於每次 GIS callback 後重置為 `null`**：確保授權 picker 可重新開啟
- 資料夾依「承攬案件」建立，結構同原規劃：

```text
施工巡檢/
├─ 案件A/
│  ├─ 2026-09-07_巡檢紀錄001/
│  │  ├─ photo_01.jpg
│  │  ├─ photo_02.jpg
│  │  └─ signature.png
│  └─ ...
├─ 案件B/
└─ ...
```

- 資料庫僅保存 Drive File ID（不保存公開網址），欄位設計見第16節

### 7.3 離線佇列（v2 新增）

工地現場網路品質不穩，是本系統與發文平台最大的情境差異，需獨立設計：

- 巡檢表單資料（尚未送出）先寫入本機暫存（IndexedDB 或等效機制），避免填到一半斷線遺失
- 照片壓縮後的 Blob 先存本機，以背景佇列方式逐張上傳，失敗自動重試，不需使用者手動重傳
- 送出動作不因單張照片上傳失敗而整筆失敗——允許「先送出巡檢紀錄，照片背景補上傳」，但需在 UI 明確標示「照片上傳中」狀態，避免使用者誤以為已完成

---

## 8. 簽名功能

巡檢完成後，提供手寫簽名區。

需求：

- 觸控螢幕直接簽名
- 滑鼠亦可操作
- 可清除重簽
- 簽名轉為圖片保存（**v2：確認採透明背景 PNG**，避免後續報表匯出時出現非預期白底邊框）
- 與該次巡檢紀錄綁定
- 建議保存簽名時間

若未簽名，可依系統管理需求決定是否允許送出。

---

## 9. 前端填報流程

### Step 1
選擇承攬案件（僅顯示自己被指派的進行中案件）。

### Step 2
確認／填寫：

- 巡檢日期
- 巡檢時間
- 巡檢地點
- 巡檢人員

### Step 3
逐項完成 10 項巡檢。

每項顯示：

```text
人員防護
是否配戴必要防護具，有無明顯危險行為。

[ 良好 ] [ 尚可 ] [ 不良 ] [ 不適用 ]
```

### Step 4
填寫備註。

### Step 5
拍攝或上傳照片（**v2：選取後立即壓縮，以壓縮後版本產生預覽**）。

### Step 6
簽名。

### Step 7
送出前檢查。

如有未選擇的巡檢項目，系統提示使用者完成，不應自動補值。

### Step 8
送出並建立巡檢紀錄（**v2：若照片尚未上傳完成，紀錄可先建立，照片背景佇列補上傳，UI 標示上傳中狀態**）。

---

## 10. 手機介面設計原則

系統以手機直向操作為主要情境。

### 巡檢項目

- 一次顯示一個完整項目
- 項目名稱字級大於說明
- 四個選項採按鈕形式
- 避免使用過小的 radio button
- 按鈕應有明確選中狀態
- 「不適用」採獨立色系
- 項目之間有明顯間距

### 建議版面

```text
────────────────────
3. 高處作業安全

梯具、施工架是否穩固，
防墜措施是否適當。

[ 良好 ] [ 尚可 ]
[ 不良 ] [ 不適用 ]
────────────────────
```

手機版不宜使用寬表格呈現 10 個項目。

---

## 11. 巡檢結果顏色

實際色碼於 UI 設計階段再決定，但語意需固定。

建議：

- 良好：正向色
- 尚可：中性色／提醒色
- 不良：警示色
- 不適用：灰色或另一組明顯不同的冷色系

「不適用」不得使用與「良好」相近的色彩，避免被理解為安全狀況良好。

---

## 12. 歷史紀錄

前端或後台應提供巡檢紀錄列表。

### 篩選條件

- 承攬案件
- 日期區間
- 巡檢人員
- 是否有「不良」
- 案件狀態

### 列表摘要

建議顯示：

- 巡檢日期
- 案件名稱
- 地點
- 巡檢人員
- 不良項目數
- 照片數
- 查看紀錄

---

## 13. 單筆巡檢紀錄

查看頁面應完整呈現：

1. 案件資料
2. 巡檢日期與地點
3. 10 項巡檢結果
4. 備註
5. 現場照片
6. 巡檢人員簽名
7. 建立時間
8. 最後修改時間

原則上巡檢送出後應保留原始紀錄。

若允許修改，需紀錄：

- 修改人
- 修改時間
- 修改前後內容

避免直接覆寫而無紀錄。**（v2：對應資料表為 `insp_inspection_edit_log`，見第16節，原規劃缺少此表）**

---

## 14. 不良項目呈現

若巡檢結果有「不良」，在紀錄列表及查看頁應明顯標示。

例如：

```text
本次巡檢：10 項
良好：6
尚可：2
不良：1
不適用：1
```

並可直接列出：

```text
不良項目：
4. 施工用電安全
```

方便後續追蹤。

---

## 15. 後續改善追蹤（第二階段）

第一版可先不建立複雜缺失管理流程。

第二階段再考慮將「不良」項目轉為改善追蹤案件，加入：

- 改善期限
- 改善說明
- 改善前照片
- 改善後照片
- 改善完成日期
- 複查結果

避免第一版同時開發巡檢系統與完整工程缺失管理系統，造成流程過重。

---

## 16. 資料結構草案（v2 更新）

### 16.0 資料庫共用設計（v2 新增）

本系統與**標案管理平台**共用同一個 Supabase 專案（同一個 Postgres 執行個體、同一個 `public` schema），而非各自獨立的資料庫。標案管理平台目前已在 `public` schema 建有以下資料表：

```text
requesting_units    -- 需求單位
projects            -- 標案主檔（名稱、標案號、公文號、經費來源/金額、核准日期、生命週期狀態...）
procurement_items   -- 採購/發包項目（廠商、金額、開工/完工日期，FK → projects）
procurement_events  -- 採購項目事件記錄
progress_logs       -- 專案月進度記錄
user_roles          -- user_id → role（全平台角色，無 email 欄位）
project_co_editors  -- 專案協作編輯者
```

因此有以下設計決策：

1. **不與 `projects` / `procurement_items` 建立外鍵關聯**：巡檢系統的「承攬案件」維持自己獨立的一份資料，不參照標案管理平台既有的標案/採購項目資料。原因：本系統的招標工程修繕案一年不超過 5 件，重複輸入案名等基本資料成本很低，換取兩系統資料範圍與生命週期完全獨立、不互相牽動的彈性。
2. **表名一律加 `insp_` 前綴**：避免與標案管理平台現有及未來新增的資料表撞名，兩者共存於同一個 `public` schema，不另建獨立 schema。
3. **共用登入帳號、不共用角色**：兩系統同屬一個 Supabase 專案，Google 登入自動共用同一份 `auth.users`（同一組 Google 帳號可登入兩個系統）。但巡檢系統的 admin／user 判斷**不沿用**標案管理平台的 `user_roles.role`（語意不同、範圍不同），另建 `insp_user_roles` 自行管理。

### insp_projects
承攬案件

```text
id
project_name
contractor
location
start_date
end_date
department
manager
status
note
created_at
updated_at
```

### insp_user_roles（v2 新增）
巡檢系統自己的使用者角色表，獨立於標案管理平台的 `user_roles`

```text
user_id          -- FK → auth.users.id（共用登入帳號，但角色語意獨立）
user_email
role             -- admin / user
created_at
updated_at
```

### insp_project_assignees（v2 新增）
案件與可填報人員的多對多對應

```text
id
project_id       -- FK → insp_projects.id
user_email
assigned_at
assigned_by
```

### insp_inspections
巡檢紀錄

```text
id
project_id       -- FK → insp_projects.id
inspection_date
inspection_time
location
inspector
note
signature_file_id
created_at
updated_at
```

### insp_inspection_item_definitions（v2 新增，取代原本存於 insp_inspection_items 的 item_name）
10 項巡檢項目的固定定義

```text
item_no
title
description
```

### insp_inspection_items

```text
id
inspection_id    -- FK → insp_inspections.id
item_no          -- 對應 insp_inspection_item_definitions.item_no
result
```

`result`：

```text
good
acceptable
poor
na
```

資料庫不得以空值代表「不適用」。

### insp_inspection_edit_log（v2 新增）
巡檢紀錄修改歷程，對應第13節要求

```text
id
inspection_id    -- FK → insp_inspections.id
edited_by
edited_at
field_changed
old_value
new_value
```

### insp_inspection_photos

```text
id
inspection_id    -- FK → insp_inspections.id
drive_file_id
filename
caption
upload_status     -- v2 新增：pending / uploaded / failed，供離線佇列狀態顯示
created_at
```

---

## 17. 驗證規則

送出前至少檢查：

- 已選擇承攬案件
- 已填巡檢日期
- 已填巡檢地點
- 已填巡檢人員
- 10 項巡檢均已有明確選擇

巡檢項目不得預設為「良好」。

若使用者尚未操作，狀態應為：

```text
null / unanswered
```

而不是：

```text
good
```

---

## 18. 權限與登入（v2 更新）

若系統供校內同仁使用，建議與 Google 帳號登入結合。

**（v2 新增）本系統與標案管理平台共用同一個 Supabase 專案，因此 Google 登入的 `auth.users` 是共用的（同一組 Google 帳號可登入兩個系統），但 admin／user 角色判斷不沿用標案管理平台的 `user_roles`，改用本系統自己的 `insp_user_roles`，詳見第16.0節。**

基本權限：

### user
- 新增巡檢（**v2：僅限被指派的案件**，見 `insp_project_assignees`）
- 查看權限範圍內紀錄

### admin
- 管理案件
- **（v2 新增）指派／移除案件填報人員**
- 查看所有紀錄
- 管理或修正資料（修改需寫入 `insp_inspection_edit_log`）
- 匯出資料

可限制只有學校網域帳號登入。

---

## 19. 建議第一版 MVP（v2 更新）

第一版先完成以下功能：

1. Google 帳號登入
2. 後台承攬案件管理（含案件指派）
3. 手機版巡檢填報
4. 10 項巡檢
5. 良好／尚可／不良／不適用
6. 無預設值
7. 備註
8. 拍照與圖片上傳（含前端壓縮）
9. Google Drive 儲存（`drive` scope 授權流程）
10. 手寫簽名
11. 巡檢紀錄查詢
12. 單筆紀錄檢視
13. **（v2 新增）離線暫存與照片背景上傳佇列**

暫不優先：

- 複雜改善追蹤
- 自動通知
- 多層簽核
- 廠商帳號
- 工程進度管理
- 專業證照查驗

先把「現場快速填報 → 保存 → 可查閱」這條主流程做穩定。

---

## 20. 開發驗收重點

### 手機操作
- 單手操作基本可行
- 不需橫向捲動
- 10 項巡檢能快速完成
- 拍照流程順暢，選取後即時壓縮不明顯卡頓
- 簽名區正常支援觸控
- **（v2 新增）斷網情境下填表資料不遺失，恢復連線後照片可自動補傳**

### 資料正確性
- 無任何巡檢項目預設值
- 「不適用」與未填寫狀態完全不同
- 送出後照片、簽名與紀錄正確關聯
- 同一案件可保存多次巡檢
- **（v2 新增）修改紀錄正確寫入 `insp_inspection_edit_log`**

### 實務使用
- 大型工程可使用
- 一般修繕可使用
- 冷氣安裝可使用
- 設備安裝可使用
- 不相關項目可直接勾選「不適用」
- 備註足以記錄特殊情形

---

## 21. 系統定位

本系統定位為：

> **學校施工現場巡檢與紀錄工具**

主要目的不是取代監造、職業安全衛生專業檢查或法定自主檢查，而是讓校方能以一致、簡明且可追溯的方式，記錄施工現場中容易辨識的安全、環境及校園動線狀況。

開發時應持續維持這個界線，避免巡檢項目逐步膨脹成複雜的工程專業查核表。

---

## 22. 開發進度與待辦事項（2026-09-07 暫停於此）

Repo：https://github.com/t1032-arch/cons-inspect（main branch，此時 working tree 乾淨，所有內容皆已 push）。

### 已完成

- 專案骨架：Vite + React + TypeScript + Tailwind，`npm install`／`npx tsc -b`／`npx vite build` 皆通過
- 路由：登入、案件列表、巡檢填報精靈（六步驟）、歷史紀錄、單筆紀錄查看、後台案件管理
- `src/lib/supabase.ts`、`AuthContext.tsx`：角色判斷讀 `insp_user_roles`，不沿用標案管理平台的 `user_roles`（見第16.0節）
- `src/lib/googleDrive.ts`：授權流程沿用發文平台驗證過的做法（scope=`drive`、不做靜默授權、hint email、tokenClient 每次 reset）；**巢狀資料夾結構是巡檢系統自己的設計**，發文平台實際上是單一固定 `FOLDER_ID` 扁平存檔（已讀取 `posts-management/src/drive.js` 原始碼確認）
- `src/lib/imageCompression.ts`：完全依 §7.1 規格實作
- `src/lib/offlineQueue.ts`、`submitInspection.ts`：IndexedDB 離線佇列，對應 §7.3
- `supabase/migrations/0001_init.sql`：已在 Supabase Dashboard SQL Editor 執行完成，8 張 `insp_` 表與標案管理平台既有表並存於同一 schema，`insp_inspection_item_definitions` 10 筆種子資料已確認可透過 PostgREST 讀取
- `.env` 的 `VITE_GOOGLE_CLIENT_ID`、`VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID` 皆已取得並填入：
  - `VITE_GOOGLE_CLIENT_ID`：用 t1032 帳號在 Google Cloud Console 新建專案 `cons-inspect`（獨立於發文平台的專案），OAuth consent screen 選 Internal，手動加上 `https://www.googleapis.com/auth/drive` scope（不在預設勾選清單中，要在「手動新增範圍」欄位貼上），建立 Web application 類型憑證，已確認 `http://localhost:5173` 已加入「已授權的 JavaScript 來源」
  - `VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID`：13001（總務主任）帳號建立根資料夾，一般存取權設成「同網域使用者皆可編輯」（比照發文平台實際做法，不需逐一加使用者）

### 待辦（下次接續建議順序）

1. **建立第一位 admin**：第一位 admin 登入後，需手動在 `insp_user_roles` insert 一筆（沒有自我升級的介面，避免任何登入者自封管理者）——**尚未完成**
2. **尚未實作**：巡檢紀錄修改時寫入 `insp_inspection_edit_log`（對應第13節要求），目前只有建立流程，沒有編輯既有紀錄的介面
3. **尚未實作**：`InspectionDetailPage` 的照片縮圖顯示，目前只列檔名與上傳狀態；可以參考發文平台 `netlify/functions/drive-thumb.js` 的做法（尚未細看是否能直接沿用）

### 換到別的電腦時要注意

- git repo（本文件、程式碼、migration SQL）會同步過去，直接 `git clone` 或 `git pull` 即可接續
- `.env` **不會**跟著 git 走（故意排除，因為裡面有 Supabase service role key），換電腦要手動建立 `.env`，把 Supabase 的 URL/anon key/service role key，以及上面「已完成」列表中的兩個 Google 值填進去
- Claude 的本機記憶（memory）是綁在單一電腦上的，換電腦後 Claude 不會自動記得這次對話中討論過的決策細節——但只要這份文件與程式碼註解夠完整（已盡量寫進去了），接續時不需要重新對話確認這些已拍板的設計決策
