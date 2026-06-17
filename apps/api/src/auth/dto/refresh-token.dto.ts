import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ minLength: 20, example: 'refresh-token-value' })
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
