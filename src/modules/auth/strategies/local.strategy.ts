import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { plainToInstance } from 'class-transformer';
import { AuthService } from '../auth.service';
import { UserResponseDto } from '../dtos/user-response.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'user_local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<UserResponseDto> {
    const user = await this.authService.validateUserWithUsernameAndPassword(email, password);

    if (!user) {
      throw new BadRequestException('Email or password is incorrect');
    }

    if (!user.is_active) {
      throw new BadRequestException('User is not active');
    }

    return plainToInstance(UserResponseDto, user);
  }
}

