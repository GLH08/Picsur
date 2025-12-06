import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe-decorator';
import { EImage } from 'picsur-shared/dist/entities/image.entity';
import { HasFailed } from 'picsur-shared/dist/types/failable';
import { ImageService } from '../../../services/api/image.service';
import { ErrorService } from '../../../util/error-manager/error.service';
import { Logger } from '../../../services/logger/logger.service';
import { DialogService } from '../../../util/dialog-manager/dialog.service';
import { Album, AlbumsComponent } from '../albums.component';
import { StorageService, STORAGE_CONFIGS } from '../../../services/storage/storage.service';

// 常量定义
const API_LIMITS = {
  MAX_IMAGES_PER_REQUEST: 100, // API 限制最大 100
} as const;

@Component({
  selector: 'app-album-detail',
  templateUrl: './album-detail.component.html',
  styleUrls: ['./album-detail.component.scss'],
})
@AutoUnsubscribe()
export class AlbumDetailComponent implements OnInit {
  private readonly logger: Logger = new Logger(AlbumDetailComponent.name);

  album: Album | null = null;
  images: EImage[] = [];
  loading = false;
  editMode = false;
  editForm = { name: '', description: '' };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly imageService: ImageService,
    private readonly errorService: ErrorService,
    private readonly dialogService: DialogService,
    private readonly storageService: StorageService,
  ) {}

  ngOnInit() {
    const albumId = this.route.snapshot.paramMap.get('id');
    if (albumId) {
      this.loadAlbum(albumId);
    } else {
      this.router.navigate(['/albums']);
    }
  }

  async loadAlbum(albumId: string) {
    this.loading = true;
    try {
      const albums = AlbumsComponent.getAlbums();
      this.album = albums.find((a) => a.id === albumId) || null;

      if (!this.album) {
        this.errorService.error('相册不存在', this.logger);
        this.router.navigate(['/albums']);
        return;
      }

      // 加载相册中的图片
      await this.loadImages();
    } catch (error) {
      this.logger.error('Failed to load album:', error);
      this.errorService.error('加载相册失败', this.logger);
    } finally {
      this.loading = false;
    }
  }

  async loadImages() {
    if (!this.album || !this.album.imageIds?.length) {
      this.images = [];
      return;
    }

    try {
      // 创建图片 ID 到图片对象的映射
      const imageMap = new Map<string, EImage>();
      
      // 分页加载所有图片
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const result = await this.imageService.ListMyImages(API_LIMITS.MAX_IMAGES_PER_REQUEST, page);
        if (HasFailed(result)) {
          this.logger.warn('Failed to load images page', page, ':', result.getReason());
          break;
        }

        for (const img of result.results) {
          imageMap.set(img.id, img);
        }

        // 检查是否还有更多页
        hasMore = result.results.length === API_LIMITS.MAX_IMAGES_PER_REQUEST && page < result.pages - 1;
        page++;
        
        // 安全限制：最多加载 10 页
        if (page >= 10) break;
      }

      // 按相册中的顺序获取图片
      this.images = [];
      for (const imageId of this.album.imageIds) {
        const img = imageMap.get(imageId);
        if (img) {
          this.images.push(img);
        }
      }

      // 更新相册封面（使用第一张图片）
      if (this.images.length > 0) {
        this.updateAlbumCover(this.images[0]);
      }
    } catch (error) {
      this.logger.error('Failed to load images:', error);
      this.images = [];
    }
  }

  private updateAlbumCover(image: EImage) {
    if (!this.album) return;
    const coverUrl = this.imageService.GetImageURL(image.id, null, false, image.created);
    this.album.cover = coverUrl;
    this.saveAlbum();
  }

  getThumbnailUrl(image: EImage): string {
    return this.imageService.GetImageURL(image.id, null, false, image.created);
  }

  // 编辑相册
  startEdit() {
    if (!this.album) return;
    this.editForm = {
      name: this.album.name,
      description: this.album.description || '',
    };
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
  }

  saveEdit() {
    if (!this.album || !this.editForm.name.trim()) return;

    this.album.name = this.editForm.name.trim();
    this.album.description = this.editForm.description.trim();
    this.album.updated_at = Date.now();
    this.saveAlbum();
    this.editMode = false;
    this.errorService.success('相册已更新');
  }

  // 从相册移除图片
  async removeImage(image: EImage) {
    if (!this.album) return;

    const pressedButton = await this.dialogService.showDialog({
      title: '确定要从相册移除这张图片吗？',
      description: '图片不会被删除，只是从相册中移除。',
      buttons: [
        { name: 'cancel', text: '取消' },
        { color: 'warn', name: 'remove', text: '移除' },
      ],
    });

    if (pressedButton === 'remove') {
      this.album.imageIds = this.album.imageIds.filter((id) => id !== image.id);
      this.album.updated_at = Date.now();
      this.images = this.images.filter((img) => img.id !== image.id);

      // 更新封面
      if (this.images.length > 0) {
        this.updateAlbumCover(this.images[0]);
      } else {
        this.album.cover = undefined;
      }

      this.saveAlbum();
      this.errorService.success('已从相册移除');
    }
  }

  // 设为封面
  setAsCover(image: EImage) {
    this.updateAlbumCover(image);
    this.errorService.success('已设为相册封面');
  }

  // 删除相册
  async deleteAlbum() {
    if (!this.album) return;

    const pressedButton = await this.dialogService.showDialog({
      title: `确定要删除相册"${this.album.name}"吗？`,
      description: '此操作无法撤销，相册内的图片不会被删除。',
      buttons: [
        { name: 'cancel', text: '取消' },
        { color: 'warn', name: 'delete', text: '删除' },
      ],
    });

    if (pressedButton === 'delete') {
      const albums = AlbumsComponent.getAlbums().filter((a) => a.id !== this.album!.id);
      this.storageService.set(STORAGE_CONFIGS.ALBUMS, albums);
      this.errorService.success('相册已删除');
      this.router.navigate(['/albums']);
    }
  }

  private saveAlbum() {
    if (!this.album) return;
    const albums = AlbumsComponent.getAlbums();
    const index = albums.findIndex((a) => a.id === this.album!.id);
    if (index !== -1) {
      albums[index] = this.album;
      this.storageService.set(STORAGE_CONFIGS.ALBUMS, albums);
    }
  }

  goBack() {
    this.router.navigate(['/albums']);
  }

  viewImage(image: EImage) {
    this.router.navigate(['/view', image.id]);
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }
}
