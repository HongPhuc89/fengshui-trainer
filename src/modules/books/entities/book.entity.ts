import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UploadedFile } from '../../upload/entities/uploaded-file.entity';
import { BookStatus } from '../../../shares/enums/book-status.enum';
import { Chapter } from './chapter.entity';

@Entity('books')
export class Book extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  author: string;

  @Column({ name: 'cover_file_id', nullable: true })
  cover_file_id: number;

  @ManyToOne(() => UploadedFile)
  @JoinColumn({ name: 'cover_file_id' })
  cover_file: UploadedFile;

  @Column({ name: 'file_id', nullable: true })
  file_id: number;

  @ManyToOne(() => UploadedFile)
  @JoinColumn({ name: 'file_id' })
  file: UploadedFile;

  @Column({ type: 'int', default: 0 })
  chapter_count: number;

  @Column({
    type: 'enum',
    enum: BookStatus,
    default: BookStatus.DRAFT,
  })
  status: BookStatus;

  @OneToMany(() => Chapter, (chapter) => chapter.book)
  chapters: Chapter[];
}
