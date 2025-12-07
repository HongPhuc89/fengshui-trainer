import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateMindMapsTable1733586000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'mindmaps',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'chapter_id',
            type: 'int',
            isUnique: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'structure',
            type: 'jsonb',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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

    // Add foreign key to chapters table
    await queryRunner.createForeignKey(
      'mindmaps',
      new TableForeignKey({
        columnNames: ['chapter_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'chapters',
        onDelete: 'CASCADE',
      }),
    );

    // Add index on chapter_id for faster lookups
    await queryRunner.createIndex(
      'mindmaps',
      new TableIndex({
        name: 'IDX_mindmaps_chapter_id',
        columnNames: ['chapter_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('mindmaps');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('chapter_id') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('mindmaps', foreignKey);
      }
    }

    await queryRunner.dropIndex('mindmaps', 'IDX_mindmaps_chapter_id');
    await queryRunner.dropTable('mindmaps');
  }
}
