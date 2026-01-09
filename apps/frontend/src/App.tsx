import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SlotsPage } from './pages/SlotsPage';
import { AdminDashboard } from './pages/AdminDashboard';

const ProtectedRoute = ({ 
  children, 
  requireAdmin = false 
}: { 
  children: React.ReactNode; 
  requireAdmin?: boolean 
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/slots" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/slots'} replace /> : <LoginPage />} 
      />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/slots"
        element={
          <ProtectedRoute>
            <SlotsPage />
          </ProtectedRoute>
        }
      />
      
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </div>
  );
}

export default App;
