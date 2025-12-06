# Picsur 图床

一个功能完善的自托管图床系统，支持多种图片格式、相册管理、用户权限控制等功能。

## 快速部署

### 使用 Docker Compose

1. 创建 `docker-compose.yml`：

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: picsur
      POSTGRES_USER: picsur
      POSTGRES_PASSWORD: your_db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  picsur:
    image: ghcr.io/glh08/picsur:latest
    ports:
      - '8079:8080'
    environment:
      PICSUR_DB_HOST: postgres
      PICSUR_DB_PORT: 5432
      PICSUR_DB_USERNAME: picsur
      PICSUR_DB_PASSWORD: your_db_password
      PICSUR_DB_DATABASE: picsur
      PICSUR_ADMIN_PASSWORD: your_admin_password
      PICSUR_JWT_SECRET: your_jwt_secret_at_least_32_chars
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

2. 启动服务：

```bash
docker compose up -d
```

3. 访问 `http://localhost:8079`，使用 `admin` / `your_admin_password` 登录

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PICSUR_DB_HOST` | `localhost` | 数据库主机 |
| `PICSUR_DB_PORT` | `5432` | 数据库端口 |
| `PICSUR_DB_USERNAME` | `picsur` | 数据库用户名 |
| `PICSUR_DB_PASSWORD` | - | 数据库密码 |
| `PICSUR_DB_DATABASE` | `picsur` | 数据库名 |
| `PICSUR_ADMIN_PASSWORD` | - | 管理员密码 |
| `PICSUR_JWT_SECRET` | 随机生成 | JWT 密钥 |
| `PICSUR_JWT_EXPIRY` | `7d` | JWT 过期时间 |
| `PICSUR_MAX_FILE_SIZE` | `134217728` | 最大文件大小 (字节) |

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
