import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Chapter } from './chapter.entity';

@Entity('reading_progress')
@Index(['userId', 'chapterId'], { unique: true })
export class ReadingProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'chapter_id' })
  chapterId: number;

  @Column({ type: 'int', default: 1, name: 'current_page' })
  currentPage: number;

  @Column({ type: 'int', default: 0, name: 'total_pages' })
  totalPages: number;

  @Column({ type: 'float', default: 0, name: 'scroll_position' })
  scrollPosition: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'last_read_at' })
  lastReadAt: Date;

  @Column({ type: 'int', default: 0, name: 'reading_time_seconds' })
  readingTimeSeconds: number;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Chapter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter;
}
