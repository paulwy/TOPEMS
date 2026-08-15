#!/usr/bin/env bash
#
# check-doc-links.sh — 扫描 docs/ 下所有 Markdown 文件的相对链接，
# 验证目标文件是否存在。用于防止文档断裂链接。
#
# 用法:
#   ./scripts/check-doc-links.sh              # 检查 docs/ 目录
#   ./scripts/check-doc-links.sh docs/api     # 检查指定子目录
#   ./scripts/check-doc-links.sh --strict     # 严格模式（有断链即 exit 1）
#
# 退出码:
#   0 — 全部链接有效（或 --strict 未启用时有警告）
#   1 — 存在断裂链接（仅 --strict 模式）
#   2 — 脚本错误（目录不存在等）
#

set -euo pipefail

STRICT=false
TARGET_DIR="docs"

# 解析参数
for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=true ;;
    -*) echo "未知参数: $arg"; exit 2 ;;
    *) TARGET_DIR="$arg" ;;
  esac
done

if [ ! -d "$TARGET_DIR" ]; then
  echo "错误: 目录 $TARGET_DIR 不存在"
  exit 2
fi

# 项目根目录（脚本所在目录的上级）
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

BROKEN_COUNT=0
CHECKED_COUNT=0

# 查找所有 .md 文件
while IFS= read -r md_file; do
  # 转为相对项目根目录的路径
  rel_file="${md_file#$PROJECT_ROOT/}"
  file_dir="$(dirname "$md_file")"

  # 预处理：使用 awk 跳过围栏代码块（``` 之间的内容），
  # 并移除行内代码（反引号包裹的内容），避免把代码中的 ](...) 误判为链接。
  # 然后用 grep 匹配完整的 [text](path) 模式（要求 [ 前是空白、行首或非反斜杠字符）。
  # macOS 兼容：使用 -E 而非 -P，使用 awk 而非 gawk 特性。
  while IFS= read -r link; do
    [ -z "$link" ] && continue

    # 去除可能的标题锚点 #section
    path_part="${link%%#*}"
    [ -z "$path_part" ] && continue

    # 跳过外部链接和绝对文件路径
    case "$path_part" in
      http://*|https://*|ftp://*|mailto:*|file://*) continue ;;
    esac

    # 解析相对路径
    target_path="$file_dir/$path_part"

    CHECKED_COUNT=$((CHECKED_COUNT + 1))

    if [ ! -e "$target_path" ]; then
      echo "BREAK: $rel_file -> $link (目标不存在)"
      BROKEN_COUNT=$((BROKEN_COUNT + 1))
    fi
  done < <(
    awk '
      # 围栏代码块状态切换（``` 或 ~~~ 标记）
      /^(```|~~~)/ { in_code = !in_code; next }
      in_code { next }
      {
        line = $0
        # 循环移除行内代码（反引号包裹的内容）
        while (match(line, /`[^`]*`/)) {
          line = substr(line, 1, RSTART-1) substr(line, RSTART+RLENGTH)
        }
        print line
      }
    ' "$md_file" 2>/dev/null \
    | grep -oE '\[[^]]*\]\([^)]+\)' 2>/dev/null \
    | sed -E 's/^\[[^]]*\]\(//; s/\)$//' \
    || true
  )

done < <(find "$TARGET_DIR" -name '*.md' -type f | sort)

echo ""
echo "================================"
echo "检查完成: $CHECKED_COUNT 个链接, $BROKEN_COUNT 个断裂"
echo "================================"

if [ "$STRICT" = true ] && [ "$BROKEN_COUNT" -gt 0 ]; then
  exit 1
fi

exit 0
