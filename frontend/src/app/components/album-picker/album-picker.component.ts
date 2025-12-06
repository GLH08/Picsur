import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ErrorService } from '../../util/error-manager/error.service';
import { Logger } from '../../services/logger/logger.service';
import { StorageService, STORAGE_CONFIGS } from '../../services/storage/storage.service';
import { Album, AlbumsComponent } from '../../routes/albums/albums.component';

export interface AlbumPickerData {
  imageId: string;
  imageName: string;
  imageUrl?: string; // 图片 URL，用于设置相册封面
}

@Component({
  selector: 'app-album-picker',
  templateUrl: './album-picker.component.html',
  styleUrls: ['./album-picker.component.scss'],
})
export class AlbumPickerComponent implements OnInit {
  private readonly logger: Logger = new Logger(AlbumPickerComponent.name);

  albums: Album[] = [];
  loading = false;
  createMode = false;
  newAlbumName = '';

  constructor(
    public dialogRef: MatDialogRef<AlbumPickerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AlbumPickerData,
    private readonly errorService: ErrorService,
    private readonly storageService: StorageService,
  ) {}

  ngOnInit() {
    this.loadAlbums();
  }

  loadAlbums() {
    this.loading = true;
    try {
      this.albums = AlbumsComponent.getAlbums();
    } catch (error) {
      this.logger.error('Failed to load albums:', error);
    } finally {
      this.loading = false;
    }
  }

  isInAlbum(album: Album): boolean {
    return album.imageIds?.includes(this.data.imageId) || false;
  }

  toggleAlbum(album: Album) {
    if (this.isInAlbum(album)) {
      // 从相册移除
      const success = AlbumsComponent.removeImageFromAlbum(album.id, this.data.imageId);
      if (success) {
        album.imageIds = album.imageIds.filter((id) => id !== this.data.imageId);
        this.errorService.success(`已从"${album.name}"移除`);
      }
    } else {
      // 添加到相册
      const success = AlbumsComponent.addImageToAlbum(album.id, this.data.imageId);
      if (success) {
        if (!album.imageIds) album.imageIds = [];
        album.imageIds.push(this.data.imageId);
        this.errorService.success(`已添加到"${album.name}"`);
      }
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

  createAndAdd() {
    if (!this.newAlbumName.trim()) {
      this.errorService.error('请输入相册名称', this.logger);
      return;
    }

    try {
      // 创建新相册
      const newAlbum: Album = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
        name: this.newAlbumName.trim(),
        imageIds: [this.data.imageId],
        cover: this.data.imageUrl, // 使用当前图片作为封面
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      this.albums.unshift(newAlbum);

      // 保存到 localStorage
      this.storageService.set(STORAGE_CONFIGS.ALBUMS, this.albums);

      this.errorService.success(`已创建相册"${newAlbum.name}"并添加图片`);
      this.createMode = false;
      this.newAlbumName = '';
    } catch (error) {
      this.logger.error('Failed to create album:', error);
      this.errorService.error('创建相册失败', this.logger);
    }
  }

  getPhotoCount(album: Album): number {
    return album.imageIds?.length || 0;
  }

  close() {
    this.dialogRef.close();
  }
}
