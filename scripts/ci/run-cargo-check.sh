#!/usr/bin/env bash
# [2026-10-02] cargo check 包装：编译失败时按来源归类（base 侧 vs 本次提交侧）
# 背景：多机协作事故（TRAE 机）——错误全部来自「远程 main 自带」的旧 base，开发
#       者被误导去修 190 处不属于自己的编译错误。本脚本在 check 失败时自动对比
#       错误文件与 HEAD..origin/main 的改动文件，提示正确处置，杜绝傻修。
# 用法：替代原 lefthook pre-push 的 cargo-check-workspace 内联命令。
set -u

export SQLX_OFFLINE=true
command -v sccache >/dev/null && export RUSTC_WRAPPER=sccache || true

OUT="$(mktemp /tmp/cargo-check-XXXXXX.log)"
cargo check --workspace 2>&1 | tee "$OUT"
RC="${PIPESTATUS[0]}"
if [ "$RC" -ne 0 ]; then
  # 提取错误涉及的文件（cargo 错误位置行格式：空格 + --> path:line:col）
  ERROR_FILES="$(grep -oE '^ +--> [^ ]+\.rs' "$OUT" | sed 's/^ *--> //' | sort -u)"
  if [ -n "$ERROR_FILES" ]; then
    # 本次提交（相对 origin/main）改动的文件；origin/main 不存在时视为全部改动
    TOUCHED="$(git diff --name-only origin/main HEAD 2>/dev/null | sort -u || true)"
    MINE="$(comm -12 <(printf '%s\n' "$ERROR_FILES") <(printf '%s\n' "$TOUCHED"))"
    NOT_MINE="$(comm -23 <(printf '%s\n' "$ERROR_FILES") <(printf '%s\n' "$TOUCHED"))"
    if [ -z "$MINE" ] && [ -n "$NOT_MINE" ]; then
      echo ""
      echo "⚠️  [错误归类] 编译错误全部来自 base（非本次改动文件）："
      printf '%s\n' "$NOT_MINE" | head -5 | sed 's/^/      /'
      echo ""
      echo "    可能原因与处置："
      echo "     a) 你的 base 落后于 origin/main → bash scripts/sync_base.sh 或 git pull --rebase origin main"
      echo "     b) 本地工作区混入未提交的旧文件 → git status 确认干净后重试"
      echo "     c) 远端 main 自身问题（罕见）→ 以远端 CI 状态为准，勿在本地乱修"
      echo ""
      echo "    请勿直接修改不属于本次提交的编译错误——先同步 base 再判断。"
    fi
  fi
  rm -f "$OUT"
  exit "$RC"
fi
rm -f "$OUT"
exit 0
