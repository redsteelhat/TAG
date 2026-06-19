import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepreciationModel } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export class UpdateDepreciationSettingsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  depreciationEnabled!: boolean;

  @ApiPropertyOptional({ enum: DepreciationModel })
  @IsOptional()
  @IsEnum(DepreciationModel)
  depreciationModel?: DepreciationModel;

  @ApiPropertyOptional({ example: '60000.00' })
  @IsOptional()
  @IsDecimalString()
  annualDepreciationAmount?: string;

  @ApiPropertyOptional({ example: '30000.00' })
  @IsOptional()
  @IsDecimalString()
  annualEstimatedKm?: string;
}
