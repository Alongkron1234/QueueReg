import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
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
}
