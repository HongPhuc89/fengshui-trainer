import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1764469861473 implements MigrationInterface {
  name = 'Migrations1764469861473';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_credentials" DROP CONSTRAINT "FK_dd0918407944553611bb3eb3ddc"`);
    await queryRunner.query(`CREATE TYPE "public"."uploaded_files_type_enum" AS ENUM('book', 'cover')`);
    await queryRunner.query(
      `CREATE TABLE "uploaded_files" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" SERIAL NOT NULL, "user_id" integer NOT NULL, "type" "public"."uploaded_files_type_enum" NOT NULL, "original_name" character varying NOT NULL, "filename" character varying NOT NULL, "path" character varying NOT NULL, "mimetype" character varying NOT NULL, "size" integer NOT NULL, CONSTRAINT "PK_e2d47e01bd5be386bf0067b2ed8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."books_status_enum" AS ENUM('draft', 'published', 'disabled')`);
    await queryRunner.query(
      `CREATE TABLE "books" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" SERIAL NOT NULL, "user_id" integer NOT NULL, "title" character varying NOT NULL, "author" character varying, "cover_file_id" integer, "file_id" integer, "chapter_count" integer NOT NULL DEFAULT '0', "status" "public"."books_status_enum" NOT NULL DEFAULT 'draft', CONSTRAINT "PK_f3f2f25a099d24e12545b70b022" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "chapters" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" SERIAL NOT NULL, "book_id" integer NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "order" integer NOT NULL, CONSTRAINT "PK_a2bbdbb4bdc786fe0cb0fcfc4a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "user_credentials" ALTER COLUMN "created_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "user_credentials" ALTER COLUMN "updated_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now()`);
    await queryRunner.query(
      `ALTER TABLE "user_credentials" ADD CONSTRAINT "FK_dd0918407944553611bb3eb3ddc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "uploaded_files" ADD CONSTRAINT "FK_dbd75c6a10be3314708a397da86" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" ADD CONSTRAINT "FK_d2211ba79c9312cdcda4d7d5860" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" ADD CONSTRAINT "FK_d2385758281605ab69d036d549a" FOREIGN KEY ("cover_file_id") REFERENCES "uploaded_files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" ADD CONSTRAINT "FK_8b7f61e89c6bcf18f6be49c0e4c" FOREIGN KEY ("file_id") REFERENCES "uploaded_files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "FK_23af8ea9e68fef63d07b189e8d1" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chapters" DROP CONSTRAINT "FK_23af8ea9e68fef63d07b189e8d1"`);
    await queryRunner.query(`ALTER TABLE "books" DROP CONSTRAINT "FK_8b7f61e89c6bcf18f6be49c0e4c"`);
    await queryRunner.query(`ALTER TABLE "books" DROP CONSTRAINT "FK_d2385758281605ab69d036d549a"`);
    await queryRunner.query(`ALTER TABLE "books" DROP CONSTRAINT "FK_d2211ba79c9312cdcda4d7d5860"`);
    await queryRunner.query(`ALTER TABLE "uploaded_files" DROP CONSTRAINT "FK_dbd75c6a10be3314708a397da86"`);
    await queryRunner.query(`ALTER TABLE "user_credentials" DROP CONSTRAINT "FK_dd0918407944553611bb3eb3ddc"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "user_credentials" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "user_credentials" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`DROP TABLE "chapters"`);
    await queryRunner.query(`DROP TABLE "books"`);
    await queryRunner.query(`DROP TYPE "public"."books_status_enum"`);
    await queryRunner.query(`DROP TABLE "uploaded_files"`);
    await queryRunner.query(`DROP TYPE "public"."uploaded_files_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "user_credentials" ADD CONSTRAINT "FK_dd0918407944553611bb3eb3ddc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
