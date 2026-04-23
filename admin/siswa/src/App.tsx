import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentNew from './pages/StudentNew';
import StudentDetail from './pages/StudentDetail';
import Payments from './pages/Payments';
import Partners from './pages/Partners';
import Scouters from './pages/Scouters';
import Commissions from './pages/Commissions';
import Documents from './pages/Documents';
import Organizations from './pages/Organizations';
import Settings from './pages/Settings';

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#CC0000', fontWeight: 600 }}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/new" element={<StudentNew />} />
        <Route path="/students/:id" element={<StudentDetail />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/scouters" element={<Scouters />} />
        <Route path="/commissions" element={<Commissions />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter basename="/admin/siswa">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
