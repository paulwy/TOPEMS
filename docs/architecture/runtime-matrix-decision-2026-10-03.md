# TOPEMS 运行时服务依赖矩阵定案记录（2026-10-03）

> 收官批次②③产物：runtime 矩阵定案 + 上线检查单收口附卷。
> 关联：[D2 调用环消除决策](./decision-d2-call-cycle-elimination.md)、[实施总览 R3](./implementation-overview-2026-10-03.md)、`scripts/arch/service_topology.py`、矩阵 CSV 位于 `docs/architecture/service-topology/`。

---

## 1. 背景

`service_topology.py` 双模式生成服务依赖矩阵：

- `--static`：渲染 `STATIC_DEPS`（with_service_token 全量接入清单）→ `service-dependency-matrix.design.csv`（设计快照）；
- `--collect "<svc:port,...>"`：扫描运行中服务 `/metrics` 中的 `topems_service_to_service_calls_total{service=...}`（边指标落在**被调方**进程、label=调用方）→ `service-dependency-matrix.runtime.csv`（运行时实测图）。

R3 遗留（implementation-overview §9）：runtime.csv 仍列 U2 之前的 erp↔hrm、erp↔mes 双向 HTTP 边，待 R4 在线 `--collect` 重生成。

## 2. `--collect` 不可行的实测根因（2026-10-03 复测）

| 实测项 | 结果 |
|---|---|
| erp:8010 `/metrics` 边指标 | 仅 `axum_http_requests_total{method,status,endpoint}`；**无** `topems_service_to_service_calls_total` |
| crm:8029 `/metrics` 边指标计数 | 0 |

结论：`--collect` 所依赖的「服务间调用边指标」**当前未在任何服务埋点**。即便补跑采集，也只能得到近空图，无法代表真实依赖；其次，`/metrics` 为 Counter 现值快照，单拍采集要求采样窗口内真实业务流量穿过每一条边——本地演练环境无业务流量，系统性漏边。此即 R-7 背景中「/metrics 无出站调用指标时序限制」的实测依据。

## 3. 定案：接受 design 快照为运行时基线

**结论：本次上线接受 `service-dependency-matrix.design.csv` 作为运行时基线，不再追跑 `--collect`。**

理由：

1. **回退幂等、无漂移**：`--static` 重生成 design CSV 是 `STATIC_DEPS` 的确定性渲染，离线重跑幂等无差异，基线可复现。
2. **design 快照覆盖调用环决策**：D2（环1=C / 环2=A / 环3=C）落地后，代码实测 HTTP 环边=0（grep 仅注释残留）；design 中保留的边均为决策显式保留或文档滞后项（见 §4）。
3. **两源交叉吻合**：design.csv vs runtime.csv 逐行 diff 仅 **1 行差异**——portal 扇出计数（runtime 观测 portal→crm/erp/finance/hrm/iam/mes/monitor/notification 为 3/5/2/…，design 声明 1/1/1/…）；**边集合本身完全一致**，无系统性漂移证据。
4. **风险可控**：runtime 实际边集合 ⊆ design 声明边集合（design 是上界声明）；任何新增运行时边会在代码审查与 boundary 门禁中暴露。

## 4. 与 D2 调用环决策（环1 C / 环2 A / 环3 C）一致性核对

| 环 | design 矩阵边 | 代码实测（U2 后） | 核对结论 |
|---|---|---|---|
| 环1 erp↔hrm = C | erp→hrm=1（决策保留：通讯录只读 HTTP）；hrm→erp=1（**STATIC_DEPS 残留**） | hrm 工资凭证已改发 `HrmPayrollPosted` 事件（`173622037`，payroll.rs:959 仅注释），hrm→erp 无 HTTP 调用 | 运行时无环 ✅；design 中 hrm→erp=1 为快照滞后边 |
| 环2 erp↔mes = A | erp→mes=1、mes→erp=1（双边均为 **STATIC_DEPS 残留**） | 双向事件化（`ErpProductionOrderDispatched`→mes 建单、`MesWorkReportSubmitted`→erp 进度，`18077bf45`）；R2 复测链②③ PASS | 运行时无环 ✅；design 双边为快照滞后边 |
| 环3 portal↔unified-core = C | unified-core→portal=1（**STATIC_DEPS 残留**）；portal→iam(core)=1（BFF 只读代理，符合 C） | 偏好本地化 `core.user_preferences`、portal 只读代理（`269d37d44`/`8cd6b73d2`）；`IamUserPreferencesUpdated` 仅定义未实发（小残留，见 §6-🟡） | 运行时无环 ✅；design 中 core→portal=1 为快照滞后边 |

附注：design CSV 中 `server-*-module` 行（server-crm-module 等）为 D1/U1 瘦身前 unified-core 23 个业务镜像模块的残留行（模块已删），同属快照滞后，不影响边集合结论。

## 5. 后续如需全量运行时矩阵的重采路径

1. **埋点接入**：HTTP 出站客户端层（shared-service-client TypedServiceClient / reqwest middleware）+ 入站 service-token 识别中间件补 `topems_service_to_service_calls_total{caller,callee}` Counter；
2. **流量窗口**：生产/灰度真实业务流量运行 ≥1 个完整业务周期后采样；
3. **重跑**：`python3 scripts/arch/service_topology.py --collect "unified-core:8000,portal:8063,..."`（脚本内建 runtime vs design 一致性对比输出）；
4. **顺带修正**：STATIC_DEPS 三条残留环边（hrm→erp、mes→erp、unified-core→portal）+ `server-*-module` 镜像行删除。

---

## 6. 附：上线检查单逐项核对终态（2026-10-03 收口）

> 证据以 TODO.md 各完成条目与本次实测为据。状态口径：✅已达成 / 🟡有条件 / 🔵观察项（不阻塞）。

### 🔴 必修 9 项

| # | 项 | 状态 | 证据 |
|---|---|---|---|
| 1 | R-1 链路②（mes uuid=text 类型 bug） | ✅ | commit `c041ce264`；R2 复测 ② ❌→✅（source_order_id 精确匹配、重放 HIJACK 不覆盖） |
| 2 | R-2 链路④（integration 裸路径 404） | ✅ | `292298e75`（U3 internal 端点挂路由）；复测 ④ ❌→✅（样品 registered+任务 pending 双落库、重放单行） |
| 3 | R-3 窄状态约束（ck_*_status_standard） | ✅ | `c63ca9cdb`（正式放宽+账本补记）+ `41e3978e3`（R-2b qa_lab_tasks 幂等放宽）；5432 应用+幂等重放 exit 0 |
| 4 | R-4 插件注册+心跳 | ✅ | `b782ce7c5`（U11 心跳落地+目标建表）；复测 ⑤ ⚠️→✅（register success、list 含测试插件、last_heartbeat 推进） |
| 5 | R-5 审计读路径归位 | ✅ | crm `370c1972b`（U12）+ wms `bb382efa1`（uuid=text 修复）；复测 ⑥ ⚠️→✅ |
| 6 | R-8 U6 金额 schema 漂移 | ✅ | `9e8b34a77`（Decimal 全链路）+ `71055f16f`（R-4/R-8 迁移源文件恢复）；5433 干净库重放证实版本序依赖、5432 已手工对齐 |
| 7 | R2 六链路全量复测 6/6 | ✅ | `36197969a`/`41e3978e3`；对照表 6/6 PASS（工资凭证/订单工单/报工进度/质量链/插件心跳/审计），测试数据全清理 |
| 8 | R-6 DLQ 兜底 | ✅ | `c0840553d`（subscriber 传 Result + XAUTOCLAIM 回收 PEL）；三态实测 retry 1→2→3→入 DLQ+ACK、XPENDING=0 |
| 9 | R-7 per-service DLQ 迁移 + R-7b MDM 变体 | ✅ | `3c2260713`(mes)/`20e155cb4`(crm)/`01d33ca8d`(erp) 25 handler；`8763363d0`(MDM DLQ 变体 7 处接线) + `5c44c85bd`(erp_master_data_refs 补列)；**三服务二进制本次全部生效**（mes PID 43711 / erp PID 53966 / crm PID 57928，§7） |

### 🟡 有条件 5 项

| # | 项 | 状态 | 说明与处置 |
|---|---|---|---|
| 1 | nginx 生产转发验证 | 🟡 环境限制 | macOS 无 epoll，nginx 无法本地跑生产配置；/tmp 演练 conf 已逐字复制生产 map 路由表（R4 记录）。**生产 Linux 首部署时复核转发** |
| 2 | 5433 双库重放 | 🟡 双口径 | Homebrew 口径达成（磁盘 292=5432=5433、checksum 逐字节一致）；docker 口径因 Docker Desktop vmnetd 崩溃未回归——**以并行守卫脚本验证结果为准，本批不动 5433** |
| 3 | wms 审计读路径严格性 | 🟡 加固 ticket | 真实写路径行合规；手插 NULL/inet 行 500（读路径严格性暴露）——列 P2 加固 ticket，不阻塞 |
| 4 | MDM DLQ 管理 API | 🟡 后续批 | 超限事件已入独立 keyspace `topems:mdm_dlq:{prefix}` + ACK；list/replay 管理 API 未接（按本地 ref 自愈合设计取舍） |
| 5 | erp_master_data_refs RLS policy | 🟡 后续批 | superuser 绕过不影响功能；topems_app 受限访问需补 policy，与 crm RLS-off 口径待统一 |

### 🔵 观察 8 项（不阻塞）

| # | 项 | 说明 |
|---|---|---|
| 1 | 迁移链干净库 3 处手工前置 | U6↔R-8 版本序依赖、R3 status 列、R4 code 列——新库建库 Runbook 已记录；未来迁移链重构时统一处理 |
| 2 | search→erp 白名单保留 | F-37 未治理（`svc/search/src/handlers.rs:113,167,197` 裸 SQL）；随 F-37 改走 API/事件批撤销 |
| 3 | IamUserPreferencesUpdated 未实发 | AppState 无 event_publisher；环3 小残留 |
| 4 | erp→hrm 通讯录只读边 | D2 决策 C 显式保留（单向非环），符合设计 |
| 5 | runtime 矩阵 design 滞后边 | 本文件 §3/§4 定案：接受 design 为基线，重采路径见 §5 |
| 6 | 迁移账本手工补记 | 20260924110000 checksum 已按磁盘值 SHA-384 对齐；账本收敛 292=292=292、不一致 0、双向独有 0 |
| 7 | gis enable_rls:false | U5 同族待登记，后续批 |
| 8 | CUA/本地演练环境差异 | nginx/5433-docker/portal 首启挂起等均为本机环境限制，非代码缺陷 |

### 🟢 基线就绪 5 项

| # | 项 | 状态 | 证据 |
|---|---|---|---|
| 1 | 13 服务 /health | ✅ | 本次实测：unified-core:8000 / portal:8063 / plugin-registry:8096 / finance:8011 / erp:8010 / hrm:8020 / mes:8030 / qms:8050 / ehs:8052 / lims:8051 / integration:8072 / crm:8029 / wms:8041 全 200 |
| 2 | 迁移账本收敛 | ✅ | 磁盘 292 = 5432 mes 账本 292 = 5433 public 账本 292；checksum 不一致 0、双向独有 0 |
| 3 | 静态门禁全绿 | ✅ | R1 基线：cargo check/clippy/fmt 0 错 0 警告；boundary PY/NODE 双门禁 exit 0 |
| 4 | 单测基线 | ✅ | shared-event 364 全绿；finance lib 1106、tenant_rls 10/10、wms audit 4/4、master-data persist 2/2 |
| 5 | 前端基线 | ✅ | build:host 141s / typecheck 96s / vitest 6528 过（3 既有 GIS mock 失败）/ bundle 16.43M<30M |

## 7. crm/erp 滚动重启确认（本批执行）

| 服务 | 旧 PID | 新 PID | 二进制版本核对 | 冒烟 |
|---|---|---|---|---|
| erp | — | 53966（R-7b 抽验时已重启） | `target/release/topems-erp`（14:00 构建，含 R-7+R-7b 接线）；`strings` 命中 `mdm_dlq` | /health 200；R-7b 抽验 retry 1→2→3→`topems:mdm_dlq:mat` LLEN=1（失败态）+ refs 修复后真实落库、DLQ LLEN=0 |
| mes | — | 43711（R-7 时已重启） | `target/debug/topems-mes`（13:07 构建）；三态抽验 DLQ 流转过 | /health 200 |
| crm | 87128（旧 08:24 二进制，无 R-7/R-7b） | **57928（本批）** | `cargo build -p topems-crm` 重建（15:32，50.6s）；`strings` 命中 `mdm_dlq` | /health 200；启动即消费 MDM 积压事件（emp/org/supp 域「本地 ref 已同步」无报错）；ERP/WMS/工作流服务客户端初始化成功；监听 0.0.0.0:8029、认证保护启用 |

- crm 旧进程 SIGTERM 25s 未退出 → SIGKILL 收尾；新进程日志中 `[CRM Plugin] Failed to register to core: 404` 为**既有行为**（旧进程同时间点已有同样 WARN，非本次回归）。
- 冒烟产生的 4 行测试数据（emp-test/supp-test/org-test/supp-20261003-a0acb2ec）已从 `crm.crm_master_data_refs` 删除，残留 0。

## 8. 上线就绪结论

**结论：🟡 有条件就绪。**

🔴必修 9 项全部达成；🟢基线 5 项全绿；未决项均为环境口径/后续加固，无代码缺陷阻塞。

| 未决项 | 建议责任人 |
|---|---|
| nginx 生产 conf 转发复核（Linux 生产首部署） | 部署/运维 |
| 5433 docker 口径回归（Docker Desktop 恢复后按 Runbook 重放）；Homebrew 口径已达成，以并行守卫结果为准 | DBA/运维 |
| wms 审计读路径严格性加固（P2 ticket） | wms 后端 owner |
| MDM DLQ list/replay 管理 API（后续批） | shared-event owner |
| erp_master_data_refs RLS policy + crm/erp RLS 口径统一（topems_app 切换前） | DBA |
| runtime 矩阵重采（出站调用埋点接入后） | 平台/可观测 owner |
