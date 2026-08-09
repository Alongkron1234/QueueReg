import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) { }

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

    return this.prisma.section.create({
      data: {
        courseId: dto.courseId,
        sectionCode: dto.sectionCode,
        instructorName: dto.instructorName,
        maxCapacity: dto.maxCapacity,
        registrationOpenAt: openAt,
        registrationCloseAt: closeAt,
      },
    });
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
}
