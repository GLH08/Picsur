import { Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe-decorator';
import { SupportedVideoFileTypes } from 'picsur-shared/dist/dto/mimes.dto';
import { EImage } from 'picsur-shared/dist/entities/image.entity';
import { HasFailed } from 'picsur-shared/dist/types/failable';
import { ImageListRequest } from 'picsur-shared/dist/dto/api/image-manage.dto';
import { ImageService } from '../../services/api/image.service';
import { UserService } from '../../services/api/user.service';
import { Logger } from '../../services/logger/logger.service';
import { BSScreenSize, BootstrapService } from '../../util/bootstrap.service';
import { DialogService } from '../../util/dialog-manager/dialog.service';
import { ErrorService } from '../../util/error-manager/error.service';
import { MatDialog } from '@angular/material/dialog';
import { ShareDialogComponent, ShareDialogData } from '../../components/share-dialog/share-dialog.component';
import { StorageService, STORAGE_CONFIGS } from '../../services/storage/storage.service';
import { AlbumPickerComponent, AlbumPickerData } from '../../components/album-picker/album-picker.component';

interface VideoGroup {
  title: string;
  videos: EImage[];
  collapsed: boolean;
}

// 常量定义
const VIEWER_ZOOM = {
  DEFAULT: 100,
  MIN: 25,
  MAX: 300,
  STEP: 25,
} as const;

const CONTEXT_MENU = {
  WIDTH: 200,
  HEIGHT: 420,
  MARGIN: 10,
} as const;

@Component({
  templateUrl: './videos.component.html',
  styleUrls: ['./videos.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class VideosComponent implements OnInit {
  private readonly logger: Logger = new Logger(VideosComponent.name);

  videosSub: EImage[] | null = null;
  columns = 1;

  // 视频查看器状态
  viewerOpen = false;
  viewerVideo: EImage | null = null;
  viewerIndex = 0;
  viewerZoom = 100;

  // 标签管理面板状态
  tagPanelOpen = false;
  tagPanelVideo: EImage | null = null;
  tagEditMode = false;
  tagEditValue = '';

  // 选择模式
  selectionMode = false;
  selectedIds = new Set<string>();
  lastSelectedId: string | null = null;

  // 搜索
  searchQuery = '';
  searchActive = false;

  // 右键菜单
  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuVideo: EImage | null = null;

  // 视频格式缓存
  private videoFormatCache = new Map<string, string>();

  public get videos(): EImage[] | null {
    const value = this.videosSub;
    let filtered =
      value?.filter(
        (i: EImage) => i.expires_at === null || i.expires_at > new Date(),
      ) ?? null;

    if (filtered && this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (vid: EImage) =>
          vid.file_name?.toLowerCase().includes(query) ||
          vid.id?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }

  public get groupedVideos(): VideoGroup[] {
    const videos = this.videos;
    if (!videos || videos.length === 0) return [];

    // 按日期分组
    const groups = new Map<string, EImage[]>();

    videos.forEach((video: EImage) => {
      const created = new Date(video.created);
      const dateKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(video);
    });

    // 转换为数组并按日期降序排序
    const result: VideoGroup[] = [];
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

    sortedKeys.forEach((dateKey) => {
      const [year, month, day] = dateKey.split('-');
      const title = `${year}/${month}/${day}`;

      result.push({
        title,
        videos: groups.get(dateKey)!,
        collapsed: false,
      });
    });

    return result;
  }

  page = 1;
  pages = 1;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly bootstrapService: BootstrapService,
    private readonly userService: UserService,
    private readonly imageService: ImageService,
    private readonly errorService: ErrorService,
    private readonly dialogService: DialogService,
    private readonly dialog: MatDialog,
    private readonly storageService: StorageService,
  ) {}

  ngOnInit() {
    this.load().catch((e) => this.logger.error(e));
  }

  private async load() {
    const params = this.route.snapshot.paramMap;
    let thispage = Number(params.get('page') ?? '');
    if (isNaN(thispage) || thispage <= 0) thispage = 1;
    this.page = thispage;

    this.subscribeMobile();
    this.subscribeUser();
  }

  @AutoUnsubscribe()
  private subscribeMobile() {
    const userSettings = this.storageService.get<{ gridColumns?: number }>(STORAGE_CONFIGS.USER_SETTINGS);
    const userColumns = userSettings?.gridColumns || 4;

    return this.bootstrapService.screenSize().subscribe((size: BSScreenSize) => {
      if (size <= BSScreenSize.sm) {
        this.columns = Math.max(2, Math.min(userColumns, 3));
      } else if (size <= BSScreenSize.lg) {
        this.columns = Math.min(userColumns, 4);
      } else {
        this.columns = userColumns;
      }
    });
  }

  @AutoUnsubscribe()
  private subscribeUser() {
    return this.userService.live.subscribe(async (user: any) => {
      if (user === null) {
        this.videosSub = [];
        return;
      }

      try {
        // 使用 ListMyVideos 获取当前用户的视频
        const list = await this.imageService.ListMyVideos(48, this.page - 1);
        if (HasFailed(list)) {
          this.logger.warn(list.getReason());
          this.videosSub = [];
          return;
        }

        this.pages = list.pages;
        this.videosSub = list.results;
      } catch (error) {
        this.logger.error('Failed to load videos:', error);
        this.videosSub = [];
      }
    });
  }

  getThumbnailUrl(video: EImage): string {
    // 使用专用缩略图端点
    return `${this.imageService.getHostname()}/i/thumb/${video.id}`;
  }

  getVideoUrl(video: EImage): string {
    const format = this.getVideoFormat(video.id);
    return this.imageService.GetImageURL(video.id, format, false, video.created);
  }

  private getVideoFormat(videoId: string): string {
    if (this.videoFormatCache.has(videoId)) {
      return this.videoFormatCache.get(videoId)!;
    }
    // 默认返回 mp4，会在获取元数据后更新
    return 'video:mp4';
  }

  async getVideoFormatAsync(videoId: string): Promise<string> {
    if (this.videoFormatCache.has(videoId)) {
      return this.videoFormatCache.get(videoId)!;
    }

    try {
      const meta = await this.imageService.GetImageMeta(videoId);
      if (HasFailed(meta)) {
        return 'video:mp4';
      }
      const format = meta.fileTypes?.master || 'video:mp4';
      this.videoFormatCache.set(videoId, format);
      return format;
    } catch {
      return 'video:mp4';
    }
  }

  // ========== 视频查看器 ==========
  openViewer(video: EImage) {
    this.viewerVideo = video;
    this.viewerIndex = this.videos?.findIndex((v) => v.id === video.id) ?? 0;
    this.viewerOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewer() {
    this.viewerOpen = false;
    this.viewerVideo = null;
    document.body.style.overflow = '';
  }

  viewerPrev() {
    if (!this.videos || this.videos.length === 0) return;
    this.viewerIndex = (this.viewerIndex - 1 + this.videos.length) % this.videos.length;
    this.viewerVideo = this.videos[this.viewerIndex];
  }

  viewerNext() {
    if (!this.videos || this.videos.length === 0) return;
    this.viewerIndex = (this.viewerIndex + 1) % this.videos.length;
    this.viewerVideo = this.videos[this.viewerIndex];
  }

  // ========== 标签管理 ==========
  openTagPanel(video: EImage) {
    this.tagPanelVideo = video;
    this.tagPanelOpen = true;
    this.tagEditMode = false;
    this.tagEditValue = video.file_name || '';
  }

  closeTagPanel() {
    this.tagPanelOpen = false;
    this.tagPanelVideo = null;
    this.tagEditMode = false;
    this.tagEditValue = '';
  }

  startTagEdit() {
    this.tagEditMode = true;
    this.tagEditValue = this.tagPanelVideo?.file_name || '';
  }

  cancelTagEdit() {
    this.tagEditMode = false;
    this.tagEditValue = this.tagPanelVideo?.file_name || '';
  }

  async saveTag() {
    if (!this.tagPanelVideo) return;

    const newTag = this.tagEditValue.trim();
    const result = await this.imageService.UpdateImage(this.tagPanelVideo.id, {
      file_name: newTag || '',
    });

    if (HasFailed(result)) {
      this.errorService.showFailure(result, this.logger);
    } else {
      this.errorService.success('标签已保存');
      this.tagPanelVideo.file_name = newTag || '';
      this.tagEditMode = false;
      this.videosSub = [...(this.videosSub || [])];
    }
  }

  async deleteTag() {
    if (!this.tagPanelVideo) return;

    const result = await this.imageService.UpdateImage(this.tagPanelVideo.id, {
      file_name: '',
    });

    if (HasFailed(result)) {
      this.errorService.showFailure(result, this.logger);
    } else {
      this.errorService.success('标签已删除');
      this.tagPanelVideo.file_name = '';
      this.tagEditValue = '';
      this.tagEditMode = false;
      this.videosSub = [...(this.videosSub || [])];
    }
  }

  hasTag(video: EImage): boolean {
    return !!video.file_name && video.file_name.trim().length > 0;
  }

  // ========== 键盘事件 ==========
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.contextMenuVisible) {
        this.closeContextMenu();
        return;
      }
      if (this.tagPanelOpen) {
        this.closeTagPanel();
        return;
      }
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
    if (this.contextMenuVisible) {
      this.closeContextMenu();
    }
  }

  // ========== 视频操作 ==========
  async deleteVideo(video: EImage, event?: Event) {
    event?.stopPropagation();

    const pressedButton = await this.dialogService.showDialog({
      title: `确定要删除这个视频吗？`,
      description: '此操作无法撤销。',
      buttons: [
        { name: 'cancel', text: '取消' },
        { color: 'warn', name: 'delete', text: '删除' },
      ],
    });

    if (pressedButton === 'delete') {
      const result = await this.imageService.DeleteImage(video.id ?? '');
      if (HasFailed(result))
        return this.errorService.showFailure(result, this.logger);

      this.errorService.success('视频已删除');
      this.videosSub = this.videos?.filter((v) => v.id !== video.id) ?? null;

      if (this.viewerOpen && this.viewerVideo?.id === video.id) {
        this.closeViewer();
      }
    }
  }

  toggleGroup(group: VideoGroup) {
    group.collapsed = !group.collapsed;
  }

  gotoPage(page: number) {
    this.router.navigate(['/videos', page]).then(() => {
      this.load().catch((e) => this.logger.error(e));
    });
  }

  // ========== 选择模式 ==========
  toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) {
      this.selectedIds.clear();
      this.lastSelectedId = null;
    }
  }

  handleVideoClick(video: EImage, event: MouseEvent) {
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
      if (!this.selectionMode) {
        this.selectionMode = true;
      }
      this.toggleSelect(video);
      this.lastSelectedId = video.id;
      return;
    }

    if (event.shiftKey && this.lastSelectedId && this.selectionMode) {
      this.selectRange(this.lastSelectedId, video.id);
      return;
    }

    if (this.selectionMode) {
      this.toggleSelect(video);
      this.lastSelectedId = video.id;
    } else {
      this.openViewer(video);
    }
  }

  private selectRange(startId: string, endId: string) {
    const videos = this.videos;
    if (!videos) return;

    const startIndex = videos.findIndex((vid) => vid.id === startId);
    const endIndex = videos.findIndex((vid) => vid.id === endId);

    if (startIndex === -1 || endIndex === -1) return;

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    for (let i = minIndex; i <= maxIndex; i++) {
      this.selectedIds.add(videos[i].id);
    }
  }

  toggleSelect(video: EImage, event?: Event) {
    event?.stopPropagation();
    if (this.selectedIds.has(video.id)) {
      this.selectedIds.delete(video.id);
    } else {
      this.selectedIds.add(video.id);
    }
    this.lastSelectedId = video.id;
  }

  isSelected(video: EImage): boolean {
    return this.selectedIds.has(video.id);
  }

  selectAll() {
    this.videos?.forEach((vid) => this.selectedIds.add(vid.id));
  }

  deselectAll() {
    this.selectedIds.clear();
    this.lastSelectedId = null;
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  async deleteSelected() {
    if (this.selectedIds.size === 0) return;

    const pressedButton = await this.dialogService.showDialog({
      title: `确定要删除选中的 ${this.selectedIds.size} 个视频吗？`,
      description: '此操作无法撤销。',
      buttons: [
        { name: 'cancel', text: '取消' },
        { color: 'warn', name: 'delete', text: '删除' },
      ],
    });

    if (pressedButton === 'delete') {
      const ids = Array.from(this.selectedIds);
      const result = await this.imageService.DeleteImages(ids);
      if (HasFailed(result)) {
        return this.errorService.showFailure(result, this.logger);
      }

      this.errorService.success(`已删除 ${result.images.length} 个视频`);
      this.videosSub = this.videos?.filter((v) => !this.selectedIds.has(v.id)) ?? null;
      this.selectedIds.clear();
      this.selectionMode = false;
    }
  }

  // ========== 搜索 ==========
  toggleSearch() {
    this.searchActive = !this.searchActive;
    if (!this.searchActive) {
      this.searchQuery = '';
    }
  }

  onSearchChange(query: string) {
    this.searchQuery = query;
  }

  clearSearch() {
    this.searchQuery = '';
  }

  get filteredCount(): number {
    return this.videos?.length ?? 0;
  }

  get totalCount(): number {
    return this.videosSub?.filter(
      (i: EImage) => i.expires_at === null || i.expires_at > new Date(),
    ).length ?? 0;
  }

  onVideoError(event: Event) {
    const video = event.target as HTMLVideoElement;
    video.style.display = 'none';
  }

  // ========== 右键菜单 ==========
  openContextMenu(event: MouseEvent, video: EImage) {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuVideo = video;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = event.clientX;
    let y = event.clientY;

    if (x + CONTEXT_MENU.WIDTH > viewportWidth) {
      x = viewportWidth - CONTEXT_MENU.WIDTH - CONTEXT_MENU.MARGIN;
    }

    if (y + CONTEXT_MENU.HEIGHT > viewportHeight) {
      y = viewportHeight - CONTEXT_MENU.HEIGHT - CONTEXT_MENU.MARGIN;
    }

    x = Math.max(CONTEXT_MENU.MARGIN, x);
    y = Math.max(CONTEXT_MENU.MARGIN, y);

    this.contextMenuX = x;
    this.contextMenuY = y;
    this.contextMenuVisible = true;
  }

  closeContextMenu() {
    this.contextMenuVisible = false;
    this.contextMenuVideo = null;
  }

  async copyVideoUrl() {
    if (!this.contextMenuVideo) return;
    const video = this.contextMenuVideo;
    const format = await this.getVideoFormatAsync(video.id);
    const url = this.imageService.GetImageURL(video.id, format, true, video.created);
    await this.copyToClipboard(url, '视频链接已复制');
    this.closeContextMenu();
  }

  async shareVideo() {
    if (!this.contextMenuVideo) return;

    const video = this.contextMenuVideo;
    const format = await this.getVideoFormatAsync(video.id);
    const videoUrl = this.imageService.GetImageURL(video.id, format, true, video.created);

    this.dialog.open(ShareDialogComponent, {
      data: {
        image: video,
        imageUrl: videoUrl,
        isVideo: true,
        videoFormat: format,
      } as ShareDialogData,
      panelClass: 'share-dialog-panel',
    });

    this.closeContextMenu();
  }

  async addVideoToAlbum() {
    if (!this.contextMenuVideo) return;

    const video = this.contextMenuVideo;
    const format = await this.getVideoFormatAsync(video.id);
    const videoUrl = this.imageService.GetImageURL(video.id, format, true, video.created);

    this.dialog.open(AlbumPickerComponent, {
      data: {
        imageId: video.id,
        imageName: video.file_name || '未命名视频',
        imageUrl: videoUrl,
      } as AlbumPickerData,
      panelClass: 'album-picker-panel',
    });

    this.closeContextMenu();
  }

  manageTagFromMenu() {
    if (!this.contextMenuVideo) return;
    this.openTagPanel(this.contextMenuVideo);
    this.closeContextMenu();
  }

  private async copyToClipboard(text: string, successMsg: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.errorService.success(successMsg);
    } catch {
      this.errorService.info('复制失败，请手动复制');
    }
  }

  viewVideoDetails() {
    if (!this.contextMenuVideo) return;
    this.router.navigate(['/view', this.contextMenuVideo.id]);
    this.closeContextMenu();
  }

  async deleteContextVideo() {
    if (!this.contextMenuVideo) return;
    await this.deleteVideo(this.contextMenuVideo);
    this.closeContextMenu();
  }
}
