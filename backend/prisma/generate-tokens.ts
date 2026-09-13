import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://coursereg:coursereg_password@localhost:5432/coursereg_db?schema=public';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_coursereg_2026';
const TOTAL_STUDENTS = 10000;

async function main() {
  console.log(`🚀 Starting Test Data Generator for ${TOTAL_STUDENTS} students...`);

  // 1. Batch create students in PostgreSQL if missing
  const studentData: Array<{
    studentCode: string;
    fullName: string;
    email: string;
    passwordHash: string;
    yearLevel: number;
    role: string;
  }> = [];
  for (let i = 1; i <= TOTAL_STUDENTS; i++) {
    const code = `663000${String(i).padStart(4, '0')}`;
    studentData.push({
      studentCode: code,
      fullName: `Test Student ${i}`,
      email: `teststudent${i}@unireg.ac.th`,
      passwordHash: '$2b$10$wT0XkO0P/E7X89zQnJ29dO9mXvC3tJ1Z4yW5K6L7M8N9O0P1Q2R3S', // hashed 'password123'
      yearLevel: (i % 4) + 1,
      role: 'student',
    });
  }

  console.log('📦 Batch inserting 10,000 students into PostgreSQL DB...');
  await prisma.student.createMany({
    data: studentData,
    skipDuplicates: true,
  });

  // 2. Fetch all students to get real UUIDs
  console.log('🔍 Fetching student UUIDs from database...');
  const students = await prisma.student.findMany({
    where: { role: 'student' },
    select: { id: true, studentCode: true, email: true, yearLevel: true, role: true },
    take: TOTAL_STUDENTS,
  });

  console.log(`🔑 Generating JWT Tokens for ${students.length} students...`);
  const tokenList = students.map((s) => {
    const payload = {
      sub: s.id,
      id: s.id,
      studentCode: s.studentCode,
      email: s.email,
      yearLevel: s.yearLevel,
      role: s.role,
    };
    return {
      studentId: s.id,
      token: jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }),
    };
  });

  // 3. Save to k6 data file
  const outputDir = path.join(__dirname, '../../k6/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'tokens.json');
  fs.writeFileSync(outputPath, JSON.stringify(tokenList, null, 2));

  console.log(`✅ Successfully generated ${tokenList.length} JWT tokens! Saved to: ${outputPath}`);
}

main()
  .catch((e) => {
    console.error('❌ Error generating test tokens:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
