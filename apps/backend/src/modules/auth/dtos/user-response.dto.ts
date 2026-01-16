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

  // Experience fields
  @ApiProperty({ required: false })
  total_xp?: number;

  @ApiProperty({ required: false })
  current_level?: number;

  @ApiProperty({ required: false })
  next_level?: number;

  @ApiProperty({ required: false })
  xp_for_next_level?: number;
}
