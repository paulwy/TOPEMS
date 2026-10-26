#!/bin/bash
# =====================================================================
# build-release.sh — airdeair 侧构建 arm64 release 交付包（供 xingzhai 生产机安装）
# =====================================================================
# 用途：一键完成 构建 → 校验 → 打包（tar.gz + SHA256 + 版本注记），
#       产物可直接 scp/rsync 到 xingzhai 生产机按 release-pipeline.md 安装。
# 用法：./build-release.sh [输出目录]   # 默认 $HOME/topems-release
# 前置：cargo/rust 工具链可用；本机与生产机同架构（arm64）。
# 注意：本脚本只构建与打包，不含任何部署动作（部署在 xingzhai 侧执行）。
# =====================================================================
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$HOME/topems-release}"
mkdir -p "$OUT"
cd "$REPO"

# 版本注记（tag 优先，无 tag 用短 commit）
VERSION="$(git describe --tags --always 2>/dev/null || git rev-parse --short HEAD)"
COMMIT="$(git rev-parse --short HEAD)"
TS="$(date +%Y%m%d-%H%M%S)"
PKG="topems-server-${VERSION}-${TS}"
ARCH="$(uname -m)"

echo "==> 构建 topems-server release（${ARCH}, commit ${COMMIT}）"
cargo build --release -p topems-server

BIN="target/release/topems-server"
[ -x "$BIN" ] || { echo "ERROR: 构建产物缺失 $BIN" >&2; exit 1; }

echo "==> 校验二进制"
file "$BIN" | head -1
"$BIN" --version 2>/dev/null || echo "（无 --version 输出，跳过）"

echo "==> 打包 $PKG"
STAGE="$OUT/$PKG"
mkdir -p "$STAGE"
cp "$BIN" "$STAGE/topems-server"
printf 'commit=%s\nversion=%s\narch=%s\nbuilt=%s\n' "$COMMIT" "$VERSION" "$ARCH" "$TS" > "$STAGE/VERSION"
echo "本包为 airdeair 构建产物；xingzhai 侧按 docs/deploy/release-pipeline.md 安装，勿在生产机 cargo build。" > "$STAGE/README.txt"

tar czf "$OUT/$PKG.tar.gz" -C "$OUT" "$PKG"
shasum -a 256 "$OUT/$PKG.tar.gz" > "$OUT/$PKG.tar.gz.sha256"
rm -rf "$STAGE"

echo ""
echo "==> 交付包就绪"
echo "包:   $OUT/$PKG.tar.gz"
cat "$OUT/$PKG.tar.gz.sha256"
echo ""
echo "==> 下一步（xingzhai 侧）: 参照 docs/deploy/release-pipeline.md §3 安装"
