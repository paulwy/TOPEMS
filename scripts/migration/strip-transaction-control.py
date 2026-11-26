#!/usr/bin/env python3
"""移除迁移文件自带的事务控制语句，并同步 database/checksums.txt。

背景：apply 流程用 `psql --single-transaction` 把「迁移 SQL + _sqlx_migrations 记账」
包在同一个事务里；迁移文件内出现顶层 `BEGIN;` / `COMMIT;` / `ROLLBACK;` 会提前结束
外层事务，账本写入落到事务外，一旦被守卫拒绝就留下「DDL 已提交、账本没记录」的半应用态
（2026-11-14 实测复现）。`scripts/migration/validate.sh` 会把这类文件判为 ERR。

本工具只处理**顶层**事务语句（行首 `BEGIN;` / `COMMIT;` / `ROLLBACK;`），
`DO $$ BEGIN ... END $$;` 里的 PL/pgSQL 块不受影响。

用法：
  python3 scripts/migration/strip-transaction-control.py <迁移文件...>
  python3 scripts/migration/strip-transaction-control.py --dry-run <迁移文件...>

输出每行：文件 → 删除了几行事务控制 + 新 sha256（已写回 checksums.txt）。
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CHECKSUMS = REPO_ROOT / "database" / "checksums.txt"
TX_LINE = re.compile(r"^\s*(BEGIN|COMMIT|ROLLBACK)\s*;\s*$", re.IGNORECASE)


def strip_file(path: Path, dry_run: bool) -> tuple[int, str]:
    text = path.read_text(encoding="utf-8")
    removed = 0
    kept: list[str] = []
    for line in text.splitlines(keepends=True):
        if TX_LINE.match(line):
            removed += 1
            continue
        kept.append(line)
    new_text = "".join(kept)
    sha256 = hashlib.sha256(new_text.encode("utf-8")).hexdigest()
    if removed and not dry_run:
        path.write_text(new_text, encoding="utf-8")
        update_checksums(path, sha256)
    return removed, sha256


def update_checksums(path: Path, sha256: str) -> None:
    if not CHECKSUMS.exists():
        return
    rel = path.resolve().relative_to(REPO_ROOT).as_posix()
    lines = CHECKSUMS.read_text(encoding="utf-8").splitlines()
    replaced = False
    out: list[str] = []
    for line in lines:
        parts = line.split()
        if len(parts) >= 2 and parts[-1] == rel:
            out.append(f"{sha256}  {rel}")
            replaced = True
        else:
            out.append(line)
    if not replaced:
        out.append(f"{sha256}  {rel}")
    CHECKSUMS.write_text("\n".join(out) + "\n", encoding="utf-8")


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:]]
    dry_run = "--dry-run" in args
    files = [a for a in args if not a.startswith("--")]
    if not files:
        print(__doc__)
        return 2
    total = 0
    for f in files:
        path = Path(f)
        if not path.is_absolute():
            path = (Path.cwd() / path).resolve()
        if not path.exists():
            print(f"❌ 不存在：{f}")
            return 1
        removed, sha256 = strip_file(path, dry_run)
        total += removed
        flag = "（dry-run 未写盘）" if dry_run else ""
        print(f"{path.name}: 删除顶层事务语句 {removed} 行，sha256={sha256}{flag}")
    print(f"共删除 {total} 行" + ("；未修改任何文件" if dry_run else "；checksums.txt 已同步"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
