import { BaseEntity } from '../../typeorm/base.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

@Entity('user_credentials')
export class UserCredential extends BaseEntity {
  @PrimaryColumn({ type: 'int' })
  user_id: number;

  @OneToOne(() => User, (user) => user.credential)
  @JoinColumn({
    name: 'user_id',
  })
  user: User;

  @Column({
    type: 'varchar',
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
  })
  password: string;
}
