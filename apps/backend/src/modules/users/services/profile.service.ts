import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { User } from '../entities/user.entity';
import { UploadedFile } from '../../upload/entities/uploaded-file.entity';
import { SupabaseService } from '../../supabase/supabase.service';
import { FileType } from '../../../shares/enums/file-type.enum';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import sharp from 'sharp';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UploadedFile)
    private uploadedFileRepository: Repository<UploadedFile>,
    private supabaseService: SupabaseService,
  ) {}

  /**
   * Get user profile with avatar signed URL
   */
  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'profile.avatar_file'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate signed URL for avatar if exists
    let avatarUrl = null;
    if (user.profile?.avatar_file) {
      avatarUrl = await this.supabaseService.getSignedUrl(
        'avatars',
        user.profile.avatar_file.path,
        3600, // 1 hour
      );
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      experience_points: user.experience_points,
      profile: {
        date_of_birth: user.profile?.date_of_birth || null,
        gender: user.profile?.gender || null,
        avatar_url: avatarUrl,
      },
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update full_name in users table if provided
    if (dto.full_name !== undefined) {
      user.full_name = dto.full_name;
      await this.userRepository.save(user);
    }

    // Create profile if not exists
    if (!user.profile) {
      const profile = this.userProfileRepository.create({
        user_id: userId,
        date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : undefined,
        gender: dto.gender,
      });
      await this.userProfileRepository.save(profile);
    } else {
      // Update existing profile
      if (dto.date_of_birth !== undefined) {
        user.profile.date_of_birth = new Date(dto.date_of_birth);
      }
      if (dto.gender !== undefined) {
        user.profile.gender = dto.gender;
      }
      await this.userProfileRepository.save(user.profile);
    }

    // Return updated profile
    return this.getProfile(userId);
  }

  /**
   * Upload avatar with flow: Upload new → Update DB → Delete old
   * Ensures user doesn't lose avatar if upload fails
   */
  async uploadAvatar(userId: number, file: Express.Multer.File) {
    // 1. Validate dimensions
    const metadata = await sharp(file.buffer).metadata();
    if (metadata.width !== 400 || metadata.height !== 400) {
      throw new BadRequestException('Image must be 400x400 pixels');
    }

    // 2. Get current profile (to get old avatar_file_id)
    let profile = await this.userProfileRepository.findOne({
      where: { user_id: userId },
      relations: ['avatar_file'],
    });

    // Create profile if not exists
    if (!profile) {
      profile = this.userProfileRepository.create({ user_id: userId });
      await this.userProfileRepository.save(profile);
    }

    const oldAvatarFileId = profile.avatar_file_id;
    const oldAvatarFile = profile.avatar_file;

    // 3. Generate unique filename
    const timestamp = Date.now();
    const extension = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `avatar_${timestamp}.${extension}`;
    const path = `user_${userId}/${filename}`;

    let newUploadedFile: UploadedFile;
    let uploadedToSupabase = false;

    try {
      // 4. ✨ UPLOAD NEW FIRST - Upload to Supabase
      const supabasePath = await this.supabaseService.uploadFile('avatars', path, file.buffer, file.mimetype);
      uploadedToSupabase = true;

      // 5. ✨ CREATE NEW RECORD - Create new uploaded_file record
      newUploadedFile = this.uploadedFileRepository.create({
        user_id: userId,
        type: FileType.AVATAR,
        original_name: file.originalname,
        filename: filename,
        path: supabasePath,
        mimetype: file.mimetype,
        size: file.size,
      });
      await this.uploadedFileRepository.save(newUploadedFile);

      // 6. ✨ UPDATE PROFILE - Link new avatar to profile
      await this.userProfileRepository.update({ user_id: userId }, { avatar_file_id: newUploadedFile.id });

      // 7. ✨ DELETE OLD AFTER - Cleanup old avatar (if exists)
      if (oldAvatarFileId && oldAvatarFile) {
        try {
          // Soft delete old record
          await this.uploadedFileRepository.softDelete(oldAvatarFileId);

          // Delete old file from Supabase (or schedule for later)
          await this.supabaseService.deleteFile('avatars', oldAvatarFile.path);
        } catch (cleanupError) {
          // Log error but don't fail the request
          console.error('Failed to cleanup old avatar:', cleanupError);
          // Could schedule cleanup job here
        }
      }

      // 8. Generate signed URL for new avatar
      const signedUrl = await this.supabaseService.getSignedUrl(
        'avatars',
        supabasePath,
        3600, // 1 hour
      );

      return {
        avatar_url: signedUrl,
        uploaded_file_id: newUploadedFile.id,
      };
    } catch (error) {
      // Rollback: If upload succeeded but DB failed, cleanup uploaded file
      if (uploadedToSupabase) {
        try {
          await this.supabaseService.deleteFile('avatars', path);
        } catch (rollbackError) {
          console.error('Failed to rollback uploaded file:', rollbackError);
        }
      }

      // If new record was created but update failed, delete it
      if (newUploadedFile?.id) {
        try {
          await this.uploadedFileRepository.delete(newUploadedFile.id);
        } catch (rollbackError) {
          console.error('Failed to rollback uploaded_file record:', rollbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Delete avatar with soft delete
   */
  async deleteAvatar(userId: number) {
    const profile = await this.userProfileRepository.findOne({
      where: { user_id: userId },
      relations: ['avatar_file'],
    });

    if (!profile?.avatar_file_id) {
      throw new BadRequestException('No avatar found to delete');
    }

    const avatarFile = profile.avatar_file;

    try {
      // 1. Disconnect link first (user will see initials immediately)
      await this.userProfileRepository.update({ user_id: userId }, { avatar_file_id: null });

      // 2. Soft delete record
      await this.uploadedFileRepository.softDelete(profile.avatar_file_id);

      // 3. Delete file from Supabase (or schedule cleanup)
      if (avatarFile) {
        try {
          await this.supabaseService.deleteFile('avatars', avatarFile.path);
        } catch (deleteError) {
          console.error('Failed to delete file from Supabase:', deleteError);
          // Schedule cleanup job
        }
      }

      return { message: 'Avatar deleted successfully' };
    } catch (error) {
      // If something fails, try to restore the link
      if (profile.avatar_file_id) {
        await this.userProfileRepository.update({ user_id: userId }, { avatar_file_id: profile.avatar_file_id });
      }
      throw error;
    }
  }
}
