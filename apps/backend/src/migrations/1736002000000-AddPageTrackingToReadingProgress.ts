import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPageTrackingToReadingProgress1736002000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add current_page column
    await queryRunner.addColumn(
      'reading_progress',
      new TableColumn({
        name: 'current_page',
        type: 'int',
        default: 1,
        comment: 'Current page number being read',
      }),
    );

    // Add total_pages column
    await queryRunner.addColumn(
      'reading_progress',
      new TableColumn({
        name: 'total_pages',
        type: 'int',
        default: 0,
        comment: 'Total number of pages in the document',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('reading_progress', 'current_page');
    await queryRunner.dropColumn('reading_progress', 'total_pages');
  }
}
