-- cons-inspect：學校施工巡檢填報紀錄系統
-- 對應 workplan_v2.md 第16節資料結構草案
--
-- 本專案與「標案管理平台」共用同一個 Supabase 專案（同一個 public schema），
-- 因此所有本系統的資料表、函式一律加上 insp_ 前綴，避免與該平台既有的
-- requesting_units / projects / procurement_items / procurement_events /
-- progress_logs / user_roles / project_co_editors 撞名。詳見 workplan_v2.md §16.0。

create extension if not exists "pgcrypto";

-- ============================================================
-- insp_user_roles：巡檢系統自己的角色表，獨立於標案管理平台的 user_roles
-- ============================================================
create table insp_user_roles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  user_email  text not null,
  role        text not null check (role in ('admin', 'user')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function insp_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from insp_user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- insp_projects：承攬案件
-- ============================================================
create table insp_projects (
  id          uuid primary key default gen_random_uuid(),
  project_name text not null,
  contractor  text,
  location    text,
  start_date  date,
  end_date    date,
  department  text,
  manager     text,
  status      text not null default 'active' check (status in ('active', 'completed', 'disabled')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- insp_project_assignees：案件與可填報人員的多對多對應
-- ============================================================
create table insp_project_assignees (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references insp_projects (id) on delete cascade,
  user_email   text not null,
  assigned_at  timestamptz not null default now(),
  assigned_by  uuid references auth.users (id),
  unique (project_id, user_email)
);

-- ============================================================
-- insp_inspection_item_definitions：10 項巡檢項目固定定義
-- ============================================================
create table insp_inspection_item_definitions (
  item_no      int primary key,
  title        text not null,
  description  text not null
);

insert into insp_inspection_item_definitions (item_no, title, description) values
  (1, '人員防護', '是否配戴必要防護具，有無明顯危險行為。'),
  (2, '區域隔離與警示', '施工區、危險區是否有圍設或警示。'),
  (3, '高處作業安全', '梯具、施工架是否穩固，防墜措施是否適當。'),
  (4, '施工用電安全', '電線、插座、配電及電動工具有無明顯危險。'),
  (5, '機具設備安全', '機具、工具是否正常使用，有無明顯危險。'),
  (6, '吊掛與重物作業', '吊掛區是否管制，重物搬運是否安全。'),
  (7, '動火與防火安全', '動火周邊是否安全，滅火設備及鋼瓶是否妥善。'),
  (8, '材料與現場整理', '材料、工具及廢料是否整齊，通道是否暢通。'),
  (9, '通風與照明', '作業場所通風及照明是否足夠。'),
  (10, '校園動線與環境', '是否影響師生通行，粉塵、噪音等是否妥善控制。');

-- ============================================================
-- insp_inspections：巡檢紀錄
-- ============================================================
create table insp_inspections (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references insp_projects (id),
  inspection_date    date not null,
  inspection_time    time not null,
  location           text not null,
  inspector          text not null,
  note               text,
  signature_file_id  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ============================================================
-- insp_inspection_items：逐項巡檢結果
-- 資料庫不得以空值代表「不適用」——result 為 NULL 僅代表「尚未填答」
-- ============================================================
create table insp_inspection_items (
  id             uuid primary key default gen_random_uuid(),
  inspection_id  uuid not null references insp_inspections (id) on delete cascade,
  item_no        int not null references insp_inspection_item_definitions (item_no),
  result         text check (result in ('good', 'acceptable', 'poor', 'na')),
  unique (inspection_id, item_no)
);

-- ============================================================
-- insp_inspection_edit_log：巡檢紀錄修改歷程
-- ============================================================
create table insp_inspection_edit_log (
  id             uuid primary key default gen_random_uuid(),
  inspection_id  uuid not null references insp_inspections (id) on delete cascade,
  edited_by      uuid references auth.users (id),
  edited_at      timestamptz not null default now(),
  field_changed  text not null,
  old_value      text,
  new_value      text
);

-- ============================================================
-- insp_inspection_photos
-- ============================================================
create table insp_inspection_photos (
  id             uuid primary key default gen_random_uuid(),
  inspection_id  uuid not null references insp_inspections (id) on delete cascade,
  drive_file_id  text,
  filename       text not null,
  caption        text,
  upload_status  text not null default 'pending' check (upload_status in ('pending', 'uploaded', 'failed')),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- updated_at 自動更新
-- ============================================================
create or replace function insp_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger insp_projects_set_updated_at
  before update on insp_projects
  for each row execute function insp_set_updated_at();

create trigger insp_user_roles_set_updated_at
  before update on insp_user_roles
  for each row execute function insp_set_updated_at();

create trigger insp_inspections_set_updated_at
  before update on insp_inspections
  for each row execute function insp_set_updated_at();

-- ============================================================
-- Row Level Security
-- 基本規則（見 workplan_v2.md §18）：
--   admin：完整管理權限
--   user：僅能新增/查看自己被指派案件的巡檢
-- ============================================================
alter table insp_user_roles enable row level security;
alter table insp_projects enable row level security;
alter table insp_project_assignees enable row level security;
alter table insp_inspection_item_definitions enable row level security;
alter table insp_inspections enable row level security;
alter table insp_inspection_items enable row level security;
alter table insp_inspection_edit_log enable row level security;
alter table insp_inspection_photos enable row level security;

-- insp_user_roles：使用者可讀自己的角色，admin 可讀寫全部
create policy insp_user_roles_select_self on insp_user_roles
  for select using (user_id = auth.uid() or insp_is_admin());
create policy insp_user_roles_admin_write on insp_user_roles
  for all using (insp_is_admin()) with check (insp_is_admin());

-- insp_projects：admin 全權；user 僅能看到自己被指派的案件
create policy insp_projects_admin_all on insp_projects
  for all using (insp_is_admin()) with check (insp_is_admin());
create policy insp_projects_assignee_select on insp_projects
  for select using (
    exists (
      select 1 from insp_project_assignees pa
      where pa.project_id = insp_projects.id and pa.user_email = auth.email()
    )
  );

-- insp_project_assignees：admin 全權；user 只能看到自己的指派紀錄
create policy insp_project_assignees_admin_all on insp_project_assignees
  for all using (insp_is_admin()) with check (insp_is_admin());
create policy insp_project_assignees_self_select on insp_project_assignees
  for select using (user_email = auth.email());

-- insp_inspection_item_definitions：所有登入使用者可讀（固定定義）
create policy insp_item_definitions_select on insp_inspection_item_definitions
  for select using (auth.uid() is not null);

-- insp_inspections：admin 全權；user 限本人被指派的案件
create policy insp_inspections_admin_all on insp_inspections
  for all using (insp_is_admin()) with check (insp_is_admin());
create policy insp_inspections_assignee_select on insp_inspections
  for select using (
    exists (
      select 1 from insp_project_assignees pa
      where pa.project_id = insp_inspections.project_id and pa.user_email = auth.email()
    )
  );
create policy insp_inspections_assignee_insert on insp_inspections
  for insert with check (
    exists (
      select 1 from insp_project_assignees pa
      where pa.project_id = insp_inspections.project_id and pa.user_email = auth.email()
    )
  );

-- insp_inspection_items / insp_inspection_photos：權限比照所屬 insp_inspections
create policy insp_inspection_items_admin_all on insp_inspection_items
  for all using (insp_is_admin()) with check (insp_is_admin());
create policy insp_inspection_items_assignee_select on insp_inspection_items
  for select using (
    exists (
      select 1 from insp_inspections i
      join insp_project_assignees pa on pa.project_id = i.project_id
      where i.id = insp_inspection_items.inspection_id and pa.user_email = auth.email()
    )
  );
create policy insp_inspection_items_assignee_insert on insp_inspection_items
  for insert with check (
    exists (
      select 1 from insp_inspections i
      join insp_project_assignees pa on pa.project_id = i.project_id
      where i.id = insp_inspection_items.inspection_id and pa.user_email = auth.email()
    )
  );

create policy insp_inspection_photos_admin_all on insp_inspection_photos
  for all using (insp_is_admin()) with check (insp_is_admin());
create policy insp_inspection_photos_assignee_select on insp_inspection_photos
  for select using (
    exists (
      select 1 from insp_inspections i
      join insp_project_assignees pa on pa.project_id = i.project_id
      where i.id = insp_inspection_photos.inspection_id and pa.user_email = auth.email()
    )
  );
create policy insp_inspection_photos_assignee_insert on insp_inspection_photos
  for insert with check (
    exists (
      select 1 from insp_inspections i
      join insp_project_assignees pa on pa.project_id = i.project_id
      where i.id = insp_inspection_photos.inspection_id and pa.user_email = auth.email()
    )
  );
create policy insp_inspection_photos_assignee_update on insp_inspection_photos
  for update using (
    exists (
      select 1 from insp_inspections i
      join insp_project_assignees pa on pa.project_id = i.project_id
      where i.id = insp_inspection_photos.inspection_id and pa.user_email = auth.email()
    )
  );

-- insp_inspection_edit_log：只有 admin 可讀寫（第13節：修改須留痕，避免使用者自行竄改紀錄）
create policy insp_inspection_edit_log_admin_all on insp_inspection_edit_log
  for all using (insp_is_admin()) with check (insp_is_admin());
