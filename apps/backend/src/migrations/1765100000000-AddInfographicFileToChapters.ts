import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInfographicFileToChapters1765100000000 implements MigrationInterface {
  name = 'AddInfographicFileToChapters1765100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update uploaded_files enum to include 'infographic'
    // Note: In PostgreSQL, we can add values to existing enums
    await queryRunner.query(`ALTER TYPE "public"."uploaded_files_type_enum" ADD VALUE IF NOT EXISTS 'infographic'`);

    // Add infographic_file_id column to chapters
    await queryRunner.query(`ALTER TABLE "chapters" ADD COLUMN "infographic_file_id" integer NULL`);

    // Add foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "FK_chapters_infographic_file_id" FOREIGN KEY ("infographic_file_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "FK_chapters_infographic_file_id"`);

    // Drop infographic_file_id column
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN IF EXISTS "infographic_file_id"`);

    // Note: Cannot remove enum values in PostgreSQL easily without recreating the enum
  }
}
