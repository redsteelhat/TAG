import {
  Matches,
  ValidationArguments,
  ValidationOptions
} from 'class-validator';

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

export function IsDecimalString(validationOptions?: ValidationOptions) {
  return Matches(DECIMAL_PATTERN, {
    message: (args: ValidationArguments) =>
      `${args.property} must be a positive decimal string`,
    ...validationOptions
  });
}

