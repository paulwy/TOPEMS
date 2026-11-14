#!/usr/bin/env bash
# [2026-11-05] 增量 rust 门禁：只 check/clippy/test 本次 push 变更的 crate（替代全 workspace）
# 背景：全量 cargo check 被 utoipa-swagger-ui build.rs 网络下载失败（curl HTTP2 framing）
#       恒阻断 + RUSTFLAGS=-D warnings 使编译缓存失效 → 每次 push 冷编译且必失败，
#       "卡住/恒红"表象 → 团队长期 --no-verify 绕过门禁。
#       增量后：无 .rs 变更跳过；变更 crate 独立编译/测试，绕开无关 crate 的失败源，
#       门禁恢复可用；RUSTFLAGS=-D warnings 仅作用于变更 crate（存量 warning 不误伤）。
# 语义（test 模式）：有 .rs 变更 → 变更 crate 的 --lib 单元测试必跑；
#                   无 .rs 变更 → 才允许 SKIP；不得以“检测不到变更”为由放过 .rs 改动。
# 用法: run-cargo-changed.sh <check|clippy|test>（由 lefthook pre-push 调用）
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/swagger-ui.sh
source "$SCRIPT_DIR/../lib/swagger-ui.sh"
MODE="${1:-check}"
case "$MODE" in
  check|clippy|test) ;;
  *)
    echo "[cargo-changed] 非法 MODE：'$MODE'（仅支持 check|clippy|test）" >&2
    exit 2
    ;;
esac
export SQLX_OFFLINE=true
export RUSTFLAGS="-D warnings"

# 1) 本次 push 变更文件。基线用 merge-base(远端, HEAD)：只算本地新增提交，
#    不会把远端已并入的历史算进来；origin/main 不可用时依次尝试 @{upstream}、HEAD~1。
#    HEAD~1 仅覆盖最后一笔提交，多提交 push 会漏检，故显式告警。
BASE=""
BASE_SRC=""
resolve_base() {
  local ref mb
  for ref in origin/main '@{upstream}'; do
    git rev-parse --verify -q "$ref" >/dev/null 2>&1 || continue
    if mb="$(git merge-base "$ref" HEAD 2>/dev/null)"; then
      BASE="$mb"
      BASE_SRC="$ref"
      return 0
    fi
  done
  if git rev-parse --verify -q 'HEAD~1' >/dev/null 2>&1; then
    BASE="$(git rev-parse HEAD~1)"
    BASE_SRC="HEAD~1"
    echo "[cargo-changed] 警告：origin/main 与 @{upstream} 均不可用，回退 HEAD~1（仅覆盖最后一笔提交，多提交 push 可能漏检）" >&2
    return 0
  fi
  return 1
}
if ! resolve_base; then
  echo "[cargo-changed] 无法确定变更基线（origin/main / @{upstream} / HEAD~1 均不可用），门禁失败" >&2
  exit 1
fi
if ! FILES="$(git diff --name-only "$BASE" HEAD)"; then
  echo "[cargo-changed] git diff 失败（${BASE_SRC} ${BASE:0:12}..HEAD），门禁失败" >&2
  exit 1
fi
if [ -z "$FILES" ]; then
  echo "[cargo-changed] 无变更（${BASE_SRC} ${BASE:0:12}..HEAD）→ SKIP（${MODE}）"
  exit 0
fi

RS_FILES="$(printf '%s\n' "$FILES" | grep -E '\.rs$' || true)"
if [ -z "$RS_FILES" ]; then
  echo "[cargo-changed] 无 .rs 变更 → SKIP（${MODE}）"
  exit 0
fi

run_full() {
  echo "[cargo-changed] workspace 级变更 → 全量 ${MODE}"
  topems_ensure_swagger_ui_archive || exit 1
  case "$MODE" in
    clippy) cargo clippy --workspace --all-targets -- -D warnings ;;
    test)   cargo test --workspace --lib ;;
    *)      cargo check --workspace ;;
  esac
}

# 2) 归属：svc/<dir> 或 lib/<dir>；lib 根 crate 的 src/tests/examples 归到 lib；
#    其他路径视为 workspace 级（触发全量兜底）。
#    注：不能用正则字面量 [^/]，macOS/BSD awk 的词法在转义外的 / 处截断正则，
#        导致 "nonterminated character class"，包名列表为空而退化为全量。改用字段判定。
if ! CRATE_DIRS="$(printf '%s\n' "$RS_FILES" | awk -F/ '
  $1=="svc"||$1=="lib" {
    if ($1=="lib" && ($2=="src"||$2=="tests"||$2=="examples")) { print "lib"; next }
    if (NF>=3 && $2!="") { print $1"/"$2; next }
    print "WORKSPACE"; next
  }
  { print "WORKSPACE" }
')"; then
  echo "[cargo-changed] .rs 归属解析失败（awk 异常）→ 显式全量 ${MODE}" >&2
  run_full
  exit $?
fi
if [ -z "$CRATE_DIRS" ]; then
  echo "[cargo-changed] 警告：变更 .rs 未解析出任何 crate 归属 → 显式全量 ${MODE}" >&2
  run_full
  exit $?
fi

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
topems_ensure_swagger_ui_archive || exit 1
if [ "$MODE" = clippy ]; then
  cargo clippy $PKGS --all-targets -- -D warnings
elif [ "$MODE" = test ]; then
  if cargo test $PKGS --lib; then
    :
  else
    rc=$?
    echo "[cargo-changed] FAILED：上述变更 crate 的 --lib 单元测试未通过（见上方 cargo 输出的首个 failure 与文件:行）。" >&2
    echo "  修复：定位并修复该测试/断言后，重跑 bash scripts/ci/run-cargo-changed.sh test；" >&2
    echo "        需要全量回归时用 LEFTHOOK_RUN_HEAVY=1 bash scripts/ci/run-cargo-changed.sh test。" >&2
    exit "$rc"
  fi
else
  cargo check $PKGS
fi
