import { Controller, Get, Post, Put, Delete, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MindMapService } from '../mindmap.service';
import { CreateMindMapDto, UpdateMindMapDto, MindMapResponseDto } from '../dto/mindmap.dto';
import { JwtAuthGuard } from '../../../shares/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shares/guards/roles.guard';
import { Roles } from '../../../shares/decorators/roles.decorator';
import { MindMapStructure } from '../entities/mindmap.entity';
import { UserRole } from '../../../shares/enums/user-role.enum';

@Controller('admin/chapters/:chapterId/mindmap')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class AdminMindMapController {
  constructor(private readonly mindMapService: MindMapService) {}

  @Post()
  async create(
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body() createDto: CreateMindMapDto,
  ): Promise<MindMapResponseDto> {
    return this.mindMapService.create(chapterId, createDto);
  }

  @Put()
  async update(
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body() updateDto: UpdateMindMapDto,
  ): Promise<MindMapResponseDto> {
    return this.mindMapService.update(chapterId, updateDto);
  }

  @Get()
  async findOne(@Param('chapterId', ParseIntPipe) chapterId: number): Promise<MindMapResponseDto> {
    return this.mindMapService.findByChapter(chapterId);
  }

  @Delete()
  async delete(@Param('chapterId', ParseIntPipe) chapterId: number): Promise<{ message: string }> {
    await this.mindMapService.delete(chapterId);
    return { message: 'Mind map deleted successfully' };
  }

  @Patch('toggle-active')
  async toggleActive(@Param('chapterId', ParseIntPipe) chapterId: number): Promise<MindMapResponseDto> {
    return this.mindMapService.toggleActive(chapterId);
  }

  @Post('validate')
  async validateStructure(
    @Body('structure') structure: MindMapStructure,
  ): Promise<{ valid: boolean; errors?: string[] }> {
    return this.mindMapService.validateStructureEndpoint(structure);
  }
}
