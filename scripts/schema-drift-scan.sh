#!/usr/bin/env bash
# =============================================================================
# schema-drift-scan.sh — 结构漂移扫描：列差异（按 schema 分组）+ 独有表清单
# =============================================================================
# 背景（2026-10-07 自愈验证产物，②-rehome 后 B+C 机制的第一步）:
#   5432 演进库 vs 5433 空库重建基线存在系统性结构差异（列差异曾 2203、
#   服务启动自补 58% 后残余 914），根因 = 迁移链与运行时内联 DDL 双事实源。
#   本脚本把"差异扫描"固化为可复现命令，供：
#     - 本地对拍：scan 模式（两库直接对比，不启动服务）
#     - 自愈验证：selfheal 模式（空库重放后启动服务，量化"启动自补"增量）
#     - 后续 CI 挂载：以报告文件为断言输入
#
# 用法:
#   scripts/schema-drift-scan.sh scan    BASE_URL TARGET_URL
#       直接对比两库 information_schema.columns（不启动任何服务）。
#       输出: BASE 有/TARGET 无 的列差异（按 schema 分组）、独有表、反向差异。
#
#   scripts/schema-drift-scan.sh selfheal BASE_URL TARGET_URL [PORT]
#       要求 TARGET_URL 已重放迁移链（sqlx migrate run 全量 success，脚本校验
#       账本条数 = 迁移文件数；不自动 DROP，避免误删）。
#       流程: 导出 TARGET 迁移后结构 → 启动 monolith 连 TARGET（SERVER_PORT=PORT
#       默认 8098）→ 等待 health → 再导出 → 输出三段报告:
#         (1) 启动自补增量（列数/表数，即运行时内联 DDL 覆盖度）
#         (2) 自愈后 vs BASE 残余差异（按 schema 分组列清单 + 独有表）
#         (3) 反向差异（TARGET 独有，重建产物噪音）
#       结束自动终止临时服务（trap）。
#
# 依赖: psql、python3、（selfheal 需本仓库 target/debug/topems-server 与 sqlx）
# 退出码: 0 = 正常完成（无论差异多少，报告为准）；非 0 = 环境/前置失败
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TS="$(date +%Y%m%d-%H%M%S)"
REPORT_DIR="${SCHEMA_DRIFT_REPORT_DIR:-/tmp/schema-drift-$TS}"
mkdir -p "$REPORT_DIR"

log() { printf '[schema-drift] %s\n' "$*" >&2; }

die() { log "FATAL: $*"; exit 1; }

export_columns() { # $1=db_url $2=out_file
    psql "$1" -tA -F'|' -c \
        "SELECT table_schema, table_name, column_name FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2,3" \
        > "$2"
}

analyze() { # $1=base_cols $2=target_cols $3=prefix(报告标题)
    python3 - "$1" "$2" "$3" <<'PYEOF'
import sys
from collections import defaultdict, Counter

base_f, target_f, prefix = sys.argv[1], sys.argv[2], sys.argv[3]

def load(fn):
    d = defaultdict(set)
    for l in open(fn):
        p = l.rstrip('\n').split('|')
        if len(p) == 3:
            d[(p[0], p[1])].add(p[2])
    return d

a, b = load(base_f), load(target_f)
missing = sorted((s, t, c) for (s, t), cols in a.items()
                 if (s, t) in b for c in cols - b[(s, t)])
extra = sorted((s, t, c) for (s, t), cols in b.items()
               if (s, t) in a for c in cols - a[(s, t)])
only_a = sorted((s, t) for (s, t) in a if (s, t) not in b)
only_b = sorted((s, t) for (s, t) in b if (s, t) not in a)

print(f"===== {prefix} =====")
print(f"同表列差异（BASE 有/TARGET 无）: {len(missing)}")
print(f"同表列反向（TARGET 有/BASE 无）: {len(extra)}")
print(f"BASE 独有表: {len(only_a)}、TARGET 独有表: {len(only_b)}")
print()
if missing:
    c = Counter(s for s, _t, _col in missing)
    print("-- 列差异按 schema 分组 --")
    for s, n in c.most_common():
        print(f"{s}: {n}")
    print()
    print("-- 列差异明细（BASE 有/TARGET 无）--")
    for s, t, col in missing:
        print(f"  {s}.{t}.{col}")
if only_a:
    print()
    print("-- BASE 独有表（TARGET 无）--")
    for s, t in only_a:
        print(f"  {s}.{t}")
if only_b:
    print()
    print("-- TARGET 独有表（BASE 无，重建产物）--")
    for s, t in only_b:
        print(f"  {s}.{t}")
PYEOF
}

cmd="${1:-}"
case "$cmd" in
    scan)
        [ $# -eq 3 ] || die "scan 需 BASE_URL TARGET_URL 两个参数"
        base_url="$2"; target_url="$3"
        bf="$REPORT_DIR/base.cols"; tf="$REPORT_DIR/target.cols"
        log "导出列结构: BASE=$base_url TARGET=$target_url"
        export_columns "$base_url" "$bf"
        export_columns "$target_url" "$tf"
        analyze "$bf" "$tf" "结构漂移报告（scan 模式）"
        log "报告: $REPORT_DIR"
        ;;
    selfheal)
        [ $# -ge 3 ] || die "selfheal 需 BASE_URL TARGET_URL [PORT] 参数"
        base_url="$2"; target_url="$3"; port="${4:-8098}"
        # 前置 1: monolith 二进制存在
        [ -x "$REPO_ROOT/target/debug/topems-server" ] || die "缺少 target/debug/topems-server，请先 cargo build"
        # 前置 2: TARGET 已重放迁移（账本 success 数 = 迁移文件数）
        mig_files="$(find "$REPO_ROOT/database/migrations" -maxdepth 1 -name '*.sql' | wc -l | tr -d ' ')"
        ledger_n="$(psql "$target_url" -tA -c "SELECT count(*) FROM _sqlx_migrations WHERE success" | tr -d ' ')"
        [ "$ledger_n" = "$mig_files" ] || die "TARGET 迁移账本 ${ledger_n} != 文件数 ${mig_files}；请先对 TARGET 全量重放迁移链"
        # 前置 3: 端口空闲
        if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
            die "端口 $port 被占用，请指定空闲端口"
        fi
        # 1) 迁移后（启动前）结构
        pre_f="$REPORT_DIR/pre_selfheal.cols"
        export_columns "$target_url" "$pre_f"
        log "已导出迁移后结构（启动前），共 $(wc -l < "$pre_f" | tr -d ' ') 列"
        # 2) 启动 monolith 连 TARGET
        log "启动 monolith: SERVER_PORT=$port DATABASE_URL=$target_url"
        SERVER_PORT="$port" DATABASE_URL="$target_url" \
            nohup "$REPO_ROOT/target/debug/topems-server" \
            > "$REPORT_DIR/server.log" 2>&1 &
        svc_pid=$!
        # 只终止本脚本启动的进程（pkill -f topems-server 会误杀 5432 生产实例）
        trap 'kill "$svc_pid" 2>/dev/null || true' EXIT
        # 3) 等待 health
        ok=0
        for _ in $(seq 1 60); do
            if curl -sf -o /dev/null "http://localhost:$port/api/server/health"; then
                ok=1; break
            fi
            sleep 2
        done
        [ "$ok" = 1 ] || die "服务 ${port} 120s 内未就绪，见 $REPORT_DIR/server.log"
        log "服务 health OK（${port}）"
        sleep 5
        # 4) 启动后结构
        post_f="$REPORT_DIR/post_selfheal.cols"
        export_columns "$target_url" "$post_f"
        # 5) 自愈增量 = post - pre（同表新增列 + 新增表）
        python3 - "$pre_f" "$post_f" "$REPORT_DIR/selfheal_gain.txt" <<'PYEOF'
import sys
from collections import defaultdict
pre_f, post_f, out = sys.argv[1], sys.argv[2], sys.argv[3]

def load(fn):
    d = defaultdict(set)
    for l in open(fn):
        p = l.rstrip('\n').split('|')
        if len(p) == 3:
            d[(p[0], p[1])].add(p[2])
    return d
a, b = load(pre_f), load(post_f)
gain_cols = sorted((s, t, c) for (s, t), cols in a.items()
                   if (s, t) in b for c in cols - b[(s, t)])
gain_cols += sorted((s, t, c) for (s, t), cols in b.items()
                    if (s, t) not in a for c in cols)
gain_tabs = sorted((s, t) for (s, t) in b if (s, t) not in a)
with open(out, 'w') as f:
    f.write(f"启动自补列: {len(gain_cols)}\n")
    f.write(f"启动自建表: {len(gain_tabs)}\n")
    f.write("-- 自补列明细 --\n")
    for s, t, c in gain_cols:
        f.write(f"{s}.{t}.{c}\n")
    f.write("-- 自建表明细 --\n")
    for s, t in gain_tabs:
        f.write(f"{s}.{t}\n")
print(f"启动自补列: {len(gain_cols)}、启动自建表: {len(gain_tabs)}")
print(f"自愈增量明细: {out}")
PYEOF
        # 6) 自愈后 vs BASE 残余差异 + 反向
        export_columns "$base_url" "$REPORT_DIR/base.cols"
        analyze "$REPORT_DIR/base.cols" "$post_f" "自愈后残余差异（BASE=5432 演进库 / TARGET=空库重建+启动自愈）"
        log "报告目录: $REPORT_DIR"
        ;;
    *)
        die "未知命令 '$cmd'；用法: scan BASE_URL TARGET_URL | selfheal BASE_URL TARGET_URL [PORT]"
        ;;
esac
