#!/usr/bin/env python3
"""本地 env 凭据同步：以 .env 为唯一信源，把凭据类键同步到覆盖层。

背景（2026-11-26）：同一组数据库/Redis/JWT 凭据散在 `.env` / `.env.local` /
`config/standalone.env` 三份文件里各自维护，导致「用户写 topems、口令却是
topems_app 的」「standalone.env 指向不存在的 5433」这类认证失败。
`check-config-consistency.py` 的 [env-cred] 规则能检出漂移，本脚本负责一键修好。

设计约束：
  - 只改凭据类键，其余内容（FILE_SERVICE_URL / OLLAMA / SMTP / SQLX_OFFLINE 等）
    与注释、顺序一律不动，避免覆盖层里合法的本地定制被抹平；
  - 只更新「覆盖层里已存在的键」，不擅自新增键（缺失即继承 .env，语义上已一致）；
  - 默认 dry-run，打印掩码后的差异；`--write` 才落盘，落盘前自动备份到
    `backups/config-<时间戳>/`；
  - 同一文件内的重复键会在写入时折叠为首个值，并在输出中提示。

用法：
  python3 scripts/dev/sync-env-credentials.py            # 预览（默认）
  python3 scripts/dev/sync-env-credentials.py --write    # 落盘
  python3 scripts/dev/sync-env-credentials.py --check    # 有漂移则退出 1（供门禁）
  python3 scripts/dev/sync-env-credentials.py --root /tmp/x   # 指定根目录（测试用）
"""
import argparse
import datetime as _dt
import re
import shutil
import sys
from pathlib import Path

SOURCE_REL = ".env"
OVERLAY_RELS = (".env.local", "config/standalone.env")
SYNC_KEYS = (
    "DATABASE_URL",
    "MIGRATE_URL",
    "REDIS_URL",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "REFRESH_SECRET",
    "POSTGRES_HOST",
    "POSTGRES_PORT",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
)
SECRET_MARKERS = ("PASSWORD", "SECRET")


def parse_env(path):
    """返回 (values, order, dups)。order 保留原行序，供原位改写。"""
    values, dups = {}, []
    for lineno, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, raw = s.split("=", 1)
        key = key.strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            continue
        if key in values:
            dups.append(f"{key}@{lineno}")
        values[key] = raw.strip().strip('"').strip("'")
    return values, dups


def mask(key, value):
    if not value:
        return value
    if any(m in key for m in SECRET_MARKERS):
        return value[:4] + "…" + f"({len(value)} 位)"
    dsn = re.match(r"^(postgres(?:ql)?|rediss?)://(?:(?P<userinfo>[^@/]*)@)?", value)
    if dsn and dsn.group("userinfo"):
        userinfo = dsn.group("userinfo")
        user, sep, password = userinfo.partition(":")
        if sep and password:
            return value.replace(f"{user}:{password}@", f"{user}:***@", 1)
    return value


def plan_overlay(path, truth):
    """返回 (changes, dups, missing)。changes = [(key, old, new)]，仅已存在键。"""
    values, dups = parse_env(path)
    changes = []
    for key in SYNC_KEYS:
        if key not in values or key not in truth:
            continue
        if values[key] != truth[key]:
            changes.append((key, values[key], truth[key]))
    missing = [k for k in SYNC_KEYS if k in truth and k not in values and k.startswith("POSTGRES_")]
    return changes, dups, missing


def rewrite(path, truth):
    """仅原位改凭据键，折叠重复键，保留注释/空行/顺序/末尾换行。"""
    lines = path.read_text(encoding="utf-8", errors="ignore").split("\n")
    out, seen = [], set()
    for line in lines:
        s = line.strip()
        if s and not s.startswith("#") and "=" in s:
            key = s.split("=", 1)[0].strip()
            if key in SYNC_KEYS and key in truth:
                if key in seen:
                    continue  # 折叠重复键
                seen.add(key)
                out.append(f"{key}={truth[key]}")
                continue
            if key in seen:
                out.append(line)
                continue
            seen.add(key)
        out.append(line)
    while out and out[-1] == "":
        out.pop()
    path.write_text("\n".join(out) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="落盘；缺省为预览")
    ap.add_argument("--check", action="store_true", help="有漂移则退出 1")
    ap.add_argument("--root", default=None, help="仓库根目录（默认脚本上两级）")
    args = ap.parse_args()

    root = Path(args.root).resolve() if args.root else Path(__file__).resolve().parents[2]
    src = root / SOURCE_REL
    if not src.exists():
        print("[env-sync] 跳过：.env 不存在（CI/公共仓无本地 env）")
        return 0

    truth, _ = parse_env(src)
    if not truth:
        print(f"[env-sync] 跳过：{SOURCE_REL} 无有效键值")
        return 0

    drift = 0
    per_file = {}
    for rel in OVERLAY_RELS:
        path = root / rel
        if not path.exists():
            continue
        changes, dups, missing = plan_overlay(path, truth)
        per_file[rel] = (changes, dups, missing)
        drift += len(changes)
        if not changes and not dups:
            print(f"[env-sync] {rel}: 已与 .env 一致")
            continue
        print(f"[env-sync] {rel}: {len(changes)} 项待同步" + (f"，重复键 {', '.join(dups)}" if dups else ""))
        for key, old, new in changes:
            print(f"   - {key}: {mask(key, old)} → {mask(key, new)}")
        if missing:
            print(f"   · 未同步（覆盖层缺失即继承 .env）：{', '.join(missing)}")

    if not drift and not any(d for _, d, _ in per_file.values()):
        print("[env-sync] 无漂移，无需处理")
        return 0

    if args.check and not args.write:
        print("[env-sync] --check 检出漂移，退出 1（可用 --write 修复）")
        return 1

    if not args.write:
        print("[env-sync] 预览模式，未落盘（加 --write 应用）")
        return 0

    stamp = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = root / "backups" / f"config-{stamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for rel in per_file:
        shutil.copy2(root / rel, backup_dir / Path(rel).name)
    for rel, (changes, _dups, _missing) in per_file.items():
        if changes or _dups:
            rewrite(root / rel, truth)
    print(f"[env-sync] 已写入；原文件备份在 {backup_dir.relative_to(root)}")
    print("[env-sync] 建议随后执行：python3 scripts/dev/check-config-consistency.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
