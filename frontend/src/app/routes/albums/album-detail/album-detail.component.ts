import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe-decorator';
import { SupportedVideoFileTypes } from 'picsur-shared/dist/dto/mimes.dto';
import { EAlbum } from 'picsur-shared/dist/entities/album.entity';
import { EImage } from 'picsur-shared/dist/entities/image.entity';
import { HasFailed } from 'picsur-shared/dist/types/failable';
import { AlbumService } from '../../../services/api/album.service';
import { ImageService } from '../../../services/api/image.service';
import { ErrorService } from '../../../util/error-manager/error.service';
import { Logger } from '../../../services/logger/logger.service';
import { DialogService } from '../../../util/dialog-manager/dialog.service';

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

  album: EAlbum | null = null;
  images: EImage[] = [];
  loading = false;
  editMode = false;
  editForm = { name: '', description: '' };

  // 视频查看器状态
  viewerOpen = false;
  viewerImage: EImage | null = null;
  viewerIndex = 0;
  viewerVideoUrl = '';

  // 图片格式缓存
  private imageFormatCache = new Map<string, string>();
  // 视频类型缓存
  private videoTypeCache = new Map<string, boolean>();
  // 视频格式缓存
  private videoFormatCache = new Map<string, string>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly albumService: AlbumService,
    private readonly imageService: ImageService,
    private readonly errorService: ErrorService,
    private readonly dialogService: DialogService,
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
      const result = await this.albumService.listAlbums();
      if (HasFailed(result)) {
        this.errorService.showFailure(result, this.logger);
        this.router.navigate(['/albums']);
        return;
      }

      this.album = result.find((a) => a.id === albumId) || null;

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
    if (!this.album || !this.album.image_ids?.length) {
      this.images = [];
      return;
    }

    try {
      // 创建图片 ID 到图片对象的映射
      const imageMap = new Map<string, EImage>();

      // 分页加载所有图片（包括视频）
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const result = await this.imageService.ListMyImages(API_LIMITS.MAX_IMAGES_PER_REQUEST, page, 'all');
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
      for (const imageId of this.album.image_ids) {
        const img = imageMap.get(imageId);
        if (img) {
          this.images.push(img);
        }
      }
    } catch (error) {
      this.logger.error('Failed to load images:', error);
      this.images = [];
    }
  }

  private async updateAlbumCover(image: EImage) {
    if (!this.album) return;
    // 使用缩略图端点
    const coverUrl = `${this.imageService.getHostname()}/i/thumb/${image.id}`;

    const result = await this.albumService.updateAlbum(this.album.id, { cover_url: coverUrl });
    if (HasFailed(result)) {
      return this.errorService.showFailure(result, this.logger);
    }
    this.album = result;
  }

  getThumbnailUrl(image: EImage): string {
    // 统一使用缩略图端点
    return `${this.imageService.getHostname()}/i/thumb/${image.id}`;
  }

  // 常见的视频文件扩展名
  private readonly VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogv', '.m4v', '.3gp'];

  isVideoImage(image: EImage): boolean {
    if (this.videoTypeCache.has(image.id)) {
      return this.videoTypeCache.get(image.id)!;
    }

    // 优先通过文件名检测
    const fileName = image.file_name || '';
    const ext = fileName.toLowerCase().split('.').pop() || '';
    const extBased = this.VIDEO_EXTENSIONS.includes('.' + ext);
    if (extBased) {
      this.videoTypeCache.set(image.id, true);
      return true;
    }

    // 通过缓存的格式信息检测
    const cachedFormat = this.imageFormatCache.get(image.id);
    if (cachedFormat) {
      const isVideo = SupportedVideoFileTypes.includes(cachedFormat);
      this.videoTypeCache.set(image.id, isVideo);
      return isVideo;
    }

    return false;
  }

  // 异步检测是否为视频
  async checkIsVideo(imageId: string): Promise<boolean> {
    if (this.videoTypeCache.has(imageId)) {
      return this.videoTypeCache.get(imageId)!;
    }

    try {
      const meta = await this.imageService.GetImageMeta(imageId);
      if (HasFailed(meta)) {
        return false;
      }

      const format = meta.fileTypes?.master || '';
      const isVideo = SupportedVideoFileTypes.includes(format);
      this.videoTypeCache.set(imageId, isVideo);
      this.imageFormatCache.set(imageId, format);
      return isVideo;
    } catch {
      return false;
    }
  }

  // 获取图片格式
  private async getImageFormat(imageId: string): Promise<string> {
    if (this.imageFormatCache.has(imageId)) {
      return this.imageFormatCache.get(imageId)!;
    }

    try {
      const meta = await this.imageService.GetImageMeta(imageId);
      if (HasFailed(meta)) {
        return '';
      }

      const format = meta.fileTypes?.master || meta.fileTypes?.original || '';
      this.imageFormatCache.set(imageId, format);
      return format;
    } catch {
      return '';
    }
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

  async saveEdit() {
    if (!this.album || !this.editForm.name.trim()) return;

    const result = await this.albumService.updateAlbum(this.album.id, {
      name: this.editForm.name.trim(),
      description: this.editForm.description.trim() || undefined,
    });

    if (HasFailed(result)) {
      return this.errorService.showFailure(result, this.logger);
    }

    this.album = result;
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
      const result = await this.albumService.removeImagesFromAlbum(this.album!.id, [image.id]);
      if (HasFailed(result)) {
        return this.errorService.showFailure(result, this.logger);
      }

      this.album = result;
      this.images = this.images.filter((img) => img.id !== image.id);
      this.errorService.success('已从相册移除');
    }
  }

  // 设为封面
  async setAsCover(image: EImage) {
    await this.updateAlbumCover(image);
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
      const result = await this.albumService.deleteAlbum(this.album!.id);
      if (HasFailed(result)) {
        return this.errorService.showFailure(result, this.logger);
      }

      this.errorService.success('相册已删除');
      this.router.navigate(['/albums']);
    }
  }

  private saveAlbum() {
    // 不再需要，因为数据存储在后端
  }

  goBack() {
    this.router.navigate(['/albums']);
  }

  // 处理点击事件：图片打开查看器，视频打开播放器
  async handleItemClick(image: EImage) {
    const isVideo = await this.checkIsVideo(image.id);
    if (isVideo) {
      this.openVideoViewer(image);
    } else {
      this.router.navigate(['/view', image.id]);
    }
  }

  // 打开视频查看器
  async openVideoViewer(image: EImage) {
    this.viewerImage = image;
    this.viewerIndex = this.images.findIndex((img) => img.id === image.id);
    this.viewerOpen = true;
    document.body.style.overflow = 'hidden';
    // 获取视频 URL
    this.viewerVideoUrl = await this.getMediaUrl(image);
  }

  closeViewer() {
    this.viewerOpen = false;
    this.viewerImage = null;
    this.viewerVideoUrl = '';
    document.body.style.overflow = '';
  }

  async viewerPrev() {
    if (this.images.length === 0) return;
    this.viewerIndex = (this.viewerIndex - 1 + this.images.length) % this.images.length;
    this.viewerImage = this.images[this.viewerIndex];
    this.viewerVideoUrl = await this.getMediaUrl(this.viewerImage);
  }

  async viewerNext() {
    if (this.images.length === 0) return;
    this.viewerIndex = (this.viewerIndex + 1) % this.images.length;
    this.viewerImage = this.images[this.viewerIndex];
    this.viewerVideoUrl = await this.getMediaUrl(this.viewerImage);
  }

  // 获取视频的正确格式 URL
  async getMediaUrl(image: EImage): Promise<string> {
    let format = this.videoFormatCache.get(image.id);
    if (!format) {
      format = await this.getVideoFormat(image.id);
    }
    return this.imageService.GetImageURL(image.id, format, false, image.created);
  }

  private async getVideoFormat(imageId: string): Promise<string> {
    if (this.videoFormatCache.has(imageId)) {
      return this.videoFormatCache.get(imageId)!;
    }

    try {
      const meta = await this.imageService.GetImageMeta(imageId);
      if (HasFailed(meta)) {
        return 'video:mp4';
      }
      const format = meta.fileTypes?.master || 'video:mp4';
      this.videoFormatCache.set(imageId, format);
      return format;
    } catch {
      return 'video:mp4';
    }
  }

  viewImage(image: EImage) {
    this.router.navigate(['/view', image.id]);
  }

  formatDate(timestamp: Date | number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.classList.add('image-error');
    }
  }

  onImageLoad(image: EImage, event: Event) {
    if (!this.videoTypeCache.has(image.id)) {
      this.checkIsVideo(image.id);
    }
  }

  getOverlayIcon(image: EImage): string {
    if (this.videoTypeCache.get(image.id)) {
      return 'play_circle_filled';
    }
    return 'visibility';
  }

  // ========== 键盘事件 ==========
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.viewerOpen) {
        this.closeViewer();
        return;
      }
    }

    if (!this.viewerOpen) return;
    if (event.key === 'ArrowLeft') this.viewerPrev();
    if (event.key === 'ArrowRight') this.viewerNext();
  }

  @HostListener('document:click')
  onDocumentClick() {
    // 可选：点击背景关闭查看器
  }
}
