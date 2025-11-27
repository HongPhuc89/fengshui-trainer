import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../shares/enums/user-role.enum';

export class RegisterRequestDto {
  @ApiProperty({
    type: String,
    description: 'Email of user',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    type: String,
    description: 'Password of user',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Full name of user',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Role of user',
    example: UserRole.NORMAL_USER,
    default: UserRole.NORMAL_USER,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
