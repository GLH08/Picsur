import { Component, HostListener, OnInit, ViewChild, ElementRef, ViewEncapsulation, TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe-decorator';
import {
  ImageFileType,
  SupportedVideoFileTypes,
} from 'picsur-shared/dist/dto/mimes.dto';
import { EImage } from 'picsur-shared/dist/entities/image.entity';
import { HasFailed } from 'picsur-shared/dist/types/failable';
import {
  BehaviorSubject,
  Observable,
  filter,
  map,
  merge,
  switchMap,
  timer,
} from 'rxjs';
import { ImageService } from '../../services/api/image.service';
import { UserService } from '../../services/api/user.service';
import { Logger } from '../../services/logger/logger.service';
import { BSScreenSize, BootstrapService } from '../../util/bootstrap.service';
import { DialogService } from '../../util/dialog-manager/dialog.service';
import { ErrorService } from '../../util/error-manager/error.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ShareDialogComponent, ShareDialogData } from '../../components/share-dialog/share-dialog.component';
import { AlbumPickerComponent, AlbumPickerData } from '../../components/album-picker/album-picker.component';
import { StorageService, STORAGE_CONFIGS } from '../../services/storage/storage.service';

interface ImageGroup {
  key: string;
  title: string;
  images: EImage[];
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
  templateUrl: './images.component.html',
  styleUrls: ['./images.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ImagesComponent implements OnInit {
  private readonly logger: Logger = new Logger(ImagesComponent.name);

  imagesSub = new BehaviorSubject<EImage[] | null>(null);
  columns = 1;

  // 图片查看器状态
  viewerOpen = false;
  viewerImage: EImage | null = null;
  viewerIndex = 0;
  viewerZoom = 100;

  // 图片平移状态
  isPanning = false;
  panStartX = 0;
  panStartY = 0;
  panOffsetX = 0;
  panOffsetY = 0;
  private imageLoaded = false;

  // 标签管理面板状态
  tagPanelOpen = false;
  tagPanelImage: EImage | null = null;
  tagEditMode = false;
  tagEditValue = '';

  // 选择模式
  selectionMode = false;
  selectedIds = new Set<string>();
  lastSelectedId: string | null = null; // 记录最后选择的图片，用于 Shift 连续选择
  private readonly collapsedGroupKeys = new Set<string>();

  // 搜索
  searchQuery = '';
  searchActive = false;

  // 右键菜单
  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuImage: EImage | null = null;
  @ViewChild('contextMenu') contextMenuRef: ElementRef<HTMLElement> | null = null;

  @ViewChild('viewerTemplate') viewerTemplate!: TemplateRef<any>;
  private dialogRef: MatDialogRef<any> | null = null;

  // 图片格式缓存
  private imageFormatCache = new Map<string, string>();

  // 视频类型缓存
  private videoTypeCache = new Map<string, boolean>();

  // 常见的视频文件扩展名
  private readonly VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogv', '.m4v', '.3gp'];

  public get images(): EImage[] | null {
    const value = this.imagesSub.value;
    let filtered =
      value?.filter(
        (i: EImage) => i.expires_at === null || i.expires_at > new Date(),
      ) ?? null;

    if (filtered && this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (img: EImage) =>
          img.file_name?.toLowerCase().includes(query) ||
          img.id?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }

  public get groupedImages(): ImageGroup[] {
    const images = this.images;
    if (!images || images.length === 0) return [];

    const groups = new Map<string, EImage[]>();

    images.forEach((image: EImage) => {
      const created = new Date(image.created);
      const dateKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(image);
    });

    return Array.from(groups.keys())
      .sort((a, b) => b.localeCompare(a))
      .map((dateKey) => {
        const [year, month, day] = dateKey.split('-');

        return {
          key: dateKey,
          title: `${year}/${month}/${day}`,
          images: groups.get(dateKey)!,
          collapsed: this.collapsedGroupKeys.has(dateKey),
        };
      });
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
    this.subscribeImages();
  }

  @AutoUnsubscribe()
  private subscribeMobile() {
    // 获取用户设置的列数
    const userSettings = this.storageService.get<{ gridColumns?: number }>(STORAGE_CONFIGS.USER_SETTINGS);
    const userColumns = userSettings?.gridColumns || 4;

    return this.bootstrapService.screenSize().subscribe((size: BSScreenSize) => {
      if (size <= BSScreenSize.sm) {
        // 小屏幕最多显示用户设置的一半，最少 2 列
        this.columns = Math.max(2, Math.min(userColumns, 3));
      } else if (size <= BSScreenSize.lg) {
        // 中等屏幕显示用户设置的列数，最多 4 列
        this.columns = Math.min(userColumns, 4);
      } else {
        // 大屏幕显示用户设置的列数
        this.columns = userColumns;
      }
    });
  }

  @AutoUnsubscribe()
  private subscribeUser() {
    return this.userService.live.subscribe(async (user: any) => {
      if (user === null) {
        this.imagesSub.next([]);
        return;
      }

      try {
        // 只获取图片，排除视频
        const list = await this.imageService.ListMyImagesOnly(48, this.page - 1);
        if (HasFailed(list)) {
          this.logger.warn(list.getReason());
          this.imagesSub.next([]);
          return;
        }

        this.pages = list.pages;
        this.imagesSub.next(list.results);
      } catch (error) {
        this.logger.error('Failed to load images:', error);
        this.imagesSub.next([]);
      }
    });
  }

  @AutoUnsubscribe()
  private subscribeImages() {
    const filteredImagesSub: Observable<EImage[]> = this.imagesSub.pipe(
      filter((images: EImage[] | null) => images !== null),
    ) as Observable<EImage[]>;

    const mappedImagesSub: Observable<EImage> = filteredImagesSub.pipe(
      switchMap((images: EImage[]) =>
        merge(
          ...images
            .filter((i: EImage) => i.expires_at !== null)
            .map((i: EImage) => timer(i.expires_at ?? new Date(0)).pipe(map(() => i))),
        ),
      ),
    ) as Observable<EImage>;

    return mappedImagesSub.subscribe((image: EImage) => {
      this.imagesSub.next(
        this.images?.filter((i) => i.id !== image.id) ?? null,
      );
    });
  }

  getThumbnailUrl(image: EImage) {
    return this.imageService.GetImageURL(image.id, null, false, image.created);
  }

  // 检测是否为视频文件（通过文件名扩展名）
  isVideoItem(image: EImage): boolean {
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

    // 默认返回 false，未知格式会在获取元数据后更新
    return false;
  }

  // 检查是否为视频（用于需要精确判断的场景）
  async checkIsVideo(imageId: string): Promise<boolean> {
    if (this.videoTypeCache.has(imageId)) {
      return this.videoTypeCache.get(imageId)!;
    }

    const format = await this.getImageFormat(imageId);
    const isVideo = SupportedVideoFileTypes.includes(format);
    this.videoTypeCache.set(imageId, isVideo);
    return isVideo;
  }

  getFullImageUrl(image: EImage) {
    return this.imageService.GetImageURL(image.id, null, false, image.created);
  }

  // 获取图片/视频的正确格式 URL
  async getMediaUrl(image: EImage): Promise<string> {
    const format = await this.getImageFormat(image.id);
    // 如果是视频格式，直接返回主格式的 URL
    if (SupportedVideoFileTypes.includes(format)) {
      return this.imageService.GetImageURL(image.id, format, false, image.created);
    }
    // 图片使用请求的格式
    return this.imageService.GetImageURL(image.id, format, false, image.created);
  }

  // 获取图片原始格式
  private async getImageFormat(imageId: string): Promise<string> {
    // 检查缓存
    if (this.imageFormatCache.has(imageId)) {
      return this.imageFormatCache.get(imageId) || ImageFileType.JPEG;
    }

    try {
      // 获取图片元数据
      const meta = await this.imageService.GetImageMeta(imageId);
      if (HasFailed(meta)) {
        this.logger.warn('Failed to get image meta:', meta.getReason());
        return ImageFileType.JPEG;
      }

      // fileTypes.master 包含原始格式，如 'image:png', 'image:jpeg' 等
      const format = meta.fileTypes?.master || meta.fileTypes?.original;
      if (format) {
        this.imageFormatCache.set(imageId, format);
        return format;
      }
      return ImageFileType.JPEG;
    } catch (error) {
      this.logger.error('Error getting image format:', error);
      return ImageFileType.JPEG;
    }
  }


  // ========== 图片查看器 ==========
  openViewer(image: EImage) {
    this.viewerImage = image;
    this.viewerIndex = this.images?.findIndex((i) => i.id === image.id) ?? 0;
    this.viewerOpen = true;
    this.viewerZoom = VIEWER_ZOOM.DEFAULT;
    this.panOffsetX = 0;
    this.panOffsetY = 0;
    this.imageLoaded = false;
    document.body.style.overflow = 'hidden';

    // Fix containing block issues by wrapping the fullscreen overlay in a cdk-overlay portal using MatDialog
    if (this.viewerTemplate && !this.dialogRef) {
      this.dialogRef = this.dialog.open(this.viewerTemplate, {
        panelClass: 'picsur-viewer-overlay-dialog',
        hasBackdrop: false,
        disableClose: true,
        maxWidth: '100vw',
        maxHeight: '100vh',
        width: '100vw',
        height: '100vh',
        autoFocus: false
      });
    }
  }

  onViewerImageLoad(event: Event) {
    this.imageLoaded = true;
  }

  getViewerImageStyle(): Record<string, string> {
    const zoom = this.viewerZoom / 100;
    // Centering is handled by the flex container (.photo-viewer-container)
    // Translate in screen space first (divide by zoom), then apply zoom scale
    // This makes the screen drag offset track the mouse pointer 1:1 regardless of zoom level
    return {
      transform: `scale(${zoom}) translate(${this.panOffsetX / zoom}px, ${this.panOffsetY / zoom}px)`,
      transformOrigin: 'center center',
      cursor: this.isPanning ? 'grabbing' : 'grab',
      userSelect: 'none'
    };
  }

  // ========== 图片平移 ==========
  onPanStart(event: MouseEvent) {
    if (this.viewerZoom <= 100) return; // 只在放大时允许拖动
    this.isPanning = true;
    this.panStartX = event.clientX - this.panOffsetX;
    this.panStartY = event.clientY - this.panOffsetY;
  }

  onPanMove(event: MouseEvent) {
    if (!this.isPanning) return;
    event.preventDefault();
    this.panOffsetX = event.clientX - this.panStartX;
    this.panOffsetY = event.clientY - this.panStartY;
  }

  onPanEnd() {
    this.isPanning = false;
  }

  closeViewer() {
    this.viewerOpen = false;
    this.viewerImage = null;
    this.viewerZoom = VIEWER_ZOOM.DEFAULT;
    this.panOffsetX = 0;
    this.panOffsetY = 0;
    document.body.style.overflow = '';
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }

  viewerPrev() {
    if (!this.images || this.images.length === 0) return;
    this.viewerIndex = (this.viewerIndex - 1 + this.images.length) % this.images.length;
    this.viewerImage = this.images[this.viewerIndex];
    this.viewerZoom = VIEWER_ZOOM.DEFAULT;
    this.panOffsetX = 0;
    this.panOffsetY = 0;
  }

  viewerNext() {
    if (!this.images || this.images.length === 0) return;
    this.viewerIndex = (this.viewerIndex + 1) % this.images.length;
    this.viewerImage = this.images[this.viewerIndex];
    this.viewerZoom = VIEWER_ZOOM.DEFAULT;
    this.panOffsetX = 0;
    this.panOffsetY = 0;
  }

  viewerZoomIn() {
    if (this.viewerZoom < VIEWER_ZOOM.MAX) this.viewerZoom += VIEWER_ZOOM.STEP;
  }

  viewerZoomOut() {
    if (this.viewerZoom > VIEWER_ZOOM.MIN) {
      this.viewerZoom -= VIEWER_ZOOM.STEP;
      if (this.viewerZoom <= 100) {
        this.panOffsetX = 0;
        this.panOffsetY = 0;
      }
    }
  }

  viewerResetZoom() {
    this.viewerZoom = VIEWER_ZOOM.DEFAULT;
    this.panOffsetX = 0;
    this.panOffsetY = 0;
  }

  onViewerWheel(event: WheelEvent) {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.viewerZoomIn();
    } else {
      this.viewerZoomOut();
    }
  }

  // ========== 标签管理面板 ==========
  openTagPanel(image: EImage) {
    this.tagPanelImage = image;
    this.tagPanelOpen = true;
    this.tagEditMode = false;
    this.tagEditValue = image.file_name || '';
  }

  closeTagPanel() {
    this.tagPanelOpen = false;
    this.tagPanelImage = null;
    this.tagEditMode = false;
    this.tagEditValue = '';
  }

  startTagEdit() {
    this.tagEditMode = true;
    this.tagEditValue = this.tagPanelImage?.file_name || '';
  }

  cancelTagEdit() {
    this.tagEditMode = false;
    this.tagEditValue = this.tagPanelImage?.file_name || '';
  }

  async saveTag() {
    if (!this.tagPanelImage) return;
    
    const newTag = this.tagEditValue.trim();
    const result = await this.imageService.UpdateImage(this.tagPanelImage.id, {
      file_name: newTag || '',
    });

    if (HasFailed(result)) {
      this.errorService.showFailure(result, this.logger);
    } else {
      this.errorService.success('标签已保存');
      this.tagPanelImage.file_name = newTag || '';
      this.tagEditMode = false;
      this.imagesSub.next([...(this.imagesSub.value || [])]);
    }
  }

  async deleteTag() {
    if (!this.tagPanelImage) return;

    const result = await this.imageService.UpdateImage(this.tagPanelImage.id, {
      file_name: '',
    });

    if (HasFailed(result)) {
      this.errorService.showFailure(result, this.logger);
    } else {
      this.errorService.success('标签已删除');
      this.tagPanelImage.file_name = '';
      this.tagEditValue = '';
      this.tagEditMode = false;
      this.imagesSub.next([...(this.imagesSub.value || [])]);
    }
  }

  hasTag(image: EImage): boolean {
    return !!image.file_name && image.file_name.trim().length > 0;
  }

  // ========== 键盘事件 ==========
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    // Escape 键处理
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
      // 退出选择模式
      if (this.selectionMode) {
        this.toggleSelectionMode();
        return;
      }
    }

    // Ctrl+A 全选（仅在选择模式下）
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      if (this.selectionMode && !this.viewerOpen) {
        event.preventDefault();
        this.selectAll();
        return;
      }
    }

    // Delete 键删除选中图片
    if (event.key === 'Delete' && this.selectionMode && this.selectedCount > 0) {
      event.preventDefault();
      this.deleteSelected();
      return;
    }

    // 图片查看器快捷键
    if (!this.viewerOpen) return;
    if (event.key === 'ArrowLeft') this.viewerPrev();
    if (event.key === 'ArrowRight') this.viewerNext();
    if (event.key === '+' || event.key === '=') this.viewerZoomIn();
    if (event.key === '-') this.viewerZoomOut();
    if (event.key === '0') this.viewerResetZoom();
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.contextMenuVisible) {
      this.closeContextMenu();
    }
  }

  // ========== 图片操作 ==========
  viewImage(image: EImage) {
    this.router.navigate(['/view', image.id]);
  }

  async deleteImage(image: EImage, event?: Event) {
    event?.stopPropagation();

    if (this.contextMenuVisible) {
      this.closeContextMenu();
    }

    const pressedButton = await this.dialogService.showDialog({
      title: `确定要删除这张图片吗？`,
      description: '此操作无法撤销。',
      buttons: [
        { name: 'cancel', text: '取消' },
        { color: 'warn', name: 'delete', text: '删除' },
      ],
    });

    if (pressedButton === 'delete') {
      const result = await this.imageService.DeleteImage(image.id ?? '');
      if (HasFailed(result))
        return this.errorService.showFailure(result, this.logger);

      this.errorService.success('图片已删除');
      this.imagesSub.next(
        this.images?.filter((i) => i.id !== image.id) ?? null,
      );

      if (this.viewerOpen && this.viewerImage?.id === image.id) {
        this.closeViewer();
      }
      if (this.tagPanelOpen && this.tagPanelImage?.id === image.id) {
        this.closeTagPanel();
      }
    }
  }

  toggleGroup(groupKey: string, event?: Event) {
    event?.stopPropagation();

    if (this.collapsedGroupKeys.has(groupKey)) {
      this.collapsedGroupKeys.delete(groupKey);
      return;
    }

    this.collapsedGroupKeys.add(groupKey);
  }

  gotoPage(page: number) {
    this.router.navigate(['/images', page]).then(() => {
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

  /**
   * 处理图片点击事件，支持快捷键多选
   * - Ctrl/Cmd + 点击：多选/取消选择
   * - Shift + 点击：连续选择
   * - 普通点击：打开查看器或切换选择
   */
  async handleImageClick(image: EImage, event: MouseEvent) {
    event.stopPropagation();

    // Ctrl/Cmd 多选
    if (event.ctrlKey || event.metaKey) {
      // 自动进入选择模式
      if (!this.selectionMode) {
        this.selectionMode = true;
      }
      this.toggleSelect(image);
      this.lastSelectedId = image.id;
      return;
    }

    // Shift 连续选择
    if (event.shiftKey && this.lastSelectedId && this.selectionMode) {
      this.selectRange(this.lastSelectedId, image.id);
      return;
    }

    // 普通点击
    if (this.selectionMode) {
      this.toggleSelect(image);
      this.lastSelectedId = image.id;
    } else {
      // 视频直接跳转到查看页面，图片打开查看器
      const isVideo = await this.checkIsVideo(image.id);
      if (isVideo) {
        this.viewImage(image);
      } else {
        this.openViewer(image);
      }
    }
  }

  /**
   * 选择从 startId 到 endId 之间的所有图片
   */
  private selectRange(startId: string, endId: string) {
    const images = this.images;
    if (!images) return;

    const startIndex = images.findIndex((img) => img.id === startId);
    const endIndex = images.findIndex((img) => img.id === endId);

    if (startIndex === -1 || endIndex === -1) return;

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    for (let i = minIndex; i <= maxIndex; i++) {
      this.selectedIds.add(images[i].id);
    }
  }

  toggleSelect(image: EImage, event?: Event) {
    event?.stopPropagation();
    if (this.selectedIds.has(image.id)) {
      this.selectedIds.delete(image.id);
    } else {
      this.selectedIds.add(image.id);
    }
    this.lastSelectedId = image.id;
  }

  isSelected(image: EImage): boolean {
    return this.selectedIds.has(image.id);
  }

  selectAll() {
    this.images?.forEach((img) => this.selectedIds.add(img.id));
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

    if (this.contextMenuVisible) {
      this.closeContextMenu();
    }

    const pressedButton = await this.dialogService.showDialog({
      title: `确定要删除选中的 ${this.selectedIds.size} 张图片吗？`,
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

      this.errorService.success(`已删除 ${result.images.length} 张图片`);
      this.imagesSub.next(
        this.images?.filter((i) => !this.selectedIds.has(i.id)) ?? null,
      );
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
    return this.images?.length ?? 0;
  }

  get totalCount(): number {
    return this.imagesSub.value?.filter(
      (i: EImage) => i.expires_at === null || i.expires_at > new Date(),
    ).length ?? 0;
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.error-placeholder')) {
      const placeholder = document.createElement('div');
      placeholder.className = 'error-placeholder';
      placeholder.textContent = '⚠';
      parent.appendChild(placeholder);
    }
  }

  // ========== 右键菜单 ==========
  openContextMenu(event: MouseEvent, image: EImage) {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuImage = image;

    // 计算菜单位置，确保不超出视口
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = event.clientX;
    let y = event.clientY;

    // 如果菜单会超出右边界，向左偏移
    if (x + CONTEXT_MENU.WIDTH > viewportWidth) {
      x = viewportWidth - CONTEXT_MENU.WIDTH - CONTEXT_MENU.MARGIN;
    }

    // 如果菜单会超出下边界，向上偏移
    if (y + CONTEXT_MENU.HEIGHT > viewportHeight) {
      y = viewportHeight - CONTEXT_MENU.HEIGHT - CONTEXT_MENU.MARGIN;
    }

    // 确保不会出现负值
    x = Math.max(CONTEXT_MENU.MARGIN, x);
    y = Math.max(CONTEXT_MENU.MARGIN, y);

    this.contextMenuX = x;
    this.contextMenuY = y;
    this.contextMenuVisible = true;

    // 渲染后根据实际高度调整位置
    requestAnimationFrame(() => {
      if (this.contextMenuRef?.nativeElement) {
        const menuHeight = this.contextMenuRef.nativeElement.offsetHeight;
        const actualY = this.contextMenuY;
        const maxY = viewportHeight - menuHeight - CONTEXT_MENU.MARGIN;
        if (actualY > maxY) {
          this.contextMenuY = Math.max(CONTEXT_MENU.MARGIN, maxY);
        }
      }
    });
  }

  closeContextMenu() {
    this.contextMenuVisible = false;
    this.contextMenuImage = null;
  }

  async copyImageUrl() {
    if (!this.contextMenuImage) return;
    const image = this.contextMenuImage;
    // 获取图片原始格式
    const format = await this.getImageFormat(image.id);
    // 直接构建完整 URL
    const url = this.buildImageUrl(image.id, format, image.created);
    this.logger.log('Copy URL:', url, 'format:', format, 'id:', image.id);
    await this.copyToClipboard(url, '图片链接已复制');
    this.closeContextMenu();
  }

  async copyMarkdownLink() {
    if (!this.contextMenuImage) return;
    const image = this.contextMenuImage;
    const format = await this.getImageFormat(image.id);
    const url = this.buildImageUrl(image.id, format, image.created);
    const markdown = `![${image.file_name || 'image'}](${url})`;
    await this.copyToClipboard(markdown, 'Markdown 已复制');
    this.closeContextMenu();
  }

  async copyHtmlLink() {
    if (!this.contextMenuImage) return;
    const image = this.contextMenuImage;
    const format = await this.getImageFormat(image.id);
    const url = this.buildImageUrl(image.id, format, image.created);
    const html = `<img src="${url}" alt="${image.file_name || 'image'}">`;
    await this.copyToClipboard(html, 'HTML 已复制');
    this.closeContextMenu();
  }

  async copyBBCodeLink() {
    if (!this.contextMenuImage) return;
    const image = this.contextMenuImage;
    const format = await this.getImageFormat(image.id);
    const url = this.buildImageUrl(image.id, format, image.created);
    const bbcode = `[img]${url}[/img]`;
    await this.copyToClipboard(bbcode, 'BBCode 已复制');
    this.closeContextMenu();
  }

  // 构建图片 URL，确保包含完整路径
  private buildImageUrl(imageId: string, format: string, created?: Date | string): string {
    // 使用 imageService 的方法
    const url = this.imageService.GetImageURL(imageId, format, true, created);
    this.logger.log('Built URL:', url);
    return url;
  }

  manageTagFromMenu() {
    if (!this.contextMenuImage) return;
    this.openTagPanel(this.contextMenuImage);
    this.closeContextMenu();
  }

  private async copyToClipboard(text: string, successMsg: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {}

    document.body.removeChild(textArea);

    if (success) {
      this.errorService.success(successMsg);
      return;
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.errorService.success(successMsg);
        return;
      }
    } catch {}

    this.errorService.info('复制失败，请手动复制');
  }

  async openInNewTab() {
    if (!this.contextMenuImage) return;
    const image = this.contextMenuImage;
    const format = await this.getImageFormat(image.id);
    const url = this.buildImageUrl(image.id, format, image.created);
    window.open(url, '_blank');
    this.closeContextMenu();
  }

  viewImageDetails() {
    if (!this.contextMenuImage) return;
    this.router.navigate(['/view', this.contextMenuImage.id]);
    this.closeContextMenu();
  }

  async deleteContextImage() {
    if (!this.contextMenuImage) return;

    const image = this.contextMenuImage;
    this.closeContextMenu();
    await this.deleteImage(image);
  }

  // ========== 分享功能 ==========
  async shareImage() {
    if (!this.contextMenuImage) return;

    const image = this.contextMenuImage;
    const format = await this.getImageFormat(image.id);
    const imageUrl = this.buildImageUrl(image.id, format, image.created);
    const isVideo = SupportedVideoFileTypes.includes(format);

    this.dialog.open(ShareDialogComponent, {
      data: {
        image: image,
        imageUrl: imageUrl,
        isVideo: isVideo,
        videoFormat: format,
      } as ShareDialogData,
      panelClass: 'share-dialog-panel',
    });

    this.closeContextMenu();
  }

  trackByGroup(_index: number, group: ImageGroup) {
    return group.key;
  }

  trackByImage(_index: number, image: EImage) {
    return image.id;
  }

  async addToAlbum() {
    if (!this.contextMenuImage) return;
    
    const image = this.contextMenuImage;
    const format = await this.getImageFormat(image.id);
    const imageUrl = this.buildImageUrl(image.id, format, image.created);
    
    this.dialog.open(AlbumPickerComponent, {
      data: {
        imageId: image.id,
        imageName: image.file_name || '未命名图片',
        imageUrl: imageUrl,
      } as AlbumPickerData,
      panelClass: 'album-picker-panel',
    });
    
    this.closeContextMenu();
  }
}


