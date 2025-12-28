import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenRequestDto {
  @ApiProperty({
    type: String,
    description: 'Refresh token',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
