// Google Drive 串接，見 workplan_v2.md §7.2
//
// 沿用發文平台（posts-management/src/drive.js）驗證過的授權流程：
// - OAuth scope 使用 `drive`（不是 `drive.file`）：巡檢照片跨使用者共用資料夾，
//   drive.file 無法存取非本應用建立的檔案
// - 不做靜默授權：頁面載入不自動要 token，需使用者主動點擊「啟用照片功能」才 requestAccessToken
// - requestAccessToken 帶 hint: user.email，避免授權到錯誤的 Google 帳號
// - tokenClient 每次 GIS callback 後重置為 null，確保 picker 可重新開啟
//
// 資料夾結構是巡檢系統自己的設計，非沿用發文平台：發文平台把所有檔案都丟進單一固定
// FOLDER_ID（扁平結構，用檔名區分）；巡檢系統的照片量較大，需要依「案件／巡檢紀錄」
// 分開資料夾方便查閱，因此在固定根資料夾下動態建立巢狀子資料夾。

// Google Identity Services 由 index.html 的 <script> 標籤全域載入，沒有官方型別套件
declare const google: any;

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

// 「施工巡檢」根資料夾固定建在 13001（總務主任）帳號底下，並分享給所有填報/管理人員（編輯權限）。
// 不能讓程式在找不到根資料夾時退回建立在當下登入者自己的 My Drive（那樣不同人會各自長出一份，
// 無法達成 §7.2 選用 `drive` scope 的目的：不同填報人共用同一案件資料夾）。
// 取得方式：13001 帳號開啟該資料夾，網址列 https://drive.google.com/drive/folders/<這段就是 ID>
const ROOT_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID;

let tokenClient: any = null;
let accessToken: string | null = null;

export function isDriveEnabled() {
  return accessToken !== null;
}

export function requestDriveAccess(userEmail: string): Promise<string> {
  return new Promise((resolve, reject) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      hint: userEmail,
      callback: (response: { access_token?: string; error?: string }) => {
        tokenClient = null; // 重置，確保下次可重新開啟授權流程
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? '授權失敗'));
          return;
        }
        accessToken = response.access_token;
        resolve(accessToken);
      },
    });
    tokenClient.requestAccessToken();
  });
}

// supportsAllDrives / includeItemsFromAllDrives：若日後根資料夾改放到 Workspace 共用雲端硬碟
// 也能正常運作，一般個人資料夾加這兩個參數沒有副作用
async function driveFetch(path: string, init: RequestInit = {}) {
  if (!accessToken) throw new Error('尚未取得 Drive 授權');
  const separator = path.includes('?') ? '&' : '?';
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/${path}${separator}supportsAllDrives=true&includeItemsFromAllDrives=true`,
    {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Drive API 錯誤 (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function findFolder(name: string, parentId: string): Promise<string | null> {
  const q = encodeURIComponent(
    `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${parentId}' in parents`,
  );
  const data = await driveFetch(`files?q=${q}&fields=files(id,name)`);
  return data.files?.[0]?.id ?? null;
}

async function createFolder(name: string, parentId: string): Promise<string> {
  const data = await driveFetch('files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  return data.id;
}

async function ensureFolder(name: string, parentId: string): Promise<string> {
  const existing = await findFolder(name, parentId);
  if (existing) return existing;
  return createFolder(name, parentId);
}

// 對應資料夾結構：（ROOT_FOLDER_ID）/案件A/2026-09-07_巡檢紀錄001/
export async function ensureInspectionFolder(
  projectName: string,
  inspectionFolderName: string,
): Promise<string> {
  if (!ROOT_FOLDER_ID) {
    throw new Error(
      '尚未設定 VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID：需要 13001 帳號提供已分享的根資料夾 ID',
    );
  }
  const projectFolderId = await ensureFolder(projectName, ROOT_FOLDER_ID);
  return ensureFolder(inspectionFolderName, projectFolderId);
}

// 回傳 Drive File ID（資料庫只存 File ID，不存公開網址，見 workplan_v2.md §7.2）
export async function uploadFileToDrive(
  blob: Blob,
  filename: string,
  folderId: string,
): Promise<string> {
  const metadata = { name: filename, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );
  if (!res.ok) {
    throw new Error(`Drive 上傳失敗 (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.id;
}
