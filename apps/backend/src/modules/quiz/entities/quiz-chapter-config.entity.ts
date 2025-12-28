import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chapter } from '../../books/entities/chapter.entity';

@Entity('quiz_chapter_configs')
export class QuizChapterConfig extends BaseEntity {
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

    @Column({ type: 'int', default: 70 })
    passing_score_percentage: number;

    @Column({ type: 'int', nullable: true })
    time_limit_minutes: number;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;
}
