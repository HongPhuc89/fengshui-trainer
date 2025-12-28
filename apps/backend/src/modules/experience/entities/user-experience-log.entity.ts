import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ExperienceSourceType } from '../../../shares/enums/experience-source-type.enum';

@Entity('user_experience_logs')
@Index(['user_id'])
@Index(['source_type', 'source_id'])
@Index(['created_at'])
export class UserExperienceLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'integer' })
  user_id: number;

  @Column({
    type: 'enum',
    enum: ExperienceSourceType,
  })
  source_type: ExperienceSourceType;

  @Column({ type: 'integer', nullable: true })
  source_id: number;

  @Column({ type: 'integer' })
  xp: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
