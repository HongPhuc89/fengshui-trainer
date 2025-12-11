import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Gender } from '../entities/user-profile.entity';

@ValidatorConstraint({ name: 'isValidAge', async: false })
export class IsValidAgeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value) return true; // Optional field

    const birthDate = new Date(value);
    const today = new Date();

    // Check if date is valid
    if (isNaN(birthDate.getTime())) return false;

    // Check if date is in the future
    if (birthDate > today) return false;

    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Age must be between 13 and 120
    return age >= 13 && age <= 120;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Age must be between 13 and 120 years';
  }
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  full_name?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be in format YYYY-MM-DD' })
  @Validate(IsValidAgeConstraint)
  date_of_birth?: string;

  @IsOptional()
  @IsEnum(Gender, {
    message: 'Gender must be one of: male, female, other, prefer_not_to_say',
  })
  gender?: Gender;
}
