import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddIllustrationToQuestions1737085200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add illustration_file_id column to questions table
    await queryRunner.addColumn(
      'questions',
      new TableColumn({
        name: 'illustration_file_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        columnNames: ['illustration_file_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'uploaded_files',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key first
    const table = await queryRunner.getTable('questions');
    const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('illustration_file_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('questions', foreignKey);
    }

    // Drop column
    await queryRunner.dropColumn('questions', 'illustration_file_id');
  }
}
