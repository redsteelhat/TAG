import { PartialType } from '@nestjs/swagger';
import { CreateTagPackageDto } from './create-tag-package.dto';

export class UpdateTagPackageDto extends PartialType(CreateTagPackageDto) {}
