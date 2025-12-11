import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPointToChapters1733883000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'chapters',
      new TableColumn({
        name: 'point',
        type: 'integer',
        default: 50,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('chapters', 'point');
  }
}
