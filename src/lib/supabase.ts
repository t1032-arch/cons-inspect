import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY 環境變數');
}

// 與標案管理平台共用同一個 Supabase 專案（同一個 auth.users），
// 但 admin/user 角色判斷讀本系統自己的 insp_user_roles，見 workplan_v2.md §16.0
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
