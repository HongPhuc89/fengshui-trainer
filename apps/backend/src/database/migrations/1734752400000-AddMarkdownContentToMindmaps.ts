import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMarkdownContentToMindmaps1734752400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'mindmaps',
      new TableColumn({
        name: 'markdown_content',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('mindmaps', 'markdown_content');
  }
}
