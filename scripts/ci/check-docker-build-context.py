#!/usr/bin/env python3
"""Docker 构建上下文守卫：`[patch.crates-io]` 的本地 path 依赖必须被 Dockerfile COPY 进去。

背景（2026-11-19 事故）：`Cargo.toml` 里 `[patch.crates-io] rsa = { path = "vendor/rsa" }`
（Marvin Attack implicit rejection 私有补丁）是解析期强依赖；而
`deploy/docker/Dockerfile.server` 当时只 COPY 了 Cargo.toml / lib / svc / apps / database /
config，注释还写着"本镜像不 COPY vendor/"（那条注释针对的是 swagger-ui 的 zip，漏掉了 rsa
补丁的 path 依赖）。缺失 vendor/ 时 cargo 在依赖解析阶段即报
failed to load source for dependency rsa，镜像构建必失败。

该问题长期未暴露的原因不是"没影响"，而是 Docker Build workflow 因账号计费/额度问题一直
没真正启动过 job（"The job was not started because recent account payments have failed"），
计费恢复后第一批镜像就会全红。本脚本把这类"workspace 补丁路径 vs Docker 上下文"的错配
变成 push 前的静态阻断，成本 < 0.1s。

用法：python3 scripts/ci/check-docker-build-context.py
退出码：0 通过；1 存在未被 COPY 的 patch 路径。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# 会执行 cargo 构建的 Dockerfile（apps/web 为纯 Node，不涉及 Rust 解析，故不列入）
RUST_DOCKERFILES = [
    "deploy/docker/Dockerfile.server",
    "deploy/docker/Dockerfile.service",
    "svc/unified-core/Dockerfile",
]


def patch_path_deps(cargo_toml: Path) -> list[str]:
    """抽取 [patch.*] 段里所有本地 path 依赖。"""
    text = cargo_toml.read_text(encoding="utf-8")
    paths: list[str] = []
    in_patch = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            continue  # 注释掉的 patch 不算依赖
        if stripped.startswith("[") and stripped.endswith("]"):
            in_patch = stripped.startswith("[patch")
            continue
        if in_patch:
            match = re.search(r'path\s*=\s*"([^"]+)"', stripped)
            if match:
                paths.append(match.group(1))
    return paths


def copy_sources(dockerfile: Path) -> list[str]:
    """抽取 Dockerfile 中构建阶段的 COPY 源路径（忽略 --from 的多阶段拷贝）。"""
    sources: list[str] = []
    for raw in dockerfile.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line.upper().startswith("COPY "):
            continue
        if "--from" in line:
            continue
        tokens = line.split()[1:]
        tokens = [t for t in tokens if not t.startswith("--")]
        if len(tokens) < 2:
            continue
        for src in tokens[:-1]:  # 最后一个 token 是目标
            sources.append(src.rstrip("/"))
    return sources


def covered(patch_path: str, sources: list[str]) -> bool:
    for src in sources:
        if not src or src == ".":
            return True  # COPY . 覆盖全部
        if patch_path == src or patch_path.startswith(src + "/"):
            return True
    return False


def dockerignore_excluded(patch_path: str) -> bool:
    dockerignore = ROOT / ".dockerignore"
    if not dockerignore.exists():
        return False
    patterns = [
        line.strip()
        for line in dockerignore.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    head = patch_path.split("/")[0]
    for pattern in patterns:
        cleaned = pattern.lstrip("!")
        if cleaned in (head, patch_path) or cleaned.startswith(head + "/"):
            return True
    return False


def main() -> int:
    cargo_toml = ROOT / "Cargo.toml"
    paths = patch_path_deps(cargo_toml)
    if not paths:
        print("[OK] Cargo.toml 无 [patch] path 依赖，跳过")
        return 0

    failures: list[str] = []
    for path in paths:
        if not (ROOT / path).exists():
            failures.append(f"{path}: 目录不存在（Cargo.toml patch 指向失效）")
            continue
        if dockerignore_excluded(path):
            failures.append(f"{path}: 被 .dockerignore 排除，Dockerfile COPY 也拿不到")
            continue
        for dockerfile in RUST_DOCKERFILES:
            df = ROOT / dockerfile
            if not df.exists():
                continue
            if not covered(path, copy_sources(df)):
                failures.append(f"{dockerfile}: 未 COPY {path}（cargo 解析期会失败）")

    if failures:
        print("[FAIL] Docker 构建上下文与 Cargo.toml patch 路径不一致：")
        for item in failures:
            print(f"  - {item}")
        print("\n修复：在对应 Dockerfile 构建阶段增加 `COPY <path>/ ./<path>/`。")
        return 1

    print(f"[OK] patch path 依赖 {', '.join(paths)} 均已进入 {len(RUST_DOCKERFILES)} 个 Docker 构建上下文")
    return 0


if __name__ == "__main__":
    sys.exit(main())
