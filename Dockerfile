# ================================
# 多阶段构建
# ================================
# 构建阶段
FROM node:20-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# 复制 patches 目录（qoi-img patch 需要）
COPY patches/ ./patches/

# 安装pnpm
RUN npm install -g pnpm

# 安装根级别依赖
RUN pnpm install --frozen-lockfile

# 先复制共享配置文件
COPY tsconfig.base.json ./

# 复制所有源代码
COPY . .

# 为每个模块安装依赖并构建
# shared 模块
WORKDIR /app/shared
RUN pnpm install --frozen-lockfile
RUN pnpm build

# backend 模块
WORKDIR /app/backend
RUN pnpm install --frozen-lockfile
RUN pnpm build

# frontend 模块
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile
RUN pnpm build

# 返回根目录
WORKDIR /app

# ================================
# 生产阶段
# ================================
FROM node:20-alpine AS production

# 安装运行时依赖
RUN apk add --no-cache \
    postgresql-client \
    curl \
    ffmpeg

# 安装pnpm
RUN npm install -g pnpm

WORKDIR /app

# 从构建阶段复制构建产物
COPY --from=builder /app .

# 使用 root 用户运行 (默认)
# RUN addgroup -g 1001 -S picsur && \
#     adduser -S picsur -u 1001
#
# # 设置权限
# RUN chown -R picsur:picsur /app
# USER picsur

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["pnpm", "--filter", "picsur-backend", "start:prod"]
