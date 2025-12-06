import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ProcessingViewMeta } from '../../models/dto/processing-view-meta.dto';

@Injectable({
  providedIn: 'root',
})
export class DragDropService {
  private registered = false;
  private dragCounter = 0;

  // 拖拽状态
  private _isDragging = new BehaviorSubject<boolean>(false);
  public isDragging$ = this._isDragging.asObservable();

  constructor(
    private readonly router: Router,
    private readonly ngZone: NgZone,
  ) {}

  /**
   * 注册全局拖拽事件
   */
  register(): boolean {
    if (this.registered) return false;

    document.addEventListener('dragenter', this.onDragEnter);
    document.addEventListener('dragover', this.onDragOver);
    document.addEventListener('dragleave', this.onDragLeave);
    document.addEventListener('drop', this.onDrop);

    this.registered = true;
    return true;
  }

  /**
   * 注销全局拖拽事件
   */
  unregister(): boolean {
    if (!this.registered) return false;

    document.removeEventListener('dragenter', this.onDragEnter);
    document.removeEventListener('dragover', this.onDragOver);
    document.removeEventListener('dragleave', this.onDragLeave);
    document.removeEventListener('drop', this.onDrop);

    this.registered = false;
    this.dragCounter = 0;
    this._isDragging.next(false);
    return true;
  }

  private onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 检查是否包含文件
    if (!this.hasFiles(e)) return;

    this.dragCounter++;
    if (this.dragCounter === 1) {
      this.ngZone.run(() => this._isDragging.next(true));
    }
  };

  private onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  private onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    this.dragCounter--;
    if (this.dragCounter === 0) {
      this.ngZone.run(() => this._isDragging.next(false));
    }
  };

  private onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    this.dragCounter = 0;
    this.ngZone.run(() => this._isDragging.next(false));

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // 过滤图片文件
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/'),
    );

    if (imageFiles.length === 0) return;

    // 跳转到处理页面
    const metadata = new ProcessingViewMeta(imageFiles);
    this.router.navigate(['/processing'], { state: metadata });
  };

  private hasFiles(e: DragEvent): boolean {
    if (!e.dataTransfer) return false;
    return (
      e.dataTransfer.types.includes('Files') ||
      e.dataTransfer.types.includes('application/x-moz-file')
    );
  }
}
