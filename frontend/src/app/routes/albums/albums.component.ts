import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe-decorator';
import { ErrorService } from '../../util/error-manager/error.service';
import { Logger } from '../../services/logger/logger.service';
import { DialogService } from '../../util/dialog-manager/dialog.service';
import { StorageService, STORAGE_CONFIGS } from '../../services/storage/storage.service';

export interface Album {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  imageIds: string[];
  created_at: number;
  updated_at: number;
}

@Component({
  selector: 'app-albums',
  templateUrl: './albums.component.html',
  styleUrls: ['./albums.component.scss'],
})
@AutoUnsubscribe()
export class AlbumsComponent implements OnInit {
  private readonly logger: Logger = new Logger(AlbumsComponent.name);

  albums: Album[] = [];
  loading = false;
  createDialogOpen = false;
  editingAlbum: Album | null = null;

  albumForm = {
    name: '',
    description: '',
  };

  constructor(
    private readonly router: Router,
    private readonly errorService: ErrorService,
    private readonly dialogService: DialogService,
    private readonly storageService: StorageService,
  ) {}

  async ngOnInit() {
    await this.loadAlbums();
  }

  async loadAlbums() {
    this.loading = true;
    try {
      this.albums = this.storageService.get<Album[]>(STORAGE_CONFIGS.ALBUMS) || [];
    } catch (error) {
      this.logger.error('Failed to load albums:', error);
      this.errorService.error('加载相册失败', this.logger);
      this.albums = [];
    } finally {
      this.loading = false;
    }
  }

  private saveAlbums() {
    this.storageService.set(STORAGE_CONFIGS.ALBUMS, this.albums);
  }

  openCreateDialog() {
    this.albumForm = { name: '', description: '' };
    this.editingAlbum = null;
    this.createDialogOpen = true;
  }

  openEditDialog(album: Album, event?: Event) {
    event?.stopPropagation();
    this.albumForm = {
      name: album.name,
      description: album.description || '',
    };
    this.editingAlbum = album;
    this.createDialogOpen = true;
  }

  closeDialog() {
    this.createDialogOpen = false;
    this.editingAlbum = null;
    this.albumForm = { name: '', description: '' };
  }

  async saveAlbum() {
    if (!this.albumForm.name.trim()) {
      this.errorService.error('请输入相册名称', this.logger);
      return;
    }

    try {
      if (this.editingAlbum) {
        // 更新相册
        const index = this.albums.findIndex((a) => a.id === this.editingAlbum!.id);
        if (index !== -1) {
          this.albums[index] = {
            ...this.albums[index],
            name: this.albumForm.name.trim(),
            description: this.albumForm.description.trim(),
            updated_at: Date.now(),
          };
        }
        this.errorService.success('相册更新成功');
      } else {
        // 创建新相册
        const newAlbum: Album = {
          id: this.generateId(),
          name: this.albumForm.name.trim(),
          description: this.albumForm.description.trim(),
          imageIds: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        };
        this.albums.unshift(newAlbum);
        this.errorService.success('相册创建成功');
      }
      this.saveAlbums();
      this.closeDialog();
    } catch (error) {
      this.logger.error('Failed to save album:', error);
      this.errorService.error('保存相册失败', this.logger);
    }
  }

  async deleteAlbum(album: Album, event?: Event) {
    event?.stopPropagation();

    const pressedButton = await this.dialogService.showDialog({
      title: `确定要删除相册"${album.name}"吗？`,
      description: '此操作无法撤销，相册内的图片不会被删除。',
      buttons: [
        { name: 'cancel', text: '取消' },
        { color: 'warn', name: 'delete', text: '删除' },
      ],
    });

    if (pressedButton === 'delete') {
      try {
        this.albums = this.albums.filter((a) => a.id !== album.id);
        this.saveAlbums();
        this.errorService.success('相册删除成功');
      } catch (error) {
        this.logger.error('Failed to delete album:', error);
        this.errorService.error('删除相册失败', this.logger);
      }
    }
  }

  viewAlbum(album: Album) {
    this.router.navigate(['/albums', album.id]);
  }

  getPhotoCount(album: Album): number {
    return album.imageIds?.length || 0;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  // 静态方法供其他组件调用
  static addImageToAlbum(albumId: string, imageId: string): boolean {
    try {
      const key = STORAGE_CONFIGS.ALBUMS.key;
      const saved = localStorage.getItem(key);
      const albums: Album[] = saved ? JSON.parse(saved) : [];
      const album = albums.find((a) => a.id === albumId);
      if (!album) return false;

      if (!album.imageIds.includes(imageId)) {
        album.imageIds.push(imageId);
        album.updated_at = Date.now();
        localStorage.setItem(key, JSON.stringify(albums));
      }
      return true;
    } catch {
      return false;
    }
  }

  static removeImageFromAlbum(albumId: string, imageId: string): boolean {
    try {
      const key = STORAGE_CONFIGS.ALBUMS.key;
      const saved = localStorage.getItem(key);
      if (!saved) return false;

      const albums: Album[] = JSON.parse(saved);
      const album = albums.find((a) => a.id === albumId);
      if (!album) return false;

      album.imageIds = album.imageIds.filter((id) => id !== imageId);
      album.updated_at = Date.now();
      localStorage.setItem(key, JSON.stringify(albums));
      return true;
    } catch {
      return false;
    }
  }

  static getAlbums(): Album[] {
    try {
      const key = STORAGE_CONFIGS.ALBUMS.key;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }
}
