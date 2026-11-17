#!/usr/bin/env bash
# 安装 git hooks（lefthook install），并把生成的钩子改成 fail-closed。
#
# 背景：lefthook 生成的钩子在找不到二进制时只打印 "Can't find lefthook in PATH" 然后返回 0，
# git 会视为门禁通过并放行推送（fail-open）。曾有兜底路径指向 /private/tmp 下 worktree，
# 目录清理后所有推送在无门禁状态下静默通过。这里在安装源头统一加护栏：
# 任何找不到 lefthook 的钩子一律 exit 1。
#
# ⚠️ 脆弱点（已知，未修）：下面的加固是靠正则匹配 lefthook 生成的固定文案
# `echo "Can't find lefthook in PATH"` 再改写实现的，与 lefthook 的输出文本强耦合。
# 一旦升级 lefthook 后这句文案发生变化，匹配会落空、脚本只打印"无需改动"而静默跳过，
# 钩子退回 fail-open，等于洞又回来了（且不会有任何报错）。
# 失效如何发现：临时把 lefthook 二进制目录改名隐藏（如
# node_modules/.pnpm/lefthook-darwin-arm64@*），在 PATH 里也找不到它的情况下执行一次
# `git push`（可推到临时裸库）；期望被拒绝且输出含 [FAIL-CLOSED]，退出码非 0。
# 若打印 "Can't find lefthook in PATH" 后仍然推送成功，即说明本 patch 已失效，
# 需要先比对新的 lefthook 钩子模板文案再更新正则。
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
unmatched = []
for hook in sorted(hooks_dir.iterdir()):
    if not hook.is_file() or hook.name.endswith(".sample"):
        continue
    text = hook.read_text(encoding="utf-8", errors="replace")
    if "[FAIL-CLOSED]" in text:
        continue
    if "Can't find lefthook in PATH" not in text:
        # 不是 lefthook 生成的兜底分支（例如自定义钩子），不处理
        continue

    def replace(match):
        indent = match.group(1)
        return (
            f'{indent}echo "Can\'t find lefthook in PATH" >&2\n'
            f'{indent}echo "[FAIL-CLOSED] 门禁无法执行：未找到 lefthook。'
            f'请先 pnpm install 或设置 LEFTHOOK_BIN；禁止静默放行。" >&2\n'
            f'{indent}exit 1'
        )

    new_text, hits = pattern.subn(replace, text)
    if hits == 0:
        unmatched.append(hook.name)
        continue
    hook.write_text(new_text, encoding="utf-8")
    patched.append(hook.name)

if patched:
    print(f"[install-git-hooks] 已加固 fail-closed: {', '.join(patched)}")

if unmatched:
    print(
        "[install-git-hooks] 错误：以下钩子含 lefthook 兜底文案，但没能定位到可加固的行，"
        f"当前仍是 fail-open：{', '.join(unmatched)}\n"
        "                请在隐藏 lefthook 二进制的环境下实测该钩子，"
        "并按新版模板更新本脚本正则后再安装。",
        file=sys.stderr,
    )
    sys.exit(1)

if not patched:
    print("[install-git-hooks] 所有钩子均已 fail-closed，无需改动")
PY
