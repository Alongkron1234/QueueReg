import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.client = new Redis({
      host,
      port,
      maxRetriesPerRequest: null, // สำคัญมากสำหรับรองรับ BullMQ ใน Step 7-8
    });

    this.client.on('connect', () => {
      this.logger.log(`🚀 Redis Client connected successfully to ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.logger.error(`❌ Redis Client Error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string | number, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.client.set(key, value.toString(), 'EX', ttlSeconds);
    }
    return this.client.set(key, value.toString());
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }
}
