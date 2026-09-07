// Google Drive 串接，沿用「發文平台」既有驗證過的做法，見 workplan_v2.md §7.2
//
// - OAuth scope 使用 `drive`（不是 `drive.file`）：巡檢照片跨使用者共用資料夾，
//   drive.file 無法存取非本應用建立的檔案
// - 不做靜默授權：頁面載入不自動要 token，需使用者主動點擊「啟用照片功能」才 requestAccessToken
// - requestAccessToken 帶 hint: user.email，避免授權到錯誤的 Google 帳號
// - tokenClient 每次 GIS callback 後重置為 null，確保 picker 可重新開啟

// Google Identity Services 由 index.html 的 <script> 標籤全域載入，沒有官方型別套件
declare const google: any;

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const ROOT_FOLDER_NAME = '施工巡檢';

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

async function driveFetch(path: string, init: RequestInit = {}) {
  if (!accessToken) throw new Error('尚未取得 Drive 授權');
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Drive API 錯誤 (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function findFolder(name: string, parentId: string | null): Promise<string | null> {
  const parentClause = parentId ? `'${parentId}' in parents` : `'root' in parents`;
  const q = encodeURIComponent(
    `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and ${parentClause}`,
  );
  const data = await driveFetch(`files?q=${q}&fields=files(id,name)`);
  return data.files?.[0]?.id ?? null;
}

async function createFolder(name: string, parentId: string | null): Promise<string> {
  const data = await driveFetch('files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    }),
  });
  return data.id;
}

async function ensureFolder(name: string, parentId: string | null): Promise<string> {
  const existing = await findFolder(name, parentId);
  if (existing) return existing;
  return createFolder(name, parentId);
}

// 對應資料夾結構：施工巡檢/案件A/2026-09-07_巡檢紀錄001/
export async function ensureInspectionFolder(
  projectName: string,
  inspectionFolderName: string,
): Promise<string> {
  const rootId = await ensureFolder(ROOT_FOLDER_NAME, null);
  const projectFolderId = await ensureFolder(projectName, rootId);
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
