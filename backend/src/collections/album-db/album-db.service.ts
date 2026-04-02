import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AsyncFailable, Fail, FT, HasFailed } from 'picsur-shared/dist/types/failable';
import { Repository } from 'typeorm';
import { EAlbumBackend } from '../../database/entities/album.entity.js';
import { EAlbumImageBackend } from '../../database/entities/album-image.entity.js';

@Injectable()
export class AlbumDBService {
  constructor(
    @InjectRepository(EAlbumBackend)
    private readonly albumRepo: Repository<EAlbumBackend>,
    @InjectRepository(EAlbumImageBackend)
    private readonly albumImageRepo: Repository<EAlbumImageBackend>,
  ) {}

  public async create(
    userid: string,
    name: string,
    description?: string,
  ): AsyncFailable<EAlbumBackend> {
    const album = new EAlbumBackend();
    album.user_id = userid;
    album.name = name;
    album.description = description || null;
    album.image_ids = [];

    try {
      return await this.albumRepo.save(album, { reload: true });
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async findOne(
    id: string,
    userid: string,
  ): AsyncFailable<EAlbumBackend> {
    try {
      const found = await this.albumRepo.findOne({
        where: { id, user_id: userid },
      });

      if (!found) return Fail(FT.NotFound, 'Album not found');

      // 从关联表获取图片 ID 并按 position 排序
      const relations = await this.albumImageRepo.find({
        where: { album_id: id },
        order: { position: 'ASC' },
      });

      if (relations.length > 0) {
        found.image_ids = relations.map((r) => r.image_id);
      }

      return found;
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async findAll(userid: string): AsyncFailable<EAlbumBackend[]> {
    try {
      const albums = await this.albumRepo.find({
        where: { user_id: userid },
        order: { updated: 'DESC' } as any,
      });

      // 为每个相册填充关联的图片 ID
      for (const album of albums) {
        const relations = await this.albumImageRepo.find({
          where: { album_id: album.id },
          order: { position: 'ASC' },
        });

        if (relations.length > 0) {
          album.image_ids = relations.map((r) => r.image_id);
        }
      }

      return albums;
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async update(
    id: string,
    userid: string,
    data: Partial<Pick<EAlbumBackend, 'name' | 'description' | 'cover_url'>>,
  ): AsyncFailable<EAlbumBackend> {
    const albumResult = await this.findOne(id, userid);
    if (HasFailed(albumResult)) return albumResult;
    const album = albumResult;

    if (data.name !== undefined) album.name = data.name;
    if (data.description !== undefined) album.description = data.description;
    if (data.cover_url !== undefined) album.cover_url = data.cover_url;
    album.updated = new Date();

    try {
      return await this.albumRepo.save(album, { reload: true });
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async addImages(
    id: string,
    userid: string,
    imageIds: string[],
  ): AsyncFailable<EAlbumBackend> {
    const albumResult = await this.findOne(id, userid);
    if (HasFailed(albumResult)) return albumResult;
    const album = albumResult;

    try {
      // 获取当前最大 position
      const maxPositionResult = await this.albumImageRepo
        .createQueryBuilder('ai')
        .select('MAX(ai.position)', 'maxPosition')
        .where('ai.album_id = :albumId', { albumId: id })
        .getRawOne();

      let nextPosition = (maxPositionResult?.maxPosition ?? -1) + 1;

      // 添加新的关联记录
      for (const imageId of imageIds) {
        // 检查是否已存在
        const existing = await this.albumImageRepo.findOne({
          where: { album_id: id, image_id: imageId },
        });

        if (!existing) {
          const newRelation = new EAlbumImageBackend();
          newRelation.album_id = id;
          newRelation.image_id = imageId;
          newRelation.position = nextPosition++;
          newRelation.added_at = new Date();
          await this.albumImageRepo.save(newRelation);
        }
      }

      album.updated = new Date();
      await this.albumRepo.save(album, { reload: true });

      return this.findOne(id, userid);
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async removeImages(
    id: string,
    userid: string,
    imageIds: string[],
  ): AsyncFailable<EAlbumBackend> {
    const albumResult = await this.findOne(id, userid);
    if (HasFailed(albumResult)) return albumResult;
    const album = albumResult;

    try {
      // 从关联表中删除
      await this.albumImageRepo
        .createQueryBuilder()
        .delete()
        .where('album_id = :albumId', { albumId: id })
        .andWhere('image_id IN (:...imageIds)', { imageIds })
        .execute();

      album.updated = new Date();
      await this.albumRepo.save(album, { reload: true });

      return this.findOne(id, userid);
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async delete(id: string, userid: string): AsyncFailable<true> {
    const albumResult = await this.findOne(id, userid);
    if (HasFailed(albumResult)) return albumResult;

    try {
      // 先删除关联表中的记录
      await this.albumImageRepo
        .createQueryBuilder()
        .delete()
        .where('album_id = :albumId', { albumId: id })
        .execute();

      // 再删除相册
      await this.albumRepo.remove(albumResult);
      return true;
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  /**
   * 获取相册中的图片 ID 列表（按 position 排序）
   */
  public async getAlbumImageIds(albumId: string): AsyncFailable<string[]> {
    try {
      const relations = await this.albumImageRepo.find({
        where: { album_id: albumId },
        order: { position: 'ASC' },
      });
      return relations.map((r) => r.image_id);
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  /**
   * 获取图片所在的所有相册
   */
  public async getAlbumsContainingImage(
    imageId: string,
  ): AsyncFailable<EAlbumBackend[]> {
    try {
      const relations = await this.albumImageRepo.find({
        where: { image_id: imageId },
      });

      if (relations.length === 0) return [];

      const albumIds = relations.map((r) => r.album_id);
      return await this.albumRepo
        .createQueryBuilder('album')
        .whereInIds(albumIds)
        .getMany();
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }
}
