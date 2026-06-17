import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttachmentType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min
} from 'class-validator';

export class CreateAttachmentDto {
  @ApiProperty({ enum: AttachmentType, example: AttachmentType.RECEIPT })
  @IsEnum(AttachmentType)
  type!: AttachmentType;

  @ApiProperty({ example: 'https://storage.example/internal/file.jpg' })
  @IsUrl({ require_tld: false })
  fileUrl!: string;

  @ApiProperty({ example: 'users/user_1/receipts/file.jpg' })
  @IsString()
  storageKey!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 242300, minimum: 1, maximum: 10485760 })
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  fileSizeBytes!: number;

  @ApiPropertyOptional({ example: 'receipt.jpg' })
  @IsOptional()
  @IsString()
  originalName?: string;

  @ApiPropertyOptional({ example: 'trp_123' })
  @IsOptional()
  @IsString()
  tripId?: string;

  @ApiPropertyOptional({ example: 'exp_123' })
  @IsOptional()
  @IsString()
  expenseEntryId?: string;

  @ApiPropertyOptional({ example: 'fuel_123' })
  @IsOptional()
  @IsString()
  fuelEntryId?: string;

  @ApiPropertyOptional({ example: 'mnt_123' })
  @IsOptional()
  @IsString()
  maintenanceEntryId?: string;
}
