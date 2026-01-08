import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateReadingProgressTable1736000869000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'reading_progress',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'chapter_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'scroll_position',
            type: 'float',
            default: 0,
            comment: 'Scroll position from 0.0 to 1.0',
          },
          {
            name: 'last_read_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'reading_time_seconds',
            type: 'int',
            default: 0,
            comment: 'Total reading time in seconds',
          },
          {
            name: 'completed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique constraint
    await queryRunner.createIndex(
      'reading_progress',
      new TableIndex({
        name: 'IDX_READING_PROGRESS_USER_CHAPTER',
        columnNames: ['user_id', 'chapter_id'],
        isUnique: true,
      }),
    );

    // Create index for user queries
    await queryRunner.createIndex(
      'reading_progress',
      new TableIndex({
        name: 'IDX_READING_PROGRESS_USER',
        columnNames: ['user_id'],
      }),
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'reading_progress',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key to chapters table
    await queryRunner.createForeignKey(
      'reading_progress',
      new TableForeignKey({
        columnNames: ['chapter_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'chapters',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('reading_progress');
  }
}
