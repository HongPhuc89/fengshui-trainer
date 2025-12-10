import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../typeorm/base.entity';
import { User } from '../../users/entities/user.entity';
import { Chapter } from '../../books/entities/chapter.entity';

export enum QuizSessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

@Entity('quiz_sessions')
export class QuizSession extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'chapter_id' })
  chapter_id: number;

  @ManyToOne(() => Chapter)
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter;

  @Column({ type: 'jsonb' })
  questions: any[]; // Array of selected questions with shuffled options

  @Column({ type: 'jsonb', nullable: true })
  answers: Record<number, any>; // questionId -> user's answer

  @Column({ type: 'int', nullable: true })
  score: number;

  @Column({ type: 'int', nullable: true })
  total_points: number;

  @Column({ type: 'float', nullable: true })
  percentage: number;

  @Column({ type: 'boolean', nullable: true })
  passed: boolean;

  @Column({
    type: 'enum',
    enum: QuizSessionStatus,
    default: QuizSessionStatus.IN_PROGRESS,
  })
  status: QuizSessionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'int', nullable: true })
  time_limit_minutes: number;
}
