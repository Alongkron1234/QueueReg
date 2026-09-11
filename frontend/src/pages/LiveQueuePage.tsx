import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { HeaderBar } from '../components/HeaderBar';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QueueItem {
  id: string;
  eventType: 'queued' | 'confirmed' | 'waitlisted' | 'rejected' | 'promoted_from_waitlist';
  createdAt: string;
  section?: {
    id: string;
    sectionCode: string;
    instructorName?: string;
    course?: {
      courseCode: string;
      courseName: string;
      credits: number;
    };
  };
}

export const LiveQueuePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queueEvents, setQueueEvents] = useState<QueueItem[]>([]);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString('th-TH'));

  const fetchData = async () => {
    try {
      // Fetch recent queue events
      const queueRes = await api.get('/registrations/active-queue');
      setQueueEvents(queueRes.data);

      // Fetch student enrollments for total credits
      const enrollRes = await api.get('/registrations/my-enrollments');
      const confirmed = enrollRes.data.filter((e: any) => e.status === 'confirmed');
      const creditsSum = confirmed.reduce(
        (sum: number, e: any) => sum + (e.section?.course?.credits || 3),
        0,
      );
      setTotalCredits(creditsSum);
    } catch (err) {
      console.error('Error fetching live queue data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!user) return;

    const socket: Socket = io('http://localhost:3000');

    socket.on('connect', () => {
      socket.emit('join_student', { studentId: user.id });
    });

    socket.on('registration_result', () => {
      setLastUpdated(new Date().toLocaleTimeString('th-TH'));
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const activeQueuedCount = queueEvents.filter((ev) => ev.eventType === 'queued').length;
  const isQueueEmpty = activeQueuedCount === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <HeaderBar />

      {/* Page Title Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          ลงทะเบียนเรียน & ติดตามคิว
        </h1>
        <p className="text-xs font-semibold text-gray-400 mt-1">ภาคการศึกษาที่ 2/2566</p>
      </div>

      {/* Queue Status Box with Ring Indicator */}
      <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-md mb-8 flex flex-col md:flex-row items-center gap-6 md:gap-10 border-t-4 ${isQueueEmpty ? 'border-t-emerald-500' : 'border-t-[#b83a00]'}`}>
        {/* Ring Gauge */}
        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-100"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={isQueueEmpty ? "text-emerald-500" : "text-[#b83a00]"}
              strokeDasharray={isQueueEmpty ? "100, 100" : "75, 100"}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-3xl font-black ${isQueueEmpty ? 'text-emerald-600' : 'text-gray-900'}`}>
              {activeQueuedCount}
            </span>
            <span className="text-[10px] text-gray-400 font-bold">
              {isQueueEmpty ? 'ไม่มีคิวค้าง' : 'คิวรอประมวลผล'}
            </span>
          </div>
        </div>

        {/* Status Description */}
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-bold text-gray-900 mb-2">สถานะคิวของคุณ</h3>
          <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
            คุณอยู่ในระบบประมวลผลการลงทะเบียนเรียนแบบ High-Concurrency (BullMQ + Redis Atomic Engine)
            สถานะคิวขณะนี้:{' '}
            <span className={`font-bold ${isQueueEmpty ? 'text-emerald-600' : 'text-[#b83a00]'}`}>
              {isQueueEmpty ? 'ประมวลผลคำขอครบถ้วนแล้ว (ไม่มีคิวตกค้าง)' : `มีคำขอรอประมวลผล ${activeQueuedCount} รายการ...`}
            </span>
          </p>
          <p className="text-xs text-gray-400 mt-3 font-medium">
            อัปเดตล่าสุด: {lastUpdated} น.
          </p>
        </div>
      </div>

      {/* Active Processing Items (Matching Image 3 Cards) */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">รายวิชาที่กำลังดำเนินการ</h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#b83a00] animate-spin" />
          </div>
        ) : queueEvents.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-gray-100 text-gray-400 text-sm">
            ยังไม่มีรายการคำขอลงทะเบียนล่าสุด
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {queueEvents.map((item) => {
              const courseCode = item.section?.course?.courseCode || 'วิชาเรียน';
              const courseName = item.section?.course?.courseName || 'รายวิชาลงทะเบียน';
              const instructor = item.section?.instructorName || 'อาจารย์ประจำภาควิชา';
              const credits = item.section?.course?.credits || 3;
              const secCode = item.section?.sectionCode || '01';

              let borderColor = 'border-orange-200';
              let topBarColor = 'bg-[#b83a00]';
              let statusBadge = (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                  ⏳ กำลังต่อคิว
                </span>
              );

              if (item.eventType === 'confirmed' || item.eventType === 'promoted_from_waitlist') {
                borderColor = 'border-emerald-200';
                topBarColor = 'bg-emerald-500';
                statusBadge = (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ✅ ลงทะเบียนสำเร็จ
                  </span>
                );
              } else if (item.eventType === 'waitlisted') {
                borderColor = 'border-amber-200';
                topBarColor = 'bg-amber-500';
                statusBadge = (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    ⏳ คิวสำรอง (Waitlist)
                  </span>
                );
              } else if (item.eventType === 'rejected') {
                borderColor = 'border-red-200';
                topBarColor = 'bg-red-500';
                statusBadge = (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                    ❌ กลุ่มเต็ม / ไม่สำเร็จ
                  </span>
                );
              }

              return (
                <div
                  key={item.id}
                  className={`bg-white p-6 rounded-3xl border ${borderColor} shadow-sm relative overflow-hidden flex flex-col justify-between`}
                >
                  <div className={`w-full h-1.5 ${topBarColor} absolute top-0 left-0`}></div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-800">{courseCode}</span>
                      {statusBadge}
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{courseName}</h4>
                    <p className="text-xs text-gray-400 mb-3">{instructor}</p>
                  </div>

                  <div className="p-2.5 bg-gray-50 rounded-xl text-xs text-gray-500 flex justify-between mt-2">
                    <span>หน่วยกิต: {credits}</span>
                    <span>กลุ่มเรียน: {secCode}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Credit Summary Bar (Matching Image 3 Bottom Bar) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <div>
          <p className="text-sm font-bold text-gray-900">
            ยอดรวมหน่วยกิต: <span className="text-xl font-black text-[#b83a00]">{totalCredits} / 22</span>
          </p>
          <p className="text-xs text-gray-400">กรุณาตรวจสอบความถูกต้องก่อนยืนยันการลงทะเบียน</p>
        </div>

        <button
          onClick={() => navigate('/my-courses')}
          className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#b83a00] to-[#992d00] hover:from-[#a03200] hover:to-[#802400] text-white font-bold text-sm shadow-md flex items-center gap-2 transition-all hover:scale-[1.01]"
        >
          <Sparkles className="w-4 h-4" />
          <span>ดูรายวิชาที่ลงทะเบียนแล้ว</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
