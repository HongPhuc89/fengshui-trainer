import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Book } from './book.entity';

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
}
