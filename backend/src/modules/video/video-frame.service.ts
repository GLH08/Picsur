import { Injectable, Logger } from '@nestjs/common';
import { AsyncFailable, Fail, FT } from 'picsur-shared/dist/types/failable';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { promisifyTimeout } from '../../util/promisify-timeout.js';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export interface VideoFrame {
  /** 帧序号 (0-based) */
  index: number;
  /** 时间戳 (秒) */
  timestamp: number;
  /** 帧数据 (JPEG) */
  data: Buffer;
}

export interface FrameExtractionOptions {
  /** 要提取的帧数量 */
  count?: number;
  /** 提取的帧位置 (0-1) */
  positions?: number[];
  /** 输出格式 */
  format?: 'jpeg' | 'png';
  /** 输出质量 (1-100) */
  quality?: number;
}

const DEFAULT_OPTIONS: Required<FrameExtractionOptions> = {
  count: 5,
  positions: [],
  format: 'jpeg',
  quality: 80,
};

@Injectable()
export class VideoFrameService {
  private readonly logger = new Logger(VideoFrameService.name);

  /**
   * 提取视频帧
   * @param videoPath 视频文件路径
   * @param options 提取选项
   */
  async extractFrames(
    videoPath: string,
    options: FrameExtractionOptions = {},
  ): AsyncFailable<VideoFrame[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
      // 获取视频时长
      const duration = await this.getVideoDuration(videoPath);
      if (duration <= 0) {
        return Fail(FT.BadRequest, 'Video duration is zero or invalid');
      }

      // 计算要提取的时间点
      const timestamps = this.calculateTimestamps(
        duration,
        opts.count,
        opts.positions,
      );

      // 提取帧
      const frames: VideoFrame[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const frameData = await this.extractFrame(
          videoPath,
          timestamp,
          opts.format,
          opts.quality,
        );

        frames.push({
          index: i,
          timestamp,
          data: frameData,
        });
      }

      return frames;
    } catch (error) {
      this.logger.error('Failed to extract video frames:', error);
      return Fail(FT.Internal, `Failed to extract frames: ${error}`);
    }
  }

  /**
   * 获取视频缩略图（单个帧）
   * @param videoPath 视频文件路径
   * @param timestamp 提取时间点（秒）
   */
  async extractThumbnail(
    videoPath: string,
    timestamp?: number,
  ): AsyncFailable<Buffer> {
    try {
      // 如果没有指定时间，默认提取第一帧
      if (timestamp === undefined) {
        timestamp = 0;
      }

      return await this.extractFrame(videoPath, timestamp, 'jpeg', 85);
    } catch (error) {
      this.logger.error('Failed to extract thumbnail:', error);
      return Fail(FT.Internal, `Failed to extract thumbnail: ${error}`);
    }
  }

  /**
   * 获取视频时长
   */
  private async getVideoDuration(videoPath: string): Promise<number> {
    try {
      // 使用 ffprobe 获取视频时长
      const { stdout } = await promisifyTimeout(
        execFileAsync('ffprobe', [
          '-v',
          'error',
          '-show_entries',
          'format=duration',
          '-of',
          'default=noprint_wrappers=1:nokey=1',
          videoPath,
        ]),
        10000, // 10 秒超时
      );

      return parseFloat(stdout.trim()) || 0;
    } catch (error) {
      this.logger.warn('Failed to get video duration:', error);
      return 0;
    }
  }

  /**
   * 计算要提取的时间点
   */
  private calculateTimestamps(
    duration: number,
    count: number,
    positions: number[],
  ): number[] {
    const timestamps: number[] = [];

    // 添加指定位置的帧
    for (const pos of positions) {
      if (pos >= 0 && pos <= 1) {
        timestamps.push(pos * duration);
      }
    }

    // 计算均匀分布的时间点（如果需要）
    const remaining = count - timestamps.length;
    if (remaining > 0) {
      const step = duration / (remaining + 1);
      for (let i = 1; i <= remaining; i++) {
        timestamps.push(step * i);
      }
    }

    // 按时间排序
    return timestamps.sort((a, b) => a - b);
  }

  /**
   * 从视频中提取单帧
   */
  private async extractFrame(
    videoPath: string,
    timestamp: number,
    format: 'jpeg' | 'png',
    quality: number,
  ): Promise<Buffer> {
    const outputFormat = format === 'jpeg' ? 'mjpeg' : 'png';

    const args = [
      '-ss',
      timestamp.toFixed(2),
      '-i',
      videoPath,
      '-vframes',
      '1',
      '-q:v',
      (100 - quality).toString(),
      '-f',
      outputFormat,
      '-',
    ];

    try {
      const { stdout } = await promisifyTimeout(
        execFileAsync('ffmpeg', args),
        30000, // 30 秒超时
      );

      return Buffer.from(stdout, 'binary');
    } catch (error) {
      this.logger.error('Failed to extract frame:', error);
      throw error;
    }
  }

  /**
   * 生成预览帧 URL
   */
  getFrameUrl(imageId: string, timestamp: number): string {
    return `/i/frame/${imageId}?t=${timestamp}`;
  }
}
