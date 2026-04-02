import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;
  private readonly httpDurationHistogram: Histogram<string>;
  private readonly httpRequestsCounter: Counter<string>;
  private readonly imageUploadsCounter: Counter<string>;
  private readonly imageUploadSizeHistogram: Histogram<string>;
  private readonly dbQueryDurationHistogram: Histogram<string>;

  constructor() {
    this.registry = new Registry();

    // 收集默认指标
    collectDefaultMetrics({ register: this.registry });

    // HTTP 请求延迟直方图
    this.httpDurationHistogram = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // HTTP 请求计数器
    this.httpRequestsCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // 图片上传计数器
    this.imageUploadsCounter = new Counter({
      name: 'image_uploads_total',
      help: 'Total number of image uploads',
      labelNames: ['status', 'file_type'],
      registers: [this.registry],
    });

    // 图片上传大小
    this.imageUploadSizeHistogram = new Histogram({
      name: 'image_upload_size_bytes',
      help: 'Size of uploaded images in bytes',
      labelNames: ['file_type'],
      buckets: [1024, 102400, 1048576, 10485760, 104857600],
      registers: [this.registry],
    });

    // 数据库查询延迟
    this.dbQueryDurationHistogram = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'entity'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // 指标已初始化
  }

  /**
   * 记录 HTTP 请求
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number,
  ) {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
    };

    this.httpDurationHistogram.observe(labels, durationMs / 1000);
    this.httpRequestsCounter.inc(labels);
  }

  /**
   * 记录图片上传
   */
  recordImageUpload(
    status: 'success' | 'error',
    fileType: string,
    sizeBytes: number,
  ) {
    this.imageUploadsCounter.inc({
      status,
      file_type: fileType,
    });

    this.imageUploadSizeHistogram.observe(
      { file_type: fileType },
      sizeBytes,
    );
  }

  /**
   * 记录数据库查询
   */
  recordDbQuery(
    operation: 'select' | 'insert' | 'update' | 'delete',
    entity: string,
    durationMs: number,
  ) {
    this.dbQueryDurationHistogram.observe(
      { operation, entity },
      durationMs / 1000,
    );
  }

  /**
   * 获取当前指标值
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * 获取内容类型
   */
  getContentType(): string {
    return this.registry.contentType;
  }
}
