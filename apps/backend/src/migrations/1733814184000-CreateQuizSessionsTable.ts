import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateQuizSessionsTable1733814184000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'quiz_sessions',
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
            name: 'questions',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'answers',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'score',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'total_points',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'percentage',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'passed',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'IN_PROGRESS'",
          },
          {
            name: 'started_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'time_limit_minutes',
            type: 'int',
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
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'quiz_sessions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quiz_sessions',
      new TableForeignKey({
        columnNames: ['chapter_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'chapters',
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes
    await queryRunner.query(`CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_quiz_sessions_chapter_id ON quiz_sessions(chapter_id)`);
    await queryRunner.query(`CREATE INDEX idx_quiz_sessions_status ON quiz_sessions(status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('quiz_sessions');
  }
}
