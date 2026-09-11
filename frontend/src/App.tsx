import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { CatalogPage } from './pages/CatalogPage';
import { MyCoursesPage } from './pages/MyCoursesPage';
import { LiveQueuePage } from './pages/LiveQueuePage';

// Main Layout Wrapper displaying Sidebar for authenticated pages
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#f4f4f8]">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden min-h-screen pb-12">
        {children}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <CatalogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-courses"
              element={
                <ProtectedRoute>
                  <MyCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registrations"
              element={
                <ProtectedRoute>
                  <LiveQueuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute adminOnly>
                  <div className="p-8">
                    <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">พร้อมสำหรับทำ UI Admin ใน Step 14</p>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/courses" replace />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
