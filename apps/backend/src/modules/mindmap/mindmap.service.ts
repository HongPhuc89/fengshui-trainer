import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MindMap, MindMapStructure } from './entities/mindmap.entity';
import { CreateMindMapDto, UpdateMindMapDto, MindMapResponseDto } from './dto/mindmap.dto';
import { Chapter } from '../books/entities/chapter.entity';

@Injectable()
export class MindMapService {
  constructor(
    @InjectRepository(MindMap)
    private mindMapRepository: Repository<MindMap>,
    @InjectRepository(Chapter)
    private chapterRepository: Repository<Chapter>,
  ) {}

  /**
   * Validate mind map structure
   */
  private validateStructure(structure: MindMapStructure): void {
    const errors: string[] = [];

    // Check required fields
    if (!structure.version) errors.push('Structure version is required');
    if (!structure.layout) errors.push('Layout is required');
    if (!structure.centerNode) errors.push('Center node is required');
    if (!structure.nodes) errors.push('Nodes array is required');

    // Validate center node
    if (structure.centerNode && !structure.centerNode.id) {
      errors.push('Center node must have an id');
    }
    if (structure.centerNode && !structure.centerNode.text) {
      errors.push('Center node must have text');
    }

    // Collect all node IDs
    const nodeIds = new Set<string>();
    if (structure.centerNode) {
      nodeIds.add(structure.centerNode.id);
    }
    structure.nodes.forEach((node) => {
      if (!node.id) {
        errors.push('All nodes must have an id');
      } else if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node id: ${node.id}`);
      } else {
        nodeIds.add(node.id);
      }

      if (!node.text) {
        errors.push(`Node ${node.id} must have text`);
      }
    });

    // Validate parent references
    structure.nodes.forEach((node) => {
      if (node.parentId && !nodeIds.has(node.parentId)) {
        errors.push(`Node ${node.id} references non-existent parent: ${node.parentId}`);
      }
    });

    // Check for circular references
    const visited = new Set<string>();
    const checkCircular = (nodeId: string, path: Set<string>) => {
      if (path.has(nodeId)) {
        errors.push(`Circular reference detected involving node: ${nodeId}`);
        return;
      }
      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      path.add(nodeId);

      const node = structure.nodes.find((n) => n.id === nodeId);
      if (node?.parentId) {
        checkCircular(node.parentId, new Set(path));
      }
    };

    structure.nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        checkCircular(node.id, new Set());
      }
    });

    // Validate connections if present
    if (structure.connections) {
      structure.connections.forEach((conn) => {
        if (!conn.fromNodeId || !conn.toNodeId) {
          errors.push('Connections must have fromNodeId and toNodeId');
        }
        if (!nodeIds.has(conn.fromNodeId)) {
          errors.push(`Connection references non-existent node: ${conn.fromNodeId}`);
        }
        if (!nodeIds.has(conn.toNodeId)) {
          errors.push(`Connection references non-existent node: ${conn.toNodeId}`);
        }
      });
    }

    // Check size limits
    const totalNodes = structure.nodes.length + 1; // +1 for center node
    if (totalNodes > 500) {
      errors.push(`Too many nodes: ${totalNodes} (maximum 500)`);
    }

    if (structure.connections && structure.connections.length > 200) {
      errors.push(`Too many connections: ${structure.connections.length} (maximum 200)`);
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Invalid mind map structure',
        errors,
      });
    }
  }

  /**
   * Create mind map for a chapter
   */
  async create(chapterId: number, createDto: CreateMindMapDto): Promise<MindMapResponseDto> {
    // Verify chapter exists
    const chapter = await this.chapterRepository.findOne({ where: { id: chapterId } });
    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
    }

    // Check if mind map already exists
    const existing = await this.mindMapRepository.findOne({ where: { chapter_id: chapterId } });
    if (existing) {
      throw new ConflictException(`Mind map already exists for chapter ${chapterId}`);
    }

    // Validate structure
    this.validateStructure(createDto.structure);

    // Create mind map
    const mindMap = this.mindMapRepository.create({
      chapter_id: chapterId,
      title: createDto.title,
      description: createDto.description,
      structure: createDto.structure,
      is_active: createDto.is_active ?? true,
    });

    const saved = await this.mindMapRepository.save(mindMap);
    return new MindMapResponseDto(saved);
  }

  /**
   * Update mind map
   */
  async update(chapterId: number, updateDto: UpdateMindMapDto): Promise<MindMapResponseDto> {
    const mindMap = await this.mindMapRepository.findOne({ where: { chapter_id: chapterId } });
    if (!mindMap) {
      throw new NotFoundException(`Mind map not found for chapter ${chapterId}`);
    }

    // Validate structure if provided
    if (updateDto.structure) {
      this.validateStructure(updateDto.structure);
    }

    // Update fields
    if (updateDto.title !== undefined) mindMap.title = updateDto.title;
    if (updateDto.description !== undefined) mindMap.description = updateDto.description;
    if (updateDto.structure !== undefined) mindMap.structure = updateDto.structure;
    if (updateDto.is_active !== undefined) mindMap.is_active = updateDto.is_active;

    const saved = await this.mindMapRepository.save(mindMap);
    return new MindMapResponseDto(saved);
  }

  /**
   * Get mind map by chapter ID (admin - no filters)
   */
  async findByChapter(chapterId: number): Promise<MindMapResponseDto> {
    const mindMap = await this.mindMapRepository.findOne({ where: { chapter_id: chapterId } });
    if (!mindMap) {
      throw new NotFoundException(`Mind map not found for chapter ${chapterId}`);
    }
    return new MindMapResponseDto(mindMap);
  }

  /**
   * Get mind map for user (must be active and book must be published)
   */
  async findByChapterForUser(bookId: number, chapterId: number): Promise<MindMapResponseDto> {
    const mindMap = await this.mindMapRepository
      .createQueryBuilder('mindmap')
      .innerJoin('mindmap.chapter', 'chapter')
      .innerJoin('chapter.book', 'book')
      .where('mindmap.chapter_id = :chapterId', { chapterId })
      .andWhere('book.id = :bookId', { bookId })
      .andWhere('book.status = :status', { status: 'PUBLISHED' })
      .andWhere('mindmap.is_active = :isActive', { isActive: true })
      .select([
        'mindmap.id',
        'mindmap.chapter_id',
        'mindmap.title',
        'mindmap.description',
        'mindmap.structure',
        'mindmap.is_active',
        'mindmap.created_at',
        'mindmap.updated_at',
      ])
      .getOne();

    if (!mindMap) {
      throw new NotFoundException('Mind map not found or not available');
    }

    return new MindMapResponseDto(mindMap);
  }

  /**
   * Delete mind map
   */
  async delete(chapterId: number): Promise<void> {
    const mindMap = await this.mindMapRepository.findOne({ where: { chapter_id: chapterId } });
    if (!mindMap) {
      throw new NotFoundException(`Mind map not found for chapter ${chapterId}`);
    }
    await this.mindMapRepository.remove(mindMap);
  }

  /**
   * Toggle active status
   */
  async toggleActive(chapterId: number): Promise<MindMapResponseDto> {
    const mindMap = await this.mindMapRepository.findOne({ where: { chapter_id: chapterId } });
    if (!mindMap) {
      throw new NotFoundException(`Mind map not found for chapter ${chapterId}`);
    }

    mindMap.is_active = !mindMap.is_active;
    const saved = await this.mindMapRepository.save(mindMap);
    return new MindMapResponseDto(saved);
  }

  /**
   * Validate structure endpoint
   */
  async validateStructureEndpoint(structure: MindMapStructure): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      this.validateStructure(structure);
      return { valid: true };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return {
          valid: false,
          errors: error.getResponse()['errors'] || [error.message],
        };
      }
      throw error;
    }
  }
}
