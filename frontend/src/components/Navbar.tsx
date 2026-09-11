import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, UserCheck, LayoutDashboard, LogOut, Zap } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/courses" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold gradient-brand-text tracking-tight">
              QueueReg
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-6">
            <Link
              to="/courses"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/courses')
                  ? 'bg-orange-50 text-[#ff4d21]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>ค้นหาวิชาเรียน</span>
            </Link>

            <Link
              to="/my-courses"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/my-courses')
                  ? 'bg-orange-50 text-[#ff4d21]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>วิชาของฉัน</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive('/admin/dashboard')
                    ? 'bg-orange-50 text-[#ff4d21]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Monitor</span>
              </Link>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-gray-900">{user?.fullName}</span>
              <span className="text-xs text-gray-500">
                {user?.role === 'admin' ? '🔑 Administrator' : `🎓 นักศึกษาชั้นปีที่ ${user?.yearLevel}`}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
