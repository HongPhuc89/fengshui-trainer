import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MindMapService } from './mindmap.service';
import { MindMap, MindMapStructure } from './entities/mindmap.entity';
import { Chapter } from '../books/entities/chapter.entity';
import { CreateMindMapDto, UpdateMindMapDto } from './dto/mindmap.dto';
import { BookStatus } from '../../shares/enums/book-status.enum';

describe('MindMapService', () => {
  let service: MindMapService;
  let mindMapRepository: jest.Mocked<Repository<MindMap>>;
  let chapterRepository: jest.Mocked<Repository<Chapter>>;

  const mockChapter: Chapter = {
    id: 1,
    title: 'Test Chapter',
    content: 'Test Content',
    order: 1,
    book_id: 1,
    created_at: new Date(),
    updated_at: new Date(),
    book: {
      id: 1,
      status: BookStatus.PUBLISHED,
    } as any,
    flashcards: [],
    questions: [],
    mindMap: null,
  };

  const validStructure: MindMapStructure = {
    nodes: [
      { id: '1', label: 'Root', x: 0, y: 0 },
      { id: '2', label: 'Child 1', x: 100, y: 100 },
      { id: '3', label: 'Child 2', x: 200, y: 100 },
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '1', target: '3' },
    ],
  };

  const mockMindMap: MindMap = {
    id: 1,
    chapter_id: 1,
    structure: validStructure,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    chapter: mockChapter,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MindMapService,
        {
          provide: getRepositoryToken(MindMap),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Chapter),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MindMapService>(MindMapService);
    mindMapRepository = module.get(getRepositoryToken(MindMap));
    chapterRepository = module.get(getRepositoryToken(Chapter));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateStructure', () => {
    it('should validate correct structure', () => {
      expect(() => service['validateStructure'](validStructure)).not.toThrow();
    });

    it('should throw error for missing nodes', () => {
      const invalidStructure = {
        nodes: [],
        edges: [],
      };

      expect(() => service['validateStructure'](invalidStructure)).toThrow(BadRequestException);
    });

    it('should throw error for duplicate node IDs', () => {
      const invalidStructure: MindMapStructure = {
        nodes: [
          { id: '1', label: 'Node 1', x: 0, y: 0 },
          { id: '1', label: 'Node 2', x: 100, y: 100 },
        ],
        edges: [],
      };

      expect(() => service['validateStructure'](invalidStructure)).toThrow(BadRequestException);
    });

    it('should throw error for duplicate edge IDs', () => {
      const invalidStructure: MindMapStructure = {
        nodes: [
          { id: '1', label: 'Node 1', x: 0, y: 0 },
          { id: '2', label: 'Node 2', x: 100, y: 100 },
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e1', source: '1', target: '2' },
        ],
      };

      expect(() => service['validateStructure'](invalidStructure)).toThrow(BadRequestException);
    });

    it('should throw error for edge referencing non-existent node', () => {
      const invalidStructure: MindMapStructure = {
        nodes: [{ id: '1', label: 'Node 1', x: 0, y: 0 }],
        edges: [{ id: 'e1', source: '1', target: '999' }],
      };

      expect(() => service['validateStructure'](invalidStructure)).toThrow(BadRequestException);
    });

    it('should throw error for circular reference', () => {
      const invalidStructure: MindMapStructure = {
        nodes: [
          { id: '1', label: 'Node 1', x: 0, y: 0 },
          { id: '2', label: 'Node 2', x: 100, y: 100 },
          { id: '3', label: 'Node 3', x: 200, y: 200 },
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '3' },
          { id: 'e3', source: '3', target: '1' },
        ],
      };

      expect(() => service['validateStructure'](invalidStructure)).toThrow(BadRequestException);
    });

    it('should throw error for too many nodes', () => {
      const nodes = Array.from({ length: 101 }, (_, i) => ({
        id: String(i),
        label: `Node ${i}`,
        x: 0,
        y: 0,
      }));

      const invalidStructure: MindMapStructure = {
        nodes,
        edges: [],
      };

      expect(() => service['validateStructure'](invalidStructure)).toThrow(BadRequestException);
    });

    it('should throw error for too many edges', () => {
      const nodes = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        label: `Node ${i}`,
        x: 0,
        y: 0,
      }));

      const edges = Array.from({ length: 201 }, (_, i) => ({
        id: `e${i}`,
        source: '0',
        target: String(Math.min(i + 1, 49)),
      }));

      const invalidStructure: MindMapStructure = {
        nodes,
        edges,
      };

      expect(() => service['validateStructure'](invalidStructure)).toThrow(BadRequestException);
    });

    it('should throw error for node label too long', () => {
      const invalidStructure: MindMapStructure = {
        nodes: [{ id: '1', label: 'x'.repeat(201), x: 0, y: 0 }],
        edges: [],
      };

      expect(() => service['validateStructure'](invalidStructure)).toThrow(BadRequestException);
    });

    it('should throw error for missing required node fields', () => {
      const invalidStructure: any = {
        nodes: [{ id: '1', x: 0, y: 0 }], // missing label
        edges: [],
      };

      expect(() => service['validateStructure'](invalidStructure)).toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    const createDto: CreateMindMapDto = {
      structure: validStructure,
      is_active: true,
    };

    it('should create a mind map successfully', async () => {
      chapterRepository.findOne.mockResolvedValue(mockChapter);
      mindMapRepository.findOne.mockResolvedValue(null);
      mindMapRepository.create.mockReturnValue(mockMindMap as any);
      mindMapRepository.save.mockResolvedValue(mockMindMap);

      const result = await service.create(1, createDto);

      expect(result).toBeDefined();
      expect(result.structure).toEqual(validStructure);
      expect(chapterRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw error when chapter not found', async () => {
      chapterRepository.findOne.mockResolvedValue(null);

      await expect(service.create(1, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when mind map already exists', async () => {
      chapterRepository.findOne.mockResolvedValue(mockChapter);
      mindMapRepository.findOne.mockResolvedValue(mockMindMap);

      await expect(service.create(1, createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw error for invalid structure', async () => {
      const invalidDto: CreateMindMapDto = {
        structure: { nodes: [], edges: [] },
        is_active: true,
      };

      chapterRepository.findOne.mockResolvedValue(mockChapter);
      mindMapRepository.findOne.mockResolvedValue(null);

      await expect(service.create(1, invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateMindMapDto = {
      structure: validStructure,
    };

    it('should update a mind map successfully', async () => {
      const updatedMindMap = { ...mockMindMap, ...updateDto };
      mindMapRepository.findOne.mockResolvedValue(mockMindMap);
      mindMapRepository.save.mockResolvedValue(updatedMindMap);

      const result = await service.update(1, updateDto);

      expect(result).toBeDefined();
      expect(mindMapRepository.save).toHaveBeenCalled();
    });

    it('should throw error when mind map not found', async () => {
      mindMapRepository.findOne.mockResolvedValue(null);

      await expect(service.update(1, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should validate structure when updating', async () => {
      const invalidDto: UpdateMindMapDto = {
        structure: { nodes: [], edges: [] },
      };

      mindMapRepository.findOne.mockResolvedValue(mockMindMap);

      await expect(service.update(1, invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByChapter', () => {
    it('should return mind map for a chapter', async () => {
      mindMapRepository.findOne.mockResolvedValue(mockMindMap);

      const result = await service.findByChapter(1);

      expect(result).toBeDefined();
      expect(mindMapRepository.findOne).toHaveBeenCalledWith({
        where: { chapter_id: 1 },
      });
    });

    it('should throw error when mind map not found', async () => {
      mindMapRepository.findOne.mockResolvedValue(null);

      await expect(service.findByChapter(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByChapterForUser', () => {
    it('should return active mind map for published book', async () => {
      chapterRepository.findOne.mockResolvedValue(mockChapter);
      mindMapRepository.findOne.mockResolvedValue(mockMindMap);

      const result = await service.findByChapterForUser(1, 1);

      expect(result).toBeDefined();
      expect(chapterRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, book_id: 1 },
        relations: ['book'],
      });
    });

    it('should throw error when chapter not found', async () => {
      chapterRepository.findOne.mockResolvedValue(null);

      await expect(service.findByChapterForUser(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when book not published', async () => {
      const draftChapter = {
        ...mockChapter,
        book: { ...mockChapter.book, status: BookStatus.DRAFT },
      };
      chapterRepository.findOne.mockResolvedValue(draftChapter);

      await expect(service.findByChapterForUser(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when mind map not active', async () => {
      chapterRepository.findOne.mockResolvedValue(mockChapter);
      mindMapRepository.findOne.mockResolvedValue({ ...mockMindMap, is_active: false });

      await expect(service.findByChapterForUser(1, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a mind map successfully', async () => {
      mindMapRepository.findOne.mockResolvedValue(mockMindMap);
      mindMapRepository.remove.mockResolvedValue(mockMindMap);

      await service.delete(1);

      expect(mindMapRepository.remove).toHaveBeenCalledWith(mockMindMap);
    });

    it('should throw error when mind map not found', async () => {
      mindMapRepository.findOne.mockResolvedValue(null);

      await expect(service.delete(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleActive', () => {
    it('should toggle mind map to inactive', async () => {
      const inactiveMindMap = { ...mockMindMap, is_active: false };
      mindMapRepository.findOne.mockResolvedValue(mockMindMap);
      mindMapRepository.save.mockResolvedValue(inactiveMindMap);

      const result = await service.toggleActive(1);

      expect(result.is_active).toBe(false);
    });

    it('should toggle mind map to active', async () => {
      const inactiveMindMap = { ...mockMindMap, is_active: false };
      const activeMindMap = { ...mockMindMap, is_active: true };
      mindMapRepository.findOne.mockResolvedValue(inactiveMindMap);
      mindMapRepository.save.mockResolvedValue(activeMindMap);

      const result = await service.toggleActive(1);

      expect(result.is_active).toBe(true);
    });
  });

  describe('validateStructureEndpoint', () => {
    it('should return valid for correct structure', async () => {
      const result = await service.validateStructureEndpoint(validStructure);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid structure', async () => {
      const invalidStructure: MindMapStructure = {
        nodes: [],
        edges: [],
      };

      const result = await service.validateStructureEndpoint(invalidStructure);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
