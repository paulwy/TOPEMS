#!/bin/bash

# TOPEMS 数据库备份脚本
# 用于备份 PostgreSQL 数据库

set -e

# 配置
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date +%Y%m%d)
CONTAINER_NAME="${CONTAINER_NAME:-topems-postgres}"
DB_NAME="${DB_NAME:-topems}"
DB_USER="${DB_USER:-topems}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 创建备份目录
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/daily"
    mkdir -p "$BACKUP_DIR/weekly"
    mkdir -p "$BACKUP_DIR/monthly"
}

# 备份数据库
backup_database() {
    local backup_file="$BACKUP_DIR/daily/${DB_NAME}_${DATE}.sql.gz"
    
    log_info "开始备份数据库: $DB_NAME"
    
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$backup_file"; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "备份完成: $backup_file (大小: $size)"
        
        # 创建符号链接指向最新备份
        ln -sf "$(basename "$backup_file")" "$BACKUP_DIR/latest.sql.gz"
        
        return 0
    else
        log_error "备份失败"
        return 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份文件..."
    
    # 保留最近 7 天的每日备份
    find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +7 -delete
    log_info "已删除 7 天前的每日备份"
    
    # 每周一创建周备份
    if [ "$(date +%u)" = "1" ]; then
        cp "$BACKUP_DIR/latest.sql.gz" "$BACKUP_DIR/weekly/${DB_NAME}_week_$(date +%Y%m%d).sql.gz"
        log_info "已创建周备份"
    fi
    
    # 每月第一天创建月备份
    if [ "$(date +%d)" = "01" ]; then
        cp "$BACKUP_DIR/latest.sql.gz" "$BACKUP_DIR/monthly/${DB_NAME}_month_$(date +%Y%m).sql.gz"
        log_info "已创建月备份"
    fi
    
    # 保留最近 4 周的周备份
    find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +28 -delete
    
    # 保留最近 12 个月的月备份
    find "$BACKUP_DIR/monthly" -name "*.sql.gz" -mtime +365 -delete
}

# 列出备份
list_backups() {
    log_info "当前备份列表:"
    echo ""
    
    echo "每日备份:"
    ls -lh "$BACKUP_DIR/daily/" 2>/dev/null | tail -n +2 || echo "  无"
    echo ""
    
    echo "周备份:"
    ls -lh "$BACKUP_DIR/weekly/" 2>/dev/null | tail -n +2 || echo "  无"
    echo ""
    
    echo "月备份:"
    ls -lh "$BACKUP_DIR/monthly/" 2>/dev/null | tail -n +2 || echo "  无"
    echo ""
}

# 恢复数据库
restore_database() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        return 1
    fi
    
    log_warning "即将恢复数据库: $DB_NAME"
    log_warning "这将覆盖现有数据！"
    read -p "确认恢复? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        log_info "开始恢复数据库..."
        
        gunzip -c "$backup_file" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
        
        if [ $? -eq 0 ]; then
            log_success "数据库恢复完成"
            return 0
        else
            log_error "数据库恢复失败"
            return 1
        fi
    else
        log_info "取消恢复操作"
        return 0
    fi
}

# 显示帮助
show_help() {
    cat << EOF
TOPEMS 数据库备份工具

用法: $0 [命令] [选项]

命令:
    backup       备份数据库（默认）
    restore      从备份恢复数据库
    list         列出所有备份
    clean        清理旧备份
    help         显示此帮助信息

选项:
    --dir DIR    备份目录（默认: ./backups）
    --name NAME  数据库名称（默认: topems）
    --user USER  数据库用户（默认: topems）
    --container  容器名称（默认: topems-postgres）

示例:
    $0 backup                    # 备份数据库
    $0 restore backups/daily/topems_20240101_120000.sql.gz  # 恢复数据库
    $0 list                       # 列出备份
    $0 clean                      # 清理旧备份
EOF
}

# 主函数
main() {
    create_backup_dir
    
    case "${1:-backup}" in
        backup)
            backup_database
            cleanup_old_backups
            ;;
        restore)
            restore_database "$2"
            ;;
        list)
            list_backups
            ;;
        clean)
            cleanup_old_backups
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
