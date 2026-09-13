import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  Settings,
  HelpCircle,
  LogOut,
  Zap,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between p-6 shrink-0 min-h-screen sticky top-0">
      {/* Brand Header & User Profile Info */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#b83a00] to-[#e65100] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Academic Hub</h1>
            <p className="text-xs text-gray-400 font-medium">Manage your momentum</p>
          </div>
        </div>

        {/* User Badge */}
        {user && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-orange-50/60 border border-orange-100/50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#b83a00] to-[#ff6f00] text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {user.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
              <p className="text-xs text-orange-700 font-medium">
                {user.role === 'admin' ? '🔑 Administrator' : `🎓 ชั้นปีที่ ${user.yearLevel}`}
              </p>
            </div>
          </div>
        )}

        {/* Main Nav Links */}
        <nav className="space-y-1.5">
          <NavLink
            to="/my-courses"
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#e65100] to-[#ff6f00] text-white shadow-md shadow-orange-500/20 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <GraduationCap className="w-5 h-5" />
            <span>My Courses</span>
          </NavLink>

          <NavLink
            to="/courses"
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#e65100] to-[#ff6f00] text-white shadow-md shadow-orange-500/20 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <BookOpen className="w-5 h-5" />
            <span>Catalog</span>
          </NavLink>

          <NavLink
            to="/registrations"
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#e65100] to-[#ff6f00] text-white shadow-md shadow-orange-500/20 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Calendar className="w-5 h-5" />
            <span>Schedule & Queue</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#e65100] to-[#ff6f00] text-white shadow-md shadow-orange-500/20 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Layers className="w-5 h-5" />
              <span>Admin Dashboard</span>
            </NavLink>
          )}
        </nav>

        {/* Primary Action Button: Register Now */}
        <button
          onClick={() => navigate('/courses')}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#b83a00] to-[#d94b00] hover:from-[#a03200] hover:to-[#c44100] text-white font-bold text-sm shadow-lg shadow-orange-700/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span>Register Now</span>
        </button>
      </div>

      {/* Footer Nav Links */}
      <div className="space-y-1 border-t border-gray-100 pt-4">
        <button className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <HelpCircle className="w-5 h-5" />
          <span>Help</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
