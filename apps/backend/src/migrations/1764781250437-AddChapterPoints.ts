import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChapterPoints1764781250437 implements MigrationInterface {
  name = 'AddChapterPoints1764781250437';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chapters" ADD "points" integer NOT NULL DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "points"`);
  }
}
