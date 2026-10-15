#!/bin/bash
# TOPEMS 回滚脚本（systemd 部署模型）
# 位置: /opt/topems/scripts/rollback.sh
# 使用: ./scripts/rollback.sh [OPTIONS] [backup_dir]
# 示例: ./scripts/rollback.sh /opt/topems/backups/20260621_100000
# 选项:
#   --dry-run     预演模式：仅打印将执行的动作计划（每步前缀 [DRY-RUN]），
#                 不停止服务、不操作数据库、不写文件；同时豁免 root 检查与
#                 交互确认，用于在无生产环境时核对完整回滚计划。
#
# 部署模型：systemd（与 install.sh / update.sh 一致）。
# 服务管理走 systemctl topems.target；数据库走 psql/pg_dump 直连（不再依赖 docker compose）。
# 数据库连接可用环境变量覆盖（缺省与本机 postgres 容器映射一致）:
#   PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DRY_RUN=false
BACKUP_DIR=""

# 参数解析：--dry-run 开关 + 可选位置参数 backup_dir
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--dry-run] [backup_dir]"
            exit 0
            ;;
        --*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            BACKUP_DIR="$1"
            shift
            ;;
    esac
done

# 数据库连接参数（支持环境变量覆盖）
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-topems}"
PGDATABASE="${PGDATABASE:-topems}"
# 口令不设默认弱值：环境变量优先；非 dry-run 下未设置即报错退出（dry-run 不连库可豁免）
PGPASSWORD="${PGPASSWORD:-}"
if [ -z "$PGPASSWORD" ] && [ "$DRY_RUN" != "true" ]; then
    echo "错误: 未设置 PGPASSWORD 环境变量（回滚需直连数据库）" >&2
    echo "用法: PGPASSWORD='<口令>' $0 [--dry-run] [backup_dir]" >&2
    exit 1
fi
export PGPASSWORD

# 回滚后登录冒烟凭证：环境变量优先；未设置则跳过冒烟（不再内置 admin/admin123）
ROLLBACK_ADMIN_USER="${ROLLBACK_ADMIN_USER:-admin}"
ROLLBACK_ADMIN_PASS="${ROLLBACK_ADMIN_PASS:-}"

PSQL=(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE")
PGDUMP=(pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$PGDATABASE")

print_info() {
    echo -e "${YELLOW}ℹ INFO${NC} - $1"
}

print_ok() {
    echo -e "${GREEN}✅ OK${NC} - $1"
}

print_fail() {
    echo -e "${RED}❌ FAILED${NC} - $1"
}

# systemd 可用性检测（非 Linux 生产环境如 macOS 本机预演时跳过服务管理段，
# 数据库回滚仍可完整验证；Linux 生产部署自动走 systemctl）
SYSTEMD_AVAILABLE=false
if command -v systemctl &>/dev/null && systemctl is-system-running >/dev/null 2>&1; then
    SYSTEMD_AVAILABLE=true
fi

# dry-run 下成功提示改为“计划完成”，避免预演输出冒充实做结果
step_ok() {
    if [ "$DRY_RUN" = "true" ]; then
        print_info "[DRY-RUN] 计划完成: $1"
    else
        print_ok "$1"
    fi
}

# 命令执行包装：--dry-run 下仅打印计划，不实际执行（与 install.sh / update.sh 风格一致）
run() {
    if [ "$DRY_RUN" = "true" ]; then
        print_info "[DRY-RUN] 将执行: $*"
    else
        "$@"
    fi
}

# 检查是否为 root 用户或有 sudo 权限（--dry-run 预演豁免；SKIP_ROOT_CHECK=1 跳过——
# 数据库直连回滚在非 root 下可运行，服务段会因 systemd 不可用自动跳过）
if [ "$DRY_RUN" != "true" ] && [ "$SKIP_ROOT_CHECK" != "1" ] && [ "$EUID" -ne 0 ] && ! sudo -v 2>/dev/null; then
    print_fail "需要 root 权限运行此脚本"
    print_info "提示: 数据库直连回滚在非 root 下可运行（服务段将自动跳过），可用 SKIP_ROOT_CHECK=1 跳过本检查"
    exit 1
fi

echo "=========================================="
echo "  TOPEMS 回滚脚本（systemd 部署模型）"
echo "=========================================="
echo ""
print_info "数据库: ${PGHOST}:${PGPORT}/${PGDATABASE} (${PGUSER})"
echo ""
if [ "$DRY_RUN" = "true" ]; then
    print_info "DRY-RUN 预演模式已开启：以下动作均不会真实执行"
fi

# 确定备份目录
if [ -z "$BACKUP_DIR" ]; then
    # 自动查找最新的备份（按 mtime 排序；macOS find 无 -printf，ls -td 语义等价）
    # shellcheck disable=SC2012
    BACKUP_DIR=$(ls -td /opt/topems/backups/*/ 2>/dev/null | head -1)

    if [ -z "$BACKUP_DIR" ]; then
        if [ "$DRY_RUN" = "true" ]; then
            BACKUP_DIR="/opt/topems/backups/<YYYYMMDD_HHMMSS>/"
            print_info "[DRY-RUN] 本机未定位到备份目录，按典型路径模拟: $BACKUP_DIR"
        else
            print_fail "未找到备份目录"
            echo "请手动指定备份目录: $0 /opt/topems/backups/YYYYMMDD_HHMMSS/"
            exit 1
        fi
    fi
fi

print_info "使用备份目录: $BACKUP_DIR"

# 检查备份文件是否存在
if [ ! -f "$BACKUP_DIR/database.sql" ]; then
    if [ "$DRY_RUN" = "true" ]; then
        print_info "[DRY-RUN] 本机不存在 $BACKUP_DIR/database.sql，按备份存在继续演示完整计划"
    else
        print_fail "备份文件不存在: $BACKUP_DIR/database.sql"
        exit 1
    fi
fi

if [ ! -f "$BACKUP_DIR/.env.backup" ] && [ "$DRY_RUN" != "true" ]; then
    print_info "环境变量备份不存在，将使用当前配置"
fi

# 确认操作（--dry-run 跳过交互确认）
if [ "$DRY_RUN" = "true" ]; then
    print_info "[DRY-RUN] 跳过交互确认（read -p），直接打印完整回滚计划"
else
    echo ""
    read -r -p "确定要执行回滚吗？此操作将覆盖 ${PGDATABASE} 库当前数据。 (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "取消回滚操作"
        exit 0
    fi
fi

echo ""
print_info "开始回滚..."
echo ""

# 1. 停止服务
print_info "1. 停止所有服务..."
if [ "$SYSTEMD_AVAILABLE" = "true" ]; then
    run systemctl stop topems.target
    step_ok "服务已停止"
else
    print_info "systemd 不可用（非 Linux 生产环境），跳过服务停止"
fi

# 2. 备份当前数据库（以防万一）
print_info "2. 备份当前数据库..."
CURRENT_BACKUP="${PRE_ROLLBACK_DIR:-/opt/topems/backups/pre_rollback_$(date +%Y%m%d_%H%M%S)}"
run mkdir -p "$CURRENT_BACKUP"
if [ "$DRY_RUN" = "true" ]; then
    print_info "[DRY-RUN] 将执行: pg_dump -h $PGHOST -p $PGPORT -U $PGUSER $PGDATABASE > $CURRENT_BACKUP/database_pre_rollback.sql"
elif "${PGDUMP[@]}" > "$CURRENT_BACKUP/database_pre_rollback.sql" 2>/dev/null; then
    print_ok "当前数据库已备份到: $CURRENT_BACKUP/database_pre_rollback.sql"
else
    print_fail "备份当前数据库失败——中止回滚（绝不 dropdb 删库，先排查数据库连接）"
    exit 1
fi

# 3. 恢复环境变量
if [ "$DRY_RUN" = "true" ]; then
    print_info "3. 恢复环境变量..."
    print_info "[DRY-RUN] 将执行: cp $BACKUP_DIR/.env.backup /opt/topems/.env （若备份存在）"
elif [ -f "$BACKUP_DIR/.env.backup" ]; then
    print_info "3. 恢复环境变量..."
    cp "$BACKUP_DIR/.env.backup" /opt/topems/.env
    print_ok "环境变量已恢复"
else
    print_info "3. 跳过环境变量恢复"
fi

# 4. 恢复数据库
print_info "4. 恢复数据库..."

# 删除现有数据库
print_info "删除现有数据库..."
run dropdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" --if-exists "$PGDATABASE" || true

# 创建新数据库
print_info "创建新数据库..."
run createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$PGDATABASE"

# 恢复数据
print_info "导入备份数据..."
if [ "$DRY_RUN" = "true" ]; then
    print_info "[DRY-RUN] 将执行: psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE < $BACKUP_DIR/database.sql"
else
    if "${PSQL[@]}" < "$BACKUP_DIR/database.sql"; then
        print_ok "数据库已恢复"
    else
        print_fail "数据库恢复失败"
        exit 1
    fi
fi

# 5. 恢复上传文件（如果有）
if [ "$DRY_RUN" = "true" ]; then
    print_info "5. 恢复上传文件..."
    print_info "[DRY-RUN] 将执行: tar -xzf $BACKUP_DIR/uploads.tar.gz -C /opt/topems/ （若存在）"
elif [ -f "$BACKUP_DIR/uploads.tar.gz" ]; then
    print_info "5. 恢复上传文件..."
    tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C /opt/topems/ 2>/dev/null || true
    print_ok "上传文件已恢复"
fi

# 6. 启动服务
print_info "6. 启动服务..."
if [ "$SYSTEMD_AVAILABLE" = "true" ]; then
    run systemctl start topems.target
else
    print_info "systemd 不可用（非 Linux 生产环境），跳过服务启动"
fi

# 7. 等待服务启动
print_info "7. 等待服务启动..."
run sleep 15

# 8. 验证回滚结果
echo ""
print_info "8. 验证回滚结果..."

if [ "$DRY_RUN" = "true" ]; then
    print_info "[DRY-RUN] 将检查: systemctl is-active topems.target（active）"
    print_info "[DRY-RUN] 将检查: psql -c \"SELECT COUNT(*) FROM core_permissions;\"（权限数 >= 10）"
    print_info "[DRY-RUN] 将检查: curl -X POST http://localhost:8000/api/auth/login （admin 登录成功）"
else
    # 检查服务状态
    if [ "$SYSTEMD_AVAILABLE" = "true" ]; then
        TARGET_STATE=$(systemctl is-active topems.target 2>/dev/null || echo "inactive")
        if [ "$TARGET_STATE" = "active" ]; then
            print_ok "服务已启动"
        else
            print_fail "服务未启动（topems.target=$TARGET_STATE），请检查日志"
        fi
    else
        print_info "systemd 不可用（非 Linux 生产环境），跳过服务状态检查"
    fi

    # 检查数据库
    PERM_COUNT=$("${PSQL[@]}" -t -c "SELECT COUNT(*) FROM core_permissions;" 2>/dev/null | xargs || echo "0")
    if [ "${PERM_COUNT:-0}" -ge 10 ]; then
        print_ok "权限数据已恢复 ( $PERM_COUNT 个权限)"
    else
        print_fail "权限数据异常"
    fi

    # 检查管理员登录（凭证经 ROLLBACK_ADMIN_USER/ROLLBACK_ADMIN_PASS 注入，未设置则跳过）
    if [ -z "$ROLLBACK_ADMIN_PASS" ]; then
        print_info "未设置 ROLLBACK_ADMIN_PASS，跳过管理员登录冒烟"
    else
        sleep 2
        LOGIN_RESULT=$(curl -s -X POST http://localhost:8000/api/auth/login \
            -H "Content-Type: application/json" \
            -d "{\"username\":\"$ROLLBACK_ADMIN_USER\",\"password\":\"$ROLLBACK_ADMIN_PASS\"}" 2>/dev/null)

        if echo "$LOGIN_RESULT" | grep -q '"success":true'; then
            print_ok "管理员登录正常"
        else
            print_fail "管理员登录异常"
        fi
    fi
fi

echo ""
echo "=========================================="
echo "  回滚完成"
echo "=========================================="
echo ""
echo "如果需要进一步调查问题，请查看日志："
echo "  journalctl -u topems.target -f"
echo ""
echo "如果需要恢复到回滚前的状态，请使用："
echo "  $CURRENT_BACKUP/database_pre_rollback.sql"
