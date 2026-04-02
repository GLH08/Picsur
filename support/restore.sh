#!/bin/bash
# ============================================
# Picsur 数据库恢复脚本
# ============================================
# 用途：从备份恢复 PostgreSQL 数据库
# 使用方法：
#   ./restore.sh <backup_file>    # 恢复数据库备份
#   ./restore.sh <backup_file> --include-uploads  # 同时恢复上传文件

set -e

# 配置
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file> [--include-uploads]"
    echo ""
    echo "Example:"
    echo "  $0 ./backups/picsur_db_20240101_120000.sql.gz"
    echo "  $0 ./backups/picsur_db_20240101_120000.sql.gz --include-uploads"
    exit 1
fi

# 检查是否包含 uploads 标志
INCLUDE_UPLOADS=false
for arg in "$@"; do
    if [ "$arg" = "--include-uploads" ]; then
        INCLUDE_UPLOADS=true
    fi
done

# 环境配置
DB_NAME="${POSTGRES_DB:-picsur}"
DB_USER="${POSTGRES_USER:-picsur}"
DB_HOST="${PICSUR_DB_HOST:-postgres}"
DB_PORT="${PICSUR_DB_PORT:-5432}"
UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

# 导出密码
export PGPASSWORD="${PICSUR_DB_PASSWORD:-$POSTGRES_PASSWORD}"

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# 检查是否为 gzip 文件
if [[ "$BACKUP_FILE" == *.gz ]]; then
    if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
        error "Invalid gzip file: $BACKUP_FILE"
        exit 1
    fi
fi

log "Starting restore from: $BACKUP_FILE"

# 警告
echo ""
echo "=========================================="
echo " WARNING: This will overwrite the current database!"
echo " Database: $DB_NAME @ $DB_HOST:$DB_PORT"
echo "=========================================="
echo ""

read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    log "Restore cancelled by user."
    exit 0
fi

# 获取 uploads 备份文件
UPLOADS_BACKUP=""
if [ "$INCLUDE_UPLOADS" = true ]; then
    # 从数据库备份文件名推断 uploads 备份文件名
    UPLOADS_BACKUP=$(echo "$BACKUP_FILE" | sed 's/picsur_db_/picsur_uploads_/')
    UPLOADS_BACKUP="${UPLOADS_BACKUP%.sql.gz}.tar.gz"

    if [ ! -f "$UPLOADS_BACKUP" ]; then
        error "Uploads backup not found: $UPLOADS_BACKUP"
        error "Run restore without --include-uploads to restore database only."
        exit 1
    fi
fi

# 恢复数据库
log "Dropping existing database..."
dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || true

log "Creating new database..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

log "Restoring database..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl
else
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl "$BACKUP_FILE"
fi

log "Database restore complete!"

# 恢复上传文件
if [ "$INCLUDE_UPLOADS" = true ] && [ -n "$UPLOADS_BACKUP" ]; then
    log "Restoring uploads directory..."

    # 创建 uploads 目录（如果不存在）
    mkdir -p "$UPLOADS_DIR"

    # 解压 uploads
    if tar -xzf "$UPLOADS_BACKUP" -C "$(dirname "$UPLOADS_DIR")" 2>/dev/null; then
        log "Uploads restore complete!"
    else
        error "Uploads restore failed!"
    fi
fi

echo ""
echo "=========================================="
echo " Restore Complete"
echo "=========================================="
echo " Database: $DB_NAME"
echo " Uploads:  $UPLOADS_DIR"
echo "=========================================="

exit 0
