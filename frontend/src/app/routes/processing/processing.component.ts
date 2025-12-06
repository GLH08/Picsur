import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Fail, FT, HasFailed, HasSuccess } from 'picsur-shared/dist/types/failable';
import { Subscription } from 'rxjs';
import { ProcessingViewMeta } from '../../models/dto/processing-view-meta.dto';
import {
  formatFileSize,
  formatSpeed,
  formatTime,
  UploadProgressItem,
} from '../../models/dto/upload-progress.dto';
import { ImageService } from '../../services/api/image.service';
import { Logger } from '../../services/logger/logger.service';
import { ErrorService } from '../../util/error-manager/error.service';

@Component({
  templateUrl: './processing.component.html',
  styleUrls: ['./processing.component.scss'],
})
export class ProcessingComponent implements OnInit, OnDestroy {
  private readonly logger = new Logger(ProcessingComponent.name);

  items: UploadProgressItem[] = [];
  totalProgress = 0;
  isUploading = false;
  isCompleted = false;
  uploadedIds: string[] = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private readonly router: Router,
    private readonly imageService: ImageService,
    private readonly errorService: ErrorService,
  ) {}

  async ngOnInit() {
    const state = history.state as ProcessingViewMeta;
    if (!ProcessingViewMeta.is(state)) {
      return this.errorService.quitFailure(
        Fail(FT.UsrValidation, 'No state provided'),
        this.logger,
      );
    }

    history.replaceState(null, '');

    // 初始化上传项
    this.items = state.imageFiles.map((file) => ({
      file,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      speed: 0,
      status: 'pending' as const,
    }));

    this.isUploading = true;
    await this.uploadAll();
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private async uploadAll() {
    for (let i = 0; i < this.items.length; i++) {
      await this.uploadSingle(i);
    }

    this.isUploading = false;
    this.isCompleted = true;

    // 如果只有一个文件且上传成功，直接跳转到查看页面
    if (this.items.length === 1 && this.items[0].status === 'success') {
      this.router.navigate(['/view/', this.items[0].imageId], { replaceUrl: true });
    }
  }

  private async uploadSingle(index: number) {
    const item = this.items[index];
    item.status = 'uploading';
    item.startTime = Date.now();

    const upload = this.imageService.UploadImageWithProgress(item.file);

    // 订阅进度
    const sub = upload.progress$.subscribe((progress) => {
      item.progress = progress;
      this.updateSpeed(item);
      this.updateTotalProgress();
    });
    this.subscriptions.push(sub);

    // 等待结果
    const result = await upload.result;

    if (HasSuccess(result)) {
      item.status = 'success';
      item.imageId = result;
      item.progress = 100;
      this.uploadedIds.push(result);
    } else {
      item.status = 'error';
      item.error = HasFailed(result) ? result.getReason() : '上传失败';
    }

    this.updateTotalProgress();
  }

  private updateSpeed(item: UploadProgressItem) {
    if (!item.startTime) return;
    const elapsed = (Date.now() - item.startTime) / 1000;
    if (elapsed > 0) {
      const uploadedBytes = (item.progress / 100) * item.fileSize;
      item.speed = uploadedBytes / elapsed;
    }
  }

  private updateTotalProgress() {
    const total = this.items.reduce((sum, item) => sum + item.progress, 0);
    this.totalProgress = total / this.items.length;
  }

  get totalSize(): number {
    return this.items.reduce((sum, item) => sum + item.fileSize, 0);
  }

  get uploadedSize(): number {
    return this.items.reduce(
      (sum, item) => sum + (item.progress / 100) * item.fileSize,
      0,
    );
  }

  get currentSpeed(): number {
    const uploadingItem = this.items.find((item) => item.status === 'uploading');
    return uploadingItem?.speed ?? 0;
  }

  get estimatedTime(): number {
    if (this.currentSpeed === 0) return 0;
    const remaining = this.totalSize - this.uploadedSize;
    return remaining / this.currentSpeed;
  }

  get successCount(): number {
    return this.items.filter((item) => item.status === 'success').length;
  }

  get errorCount(): number {
    return this.items.filter((item) => item.status === 'error').length;
  }

  // 格式化方法供模板使用
  formatSize = formatFileSize;
  formatSpd = formatSpeed;
  formatEta = formatTime;

  viewImage(imageId: string) {
    this.router.navigate(['/view/', imageId]);
  }

  goHome() {
    this.router.navigate(['/']);
  }

  async retryFailed() {
    const failedIndices = this.items
      .map((item, index) => (item.status === 'error' ? index : -1))
      .filter((i) => i >= 0);

    this.isUploading = true;
    this.isCompleted = false;

    for (const index of failedIndices) {
      this.items[index].status = 'pending';
      this.items[index].progress = 0;
      this.items[index].error = undefined;
      await this.uploadSingle(index);
    }

    this.isUploading = false;
    this.isCompleted = true;
  }
}
