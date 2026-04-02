import { Module } from '@nestjs/common';
import { VideoFrameService } from './video-frame.service.js';
import { VideoController } from './video.controller.js';

@Module({
  controllers: [VideoController],
  providers: [VideoFrameService],
  exports: [VideoFrameService],
})
export class VideoModule {}
