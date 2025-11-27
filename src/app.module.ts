import { Module } from '@nestjs/common';
import { CoreModule } from './modules/core/core.module';
import { TypeormModule } from './modules/typeorm/typeorm.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UserCredentialModule } from './modules/user-credential/user-credential.module';

@Module({
  imports: [CoreModule, TypeormModule, AuthModule, UsersModule, UserCredentialModule],
})
export class AppModule {}
