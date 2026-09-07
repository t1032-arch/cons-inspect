import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { AppHeader } from '@/components/AppHeader';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-4 text-center text-slate-500">載入中…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  );
}

export function AdminRoute() {
  const { role, loading } = useAuth();
  if (loading) return <div className="p-4 text-center text-slate-500">載入中…</div>;
  if (role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
