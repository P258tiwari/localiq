import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout             from './components/layout/Layout';
import LoginPage          from './pages/LoginPage';
import DashboardPage      from './pages/DashboardPage';
import ClientsPage        from './pages/ClientsPage';
import NewClientPage      from './pages/NewClientPage';
import ClientOverviewPage from './pages/ClientOverviewPage';
import BillingPage        from './pages/BillingPage';
import TeamPage           from './pages/TeamPage';
import SettingsPage        from './pages/SettingsPage';
import PublicClientPage    from './pages/PublicClientPage';
import PostGeneratorPage   from './pages/PostGeneratorPage';

function Guard({ children }) {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuthStore();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"   element={<DashboardPage />} />
        <Route path="clients"     element={<ClientsPage />} />
        <Route path="clients/new" element={<NewClientPage />} />
        <Route path="clients/:id" element={<ClientOverviewPage />} />
        <Route path="billing"          element={<BillingPage />} />
        <Route path="team"             element={<TeamPage />} />
        <Route path="settings"         element={<SettingsPage />} />
        <Route path="posts/generate"   element={<PostGeneratorPage />} />
      </Route>

      <Route path="/public/:token" element={<PublicClientPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
