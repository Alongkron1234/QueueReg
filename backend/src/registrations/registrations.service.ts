import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueProducerService } from '../queue/queue.producer.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import * as crypto from 'crypto';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueProducer: QueueProducerService,
  ) {}

  async submitRegistration(user: any, dto: CreateRegistrationDto) {
    const section = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
      include: { course: true },
    });

    if (!section) {
      throw new NotFoundException(`ไม่พบ Section ที่มี ID ${dto.sectionId}`);
    }

    const now = new Date();
    if (now < section.registrationOpenAt || now > section.registrationCloseAt) {
      throw new BadRequestException('ขณะนี้อยู่นอกช่วงเวลาเปิดลงทะเบียนของวิชานี้');
    }

    const requestId = crypto.randomUUID();

    // 1. Push job into BullMQ Admission Queue
    await this.queueProducer.addRegistrationJob({
      requestId,
      studentId: user.id,
      sectionId: dto.sectionId,
      yearLevel: user.yearLevel,
      timestamp: now.toISOString(),
    });

    // 2. Log audit event as queued
    await this.prisma.registrationEvent.create({
      data: {
        studentId: user.id,
        sectionId: dto.sectionId,
        eventType: 'queued',
        detail: {
          requestId,
          courseCode: section.course.courseCode,
          sectionCode: section.sectionCode,
          queuedAt: now.toISOString(),
        },
      },
    });

    return {
      statusCode: 202,
      message: 'คำขอลงทะเบียนเข้าสู่คิวเรียบร้อยแล้ว',
      requestId,
      status: 'queued',
      sectionId: dto.sectionId,
    };
  }
}
