import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUnlockFieldsToBooks1733915100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'books',
      new TableColumn({
        name: 'unlock_price',
        type: 'integer',
        default: 100,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'books',
      new TableColumn({
        name: 'free_chapters',
        type: 'integer',
        default: 2,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('books', 'unlock_price');
    await queryRunner.dropColumn('books', 'free_chapters');
  }
}
