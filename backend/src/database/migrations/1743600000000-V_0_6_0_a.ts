import { MigrationInterface, QueryRunner } from 'typeorm';

export class V060A1743600000000 implements MigrationInterface {
  name = 'V060A1743600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 索引：用户图片查询优化
    await queryRunner.query(
      `CREATE INDEX "IDX_image_user_id" ON "e_image_backend" ("user_id")`,
    );

    // 索引：时间排序查询优化
    await queryRunner.query(
      `CREATE INDEX "IDX_image_created" ON "e_image_backend" ("created" DESC)`,
    );

    // 复合索引：用户+时间联合查询（最常见查询模式）
    await queryRunner.query(
      `CREATE INDEX "IDX_image_user_created" ON "e_image_backend" ("user_id", "created" DESC)`,
    );

    // 索引：相册用户查询优化
    await queryRunner.query(
      `CREATE INDEX "IDX_album_user_id" ON "e_album_backend" ("user_id")`,
    );

    // 索引：API Key 最后使用时间查询
    await queryRunner.query(
      `CREATE INDEX "IDX_api_key_last_used" ON "e_api_key_backend" ("last_used" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_image_user_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_image_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_image_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_album_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_api_key_last_used"`,
    );
  }
}
