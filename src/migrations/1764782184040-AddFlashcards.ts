import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlashcards1764782184040 implements MigrationInterface {
  name = 'AddFlashcards1764782184040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "flashcards" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" SERIAL NOT NULL, "chapter_id" integer NOT NULL, "question" text NOT NULL, "answer" text NOT NULL, CONSTRAINT "UQ_8f1bad6b442e400fbf64e00971d" UNIQUE ("chapter_id", "question", "answer"), CONSTRAINT "PK_9acf891ec7aaa7ca05c264ea94d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "flashcards" ADD CONSTRAINT "FK_a63debb8d078d914a745ff1947d" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "flashcards" DROP CONSTRAINT "FK_a63debb8d078d914a745ff1947d"`);
    await queryRunner.query(`DROP TABLE "flashcards"`);
  }
}
