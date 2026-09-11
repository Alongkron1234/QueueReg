import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { HeaderBar } from '../components/HeaderBar';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Clock,
  PlusCircle,
  XCircle,
  Users,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Section {
  id: string;
  sectionCode: string;
  instructorName?: string;
  maxCapacity: number;
  remainingSeats?: number;
  registrationOpenAt: string;
  registrationCloseAt: string;
}

interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  credits: number;
  sections: Section[];
}

export const CatalogPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [registeringSectionId, setRegisteringSectionId] = useState<string | null>(null);

  // Live Queue Modal State
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queueStatus, setQueueStatus] = useState<'queued' | 'confirmed' | 'waitlisted' | 'rejected' | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [queueDetails, setQueueDetails] = useState<any>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Load Courses
  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      const coursesData: Course[] = res.data;

      // Fetch real-time seat counts from Redis for each section
      for (const course of coursesData) {
        for (const section of course.sections) {
          try {
            const seatsRes = await api.get(`/courses/sections/${section.id}/seats`);
            section.remainingSeats = seatsRes.data.remainingSeats;
          } catch {
            section.remainingSeats = section.maxCapacity;
          }
        }
      }

      setCourses(coursesData);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Listen to Real-time WebSocket for Seat Updates & Personal Registration Result
  useEffect(() => {
    if (!user) return;

    const socket: Socket = io('http://localhost:3000');

    socket.on('connect', () => {
      // Join student personal room
      socket.emit('join_student', { studentId: user.id });

      // Join section rooms for seat updates
      courses.forEach((c) =>
        c.sections.forEach((s) => socket.emit('join_section', { sectionId: s.id })),
      );
    });

    // Handle Seat Updates
    socket.on('seat_count_updated', (data: { sectionId: string; remainingSeats: number }) => {
      setCourses((prevCourses) =>
        prevCourses.map((c) => ({
          ...c,
          sections: c.sections.map((s) =>
            s.id === data.sectionId ? { ...s, remainingSeats: data.remainingSeats } : s,
          ),
        })),
      );
    });

    // Handle Personal Registration Result
    socket.on('registration_result', (data: any) => {
      setQueueStatus(data.status);
      setQueueDetails(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, courses.length]);

  // Handle Registration Click
  const handleRegister = async (sectionId: string) => {
    setRegisteringSectionId(sectionId);
    setShowQueueModal(true);
    setQueueStatus('queued');
    setQueueDetails(null);

    try {
      const res = await api.post('/registrations', { sectionId });
      setRequestId(res.data.requestId);
    } catch (err: any) {
      setQueueStatus('rejected');
      setQueueDetails({ reason: err.response?.data?.message || 'การยื่นคำขอไม่สำเร็จ' });
    } finally {
      setRegisteringSectionId(null);
    }
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header Bar */}
      <HeaderBar onSearch={(term) => setSearchQuery(term)} />

      {/* Page Title Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">ค้นหารายชื่อวิชา</h1>
        <p className="text-sm text-gray-500 mt-1">
          ค้นหาและเลือกวิชาที่คุณต้องการลงทะเบียนเรียนในภาคการศึกษานี้
        </p>
      </div>

      {/* Search & Filter Bar (Matching Image 2) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="รหัสวิชา, ชื่อวิชา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f3f3f8] text-sm rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        </div>

        <select className="bg-[#f3f3f8] text-sm text-gray-700 rounded-xl px-4 py-2.5 focus:outline-none border border-transparent">
          <option>คณะ / ภาควิชา (วิศวกรรมซอฟต์แวร์)</option>
        </select>

        <select className="bg-[#f3f3f8] text-sm text-gray-700 rounded-xl px-4 py-2.5 focus:outline-none border border-transparent">
          <option>หน่วยกิต (ทั้งหมด)</option>
        </select>

        <select className="bg-[#f3f3f8] text-sm text-gray-700 rounded-xl px-4 py-2.5 focus:outline-none border border-transparent">
          <option>วัน / เวลา (ทั้งหมด)</option>
        </select>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#b83a00] animate-spin" />
        </div>
      ) : (
        /* Course Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const section = course.sections[0];
            const remaining = section?.remainingSeats ?? section?.maxCapacity ?? 0;
            const isFull = remaining <= 0;

            // Course code badge color mapping based on UniReg reference design
            const badgeColorClass =
              course.courseCode === 'CS101'
                ? 'bg-blue-600 text-white'
                : course.courseCode === 'CS201'
                ? 'bg-orange-500 text-white'
                : course.courseCode === 'CS301'
                ? 'bg-purple-600 text-white'
                : 'bg-[#b83a00] text-white';

            return (
              <div
                key={course.id}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group border-t-4 border-t-[#b83a00]"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-xl text-xs font-extrabold shadow-sm ${badgeColorClass}`}>
                      {course.courseCode}
                    </span>
                    <span className="text-xs font-semibold text-gray-400">
                      💳 {course.credits} Credits
                    </span>
                  </div>

                  {/* Course Title & Description */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug">
                    {course.courseName}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                    อาจารย์ผู้สอน: {section?.instructorName || 'อาจารย์ประจำภาควิชา'} | Section{' '}
                    {section?.sectionCode || '01'}
                  </p>

                  {/* Schedule Time & Real-time Seats */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>จ. พ. 09:00 - 10:30 น.</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Users className="w-4 h-4 text-[#b83a00]" />
                      <span className={isFull ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>
                        {isFull
                          ? `ที่นั่งเต็มแล้ว (${section?.maxCapacity}/${section?.maxCapacity})`
                          : `เหลือ ${remaining} จาก ${section?.maxCapacity} ที่นั่ง`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  {isFull ? (
                    <button
                      onClick={() => handleRegister(section.id)}
                      className="w-full py-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-amber-200"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>ต่อคิวสำรอง (Waitlist)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegister(section.id)}
                      disabled={registeringSectionId === section.id}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#b83a00] to-[#992d00] hover:from-[#a03200] hover:to-[#802400] text-white font-bold text-sm shadow-md shadow-orange-900/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {registeringSectionId === section.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          <span>Add to Registration</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Queue Progress Modal (Matching Image 3 Tracker Style) */}
      {showQueueModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#b83a00] flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">ลงทะเบียนเรียน & ติดตามคิว</h2>
              <p className="text-xs text-gray-400 mt-1">
                 requestId: {requestId || 'กำลังออกบัตรคิว...'}
              </p>
            </div>

            {/* Status Content */}
            {queueStatus === 'queued' && (
              <div className="bg-orange-50/70 p-6 rounded-2xl border border-orange-100 text-center space-y-4 mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-[#b83a00] border-t-transparent animate-spin mx-auto"></div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base">กำลังต่อคิวประมวลผล...</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    คำขอเข้าสู่คิวแล้ว ระบบกำลังตัดเก้าอี้เรียนแบบ Atomic ใน RAM
                  </p>
                </div>
              </div>
            )}

            {queueStatus === 'confirmed' && (
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center space-y-3 mb-6">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                <div>
                  <h4 className="font-extrabold text-emerald-900 text-lg">🎉 ลงทะเบียนสำเร็จ! (Confirmed)</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    คุณได้รับการยืนยันที่นั่งเรียบร้อยแล้ว บันทึกลงระบบแล้ว
                  </p>
                </div>
              </div>
            )}

            {queueStatus === 'waitlisted' && (
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 text-center space-y-3 mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 font-black text-xl flex items-center justify-center mx-auto">
                  #{queueDetails?.waitlistPosition || 1}
                </div>
                <div>
                  <h4 className="font-extrabold text-amber-900 text-lg">⏳ ติดคิวสำรอง (Waitlisted)</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    วิชานี้ที่นั่งเต็มแล้ว คุณอยู่อันดับคิวสำรองที่ #{queueDetails?.waitlistPosition || 1} หากมีคนยกเลิกจะถูกดึงแทนที่อัตโนมัติ
                  </p>
                </div>
              </div>
            )}

            {queueStatus === 'rejected' && (
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center space-y-3 mb-6">
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                <div>
                  <h4 className="font-extrabold text-red-900 text-lg">❌ ลงทะเบียนไม่สำเร็จ</h4>
                  <p className="text-xs text-red-700 mt-1">
                    {queueDetails?.reason || 'คุณเคยลงทะเบียนวิชานี้ไปแล้ว'}
                  </p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowQueueModal(false)}
                className="w-full py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
              >
                ปิดหน้าต่าง
              </button>

              <button
                onClick={() => navigate('/my-courses')}
                className="w-full py-3.5 rounded-2xl bg-[#b83a00] hover:bg-[#a03200] text-white font-bold text-sm transition-colors shadow-md shadow-orange-950/20"
              >
                ไปที่วิชาของฉัน ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
