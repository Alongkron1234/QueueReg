import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
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
}
