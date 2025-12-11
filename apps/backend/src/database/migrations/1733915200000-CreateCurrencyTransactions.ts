import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCurrencyTransactions1733915200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'currency_transactions',
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
            name: 'amount',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'admin_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'book_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'currency_transactions',
      new TableIndex({
        name: 'idx_currency_transactions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'currency_transactions',
      new TableIndex({
        name: 'idx_currency_transactions_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'currency_transactions',
      new TableIndex({
        name: 'idx_currency_transactions_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'currency_transactions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'currency_transactions',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'currency_transactions',
      new TableForeignKey({
        columnNames: ['book_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'books',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('currency_transactions');
  }
}
