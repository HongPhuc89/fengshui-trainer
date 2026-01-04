import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUpdatedAtToUploadedFiles1736001347000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('uploaded_files');
    const hasColumn = table?.columns.find((col) => col.name === 'updated_at');

    if (!hasColumn) {
      await queryRunner.addColumn(
        'uploaded_files',
        new TableColumn({
          name: 'updated_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          onUpdate: 'CURRENT_TIMESTAMP',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('uploaded_files', 'updated_at');
  }
}
