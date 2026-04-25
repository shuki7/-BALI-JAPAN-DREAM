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
import Staff from './pages/Staff';
import Inventory from './pages/Inventory';
import Discipline from './pages/Discipline';
import Apply from './pages/Apply';
import Applicants from './pages/Applicants';

const queryClient = new QueryClient();

interface ProtectedProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedProps) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#CC0000', fontWeight: 600 }}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  // Direct path check for cPanel/basename robust matching
  const isApplyPage = window.location.pathname.includes('/apply');

  if (isApplyPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <Apply />
        </LanguageProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter basename="/admin/siswa">
            <Routes>
              {/* Public Routes - Checked first */}
              <Route path="/apply" element={<Apply />} />
              <Route path="apply" element={<Apply />} />
              <Route path="/apply/*" element={<Apply />} />
              
              <Route path="/login" element={<Login />} />
              <Route path="login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
              <Route path="/students/new" element={<ProtectedRoute><StudentNew /></ProtectedRoute>} />
              <Route path="/students/:id" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
              <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/partners" element={<ProtectedRoute><Partners /></ProtectedRoute>} />
              <Route path="/scouters" element={<ProtectedRoute><Scouters /></ProtectedRoute>} />
              <Route path="/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/organizations" element={<ProtectedRoute><Organizations /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/discipline" element={<ProtectedRoute><Discipline /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
              <Route path="/applicants" element={<ProtectedRoute><Applicants /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              
              {/* Fallback - Only if nothing else matches */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
