import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Equals } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ example: 'DELETE_MY_ACCOUNT' })
  @IsString()
  @Equals('DELETE_MY_ACCOUNT')
  confirmation!: string;

  @ApiPropertyOptional({ example: 'Artik kullanmiyorum.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
