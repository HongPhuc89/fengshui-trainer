import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chapter } from '../../books/entities/chapter.entity';

@Entity('quiz_configs')
export class QuizConfig extends BaseEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'chapter_id', unique: true })
    chapter_id: number;

    @OneToOne(() => Chapter)
    @JoinColumn({ name: 'chapter_id' })
    chapter: Chapter;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'int', default: 10 })
    questions_per_quiz: number;

    @Column({ type: 'int', default: 30 })
    time_limit_minutes: number;

    @Column({ type: 'int', default: 70 })
    passing_score_percentage: number;

    @Column({ type: 'int', default: 40 })
    easy_percentage: number;

    @Column({ type: 'int', default: 40 })
    medium_percentage: number;

    @Column({ type: 'int', default: 20 })
    hard_percentage: number;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'boolean', default: false })
    shuffle_questions: boolean;

    @Column({ type: 'boolean', default: true })
    shuffle_options: boolean;

    @Column({ type: 'boolean', default: true })
    show_results_immediately: boolean;

    @Column({ type: 'int', default: 0, comment: '0 means unlimited attempts' })
    max_attempts: number;
}

