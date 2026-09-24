// Supabase 回傳的 timestamptz 欄位（created_at/updated_at/edited_at）是 UTC ISO 字串，
// 直接印出來會顯示 UTC 時間而非台灣時間（差 8 小時）。統一用這支轉成 Asia/Taipei 顯示。
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
