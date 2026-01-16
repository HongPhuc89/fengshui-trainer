import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserCredentialModule } from '../user-credential/user-credential.module';
import { UsersModule } from '../users/users.module';
import { ExperienceModule } from '../experience/experience.module';
import { CoreModule } from '../core/core.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthCommonService } from './auth.common.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigService } from '../core/config.service';

@Module({
  imports: [
    UsersModule,
    UserCredentialModule,
    ExperienceModule,
    CoreModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const authConfig = configService.getAuthConfiguration();
        return {
          secret: authConfig.jwt.secretKey,
          signOptions: { expiresIn: authConfig.jwt.expireTime },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [LocalStrategy, JwtStrategy, AuthService, AuthCommonService],
  controllers: [AuthController],
  exports: [AuthCommonService],
})
export class AuthModule {}
