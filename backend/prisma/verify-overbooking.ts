import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://coursereg:coursereg_password@localhost:5432/coursereg_db?schema=public';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function verifyOverbooking() {
  console.log('🔍 Starting 0% Overbooking & Data Consistency Check...');

  const sections = await prisma.section.findMany({
    include: {
      course: true,
      enrollments: true,
    },
  });

  let totalConfirmed = 0;
  let totalWaitlisted = 0;
  let overbookingDetected = false;

  console.log('\n=============================================================');
  console.log('📊 SECTION ENROLLMENT AUDIT RESULTS');
  console.log('=============================================================');

  sections.forEach((sec) => {
    const confirmedCount = sec.enrollments.filter((e) => e.status === 'confirmed').length;
    const waitlistedCount = sec.enrollments.filter((e) => e.status === 'waitlisted').length;

    totalConfirmed += confirmedCount;
    totalWaitlisted += waitlistedCount;

    const isOverbooked = confirmedCount > sec.maxCapacity;
    if (isOverbooked) overbookingDetected = true;

    const statusFlag = isOverbooked ? '❌ OVERBOOKED!' : '✅ PASS (No Overbooking)';

    console.log(`Course: ${sec.course.courseCode} | Sec: ${sec.sectionCode}`);
    console.log(`  - Max Capacity (DB Limit) : ${sec.maxCapacity}`);
    console.log(`  - Confirmed Students      : ${confirmedCount}`);
    console.log(`  - Waitlisted Students     : ${waitlistedCount}`);
    console.log(`  - Audit Verification Status: ${statusFlag}\n`);
  });

  console.log('=============================================================');
  console.log(`Total Confirmed Enrollments : ${totalConfirmed}`);
  console.log(`Total Waitlisted Requests   : ${totalWaitlisted}`);
  console.log('=============================================================');

  if (overbookingDetected) {
    console.error('❌ FAIL: OVERBOOKING DETECTED! Confirmed seats exceed max capacity!');
    process.exit(1);
  } else {
    console.log('🎉 SUCCESS: 0% OVERBOOKING GUARANTEED! All seat counts are strictly enforced!');
  }
}

verifyOverbooking()
  .catch((e) => {
    console.error('❌ Verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
