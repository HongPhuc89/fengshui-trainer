import { IsEmail, IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../shares/enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ description: 'User full name' })
  @IsString()
  full_name: string;

  @ApiProperty({ description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'User role', default: UserRole.NORMAL_USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
