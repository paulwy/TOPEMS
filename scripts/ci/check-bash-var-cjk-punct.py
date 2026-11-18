#!/usr/bin/env python3
"""
门禁：shell 脚本里「$变量」后紧跟中文标点的写法。

背景
----
bash（实测 macOS 自带 3.2）会把中文字符的 UTF-8 字节并入未加花括号的变量名。
`set -u` 下运行到该行直接报 `unbound variable`，而这类写法几乎总出现在错误提示里，
于是真实失败原因被掩盖成一句 unbound variable。shellcheck 不报这一类。

规则（刻意保持窄）
------------------
只命中：`$NAME` 后面**紧接**一个中文标点。
- `${NAME}` 显式界定变量名，安全，不在范围内；
- 位置/特殊参数（`$1`、`$?`、`$@` 等）不会被 bash 吞掉标点，不在范围内；
- 整行注释跳过（不是可执行代码）；
- 反斜杠转义的 `\\$NAME` 跳过。

中文标点：，。；：！？、（）【】《》〈〉「」『』〔〕…—～·“”‘’

用法
----
  python3 scripts/ci/check-bash-var-cjk-punct.py                # 全量：scripts/ 下 shell 脚本
  python3 scripts/ci/check-bash-var-cjk-punct.py --changed-only # 仅暂存区变更

退出码：0 无命中；1 有命中；2 参数或 git 环境错误。
"""

import re
import subprocess
import sys

PUNCT = "，。；：！？、（）【】《》〈〉「」『』〔〕…—～·“”‘’"
PATTERN = re.compile(r"\$([A-Za-z_][A-Za-z0-9_]*)([" + re.escape(PUNCT) + r"])")
SHEBANG = re.compile(r"^#!.*\b(bash|sh|zsh|dash)\b")


def git_lines(args):
    try:
        out = subprocess.run(
            ["git", *args], check=True, capture_output=True, text=True
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"✗ 无法读取 git 文件列表：{exc}", file=sys.stderr)
        sys.exit(2)
    return [line for line in out.stdout.splitlines() if line]


def shell_files(paths):
    result = []
    for path in paths:
        if not path.startswith("scripts/"):
            continue
        if path.endswith(".sh"):
            result.append(path)
            continue
        # 无扩展名但带 shell shebang 的脚本（如 scripts/topemctl）
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                first = fh.readline()
        except OSError:
            continue
        if SHEBANG.match(first):
            result.append(path)
    return result


def scan(path):
    hits = []
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            lines = fh.read().splitlines()
    except OSError as exc:
        print(f"✗ 无法读取 {path}：{exc}", file=sys.stderr)
        return hits
    for lineno, line in enumerate(lines, 1):
        if line.lstrip().startswith("#"):
            continue
        for match in PATTERN.finditer(line):
            prefix = line[: match.start()]
            backslashes = len(prefix) - len(prefix.rstrip("\\"))
            if backslashes % 2 == 1:
                continue
            hits.append(
                (path, lineno, match.group(1), match.group(2), line.strip())
            )
    return hits


def main(argv):
    mode = "full"
    if len(argv) > 1:
        arg = argv[1]
        if arg in ("-h", "--help"):
            print(__doc__.strip())
            return 0
        if arg == "--changed-only":
            mode = "changed"
        elif arg != "--full":
            print(f"未知参数: {arg}", file=sys.stderr)
            return 2

    if mode == "changed":
        candidates = git_lines(["diff", "--cached", "--name-only", "--diff-filter=ACM"])
    else:
        candidates = git_lines(["ls-files", "scripts"])

    files = shell_files(candidates)
    if mode == "changed" and not files:
        print("[bash-var-cjk-punct] 无暂存 shell 脚本变更，跳过")
        return 0

    hits = []
    for path in files:
        hits.extend(scan(path))

    if not hits:
        print(f"[bash-var-cjk-punct] PASS 扫描 {len(files)} 个脚本，0 命中")
        return 0

    print(f"✗ [bash-var-cjk-punct] 命中 {len(hits)} 处（扫描 {len(files)} 个脚本）：")
    for path, lineno, var, punct, line in hits:
        print(f"  {path}:{lineno}: ${var}{punct}")
        print(f"       {line}")
    print("修复：把变量写成 ${VAR}，让中文标点与变量名显式分开。")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
