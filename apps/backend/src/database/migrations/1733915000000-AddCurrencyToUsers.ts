import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCurrencyToUsers1733915000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'currency',
        type: 'integer',
        default: 0,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'currency');
  }
}
