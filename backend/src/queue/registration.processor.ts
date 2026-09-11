import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EventsGateway } from '../events/events.gateway';
import { RegistrationJobData } from './queue.producer.service';

@Processor('registration_queue')
export class RegistrationProcessor extends WorkerHost {
  private readonly logger = new Logger(RegistrationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<RegistrationJobData>): Promise<any> {
    const { requestId, studentId, sectionId, timestamp } = job.data;

    this.logger.log(
      `⚙️ Processing Job [${job.id}] | StudentId: ${studentId} | SectionId: ${sectionId}`,
    );

    // 1. Check duplicate registration (only block if already active confirmed or waitlisted)
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_sectionId: {
          studentId,
          sectionId,
        },
      },
    });

    if (existingEnrollment && existingEnrollment.status !== 'cancelled') {
      this.logger.warn(
        `⚠️ Duplicate active registration attempt by student: ${studentId} for section: ${sectionId}`,
      );

      await this.prisma.registrationEvent.create({
        data: {
          studentId,
          sectionId,
          eventType: 'rejected',
          detail: {
            requestId,
            reason: 'นักศึกษาเคยยื่นลงทะเบียนวิชานี้ไปแล้ว',
            rejectedAt: new Date().toISOString(),
          },
        },
      });

      // Emit WebSocket Event to Student Room
      this.eventsGateway.sendToStudent(studentId, 'registration_result', {
        status: 'rejected',
        requestId,
        sectionId,
        reason: 'นักศึกษาเคยยื่นลงทะเบียนวิชานี้ไปแล้ว',
      });

      return { status: 'rejected', reason: 'Duplicate registration' };
    }

    // 2. Atomic Decrement in Redis
    const remainingSeats = await this.redisService.decr(`seat_count:${sectionId}`);

    // 3. Case A: Seats available (remainingSeats >= 0)
    if (remainingSeats >= 0) {
      // Upsert confirmed enrollment in PostgreSQL (supports re-registration after cancel)
      const enrollment = await this.prisma.enrollment.upsert({
        where: {
          studentId_sectionId: { studentId, sectionId },
        },
        create: {
          studentId,
          sectionId,
          status: 'confirmed',
        },
        update: {
          status: 'confirmed',
          waitlistPosition: null,
        },
      });

      // Log audit event as confirmed
      await this.prisma.registrationEvent.create({
        data: {
          studentId,
          sectionId,
          eventType: 'confirmed',
          detail: {
            requestId,
            enrollmentId: enrollment.id,
            remainingSeatsInRedis: remainingSeats,
            confirmedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(
        `✅ Registration Confirmed | StudentId: ${studentId} | SectionId: ${sectionId} | RemainingSeats: ${remainingSeats}`,
      );

      // Emit WebSocket Event to Student Room (Personal Result)
      this.eventsGateway.sendToStudent(studentId, 'registration_result', {
        status: 'confirmed',
        requestId,
        sectionId,
        enrollmentId: enrollment.id,
        confirmedAt: new Date().toISOString(),
      });

      // Emit WebSocket Event to Section Room (Live Seat Count Update)
      this.eventsGateway.sendToSection(sectionId, 'seat_count_updated', {
        sectionId,
        remainingSeats,
      });

      return {
        status: 'confirmed',
        requestId,
        studentId,
        sectionId,
        enrollmentId: enrollment.id,
      };
    }

    // 4. Case B: Section full (remainingSeats < 0)
    // Restore Redis counter
    await this.redisService.incr(`seat_count:${sectionId}`);

    // Add student to Redis Sorted Set Waitlist
    const score = new Date(timestamp).getTime();
    await this.redisService.zadd(`waitlist:${sectionId}`, score, studentId);

    // Get current waitlist position
    const waitlistPosition = await this.redisService.zcard(`waitlist:${sectionId}`);

    // Upsert waitlisted enrollment in PostgreSQL
    const enrollment = await this.prisma.enrollment.upsert({
      where: {
        studentId_sectionId: { studentId, sectionId },
      },
      create: {
        studentId,
        sectionId,
        status: 'waitlisted',
        waitlistPosition,
      },
      update: {
        status: 'waitlisted',
        waitlistPosition,
      },
    });

    // Log audit event as waitlisted
    await this.prisma.registrationEvent.create({
      data: {
        studentId,
        sectionId,
        eventType: 'waitlisted',
        detail: {
          requestId,
          enrollmentId: enrollment.id,
          waitlistPosition,
          waitlistedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `⏳ Student Waitlisted | StudentId: ${studentId} | SectionId: ${sectionId} | WaitlistPosition: ${waitlistPosition}`,
    );

    // Emit WebSocket Event to Student Room (Personal Waitlist Result)
    this.eventsGateway.sendToStudent(studentId, 'registration_result', {
      status: 'waitlisted',
      requestId,
      sectionId,
      enrollmentId: enrollment.id,
      waitlistPosition,
      waitlistedAt: new Date().toISOString(),
    });

    return {
      status: 'waitlisted',
      requestId,
      studentId,
      sectionId,
      waitlistPosition,
    };
  }
}
