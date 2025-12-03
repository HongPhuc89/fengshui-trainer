import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Chapter } from './chapter.entity';

@Entity('flashcards')
@Unique(['chapter_id', 'question', 'answer'])
export class Flashcard extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'chapter_id' })
  chapter_id: number;

  @ManyToOne(() => Chapter)
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;
}
