const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function runTest() {
  console.log('====================================================');
  console.log('🚀 เริ่มต้นทดสอบ Step 10: WebSocket Real-time System');
  console.log('====================================================\n');

  // STEP 1: Login
  console.log('📍 [Step 1] กำลังยิง Login เพื่อขอ JWT Token...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'somsak@student.ac.th',
      password: 'password123',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error('❌ Login ไม่สำเร็จ:', loginData);
    return;
  }

  const token = loginData.accessToken;
  const studentId = loginData.user.id;
  console.log(`✅ [Step 1 สำเร็จ] Student ID: ${studentId}`);
  console.log(`🔑 Token: ${token.substring(0, 30)}...\n`);

  // STEP 2: Fetch Courses to get Section ID
  console.log('📍 [Step 2] กำลังดึงรายชื่อวิชาเรียน...');
  const coursesRes = await fetch(`${BASE_URL}/courses`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const coursesData = await coursesRes.json();
  if (!coursesData.length || !coursesData[0].sections.length) {
    console.error('❌ ไม่พบวิชาเรียนหรือ Section ในระบบ');
    return;
  }

  const section = coursesData[0].sections[0];
  const sectionId = section.id;
  console.log(`✅ [Step 2 สำเร็จ] เลือกวิชา: ${coursesData[0].courseCode} (${coursesData[0].courseName}) | Section: ${section.sectionCode} (ID: ${sectionId})\n`);

  // STEP 3: Connect WebSocket & Join Rooms
  console.log('📍 [Step 3] กำลังเปิดท่อเชื่อมต่อ WebSocket...');
  const socket = io(WS_URL);

  socket.on('connect', () => {
    console.log(`🔌 [WebSocket] เชื่อมต่อสำเร็จ! Socket ID: ${socket.id}`);

    // Join Personal Student Room
    socket.emit('join_student', { studentId });
    console.log(`👤 [WebSocket] ส่งสัญญาณเข้าห้องส่วนตัว: student_${studentId}`);

    // Join Section Room
    socket.emit('join_section', { sectionId });
    console.log(`📚 [WebSocket] ส่งสัญญาณเข้าห้องดูวิชา: section_${sectionId}\n`);

    // Listen for Personal Registration Results
    socket.on('registration_result', (data) => {
      console.log('----------------------------------------------------');
      console.log('⚡ 🎉 [RECEIVED WEBSOCKET EVENT] registration_result');
      console.log('----------------------------------------------------');
      console.log(JSON.stringify(data, null, 2));
      console.log('----------------------------------------------------\n');

      setTimeout(() => {
        console.log('✨ การทดสอบ Step 10 สมบูรณ์เรียบร้อย!');
        socket.disconnect();
        process.exit(0);
      }, 1000);
    });

    // Listen for Live Seat Updates
    socket.on('seat_count_updated', (data) => {
      console.log('📡 📊 [RECEIVED WEBSOCKET EVENT] seat_count_updated');
      console.log(JSON.stringify(data, null, 2));
    });

    // STEP 4: Submit Registration Request
    setTimeout(async () => {
      console.log('📍 [Step 4] กำลังยิงคำขอลงทะเบียนเข้าคิว (POST /api/registrations)...');
      const startRegTime = Date.now();

      const regRes = await fetch(`${BASE_URL}/registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sectionId }),
      });

      const regData = await regRes.json();
      const elapsed = Date.now() - startRegTime;

      if (!regRes.ok) {
        console.error(`❌ [Step 4 ไม่ผ่าน - HTTP ${regRes.status}] ${regData.message || JSON.stringify(regData)}`);
        console.log('💡 แนะนำ: สั่งรันคำสั่ง `npx prisma db seed` ใน backend เพื่อล้างข้อมูลการลงทะเบียนเก่าออกก่อน');
        socket.disconnect();
        process.exit(1);
      }

      console.log(`⚡ [Step 4 สำเร็จ - 202 Accepted] ตอบกลับใน ${elapsed}ms!`);
      console.log(`🎫 Request ID: ${regData.requestId}`);
      console.log('⏳ กำลังรอฟังผลลัพธ์ย้อนกลับทาง WebSocket...\n');
    }, 1000);
  });
}

runTest();
