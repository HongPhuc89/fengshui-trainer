import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileToChapter1735844772000 implements MigrationInterface {
  name = 'AddFileToChapter1735844772000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add points column if not exists
    await queryRunner.query(`ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "points" integer NOT NULL DEFAULT 0`);

    // Update uploaded_files enum to include 'avatar' and 'chapter'
    await queryRunner.query(`ALTER TYPE "public"."uploaded_files_type_enum" ADD VALUE IF NOT EXISTS 'avatar'`);
    await queryRunner.query(`ALTER TYPE "public"."uploaded_files_type_enum" ADD VALUE IF NOT EXISTS 'chapter'`);

    // Add file_id column to chapters
    await queryRunner.query(`ALTER TABLE "chapters" ADD COLUMN "file_id" integer NULL`);

    // Add foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "FK_chapters_file_id" FOREIGN KEY ("file_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "FK_chapters_file_id"`);

    // Drop file_id column
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN IF EXISTS "file_id"`);

    // Note: Cannot remove enum values in PostgreSQL, would need to recreate the enum
    // For down migration, we'll leave the enum values as they are

    // Drop points column
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN IF EXISTS "points"`);
  }
}
