import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../shares/enums/user-role.enum';

export class UpdateUserDto {
    @ApiPropertyOptional({ description: 'User full name' })
    @IsOptional()
    @IsString()
    full_name?: string;

    @ApiPropertyOptional({ description: 'User email' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ enum: UserRole, description: 'User role' })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ description: 'Is user active' })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
