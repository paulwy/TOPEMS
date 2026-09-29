#!/usr/bin/env bash
#
# 建议 7 落地：三套 test 提取逻辑收敛的共享实现。
# 提供 cargo test / playwright 输出解析的统一工具，run-core / run-integration
# 等测试脚本 source 本文件后调用，避免多份 grep/awk 解析逻辑各自漂移。
#
# bash 3.2 兼容（报告 M6）：不使用 local -n（nameref 为 bash 4.3+），
# 计数回传采用 eval 展开目标变量名。
#
# 用法（source 后调用）：
#   extract_test_counts "$output" passed failed ignored
#   # → 从 cargo test 输出的最后一行 "test result:" 提取计数，
#   #   找不到结果行时三个变量均置 0（与调用方既有默认一致）。

# 从文本提取最后一条 "test result:" 行的 passed/failed/ignored 计数。
# 参数：$1=测试输出文本；$2/$3/$4=回传变量名（passed/failed/ignored）
extract_test_counts() {
  local output="$1"
  local result_line=""
  local _passed=0
  local _failed=0
  local _ignored=0

  result_line=$(printf '%s\n' "$output" | grep "test result:" | tail -1 || true)
  if [ -n "$result_line" ]; then
    _passed=$(printf '%s\n' "$result_line" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo "0")
    _failed=$(printf '%s\n' "$result_line" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo "0")
    _ignored=$(printf '%s\n' "$result_line" | grep -oE '[0-9]+ ignored' | grep -oE '[0-9]+' || echo "0")
  fi

  eval "$2=$_passed"
  eval "$3=$_failed"
  eval "$4=$_ignored"
}

# 打印单条测试摘要（通过/失败/忽略），语义与 run-integration 既有输出一致。
# 参数：$1=服务名；$2=passed；$3=failed；$4=ignored
print_test_summary() {
  local passed="$2"
  local failed="$3"
  local ignored="$4"
  if [ "$failed" -eq 0 ] 2>/dev/null; then
    echo -e "\033[32m✓ $1 集成测试通过\033[0m"
  else
    echo -e "\033[31m✗ $1 集成测试失败\033[0m"
  fi
  echo "  通过: $passed"
  echo "  失败: $failed"
  echo "  忽略: $ignored"
}
