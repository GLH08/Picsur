import { Controller } from '@nestjs/common';
import { NoPermissions } from '../../../decorators/permissions.decorator.js';

// 跟踪功能已禁用，保留空控制器以避免路由错误
@Controller('api/usage')
@NoPermissions()
export class UsageController {
  constructor() {}
}
