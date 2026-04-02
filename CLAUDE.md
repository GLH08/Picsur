# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Picsur 是一个自托管图床系统，采用 pnpm monorepo 结构，包含三个包：

```
shared/      # 共享库（类型定义、Zod DTO、实体、验证器）
frontend/    # Angular 18 前端应用
backend/     # NestJS + Fastify 后端应用
```

## 常用命令

### 开发
```bash
# 安装依赖（根目录执行）
pnpm install

# 同时构建所有包
pnpm build

# 单独构建各包
pnpm --filter picsur-shared build
pnpm --filter picsur-backend build
pnpm --filter picsur-frontend build

# 前端开发服务器
pnpm --filter picsur-frontend start

# 后端开发（热重载）
pnpm --filter picsur-backend start:dev

# 启动生产环境
pnpm --filter picsur-backend start:prod
```

### Docker
```bash
# 构建并启动
docker compose up -d

# 查看日志
docker compose logs -f picsur

# 进入容器调试
docker exec -it picsur_app sh
```

### 代码风格
```bash
# 格式化（后端）
pnpm --filter picsur-backend format

# Lint（前端）
pnpm --filter picsur-frontend lint
```

## 技术架构

### 前端（Angular 18）

**模块组织**：采用传统 NgModule 架构（非 standalone）

| 目录 | 用途 |
|------|------|
| `src/app/routes/` | 页面模块（albums, images, upload, view, settings...） |
| `src/app/components/` | 可复用组件（masonry, paginator, header, footer...） |
| `src/app/util/` | 工具模块（dialog, snackbar, error-manager...） |

**路由结构**：`app.routing.module.ts` 定义主路由，各子模块有独立 routing module

**环境配置**：`src/environments/` 下区分 `environment.ts`（开发）和 `environment.prod.ts`（生产）

### 后端（NestJS + Fastify）

**模块层次**：
```
AppModule
├── PicsurLoggerModule          # 日志
├── ServeStaticModule           # 静态文件（前端 dist）
├── DatabaseModule              # TypeORM + PostgreSQL
├── AuthManagerModule           # 认证（JWT + API Key）
├── DemoManagerModule           # 演示模式
├── PicsurRoutesModule          # API 路由
└── PicsurLayersModule          # 全局拦截器、过滤器、守卫
```

**代码组织**：
| 目录 | 用途 |
|------|------|
| `src/routes/` | 路由层（controllers） |
| `src/managers/` | 业务逻辑层 |
| `src/collections/` | 数据访问层（TypeORM entities） |
| `src/layers/` | 全局层（异常过滤、成功拦截、限流） |
| `src/decorators/` | 自定义装饰器 |
| `src/config/` | 配置服务（early/late 加载） |

**关键配置**：
- `HostConfigService` 提供 host/port 配置
- `EarlyConfigModule` 在应用启动初期加载
- 图片路由 `/i/*` 有特殊 CORS 和缓存策略

### 共享库（shared）

- `src/dto/` — Zod schemas 和生成的类型
- `src/entities/` — TypeORM 实体定义
- `src/validators/` — 自定义验证器
- `src/util/` — 工具函数

## Docker 构建

多阶段构建，容器内完整保留源码和构建产物：
1. `node:20-alpine AS builder` — 构建 shared、backend、frontend
2. `node:20-alpine AS production` — 复制所有产物，启动 NestJS
3. NestJS 通过 `@nestjs/serve-static` 提供前端静态文件

容器内工作目录 `/app`，前端构建产物在 `/app/frontend/dist`，NestJS 从 `backend/dist/main.js` 启动。

## 注意事项

- 后端使用 Fastify 而非默认 Express，`@nestjs/platform-fastify`
- 图片处理依赖 `sharp`，需要 Node 原生构建环境
- TypeScript 使用 ESM（`"type": "module"`），所有导入需带 `.js` 扩展名
- Zod 用于输入验证，shared DTO 通过 `createZodDto` 装饰器转换为 NestJS DTO
