import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../shares/enums/user-role.enum';

export class UserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  full_name: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

