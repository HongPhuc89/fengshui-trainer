import { IsString, IsBoolean, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MindMapStructure } from '../entities/mindmap.entity';

export class CreateMindMapDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  structure: MindMapStructure;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;
}

export class UpdateMindMapDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  structure?: MindMapStructure;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class MindMapResponseDto {
  id: number;
  chapterId: number;
  title: string;
  description?: string;
  structure: MindMapStructure;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  constructor(mindmap: any) {
    this.id = mindmap.id;
    this.chapterId = mindmap.chapter_id;
    this.title = mindmap.title;
    this.description = mindmap.description;
    this.structure = mindmap.structure;
    this.is_active = mindmap.is_active;
    this.created_at = mindmap.created_at;
    this.updated_at = mindmap.updated_at;
  }
}
