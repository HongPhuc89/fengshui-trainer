import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../core/config.service';
import { JwtPayload } from './auth.type';
import { hashStringSHA } from '../../shares/helpers/cryptography';
import { UsersService } from '../users/users.service';
import { EntityManager } from 'typeorm';

@Injectable()
export class AuthCommonService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async getTokens(payload: JwtPayload) {
    const refreshTokenConfig = this.configService.getAuthConfiguration().refreshToken;
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        expiresIn: refreshTokenConfig.expireTime,
        secret: refreshTokenConfig.secretKey,
      }),
    ]);

    return {
      access_token,
      refresh_token,
    };
  }

  async decodeRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.getAuthConfiguration().refreshToken.secretKey,
    });
  }

  async setTokenActive(userId: number, token: string, refreshToken: string, entityManager?: EntityManager) {
    const user = await this.usersService.getUserById(userId);
    const config = this.configService.getAuthConfiguration();
    const hashedRefreshToken = hashStringSHA(refreshToken, config.refreshToken.secretKeyActivateToken);
    user.refresh_token = hashedRefreshToken;
    await this.usersService.saveUser(user);

    const hashedToken = hashStringSHA(token, config.jwt.secretKeyActivateToken);
    // In a real app, you would store this in Redis cache
    // For now, we'll just store the hashed refresh token in the database
  }

  async clearTokenOfUser(userId: number) {
    const user = await this.usersService.getUserById(userId);
    user.refresh_token = null;
    await this.usersService.saveUser(user);
  }
}

