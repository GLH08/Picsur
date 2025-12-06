# Picsur 图床

一个功能完善的自托管图床系统，支持多种图片格式、相册管理、用户权限控制等功能。

## 快速部署

### 1. 创建安装目录

```bash
mkdir -p /opt/picsur && cd /opt/picsur
```

### 2. 创建配置文件

创建 `.env` 文件：

```bash
cat > .env << 'EOF'
# 数据库密码（PostgreSQL 和 Picsur 共用）
DB_PASSWORD=your_secure_db_password

# 服务端口（对外暴露）
PICSUR_PORT=8079

# 管理员密码（首次启动时设置）
PICSUR_ADMIN_PASSWORD=your_secure_admin_password

# JWT 密钥（生产环境必须修改，至少32位随机字符串）
PICSUR_JWT_SECRET=your_random_jwt_secret_at_least_32_chars

# 时区
TZ=Asia/Shanghai
EOF
```

### 3. 创建 docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
services:
  postgres:
    image: postgres:17-alpine
    container_name: picsur_postgres
    environment:
      POSTGRES_DB: picsur
      POSTGRES_USER: picsur
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      TZ: ${TZ:-Asia/Shanghai}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U picsur"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - picsur_network

  picsur:
    image: ghcr.io/glh08/picsur:latest
    container_name: picsur_app
    ports:
      - '${PICSUR_PORT:-8079}:8080'
    environment:
      PICSUR_DB_HOST: postgres
      PICSUR_DB_PORT: 5432
      PICSUR_DB_USERNAME: picsur
      PICSUR_DB_PASSWORD: ${DB_PASSWORD}
      PICSUR_DB_DATABASE: picsur
      PICSUR_ADMIN_PASSWORD: ${PICSUR_ADMIN_PASSWORD}
      PICSUR_JWT_SECRET: ${PICSUR_JWT_SECRET}
      PICSUR_JWT_EXPIRY: 7d
      PICSUR_MAX_FILE_SIZE: 134217728
      PICSUR_PRODUCTION: true
      PICSUR_SYNCHRONIZE: true
      TZ: ${TZ:-Asia/Shanghai}
    volumes:
      - ./data/uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - picsur_network

networks:
  picsur_network:
    driver: bridge
EOF
```

### 4. 启动服务

```bash
docker compose up -d
```

### 5. 访问服务

打开浏览器访问 `http://your-server-ip:8079`，使用 `admin` / `your_secure_admin_password` 登录

## 目录结构

部署后的目录结构：

```
/opt/picsur/
├── .env                    # 环境变量配置
├── docker-compose.yml      # Docker Compose 配置
└── data/
    ├── postgres/           # PostgreSQL 数据
    └── uploads/            # 上传的图片文件
```

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `DB_PASSWORD` | 数据库密码（必填） |
| `PICSUR_ADMIN_PASSWORD` | 管理员密码（必填） |
| `PICSUR_JWT_SECRET` | JWT 密钥（必填，至少32位随机字符串） |
| `PICSUR_PORT` | 服务端口（默认 8079） |
| `TZ` | 时区（默认 Asia/Shanghai） |

## 数据备份

```bash
# 备份数据库
docker exec picsur_postgres pg_dump -U picsur picsur > backup.sql

# 备份上传文件
tar -czvf uploads_backup.tar.gz ./data/uploads

# 恢复数据库
cat backup.sql | docker exec -i picsur_postgres psql -U picsur picsur
```

## 更新镜像

```bash
cd /opt/picsur
docker compose pull
docker compose up -d
```

## 功能特性

- 多种上传方式：拖拽、粘贴、点击选择
- 支持格式：JPG、PNG、WEBP、GIF、TIFF、HEIF、BMP、QOI、JXL
- 图片处理：缩放、旋转、翻转、格式转换
- 相册管理：创建相册、批量管理
- 用户系统：角色权限、API Key
- 多格式分享：URL、Markdown、HTML、BBCode

## 技术栈

- 前端：Angular 18 + Angular Material
- 后端：NestJS + Fastify + TypeORM
- 数据库：PostgreSQL
- 构建：pnpm + Docker

## 许可证

MIT License
