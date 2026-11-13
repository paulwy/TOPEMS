#!/usr/bin/env bash
# 安装 git hooks（lefthook install），并把生成的钩子改成 fail-closed。
#
# 背景：lefthook 生成的钩子在找不到二进制时只打印 "Can't find lefthook in PATH" 然后返回 0，
# git 会视为门禁通过并放行推送（fail-open）。曾有兜底路径指向 /private/tmp 下 worktree，
# 目录清理后所有推送在无门禁状态下静默通过。这里在安装源头统一加护栏：
# 任何找不到 lefthook 的钩子一律 exit 1。
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

lefthook install

HOOKS_DIR="$(git rev-parse --git-path hooks)"
case "$HOOKS_DIR" in
  /*) ;;
  *) HOOKS_DIR="$ROOT/$HOOKS_DIR" ;;
esac

python3 - "$HOOKS_DIR" <<'PY'
import pathlib
import re
import sys

hooks_dir = pathlib.Path(sys.argv[1])
pattern = re.compile(r'^([ \t]*)echo "Can\'t find lefthook in PATH"[ \t]*$', re.MULTILINE)
patched = []
for hook in sorted(hooks_dir.iterdir()):
    if not hook.is_file():
        continue
    text = hook.read_text(encoding="utf-8", errors="replace")
    if 'Can\'t find lefthook in PATH' not in text or "[FAIL-CLOSED]" in text:
        continue

    def replace(match):
        indent = match.group(1)
        return (
            f'{indent}echo "Can\'t find lefthook in PATH" >&2\n'
            f'{indent}echo "[FAIL-CLOSED] 门禁无法执行：未找到 lefthook。'
            f'请先 pnpm install 或设置 LEFTHOOK_BIN；禁止静默放行。" >&2\n'
            f'{indent}exit 1'
        )

    hook.write_text(pattern.sub(replace, text), encoding="utf-8")
    patched.append(hook.name)

if patched:
    print(f"[install-git-hooks] 已加固 fail-closed: {', '.join(patched)}")
else:
    print("[install-git-hooks] 所有钩子均已 fail-closed，无需改动")
PY
