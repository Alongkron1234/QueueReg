import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateRegistrationDto {
  @IsUUID('4', { message: 'sectionId ต้องเป็น UUID ที่ถูกต้อง' })
  @IsNotEmpty({ message: 'กรุณาระบุ sectionId' })
  sectionId: string;
}
