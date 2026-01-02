import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadFileDto } from './dtos/upload-file.dto';
import { JwtAuthGuard } from '../../shares/guards/jwt-auth.guard';
import { RolesGuard } from '../../shares/guards/roles.guard';
import { Roles } from '../../shares/decorators/roles.decorator';
import { UserRole } from '../../shares/enums/user-role.enum';
import { User as CurrentUser } from '../../shares/decorators/user.decorator';
import { User } from 'src/modules/users/entities/user.entity';
import { ApiBearerAuth, ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';
import 'multer';

@ApiTags('Admin Upload')
@Controller('admin/upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: {
          type: 'string',
          enum: ['book', 'cover', 'chapter'],
        },
      },
    },
  })
  async uploadFile(@UploadedFile() file: any, @Body() body: UploadFileDto, @CurrentUser() user: User) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.uploadService.uploadFile(file, body.type, user);
  }
}
