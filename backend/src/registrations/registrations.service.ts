import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EventsGateway } from '../events/events.gateway';
import { QueueProducerService } from '../queue/queue.producer.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { CancelRegistrationDto } from './dto/cancel-registration.dto';
import * as crypto from 'crypto';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
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

  // Polling Fallback API: Fetch registration status by requestId
  async getRegistrationStatus(user: any, requestId: string) {
    const event = await this.prisma.registrationEvent.findFirst({
      where: {
        studentId: user.id,
        detail: {
          path: ['requestId'],
          equals: requestId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!event) {
      throw new NotFoundException(`ไม่พบคำขอที่มี Request ID ${requestId}`);
    }

    return {
      requestId,
      studentId: user.id,
      sectionId: event.sectionId,
      status: event.eventType,
      detail: event.detail,
      updatedAt: event.createdAt,
    };
  }

  // Cancel Registration and Trigger Auto Re-allocation
  async cancelRegistration(user: any, dto: CancelRegistrationDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_sectionId: {
          studentId: user.id,
          sectionId: dto.sectionId,
        },
      },
    });

    if (!enrollment || enrollment.status === 'cancelled') {
      throw new NotFoundException('ไม่พบข้อมูลการลงทะเบียนวิชานี้ หรือถูกยกเลิกไปแล้ว');
    }

    const wasConfirmed = enrollment.status === 'confirmed';

    // 1. Update status to cancelled in PostgreSQL
    await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'cancelled',
        waitlistPosition: null,
      },
    });

    // 2. Log audit event as cancelled
    await this.prisma.registrationEvent.create({
      data: {
        studentId: user.id,
        sectionId: dto.sectionId,
        eventType: 'cancelled',
        detail: {
          enrollmentId: enrollment.id,
          previousStatus: enrollment.status,
          cancelledAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `🗑️ Registration Cancelled | StudentId: ${user.id} | SectionId: ${dto.sectionId}`,
    );

    // 3. Trigger Auto Re-allocation if previously confirmed seat was cancelled
    if (wasConfirmed) {
      return this.processWaitlistPromotion(dto.sectionId);
    }

    return {
      statusCode: 200,
      message: 'ยกเลิกการลงทะเบียนวิชานี้เรียบร้อยแล้ว',
      sectionId: dto.sectionId,
    };
  }

  // Auto Re-allocation Helper: Promote first waitlisted student or restore seat count in Redis
  private async processWaitlistPromotion(sectionId: string) {
    const waitlistCount = await this.redisService.zcard(`waitlist:${sectionId}`);

    if (waitlistCount > 0) {
      // Pop first student from Redis Sorted Set Waitlist
      const popped = await this.redisService.getClient().zpopmin(`waitlist:${sectionId}`, 1);

      if (popped && popped.length >= 2) {
        const promotedStudentId = popped[0];

        // Update enrollment in PostgreSQL from waitlisted -> confirmed
        const enrollment = await this.prisma.enrollment.update({
          where: {
            studentId_sectionId: {
              studentId: promotedStudentId,
              sectionId,
            },
          },
          data: {
            status: 'confirmed',
            waitlistPosition: null,
          },
        });

        // Log audit event as promoted_from_waitlist
        await this.prisma.registrationEvent.create({
          data: {
            studentId: promotedStudentId,
            sectionId,
            eventType: 'promoted_from_waitlist',
            detail: {
              enrollmentId: enrollment.id,
              promotedAt: new Date().toISOString(),
            },
          },
        });

        this.logger.log(
          `🎉 Student [${promotedStudentId}] promoted from Waitlist to Confirmed for Section [${sectionId}]`,
        );

        // Emit WebSocket Event to Promoted Student (Personal Notification)
        this.eventsGateway.sendToStudent(promotedStudentId, 'registration_result', {
          status: 'confirmed',
          promotedFromWaitlist: true,
          sectionId,
          enrollmentId: enrollment.id,
          confirmedAt: new Date().toISOString(),
        });

        return {
          statusCode: 200,
          message: 'ยกเลิกสำเร็จ และระบบได้ดึงนักศึกษาในคิวสำรองอันดับ 1 ขึ้นมาได้ที่นั่งแทนที่เรียบร้อยแล้ว',
          sectionId,
          promotedStudentId,
        };
      }
    }

    // If no waitlisted student, restore seat count in Redis
    const newRemainingSeats = await this.redisService.incr(`seat_count:${sectionId}`);

    // Emit WebSocket Event to Section Room (Live Seat Count Update)
    this.eventsGateway.sendToSection(sectionId, 'seat_count_updated', {
      sectionId,
      remainingSeats: newRemainingSeats,
    });

    return {
      statusCode: 200,
      message: 'ยกเลิกสำเร็จ คืนที่นั่งเข้าพูลเรียบร้อยแล้ว',
      sectionId,
      remainingSeats: newRemainingSeats,
    };
  }
}
