-- 巡檢紀錄補上填報者（created_by），讓照片刪除權限可以區分「admin 全權」與「填報者刪自己的」
-- 對應使用者回報：admin 可以刪，其他 user 只能刪自己填報那筆紀錄底下的照片

alter table insp_inspections
  add column created_by uuid references auth.users (id);

-- insp_inspection_photos：admin 全權（既有 insp_inspection_photos_admin_all）之外，
-- 再加一條「該筆巡檢紀錄的填報者本人可刪除」
create policy insp_inspection_photos_owner_delete on insp_inspection_photos
  for delete using (
    exists (
      select 1 from insp_inspections i
      where i.id = insp_inspection_photos.inspection_id
        and i.created_by = auth.uid()
    )
  );
