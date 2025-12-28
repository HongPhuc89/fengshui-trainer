import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chapter } from '../../books/entities/chapter.entity';
import { User } from '../../users/entities/user.entity';

@Entity('quiz_attempts')
export class QuizAttempt extends BaseEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'chapter_id' })
    chapter_id: number;

    @ManyToOne(() => Chapter)
    @JoinColumn({ name: 'chapter_id' })
    chapter: Chapter;

    @Column({ name: 'user_id' })
    user_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'jsonb' })
    selected_questions: number[]; // Array of question IDs

    @Column({ type: 'int', default: 0 })
    score: number;

    @Column({ type: 'int', default: 0 })
    max_score: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    percentage: number;

    @Column({ type: 'boolean', default: false })
    passed: boolean;

    @Column({ type: 'jsonb', nullable: true })
    answers: any; // User's answers { question_id: answer }

    @Column({ type: 'timestamptz' })
    started_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    completed_at: Date;
}
