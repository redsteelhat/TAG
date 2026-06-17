import { IsOptional, IsString, IsTimeZone } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}

