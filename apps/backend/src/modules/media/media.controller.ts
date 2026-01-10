import { Controller, Get, Param, ParseIntPipe, Res, Logger, NotFoundException, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../shares/guards/jwt-auth.guard';
import { MediaService } from './media.service';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(
    private readonly mediaService: MediaService,
    @InjectRepository(UploadedFile)
    private readonly uploadedFileRepository: Repository<UploadedFile>,
  ) {}

  @Get(':id')
  async getFile(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    this.logger.log(`Serving file ID: ${id}`);

    // Check if file exists
    const file = await this.uploadedFileRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    const { stream, contentType, filename, size } = await this.mediaService.getFile(id);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', size.toString());
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', 'bytes');

    stream.pipe(res);
  }
}
