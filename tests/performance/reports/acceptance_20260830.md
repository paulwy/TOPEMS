# TOPEMS 2.4 性能测试验收报告

> 日期：2026-08-30 | 目标：topems-server（8099 模块化单体网关，15 模块）
> 验收标准：50 VUs 压力测试下服务稳定运行 3 分钟；核心 API 端点 P95 < 2s

## 结论：✅ 全部通过

| 场景 | 并发 | 时长 | 总请求 | 成功率 | 吞吐(req/s) | P95 范围 | 服务稳定 |
|---|---|---|---|---|---|---|---|
| smoke | 10 VU | 15s | 22,688 | 100% | 1509.88 | 7-8 ms | ✅ |
| average | 20 VU | 120s | 135,739 | 100% | 1130.49 | 20-22 ms | ✅ |
| stress | 50 VU | 180s | 217,073 | 100% | 1204.79 | 48-49 ms | ✅ |

## 核心 API 端点（50 VU / 180s stress 场景）

| 端点 | 请求 | 成功率 | P50 | P95 | P99 | P95<2s |
|---|---|---|---|---|---|---|
| /api/server/health | 27,135 | 100% | 43ms | 48ms | 55ms | ✅ |
| /api/crm/customers | 27,134 | 100% | 44ms | 49ms | 58ms | ✅ |
| /api/erp/sales-orders | 27,134 | 100% | 43ms | 49ms | 57ms | ✅ |
| /api/finance/vouchers | 27,134 | 100% | 43ms | 48ms | 56ms | ✅ |
| /api/qms/checks | 27,134 | 100% | 44ms | 49ms | 57ms | ✅ |
| /api/scm/suppliers | 27,134 | 100% | 43ms | 49ms | 57ms | ✅ |
| /api/wms/inventory | 27,134 | 100% | 44ms | 49ms | 58ms | ✅ |
| /api/hrm/employees | 27,134 | 100% | 44ms | 49ms | 58ms | ✅ |

## 分析

- **稳定性**：180 秒连续 50 并发压测后服务健康，进程未退出（此前 TODO 担心的"压测中退出"问题不存在）
- **延迟余量**：stress 场景 P95 49ms，仅为 2s 阈值的 **2.5%**，无性能瓶颈
- **扩展性**：吞吐随并发线性保持（smoke 1510 / average 1130 / stress 1205 req/s，均 >1000 req/s），无明显降级
- **DB 压力**：8 端点均走真实 DB 查询（crm/erp/finance/qms/scm/wms/hrm），50 并发下 DB 未成为瓶颈

## 工具

- `scripts/performance/stress_acceptance.py`（新增，无外部依赖，urllib + ThreadPoolExecutor）
- 原始数据：`stress_smoke.json` / `stress_average.json` / `stress_acceptance.json`
