import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty()
  user: {
    id: number;
    email: string;
    role: string;
  };

  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;
}

