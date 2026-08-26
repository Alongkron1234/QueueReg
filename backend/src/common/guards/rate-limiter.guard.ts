import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly logger = new Logger(RateLimiterGuard.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      return true;
    }

    const key = `rate_limit:${user.id}`;
    const currentWindowCount = await this.redisService.incr(key);

    // Set 1 second TTL on first request in current window
    if (currentWindowCount === 1) {
      await this.redisService.set(key, 1, 1);
    }

    // Limit to 1 request per second per student
    if (currentWindowCount > 1) {
      this.logger.warn(`🚫 Rate limit exceeded for student: ${user.id} (${user.studentCode})`);

      const sectionId = request.body?.sectionId || 'unknown';

      // Log audit event as rate_limited
      await this.prisma.registrationEvent.create({
        data: {
          studentId: user.id,
          sectionId,
          eventType: 'rate_limited',
          detail: {
            reason: 'ส่งคำขอถี่เกิน 1 ครั้งต่อวินาที',
            requestedAt: new Date().toISOString(),
          },
        },
      });

      throw new HttpException(
        'คุณส่งคำขอลงทะเบียนถี่เกินไป กรุณารอ 1 วินาทีแล้วลองใหม่อีกครั้ง',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
