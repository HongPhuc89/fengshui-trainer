import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn, BaseEntity as TypeORMBaseEntity } from 'typeorm';

export class BaseEntity extends TypeORMBaseEntity {
  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updated_at: Date;

  @DeleteDateColumn({
    type: 'timestamptz',
    nullable: true,
  })
  deleted_at: Date;
}
