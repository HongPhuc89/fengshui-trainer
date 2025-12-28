import { BaseEntity } from '../../typeorm/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Book } from './book.entity';

@Entity('book_chunks')
export class BookChunk extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'book_id' })
  book_id: number;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  chunk_index: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
