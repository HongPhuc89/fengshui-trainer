import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { MindMapService } from '../mindmap.service';
import { MindMapResponseDto } from '../dto/mindmap.dto';

@Controller('books/:bookId/chapters/:chapterId/mindmap')
export class UserMindMapController {
  constructor(private readonly mindMapService: MindMapService) {}

  @Get()
  async findOne(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
  ): Promise<MindMapResponseDto> {
    return this.mindMapService.findByChapterForUser(bookId, chapterId);
  }

  @Get('export')
  async export(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Res() res: Response,
  ): Promise<void> {
    const mindMap = await this.mindMapService.findByChapterForUser(bookId, chapterId);

    const exportData = {
      title: mindMap.title,
      description: mindMap.description,
      structure: mindMap.structure,
      exported_at: new Date().toISOString(),
    };

    const filename = `mindmap-chapter-${chapterId}-${Date.now()}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
  }
}
