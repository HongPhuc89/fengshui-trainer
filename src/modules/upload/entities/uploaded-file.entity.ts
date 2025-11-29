import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FileType } from '../../../shares/enums/file-type.enum';

@Entity('uploaded_files')
export class UploadedFile extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: FileType,
  })
  type: FileType;

  @Column({ type: 'varchar' })
  original_name: string;

  @Column({ type: 'varchar' })
  filename: string;

  @Column({ type: 'varchar' })
  path: string;

  @Column({ type: 'varchar' })
  mimetype: string;

  @Column({ type: 'int' })
  size: number;
}
