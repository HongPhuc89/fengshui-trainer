import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookChunks1764477514694 implements MigrationInterface {
  name = 'AddBookChunks1764477514694';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "book_chunks" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" SERIAL NOT NULL, "book_id" integer NOT NULL, "content" text NOT NULL, "chunk_index" integer NOT NULL, "metadata" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_83d270379fb5e1b5b7928fac6de" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "book_chunks" ADD CONSTRAINT "FK_3e32e0fd594a2428ee57087e43f" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "book_chunks" DROP CONSTRAINT "FK_3e32e0fd594a2428ee57087e43f"`);
    await queryRunner.query(`DROP TABLE "book_chunks"`);
  }
}
