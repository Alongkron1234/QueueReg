import React from 'react';
import { Search, Bell, User as UserIcon, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderBarProps {
  onSearch?: (term: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onSearch }) => {
  const { user } = useAuth();

  return (
    <div className="bg-gradient-to-r from-[#b83a00] to-[#c44100] text-white px-6 py-3.5 rounded-2xl shadow-lg shadow-orange-900/10 flex items-center justify-between mb-8">
      {/* Brand Badge */}
      <div className="flex items-center gap-2.5">
        <GraduationCap className="w-7 h-7 text-white" />
        <span className="text-xl font-black tracking-tight text-white">UniReg</span>
      </div>

      {/* Center Search Bar */}
      <div className="relative max-w-md w-full mx-4 hidden sm:block">
        <input
          type="text"
          placeholder="Search courses, instructors..."
          onChange={(e) => onSearch?.(e.target.value)}
          className="w-full bg-white/20 backdrop-blur-md text-white placeholder-white/70 text-sm rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all border border-white/10"
        />
        <Search className="w-4 h-4 text-white/80 absolute left-3.5 top-2.5" />
      </div>

      {/* Right User Controls */}
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors relative">
          <Bell className="w-5 h-5 text-white" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-white/20">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            <UserIcon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-white hidden md:inline">
            {user?.fullName || 'User'}
          </span>
        </div>
      </div>
    </div>
  );
};
