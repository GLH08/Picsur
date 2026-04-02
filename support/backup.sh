#!/bin/bash
# ============================================
# Picsur 数据库备份脚本
# ============================================
# 用途：备份 PostgreSQL 数据库和上传文件
# 使用方法：
#   ./backup.sh              # 默认备份到 ./backups
#   ./backup.sh /custom/path # 备份到指定路径

set -e

# 配置
BACKUP_DIR="${1:-${BACKUP_DIR:-./backups}}"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="${POSTGRES_DB:-picsur}"
DB_USER="${POSTGRES_USER:-picsur}"
DB_HOST="${PICSUR_DB_HOST:-postgres}"
DB_PORT="${PICSUR_DB_PORT:-5432}"
UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 数据库备份文件名
DB_BACKUP_FILE="$BACKUP_DIR/picsur_db_${DATE}.sql.gz"

log "Starting backup..."
log "Backup directory: $BACKUP_DIR"
log "Database: $DB_NAME @ $DB_HOST:$DB_PORT"

# 检查环境变量
if [ -z "$POSTGRES_PASSWORD" ] && [ -z "$PICSUR_DB_PASSWORD" ]; then
    # 尝试从环境文件读取
    if [ -f .env ]; then
        source .env 2>/dev/null || true
    fi
fi

# 导出密码
export PGPASSWORD="${PICSUR_DB_PASSWORD:-$POSTGRES_PASSWORD}"

# 执行数据库备份
log "Backing up database..."
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Fc | gzip > "$DB_BACKUP_FILE"; then
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    log "Database backup complete: $DB_BACKUP_FILE ($DB_SIZE)"
else
    error "Database backup failed!"
    rm -f "$DB_BACKUP_FILE"
    exit 1
fi

# 备份上传文件（可选）
UPLOADS_BACKUP_FILE=""
if [ -d "$UPLOADS_DIR" ]; then
    log "Backing up uploads directory..."
    UPLOADS_BACKUP_FILE="$BACKUP_DIR/picsur_uploads_${DATE}.tar.gz"

    # 使用 tar 备份，排除临时文件
    if tar -czf "$UPLOADS_BACKUP_FILE" \
        --exclude='*.tmp' \
        --exclude='*.temp' \
        --exclude='.gitkeep' \
        -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")" 2>/dev/null; then
        UPLOADS_SIZE=$(du -h "$UPLOADS_BACKUP_FILE" | cut -f1)
        log "Uploads backup complete: $UPLOADS_BACKUP_FILE ($UPLOADS_SIZE)"
    else
        log "Warning: Uploads backup failed, skipping..."
        rm -f "$UPLOADS_BACKUP_FILE"
        UPLOADS_BACKUP_FILE=""
    fi
fi

# 清理过期备份
log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "picsur_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "picsur_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# 生成备份清单
MANIFEST_FILE="$BACKUP_DIR/backup_manifest_${DATE}.txt"
cat > "$MANIFEST_FILE" << EOF
Backup Manifest
===============
Date: $DATE
Database: $DB_NAME
DB Backup: $DB_BACKUP_FILE
DB Size: $DB_SIZE
Uploads Backup: ${UPLOADS_BACKUP_FILE:-none}
Uploads Size: ${UPLOADS_SIZE:-N/A}
Retention: $RETENTION_DAYS days
EOF

log "Backup manifest: $MANIFEST_FILE"

# 统计
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Backup complete! Total backup size: $TOTAL_SIZE"

# 输出摘要
echo ""
echo "=========================================="
echo " Backup Summary"
echo "=========================================="
echo " Database: $DB_BACKUP_FILE ($DB_SIZE)"
if [ -n "$UPLOADS_BACKUP_FILE" ]; then
    echo " Uploads:   $UPLOADS_BACKUP_FILE ($UPLOADS_SIZE)"
fi
echo " Manifest:  $MANIFEST_FILE"
echo " Total:     $TOTAL_SIZE in $BACKUP_DIR"
echo "=========================================="

exit 0
