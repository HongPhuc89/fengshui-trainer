import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserCredential } from '../user-credential/entities/user-credential.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCredential])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

