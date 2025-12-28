import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateQuizConfigsTable1733623200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'quiz_configs',
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
                        name: 'time_limit_minutes',
                        type: 'int',
                        default: 30,
                    },
                    {
                        name: 'passing_score_percentage',
                        type: 'int',
                        default: 70,
                    },
                    {
                        name: 'easy_percentage',
                        type: 'int',
                        default: 40,
                    },
                    {
                        name: 'medium_percentage',
                        type: 'int',
                        default: 40,
                    },
                    {
                        name: 'hard_percentage',
                        type: 'int',
                        default: 20,
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'shuffle_questions',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'shuffle_options',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'show_results_immediately',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'max_attempts',
                        type: 'int',
                        default: 0,
                        comment: '0 means unlimited attempts',
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

        // Add foreign key constraint
        await queryRunner.createForeignKey(
            'quiz_configs',
            new TableForeignKey({
                columnNames: ['chapter_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'chapters',
                onDelete: 'CASCADE',
            }),
        );

        // Create index on chapter_id for faster lookups
        await queryRunner.query(`
      CREATE INDEX "idx_quiz_configs_chapter_id" ON "quiz_configs" ("chapter_id");
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('quiz_configs');
    }
}
