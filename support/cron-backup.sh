#!/bin/bash
# ============================================
# Picsur 定时备份脚本
# ============================================
# 用途：用于 cron 定时任务执行备份
# 安装方法：
#   # 每天凌晨 2 点执行备份
#   0 2 * * * /path/to/picsur/support/cron-backup.sh >> /var/log/picsur-backup.log 2>&1

# 设置工作目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 加载环境变量（如果有）
if [ -f "$SCRIPT_DIR/../.env" ]; then
    set -a
    source "$SCRIPT_DIR/../.env" 2>/dev/null || true
    set +a
fi

# 执行备份
./backup.sh

# 检查结果
if [ $? -eq 0 ]; then
    echo "$(date): Backup completed successfully"
    exit 0
else
    echo "$(date): Backup failed!" >&2
    exit 1
fi
