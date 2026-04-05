# Picsur 图床

[![Build and Push Docker Image](https://github.com/GLH08/Picsur/actions/workflows/docker-build.yml/badge.svg)](https://github.com/GLH08/Picsur/actions/workflows/docker-build.yml)
[![Docker Image Version](https://img.shields.io/docker/v/glh08/picsur/latest?label=ghcr.io)](https://github.com/GLH08/Picsur/packages)

一个功能完善的自托管图床系统，支持多种图片和视频格式、相册管理、用户权限控制等。

## 功能特性

- **多种上传方式**：拖拽、粘贴、点击选择
- **图片格式**：JPG、PNG、WEBP、GIF、TIFF、HEIF、BMP、QOI、JXL、AVIF
- **视频支持**：MP4、WebM、MOV、AVI、MKV、OGV
- **图片处理**：缩放、旋转、翻转、格式转换
- **相册管理**：创建相册、批量管理
- **用户系统**：角色权限、API Key
- **多格式分享**：URL、Markdown、HTML、BBCode

## 快速部署

### 方式一：使用远程镜像（推荐）

#### 1. 创建部署目录

```bash
mkdir -p /opt/picsur && cd /opt/picsur
```

#### 2. 下载配置文件

```bash
# 下载 docker-compose 远程配置
curl -O https://raw.githubusercontent.com/GLH08/Picsur/main/docker-compose.remote.yml
mv docker-compose.remote.yml docker-compose.yml

# 下载环境变量模板
curl -O https://raw.githubusercontent.com/GLH08/Picsur/main/.env.example
cp .env.example .env
```

#### 3. 配置环境变量

编辑 `.env` 文件：

```bash
# 数据库密码
POSTGRES_PASSWORD=your_secure_password_here
PICSUR_DB_PASSWORD=your_secure_password_here

# 管理员密码
PICSUR_ADMIN_PASSWORD=your_admin_password_here

# JWT 密钥（生产环境必须修改，至少32位随机字符串）
PICSUR_JWT_SECRET=your_random_jwt_secret_at_least_32_chars

# 服务端口（对外暴露）
PICSUR_PORT=8079
```

#### 4. 启动服务

```bash
docker compose up -d
```

#### 5. 访问服务

打开浏览器访问 `http://your-server-ip:8079`

- 默认管理员用户名：`admin`
- 管理员密码：你在 `.env` 中设置的 `PICSUR_ADMIN_PASSWORD`

---

### 方式二：本地构建

适用于需要自定义构建或离线部署：

```bash
git clone https://github.com/GLH08/Picsur.git
cd Picsur

# 复制并编辑环境变量
cp .env.example .env
nano .env  # 编辑配置

# 本地构建并启动
docker compose up -d --build
```

---

## 目录结构

```
/opt/picsur/
├── .env                    # 环境变量配置
├── docker-compose.yml      # Docker Compose 配置
├── docker-compose.remote.yml # 远程镜像配置（可选）
├── postgres_data/         # PostgreSQL 数据持久化
└── uploads/               # 上传的文件存储
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `POSTGRES_DB` | PostgreSQL 数据库名 | picsur |
| `POSTGRES_USER` | PostgreSQL 用户名 | picsur |
| `POSTGRES_PASSWORD` | PostgreSQL 密码 | - |
| `PICSUR_PORT` | 服务对外暴露端口 | 8080 |
| `PICSUR_ADMIN_PASSWORD` | 管理员密码 | - |
| `PICSUR_JWT_SECRET` | JWT 签名密钥（必填，至少32位） | - |
| `PICSUR_JWT_EXPIRY` | JWT 过期时间 | 7d |
| `PICSUR_MAX_FILE_SIZE` | 最大文件大小（字节） | 500000000 (500MB) |
| `PICSUR_SYNCHRONIZE` | 数据库同步模式 | true |
| `PICSUR_PRODUCTION` | 生产环境标识 | true |
| `PICSUR_VERBOSE` | 详细日志 | false |
| `PICSUR_DEMO` | 演示模式 | false |
| `TZ` | 时区 | Asia/Shanghai |

## 更新镜像

### 远程镜像方式

```bash
cd /opt/picsur
docker compose pull
docker compose up -d
```

### 本地构建方式

```bash
cd /opt/picsur
git pull origin main
docker compose up -d --build
```

## 数据备份

### 使用备份脚本（推荐）

项目提供了完整的备份脚本：

```bash
# 创建备份目录
mkdir -p backups

# 执行备份（需要设置环境变量）
export POSTGRES_PASSWORD=your_password
export PICSUR_DB_PASSWORD=your_password
./support/backup.sh
```

### 手动备份

```bash
# 备份数据库
docker exec picsur_postgres pg_dump -U picsur picsur | gzip > backup_$(date +%Y%m%d).sql.gz

# 备份上传文件
tar -czvf uploads_$(date +%Y%m%d).tar.gz ./uploads
```

### 恢复数据

```bash
# 恢复数据库
gunzip < backup_20240101.sql.gz | docker exec -i picsur_postgres psql -U picsur picsur

# 或使用恢复脚本
./support/restore.sh ./backups/picsur_db_20240101_120000.sql.gz
```

## 定时备份 (Cron)

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天凌晨 2 点执行备份）
0 2 * * * /opt/picsur/support/cron-backup.sh >> /var/log/picsur-backup.log 2>&1
```

## GitHub Actions CI/CD

每次推送代码到 GitHub 会自动：

1. 运行 Migration 检查
2. 构建并推送 Docker 镜像到 GitHub Container Registry（`latest` 标签）
3. 支持多平台构建：`linux/amd64`, `linux/arm64`

### 镜像地址

```
ghcr.io/glh08/picsur:latest
```

> ARM64 镜像适用于 Apple Silicon Mac、树莓派、RISC-V 服务器等 ARM 架构设备。

### 部署到生产服务器

推送代码后，GitHub Actions 自动构建并推送镜像。手动部署到服务器：

```bash
# 1. 登录生产服务器
ssh user@your-server-ip

# 2. 进入部署目录
cd /opt/picsur

# 3. 拉取最新镜像
docker compose -f docker-compose.remote.yml pull

# 4. 重启容器
docker compose -f docker-compose.remote.yml up -d

# 5. 查看运行状态
docker compose -f docker-compose.remote.yml ps
```

> **提示**：首次部署前，需确保服务器已安装 Docker 并配置好 `docker-compose.remote.yml` 和 `.env` 文件。

## Prometheus 监控（可选）

项目支持 Prometheus metrics 采集：

1. 启用 metrics 端点（默认已启用）
2. 配置 Prometheus 抓取：

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'picsur'
    static_configs:
      - targets: ['picsur:8080']
    metrics_path: '/metrics'
```

## 技术栈

- **前端**：Angular 18 + Angular Material
- **后端**：NestJS + Fastify + TypeORM
- **数据库**：PostgreSQL 17
- **构建**：pnpm + Docker Multi-stage Build
- **监控**：Prometheus + prom-client

## API 文档

部署后可访问 `/settings/api-docs` 查看完整的 API 文档。

## 许可证

MIT License
