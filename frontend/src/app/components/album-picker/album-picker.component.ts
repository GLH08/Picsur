import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EAlbum } from 'picsur-shared/dist/entities/album.entity';
import { HasFailed } from 'picsur-shared/dist/types/failable';
import { AlbumService } from '../../services/api/album.service';
import { ErrorService } from '../../util/error-manager/error.service';
import { Logger } from '../../services/logger/logger.service';

export interface AlbumPickerData {
  imageId: string;
  imageName: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-album-picker',
  templateUrl: './album-picker.component.html',
  styleUrls: ['./album-picker.component.scss'],
})
export class AlbumPickerComponent implements OnInit {
  private readonly logger: Logger = new Logger(AlbumPickerComponent.name);

  albums: EAlbum[] = [];
  loading = false;
  createMode = false;
  newAlbumName = '';

  constructor(
    public dialogRef: MatDialogRef<AlbumPickerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AlbumPickerData,
    private readonly errorService: ErrorService,
    private readonly albumService: AlbumService,
  ) {}

  ngOnInit() {
    this.loadAlbums();
  }

  async loadAlbums() {
    this.loading = true;
    try {
      const result = await this.albumService.listAlbums();
      if (HasFailed(result)) {
        this.errorService.showFailure(result, this.logger);
        this.albums = [];
      } else {
        this.albums = result;
      }
    } catch (error) {
      this.logger.error('Failed to load albums:', error);
      this.albums = [];
    } finally {
      this.loading = false;
    }
  }

  isInAlbum(album: EAlbum): boolean {
    return album.image_ids?.includes(this.data.imageId) || false;
  }

  async toggleAlbum(album: EAlbum) {
    if (this.isInAlbum(album)) {
      // 从相册移除
      const result = await this.albumService.removeImagesFromAlbum(album.id, [this.data.imageId]);
      if (HasFailed(result)) {
        return this.errorService.showFailure(result, this.logger);
      }

      // 更新本地列表
      const index = this.albums.findIndex((a) => a.id === album.id);
      if (index !== -1) {
        this.albums[index] = result;
      }
      this.errorService.success(`已从"${album.name}"移除`);
    } else {
      // 添加到相册
      const result = await this.albumService.addImagesToAlbum(album.id, [this.data.imageId]);
      if (HasFailed(result)) {
        return this.errorService.showFailure(result, this.logger);
      }

      // 更新本地列表
      const index = this.albums.findIndex((a) => a.id === album.id);
      if (index !== -1) {
        this.albums[index] = result;
      }
      this.errorService.success(`已添加到"${album.name}"`);
    }
  }

  showCreateMode() {
    this.createMode = true;
    this.newAlbumName = '';
  }

  cancelCreate() {
    this.createMode = false;
    this.newAlbumName = '';
  }

  async createAndAdd() {
    if (!this.newAlbumName.trim()) {
      this.errorService.error('请输入相册名称', this.logger);
      return;
    }

    try {
      // 创建新相册
      const result = await this.albumService.createAlbum(
        this.newAlbumName.trim(),
      );

      if (HasFailed(result)) {
        return this.errorService.showFailure(result, this.logger);
      }

      // 将图片添加到新相册
      const addResult = await this.albumService.addImagesToAlbum(result, [this.data.imageId]);
      if (HasFailed(addResult)) {
        return this.errorService.showFailure(addResult, this.logger);
      }

      // 重新加载列表
      await this.loadAlbums();
      this.errorService.success(`已创建相册并添加图片`);
      this.createMode = false;
      this.newAlbumName = '';
    } catch (error) {
      this.logger.error('Failed to create album:', error);
      this.errorService.error('创建相册失败', this.logger);
    }
  }

  getPhotoCount(album: EAlbum): number {
    return album.image_ids?.length || 0;
  }

  close() {
    this.dialogRef.close();
  }
}
