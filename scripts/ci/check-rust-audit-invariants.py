#!/usr/bin/env python3
"""Rust 审计豁免的"零暴露"不变量守卫。

`cargo audit` 的 ignore 是**人工判断**，会随时间腐化：今天"ES 算法零使用"成立，
明天有人加一行 `Algorithm::ES256` 就失效，而门禁仍然绿。本脚本把每条 ignore
的前提写成可执行的断言，前提一旦不成立即阻断，强制回头复核豁免是否还有效。

覆盖的不变量（与 docs/security/audit-ignore-registry.md 一一对应）：

| 不变量 | 对应 ignore | 断言 |
|---|---|---|
| sqlite-off | RUSTSEC-2026-0459 (libsqlite3-sys) | 无任何 Cargo.toml 在 sqlx 特性里开 sqlite；源码无 `sqlx::sqlite`/`SqlitePool`/`sqlite::` |
| no-ecdsa | RUSTSEC-2026-0387 (crypto-bigint) | 源码无 `Algorithm::ES256/ES384/EdDSA`，无 `p256::`/`p384::`/`k256::` 直接引用 |
| rsa-vendored | RUSTSEC-2023-0071 (rsa) | `[patch.crates-io] rsa` 指向存在目录，且 Cargo.lock 的 rsa 条目无 `source`（确为本地补丁版） |
| registry-sync | 全部 | `.cargo/audit.toml` 的 ignore 集合与 registry 表格行严格双向一致 |

用法：python3 scripts/ci/check-rust-audit-invariants.py
退出码：0 全部成立；1 有不变量被打破（说明豁免需要重新评估）。
"""

from __future__ import annotations

import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# 源码扫描范围（不含 vendor：补丁源码本身不是调用点）
SOURCE_DIRS = ["lib", "svc", "tools", "apps/desktop/src-tauri/src"]

CARGO_MANIFESTS_GLOB = "Cargo.toml"


def iter_source_files() -> list[Path]:
    files: list[Path] = []
    for rel in SOURCE_DIRS:
        base = ROOT / rel
        if not base.exists():
            continue
        files.extend(p for p in base.rglob("*.rs") if "target" not in p.parts)
    return files


def check_sqlite_off(failures: list[str]) -> None:
    for manifest in ROOT.rglob("Cargo.toml"):
        if "target" in manifest.parts or "node_modules" in manifest.parts:
            continue
        for lineno, line in enumerate(manifest.read_text(encoding="utf-8").splitlines(), 1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            if "sqlx" in stripped and "sqlite" in stripped:
                rel = manifest.relative_to(ROOT)
                failures.append(
                    f"[sqlite-off] {rel}:{lineno} sqlx 启用了 sqlite 特性 → "
                    "RUSTSEC-2026-0459 的豁免前提失效，必须移除该 ignore 并升级 libsqlite3-sys"
                )
    for src in iter_source_files():
        text = src.read_text(encoding="utf-8", errors="ignore")
        for needle in ("sqlx::sqlite", "SqlitePool", "SqliteConnectOptions"):
            if needle in text:
                rel = src.relative_to(ROOT)
                failures.append(
                    f"[sqlite-off] {rel} 出现 {needle} → sqlite 后端被实际使用，"
                    "RUSTSEC-2026-0459 豁免不再成立"
                )


def check_no_ecdsa(failures: list[str]) -> None:
    for src in iter_source_files():
        text = src.read_text(encoding="utf-8", errors="ignore")
        for alg in ("Algorithm::ES256", "Algorithm::ES384", "Algorithm::EdDSA"):
            if alg in text:
                rel = src.relative_to(ROOT)
                failures.append(
                    f"[no-ecdsa] {rel} 使用 {alg} → p256/p384/ed25519 路径被激活，"
                    "RUSTSEC-2026-0387(crypto-bigint) 豁免不再成立"
                )
        for crate in ("p256::", "p384::", "k256::"):
            if crate in text and "use " in text:
                rel = src.relative_to(ROOT)
                failures.append(
                    f"[no-ecdsa] {rel} 直接引用 {crate} → 同上，crypto-bigint 豁免失效"
                )


def check_rsa_vendored(failures: list[str]) -> None:
    cargo = tomllib.loads((ROOT / "Cargo.toml").read_text(encoding="utf-8"))
    patch = (cargo.get("patch") or {}).get("crates-io") or {}
    rsa_patch = patch.get("rsa")
    if not rsa_patch or "path" not in rsa_patch:
        failures.append(
            "[rsa-vendored] Cargo.toml 缺少 [patch.crates-io] rsa 本地补丁 → "
            "Marvin 缓解丢失，RUSTSEC-2023-0071 豁免不再成立"
        )
        return
    path = ROOT / rsa_patch["path"]
    if not path.exists():
        failures.append(f"[rsa-vendored] patch 路径不存在：{rsa_patch['path']}")

    lock = (ROOT / "Cargo.lock").read_text(encoding="utf-8")
    blocks = re.split(r"\n\[\[package\]\]\n", lock)
    for block in blocks:
        if re.search(r'name = "rsa"', block):
            if "source = " in block:
                failures.append(
                    "[rsa-vendored] Cargo.lock 中 rsa 仍来自 registry（未被 patch 覆盖）→ "
                    "vendor/rsa 的 implicit rejection 补丁未生效"
                )
            break
    else:
        failures.append("[rsa-vendored] Cargo.lock 中找不到 rsa 条目")


def check_registry_sync(failures: list[str]) -> None:
    audit_toml = ROOT / ".cargo" / "audit.toml"
    if not audit_toml.exists():
        return
    text = audit_toml.read_text(encoding="utf-8")
    # 只取 ID 本体（不带引号）：注释里出现同样的 ID 不影响一致性判断
    ids_in_toml = sorted(set(re.findall(r"RUSTSEC-\d{4}-\d{4}", text)))

    registry = ROOT / "docs" / "security" / "audit-ignore-registry.md"
    if not registry.exists():
        failures.append("[registry-sync] 缺少 docs/security/audit-ignore-registry.md")
        return
    ids_in_registry = sorted(set(re.findall(r"RUSTSEC-\d{4}-\d{4}", registry.read_text(encoding="utf-8"))))

    missing_in_registry = [i for i in ids_in_toml if i not in ids_in_registry]
    missing_in_toml = [i for i in ids_in_registry if i not in ids_in_toml]
    if missing_in_registry:
        failures.append(f"[registry-sync] 登记表缺少：{', '.join(missing_in_registry)}")
    if missing_in_toml:
        failures.append(f"[registry-sync] audit.toml 已无对应 ignore（登记表需清理）：{', '.join(missing_in_toml)}")


def main() -> int:
    failures: list[str] = []
    check_sqlite_off(failures)
    check_no_ecdsa(failures)
    check_rsa_vendored(failures)
    check_registry_sync(failures)

    if failures:
        print("[FAIL] Rust 审计豁免的零暴露前提被打破：")
        for item in failures:
            print(f"  - {item}")
        print("\n修复：要么恢复零暴露（移除触发代码/特性），要么移除对应 ignore 并真正升级依赖。")
        return 1

    print("[OK] 4 组不变量成立：sqlite-off / no-ecdsa / rsa-vendored / registry-sync")
    return 0


if __name__ == "__main__":
    sys.exit(main())
