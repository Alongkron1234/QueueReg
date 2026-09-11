import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/courses');
    } catch (err: any) {
      setError(err.response?.data?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('password123');
    setError('');
    setLoading(true);

    try {
      await login(quickEmail, 'password123');
      navigate('/courses');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f8] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-gray-100/80">
        
        {/* Left Side: Brand Illustration Panel */}
        <div className="bg-gradient-to-br from-[#f8ede6] via-[#f0dcd0] to-[#e8cbbe] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center gap-2.5 z-10">
            <div className="w-9 h-9 rounded-xl bg-[#b83a00] flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-[#b83a00] tracking-tight">UniReg</span>
          </div>

          <div className="my-8 z-10 flex flex-col items-center text-center">
            <div className="w-64 h-64 bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-white/60 flex flex-col items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-[#b83a00] mb-4">
                <BookOpen className="w-10 h-10" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Academic Portal</h3>
              <p className="text-xs text-gray-500 mt-1">High-Concurrency Registration System</p>
            </div>
            <p className="text-sm text-gray-600 font-medium max-w-xs">
              ระบบลงทะเบียนเรียนอัจฉริยะ รองรับคำขอพร้อมกัน ไร้กังวลเรื่องค้างหรือเก้าอี้เกิน
            </p>
          </div>

          <div className="text-xs text-gray-400 z-10 text-center">
            © 2026 UniReg Academic Network. All rights reserved.
          </div>

          {/* Decorative Blur Circles */}
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-400/20 rounded-full blur-2xl"></div>
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-400/20 rounded-full blur-2xl"></div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-[#b83a00] mb-2">
              <GraduationCap className="w-6 h-6" />
              <span className="font-bold text-base">UniReg</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              เข้าสู่ระบบเครือข่ายวิชาการ
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              กรุณาเข้าสู่ระบบด้วยรหัสนักศึกษาและรหัสผ่านของคุณ
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input 1: Student ID / Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                รหัสนักศึกษา / อีเมล (Student ID / Email)
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="เช่น somsak@student.ac.th"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f3f3f8] text-gray-900 text-sm rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#b83a00] transition-all border border-transparent focus:bg-white"
                />
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Input 2: Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f3f3f8] text-gray-900 text-sm rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#b83a00] transition-all border border-transparent focus:bg-white"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Checkbox & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-[#b83a00] focus:ring-[#b83a00]"
                />
                <span>จดจำฉัน</span>
              </label>
              <a href="#" className="font-semibold text-[#b83a00] hover:underline">
                ลืมรหัสผ่าน?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#b83a00] to-[#992c00] hover:from-[#a03200] hover:to-[#802400] text-white font-bold text-base shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>เข้าสู่ระบบ (Sign In)</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Login Preset Buttons for Fast Testing */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 mb-3 text-center">
              ⚡ ทางลัดกดทดสอบ Login ทันที (Quick Test Accounts):
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('somsak@student.ac.th')}
                className="py-2.5 px-2 bg-orange-50 hover:bg-orange-100 text-[#b83a00] rounded-xl text-xs font-bold transition-colors text-center"
              >
                🎓 ปี 4 (สมศักดิ์)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('chujai@student.ac.th')}
                className="py-2.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors text-center"
              >
                🎓 ปี 1 (ชูใจ)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@coursereg.ac.th')}
                className="py-2.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors text-center"
              >
                🔑 Admin
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            พบปัญหาการใช้งาน? <a href="#" className="text-[#b83a00] font-semibold hover:underline">ติดต่อสำนักทะเบียน</a>
          </p>
        </div>

      </div>
    </div>
  );
};
