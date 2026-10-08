# TOPEMS 观测治理深化审计（/metrics 覆盖 + 指标缺口）

> 日期：2026-10-08 ｜ 范围：上线运维化三件之「观测治理深化」
> 方法：静态审计（svc/*/src/main.rs、lib/shared-bootstrap、lib/shared-auth、lib/shared-core）+ 本地 live /metrics 抓样（erp:8010 / crm:8029）。
> 边界声明：本项只做 **审计 + 文档 + 轻量配置登记**；端点/指标声明的代码改动落在 lib/* 与 svc/*（本项文件边界外），统一登记为建议，不在此实施。
> 关联：[B15 出站埋点](../archive/reports-2026-10/runtime-matrix-decision-2026-10-03.md)、[上线清单](../archive/reports-2026-10/go-live-checklist-and-rollback-2026-10-06.md)。

---

## 1. /metrics 端点覆盖清单（28 独立服务）

`/metrics` 有两条挂载路径：
- **A. 共享 builder 自动挂载**：`lib/shared-bootstrap/src/lib.rs:1356` `build_application()` 统一 `.route("/metrics", get(prometheus_metrics_handler))`；凡走 `build_application` 的服务自动获得。
- **B. 服务自建路由显式挂载**：mode-C 服务自建 `Application{router}`，在自有 router 内挂 `/metrics`（`run()` 本身不挂，仅 `axum::serve(listener, app.router)`）。

| # | 服务 | 端口 | /metrics 挂载方式 | 状态 |
|---|------|------|------------------|------|
| 1 | unified-core (iam) | 8000 | A（build_application）+ routes/mod.rs:96 显式 | ✅ |
| 2 | erp | 8010 | A | ✅（live 实证） |
| 3 | finance | 8011 | A | ✅ |
| 4 | ai | 8013 | B（routes.rs:149，metric_handle.render） | ✅ |
| 5 | hrm | 8020 | A | ✅ |
| 6 | pm | 8023 | A | ✅ |
| 7 | crm | 8029 | A | ✅（live 实证） |
| 8 | mes | 8030 | A | ✅ |
| 9 | pdm | 8031 | A + main.rs:154 显式 | ✅ |
| 10 | scm | 8040 | A | ✅ |
| 11 | wms | 8041 | A | ✅ |
| 12 | srm | 8042 | A | ✅ |
| 13 | qms | 8050 | A + main.rs:232 显式 | ✅ |
| 14 | lims | 8051 | A + main.rs:234 显式 | ✅ |
| 15 | ehs | 8052 | A + main.rs:235 显式 | ✅ |
| 16 | rd | 8053 | A + main.rs:108 显式 | ✅ |
| 17 | analytics (bi) | 8060 | A + main.rs:87 显式 | ✅ |
| 18 | portal | 8063 | A + main.rs:79 / router_config.rs:61 显式 | ✅ |
| 19 | mobile | 8070 | A + main.rs:168 显式 | ✅ |
| 20 | gis | 8071 | A + main.rs:108 显式（自有 monitoring.rs） | ✅ |
| 21 | integration | 8072 | A + main.rs:92 显式 | ✅ |
| 22 | monitor | 8095 | A + main.rs:72 显式 | ✅ |
| 23 | plugin-registry | 8096 | A + main.rs:90 显式 | ✅ |
| 24 | master-data | 8090 | A + main.rs:92 显式 | ✅ |
| 25 | communication | 8084 | A | ✅ |
| 26 | ticket | 8086 | A | ✅ |
| 27 | search | 8082 | A | ✅ |
| 28 | tms | 8073 | A | ✅ |

**结论：/metrics 端点覆盖 = 28/28，无缺端点服务。**
- 另：`svc/server`（BFF 单体 8099）为聚合入口、独立于 28 服务清单，其 /metrics 随宿主进程暴露（不在本次覆盖表内，属模块化单体设计）。
- 边缘 nginx 仅把 `/metrics` location 代理到 unified-core（`deploy/nginx/topems.conf` `location /metrics`），各服务端口的 /metrics 不经边缘单独暴露——**集中抓取须直连各服务端口**（或经 core 聚合），非缺口，是部署拓扑事实。

---

## 2. 已有基础指标（live 实证 erp:8010 / crm:8029）

```
# TYPE axum_http_requests_total            counter   {method,status,endpoint}
# TYPE axum_http_requests_duration_seconds histogram {method,status,endpoint,le}
# TYPE axum_http_requests_pending           gauge
```
样本：`axum_http_requests_total{method="GET",status="200",endpoint="/health"} 1`。

- **错误率 ✅ 已覆盖**：`axum_http_requests_total{status}` 含 status 维度，可按 `sum(rate(...{status=~"5.."})) / sum(rate(...))` 计算各端点/服务 5xx 错误率。
- **延迟 ✅ 已覆盖**：`axum_http_requests_duration_seconds_bucket{status,endpoint,le}` 直方图已 live，可算 p50/p95/p99。
- 缓存族（`topems_cache_query_duration_seconds`、`topems_l1/l2_cache_query_duration_seconds`）亦 live 采集。

---

## 3. 指标缺口清单

| # | 缺口 | 现状 | 影响 | 建议（轻量，不引入新监控栈） |
|---|------|------|------|------------------------------|
| G1 | **服务间调用错误率不可区分** | B15 `topems_service_to_service_calls_total{service,target}`（lib/shared-auth/src/service.rs:47）只有 caller/callee 两个 label，**无 status/outcome** | 边指标只能看「调用量」，无法区分成功/失败；服务间错误率、重试率无法从该边算出 | 在 `record_service_call` 出站入口按 Result 补 `status="success\|error"` label（或拆 `..._failed_total`）；改动在 shared-service-client/base_client + shared-auth，**本项边界外，登记** |
| G2 | **出站服务间调用无延迟直方图** | 仅有边 Counter，无 `*_service_call_duration_seconds` | 跨服务依赖延迟（p95）不可观测，runtime 矩阵只能画拓扑不能画时延 | 在 TypedServiceClient 统一入口包一层 HistogramVec observe（base_client 三入口）；**边界外，登记** |
| G3 | **注册但零观测的死指标** | `lib/shared-core/src/metrics.rs` 声明 `http_request_duration_seconds`、`business_operation_duration_seconds`、`db_query_duration_seconds` 等 HistogramVec，但全仓 grep 无 `.observe()` 观测点（=0 系列） | /metrics 出现空指标族，误导告警/看板；与 live 的 `axum_http_requests_duration_seconds` 重复 | 二选一：① 在共享请求中间件补 observe 接线；② 删除未使用声明。**边界外，登记** |
| G4 | **B15 边指标 live 可见性待生产流量验证** | 本地 erp:8010 live /metrics 未出现 `topems_service_to_service_calls_total` 系列（无流量或二进制未含 B15） | 重采 runtime 矩阵前需确认边指标真在 /metrics 暴露 | 生产/灰度跑 ≥1 业务周期后 `service_topology.py --collect` 复核（沿用 runtime-matrix §5 重采路径） |

---

## 4. 结论与建议

- **/metrics 端点覆盖完整（28/28）**，入站错误率与延迟基础指标已 live 可用——上线观测底座不阻塞。
- 真正缺口集中在 **服务间边指标的「错误维度 + 延迟」**（G1/G2）与 **死指标清理**（G3）；均为增量埋点优化，非上线阻塞项。
- 建议排期：G1/G2 随「服务间可观测性」后续批在 shared-client 层补齐（与 runtime 矩阵重采同批）；G3 做一次死指标清扫。均不引入新监控栈，仅补 label / histogram 声明与观测点。
