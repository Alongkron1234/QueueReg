import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createCourse(dto: CreateCourseDto) {
    const existingCourse = await this.prisma.course.findUnique({
      where: { courseCode: dto.courseCode },
    });

    if (existingCourse) {
      throw new ConflictException(`รหัสวิชา ${dto.courseCode} มีอยู่ในระบบแล้ว`);
    }

    return this.prisma.course.create({
      data: {
        courseCode: dto.courseCode,
        courseName: dto.courseName,
        credits: dto.credits,
      },
    });
  }

  async createSection(dto: CreateSectionDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException(`ไม่พบวิชาที่มี ID ${dto.courseId}`);
    }

    const existingSection = await this.prisma.section.findUnique({
      where: {
        courseId_sectionCode: {
          courseId: dto.courseId,
          sectionCode: dto.sectionCode,
        },
      },
    });

    if (existingSection) {
      throw new ConflictException(
        `Section ${dto.sectionCode} สำหรับวิชานี้มีอยู่ในระบบแล้ว`,
      );
    }

    const openAt = new Date(dto.registrationOpenAt);
    const closeAt = new Date(dto.registrationCloseAt);

    if (closeAt <= openAt) {
      throw new BadRequestException(
        'เวลาปิดลงทะเบียนต้องอยู่หลังเวลาเปิดลงทะเบียนเสมอ',
      );
    }

    const section = await this.prisma.section.create({
      data: {
        courseId: dto.courseId,
        sectionCode: dto.sectionCode,
        instructorName: dto.instructorName,
        dayTime: dto.dayTime || 'จ. พ. 09:00 - 10:30 น.',
        maxCapacity: dto.maxCapacity,
        registrationOpenAt: openAt,
        registrationCloseAt: closeAt,
      },
    });

    // Automatically Pre-load seat counter in Redis
    await this.redisService.set(`seat_count:${section.id}`, section.maxCapacity);

    return section;
  }

  async getAllCourses() {
    return this.prisma.course.findMany({
      include: {
        sections: {
          orderBy: { sectionCode: 'asc' },
        },
      },
      orderBy: { courseCode: 'asc' },
    });
  }

  async getCourseSections(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { sectionCode: 'asc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`ไม่พบวิชาที่มี ID ${courseId}`);
    }

    return course;
  }

  // Pre-load seats for a specific Section into Redis
  async preloadSectionSeats(sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException(`ไม่พบ Section ที่มี ID ${sectionId}`);
    }

    await this.redisService.set(`seat_count:${section.id}`, section.maxCapacity);

    return {
      message: 'Pre-load จำนวนที่นั่งลง Redis สำเร็จ',
      sectionId: section.id,
      maxCapacity: section.maxCapacity,
      redisKey: `seat_count:${section.id}`,
    };
  }

  // Fetch real-time remaining seats from Redis (with fallback to Postgres)
  async getSectionRemainingSeats(sectionId: string) {
    let seats = await this.redisService.get(`seat_count:${sectionId}`);

    if (seats === null) {
      // Auto-fallback & sync if Redis key is missing
      const section = await this.prisma.section.findUnique({
        where: { id: sectionId },
      });

      if (!section) {
        throw new NotFoundException(`ไม่พบ Section ที่มี ID ${sectionId}`);
      }

      await this.redisService.set(`seat_count:${section.id}`, section.maxCapacity);
      seats = section.maxCapacity.toString();
    }

    return {
      sectionId,
      remainingSeats: parseInt(seats, 10),
    };
  }

  // Get Admin Dashboard System Monitoring Statistics
  async getAdminStats() {
    const [
      totalStudents,
      totalCourses,
      totalSections,
      totalConfirmed,
      totalWaitlisted,
      allSections,
      allCoursesList,
      recentEvents,
    ] = await Promise.all([
      this.prisma.student.count({ where: { role: 'student' } }),
      this.prisma.course.count(),
      this.prisma.section.count(),
      this.prisma.enrollment.count({ where: { status: 'confirmed' } }),
      this.prisma.enrollment.count({ where: { status: 'waitlisted' } }),
      this.prisma.section.findMany({
        include: { course: true },
        orderBy: { sectionCode: 'asc' },
      }),
      this.prisma.course.findMany({
        orderBy: { courseCode: 'asc' },
      }),
      this.prisma.registrationEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    // Enrich sections with live Redis seats and waitlist count
    const sectionMetrics = await Promise.all(
      allSections.map(async (sec) => {
        const rawSeats = await this.redisService.get(`seat_count:${sec.id}`);
        const waitlistCount = await this.redisService.zcard(`waitlist:${sec.id}`);
        const remainingSeats =
          rawSeats !== null ? parseInt(rawSeats, 10) : sec.maxCapacity;

        return {
          id: sec.id,
          courseId: sec.courseId,
          courseCode: sec.course.courseCode,
          courseName: sec.course.courseName,
          credits: sec.course.credits,
          sectionCode: sec.sectionCode,
          instructorName: sec.instructorName,
          dayTime: sec.dayTime,
          registrationOpenAt: sec.registrationOpenAt,
          registrationCloseAt: sec.registrationCloseAt,
          maxCapacity: sec.maxCapacity,
          remainingSeats,
          waitlistCount,
        };
      }),
    );

    // Fetch section details for audit logs
    const sectionIds = Array.from(new Set(recentEvents.map((e) => e.sectionId)));
    const sectionsForLogs = await this.prisma.section.findMany({
      where: { id: { in: sectionIds } },
      include: { course: true },
    });
    const sectionMap = new Map(sectionsForLogs.map((s) => [s.id, s]));

    const auditLogs = recentEvents.map((ev) => {
      const sec = sectionMap.get(ev.sectionId);
      return {
        id: ev.id.toString(),
        studentId: ev.studentId,
        sectionId: ev.sectionId,
        eventType: ev.eventType,
        detail: ev.detail,
        createdAt: ev.createdAt,
        courseCode: sec?.course?.courseCode || 'UNKNOWN',
        courseName: sec?.course?.courseName || 'N/A',
        sectionCode: sec?.sectionCode || '01',
      };
    });

    return {
      summary: {
        totalStudents,
        totalCourses,
        totalSections,
        totalConfirmed,
        totalWaitlisted,
      },
      allCourses: allCoursesList,
      sectionMetrics,
      auditLogs,
    };
  }

  // Reconcile seats for a single section between Postgres DB (Source of Truth) and Redis RAM
  async reconcileSectionSeats(sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException(`ไม่พบ Section ที่มี ID ${sectionId}`);
    }

    // 1. Query exact confirmed count from Postgres DB (Source of Truth)
    const confirmedCount = await this.prisma.enrollment.count({
      where: {
        sectionId,
        status: 'confirmed',
      },
    });

    // 2. Compute exact remaining seats
    const calculatedRemainingSeats = Math.max(0, section.maxCapacity - confirmedCount);

    // 3. Fetch previous Redis seat count for audit comparison
    const rawPrevious = await this.redisService.get(`seat_count:${sectionId}`);
    const previousRedisSeats = rawPrevious !== null ? parseInt(rawPrevious, 10) : null;

    // 4. Overwrite Redis key with exact calculated remaining seats
    await this.redisService.set(`seat_count:${sectionId}`, calculatedRemainingSeats);

    // 5. Broadcast real-time WebSocket update to clients
    this.eventsGateway.sendToSection(sectionId, 'seat_count_updated', {
      sectionId,
      remainingSeats: calculatedRemainingSeats,
    });
    this.eventsGateway.broadcast('seat_count_updated', {
      sectionId,
      remainingSeats: calculatedRemainingSeats,
    });

    return {
      message: 'กระทบยอดข้อมูล (Reconciliation) สำเร็จ',
      sectionId: section.id,
      sectionCode: section.sectionCode,
      maxCapacity: section.maxCapacity,
      confirmedCount,
      previousRedisSeats,
      newRedisSeats: calculatedRemainingSeats,
    };
  }

  // Reconcile all sections in batch
  async reconcileAllSections() {
    const allSections = await this.prisma.section.findMany({
      include: { course: true },
    });

    const results = await Promise.all(
      allSections.map((sec) => this.reconcileSectionSeats(sec.id)),
    );

    return {
      message: `กระทบยอดข้อมูลทั้งหมด ${results.length} Sections เรียบร้อยแล้ว`,
      totalSections: results.length,
      details: results,
    };
  }
}
