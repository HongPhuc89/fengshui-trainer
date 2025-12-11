import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UserExperienceLog } from './entities/user-experience-log.entity';
import { Level } from './entities/level.entity';
import { UserExperienceService } from './services/user-experience.service';
import { ExperienceController } from './experience.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserExperienceLog, Level])],
  controllers: [ExperienceController],
  providers: [UserExperienceService],
  exports: [UserExperienceService],
})
export class ExperienceModule {}
