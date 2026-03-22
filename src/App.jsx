import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas públicas
import HomePage      from './pages/HomePage';
import StorePage     from './pages/StorePage';
import LoginPage     from './pages/LoginPage';
import RegisterPage  from './pages/RegisterPage';
import ForgotPage    from './pages/ForgotPasswordPage';

// Panel Admin
import AdminLayout    from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGrid      from './pages/admin/AdminGrid';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminSettings  from './pages/admin/AdminSettings';
import AdminExport    from './pages/admin/AdminExport';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(20,15,50,0.95)',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px)',
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
        <Routes>
          {/* Públicas */}
          <Route path="/"           element={<HomePage />} />
          <Route path="/tienda/:storeId" element={<StorePage />} />
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/registro"   element={<RegisterPage />} />
          <Route path="/recuperar"  element={<ForgotPage />} />

          {/* Admin (protegidas) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index             element={<AdminDashboard />} />
            <Route path="grilla"     element={<AdminGrid />} />
            <Route path="clientes"   element={<AdminCustomers />} />
            <Route path="exportar"   element={<AdminExport />} />
            <Route path="ajustes"    element={<AdminSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
