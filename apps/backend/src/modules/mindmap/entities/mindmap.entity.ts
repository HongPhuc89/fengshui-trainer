import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Chapter } from '../../books/entities/chapter.entity';

export interface MindMapNode {
  id: string;
  parentId?: string;
  text: string;
  color?: string;
  icon?: string;
  position?: { x: number; y: number };
  collapsed?: boolean;
  metadata?: Record<string, any>;
}

export interface MindMapConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'parent-child' | 'related' | 'opposed';
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface MindMapTheme {
  fontFamily?: string;
  fontSize?: number;
  lineColor?: string;
  backgroundColor?: string;
}

export interface MindMapStructure {
  version: string;
  layout: 'radial' | 'tree' | 'org-chart';
  centerNode: MindMapNode;
  nodes: MindMapNode[];
  connections?: MindMapConnection[];
  theme?: MindMapTheme;
}

@Entity('mindmaps')
export class MindMap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: true })
  chapter_id: number;

  @ManyToOne(() => Chapter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  structure: MindMapStructure;

  @Column({ type: 'text', nullable: true })
  markdown_content: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
