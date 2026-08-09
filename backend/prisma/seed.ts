import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://coursereg:coursereg_password@localhost:5432/coursereg_db?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.registrationEvent.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.section.deleteMany();
  await prisma.course.deleteMany();
  await prisma.student.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Admin
  await prisma.student.create({
    data: {
      studentCode: 'ADMIN001',
      fullName: 'System Administrator',
      email: 'admin@coursereg.ac.th',
      passwordHash: defaultPasswordHash,
      yearLevel: 4,
      role: 'admin',
    },
  });

  // 2. Seed Students (Years 1 to 4)
  await prisma.student.create({
    data: {
      studentCode: '64010001',
      fullName: 'Somsak Senior',
      email: 'somsak@student.ac.th',
      passwordHash: defaultPasswordHash,
      yearLevel: 4,
      role: 'student',
    },
  });

  await prisma.student.create({
    data: {
      studentCode: '65010002',
      fullName: 'Manee Junior',
      email: 'manee@student.ac.th',
      passwordHash: defaultPasswordHash,
      yearLevel: 3,
      role: 'student',
    },
  });

  await prisma.student.create({
    data: {
      studentCode: '66010003',
      fullName: 'Piti Sophomore',
      email: 'piti@student.ac.th',
      passwordHash: defaultPasswordHash,
      yearLevel: 2,
      role: 'student',
    },
  });

  await prisma.student.create({
    data: {
      studentCode: '67010004',
      fullName: 'Chujai Freshman',
      email: 'chujai@student.ac.th',
      passwordHash: defaultPasswordHash,
      yearLevel: 1,
      role: 'student',
    },
  });

  console.log('✅ Created 1 Admin and 4 Students');

  // 3. Seed Courses
  const cs101 = await prisma.course.create({
    data: {
      courseCode: 'CS101',
      courseName: 'Computer Programming I',
      credits: 3,
    },
  });

  const cs201 = await prisma.course.create({
    data: {
      courseCode: 'CS201',
      courseName: 'Data Structures and Algorithms',
      credits: 3,
    },
  });

  const cs301 = await prisma.course.create({
    data: {
      courseCode: 'CS301',
      courseName: 'High-Concurrency Distributed Systems',
      credits: 3,
    },
  });

  console.log('✅ Created 3 Courses');

  // 4. Seed Sections
  const now = new Date();
  const registrationOpenAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const registrationCloseAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  await prisma.section.create({
    data: {
      courseId: cs101.id,
      sectionCode: '01',
      instructorName: 'Dr. Somchai Jaidee',
      maxCapacity: 5,
      registrationOpenAt,
      registrationCloseAt,
    },
  });

  await prisma.section.create({
    data: {
      courseId: cs201.id,
      sectionCode: '01',
      instructorName: 'Dr. Jane Doe',
      maxCapacity: 3,
      registrationOpenAt,
      registrationCloseAt,
    },
  });

  await prisma.section.create({
    data: {
      courseId: cs301.id,
      sectionCode: '01',
      instructorName: 'Prof. Alan Turing',
      maxCapacity: 2,
      registrationOpenAt,
      registrationCloseAt,
    },
  });

  console.log('✅ Created 3 Sections');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
