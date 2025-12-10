import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtToQuizConfig1733803882000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'quiz_configs',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('quiz_configs', 'deleted_at');
  }
}
