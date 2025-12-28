import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateQuizTables1733584530000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create quiz_chapter_configs table
    await queryRunner.createTable(
      new Table({
        name: 'quiz_chapter_configs',
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
            name: 'questions_per_quiz',
            type: 'int',
            default: 10,
          },
          {
            name: 'passing_score_percentage',
            type: 'int',
            default: 70,
          },
          {
            name: 'time_limit_minutes',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create questions table
    await queryRunner.createTable(
      new Table({
        name: 'questions',
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
          },
          {
            name: 'question_type',
            type: 'enum',
            enum: ['TRUE_FALSE', 'MULTIPLE_CHOICE', 'MULTIPLE_ANSWER', 'MATCHING', 'ORDERING'],
          },
          {
            name: 'difficulty',
            type: 'enum',
            enum: ['EASY', 'MEDIUM', 'HARD'],
          },
          {
            name: 'question_text',
            type: 'text',
          },
          {
            name: 'points',
            type: 'int',
            default: 1,
          },
          {
            name: 'options',
            type: 'jsonb',
          },
          {
            name: 'explanation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create quiz_attempts table
    await queryRunner.createTable(
      new Table({
        name: 'quiz_attempts',
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
          },
          {
            name: 'user_id',
            type: 'int',
          },
          {
            name: 'selected_questions',
            type: 'jsonb',
          },
          {
            name: 'score',
            type: 'int',
            default: 0,
          },
          {
            name: 'max_score',
            type: 'int',
            default: 0,
          },
          {
            name: 'percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'passed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'answers',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'started_at',
            type: 'timestamptz',
          },
          {
            name: 'completed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'quiz_chapter_configs',
      new TableForeignKey({
        columnNames: ['chapter_id'],
        referencedTableName: 'chapters',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        columnNames: ['chapter_id'],
        referencedTableName: 'chapters',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quiz_attempts',
      new TableForeignKey({
        columnNames: ['chapter_id'],
        referencedTableName: 'chapters',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quiz_attempts',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('quiz_attempts');
    await queryRunner.dropTable('questions');
    await queryRunner.dropTable('quiz_chapter_configs');
  }
}
