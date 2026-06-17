import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'surucu@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+905551112233' })
  @IsOptional()
  @IsPhoneNumber('TR')
  phone?: string;

  @ApiProperty({ minLength: 8, example: 'StrongPass123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 'Ali Yilmaz' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
