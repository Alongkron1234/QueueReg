import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกรหัสวิชา' })
  courseCode: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกชื่อวิชา' })
  courseName: string;

  @IsInt()
  @Min(1, { message: 'หน่วยกิตอย่างน้อย 1 หน่วยกิต' })
  @Max(6, { message: 'หน่วยกิตไม่เกิน 6 หน่วยกิต' })
  credits: number;
}
