import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Book } from './book.entity';
import { UploadedFile } from '../../upload/entities/uploaded-file.entity';

@Entity('chapters')
export class Chapter extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'book_id' })
  book_id: number;

  @ManyToOne(() => Book, (book) => book.chapters)
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ name: 'file_id', nullable: true })
  file_id: number | null;

  @ManyToOne(() => UploadedFile, { nullable: true })
  @JoinColumn({ name: 'file_id' })
  file: UploadedFile | null;

  @Column({ name: 'infographic_file_id', nullable: true })
  infographic_file_id: number | null;

  @ManyToOne(() => UploadedFile, { nullable: true })
  @JoinColumn({ name: 'infographic_file_id' })
  infographic_file: UploadedFile | null;
}
