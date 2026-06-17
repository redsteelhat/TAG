import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsTimeZone } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Ali Yilmaz' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Europe/Istanbul' })
  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}
