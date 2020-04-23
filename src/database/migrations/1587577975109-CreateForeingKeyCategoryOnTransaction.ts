import {MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey} from "typeorm";

export class CreateForeingKeyCategoryOnTransaction1587577975109 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('transactions', 'category_id');

        await queryRunner.addColumn('transactions',
        new TableColumn({
            name: 'category_id',
            type: 'varchar',
            isNullable: true,
        }),
        );

        await queryRunner.createForeignKey(
            'transactions',
            new TableForeignKey({
              name: 'FkCategory_id',
              columnNames: ['category_id'],
              referencedColumnNames: ['id'],
              referencedTableName: 'categories',
              onDelete: 'SET NULL',
              // RESTRICT
              // SET NULL
              // CASCADE
              onUpdate: 'CASCADE',
            }),
          );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropForeignKey('transactions', 'FkCategory_id');

        await queryRunner.dropColumn('transactions', 'category_id');
    
        await queryRunner.addColumn(
          'transactions',
          new TableColumn({
            name: 'category_id',
            type: 'varchar',
          }),
        );
    }

}
