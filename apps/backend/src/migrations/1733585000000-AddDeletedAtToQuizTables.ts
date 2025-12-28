import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtToQuizTables1733585000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted_at to quiz_chapter_configs
    await queryRunner.addColumn(
      'quiz_chapter_configs',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    // Add deleted_at to questions
    await queryRunner.addColumn(
      'questions',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    // Add deleted_at to quiz_attempts
    await queryRunner.addColumn(
      'quiz_attempts',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('quiz_chapter_configs', 'deleted_at');
    await queryRunner.dropColumn('questions', 'deleted_at');
    await queryRunner.dropColumn('quiz_attempts', 'deleted_at');
  }
}
