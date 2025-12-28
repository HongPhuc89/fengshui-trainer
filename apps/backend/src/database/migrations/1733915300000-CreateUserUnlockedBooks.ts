import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateUserUnlockedBooks1733915300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_unlocked_books',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'book_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'unlocked_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique constraint
    await queryRunner.createIndex(
      'user_unlocked_books',
      new TableIndex({
        name: 'idx_user_unlocked_books_unique',
        columnNames: ['user_id', 'book_id'],
        isUnique: true,
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'user_unlocked_books',
      new TableIndex({
        name: 'idx_user_unlocked_books_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_unlocked_books',
      new TableIndex({
        name: 'idx_user_unlocked_books_book_id',
        columnNames: ['book_id'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'user_unlocked_books',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_unlocked_books',
      new TableForeignKey({
        columnNames: ['book_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'books',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_unlocked_books');
  }
}
