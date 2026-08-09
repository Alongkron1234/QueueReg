import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const student = await this.prisma.student.findUnique({
      where: { email },
    });

    if (!student) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const isPasswordValid = await bcrypt.compare(password, student.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const payload = {
      sub: student.id,
      email: student.email,
      role: student.role,
      studentCode: student.studentCode,
      yearLevel: student.yearLevel,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        email: student.email,
        yearLevel: student.yearLevel,
        role: student.role,
      },
    };
  }

  async getProfile(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        email: true,
        yearLevel: true,
        role: true,
        createdAt: true,
      },
    });

    if (!student) {
      throw new UnauthorizedException('ไม่พบข้อมูลผู้ใช้');
    }

    return student;
  }
}
