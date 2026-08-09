import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  studentCode: string;
  yearLevel: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'supersecret_jwt_key_coursereg_2026'),
    });
  }

  async validate(payload: JwtPayload) {
    const student = await this.prisma.student.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        email: true,
        yearLevel: true,
        role: true,
      },
    });

    if (!student) {
      throw new UnauthorizedException('ผู้ใช้นี้ไม่มีอยู่ในระบบหรือ Token ไม่ถูกต้อง');
    }

    return student;
  }
}
