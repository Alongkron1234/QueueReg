import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { CancelRegistrationDto } from './dto/cancel-registration.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimiterGuard } from '../common/guards/rate-limiter.guard';

@Controller('registrations')
export class RegistrationsController {
  constructor(
    private readonly registrationsService: RegistrationsService,
  ) {}

  @UseGuards(JwtAuthGuard, RateLimiterGuard)
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async submitRegistration(
    @Request() req: any,
    @Body() dto: CreateRegistrationDto,
  ) {
    return this.registrationsService.submitRegistration(req.user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-enrollments')
  async getMyEnrollments(@Request() req: any) {
    return this.registrationsService.getMyEnrollments(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('active-queue')
  async getActiveQueue(@Request() req: any) {
    return this.registrationsService.getActiveQueue(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':requestId/status')
  async getRegistrationStatus(
    @Request() req: any,
    @Param('requestId') requestId: string,
  ) {
    return this.registrationsService.getRegistrationStatus(req.user, requestId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancelRegistration(
    @Request() req: any,
    @Body() dto: CancelRegistrationDto,
  ) {
    return this.registrationsService.cancelRegistration(req.user, dto);
  }
}
