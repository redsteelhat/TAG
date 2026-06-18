import { PartialType } from '@nestjs/swagger';
import { CreateFuelEntryDto } from './create-fuel-entry.dto';

export class UpdateFuelEntryDto extends PartialType(CreateFuelEntryDto) {}
