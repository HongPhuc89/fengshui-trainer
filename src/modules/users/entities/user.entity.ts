import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { UserRole } from '../../../shares/enums/user-role.enum';
import { UserCredential } from '../../user-credential/entities/user-credential.entity';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'varchar',
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  full_name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.NORMAL_USER,
  })
  role: UserRole;

  @Column({
    type: 'boolean',
    default: true,
  })
  is_active: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  last_login_at: Date;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  refresh_token: string;

  @OneToOne(() => UserCredential, (credential) => credential.user)
  @JoinColumn()
  credential: UserCredential;
}

