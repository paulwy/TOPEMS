#!/usr/bin/env bash
# =============================================================================
# TOPEMS CI 门禁缓存工具 (ci-cache-utils.sh)
# =============================================================================
#
# 用途: 为 CI 门禁脚本提供统一的按路径 hash 缓存能力，避免重复扫描未变化的文件。
# 来源: P3-3 CI 门禁脚本按分层分组缓存优化
#
# 用法:
#   source "$(dirname "$0")/ci-cache-utils.sh"
#
#   # 方式 1：直接使用底层函数
#   hash=$(compute_hash "my-script" "svc/*/migrations" "database/migrations")
#   if check_cache "my-script" "$hash"; then exit $?; fi
#   # ... 执行实际检查，将输出重定向到文件 ...
#   write_cache "my-script" "$hash" "$exit_code" "$stdout_file"
#
#   # 方式 2：使用预定义分层函数
#   cache_layer_migrations "check-migration-names" || true
#   # ... 执行实际检查 ...
#   write_cache_from_last "check-migration-names" "$exit_code" "$stdout_file"
#
# 缓存目录:
#   ${TOPEMS_CI_CACHE_DIR:-/tmp/topems-ci-cache}
#
# 缓存键结构:
#   $CACHE_DIR/<script_name>/<hash>.meta   - 元数据 (exit_code)
#   $CACHE_DIR/<script_name>/<hash>.stdout - 标准输出
# =============================================================================

set -eo pipefail

# 缓存根目录
export TOPEMS_CI_CACHE_DIR="${TOPEMS_CI_CACHE_DIR:-/tmp/topems-ci-cache}"

# 当前分层 hash 暂存区（供 cache_layer_* → write_cache_from_last 串联使用）
_LAST_CACHE_SCRIPT=""
_LAST_CACHE_HASH=""

# -----------------------------------------------------------------------------
# 内部辅助函数
# -----------------------------------------------------------------------------

_mkdir_p() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    mkdir -p "$dir" 2>/dev/null || true
  fi
}

_script_dir() {
  local _src="${BASH_SOURCE[0]}"
  while [[ -L "$_src" ]]; do
    _src="$(readlink "$_src")"
  done
  cd "$(dirname "$_src")" && pwd
}

REPO_ROOT="$(cd "$(_script_dir)/.." && pwd)"
export REPO_ROOT

# -----------------------------------------------------------------------------
# compute_hash <name> <paths...>
#
# 计算扫描路径集的 sha256 hash。
#
# 算法:
#   1. 对每个路径参数，展开通配符
#   2. 对每个实际存在的路径，若是目录则递归列出所有文件并排序
#   3. 对每个文件计算 sha256（文件内容），若是目录则对路径字符串做 hash
#   4. 将所有 hash 按稳定顺序拼接，再计算整体 sha256
#
# 参数:
#   name   - 脚本名称（仅用于调试，不参与 hash 计算）
#   paths  - 一个或多个路径（支持 glob 通配符，相对于 REPO_ROOT）
# 输出:
#   stdout - 64 字符 sha256 hex
# -----------------------------------------------------------------------------
compute_hash() {
  local name="$1"
  shift

  local tmp_list
  tmp_list="$(mktemp -t topems-hash-XXXXXX)"
  trap 'rm -f "$tmp_list"' RETURN

  local raw_path expanded_path abs_path f

  for raw_path in "$@"; do
    # 支持相对路径（相对于 REPO_ROOT）和绝对路径
    if [[ "$raw_path" = /* ]]; then
      expanded_path="$raw_path"
    else
      expanded_path="$REPO_ROOT/$raw_path"
    fi

    # 展开 glob（注意：bash 3.2+ 都需要通过 nullglob/shopt 处理）
    local saved_nullglob
    saved_nullglob=$(shopt -p nullglob 2>/dev/null || true)
    shopt -s nullglob 2>/dev/null || true
    local matches=( $expanded_path )
    eval "$saved_nullglob" 2>/dev/null || true

    for abs_path in "${matches[@]}"; do
      if [[ -f "$abs_path" ]]; then
        # 文件: sha256 内容
        local h
        if command -v sha256sum >/dev/null 2>&1; then
          h=$(sha256sum "$abs_path" 2>/dev/null | awk '{print $1}')
        else
          h=$(shasum -a 256 "$abs_path" 2>/dev/null | awk '{print $1}')
        fi
        if [[ -n "$h" ]]; then
          printf 'F|%s|%s\n' "$abs_path" "$h" >> "$tmp_list"
        fi
      elif [[ -d "$abs_path" ]]; then
        # 目录: 递归遍历
        while IFS= read -r -d '' f; do
          if [[ -f "$f" ]]; then
            local hf
            if command -v sha256sum >/dev/null 2>&1; then
              hf=$(sha256sum "$f" 2>/dev/null | awk '{print $1}')
            else
              hf=$(shasum -a 256 "$f" 2>/dev/null | awk '{print $1}')
            fi
            if [[ -n "$hf" ]]; then
              printf 'F|%s|%s\n' "$f" "$hf" >> "$tmp_list"
            fi
          fi
        done < <(find "$abs_path" -type f -print0 2>/dev/null)
      fi
    done
  done

  # 稳定排序后再整体 hash
  if command -v sha256sum >/dev/null 2>&1; then
    sort -t '|' -k2,2 "$tmp_list" 2>/dev/null | sha256sum | awk '{print $1}'
  else
    sort -t '|' -k2,2 "$tmp_list" 2>/dev/null | shasum -a 256 | awk '{print $1}'
  fi
}

# -----------------------------------------------------------------------------
# check_cache <script_name> <hash>
#
# 检查缓存是否命中。
#
# 参数:
#   script_name - 脚本名称（用于缓存子目录）
#   hash        - compute_hash 返回的 64 字符 sha256
# 返回:
#   0  缓存命中 - 同时将缓存的 stdout 打印到标准输出，并通过最后一行的
#      "[CACHE:EXIT:N]" 告知调用方原始退出码
#   1  缓存未命中
# -----------------------------------------------------------------------------
check_cache() {
  local script_name="$1"
  local hash="$2"

  if [[ -z "$script_name" || -z "$hash" ]]; then
    return 1
  fi

  local dir="${TOPEMS_CI_CACHE_DIR}/${script_name}"
  local meta_file="${dir}/${hash}.meta"
  local stdout_file="${dir}/${hash}.stdout"

  if [[ ! -f "$meta_file" || ! -f "$stdout_file" ]]; then
    return 1
  fi

  local exit_code
  exit_code="$(cat "$meta_file" 2>/dev/null | tr -d '\n')"
  if [[ -z "$exit_code" ]]; then
    return 1
  fi

  # 重放 stdout
  cat "$stdout_file" 2>/dev/null || true
  # 输出一行标记退出码（供需要的场景读取）
  printf '[CACHE:EXIT:%s]\n' "$exit_code"

  # 保存，供 write_cache_from_last 跳过重复写入
  _LAST_CACHE_SCRIPT="$script_name"
  _LAST_CACHE_HASH="$hash"

  return 0
}

# -----------------------------------------------------------------------------
# write_cache <script_name> <hash> <exit_code> <stdout_file>
#
# 写入缓存（原子写入：先写临时文件，再 mv 替换）。
#
# 参数:
#   script_name - 脚本名称
#   hash        - compute_hash 返回值
#   exit_code   - 原始脚本的退出码 (0/1/...)
#   stdout_file - 包含原始脚本 stdout 的文件路径（可为空，表示无输出）
# -----------------------------------------------------------------------------
write_cache() {
  local script_name="$1"
  local hash="$2"
  local exit_code="$3"
  local stdout_file="${4:-}"

  if [[ -z "$script_name" || -z "$hash" ]]; then
    return 0
  fi

  local dir="${TOPEMS_CI_CACHE_DIR}/${script_name}"
  _mkdir_p "$dir"

  local tmp_meta="${dir}/.${hash}.meta.tmp.$$"
  local tmp_stdout="${dir}/.${hash}.stdout.tmp.$$"
  local meta_file="${dir}/${hash}.meta"
  local target_stdout="${dir}/${hash}.stdout"

  # 写入元数据（原子）
  printf '%s' "$exit_code" > "$tmp_meta" 2>/dev/null || true
  mv -f "$tmp_meta" "$meta_file" 2>/dev/null || true

  # 写入 stdout（原子）
  if [[ -n "$stdout_file" && -f "$stdout_file" ]]; then
    cp -f "$stdout_file" "$tmp_stdout" 2>/dev/null || true
  else
    : > "$tmp_stdout" 2>/dev/null || true
  fi
  mv -f "$tmp_stdout" "$target_stdout" 2>/dev/null || true

  return 0
}

# -----------------------------------------------------------------------------
# 预包装分层缓存函数
#
# 用法模式:
#   hash=$(cache_layer_xxx "script-name")
#   if check_cache "script-name" "$hash"; then
#     # 缓存命中，解析退出码并退出
#     exit_code=$(echo "$cache_output" | tail -n1 | sed 's/\[CACHE:EXIT://;s/\]$//')
#     exit "${exit_code:-1}"
#   fi
#
# 为了简化，每个 cache_layer_* 函数直接输出 hash 到 stdout。
# -----------------------------------------------------------------------------

# ---- Layer 1: Migrations ----------------------------------------------------
# 覆盖: database/migrations/ + svc/*/migrations/
# 适用脚本: check-migration-names, verify-schema-truth 等
cache_layer_migrations() {
  local script_name="${1:-layer-migrations}"
  compute_hash "$script_name" \
    "database/migrations" \
    "svc/*/migrations"
}

# ---- Layer 2: Schema Naming -------------------------------------------------
# 覆盖: apps/web/src/schema/ + apps/web/src/schemas/
# 注: packages/shared-types/src/schema/ 在当前仓库不存在，使用实际存在的路径
#     apps/web/src/schemas 下按模块存放的 EntitySchema 是真正的扫描目标
# 适用脚本: check-schema-naming, check-entityschema-maxlength 等
cache_layer_schema_naming() {
  local script_name="${1:-layer-schema-naming}"
  compute_hash "$script_name" \
    "apps/web/src/schema" \
    "apps/web/src/schemas" \
    "packages/shared-types/src/schema"
}

# ---- Layer 3: MES Schema Truth ---------------------------------------------
# 覆盖: svc/mes/migrations/ + docs/architecture/mes-schema-truth.md
# 适用脚本: verify-mes-schema-truth
cache_layer_mes_schema() {
  local script_name="${1:-layer-mes-schema}"
  compute_hash "$script_name" \
    "svc/mes/migrations" \
    "docs/architecture/mes-schema-truth.md"
}

# ---- Layer 4: Soft Delete ---------------------------------------------------
# 覆盖: svc/*/src/modules/ + database/migrations/ + svc/*/migrations/
# 注: verify-soft-delete 还扫描 Rust 源文件 (*.rs) 中的 SQL 字面量，
#     这里扩展为 svc/*/src/ + lib/*/src/（含 modules 子目录）
# 适用脚本: verify-soft-delete
cache_layer_soft_delete() {
  local script_name="${1:-layer-soft-delete}"
  compute_hash "$script_name" \
    "svc/*/src/modules" \
    "svc/*/src" \
    "lib/*/src" \
    "database/migrations" \
    "svc/*/migrations"
}

# -----------------------------------------------------------------------------
# write_cache_from_last <script_name> <exit_code> <stdout_file>
#
# 如果最近一次 check_cache 已经命中则跳过；否则等价于 write_cache，
# 但 hash 取自最近一次 compute_hash / cache_layer_* 调用暂存值（如有）。
# 这里简化为: 直接透传参数给 write_cache，暂存 hash 优先。
# -----------------------------------------------------------------------------
write_cache_from_last() {
  local script_name="$1"
  local exit_code="$2"
  local stdout_file="${3:-}"
  local hash="${_LAST_CACHE_HASH:-}"

  if [[ -z "$hash" ]]; then
    return 0
  fi

  write_cache "$script_name" "$hash" "$exit_code" "$stdout_file"
}
