import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionIllustrationType1737086400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE uploaded_files_type_enum ADD VALUE 'question_illustration';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot remove enum values in PostgreSQL
    // This migration is irreversible
  }
}
