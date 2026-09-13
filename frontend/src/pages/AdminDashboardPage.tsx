import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { HeaderBar } from '../components/HeaderBar';
import {
  Users,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Server,
  Zap,
  BookOpen,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface SectionMetric {
  id: string;
  courseCode: string;
  courseName: string;
  credits: number;
  sectionCode: string;
  instructorName?: string;
  dayTime?: string;
  registrationOpenAt?: string;
  registrationCloseAt?: string;
  maxCapacity: number;
  remainingSeats: number;
  waitlistCount: number;
}

interface AuditLog {
  id: string;
  studentId: string;
  sectionId: string;
  eventType: string;
  detail: any;
  createdAt: string;
  courseCode: string;
  courseName: string;
  sectionCode: string;
}

interface CourseItem {
  id: string;
  courseCode: string;
  courseName: string;
  credits: number;
}

interface AdminStats {
  summary: {
    totalStudents: number;
    totalCourses: number;
    totalSections: number;
    totalConfirmed: number;
    totalWaitlisted: number;
  };
  allCourses: CourseItem[];
  sectionMetrics: SectionMetric[];
  auditLogs: AuditLog[];
}

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preloadingSectionId, setPreloadingSectionId] = useState<string | null>(null);
  const [reconcilingSectionId, setReconcilingSectionId] = useState<string | null>(null);
  const [reconcilingAll, setReconcilingAll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State for Create Course & Section
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);

  // Create Course Form State
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [credits, setCredits] = useState(3);

  // Helper to format Date for input datetime-local
  const formatForDateTimeLocal = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Create Section Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sectionCode, setSectionCode] = useState('01');
  const [instructorName, setInstructorName] = useState('');
  
  // Interactive Day & Time Picker State
  const [selectedDays, setSelectedDays] = useState<string[]>(['จ.', 'พ.']);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [dayTime, setDayTime] = useState('จ. พ. 09:00 - 10:30 น.');

  const [maxCapacity, setMaxCapacity] = useState(30);
  const [regOpenAt, setRegOpenAt] = useState(() => formatForDateTimeLocal(new Date()));
  const [regCloseAt, setRegCloseAt] = useState(() =>
    formatForDateTimeLocal(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
  );

  // Auto update dayTime string whenever selected days or time change
  useEffect(() => {
    if (selectedDays.length > 0) {
      setDayTime(`${selectedDays.join(' ')} ${startTime} - ${endTime} น.`);
    } else {
      setDayTime(`${startTime} - ${endTime} น.`);
    }
  }, [selectedDays, startTime, endTime]);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
      setMessage({ type: 'error', text: 'ไม่สามารถดึงข้อมูลสถิติ Admin ได้' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Socket.IO for real-time audit log stream
  useEffect(() => {
    const socket: Socket = io('http://localhost:3000');

    socket.on('connect', () => {
      // Connect to Socket.IO server
    });

    socket.on('seat_count_updated', () => {
      fetchStats();
    });

    socket.on('registration_result', () => {
      fetchStats();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Pre-load Seats to Redis
  const handlePreloadSeats = async (sectionId: string) => {
    setPreloadingSectionId(sectionId);
    setMessage(null);

    try {
      const res = await api.post(`/admin/sections/${sectionId}/preload`);
      setMessage({
        type: 'success',
        text: res.data.message || 'Pre-load จำนวนที่นั่งลง Redis เรียบร้อยแล้ว',
      });
      fetchStats();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'ไม่สามารถ Pre-load ที่นั่งลง Redis ได้',
      });
    } finally {
      setPreloadingSectionId(null);
    }
  };

  // Reconcile Seats between Postgres DB (Source of Truth) and Redis RAM
  const handleReconcileSection = async (sectionId: string) => {
    setReconcilingSectionId(sectionId);
    setMessage(null);

    try {
      const res = await api.post(`/admin/sections/${sectionId}/reconcile`);
      setMessage({
        type: 'success',
        text: `กระทบยอดสำเร็จ! (DB Confirmed: ${res.data.confirmedCount}/${res.data.maxCapacity} -> Redis RAM ตั้งค่าที่นั่งคงเหลือใหม่เป็น: ${res.data.newRedisSeats})`,
      });
      fetchStats();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'ไม่สามารถกระทบยอดที่นั่งได้',
      });
    } finally {
      setReconcilingSectionId(null);
    }
  };

  const handleReconcileAll = async () => {
    setReconcilingAll(true);
    setMessage(null);

    try {
      const res = await api.post('/admin/sections/reconcile-all');
      setMessage({
        type: 'success',
        text: res.data.message || 'กระทบยอดข้อมูลทั้งหมดเรียบร้อยแล้ว',
      });
      fetchStats();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'ไม่สามารถกระทบยอดที่นั่งทั้งหมดได้',
      });
    } finally {
      setReconcilingAll(false);
    }
  };

  // Submit Create Course Form
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      await api.post('/admin/courses', {
        courseCode,
        courseName,
        credits: Number(credits),
      });
      setMessage({ type: 'success', text: `สร้างรายวิชา ${courseCode} สำเร็จแล้ว` });
      setShowCourseModal(false);
      setCourseCode('');
      setCourseName('');
      fetchStats();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'ไม่สามารถสร้างรายวิชาได้',
      });
    }
  };

  // Submit Create Section Form
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const openIso = regOpenAt ? new Date(regOpenAt).toISOString() : new Date().toISOString();
    const closeIso = regCloseAt ? new Date(regCloseAt).toISOString() : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await api.post('/admin/sections', {
        courseId: selectedCourseId,
        sectionCode,
        instructorName,
        dayTime,
        maxCapacity: Number(maxCapacity),
        registrationOpenAt: openIso,
        registrationCloseAt: closeIso,
      });
      setMessage({ type: 'success', text: `สร้าง Section ${sectionCode} พร้อม Pre-load ที่นั่งสำเร็จ` });
      setShowSectionModal(false);
      fetchStats();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'ไม่สามารถสร้าง Section ได้',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <HeaderBar />

      {/* Admin Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#b83a00] text-white">
              ADMIN CONTROL CENTER
            </span>
            <span className="text-xs text-gray-400 font-medium">Real-Time System Monitoring</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-1">
            แผงควบคุมระบบ (Admin Dashboard)
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="py-2.5 px-4 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรชสถิติ</span>
          </button>

          <button
            onClick={() => setShowCourseModal(true)}
            className="py-2.5 px-4 rounded-xl bg-[#b83a00] hover:bg-[#a03200] text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-950/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>เพิ่มรายวิชา</span>
          </button>
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
        <div className="space-y-8">
          {/* KPI Statistics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Total Students */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400">นักศึกษาทั้งหมด</span>
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-900">{stats?.summary.totalStudents || 0}</p>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">บัญชีนักศึกษาในระบบ</p>
            </div>

            {/* Card 2: Total Courses & Sections */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400">วิชา / Sections</span>
                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-900">
                {stats?.summary.totalCourses || 0} <span className="text-sm font-normal text-gray-400">({stats?.summary.totalSections} Secs)</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">เปิดสอนในภาคการศึกษานี้</p>
            </div>

            {/* Card 3: Confirmed Enrollments */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400">ลงทะเบียนสำเร็จ</span>
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-emerald-600">{stats?.summary.totalConfirmed || 0}</p>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">ที่นั่งที่ตัดใน RAM สำเร็จ</p>
            </div>

            {/* Card 4: Waitlisted Students */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400">ติดคิวสำรอง (Waitlist)</span>
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-amber-600">{stats?.summary.totalWaitlisted || 0}</p>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">อยู่ใน Redis Sorted Set</p>
            </div>
          </div>

          {/* SECTION METRICS & REDIS SYNC TABLE */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#b83a00] flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">สถานะที่นั่งใน Redis RAM (Section Metrics)</h3>
                  <p className="text-xs text-gray-400">ตรวจเช็คความจุที่นั่งคงเหลือและกด Pre-load Sync ได้ทันที</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReconcileAll}
                  disabled={reconcilingAll}
                  className="py-2 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="กระทบยอดข้อมูล Redis RAM ทั้งหมดให้ตรงกับ PostgreSQL"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reconcilingAll ? 'animate-spin' : ''}`} />
                  <span>กระทบยอดทั้งหมด (Reconcile All)</span>
                </button>

                <button
                  onClick={() => {
                    if (stats?.allCourses.length) {
                      setSelectedCourseId(stats.allCourses[0].id);
                    }
                    setShowSectionModal(true);
                  }}
                  className="py-2 px-3.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#b83a00] font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>เพิ่ม Section</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">รหัสวิชา & ชื่อวิชา</th>
                    <th className="py-3.5 px-4">Section</th>
                    <th className="py-3.5 px-4">ผู้สอน</th>
                    <th className="py-3.5 px-4">ความจุสูงสุด (DB)</th>
                    <th className="py-3.5 px-4">เก้าอี้คงเหลือ (Redis RAM)</th>
                    <th className="py-3.5 px-4">คิวสำรอง (Redis)</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats?.sectionMetrics.map((sec) => {
                    const isFull = sec.remainingSeats <= 0;

                    return (
                      <tr key={sec.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-4 font-bold text-gray-900">
                          <span className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 text-gray-800 mr-2">
                            {sec.courseCode}
                          </span>
                          {sec.courseName}
                        </td>
                        <td className="py-4 px-4 font-semibold text-gray-600">Sec {sec.sectionCode}</td>
                        <td className="py-4 px-4 text-xs text-gray-500">
                          <div className="font-semibold text-gray-700">{sec.instructorName || 'อาจารย์ประจำ'}</div>
                          <div className="text-[11px] text-orange-600 font-medium mt-0.5">{sec.dayTime || 'จ. พ. 09:00 - 10:30 น.'}</div>
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-800">{sec.maxCapacity} ที่นั่ง</td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black ${
                              isFull ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isFull ? `เต็ม (เหลือ ${sec.remainingSeats})` : `เหลือ ${sec.remainingSeats} ที่นั่ง`}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
                            {sec.waitlistCount} คน
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReconcileSection(sec.id)}
                              disabled={reconcilingSectionId === sec.id}
                              className="py-2 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                              title="กระทบยอดข้อมูลระหว่าง PostgreSQL และ Redis"
                            >
                              {reconcilingSectionId === sec.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Reconcile Sync DB</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handlePreloadSeats(sec.id)}
                              disabled={preloadingSectionId === sec.id}
                              className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#b83a00] to-[#992d00] text-white font-bold text-xs hover:from-[#a03200] hover:to-[#802400] transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {preloadingSectionId === sec.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Pre-load Seats</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* REAL-TIME AUDIT LOGS STREAM TABLE */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">ประวัติเหตุการณ์คำขอ (Audit Logs Stream)</h3>
                <p className="text-xs text-gray-400">บันทึก Transaction Audit Events ทั้งหมด 25 รายการล่าสุด</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">เวลา (Timestamp)</th>
                    <th className="py-3 px-4">วิชา</th>
                    <th className="py-3 px-4">ประเภทเหตุการณ์ (Event)</th>
                    <th className="py-3 px-4">รายละเอียด (Details)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats?.auditLogs.map((log) => {
                    let badgeClass = 'bg-gray-100 text-gray-800';
                    let eventText = log.eventType;
                    const detail = log.detail || {};

                    if (log.eventType === 'confirmed') {
                      badgeClass = 'bg-emerald-100 text-emerald-800 font-extrabold';
                      eventText = '✅ CONFIRMED';
                    } else if (log.eventType === 'waitlisted') {
                      badgeClass = 'bg-amber-100 text-amber-800 font-extrabold';
                      eventText = '⏳ WAITLISTED';
                    } else if (log.eventType === 'promoted_from_waitlist') {
                      badgeClass = 'bg-blue-100 text-blue-800 font-extrabold';
                      eventText = '🎉 PROMOTED';
                    } else if (log.eventType === 'cancelled') {
                      badgeClass = 'bg-gray-100 text-gray-600';
                      eventText = '🗑️ CANCELLED';
                    } else if (log.eventType === 'rejected') {
                      badgeClass = 'bg-red-100 text-red-800 font-extrabold';
                      eventText = '❌ REJECTED';
                    }

                    // Format Audit Log Detail message
                    let formattedDetail: React.ReactNode = null;
                    if (log.eventType === 'confirmed') {
                      formattedDetail = (
                        <span className="text-emerald-800 font-semibold">
                          ลงทะเบียนสำเร็จ
                          {detail.remainingSeatsInRedis !== undefined && (
                            <span className="text-emerald-600 font-normal ml-1">
                              (เหลือใน Redis: {detail.remainingSeatsInRedis})
                            </span>
                          )}
                        </span>
                      );
                    } else if (log.eventType === 'waitlisted') {
                      formattedDetail = (
                        <span className="text-amber-800 font-semibold">
                          เข้าคิวสำรองสำเร็จ
                          {detail.waitlistPosition !== undefined && (
                            <span className="text-amber-700 font-bold ml-1">
                              (ลำดับที่ #{detail.waitlistPosition})
                            </span>
                          )}
                        </span>
                      );
                    } else if (log.eventType === 'rejected') {
                      formattedDetail = (
                        <span className="text-red-600 font-bold">
                          {detail.reason || 'ไม่ผ่านเงื่อนไขการลงทะเบียน'}
                        </span>
                      );
                    } else if (log.eventType === 'cancelled') {
                      formattedDetail = (
                        <span className="text-gray-500">
                          ยกเลิก/ถอนรายวิชา
                          {detail.previousStatus && (
                            <span className="text-gray-400 ml-1">
                              (สถานะเดิม: {detail.previousStatus})
                            </span>
                          )}
                        </span>
                      );
                    } else if (log.eventType === 'promoted_from_waitlist') {
                      formattedDetail = (
                        <span className="text-blue-700 font-bold">
                          เลื่อนจากคิวสำรองเข้าสู่ confirmed
                        </span>
                      );
                    } else if (log.eventType === 'queued') {
                      formattedDetail = (
                        <span className="text-gray-500">
                          รับคำขอเข้าคิวเรียบร้อย
                          {detail.requestId && (
                            <span className="text-[10px] text-gray-400 font-mono ml-1">
                              ({detail.requestId.slice(0, 8)}...)
                            </span>
                          )}
                        </span>
                      );
                    } else {
                      formattedDetail = <span className="font-mono text-xs">{JSON.stringify(detail)}</span>;
                    }

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-xs text-gray-400 font-mono">
                          {new Date(log.createdAt).toLocaleString('th-TH')}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {log.courseCode} (Sec {log.sectionCode})
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] ${badgeClass}`}>
                            {eventText}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {formattedDetail}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-4">สร้างรายวิชาใหม่ (New Course)</h3>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">รหัสวิชา (Course Code)</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น CS401"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full bg-gray-50 text-sm rounded-xl py-2.5 px-3.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อวิชา (Course Name)</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Cloud-Native Systems"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full bg-gray-50 text-sm rounded-xl py-2.5 px-3.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">จำนวนหน่วยกิต (Credits)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={6}
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  className="w-full bg-gray-50 text-sm rounded-xl py-2.5 px-3.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#b83a00] hover:bg-[#a03200] text-white font-bold text-xs transition-colors shadow-md shadow-orange-950/20"
                >
                  บันทึกรายวิชา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SECTION MODAL */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-4">เพิ่ม Section ใหม่</h3>

            <form onSubmit={handleCreateSection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">เลือกรายวิชา</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-gray-50 text-sm rounded-xl py-2.5 px-3.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                >
                  {stats?.allCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">กลุ่มเรียน (Section Code)</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 01, 02"
                  value={sectionCode}
                  onChange={(e) => setSectionCode(e.target.value)}
                  className="w-full bg-gray-50 text-sm rounded-xl py-2.5 px-3.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">อาจารย์ผู้สอน</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ดร. สมชาย"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  className="w-full bg-gray-50 text-sm rounded-xl py-2.5 px-3.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                />
              </div>

              {/* Day & Time Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">เลือกวันเรียน (Class Days)</label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                          isSelected
                            ? 'bg-[#b83a00] text-white border-[#b83a00] shadow-sm scale-105'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">เวลาเริ่มเรียน</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-gray-50 text-xs rounded-xl py-2 px-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">เวลาเลิกเรียน</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-gray-50 text-xs rounded-xl py-2 px-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                    />
                  </div>
                </div>

                <div className="mt-2 text-xs bg-orange-50/70 border border-orange-200/60 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span className="font-semibold text-gray-600 text-[11px]">ตารางเรียนที่จะบันทึก:</span>
                  <span className="font-black text-[#b83a00]">{dayTime}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ความจุสูงสุด (Max Capacity)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(Number(e.target.value))}
                  className="w-full bg-gray-50 text-sm rounded-xl py-2.5 px-3.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">เวลาเปิดลงทะเบียน</label>
                  <input
                    type="datetime-local"
                    required
                    value={regOpenAt}
                    onChange={(e) => setRegOpenAt(e.target.value)}
                    className="w-full bg-gray-50 text-xs rounded-xl py-2.5 px-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">เวลาปิดลงทะเบียน</label>
                  <input
                    type="datetime-local"
                    required
                    value={regCloseAt}
                    onChange={(e) => setRegCloseAt(e.target.value)}
                    className="w-full bg-gray-50 text-xs rounded-xl py-2.5 px-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b83a00]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#b83a00] hover:bg-[#a03200] text-white font-bold text-xs transition-colors shadow-md shadow-orange-950/20"
                >
                  สร้าง Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
