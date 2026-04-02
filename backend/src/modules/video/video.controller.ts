import { Controller, Get, Param, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('api/video')
@SkipThrottle()
export class VideoController {
  /**
   * 获取视频帧列表
   * 此端点返回视频的关键帧位置信息
   */
  @Get(':id/frames')
  async getVideoFrames(
    @Param('id') imageId: string,
    @Query('count') count: string = '5',
  ) {
    const numFrames = Math.min(Math.max(parseInt(count, 10) || 5, 1), 20);

    // 返回帧位置信息
    return {
      success: true,
      data: {
        imageId,
        frames: Array.from({ length: numFrames }, (_, i) => {
          const position = (i + 1) / (numFrames + 1);
          return {
            index: i,
            position,
            thumbnailUrl: `/i/thumb/${imageId}`,
          };
        }),
      },
    };
  }
}
