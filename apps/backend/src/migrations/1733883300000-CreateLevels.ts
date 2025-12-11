import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateLevels1733883300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create levels table
    await queryRunner.createTable(
      new Table({
        name: 'levels',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'level',
            type: 'integer',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'xp_required',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'rewards',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'levels',
      new TableIndex({
        name: 'idx_levels_level',
        columnNames: ['level'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'levels',
      new TableIndex({
        name: 'idx_levels_xp_required',
        columnNames: ['xp_required'],
      }),
    );

    // Insert default cultivation ranks
    await queryRunner.query(`
      INSERT INTO levels (level, xp_required, title, color) VALUES
      (1, 0, 'Phàm Nhân', '#808080'),
      (2, 100, 'Luyện Khí', '#4169E1'),
      (3, 250, 'Trúc Cơ', '#32CD32'),
      (4, 500, 'Kim Đan', '#FFD700'),
      (5, 1000, 'Nguyên Anh', '#FF8C00'),
      (6, 2000, 'Hóa Thần', '#FF4500'),
      (7, 4000, 'Luyện Hư', '#9370DB'),
      (8, 8000, 'Đại Thừa', '#FF1493'),
      (9, 15000, 'Độ Kiếp', '#00CED1');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('levels');
  }
}
