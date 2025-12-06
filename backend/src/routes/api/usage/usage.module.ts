import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller.js';

// 跟踪功能已禁用，保留空模块以避免路由错误
@Module({
  controllers: [UsageController],
})
export class UsageApiModule {}
