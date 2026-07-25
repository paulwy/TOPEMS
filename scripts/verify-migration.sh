#!/usr/bin/env bash
# =============================================================================
# TOPEMS 页面迁移验证脚本 (verify-migration.sh)
# =============================================================================
#
# 用途:
#   验证指定的页面文件是否已完成向 Schema 驱动的 CrudPage 架构迁移。
#
# 针对每个页面文件执行以下检查:
#   1. 文件是否存在
#   2. 是否导入了 CrudPage 组件
#   3. 是否导入了对应的 Schema (例如 materialSchema)
#   4. 是否使用了 createCrudApiAdapter 或 apiAdapter 模式
#   5. 代码行数相比 git HEAD 版本是否减少 >= 70%
#   6. 是否不再包含内联 FormFieldConfig 硬编码字段定义
#
# 然后使用 `npx tsc --noEmit` 对指定文件进行 TypeScript 类型检查。
# 最终输出结构化的 PASS/FAIL 报告和汇总统计。
#
# -----------------------------------------------------------------------------
# 用法示例:
#
#   # 验证单个页面
#   bash scripts/verify-migration.sh apps/web/src/pages/erp/MaterialManagementPage.tsx
#
#   # 验证多个页面
#   bash scripts/verify-migration.sh \
#       apps/web/src/pages/erp/MaterialManagementPage.tsx \
#       apps/web/src/pages/erp/CustomerManagementPage.tsx
#
#   # 通配符 / 来自其他命令的输入
#   bash scripts/verify-migration.sh $(git diff --name-only HEAD~1 | grep 'pages/')
#
#   # 在 CI 中使用 (可通过 MIGRATION_LINE_REDUCTION_THRESHOLD 调整阈值)
#   MIGRATION_LINE_REDUCTION_THRESHOLD=70 \
#   bash scripts/verify-migration.sh apps/web/src/pages/erp/MaterialManagementPage.tsx
#
#   # 开启 STRICT_MODE, 任一检查失败即退出码 1
#   STRICT_MODE=true \
#   bash scripts/verify-migration.sh apps/web/src/pages/erp/MaterialManagementPage.tsx
#
# 可选环境变量:
#   MIGRATION_LINE_REDUCTION_THRESHOLD   行数缩减百分比阈值 (默认: 70)
#   STRICT_MODE=true                     任一 FAIL 时退出码为 1
#   SKIP_TSC=true                        跳过 tsc --noEmit 类型检查
# =============================================================================

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THRESHOLD="${MIGRATION_LINE_REDUCTION_THRESHOLD:-70}"
STRICT_MODE="${STRICT_MODE:-false}"
SKIP_TSC="${SKIP_TSC:-false}"

# ---- 终端颜色 ---------------------------------------------------------------
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' CYAN='' BOLD='' NC=''
fi

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# 使用临时目录保存每文件的通过/失败计数, 避免 bash 3.2 (macOS) 不支持
# 关联数组 (declare -A) 的兼容性问题。
RESULT_DIR="$(mktemp -d -t verify-migration-XXXXXX)"
TS_CONFIG_TMP="$RESULT_DIR/tsconfig.json"
cleanup() {
  rm -rf "$RESULT_DIR"
}
trap cleanup EXIT

usage() {
  awk 'NR>=22 && NR<=45 && /^#/ {sub(/^# ?/, ""); print}' "$0"
  echo ""
  echo "用法: $0 <page_file1> [page_file2 ...]"
  echo "  参数: 一个或多个页面文件路径 (支持相对于仓库根目录或绝对路径)"
  exit 0
}

# ---- 辅助函数 ---------------------------------------------------------------
pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf "  ${GREEN}PASS${NC} %s\n" "$*"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf "  ${RED}FAIL${NC} %s\n" "$*"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  printf "  ${YELLOW}WARN${NC} %s\n" "$*"
}

resolve_path() {
  local p="$1"
  if [[ "$p" = /* ]]; then
    echo "$p"
  else
    echo "$REPO_ROOT/$p"
  fi
}

rel_path() {
  local full="$1"
  # 去除 REPO_ROOT 前缀, 兼容尾斜杠
  local rel="${full#$REPO_ROOT}"
  rel="${rel#/}"
  echo "$rel"
}

line_count() {
  local f="$1"
  if [[ -f "$f" ]]; then
    wc -l < "$f" | tr -d ' '
  else
    echo 0
  fi
}

# 尝试从 git HEAD 获取文件版本的行数
git_head_lines() {
  local rel="$1"
  if ! git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
    echo ""
    return
  fi
  local content
  content="$(git -C "$REPO_ROOT" show "HEAD:$rel" 2>/dev/null)" || true
  if [[ -z "$content" ]]; then
    echo ""
    return
  fi
  echo "$content" | wc -l | tr -d ' '
}

# 将文件路径转为安全的文件名 (替换 /)
safe_key() {
  echo "$1" | tr '/' '_'
}

# 读取/写入某文件的通过/失败计数
store_counts() {
  local key="$1" passed="$2" failed="$3"
  echo "${passed}:${failed}" > "$RESULT_DIR/$(safe_key "$key")"
}

get_counts() {
  local key="$1"
  local file="$RESULT_DIR/$(safe_key "$key")"
  if [[ -f "$file" ]]; then
    cat "$file"
  else
    echo "0:0"
  fi
}

# 检查是否存在内联 FormFieldConfig 定义
# 策略: 查找 FormFieldConfig 标识符, 并检测典型的硬编码模式 (fields: [...] 数组或大量类型字面量)
has_inline_field_defs() {
  local f="$1"

  # 查找 FormFieldConfig 引用
  if ! grep -q "FormFieldConfig" "$f" 2>/dev/null; then
    return 1
  fi

  # 典型硬编码模式: fields: [...] 或字段对象数组
  if grep -Eq 'fields[[:space:]]*:[[:space:]]*\[' "$f" 2>/dev/null; then
    return 0
  fi
  if grep -Eq 'fields[[:space:]]*=[[:space:]]*\[' "$f" 2>/dev/null; then
    return 0
  fi

  # 如果文件里有 FormFieldConfig 但没有 fields 数组, 可能只是类型引用
  # 宽松检查: 多次 FormFieldConfig 字面量通常意味着硬编码
  local count
  count="$(grep -c 'FormFieldConfig' "$f" 2>/dev/null || echo 0)"
  if [[ "${count:-0}" -ge 3 ]]; then
    return 0
  fi

  return 1
}

# ---- 参数解析 ---------------------------------------------------------------
if [[ $# -lt 1 ]]; then
  echo -e "${RED}错误: 未提供页面文件路径参数${NC}"
  echo ""
  echo "用法: $0 <page_file1> [page_file2 ...]"
  echo "示例: $0 apps/web/src/pages/erp/MaterialManagementPage.tsx"
  exit 2
fi

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
fi

# ---- 头部输出 ---------------------------------------------------------------
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     TOPEMS Page Migration Verification                      ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  仓库根目录: ${REPO_ROOT}"
echo -e "  行数缩减阈值: ${THRESHOLD}%"
echo -e "  STRICT_MODE: ${STRICT_MODE}"
echo -e "  SKIP_TSC: ${SKIP_TSC}"
echo ""
echo -e "${BOLD}────────────────────────────────────────────────────────────────${NC}"

# ---- 逐文件检查 -------------------------------------------------------------
FILES=("$@")

for raw_arg in "${FILES[@]}"; do
  full_path="$(resolve_path "$raw_arg")"
  rel="$(rel_path "$full_path")"

  echo ""
  echo -e "${BOLD}${CYAN}▶ 检查: ${rel}${NC}"
  echo -e "${BOLD}${CYAN}────────────────────────────────────────────────────────────────${NC}"

  file_passed=0
  file_failed=0

  # (1) 文件存在
  if [[ -f "$full_path" ]]; then
    pass "文件存在"
    file_passed=$((file_passed + 1))
  else
    fail "文件不存在: ${full_path}"
    file_failed=$((file_failed + 1))
    store_counts "$rel" "$file_passed" "$file_failed"
    continue
  fi

  # (2) CrudPage 导入检查
  if grep -Eq "import[[:space:]]+[^;]*CrudPage" "$full_path" 2>/dev/null; then
    pass "包含 CrudPage import"
    file_passed=$((file_passed + 1))
  else
    fail "未检测到 CrudPage import"
    file_failed=$((file_failed + 1))
  fi

  # (3) Schema 导入检查
  if grep -Eq "import[[:space:]]+[^;]*Schema" "$full_path" 2>/dev/null; then
    pass "包含 Schema import"
    file_passed=$((file_passed + 1))
  else
    fail "未检测到 Schema import"
    file_failed=$((file_failed + 1))
  fi

  # (4) apiAdapter / createCrudApiAdapter 检查
  if grep -Eq "createCrudApiAdapter" "$full_path" 2>/dev/null || \
     grep -Eq "apiAdapter[[:space:]]*[:=]" "$full_path" 2>/dev/null || \
     grep -Eq "CrudApiAdapter" "$full_path" 2>/dev/null; then
    pass "包含 createCrudApiAdapter 或 apiAdapter"
    file_passed=$((file_passed + 1))
  else
    fail "未检测到 createCrudApiAdapter / apiAdapter"
    file_failed=$((file_failed + 1))
  fi

  # (5) 行数缩减检查 (与 git HEAD 版本对比)
  current_lines="$(line_count "$full_path")"
  head_lines="$(git_head_lines "$rel")"

  if [[ -n "${head_lines:-}" && "${head_lines}" -gt 0 ]]; then
    if [[ "$head_lines" -gt "$current_lines" ]]; then
      reduction=$(( (head_lines - current_lines) * 100 / head_lines ))
    else
      reduction=0
    fi
    if [[ "$reduction" -ge "$THRESHOLD" ]]; then
      pass "行数缩减 ${reduction}% (HEAD: ${head_lines}, 当前: ${current_lines}) ≥ ${THRESHOLD}%"
      file_passed=$((file_passed + 1))
    else
      fail "行数缩减仅 ${reduction}% (HEAD: ${head_lines}, 当前: ${current_lines}) < ${THRESHOLD}%"
      file_failed=$((file_failed + 1))
    fi
  else
    warn "无法获取 git HEAD 版本 (${rel}) 用于行数对比, 跳过此项"
  fi

  # (6) 无硬编码字段定义
  if has_inline_field_defs "$full_path"; then
    fail "检测到内联 FormFieldConfig 硬编码字段定义 (应迁移至 Schema)"
    file_failed=$((file_failed + 1))
  else
    pass "未发现内联 FormFieldConfig 硬编码字段定义"
    file_passed=$((file_passed + 1))
  fi

  store_counts "$rel" "$file_passed" "$file_failed"
done

# ---- TypeScript 类型检查 ----------------------------------------------------
echo ""
echo -e "${BOLD}${CYAN}▶ TypeScript 类型检查 (npx tsc --noEmit)${NC}"
echo -e "${BOLD}${CYAN}────────────────────────────────────────────────────────────────${NC}"

if [[ "$SKIP_TSC" == "true" ]]; then
  warn "SKIP_TSC=true, 跳过 tsc --noEmit"
else
  # 构建仅包含目标文件的 tsconfig (使用 RESULT_DIR 中预先创建的路径)
  tsc_files_list=()
  for raw_arg in "${FILES[@]}"; do
    full_path="$(resolve_path "$raw_arg")"
    if [[ -f "$full_path" ]]; then
      tsc_files_list+=("$full_path")
    fi
  done

  if [[ ${#tsc_files_list[@]} -eq 0 ]]; then
    warn "无有效文件可供 tsc 检查"
  else
    # 查找项目 tsconfig.json 作为基础
    BASE_TSCONFIG=""
    for candidate in \
      "$REPO_ROOT/apps/web/tsconfig.json" \
      "$REPO_ROOT/tsconfig.json"; do
      if [[ -f "$candidate" ]]; then
        BASE_TSCONFIG="$candidate"
        break
      fi
    done

    # 生成一个仅包含指定文件的临时 tsconfig, 关闭 baseUrl 以避免新版本 tsc 报错
    {
      echo '{'
      if [[ -n "$BASE_TSCONFIG" ]]; then
        echo "  \"extends\": \"$BASE_TSCONFIG\","
      fi
      echo '  "compilerOptions": {'
      echo '    "noEmit": true,'
      echo '    "skipLibCheck": true,'
      echo '    "noEmitOnError": false,'
      echo '    "allowImportingTsExtensions": false,'
      echo '    "isolatedModules": false,'
      echo '    "paths": {'
      echo '      "@/*": ["./apps/web/src/*"]'
      echo '    },'
      echo '    "jsx": "react-jsx",'
      echo '    "module": "ESNext",'
      echo '    "moduleResolution": "Bundler",'
      echo '    "target": "ES2022",'
      echo '    "strict": true,'
      echo '    "esModuleInterop": true,'
      echo '    "resolveJsonModule": true'
      echo '  },'
      echo '  "include": ['
      local_first=true
      for f in "${tsc_files_list[@]}"; do
        if $local_first; then
          local_first=false
        else
          echo ","
        fi
        printf '    "%s"' "$f"
      done
      echo ''
      echo '  ]'
      echo '}'
    } > "$TS_CONFIG_TMP"

    TSC_OUTPUT="$(cd "$REPO_ROOT" && npx tsc --noEmit --project "$TS_CONFIG_TMP" 2>&1)" || TSC_EXIT=$?
    TSC_EXIT="${TSC_EXIT:-0}"

    if [[ "$TSC_EXIT" -eq 0 ]]; then
      pass "tsc --noEmit 类型检查通过 (${#tsc_files_list[@]} 个文件)"
    else
      fail "tsc --noEmit 类型检查失败 (退出码 ${TSC_EXIT})"
      if [[ -n "${TSC_OUTPUT:-}" ]]; then
        echo ""
        echo -e "${YELLOW}TypeScript 输出摘要 (前 30 行):${NC}"
        echo "$TSC_OUTPUT" | head -n 30 | sed 's/^/    /'
      fi
    fi
  fi
fi

# ---- 汇总 -------------------------------------------------------------------
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                          Summary                               ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  检查文件数:  ${#FILES[@]}"
echo -e "  ${GREEN}通过 (PASS)${NC}:   ${PASS_COUNT}"
echo -e "  ${RED}失败 (FAIL)${NC}:   ${FAIL_COUNT}"
echo -e "  ${YELLOW}警告 (WARN)${NC}:   ${WARN_COUNT}"
echo ""

echo -e "${BOLD}  每文件详情:${NC}"
echo ""
for raw_arg in "${FILES[@]}"; do
  full="$(resolve_path "$raw_arg")"
  rel_name="$(rel_path "$full")"
  counts="$(get_counts "$rel_name")"
  fp="${counts%%:*}"
  ff="${counts##*:}"
  total=$((fp + ff))
  if [[ "$ff" -eq 0 ]]; then
    status="${GREEN}✓ PASS${NC}"
  else
    status="${RED}✗ FAIL${NC}"
  fi
  printf "    %s %-50s %d/%d 项检查通过\n" \
    "$(echo -e "$status")" "$rel_name" "$fp" "$total"
done

echo ""
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo -e "${RED}${BOLD}✗ 存在 ${FAIL_COUNT} 项失败检查, 迁移验证未通过${NC}"
  overall_exit=1
else
  echo -e "${GREEN}${BOLD}✓ 全部检查通过, 迁移验证成功${NC}"
  overall_exit=0
fi

if [[ "$STRICT_MODE" == "true" && "$FAIL_COUNT" -gt 0 ]]; then
  echo -e "${YELLOW}  (STRICT_MODE=true, 退出码 1)${NC}"
  exit 1
fi

exit "$overall_exit"
