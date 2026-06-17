import { BadRequestException } from '@nestjs/common';

export interface DateRangeInput {
  endDate?: string;
  startDate?: string;
}

export function buildDateRangeFilter(input: DateRangeInput) {
  if (!input.startDate && !input.endDate) {
    return undefined;
  }

  const startDate = input.startDate ? toDate(input.startDate) : undefined;
  const endDate = input.endDate ? toEndDate(input.endDate) : undefined;

  if (startDate && endDate && startDate > endDate) {
    throw new BadRequestException('startDate must be before endDate.');
  }

  return {
    gte: startDate,
    lte: endDate
  };
}

export function toDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date value.');
  }

  return date;
}

function toEndDate(value: string) {
  const date = toDate(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCDate(date.getUTCDate() + 1);
    date.setUTCMilliseconds(date.getUTCMilliseconds() - 1);
  }

  return date;
}
