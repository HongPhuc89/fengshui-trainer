import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface LevelRewards {
  badges?: string[];
  features?: string[];
  bonuses?: {
    xp_multiplier?: number;
    daily_bonus?: number;
  };
}

@Entity('levels')
@Index(['level'], { unique: true })
@Index(['xp_required'])
export class Level extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'integer', unique: true })
  level: number;

  @Column({ type: 'integer' })
  xp_required: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  @Column({ type: 'jsonb', nullable: true })
  rewards: LevelRewards;
}
