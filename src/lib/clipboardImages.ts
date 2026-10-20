// 從貼上事件取出圖片檔（截圖、從網頁或檔案總管複製的圖片）；只有 HTML <img> 沒有實體檔案的情況會回傳空陣列
export function getClipboardImageFiles(event: ClipboardEvent): File[] {
  const files = Array.from(event.clipboardData?.files ?? []);
  return files.filter((file) => file.type.startsWith('image/'));
}

// 游標在文字欄位裡時不攔截貼上，避免搶走文字貼上（從 Word/網頁複製常同時含文字與圖片）
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    // 檔案欄位本身不算，使用者常點過「選擇檔案」後焦點還停在上面
    (target instanceof HTMLInputElement && target.type !== 'file') ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}
