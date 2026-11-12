#!/usr/bin/env python3
"""门禁：请求事务内写入后不得返回非 2xx。

背景
----
`tenant_middleware` 为每个请求开启一个事务，按响应码决定提交/回滚：
2xx → COMMIT，非 2xx → ROLLBACK。因此，**在请求事务里写入后再返回 4xx/5xx**
等于把刚写入的数据静默丢掉：调用方看到失败，库里也没有；日志里两边都"正常"，
排查时无法区分"没写"和"写了又回滚"。

处置
----
* 确实要失败的写路径：先显式回滚（`rollback()` / `guard.take()`），再返回非 2xx；
  这样语义是"主动中止"，可读、可审计。
* 或者把失败分支移到写入之前。

本脚本做静态检查：在**带请求事务**（`txn_arc` / `RlsTxnCell`）的处理函数里，
若写入语句之后出现非 2xx 返回，且两者之间没有显式回滚，则报违规。

误报处理
--------
如属"UPDATE ... RETURNING 未命中行 → 404"这类未产生写入的合法分支，登记到
`scripts/ci/txn-write-non2xx-allowlist.json`（file + function + reason）。

用法
----
  python3 scripts/ci/check-txn-write-non2xx.py
  python3 scripts/ci/check-txn-write-non2xx.py --changed-only
退出码：0 通过，1 有违规。
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

WRITE_RE = re.compile(r"\b(INSERT\s+INTO|UPDATE\s+[\w.\"]+|DELETE\s+FROM)\b", re.I)
TXN_MARKERS = ("txn_arc", "RlsTxnCell", "Transaction<'static, Postgres>")
NON_2XX_RE = re.compile(
    r"ApiResponse::error\(\s*[45]\d\d"
    r"|ApiResponse::server_error"
    r"|ApiResponse::from\(\s*TopemsError"
    r"|StatusCode::(?:BAD_REQUEST|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|"
    r"UNPROCESSABLE_ENTITY|TOO_MANY_REQUESTS|INTERNAL_SERVER_ERROR|BAD_GATEWAY|"
    r"SERVICE_UNAVAILABLE|GATEWAY_TIMEOUT)"
)
ROLLBACK_RE = re.compile(r"(\.rollback\(\)|guard\.take\(\))")
FN_RE = re.compile(r"^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)\s*[<(]")
ALLOWLIST = ROOT / "scripts" / "ci" / "txn-write-non2xx-allowlist.json"


def load_allowlist() -> set[tuple[str, str]]:
    if not ALLOWLIST.exists():
        return set()
    data = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
    return {(e["file"], e["function"]) for e in data.get("allow", [])}


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


def check_file(path: Path, allow: set[tuple[str, str]]) -> list[str]:
    rel = path.relative_to(ROOT).as_posix()
    text = path.read_text(encoding="utf-8", errors="ignore")
    # 跳过测试模块（从 #[cfg(test)] 起截断，仓内约定放在文件末尾）
    cut = text.find("#[cfg(test)]")
    scanned = text if cut < 0 else text[:cut]
    violations: list[str] = []

    for name, start, body in function_bodies(scanned):
        if not any(marker in body for marker in TXN_MARKERS):
            continue
        write = WRITE_RE.search(body)
        if not write:
            continue
        after = body[write.end():]
        hit = NON_2XX_RE.search(after)
        if not hit:
            continue
        # 非 2xx 若落在写入自身的 `Err(e)` 分支里，说明写入根本没成功（无数据可丢），跳过
        branch = None
        for b in re.finditer(r"\b(Ok|Err)\s*\(", after[: hit.start()]):
            branch = b
        if branch is not None and branch.group(1) == "Err":
            continue
        # 写入与非 2xx 之间显式回滚 = 主动中止，允许
        between = after[: hit.start()]
        if ROLLBACK_RE.search(between):
            continue
        if (rel, name) in allow:
            continue
        line_no = start + body[: write.start()].count("\n")
        violations.append(
            f"{rel}:{line_no} fn {name}(): 请求事务内写入后返回非 2xx"
            f"（{hit.group(0)}），且写入与返回之间无 rollback/take"
        )
    return violations


def main() -> int:
    changed_only = "--changed-only" in sys.argv
    allow = load_allowlist()
    violations: list[str] = []
    for path in rust_files(changed_only):
        violations.extend(check_file(path, allow))

    if violations:
        print("❌ [Gate TXN-2XX] 请求事务内写入后返回非 2xx：")
        for v in violations:
            print("   -", v)
        print(
            "\n说明：非 2xx 会触发请求事务回滚，写入等于被静默丢弃。"
            "请在返回前显式 rollback()/guard.take()，或把失败分支移到写入之前。"
        )
        return 1

    print("[Gate TXN-2XX] OK：未发现「请求事务内写入后返回非 2xx」的路径")
    return 0


if __name__ == "__main__":
    sys.exit(main())
