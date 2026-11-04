#!/usr/bin/env bash
# [2026-11-05] 增量 rust 门禁：只 check/clippy 本次 push 变更的 crate（替代全 workspace）
# 背景：全量 cargo check 被 utoipa-swagger-ui build.rs 网络下载失败（curl HTTP2 framing）
#       恒阻断 + RUSTFLAGS=-D warnings 使编译缓存失效 → 每次 push 冷编译且必失败，
#       "卡住/恒红"表象 → 团队长期 --no-verify 绕过门禁。
#       增量后：无 .rs 变更秒级跳过；变更 crate 独立编译，绕开无关 crate 的失败源，
#       门禁恢复可用；RUSTFLAGS=-D warnings 仅作用于变更 crate（存量 warning 不误伤）。
# 用法: run-cargo-changed.sh <check|clippy>（由 lefthook pre-push 调用）
set -u
MODE="${1:-check}"
export SQLX_OFFLINE=true
export RUSTFLAGS="-D warnings"

# 1) 本次 push 变更文件（优先 origin/main 差集，origin/main 不存在时回退 HEAD~1）
FILES="$(git diff --name-only origin/main HEAD 2>/dev/null || git diff --name-only HEAD~1 HEAD 2>/dev/null || true)"
if [ -z "$FILES" ]; then
  echo "[cargo-changed] 无法取得变更文件，SKIP"
  exit 0
fi

RS_FILES="$(printf '%s\n' "$FILES" | grep -E '\.rs$' || true)"
if [ -z "$RS_FILES" ]; then
  echo "[cargo-changed] 无 .rs 变更 → SKIP（${MODE}）"
  exit 0
fi

# 2) 归属：svc/<dir> 或 lib/<dir>；其他路径视为 workspace 级（触发全量兜底）
CRATE_DIRS="$(printf '%s\n' "$RS_FILES" | awk -F/ '/^(svc|lib)\/[^/]+\//{print $1"/"$2; next}{print "WORKSPACE"}')"

run_full() {
  echo "[cargo-changed] workspace 级变更 → 全量 ${MODE}"
  echo "[cargo-changed] 注：全量可能触发 utoipa-swagger-ui build.rs 网络下载失败，见下方输出"
  if [ "$MODE" = clippy ]; then
    cargo clippy --workspace --all-targets -- -D warnings
  else
    cargo check --workspace
  fi
}

if printf '%s\n' "$CRATE_DIRS" | grep -qx WORKSPACE; then
  run_full
  exit $?
fi

# 3) 收集变更 crate 的包名（读各目录 Cargo.toml，读不到则全量兜底）
PKGS=""
for d in $(printf '%s\n' "$CRATE_DIRS" | sort -u); do
  if [ ! -f "$d/Cargo.toml" ]; then
    echo "[cargo-changed] $d 缺少 Cargo.toml → 全量 ${MODE}"
    run_full
    exit $?
  fi
  n="$(sed -nE 's/^name[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$d/Cargo.toml" | head -1)"
  if [ -z "$n" ]; then
    echo "[cargo-changed] $d 读不到包名 → 全量 ${MODE}"
    run_full
    exit $?
  fi
  PKGS="$PKGS -p $n"
done

echo "[cargo-changed] 增量 ${MODE}: ${PKGS}"
if [ "$MODE" = clippy ]; then
  cargo clippy $PKGS --all-targets -- -D warnings
else
  cargo check $PKGS
fi
