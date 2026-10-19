-- 已送出的巡檢紀錄補簽／重簽：admin 或該筆紀錄的填報者本人可更新簽名
-- 對應使用者回報：電腦上送出時沒簽名，回到手機找不到補簽的地方
--
-- 一般使用者對 insp_inspections 沒有 update 權限、也不能寫 insp_inspection_edit_log（RLS 只放行 admin），
-- 若直接開 update policy 會讓填報者能改其他欄位。改用 security definer 函式：
-- 只允許更新 signature_file_id 一欄，並在同一個交易內寫入修改紀錄。
create or replace function insp_update_signature(
  p_inspection_id uuid,
  p_signature_file_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_file_id text;
  v_created_by uuid;
begin
  if auth.uid() is null then
    raise exception '未登入';
  end if;

  select signature_file_id, created_by
    into v_old_file_id, v_created_by
    from insp_inspections
    where id = p_inspection_id
    for update;

  if not found then
    raise exception '找不到巡檢紀錄';
  end if;

  if not (insp_is_admin() or v_created_by = auth.uid()) then
    raise exception '沒有權限修改此筆紀錄的簽名';
  end if;

  update insp_inspections
    set signature_file_id = p_signature_file_id
    where id = p_inspection_id;

  -- 舊簽名檔不刪除，log 保留 Drive 檔案 ID 以便追溯
  insert into insp_inspection_edit_log (inspection_id, edited_by, field_changed, old_value, new_value)
  values (
    p_inspection_id,
    auth.uid(),
    '簽名',
    case when v_old_file_id is null then null else '已簽名（Drive 檔案 ' || v_old_file_id || '）' end,
    case when v_old_file_id is null then '補簽' else '重新簽名' end
      || '（Drive 檔案 ' || p_signature_file_id || '）'
  );
end;
$$;

revoke all on function insp_update_signature(uuid, text) from public;
-- Supabase 的 default privileges 會直接 grant 給 anon（不經 public），需另外收回
revoke execute on function insp_update_signature(uuid, text) from anon;
grant execute on function insp_update_signature(uuid, text) to authenticated;
