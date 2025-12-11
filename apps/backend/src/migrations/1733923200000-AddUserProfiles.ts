import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfiles1733923200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add 'avatar' to FileType enum
    await queryRunner.query(`
      ALTER TYPE "public"."uploaded_files_type_enum"
      ADD VALUE IF NOT EXISTS 'avatar'
    `);

    // 2. Create Gender enum
    await queryRunner.query(`
      CREATE TYPE "public"."user_profiles_gender_enum" AS ENUM(
        'male',
        'female',
        'other',
        'prefer_not_to_say'
      )
    `);

    // 3. Create user_profiles table
    await queryRunner.query(`
      CREATE TABLE "user_profiles" (
        "id" SERIAL NOT NULL,
        "user_id" INTEGER NOT NULL,
        "date_of_birth" DATE,
        "gender" "public"."user_profiles_gender_enum",
        "avatar_file_id" INTEGER,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_user_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_profiles_user_id" UNIQUE ("user_id")
      )
    `);

    // 4. Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_user_profiles_user_id"
      ON "user_profiles" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_profiles_avatar_file_id"
      ON "user_profiles" ("avatar_file_id")
    `);

    // 5. Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD CONSTRAINT "FK_user_profiles_user_id"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD CONSTRAINT "FK_user_profiles_avatar_file_id"
      FOREIGN KEY ("avatar_file_id")
      REFERENCES "uploaded_files"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    // 6. Create default profiles for existing users
    await queryRunner.query(`
      INSERT INTO "user_profiles" ("user_id", "created_at", "updated_at")
      SELECT id, NOW(), NOW()
      FROM "users"
      WHERE NOT EXISTS (
        SELECT 1 FROM "user_profiles" WHERE "user_profiles"."user_id" = "users"."id"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      DROP CONSTRAINT "FK_user_profiles_avatar_file_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      DROP CONSTRAINT "FK_user_profiles_user_id"
    `);

    // 2. Drop indexes
    await queryRunner.query(`
      DROP INDEX "idx_user_profiles_avatar_file_id"
    `);

    await queryRunner.query(`
      DROP INDEX "idx_user_profiles_user_id"
    `);

    // 3. Drop table
    await queryRunner.query(`
      DROP TABLE "user_profiles"
    `);

    // 4. Drop enum
    await queryRunner.query(`
      DROP TYPE "public"."user_profiles_gender_enum"
    `);

    // Note: Cannot remove value from enum in PostgreSQL
    // 'avatar' will remain in uploaded_files_type_enum
  }
}
