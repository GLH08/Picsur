import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { VideoFileType } from 'picsur-shared/dist/dto/mimes.dto';
import { AsyncFailable, Fail, FT } from 'picsur-shared/dist/types/failable';

const execAsync = promisify(exec);

@Injectable()
export class VideoThumbnailService {
  private readonly logger = new Logger(VideoThumbnailService.name);

  /**
   * 生成视频缩略图
   * @param videoPath 视频文件路径
   * @param outputPath 缩略图输出路径
   * @returns 缩略图 Buffer
   */
  public async generateThumbnail(
    videoPath: string,
    outputPath: string,
  ): AsyncFailable<Buffer> {
    try {
      // 使用 ffmpeg 提取第一帧作为缩略图
      // -y: 覆盖已存在的文件
      // -ss: 定位到指定时间（1秒，避免黑屏）
      // -i: 输入文件
      // -vframes 1: 只取一帧
      // -q:v 2: 输出质量（2是高质量）
      const command = `ffmpeg -y -ss 00:00:01 -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}" 2>&1`;

      await execAsync(command);

      // 读取生成的缩略图
      const fs = await import('fs/promises');
      const thumbnail = await fs.readFile(outputPath);

      this.logger.log(`Generated thumbnail for video: ${videoPath}`);

      return thumbnail;
    } catch (error) {
      this.logger.error(`Failed to generate thumbnail: ${error}`);
      return Fail(FT.Internal, `Failed to generate video thumbnail: ${error}`);
    }
  }

  /**
   * 从视频路径获取视频类型
   */
  public getVideoTypeFromPath(filePath: string): VideoFileType | null {
    const ext = filePath.toLowerCase().split('.').pop();
    const typeMap: Record<string, VideoFileType> = {
      'mp4': VideoFileType.MP4,
      'webm': VideoFileType.WEBM,
      'mov': VideoFileType.MOV,
      'avi': VideoFileType.AVI,
      'mkv': VideoFileType.MKV,
      'ogv': VideoFileType.OGV,
    };
    return ext ? typeMap[ext] || null : null;
  }

  /**
   * 获取视频时长（秒）
   */
  public async getVideoDuration(videoPath: string): AsyncFailable<number> {
    try {
      // 使用 ffprobe 获取视频时长
      const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}" 2>&1`;
      const { stdout } = await execAsync(command);

      const duration = parseFloat(stdout.trim());
      if (isNaN(duration)) {
        return Fail(FT.Internal, 'Failed to parse video duration');
      }

      return duration;
    } catch (error) {
      this.logger.error(`Failed to get video duration: ${error}`);
      return Fail(FT.Internal, `Failed to get video duration: ${error}`);
    }
  }
}
