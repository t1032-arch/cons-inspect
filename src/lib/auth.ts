import { supabase } from '@/lib/supabase';
import type { InspUserRole, UserRole } from '@/types';

// 登入沿用 Supabase Auth 的 Google Provider（與標案管理平台共用同一組 auth.users）
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      // 可視需求限制學校網域帳號登入，見 workplan_v2.md §18
      // queryParams: { hd: 'school-domain.edu.tw' },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// 角色判斷讀本系統自己的 insp_user_roles，不沿用標案管理平台的 user_roles
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('insp_user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle<Pick<InspUserRole, 'role'>>();

  if (error) throw error;
  return data?.role ?? null;
}
