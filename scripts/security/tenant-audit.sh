#!/usr/bin/env bash
#
# tenant-audit.sh — Multi-tenant isolation audit for TOPEMS
#
# Scans SQL migration/init files and Rust service entry points to report
# tenant_id column coverage, RLS enablement, and middleware usage.
#
# Usage:
#   bash scripts/security/tenant-audit.sh [output.md]
#   TENANT_AUDIT_THRESHOLD=0 bash scripts/security/tenant-audit.sh
#
# Exit code:
#   0 if the number of tables missing both tenant_id and RLS is <= threshold
#   1 otherwise (default threshold = 0)
#
set -e

# Ensure consistent byte-oriented sorting regardless of system locale
export LC_ALL=C

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_FILE="${1:-}"
THRESHOLD="${TENANT_AUDIT_THRESHOLD:-0}"
REPORT_DATE="$(date +%Y%m%d)"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

TABLES_FILE="$WORK_DIR/tables.txt"
TENANT_FILE="$WORK_DIR/tenant_tables.txt"
RLS_FILE="$WORK_DIR/rls_tables.txt"

# ---------------------------------------------------------------------------
# 1. Discover SQL files that define/init tables
# ---------------------------------------------------------------------------
find_sql_files() {
    # Service migrations and init scripts
    find "$ROOT_DIR/svc" -maxdepth 3 -type f \( \
        -path '*/migrations/*.sql' -o \
        -name 'init.sql' \
    \) 2>/dev/null

    # Shared/core migrations
    find "$ROOT_DIR/database" -maxdepth 3 -type f -name '*.sql' 2>/dev/null | \
        grep -v '/test/' | \
        grep -v '/init/README.md'

    # Legacy root migrations
    find "$ROOT_DIR/migrations" -maxdepth 2 -type f -name '*.sql' 2>/dev/null
}

# ---------------------------------------------------------------------------
# 2. Extract table names from CREATE TABLE statements.
#    Emits lines with a leading "kind" field:
#      TABLE|<service>|<schema>|<table>|<canonical_key>|<file>
#      TENANT|<canonical_key>
# ---------------------------------------------------------------------------
extract_tables() {
    local file="$1"
    local service
    service="$(service_from_path "$file")"

    awk -v svc="$service" -v f="$file" '
        BEGIN { RS = ";" }
        /CREATE[[:space:]]+TABLE/ {
            raw = $0
            # Drop comments before flattening whitespace
            gsub(/\/\*[^*]*\*\//, "", raw)
            gsub(/--[^\n]*/, "", raw)
            # Flatten and normalize whitespace
            stmt = raw
            gsub(/\n/, " ", stmt)
            gsub(/[[:space:]]+/, " ", stmt)
            # Strip everything up to and including the table name prefix
            sub(/.*CREATE[[:space:]]+TABLE[[:space:]]+/, "", stmt)
            sub(/IF[[:space:]]+NOT[[:space:]]+EXISTS[[:space:]]+/, "", stmt)
            sub(/[[:space:]]*\(.*/, "", stmt)
            sub(/[[:space:]]+;/, "", stmt)
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", stmt)
            if (stmt == "") next

            schema = "public"
            table = stmt
            if (table ~ /\./) {
                n = split(table, parts, /\./)
                schema = parts[n-1]
                table = parts[n]
            }
            gsub(/"/, "", schema)
            gsub(/"/, "", table)
            key = schema "." table
            print "TABLE|" svc "|" schema "|" table "|" key "|" f
            if (raw ~ /tenant_id/) {
                print "TENANT|" key
            }
        }
    ' "$file" 2>/dev/null
}

# ---------------------------------------------------------------------------
# 3. Extract tables that receive tenant_id via ALTER TABLE ... ADD COLUMN.
#    Handles multi-line statements (including those inside DO blocks).
#    Emits: TENANT|<canonical_key>
# ---------------------------------------------------------------------------
extract_tenant_alterations() {
    local file="$1"

    awk '
        BEGIN { RS = ";" }
        /ALTER[[:space:]]+TABLE/ && /tenant_id/ {
            raw = $0
            # Strip comments
            gsub(/\/\*[^*]*\*\//, "", raw)
            gsub(/--[^\n]*/, "", raw)
            # Flatten whitespace
            stmt = raw
            gsub(/\n/, " ", stmt)
            gsub(/[[:space:]]+/, " ", stmt)

            # Find each ALTER TABLE ... tenant_id occurrence in the chunk
            while (match(stmt, /ALTER[[:space:]]+TABLE[[:space:]]+((IF[[:space:]]+(NOT[[:space:]]+)?EXISTS[[:space:]]+)?[^[:space:];]+)[[:space:]]+ADD([[:space:]]+COLUMN)?([[:space:]]+IF[[:space:]]+(NOT[[:space:]]+)?EXISTS)?[[:space:]]+tenant_id/)) {
                table_part = substr(stmt, RSTART, RLENGTH)
                sub(/ALTER[[:space:]]+TABLE[[:space:]]+/, "", table_part)
                sub(/IF[[:space:]]+(NOT[[:space:]]+)?EXISTS[[:space:]]+/, "", table_part)
                sub(/[[:space:]]+ADD([[:space:]]+COLUMN)?([[:space:]]+IF[[:space:]]+(NOT[[:space:]]+)?EXISTS)?[[:space:]]+tenant_id.*/, "", table_part)
                gsub(/^[[:space:]]+|[[:space:]]+$/, "", table_part)

                schema = "public"
                table = table_part
                if (table ~ /\./) {
                    n = split(table, parts, /\./)
                    schema = parts[n-1]
                    table = parts[n]
                }
                gsub(/"/, "", schema)
                gsub(/"/, "", table)
                print "TENANT|" schema "." table

                # Advance past this match
                stmt = substr(stmt, RSTART + RLENGTH)
            }
        }
    ' "$file" 2>/dev/null
}

# ---------------------------------------------------------------------------
# 4. For the dedicated RLS-remaining migration, every table that gets RLS
#    also gets tenant_id added in the same section. Emit TENANT for them.
# ---------------------------------------------------------------------------
extract_tenant_from_rls_migration() {
    local file="$1"

    grep -iE '^[[:space:]]*ALTER[[:space:]]+TABLE[[:space:]]+(IF[[:space:]]+EXISTS[[:space:]]+)?[a-zA-Z0-9_."]+[[:space:]]+ENABLE[[:space:]]+ROW[[:space:]]+LEVEL[[:space:]]+SECURITY' "$file" 2>/dev/null | \
    sed -E 's/^[[:space:]]*ALTER[[:space:]]+TABLE[[:space:]]+(IF[[:space:]]+EXISTS[[:space:]]+)?//i' | \
    sed -E 's/[[:space:]]+ENABLE[[:space:]]+ROW[[:space:]]+LEVEL[[:space:]]+SECURITY.*//' | \
    sed -E 's/[[:space:]]*;.*//' | \
    awk '
        {
            gsub(/^[ \t]+|[ \t]+$/, "")
            schema = "public"
            table = $0
            if (table ~ /\./) {
                n = split(table, parts, /\./)
                schema = parts[n-1]
                table = parts[n]
            }
            gsub(/"/, "", schema)
            gsub(/"/, "", table)
            print "TENANT|" schema "." table
        }
    '
}

# ---------------------------------------------------------------------------
# 4. Determine which service a SQL file belongs to
# ---------------------------------------------------------------------------
service_from_path() {
    local file="$1"
    if [[ "$file" == */svc/* ]]; then
        echo "$file" | sed -E 's#.*/svc/([^/]+)/.*#\1#'
    elif [[ "$file" == */database/migrations/rls_remaining_tables.sql ]]; then
        echo "rls-remaining"
    elif [[ "$file" == */database/* || "$file" == */migrations/* ]]; then
        echo "core"
    else
        echo "other"
    fi
}

# ---------------------------------------------------------------------------
# 5. Build table lists
# ---------------------------------------------------------------------------
build_table_index() {
    > "$TABLES_FILE"
    > "$TENANT_FILE"
    > "$RLS_FILE"

    while IFS= read -r file; do
        [ -f "$file" ] || continue

        # Per-table extraction from CREATE TABLE + ALTER TABLE ADD COLUMN
        extract_tables "$file" | while IFS='|' read -r kind svc schema table key f; do
            [ -z "$key" ] && continue
            if [ "$kind" = "TABLE" ]; then
                printf '%s|%s|%s|%s|%s\n' "$svc" "$schema" "$table" "$key" "$f" >> "$TABLES_FILE"
            elif [ "$kind" = "TENANT" ]; then
                printf '%s\n' "$key" >> "$TENANT_FILE"
            fi
        done

        extract_tenant_alterations "$file" | while IFS='|' read -r kind key; do
            [ "$kind" = "TENANT" ] && [ -n "$key" ] && printf '%s\n' "$key" >> "$TENANT_FILE"
        done

        # The dedicated RLS migration adds tenant_id and RLS in the same section.
        if [[ "$(basename "$file")" == "rls_remaining_tables.sql" ]]; then
            extract_tenant_from_rls_migration "$file" | while IFS='|' read -r kind key; do
                [ "$kind" = "TENANT" ] && [ -n "$key" ] && printf '%s\n' "$key" >> "$TENANT_FILE"
            done
        fi

        # Extract RLS enable statements: ALTER TABLE [IF EXISTS] [schema.]table ENABLE RLS
        grep -iE '^[[:space:]]*ALTER[[:space:]]+TABLE[[:space:]]+(IF[[:space:]]+EXISTS[[:space:]]+)?[a-zA-Z0-9_."]+[[:space:]]+ENABLE[[:space:]]+ROW[[:space:]]+LEVEL[[:space:]]+SECURITY' "$file" 2>/dev/null | \
        sed -E 's/^[[:space:]]*ALTER[[:space:]]+TABLE[[:space:]]+(IF[[:space:]]+EXISTS[[:space:]]+)?//i' | \
        sed -E 's/[[:space:]]+ENABLE[[:space:]]+ROW[[:space:]]+LEVEL[[:space:]]+SECURITY.*//' | \
        sed -E 's/[[:space:]]*;.*//' | \
        awk '
            {
                gsub(/^[ \t]+|[ \t]+$/, "")
                schema = "public"
                table = $0
                if (table ~ /\./) {
                    n = split(table, parts, /\./)
                    schema = parts[n-1]
                    table = parts[n]
                }
                gsub(/"/, "", schema)
                gsub(/"/, "", table)
                print schema "." table
            }
        ' >> "$RLS_FILE"
    done

    sort -u "$TENANT_FILE" -o "$TENANT_FILE"
    sort -u "$RLS_FILE" -o "$RLS_FILE"
    sort -u "$TABLES_FILE" -o "$TABLES_FILE"
}

# ---------------------------------------------------------------------------
# 6. Middleware checks per service
# ---------------------------------------------------------------------------
list_services() {
    find "$ROOT_DIR/svc" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | \
        sed -E 's#.*/##' | sort
}

check_middleware() {
    local svc="$1"
    local main_file="$ROOT_DIR/svc/$svc/src/main.rs"
    local status="none"
    if [ -f "$main_file" ]; then
        if grep -qE '\b(rls_middleware|RlsMiddleware)\b' "$main_file" 2>/dev/null; then
            status="rls"
        fi
        if grep -qE '\b(tenant_middleware|TenantMiddleware|tenant_rls_middleware)\b' "$main_file" 2>/dev/null; then
            if [ "$status" = "rls" ]; then
                status="rls+tenant"
            else
                status="tenant"
            fi
        fi
        # unified-core uses tenant_rls_middleware in routes, not main.rs
        if [ "$svc" = "unified-core" ] && [ "$status" = "none" ]; then
            if grep -qE '\btenant_rls_middleware\b' "$ROOT_DIR/svc/$svc/src/routes/mod.rs" 2>/dev/null; then
                status="tenant-rls (routes)"
            fi
        fi
    fi
    echo "$status"
}

# ---------------------------------------------------------------------------
# 7. Generate Markdown report
# ---------------------------------------------------------------------------
generate_report() {
    {
        echo "# TOPEMS 多租户隔离审计报告"
        echo ""
        echo "生成日期：$(date '+%Y-%m-%d %H:%M:%S %z')"
        echo ""
        echo "> 说明：本报告基于 SQL 迁移/初始化文件与 Rust 服务入口的静态扫描生成，"
        echo "> 结果可能与数据库实际运行状态存在偏差。标有 ⚠️ 的项为重点关注缺口。"
        echo ""

        # ---- Executive summary ----
        local total_services total_tables tables_with_tenant tables_with_rls
        total_services="$(list_services | wc -l | tr -d ' ')"
        total_tables="$(cut -d'|' -f4 "$TABLES_FILE" | sort -u | wc -l | tr -d ' ')"
        tables_with_tenant="$(wc -l < "$TENANT_FILE" | tr -d ' ')"
        tables_with_rls="$(wc -l < "$RLS_FILE" | tr -d ' ')"

        # tenant_id / RLS references that match a known CREATE TABLE definition
        local tenant_known_count tenant_orphan_count
        tenant_known_count="$(comm -12 <(cut -d'|' -f4 "$TABLES_FILE" | sort -u) "$TENANT_FILE" | wc -l | tr -d ' ')"
        tenant_orphan_count="$(comm -23 "$TENANT_FILE" <(cut -d'|' -f4 "$TABLES_FILE" | sort -u) | wc -l | tr -d ' ')"

        local rls_known_count rls_orphan_count
        rls_known_count="$(comm -12 <(cut -d'|' -f4 "$TABLES_FILE" | sort -u) "$RLS_FILE" | wc -l | tr -d ' ')"
        rls_orphan_count="$(comm -23 "$RLS_FILE" <(cut -d'|' -f4 "$TABLES_FILE" | sort -u) | wc -l | tr -d ' ')"

        local tenant_known_pct=0 rls_known_pct=0
        if [ "$total_tables" -gt 0 ]; then
            tenant_known_pct="$(awk "BEGIN { printf \"%.1f\", ($tenant_known_count / $total_tables) * 100 }")"
            rls_known_pct="$(awk "BEGIN { printf \"%.1f\", ($rls_known_count / $total_tables) * 100 }")"
        fi

        echo "## 1. 执行摘要"
        echo ""
        echo "| 指标 | 数值 |"
        echo "|------|------|"
        echo "| 服务总数 | $total_services |"
        echo "| 扫描表总数 | $total_tables |"
        echo "| 含 tenant_id 的已知表 | $tenant_known_count ($tenant_known_pct%) |"
        echo "| tenant_id 总引用数 | $tables_with_tenant |"
        echo "| tenant_id 引用但未扫描到定义的表 | $tenant_orphan_count |"
        echo "| 启用 RLS 的已知表 | $rls_known_count ($rls_known_pct%) |"
        echo "| RLS 总引用数 | $tables_with_rls |"
        echo "| RLS 引用但未扫描到定义的表 | $rls_orphan_count |"
        echo "| tenant_id 覆盖率（按已知表） | $tenant_known_pct% |"
        echo "| RLS 覆盖率（按已知表） | $rls_known_pct% |"
        echo ""

        # ---- Per-service breakdown ----
        echo "## 2. 按服务维度拆分"
        echo ""
        echo "| 服务 | 表数量 | 含 tenant_id | 启用 RLS | 缺 tenant_id | 缺 RLS | 中间件状态 |"
        echo "|------|--------|--------------|----------|--------------|--------|------------|"

        local svc
        for svc in $(list_services); do
            local svc_tables table_count=0 mt_list="" mr_list="" tenant_count=0 rls_count=0
            svc_tables="$(awk -F'|' -v s="$svc" '$1==s {print $4}' "$TABLES_FILE" | sort -u)"
            [ -z "$svc_tables" ] && continue

            while IFS= read -r key; do
                [ -z "$key" ] && continue
                table_count=$((table_count + 1))
                if grep -qx "$key" "$TENANT_FILE"; then
                    tenant_count=$((tenant_count + 1))
                else
                    mt_list="$mt_list$key, "
                fi
                if grep -qx "$key" "$RLS_FILE"; then
                    rls_count=$((rls_count + 1))
                else
                    mr_list="$mr_list$key, "
                fi
            done <<< "$svc_tables"

            local missing_tenant="${mt_list%, }"
            local missing_rls="${mr_list%, }"
            local mw="$(check_middleware "$svc")"

            local status_mark=""
            if [ "$table_count" -gt 0 ] && { [ "$tenant_count" -lt "$table_count" ] || [ "$rls_count" -lt "$table_count" ] || [ "$mw" = "none" ]; }; then
                status_mark=" ⚠️"
            fi

            printf '| %s%s | %d | %d | %d | %s | %s | %s |\n' \
                "$svc" "$status_mark" "$table_count" "$tenant_count" "$rls_count" \
                "${missing_tenant:--}" "${missing_rls:--}" "$mw"
        done

        # Core / shared tables
        local core_tables="$(awk -F'|' '$1=="core" {print $4}' "$TABLES_FILE" | sort -u)"
        if [ -n "$core_tables" ]; then
            local table_count=0 mt_list="" mr_list="" tenant_count=0 rls_count=0
            while IFS= read -r key; do
                [ -z "$key" ] && continue
                table_count=$((table_count + 1))
                if grep -qx "$key" "$TENANT_FILE"; then
                    tenant_count=$((tenant_count + 1))
                else
                    mt_list="$mt_list$key, "
                fi
                if grep -qx "$key" "$RLS_FILE"; then
                    rls_count=$((rls_count + 1))
                else
                    mr_list="$mr_list$key, "
                fi
            done <<< "$core_tables"
            local missing_tenant="${mt_list%, }"
            local missing_rls="${mr_list%, }"
            printf '| %s | %d | %d | %d | %s | %s | %s |\n' \
                "core/shared" "$table_count" "$tenant_count" "$rls_count" \
                "${missing_tenant:--}" "${missing_rls:--}" "N/A"
        fi

        echo ""

        # ---- Missing tenant_id tables ----
        echo "## 3. 缺少 tenant_id 的表（待补全）"
        echo ""
        local missing_tenant_all=""
        cut -d'|' -f4 "$TABLES_FILE" | sort -u | while IFS= read -r key; do
            [ -z "$key" ] && continue
            if ! grep -qx "$key" "$TENANT_FILE"; then
                local svc="$(awk -F'|' -v k="$key" '$4==k {print $1; exit}' "$TABLES_FILE")"
                printf -- '- `%s` （%s）\n' "$key" "$svc"
            fi
        done
        echo ""

        # ---- Missing RLS tables ----
        echo "## 4. 未启用 RLS 的已知表（待启用）"
        echo ""
        cut -d'|' -f4 "$TABLES_FILE" | sort -u | while IFS= read -r key; do
            [ -z "$key" ] && continue
            if ! grep -qx "$key" "$RLS_FILE"; then
                local svc="$(awk -F'|' -v k="$key" '$4==k {print $1; exit}' "$TABLES_FILE")"
                printf -- '- `%s` （%s）\n' "$key" "$svc"
            fi
        done
        echo ""

        # ---- Tables missing both ----
        echo "## 5. 同时缺少 tenant_id 与 RLS 的高风险表"
        echo ""
        local both_count=0
        both_count="$(cut -d'|' -f4 "$TABLES_FILE" | sort -u | while IFS= read -r key; do
            [ -z "$key" ] && continue
            if ! grep -qx "$key" "$TENANT_FILE" && ! grep -qx "$key" "$RLS_FILE"; then
                local svc="$(awk -F'|' -v k="$key" '$4==k {print $1; exit}' "$TABLES_FILE")"
                printf -- '- `%s` （%s）\n' "$key" "$svc"
            fi
        done | tee "$WORK_DIR/both_missing.txt" | wc -l | tr -d ' ')"

        if [ -f "$WORK_DIR/both_missing.txt" ] && [ -s "$WORK_DIR/both_missing.txt" ]; then
            cat "$WORK_DIR/both_missing.txt"
        else
            echo "未发现同时缺少 tenant_id 与 RLS 的表。"
        fi
        echo ""

        # ---- tenant_id orphans ----
        echo "## 6. tenant_id 引用但未扫描到 CREATE TABLE 定义的表"
        echo ""
        echo "> 以下表在 tenant_id 迁移中被引用，但在扫描范围内未找到对应的 CREATE TABLE 语句。"
        echo "> 可能原因：表名/ schema 不匹配、表已删除、或定义在未被扫描的文件中。"
        echo ""
        comm -23 "$TENANT_FILE" <(cut -d'|' -f4 "$TABLES_FILE" | sort -u) | while IFS= read -r key; do
            [ -z "$key" ] && continue
            printf -- '- `%s`\n' "$key"
        done
        echo ""

        # ---- RLS orphans ----
        echo "## 7. RLS 引用但未扫描到 CREATE TABLE 定义的表"
        echo ""
        echo "> 以下表在 RLS 迁移中被引用，但在扫描范围内未找到对应的 CREATE TABLE 语句。"
        echo "> 可能原因：表名/ schema 不匹配、表已删除、或定义在未被扫描的文件中。"
        echo ""
        comm -23 "$RLS_FILE" <(cut -d'|' -f4 "$TABLES_FILE" | sort -u) | while IFS= read -r key; do
            [ -z "$key" ] && continue
            printf -- '- `%s`\n' "$key"
        done
        echo ""

        # ---- Recommendations ----
        echo "## 8. 优先级建议"
        echo ""
        echo "1. **高优先级（业务数据表）**：对同时缺少 tenant_id 与 RLS 的表，"
        echo "   优先评估是否存储了跨租户敏感数据。若是，应立即添加 tenant_id 列并启用 RLS 策略。"
        echo "2. **中优先级（RLS 补齐）**：对已含 tenant_id 但未启用 RLS 的表，"
        echo "   通过 \`ALTER TABLE ... ENABLE ROW LEVEL SECURITY\` 与策略绑定补齐。"
        echo "3. **中间件覆盖**：确认所有业务服务在路由层均应用了 rls_middleware / tenant_middleware；"
        echo "   对标记为 \`none\` 的服务需重点复查。"
        echo "4. **表名/schema 校准**：对 tenant_id/RLS 引用但未扫描到定义的表，核对 schema/表名一致性，"
        echo "   清理已删除表的残留引用，统一命名规范。"
        echo "5. **验证机制**：建议在 CI 中保持本脚本运行，并将阈值逐步下调至 0。"
        echo ""

        echo "## 9. 扫描范围与假设"
        echo ""
        echo "- 扫描路径：\`svc/*/migrations/*.sql\`、\`svc/*/init.sql\`、\`database/**/*.sql\`、\`migrations/*.sql\`"
        echo "- 排除：\`database/test/\`、模板生成器测试 SQL。"
        echo "- tenant_id 检测来源：CREATE TABLE 语句含 tenant_id 列，或 ALTER TABLE ... ADD COLUMN tenant_id。"
        echo "- 表名去重以 schema.table 为键；未指定 schema 的默认按 \`public\` 处理。"
        echo "- RLS 覆盖率按「已知 CREATE TABLE 定义且启用 RLS」计算，避免引用未扫描表导致虚高。"
        echo ""
    } > "$WORK_DIR/report.md"

    if [ -n "$OUTPUT_FILE" ]; then
        mkdir -p "$(dirname "$OUTPUT_FILE")"
        cp "$WORK_DIR/report.md" "$OUTPUT_FILE"
        echo "Report written to: $OUTPUT_FILE" >&2
    fi

    cat "$WORK_DIR/report.md"

    # Return count of tables missing both
    echo "$both_count" > "$WORK_DIR/both_count.txt"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    find_sql_files > "$WORK_DIR/sql_files.txt"
    build_table_index < "$WORK_DIR/sql_files.txt"
    cp "$WORK_DIR/tables.txt" /tmp/tenant_audit_tables.txt
    cp "$WORK_DIR/tenant_tables.txt" /tmp/tenant_audit_tenant.txt
    cp "$WORK_DIR/rls_tables.txt" /tmp/tenant_audit_rls.txt

    if [ -n "$OUTPUT_FILE" ]; then
        generate_report > /dev/null
        cat "$WORK_DIR/report.md"
    else
        generate_report
    fi

    local both_count
    both_count="$(cat "$WORK_DIR/both_count.txt")"

    echo "" >&2
    echo "Audit complete. Tables missing both tenant_id and RLS: $both_count (threshold: $THRESHOLD)" >&2

    if [ "$both_count" -gt "$THRESHOLD" ]; then
        exit 1
    fi
    exit 0
}

main "$@"
