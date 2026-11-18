import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import OfflineIndicator from './components/common/OfflineIndicator';
import LoginPage from './pages/LoginPage';
import NurseDashboard from './pages/NurseDashboard';
import FamilyDashboard from './pages/FamilyDashboard';

function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'nurse' ? '/nurse' : '/family'} replace />;
  }

  return (
    <>
      <Navbar />
      <OfflineIndicator />
      <main>{children}</main>
    </>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'nurse' ? '/nurse' : '/family'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/nurse/*"
            element={
              <ProtectedRoute allowedRole="nurse">
                <NurseDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/family/*"
            element={
              <ProtectedRoute allowedRole="family">
                <FamilyDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

