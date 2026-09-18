import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import { useAuth } from './auth/AuthContext.jsx';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const AdminAccessPage = lazy(() => import('./pages/AdminAccessPage.jsx'));
const AdminGuestsPage = lazy(() => import('./pages/AdminGuestsPage.jsx'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage.jsx'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage.jsx'));
const PublicHomePage = lazy(() => import('./pages/PublicHomePage.jsx'));
const PublicInvitationPage = lazy(() => import('./pages/PublicInvitationPage.jsx'));
const ReceptionistScanner = lazy(() => import('./pages/ReceptionistScanner.jsx'));

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-linen p-6 text-ink"><div className="card text-center">Loading experience...</div></div>}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<PublicHomePage />} />
          <Route path="/invitation/:invitationId" element={<PublicInvitationPage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="guests" element={<AdminGuestsPage />} />
          <Route path="scanner" element={<ReceptionistScanner />} />
          <Route path="access" element={<RequireAuth allowedRoles={['super_admin']}><AdminAccessPage /></RequireAuth>} />
          <Route path="settings" element={<RequireAuth allowedRoles={['super_admin']}><AdminSettingsPage /></RequireAuth>} />
        </Route>

        <Route path="/scanner" element={<Navigate to="/admin/scanner" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function RequireAuth({ children, allowedRoles }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return <div className="card text-center">Checking access...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(auth.user?.role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
