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

/** 平滑因子 - 值越小越平滑 */
const SMOOTHING_FACTOR = 0.3;

/** 速度历史记录的最大长度 */
const MAX_SPEED_HISTORY = 10;

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
      smoothSpeed: 0,
      speedHistory: [],
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
    item.speedHistory = [];
    item.smoothSpeed = 0;

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
      // 使用最后一个平滑速度
      item.speed = item.smoothSpeed;
      this.uploadedIds.push(result);
    } else {
      item.status = 'error';
      item.error = HasFailed(result) ? result.getReason() : '上传失败';
    }

    this.updateTotalProgress();
  }

  /**
   * 使用指数移动平均 (EMA) 计算平滑速度
   * EMA = alpha * current + (1 - alpha) * previous
   */
  private updateSpeed(item: UploadProgressItem) {
    if (!item.startTime) return;

    const elapsed = (Date.now() - item.startTime) / 1000;
    if (elapsed > 0) {
      const uploadedBytes = (item.progress / 100) * item.fileSize;
      const currentSpeed = uploadedBytes / elapsed;

      // 记录速度历史
      item.speedHistory.push(currentSpeed);
      if (item.speedHistory.length > MAX_SPEED_HISTORY) {
        item.speedHistory.shift();
      }

      // 计算指数移动平均
      if (item.speedHistory.length === 1) {
        item.smoothSpeed = currentSpeed;
      } else {
        item.smoothSpeed = SMOOTHING_FACTOR * currentSpeed +
          (1 - SMOOTHING_FACTOR) * item.smoothSpeed;
      }

      item.speed = currentSpeed;
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

  /**
   * 获取所有正在上传的项目的平滑速度总和
   */
  get smoothSpeed(): number {
    return this.items
      .filter((item) => item.status === 'uploading')
      .reduce((sum, item) => sum + item.smoothSpeed, 0);
  }

  /**
   * 使用平滑速度计算预估剩余时间
   */
  get estimatedTime(): number {
    const speed = this.smoothSpeed;
    if (speed === 0) {
      // 如果没有平滑速度，回退到瞬时速度
      const instantSpeed = this.currentSpeed;
      if (instantSpeed === 0) return 0;
      const remaining = this.totalSize - this.uploadedSize;
      return remaining / instantSpeed;
    }
    const remaining = this.totalSize - this.uploadedSize;
    return remaining / speed;
  }

  /**
   * 获取速度置信度（基于历史数据量）
   * 返回 0-1 之间的值，表示速度估算的可信度
   */
  get speedConfidence(): number {
    const uploadingItems = this.items.filter((item) => item.status === 'uploading');
    if (uploadingItems.length === 0) return 1;

    const totalHistory = uploadingItems.reduce(
      (sum, item) => sum + item.speedHistory.length,
      0,
    );

    // 至少需要 3 个数据点才能达到较高置信度
    return Math.min(totalHistory / (3 * uploadingItems.length), 1);
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
      this.items[index].speedHistory = [];
      this.items[index].smoothSpeed = 0;
      await this.uploadSingle(index);
    }

    this.isUploading = false;
    this.isCompleted = true;
  }
}
