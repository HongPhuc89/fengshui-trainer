import { Controller, Get, Param, ParseIntPipe, Res, UseGuards, Logger } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../shares/guards/jwt-auth.guard';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  @Get(':id')
  async getFile(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    this.logger.log(`Serving file ID: ${id}`);

    const { stream, contentType, filename, size } = await this.mediaService.getFile(id);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', size.toString());
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', 'bytes');

    stream.pipe(res);
  }
}
