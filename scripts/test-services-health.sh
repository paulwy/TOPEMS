#!/bin/bash
# TOPEMS 服务健康检查脚本
# 生成时间: 2026-06-03

echo "=========================================="
echo "TOPEMS 服务健康检查"
echo "=========================================="
echo ""

SERVICES=(
  "8001:DOC:文档管理"
  "8002:IAM:身份认证"
  "8003:AI:AI服务"
  "8000:RS:研发管理"
  "8006:LIMS:实验室管理"
  "8012:QMS:质量管理"
  "8011:EHS:安全环保"
  "8009:ERP:企业资源"
  "8010:HRM:人力资源"
  "8013:CRM:客户关系"
  "8014:MES:制造执行"
  "8016:SCM:供应链"
  "8018:SRM:供应商"
  "8025:WMS:仓库管理"
  "8022:BI:商业智能"
  "8023:NOTIFICATION:通知服务"
  "8027:MAIL:邮件服务"
  "8030:PORTAL:统一门户"
  "8004:FLOW:工作流"
)

HEALTH_COUNT=0
TOTAL_COUNT=${#SERVICES[@]}
RESULTS=()

echo "服务名称              端口    状态      响应时间"
echo "---------------------------------------------------"

for service in "${SERVICES[@]}"; do
  IFS=':' read -r port name desc <<< "$service"
  
  # 测试健康检查
  START_TIME=$(date +%s%N 2>/dev/null || gdate +%s%N 2>/dev/null)
  RESP=$(curl -sf -m 5 -w "%{http_code}" -o /dev/null "http://localhost:$port/health" 2>/dev/null)
  END_TIME=$(date +%s%N 2>/dev/null || gdate +%s%N 2>/dev/null)
  
  if [ -n "$START_TIME" ] && [ -n "$END_TIME" ]; then
      ELAPSED=$(( (END_TIME - START_TIME) / 1000000 ))
      TIME_STR="${ELAPSED}ms"
  else
      TIME_STR="-"
  fi
  
  if [ "$RESP" = "200" ]; then
    STATUS="✅ 健康"
    ((HEALTH_COUNT++))
    RESULTS+=("$name:PASS")
  else
    STATUS="❌ 不可用 ($RESP)"
    RESULTS+=("$name:FAIL")
  fi
  
  printf "%-20s %-7s %-12s %s\n" "$name" "$port" "$STATUS" "$TIME_STR"
done

echo "---------------------------------------------------"
echo ""

# 检查基础设施
echo "基础设施检查:"
echo "---------------------------------------------------"

# PostgreSQL
PG_RESP=$(pg_isready -h localhost -p 5432 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "PostgreSQL (5432)    ✅ 可用"
    ((HEALTH_COUNT++))
else
    echo "PostgreSQL (5432)    ❌ 不可用"
fi

# Redis
REDIS_RESP=$(redis-cli ping 2>/dev/null)
if [ "$REDIS_RESP" = "PONG" ]; then
    echo "Redis (6379)         ✅ 可用"
    ((HEALTH_COUNT++))
else
    echo "Redis (6379)         ❌ 不可用"
fi

echo "---------------------------------------------------"
echo ""
echo "=========================================="
echo "健康检查结果: $HEALTH_COUNT/$((TOTAL_COUNT + 2)) 服务正常"
echo "=========================================="

# 输出不可用服务列表
if [ $HEALTH_COUNT -lt $((TOTAL_COUNT + 2)) ]; then
    echo ""
    echo "不可用服务列表:"
    for result in "${RESULTS[@]}"; do
        IFS=':' read -r name status <<< "$result"
        if [ "$status" = "FAIL" ]; then
            echo "  - $name"
        fi
    done
fi

if [ $HEALTH_COUNT -eq $((TOTAL_COUNT + 2)) ]; then
    echo "✅ 所有服务运行正常"
    exit 0
else
    echo "⚠️  有 $((TOTAL_COUNT + 2 - HEALTH_COUNT)) 个服务不可用"
    exit 1
fi