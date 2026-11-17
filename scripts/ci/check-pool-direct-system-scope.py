#!/usr/bin/env python3
"""门禁：禁止「池直连 + 系统身份谓词」在同一函数内并存。

背景
----
`TenantScope::system` / `SystemChannel` 表示"跨租户/系统身份"，其 SQL 谓词是
`COALESCE(current_setting('app.rls_system', true), 'off') = 'on'`（Block C 之后）。

裸 `PgPool` 连接上没有 `app.rls_system` GUC，因此在池直连上执行系统身份谓词会从
"全量"静默退化为 **0 行**：接口返回空列表/空统计，看起来正常，实际什么都没读到。
这类组合也是 `tenant_middleware` 请求事务之外唯一能绕过 RLS 的路径。

判定
----
同一函数体内同时出现：
  1. 系统身份标记：`TenantScope::system(` 或 `SystemChannel`；
  2. 池直连执行器：`&state.pool` / `&state.db` / `&self.pool` / `&self.db` / `&pool` / `&db`
     直接作为 `fetch_*` / `execute` 的参数。
即判违规。

合规写法
--------
* 请求路径：`Extension<RlsTxnCell>` + `state.db.scope_with(txn)`，执行器 `&mut scope`；
* 后台跨租户：`Db::scope_system()` / `scope_read_system()`（系统通道自带 GUC）；
* 平台语料：`Db::scope_read_platform()` + SQL 内显式平台谓词；
* 只读健康探针的 `SELECT 1` 不应使用系统身份谓词，天然不会命中。

用法
----
  python3 scripts/ci/check-pool-direct-system-scope.py
  python3 scripts/ci/check-pool-direct-system-scope.py --changed-only
退出码：0 通过，1 有违规。
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

SYSTEM_MARKERS = ("TenantScope::system(", "SystemChannel")
POOL_EXEC_RE = re.compile(
    r"\.(fetch_one|fetch_optional|fetch_all|fetch|execute|execute_many)\s*\(\s*&?\s*"
    r"(state\.pool|state\.db|self\.pool|self\.db|pool|db)\b"
)
FN_RE = re.compile(r"^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)\s*[<(]")


def rust_files(changed_only: bool) -> list[Path]:
    if changed_only:
        try:
            out = subprocess.run(
                ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=True,
            ).stdout
            files = [ROOT / p for p in out.splitlines() if re.match(r"^svc/.*\.rs$", p)]
            if files:
                return files
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
    return sorted((ROOT / "svc").rglob("*.rs"))


def function_bodies(text: str):
    """粗粒度切函数：返回 (name, start_line, body_text)。按花括号配对。"""
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        m = FN_RE.match(lines[i])
        if not m:
            i += 1
            continue
        name = m.group(1)
        depth = 0
        started = False
        body: list[str] = []
        j = i
        while j < len(lines):
            line = lines[j]
            body.append(line)
            depth += line.count("{") - line.count("}")
            if "{" in line:
                started = True
            if started and depth <= 0:
                break
            j += 1
        yield name, i + 1, "\n".join(body)
        i = j + 1


def check_file(path: Path) -> list[str]:
    rel = path.relative_to(ROOT).as_posix()
    text = path.read_text(encoding="utf-8", errors="ignore")
    cut = text.find("#[cfg(test)]")
    scanned = text if cut < 0 else text[:cut]
    violations: list[str] = []

    for name, start, body in function_bodies(scanned):
        if not any(marker in body for marker in SYSTEM_MARKERS):
            continue
        hit = POOL_EXEC_RE.search(body)
        if not hit:
            continue
        line_no = start + body[: hit.start()].count("\n")
        violations.append(
            f"{rel}:{line_no} fn {name}(): 系统身份谓词与池直连执行器并存"
            f"（{hit.group(0)}），池连接无 app.rls_system，会静默读成 0 行"
        )
    return violations


def main() -> int:
    changed_only = "--changed-only" in sys.argv
    violations: list[str] = []
    for path in rust_files(changed_only):
        violations.extend(check_file(path))

    if violations:
        print("❌ [Gate POOL-SYSTEM] 「池直连 + TenantScope::system/SystemChannel」禁用组合：")
        for v in violations:
            print("   -", v)
        print(
            "\n说明：请改用请求事务 scope_with，或后台/平台通道 "
            "scope_system / scope_read_system / scope_read_platform。"
        )
        return 1

    print("[Gate POOL-SYSTEM] OK：未发现「池直连 + 系统身份谓词」组合")
    return 0


if __name__ == "__main__":
    sys.exit(main())
