import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller()
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ---------------- ADMIN ENDPOINTS ----------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/courses')
  async createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/sections')
  async createSection(@Body() dto: CreateSectionDto) {
    return this.coursesService.createSection(dto);
  }

  // ---------------- STUDENT / PUBLIC ENDPOINTS ----------------
  @UseGuards(JwtAuthGuard)
  @Get('courses')
  async getAllCourses() {
    return this.coursesService.getAllCourses();
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:id/sections')
  async getCourseSections(@Param('id') id: string) {
    return this.coursesService.getCourseSections(id);
  }
}
