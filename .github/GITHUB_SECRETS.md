# GitHub Actions 配置指南

本文档说明如何配置 GitHub Secrets 以启用 CI/CD 功能。

## 必需 Secrets

### GitHub Container Registry (默认启用)

无需额外配置，使用 GitHub Actions 内置的 `GITHUB_TOKEN`。

### Docker Hub 推送 (可选)

如需同时推送镜像到 Docker Hub：

1. 创建 Docker Hub Access Token
   - 登录 [Docker Hub](https://hub.docker.com)
   - 进入 Account Settings → Security → Access Tokens
   - 创建新 Access Token

2. 添加 GitHub Secrets
   - 进入仓库 Settings → Secrets and variables → Actions
   - 添加以下 Secrets：

| Secret 名称 | 说明 |
|-------------|------|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token |

## 可选 Secrets

### 生产部署

如需在标签推送时自动部署到生产服务器：

| Secret 名称 | 说明 |
|-------------|------|
| `PROD_HOST` | 生产服务器 IP 或域名 |
| `PROD_USER` | SSH 用户名 |
| `PROD_SSH_KEY` | SSH 私钥 |

## 镜像地址

### GitHub Container Registry

```
ghcr.io/<owner>/<repo>:latest
ghcr.io/<owner>/<repo>:main-sha
ghcr.io/<owner>/<repo>:v1.2.3
```

对于本项目：
```
ghcr.io/glh08/picsur:latest
ghcr.io/glh08/picsur:v1.2.3
```

### Docker Hub (启用后)

```
docker.io/<username>/picsur:latest
docker.io/<username>/picsur:v1.2.3
```
