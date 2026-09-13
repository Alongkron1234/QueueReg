import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { HeaderBar } from '../components/HeaderBar';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import {
  CheckCircle2,
  Clock,
  User as UserIcon,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface EnrolledSection {
  id: string;
  sectionCode: string;
  instructorName?: string;
  course: {
    id: string;
    courseCode: string;
    courseName: string;
    credits: number;
  };
}

interface Enrollment {
  id: string;
  status: 'confirmed' | 'waitlisted' | 'cancelled';
  waitlistPosition?: number;
  section: EnrolledSection;
}

export const MyCoursesPage: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingSectionId, setCancellingSectionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMyCourses = async () => {
    try {
      const res = await api.get('/registrations/my-enrollments');
      setEnrollments(res.data);
    } catch (err) {
      console.error('Error fetching my courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, []);

  // Real-time WebSocket connection to receive registration & promotion results automatically
  useEffect(() => {
    if (!user) return;

    const socket: Socket = io('http://localhost:3000');

    socket.on('connect', () => {
      socket.emit('join_student', { studentId: user.id });
    });

    socket.on('registration_result', () => {
      fetchMyCourses();
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleCancel = async (sectionId: string) => {
    if (!window.confirm('คุณต้องการยกเลิกการลงทะเบียนวิชานี้ใช่หรือไม่?')) return;

    setCancellingSectionId(sectionId);
    setMessage(null);

    try {
      const res = await api.post('/registrations/cancel', { sectionId });
      setMessage({ type: 'success', text: res.data.message || 'ยกเลิกวิชาเรียนเรียบร้อยแล้ว' });
      fetchMyCourses();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'ไม่สามารถยกเลิกวิชาเรียนได้',
      });
    } finally {
      setCancellingSectionId(null);
    }
  };

  const confirmedCourses = enrollments.filter((e) => e.status === 'confirmed');
  const waitlistCourses = enrollments.filter((e) => e.status === 'waitlisted');
  const totalCredits = confirmedCourses.reduce((sum, e) => sum + (e.section?.course?.credits || 3), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <HeaderBar />

      {/* Page Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            วิชาที่ลงทะเบียน & คิวสำรอง
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            สรุปรายการวิชาที่ได้รับยืนยันที่นั่งเรียนแล้ว และวิชาที่รอในคิวสำรอง
          </p>
        </div>

        {/* Total Credits Card (Matching Image 4) */}
        <div className="bg-gradient-to-r from-[#b83a00] to-[#d94b00] text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-6 shrink-0">
          <div>
            <p className="text-xs text-orange-200 font-semibold">หน่วยกิตรวม (Total Credits)</p>
            <p className="text-2xl font-black">{totalCredits} / 22 <span className="text-xs font-normal">หน่วยกิต</span></p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold">
            ภาคการศึกษา 2/2566
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#b83a00] animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* SECTION 1: Confirmed Courses (Matching Image 4) */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <h2 className="text-xl font-black text-gray-900">วิชาที่ลงทะเบียนสำเร็จ</h2>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                {confirmedCourses.length} วิชา
              </span>
            </div>

            {confirmedCourses.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm">
                <p className="text-sm text-gray-400">ยังไม่มีวิชาที่ลงทะเบียนสำเร็จในขณะนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {confirmedCourses.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                  >
                    <div className="w-full h-1.5 bg-emerald-500 absolute top-0 left-0"></div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {item.section?.course?.courseCode}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                        {item.section?.course?.credits || 3} Credits
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-base mb-2">
                      {item.section?.course?.courseName}
                    </h3>

                    <div className="space-y-1.5 text-xs text-gray-500 mb-6">
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>จันทร์ 09:00 - 12:00 น. | Sec {item.section?.sectionCode}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.section?.instructorName || 'อาจารย์ผู้สอน'}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleCancel(item.section?.id)}
                      disabled={cancellingSectionId === item.section?.id}
                      className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {cancellingSectionId === item.section?.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ถอนรายวิชา (Withdraw)</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: Waitlisted Courses (Matching Image 4) */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-black text-gray-900">คิวสำรอง (Waitlist)</h2>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
                {waitlistCourses.length} วิชา
              </span>
            </div>

            {waitlistCourses.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm">
                <p className="text-sm text-gray-400">ไม่มีรายวิชาที่อยู่ในคิวสำรอง</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {waitlistCourses.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                  >
                    <div className="w-full h-1.5 bg-amber-500 absolute top-0 left-0"></div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {item.section?.course?.courseCode}
                      </span>
                      <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                        คิวที่ #{item.waitlistPosition || 1}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-base mb-2">
                      {item.section?.course?.courseName}
                    </h3>

                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 text-xs text-amber-800 mb-4 text-center">
                      ⏳ รอที่นั่งว่าง (Waiting for seat) — หากมีคนยกเลิกจะถูกดึงแทนอัตโนมัติ
                    </div>

                    <button
                      onClick={() => handleCancel(item.section?.id)}
                      disabled={cancellingSectionId === item.section?.id}
                      className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {cancellingSectionId === item.section?.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>ยกเลิกคิว (Cancel Waitlist)</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
