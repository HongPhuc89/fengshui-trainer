import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserCredentialService } from '../user-credential/user-credential.service';
import { UsersService } from '../users/users.service';
import { UserExperienceService } from '../experience/services/user-experience.service';
import { AuthCommonService } from './auth.common.service';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { User } from '../users/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { RefreshTokenRequestDto } from './dtos/refresh-token-request.dto';
import { hashStringSHA } from '../../shares/helpers/cryptography';
import { ConfigService } from '../core/config.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userCredentialService: UserCredentialService,
    private readonly userExperienceService: UserExperienceService,
    private readonly authCommonService: AuthCommonService,
    private readonly configService: ConfigService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async validateUserWithUsernameAndPassword(email: string, password: string): Promise<User | null> {
    return this.userCredentialService.getUserWithUsernameAndPassword(email, password);
  }

  async register(registerRequest: RegisterRequestDto) {
    let user: User;

    await this.dataSource.transaction(async (manager) => {
      user = await this.usersService.addNewUser(registerRequest, manager);
    });

    const { access_token, refresh_token } = await this.authCommonService.getTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await this.authCommonService.setTokenActive(user.id, access_token, refresh_token);
    await this.usersService.updateUserLastLoginAt(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      access_token,
      refresh_token,
    };
  }

  async login(user: UserResponseDto) {
    const { access_token, refresh_token } = await this.authCommonService.getTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateUserLastLoginAt(user.id);
    await this.authCommonService.setTokenActive(user.id, access_token, refresh_token);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      access_token,
      refresh_token,
    };
  }

  async me(userId: number): Promise<UserResponseDto> {
    const user = await this.usersService.aboutMe(userId);

    // Get user XP summary
    const xpSummary = await this.userExperienceService.getUserXPSummary(userId);

    return plainToInstance(UserResponseDto, {
      ...user,
      total_xp: xpSummary.total_xp,
      current_level: xpSummary.current_level?.level || 1,
      next_level: xpSummary.next_level?.level || 2,
      xp_for_next_level: xpSummary.next_level?.xp_remaining || 0,
    });
  }

  async refreshToken(data: RefreshTokenRequestDto) {
    const decoded = await this.authCommonService.decodeRefreshToken(data.refresh_token);
    if (!decoded) {
      throw new BadRequestException('Invalid refresh token');
    }

    const user = await this.usersService.getUserById(decoded.id);

    if (!user.refresh_token) {
      throw new BadRequestException('Refresh token not found');
    }

    const config = this.configService.getAuthConfiguration();
    const hashedRefreshToken = hashStringSHA(data.refresh_token, config.refreshToken.secretKeyActivateToken);

    if (user.refresh_token !== hashedRefreshToken) {
      throw new BadRequestException('Invalid refresh token');
    }

    const { access_token } = await this.authCommonService.getTokens({
      id: decoded.id,
      email: decoded.email,
      role: user.role,
    });

    await this.authCommonService.setTokenActive(user.id, access_token, data.refresh_token);

    return {
      access_token,
      refresh_token: data.refresh_token,
    };
  }

  async logout(userId: number) {
    await this.authCommonService.clearTokenOfUser(userId);
  }
}
