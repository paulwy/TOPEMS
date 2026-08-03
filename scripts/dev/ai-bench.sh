#!/bin/bash
# TOPEMS Ollama 模型基准测试
# 测量：首 token 延迟、生成速率 (tok/s)、显存占用、上下文利用率
# 用法：
#   ./scripts/dev/ai-bench.sh                  # 测试默认 dev 模型
#   ./scripts/dev/ai-bench.sh qwen2.5:7b-instruct  # 测试指定模型
#   ./scripts/dev/ai-bench.sh --all            # 测试所有已安装模型

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[ OK ]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[FAIL]${NC} $1"; }

# 兼容 OLLAMA_HOST 的多种写法：127.0.0.1 / 127.0.0.1:11434 / http://...
_raw_host="${OLLAMA_HOST:-http://localhost:11434}"
case "$_raw_host" in
  http://*|https://*) OLLAMA_HOST="$_raw_host" ;;
  *:*)               OLLAMA_HOST="http://$_raw_host" ;;
  *)                 OLLAMA_HOST="http://$_raw_host:11434" ;;
esac
DEFAULT_MODEL="qwen2.5-coder:7b-dev"

# 基准测试用例（覆盖本项目实际开发场景）
# 字段：name | prompt | min_tokens 期望生成下限
BENCH_CASES=(
  "rust_axum|用 Rust 写一个 axum handler，接收 JSON 并返回 200 状态码的响应。只给代码。|80"
  "sqlx_query|用 Rust sqlx 写一个分页查询函数，参数为 page 和 page_size，返回 Vec<Row>。只给代码。|80"
  "react_tsx|用 React + TypeScript 写一个带 loading 状态的 useCrud hook。只给代码。|100"
  "python_cli|用 Python click 写一个支持子命令 add/list 的 CLI。只给代码。|60"
  "explain|用一句话解释 Rust 的所有权规则。|30"
)

# 检查 ollama 是否在线
check_service() {
  if ! curl -s "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; then
    error "Ollama 服务不可达：${OLLAMA_HOST}"
    echo "  请先运行：ollama serve 或 scripts/dev/ai-models.sh start"
    exit 1
  fi
}

# 单次基准测试
# 参数：model, prompt
# 输出 JSON 解析后的关键字段
run_single_bench() {
  local model="$1"
  local prompt="$2"
  local label="$3"

  local payload
  payload=$(python3 -c "import json; print(json.dumps({'model':'$model','prompt':'''$prompt''','stream':False}))")

  local start_ts end_ts total_ms
  start_ts=$(python3 -c 'import time; print(int(time.time()*1000))')

  local result
  result=$(curl -s -m 300 "${OLLAMA_HOST}/api/generate" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null) || {
    echo "ERROR|$label|0|0|0|0|请求失败"
    return
  }

  end_ts=$(python3 -c 'import time; print(int(time.time()*1000))')
  total_ms=$((end_ts - start_ts))

  # 解析关键字段：eval_count, eval_duration(ns), prompt_eval_count, total_duration(ns)
  python3 - "$result" "$total_ms" "$label" <<'PY'
import sys, json
result_raw, total_ms, label = sys.argv[1], int(sys.argv[2]), sys.argv[3]
try:
    d = json.loads(result_raw)
    if 'error' in d:
        print(f"ERROR|{label}|0|0|0|0|{d['error']}")
        sys.exit(0)
    eval_count = d.get('eval_count', 0)
    eval_duration_ns = d.get('eval_duration', 1)
    prompt_eval_count = d.get('prompt_eval_count', 0)
    total_duration_ns = d.get('total_duration', 1)
    load_duration_ns = d.get('load_duration', 0)

    # 生成速率：tokens / 秒
    gen_tps = eval_count / (eval_duration_ns / 1e9) if eval_duration_ns else 0
    # 首 token 近似延迟（含 prompt eval + load），单位 ms
    first_token_ms = (load_duration_ns + d.get('prompt_eval_duration', 0)) / 1e6
    # 总耗时（来自 ollama 自报，单位 ms）
    ollama_total_ms = total_duration_ns / 1e6

    print(f"OK|{label}|{eval_count}|{gen_tps:.1f}|{first_token_ms:.0f}|{prompt_eval_count}|{ollama_total_ms:.0f}")
except Exception as e:
    print(f"ERROR|{label}|0|0|0|0|解析失败: {e}")
PY
}

# 测试一个模型
bench_model() {
  local model="$1"
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN} 模型: ${model}${NC}"
  echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"

  # 预热：先加载到内存
  info "预热模型（加载到内存）..."
  curl -s -m 120 "${OLLAMA_HOST}/api/generate" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$model\",\"prompt\":\"ping\",\"stream\":false}" >/dev/null 2>&1 || true
  sleep 1

  # 表头
  printf "%-12s | %8s | %10s | %12s | %8s | %10s\n" \
    "用例" "生成tok" "速率tok/s" "首token(ms)" "输入tok" "总耗时(ms)"
  printf "%s\n" "------------------------------------------------------------------------"

  local total_tps=0
  local count=0
  local fail_count=0

  for case in "${BENCH_CASES[@]}"; do
    IFS='|' read -r name prompt min_tokens <<< "$case"

    local output
    output=$(run_single_bench "$model" "$prompt" "$name")
    local status
    status=$(echo "$output" | awk -F'|' '{print $1}')

    if [ "$status" = "OK" ]; then
      local label gen_count tps first_ms prompt_count total_ms
      label=$(echo "$output" | awk -F'|' '{print $2}')
      gen_count=$(echo "$output" | awk -F'|' '{print $3}')
      tps=$(echo "$output" | awk -F'|' '{print $4}')
      first_ms=$(echo "$output" | awk -F'|' '{print $5}')
      prompt_count=$(echo "$output" | awk -F'|' '{print $6}')
      total_ms=$(echo "$output" | awk -F'|' '{print $7}')

      # 低于期望 token 数标黄
      local flag=" "
      if [ "$gen_count" -lt "$min_tokens" ]; then
        flag="${YELLOW}!${NC}"
      fi

      printf "%-12s | %8s | %10s | %12s | %8s | %10s  %b\n" \
        "$label" "$gen_count" "$tps" "$first_ms" "$prompt_count" "$total_ms" "$flag"

      total_tps=$(python3 -c "print(round($total_tps + $tps, 1))")
      count=$((count + 1))
    else
      local err_msg
      err_msg=$(echo "$output" | awk -F'|' '{print $7}')
      printf "%-12s | %8s | %10s | %12s | %8s | %10s  %b\n" \
        "$name" "FAIL" "-" "-" "-" "-" "${RED}✗${NC}"
      warn "  $err_msg"
      fail_count=$((fail_count + 1))
    fi
  done

  # 汇总
  echo ""
  if [ "$count" -gt 0 ]; then
    local avg_tps
    avg_tps=$(python3 -c "print(round($total_tps / $count, 1))")
    echo -e "  ${GREEN}平均生成速率: ${avg_tps} tok/s${NC}  (共 ${count} 个用例)"
    [ "$fail_count" -gt 0 ] && echo -e "  ${RED}失败: ${fail_count} 个${NC}"
  fi

  # 显存占用
  info "模型显存占用 (ollama ps)："
  curl -s "${OLLAMA_HOST}/api/ps" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for m in d.get('models', []):
    name = m.get('name','?')
    size_gb = m.get('size', 0) / 1e9
    vram_gb = m.get('size_vram', 0) / 1e9
    ctx = m.get('expires_at', '')
    print(f'  {name}: {size_gb:.2f} GB (VRAM: {vram_gb:.2f} GB)')
" 2>/dev/null || warn "  无法读取显存信息"
}

# 主入口
main() {
  check_service

  echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║       TOPEMS Ollama 模型基准测试                          ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  info "服务地址: ${OLLAMA_HOST}"
  info "测试用例: ${#BENCH_CASES[@]} 个 (Rust/React/Python/解释)"

  if [ "$1" = "--all" ]; then
    # 测试所有已安装模型（排除嵌入模型）
    mapfile -t models < <(curl -s "${OLLAMA_HOST}/api/tags" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for m in d.get('models', []):
    name = m.get('name','')
    if 'embed' not in name:
        print(name)
")
    if [ ${#models[@]} -eq 0 ]; then
      error "未发现已安装模型"
      exit 1
    fi
    info "待测模型: ${#models[@]} 个"
    for m in "${models[@]}"; do
      bench_model "$m"
    done
  else
    bench_model "${1:-$DEFAULT_MODEL}"
  fi

  echo ""
  success "基准测试完成"
  echo ""
  echo "参考（M5 + 全 GPU 卸载，Q4 量化）："
  echo "  7B 模型：25-35 tok/s（开启 FLASH_ATTENTION 可达 40+）"
  echo "  14B 模型：12-20 tok/s"
  echo "  低于预期请检查：OLLAMA_FLASH_ATTENTION=1 / OLLAMA_KV_CACHE_TYPE=q8_0"
  echo "  当前实测见上表，未开启 FLASH_ATTENTION 属正常水平"
}

main "$@"
