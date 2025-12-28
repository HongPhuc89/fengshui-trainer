import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chapter } from '../../books/entities/chapter.entity';
import { QuestionType } from '../../../shares/enums/question-type.enum';
import { DifficultyLevel } from '../../../shares/enums/difficulty-level.enum';

@Entity('questions')
export class Question extends BaseEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'chapter_id' })
    chapter_id: number;

    @ManyToOne(() => Chapter)
    @JoinColumn({ name: 'chapter_id' })
    chapter: Chapter;

    @Column({ type: 'enum', enum: QuestionType })
    question_type: QuestionType;

    @Column({ type: 'enum', enum: DifficultyLevel })
    difficulty: DifficultyLevel;

    @Column({ type: 'text' })
    question_text: string;

    @Column({ type: 'int', default: 1 })
    points: number;

    @Column({ type: 'jsonb' })
    options: any;

    @Column({ type: 'text', nullable: true })
    explanation: string;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;
}
