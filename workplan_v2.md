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

## 22. 開發進度與待辦事項（2026-09-08 暫停於此）

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
- 兩位 admin 已寫入 `insp_user_roles`（2026-09-07）：`t1032@tlhc.ylc.edu.tw`、`13001@tlhc.ylc.edu.tw`。兩人先前都登入過標案管理平台/發文平台，`auth.users` 裡已有帳號，故直接用既有 `user_id` insert，不需要另外建立登入帳號
- **（2026-09-08）修改紀錄功能**：`src/lib/editInspection.ts` 新增，`InspectionDetailPage` 加上 admin-only 的「編輯」按鈕，可修改日期/時間/地點/巡檢人員/備註/10項結果，儲存時逐欄位 diff 並寫入 `insp_inspection_edit_log`（欄位、修改前、修改後、修改人、時間），頁面下方顯示「修改紀錄」（同樣 admin-only，符合該表 RLS 只允許 admin 讀寫）。已於瀏覽器實測：建立測試案件與巡檢紀錄、編輯地點/備註/第1項結果、確認修改紀錄正確顯示三筆 diff。
- **（2026-09-08）照片縮圖顯示**：`googleDrive.ts` 新增 `fetchDriveFileAsObjectUrl()`，沿用既有的前端 Drive OAuth token（不另外架設後端代理，因為巡檢系統本來就要求使用者啟用 Drive 授權才能上傳照片）。`InspectionDetailPage` 加上「顯示照片預覽」按鈕，抓取 `alt=media` 內容轉 blob URL 顯示縮圖網格。**UI 已確認正常渲染，但實際抓圖流程尚未實測**——需要真的透過巡檢填報精靈上傳過照片的紀錄才能驗證，Drive OAuth 的授權彈窗無法透過瀏覽器自動化觸發完成。
- **（2026-09-08）補了兩個順便發現的既有問題**：
  - `AdminProjectsPage` 新增案件時，date 欄位空字串會讓 Postgres insert 失敗（`22007`），但程式碼沒檢查 error，UI 會誤以為新增成功。已修正成把空字串轉 `null`，並把錯誤訊息顯示在畫面上（原本用 `alert()`，後改成 inline 訊息，避免瀏覽器自動化測試時被原生 dialog 卡住）。
  - App 裡完全沒有登出功能。新增 `src/components/AppHeader.tsx`（顯示目前登入者 email/角色 + 登出連結），掛在 `ProtectedRoute` 上，所有已登入頁面都會顯示。
- **（2026-09-08，換到另一台電腦接續）照片縮圖抓取流程 — 已實測通過**：走完整填報精靈、上傳 4 張照片、送出後在詳細頁點「顯示照片預覽」，4 張皆正確從 Drive 抓取顯示。§13/§7.2 原訂待辦已無殘留項目。
  - 過程中發現並修正一個環境問題（非程式碼 bug）：dev server 若跑在非 5173 的 port（例如 5173 被殘留 process 占用而改用 5174），Google OAuth 會回傳 `origin_mismatch`（因為 Google Cloud Console 的「已授權 JavaScript 來源」只登記了 `http://localhost:5173`）。換電腦或重啟環境時要注意確保 dev server 跑在 5173，否則 Drive 授權會直接失敗。
- **（2026-09-08）巡檢紀錄查詢頁篩選功能 — 已實測通過**：`HistoryPage` 的「只顯示有『不良』的紀錄」checkbox 篩選邏輯正確（`rows.filter(r => r.poor_count > 0)`），雙向切換皆正確篩入/篩出。這是 §19 MVP 清單第 11 項此前從未實測過的部分。
- **（2026-09-08）修正離線佇列的重大缺陷**：`submitInspection.ts` 原本簽名上傳（`uploadFileToDrive` for signature）沒有包 try/catch，一旦網路失敗會直接 throw，導致：(1) `insp_inspections`／`insp_inspection_items` 已寫入但整筆送出「看起來」失敗，產生沒有照片、沒有簽名的孤兒紀錄；(2) 使用者若依畫面提示重新點擊送出，會建立**新的重複紀錄**而非續傳，因為送出邏輯每次都是全新 insert。已修正為 try/catch 吞掉錯誤、`signature_file_id` 留空並繼續處理照片，比照片既有的容錯精神一致（§7.3）。已用模擬 Drive fetch 失敗的方式實測驗證：修復前重試 2 次產生 2 筆孤兒重複紀錄；修復後同樣情境只產生 1 筆完整紀錄（簽名留空、照片正確標記 `failed`）。**目前規模下未額外加簽名重試佇列或 idempotency 機制**（範圍已與使用者確認），僅止於不阻擋整筆送出。
- **（2026-09-08）新增：案件地點自動帶入巡檢表單**：`InspectionFormPage.tsx` 讀取案件資料後，若 `insp_projects.location` 有值且使用者尚未輸入過巡檢地點，自動帶入該案件地點，欄位仍可自由編輯覆蓋。後台新增案件表單本來就已有 `location` 欄位（optional），不需額外修改。已實測：建立案件時填地點「E棟頂樓水塔」，開始巡檢後「巡檢地點」欄位自動帶入且可編輯。

### 待辦

目前 §13（單筆巡檢紀錄）、§7.2（照片縮圖）、§19 第 11 項（查詢頁篩選）相關的原訂待辦事項均已完成並實測通過。

- **（2026-09-08）§7.3 表單草稿本機暫存 — 已實作並實測通過**：`InspectionFormPage.tsx` 新增兩個 effect：頁面載入時呼叫 `getDraftInspection(draft-${projectId})` 還原 `basicInfo`／`items`／`note`（用 `draftRestoredRef` 擋掉還原完成前的自動存檔，避免用初始空白狀態蓋掉尚未讀出的草稿）；之後這三個 state 只要變動就呼叫 `saveDraftInspection` 存回 IndexedDB；送出成功後呼叫 `deleteDraftInspection` 清掉草稿。實測：填地點/人員/前3項良好後直接重新整理頁面，還原正確；完整送出成功後直接查 IndexedDB 確認草稿已清除（`undefined`）。案件地點自動帶入與這個草稿還原的互動：兩者都用「若目前是空的才填入」的判斷式，不會互相蓋掉。
- **（2026-09-08）`editInspection.ts` 的 edit_log 寫入時機 — 已修正並實測通過**：原本所有欄位／項目的異動全部更新完才一次寫入 `insp_inspection_edit_log`，若中途（例如第 2 項）更新失敗，前面已經生效的異動（地點、第 1 項）會完全沒有留下任何修改紀錄，直接違反這個功能「避免直接覆寫而無紀錄」的目的。已修正為每完成一項異動就立刻寫入對應的 log（欄位異動視為一組原子更新＋一次 log insert；每個項目各自更新＋各自 log insert）。用模擬 fetch 失敗的方式實測：第 2 項故意失敗時，地點與第 1 項確認已更新且各有 1 筆 log（共 2 筆，無缺漏）；第 2 項維持原值、無孤兒 log。
- **（2026-09-08）`InspectionDetailPage.tsx` 的 `handleSave` 完全沒有 catch 區塊 — 已修正並實測通過**：上面這個 edit_log 順序問題原本更嚴重的地方在於，儲存失敗時使用者畫面上完全沒有任何錯誤提示（`handleSave` 只有 try/finally，沒有 catch，例外直接變成 unhandled rejection），而且因為失敗後 `data`／`editForm` 都沒有重新整理，使用者若重新點「儲存修改」，`saveInspectionEdits` 會拿舊的（未反映部分成功異動的）`data.inspection` 去跟 `editForm` 做 diff，導致已經成功的欄位被重複偵測成「有差異」而重複更新、重複寫入 log。已修正：新增 `saveError` state 並在按鈕旁顯示錯誤訊息；catch 區塊內也呼叫 `load()`／重新查 `editLogs`，讓 `data` 反映實際已生效的異動，這樣重試時只會處理真正還沒成功的部分，不會產生重複 log。用模擬第 3 項失敗＋重試成功的方式實測：錯誤訊息正確顯示、最終 4 筆真實異動（地點＋3項）對應剛好 4 筆 log，無重複。
- **（2026-09-08）一般使用者（user）角色權限 — 首次實測，全部通過**：此前整個專案（含前次 session）所有測試都是用 admin 帳號（`insp_is_admin()` 直接放行全部操作），一般使用者的 RLS policy（`insp_projects_assignee_select`／`insp_inspections_assignee_select`／`insp_inspections_assignee_insert` 等）從未被真正驗證過，是上線前最大的未知風險。這次用第三個真實學校帳號（`reservation.notice@tlhc.ylc.edu.tw`，先登入一次讓 `auth.users` 建立紀錄，再用 service role key 建案件＋指派）實測：
  - 案件選擇頁只顯示被指派的 active 案件，未指派的完全不出現
  - 直接用網址訪問未指派案件的 `/projects/:id/inspect`，RLS 正確擋下（`project` 永遠拿不到資料，卡在載入畫面，沒有資料外洩，但也沒有「無權限」提示，是可以之後改善的 UX 小問題，非安全性問題）
  - 被指派案件可正常走完填報精靈並成功送出（驗證 `insp_inspections_assignee_insert` 等 insert policy 正確）
  - 紀錄詳細頁沒有「編輯」按鈕、也看不到修改紀錄區塊
  - 歷史紀錄頁只顯示權限範圍內的紀錄
  - 直接用網址訪問 `/admin/projects`，被前端路由導回首頁，沒有被 admin 專屬功能卡住或看到後台
  
  結論：RLS 與前端權限邏輯設計正確，這項風險已排除。測試資料（2 個測試案件＋指派＋1 筆巡檢紀錄）已清除，`reservation.notice@tlhc.ylc.edu.tw` 這個帳號本身（`auth.users`）保留，未來要用可以直接把它加進其他案件的 `insp_project_assignees`。

### 待辦

已知仍未做的部分：

1. `npm audit` 有 2 個 moderate 漏洞（vite/esbuild 的 dev-server 漏洞、react-router-dom 的 open redirect），皆需要 major version 升級才能修（vite 5→8、react-router-dom 6→7）。已與使用者確認先擱置，不影響目前功能開發。
2. **小 UX 缺口**：一般使用者用網址直接訪問自己沒被指派的案件時，畫面會永遠卡在「載入案件資料中…」（因為 RLS 讓查詢回傳空值，`project` state 永遠是 null），沒有任何「你沒有權限」或「案件不存在」的提示。不是安全性問題（資料確實沒有外洩），但體驗不好，建議之後加個逾時或空值判斷顯示提示訊息。
3. **部署前置作業尚未開始**：專案目前完全是本機開發階段，還沒有選定/設定任何部署平台（Vercel／Netlify／其他），也還沒有：
   - 把正式網域加進 Google Cloud Console 的「已授權 JavaScript 來源」（目前只有 `http://localhost:5173`，上線網域沒加會導致 Drive 授權直接 `origin_mismatch` 失敗，見前面 §22 的環境問題記錄）
   - 在部署平台設定正式環境的環境變數（`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_GOOGLE_CLIENT_ID`、`VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID`；`SUPABASE_SERVICE_ROLE_KEY` 不應該進前端環境變數，只有本機測試腳本在用）
   - 手機／平板真機測試（workplan §10「手機優先」的設計原則，目前所有測試都只在桌面版 Chrome 做過，響應式版面、觸控簽名、相機拍照都還沒在真實裝置上驗證過）
   - 自動化測試（目前完全依賴人工/live 瀏覽器測試，沒有任何 unit/integration test，之後每次修改都要重新手動走一次驗證流程）

### 已知殘留物（非阻塞，供之後想到時清理）

- 2026-09-08（前次）用瀏覽器自動化測試「編輯功能」時的殘留：Drive 根資料夾（13001 帳號）下 `測試案件-QA請忽略` 子資料夾（僅一張測試簽名 PNG）。
- 2026-09-08（本次，換電腦接續）測試照片縮圖與離線佇列時，Drive 根資料夾下又新增了 2-3 個空的測試子資料夾（`測試案件-照片測試-QA請忽略`、以及離線佇列測試留下的匿名巡檢紀錄資料夾）。
- 以上皆為純測試殘留、無真實資料，Supabase 端已用 service role key 全部清除乾淨（案件/巡檢紀錄/指派紀錄，含 cascade 的 items/photos/edit_log），只有 Drive 端的空資料夾需要手動去根資料夾清理。

### 換到別的電腦時要注意

- git repo（本文件、程式碼、migration SQL）會同步過去，直接 `git clone` 或 `git pull` 即可接續
- `.env` **不會**跟著 git 走（故意排除，因為裡面有 Supabase service role key），換電腦要手動建立 `.env`，把 Supabase 的 URL/anon key/service role key，以及上面「已完成」列表中的兩個 Google 值填進去
- Claude 的本機記憶（memory）是綁在單一電腦上的，換電腦後 Claude 不會自動記得這次對話中討論過的決策細節——但只要這份文件與程式碼註解夠完整（已盡量寫進去了），接續時不需要重新對話確認這些已拍板的設計決策
