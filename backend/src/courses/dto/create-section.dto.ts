import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSectionDto {
  @IsUUID('4', { message: 'courseId ต้องเป็น UUID ที่ถูกต้อง' })
  @IsNotEmpty({ message: 'กรุณาระบุ courseId' })
  courseId: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกรหัส Section' })
  sectionCode: string;

  @IsString()
  @IsOptional()
  instructorName?: string;

  @IsInt()
  @Min(1, { message: 'จำนวนที่นั่งต้องอย่างน้อย 1 ที่นั่ง' })
  maxCapacity: number;

  @IsDateString({}, { message: 'registrationOpenAt ต้องเป็นวันที่รูปแบบ ISO' })
  @IsNotEmpty({ message: 'กรุณาระบุเวลาเปิดลงทะเบียน' })
  registrationOpenAt: string;

  @IsDateString({}, { message: 'registrationCloseAt ต้องเป็นวันที่รูปแบบ ISO' })
  @IsNotEmpty({ message: 'กรุณาระบุเวลาปิดลงทะเบียน' })
  registrationCloseAt: string;
}
