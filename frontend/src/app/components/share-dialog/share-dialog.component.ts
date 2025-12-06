import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EImage } from 'picsur-shared/dist/entities/image.entity';
import { ErrorService } from '../../util/error-manager/error.service';
import { ClipboardService } from '../../util/clipboard.service';
import { StorageService, STORAGE_CONFIGS } from '../../services/storage/storage.service';
import { Logger } from '../../services/logger/logger.service';

export interface ShareDialogData {
  image: EImage;
  imageUrl: string;
}

interface ShareRecord {
  id: string;
  imageId: string;
  imageUrl: string;
  imageName: string;
  password?: string;
  expiresAt?: number; // timestamp
  createdAt: number;
}

@Component({
  selector: 'app-share-dialog',
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss'],
})
export class ShareDialogComponent implements OnInit {
  private readonly logger: Logger = new Logger(ShareDialogComponent.name);

  // 复制格式选项
  copyFormats = [
    { value: 'url', label: '直接链接', icon: 'link' },
    { value: 'markdown', label: 'Markdown', icon: 'code' },
    { value: 'html', label: 'HTML', icon: 'html' },
    { value: 'bbcode', label: 'BBCode', icon: 'forum' },
  ];
  selectedFormat = 'url';

  // 当前分享记录
  currentShare: ShareRecord | null = null;
  // 历史分享记录
  shareHistory: ShareRecord[] = [];
  // 显示历史记录
  showHistory = false;

  constructor(
    public dialogRef: MatDialogRef<ShareDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ShareDialogData,
    private readonly errorService: ErrorService,
    private readonly clipboardService: ClipboardService,
    private readonly storageService: StorageService,
  ) {}

  ngOnInit() {
    this.loadShareHistory();
    // 检查是否已有该图片的分享记录
    this.currentShare = this.shareHistory.find(
      (r) => r.imageId === this.data.image.id && !this.isExpired(r)
    ) || null;
  }

  private loadShareHistory() {
    try {
      this.shareHistory = this.storageService.get<ShareRecord[]>(STORAGE_CONFIGS.SHARE_RECORDS) || [];
      // 清理过期记录
      this.shareHistory = this.shareHistory.filter((r) => !this.isExpired(r));
      this.saveShareHistory();
    } catch (e) {
      this.logger.warn('Failed to load share history');
      this.shareHistory = [];
    }
  }

  private saveShareHistory() {
    this.storageService.set(STORAGE_CONFIGS.SHARE_RECORDS, this.shareHistory);
  }

  private isExpired(record: ShareRecord): boolean {
    if (!record.expiresAt) return false;
    return Date.now() > record.expiresAt;
  }

  /**
   * 根据选择的格式生成分享文本
   */
  getFormattedLink(): string {
    const url = this.data.imageUrl;
    const name = this.data.image.file_name || '图片';

    switch (this.selectedFormat) {
      case 'markdown':
        return `![${name}](${url})`;
      case 'html':
        return `<img src="${url}" alt="${name}" />`;
      case 'bbcode':
        return `[img]${url}[/img]`;
      default:
        return url;
    }
  }

  /**
   * 复制格式化的链接
   */
  async copyFormattedLink() {
    const text = this.getFormattedLink();
    const success = await this.clipboardService.copyText(text);
    if (success) {
      // 记录分享历史
      this.addToHistory();
      this.errorService.success('已复制到剪贴板');
    } else {
      this.errorService.error('复制失败', this.logger);
    }
  }

  /**
   * 添加到分享历史
   */
  private addToHistory() {
    const existingIndex = this.shareHistory.findIndex((r) => r.imageId === this.data.image.id);
    
    const record: ShareRecord = {
      id: Math.random().toString(36).substring(2, 10),
      imageId: this.data.image.id,
      imageUrl: this.data.imageUrl,
      imageName: this.data.image.file_name || '未命名图片',
      createdAt: Date.now(),
    };

    if (existingIndex !== -1) {
      // 更新现有记录
      this.shareHistory[existingIndex] = record;
    } else {
      // 添加新记录
      this.shareHistory.unshift(record);
    }
    
    // 只保留最近 20 条记录
    if (this.shareHistory.length > 20) {
      this.shareHistory = this.shareHistory.slice(0, 20);
    }
    
    this.saveShareHistory();
    this.currentShare = record;
  }

  async copyImageUrl() {
    const success = await this.clipboardService.copyText(this.data.imageUrl);
    if (success) {
      this.errorService.success('图片链接已复制');
    } else {
      this.errorService.error('复制失败', this.logger);
    }
  }

  async copyShareInfo() {
    if (!this.currentShare) return;

    let shareText = `🖼️ 图片分享\n\n`;
    shareText += `图片名称：${this.currentShare.imageName}\n`;
    shareText += `链接：${this.currentShare.imageUrl}`;

    const success = await this.clipboardService.copyText(shareText);
    if (success) {
      this.errorService.success('分享信息已复制');
    } else {
      this.errorService.error('复制失败', this.logger);
    }
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
  }

  viewHistoryShare(record: ShareRecord) {
    // 切换到该分享记录
    this.currentShare = record;
    this.showHistory = false;
  }

  deleteHistoryShare(record: ShareRecord, event: Event) {
    event.stopPropagation();
    this.shareHistory = this.shareHistory.filter((r) => r.id !== record.id);
    this.saveShareHistory();
    if (this.currentShare?.id === record.id) {
      this.currentShare = null;
    }
    this.errorService.success('分享记录已删除');
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  close() {
    this.dialogRef.close();
  }
}
