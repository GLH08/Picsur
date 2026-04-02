import { Injectable } from '@angular/core';
import {
  AlbumAddImagesRequest,
  AlbumCreateRequest,
  AlbumListResponse,
  AlbumRemoveImagesRequest,
  AlbumUpdateRequest,
} from 'picsur-shared/dist/dto/api/album.dto';
import { EAlbum } from 'picsur-shared/dist/entities/album.entity';
import {
  AsyncFailable,
  FT,
  Fail,
  HasFailed,
  HasSuccess,
} from 'picsur-shared/dist/types/failable';
import { ApiService } from './api.service';
import { Logger } from '../logger/logger.service';

@Injectable({
  providedIn: 'root',
})
export class AlbumService {
  private readonly logger = new Logger(AlbumService.name);

  constructor(
    private readonly api: ApiService,
  ) {}

  public async createAlbum(name: string, description?: string): AsyncFailable<string> {
    const result = await this.api.post(
      AlbumCreateRequest,
      AlbumListResponse,
      '/api/album',
      { name, description },
    ).result;

    if (HasFailed(result)) {
      return result;
    }

    if (HasSuccess(result)) {
      const albums = result.results;
      if (albums && albums.length > 0) {
        return albums[0].id;
      }
    }

    return Fail(FT.Unknown, 'Failed to create album');
  }

  public async listAlbums(): AsyncFailable<EAlbum[]> {
    const result = await this.api.get(
      AlbumListResponse,
      '/api/album',
    ).result;

    if (HasFailed(result)) {
      return result;
    }

    if (HasSuccess(result)) {
      return result.results;
    }

    return Fail(FT.Unknown, 'Failed to list albums');
  }

  public async updateAlbum(
    id: string,
    data: { name?: string; description?: string; cover_url?: string }
  ): AsyncFailable<EAlbum> {
    const result = await this.api.put(
      AlbumUpdateRequest,
      AlbumListResponse,
      '/api/album',
      { id, ...data },
    ).result;

    if (HasFailed(result)) {
      return result;
    }

    if (HasSuccess(result)) {
      const albums = result.results;
      if (albums && albums.length > 0) {
        return albums[0];
      }
    }

    return Fail(FT.Unknown, 'Failed to update album');
  }

  public async deleteAlbum(id: string): AsyncFailable<true> {
    return await this.api.delete(`/api/album/${id}`).result;
  }

  public async addImagesToAlbum(
    albumId: string,
    imageIds: string[]
  ): AsyncFailable<EAlbum> {
    const result = await this.api.post(
      AlbumAddImagesRequest,
      AlbumListResponse,
      '/api/album/add-images',
      { album_id: albumId, image_ids: imageIds },
    ).result;

    if (HasFailed(result)) {
      return result;
    }

    if (HasSuccess(result)) {
      const albums = result.results;
      if (albums && albums.length > 0) {
        return albums[0];
      }
    }

    return Fail(FT.Unknown, 'Failed to add images to album');
  }

  public async removeImagesFromAlbum(
    albumId: string,
    imageIds: string[]
  ): AsyncFailable<EAlbum> {
    const result = await this.api.post(
      AlbumRemoveImagesRequest,
      AlbumListResponse,
      '/api/album/remove-images',
      { album_id: albumId, image_ids: imageIds },
    ).result;

    if (HasFailed(result)) {
      return result;
    }

    if (HasSuccess(result)) {
      const albums = result.results;
      if (albums && albums.length > 0) {
        return albums[0];
      }
    }

    return Fail(FT.Unknown, 'Failed to remove images from album');
  }
}
