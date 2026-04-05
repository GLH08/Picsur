import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class V060C1743600000002 implements MigrationInterface {
  name = 'V060C1743600000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 创建 e_album_backend 表（如果不存在）
    // 使用 ifNotExists=true 保证幂等性
    await queryRunner.createTable(
      new Table({
        name: 'e_album_backend',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'cover_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'image_ids',
            type: 'text',
            isNullable: false,
            default: "''",
          },
          {
            name: 'created',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated',
            type: 'timestamptz',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true, // ifNotExists
    );

    // 2. 创建用户索引（如果不存在）
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_album_user_id" ON "e_album_backend" ("user_id")`,
    );

    // 3. 从 image_ids 列回填 e_album_image_backend（幂等）
    if (await queryRunner.hasTable('e_album_image_backend')) {
      const albums = await queryRunner.query(`
        SELECT id, image_ids
        FROM e_album_backend
        WHERE image_ids IS NOT NULL
          AND image_ids != ''
          AND char_length(image_ids) > 0
      `);

      for (const album of albums) {
        if (album.image_ids && album.image_ids.length > 0) {
          const imageIds = album.image_ids.split(',').filter(
            (id: string) => id && id.length > 0,
          );

          for (let i = 0; i < imageIds.length; i++) {
            await queryRunner.query(
              `INSERT INTO "e_album_image_backend" ("album_id", "image_id", "position", "added_at")
               VALUES ($1, $2, $3, $4)
               ON CONFLICT ("album_id", "image_id") DO NOTHING`,
              [album.id, imageIds[i].trim(), i, new Date()],
            );
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 仅删除本迁移创建的索引，表本身不删除（保留数据）
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_album_user_id"`,
    );
  }
}
