import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { AdminRoute, ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { ProjectListPage } from '@/pages/ProjectListPage';
import { InspectionFormPage } from '@/pages/InspectionFormPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { InspectionDetailPage } from '@/pages/InspectionDetailPage';
import { AdminProjectsPage } from '@/pages/admin/AdminProjectsPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<ProjectListPage />} />
          <Route path="/projects/:projectId/inspect" element={<InspectionFormPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/inspections/:id" element={<InspectionDetailPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin/projects" element={<AdminProjectsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
