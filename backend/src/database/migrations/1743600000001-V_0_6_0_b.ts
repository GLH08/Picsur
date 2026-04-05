import { MigrationInterface, QueryRunner } from 'typeorm';

export class V060B1743600000001 implements MigrationInterface {
  name = 'V060B1743600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 创建关联表
    await queryRunner.query(`
      CREATE TABLE "e_album_image_backend" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "album_id" uuid NOT NULL,
        "image_id" uuid NOT NULL,
        "position" int NOT NULL DEFAULT 0,
        "added_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_album_image" UNIQUE ("album_id", "image_id"),
        CONSTRAINT "PK_album_image" PRIMARY KEY ("id")
      )
    `);

    // 2. 创建索引
    await queryRunner.query(
      `CREATE INDEX "IDX_album_image_album_id" ON "e_album_image_backend" ("album_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_album_image_image_id" ON "e_album_image_backend" ("image_id")`,
    );

    // 3. 创建相册用户索引（仅当 e_album_backend 表存在时）
    if (await queryRunner.hasTable('e_album_backend')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_album_user_id" ON "e_album_backend" ("user_id")`,
      );
    }

    // 4. 迁移现有数据（从 simple-array 到关联表）
    // 仅当 e_album_backend 表存在时执行
    if (await queryRunner.hasTable('e_album_backend')) {
      const albums = await queryRunner.query(`
        SELECT id, image_ids
        FROM e_album_backend
        WHERE image_ids IS NOT NULL
          AND image_ids != ''
          AND char_length(image_ids) > 0
      `);

      for (const album of albums) {
        if (album.image_ids && album.image_ids.length > 0) {
          // 解析 simple-array（逗号分隔的 UUID）
          const imageIds = album.image_ids.split(',').filter((id: string) => id && id.length > 0);

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
    // 1. 删除关联表
    await queryRunner.query(`DROP TABLE IF EXISTS "e_album_image_backend"`);
  }
}
