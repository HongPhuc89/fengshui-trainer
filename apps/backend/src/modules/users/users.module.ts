import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserCredential } from '../user-credential/entities/user-credential.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';
import { ProfileService } from './services/profile.service';
import { ProfileController } from './controllers/profile.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCredential, UserProfile, UploadedFile]), SupabaseModule],
  controllers: [UsersController, ProfileController],
  providers: [UsersService, ProfileService],
  exports: [UsersService, ProfileService],
})
export class UsersModule {}
