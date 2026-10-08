# 事件一致性 Outbox 决策（D6 事件投递可靠性）

> 状态：📋 决策文档已出（2026-10-08），**实施待用户确认后另行派发** · 归属：TODO.md「B1 收尾专项」后续 · 关联：[D1 unified-core](./decision-d1-unified-core-architecture.md)、[D3 integration 数据归属](./decision-d3-integration-data-ownership.md)
> 触发：B1 事件投影落地 + erp 事务专项核查（commit `c843ad423`）暴露——`emit_searchable_change` 与业务写事务同生命周期，commit 失败则事件孤儿；commit 与发布间 crash 则事件丢失。本文档所有路径与行号为 2026-10-08 实测。

## 1. 背景与决策问题

B1 把 search 从"直读 erp 表"改造成"订阅 erp 实体事件 → 本地投影"。上线过程中暴露一个一致性问题：

- **erp 写 handler 的事件发布在业务写事务内**（`emit_searchable_change(&mut **txn, ...)`，见 `svc/erp/src/modules/searchable_projection.rs:151`）。事务 commit 成功后事件已发；但如果 commit 失败或进程在 commit 后、XADD 前 crash，就出现两种不一致：
  - **孤儿事件**：XADD 成功、commit 失败 → search 投影收到幽灵行（B1 E2E 实测命中，根因是单行 handler 缺 commit，`c843ad423` 已补）。
  - **丢失事件**：commit 成功、XADD 失败/进程 crash → erp 源表有行、search 投影永久缺失（当前靠 backfill 启动对账兜底，`svc/search/src/projection.rs`）。

**决策问题**：是否为 erp（及同类服务）的事件发布引入事务性 outbox，把"DB 写"与"事件发"做成原子；还是接受现有"事务内 emit + backfill 对账"的窗口？该决策决定是否需要迁移 0013、是否新增 relay 组件、是否一次性替换全部 emit 调用点。

## 2. 现状盘点（2026-10-08 实测）

### 2.1 erp 事件发布点清单

| 发布点 | 位置 | 发布方式 | 所在事务 commit 状态 |
|---|---|---|---|
| 可搜索实体变更（customer/sales_order/purchase_order create/update/delete） | `svc/erp/src/modules/searchable_projection.rs:151`（`publish_event(SearchableEntityChanged)`），调用方遍布 customer.rs / sales_order.rs / purchase_order.rs | 通用 `publish_event`（Redis Stream XADD） | **已 commit**（`c843ad423` 补全单行 handler；批量 handler 本就 commit） |
| SalesOrderCreated / Approved | `svc/erp/src/modules/sales_order.rs:300,535` | typed helper `publish_sales_order_*` | create 已 commit；approve 经 `update_sales_order_status` 调用方包裹 commit |
| PurchaseOrderCreated / Approved | `svc/erp/src/modules/purchase_order.rs:282,544` | typed helper | 本就 commit（参照样本） |
| ProductionOrderDispatched | `svc/erp/src/modules/production_order.rs:559` | `publish_event` | 待核（本项不展开） |
| CacheInvalidated（dict） | `svc/erp/src/modules/dict.rs:395,593,707` | typed helper | 待核 |
| MDM account subject | `svc/erp/src/services/mdm_event_service.rs:27,70,74,84` | `publish_to_rabbitmq` | **另一条链路（RabbitMQ）**，不在本决策范围 |

**erp 内发布调用点总计约 90 处**（含 event_publisher 字段引用），核心业务事件发布面 = customer/sales_order/purchase_order 三个模块 + searchable_projection 辅助函数。

### 2.2 同型模式扫描（其他服务）

| 服务 | publish 调用点数（实测） | 同型判断 |
|---|---|---|
| finance | 21 | 同为"事务内 emit"模式（B2 已动过） |
| wms | 19 | 同上 |
| hrm | 21 | 同上 |
| scm | 20 | 同上 |
| crm | 9 | 同上 |
| mes | 8 | 同上 |
| pm | 3 | 同上 |
| integration | 0 | 订阅方，不发布 |

**结论**：事件发布是全仓通用模式，不只 erp。若引入 outbox，影响面是**全部发布服务**；若仅修 erp，其他服务同类窗口仍在。

### 2.3 消费方与幂等现状

| 消费方 | 订阅机制 | 对重复投递的容忍度 |
|---|---|---|
| search 投影（`public.search_entity_projections`） | subscribe_handler + DLQ | **天然幂等**：UPSERT `ON CONFLICT (tenant_id, entity_type, entity_id) DO UPDATE`（`svc/search/src/projection.rs:87`）= last-write-wins；DELETE 重复执行同果。重复事件无副作用 |
| finance / integration 等 | subscribe_handler | 待核（部分有 DLQ 重试，业务幂等以实体 id+版本为准） |

**关键事实**：search 投影侧已具备"重复投递安全"（PK upsert），缺的是"不丢"——即发布侧的 at-least-once 保证。

## 3. 决策选项分析

### 选项 A 事务性 outbox（DB 表 + relay）

- **定义**：业务事务内同时写业务表 + `erp.outbox_events` 行（同一事务，原子）；独立 relay（erp 内 tokio 后台任务或独立进程）轮询未投递行 → XADD Redis Stream → 标记已投递/删除。
- **一致性强度**：**at-least-once**（业务提交即保证事件最终发出；relay 重试直到成功；消费侧已幂等 → 等效 exactly-once 效果）。
- **工作量**：中-大。1 张 outbox 表（迁移 0013）+ relay worker（erp 内 ~150 行）+ 全部 emit 调用点替换为"事务内 INSERT outbox"（erp 约 30 个核心点，全服务 ~100+ 点）+ 监控指标（outbox 积压）。
- **运维成本**：relay 需部署（进程常驻）；积压监控；与双库账本联动。
- **回退**：可关闭 relay，回退到直接 emit（代码双路径共存一段时间）。

### 选项 B 提交后 emit + 失败重试队列

- **定义**：handler 先 `commit().await`，成功后再 `publisher.publish_event()`；发布失败则写入本地重试队列（Redis ZSET 或独立表），后台重发。
- **一致性强度**：**at-least-once，但窗口更小**（commit 后才发布，无孤儿事件；但 commit 与发布间 crash 仍丢事件，需重试队列兜底）。
- **工作量**：小-中。把现有 emit 从事务内挪到 commit 后（erp 约 30 点）+ 一个轻量重试队列。**无需新表（或复用 Redis）**。
- **运维成本**：低（无新组件，重试逻辑内嵌）。
- **回退**：代码级，易回退。

### 选项 C CDC / WAL 日志捕获

- **定义**：decode Postgres WAL（Debezium/pg_logical）→ 变更流 → 事件。
- **一致性强度**：最强（不丢，事务边界天然）。
- **工作量**：大-很大。引入 Debezium/逻辑复制栈 + 事件 schema 映射 + 运维新组件。
- **运维成本**：高（新中间件、监控、延迟调优）。
- **适用条件**：事件驱动规模极大、多服务共享变更流时——当前 30 服务规模无触发证据。

### 选项 D 维持现状（事务内 emit + backfill 对账）

- **定义**：保持现状，靠 search 启动时 backfill（`GET /api/erp/internal/searchable-snapshot`，`f6a49221e`）对账兜底；接受"commit 失败 → 孤儿事件"与"XADD 失败 → 暂缺投影"的有界窗口。
- **一致性强度**：**最终一致（有窗口）**。孤儿事件已被 `c843ad423` 消除大半（commit 补全后，事务内 emit 在 commit 成功分支才发）；丢失事件由 backfill 启动对账收敛，但**运行期非启动期的丢失仍需下次写或重启对账才能补**。
- **工作量**：0。
- **运维成本**：0。
- **适用条件**：事件量小、可接受"重启对账才补齐"的延迟。

## 4. 推荐与理由

**推荐：选项 B（提交后 emit + 失败重试队列），分阶段实施。**

理由：
1. **直击 B1 暴露的两类不一致**：选项 B 把 emit 挪到 commit 成功之后 → 孤儿事件（XADD 成功但回滚）从机制上消除；发布失败进重试队列 → 丢失事件在运行期自动重发，不必等重启对账。
2. **最小侵入**：不引入新 DB 表（0013 可暂不落），不引入 relay 新组件，复用既有 Redis Stream 通道；与 `c843ad423` 刚补齐的 commit 模式天然衔接（commit 成功分支 → emit）。
3. **消费侧已幂等**：search 投影 UPSERT（`projection.rs:87`）天然容忍 at-least-once 重复，B 的重试不会产生脏数据。
4. **否决 A（完整 outbox）的理由**：A 的强一致性收益（commit 与发事件原子）在当前事件量、单租户 on-premise 部署下边际收益低；代价是新表 + relay + 全服务 ~100 调用点替换，运维面变大。**A 保留为将来事件量上升后再升级的路径**。
5. **否决 C 的理由**：CDC 栈对当前规模过度工程。
6. **不选 D 的理由**：D 把"运行期事件丢失"的补救绑死在"重启对账"，对生产长时间运行场景不够。

**过渡策略**：先做 erp 核心三模块（customer/sales_order/purchase_order）的"commit 后 emit"改造 + 轻量重试队列；验证稳定后再向 finance/wms/hrm/scm 等同型服务推广。完整 outbox（选项 A）作为后续演进路线登记，不本次实施。

## 5. 实施路径草图（待确认后另行派发）

### 5.1 erp 改造（第一批）

| 步骤 | 内容 | 入口 |
|---|---|---|
| B.1 | 把 `emit_searchable_change(&mut **txn, ...)` 从事务内挪到 `guard.take().commit()` 成功之后；发布失败不回滚（已 commit），入重试队列 | customer.rs create/update、sales_order.rs create/update/delete/状态、purchase_order.rs（本就 commit，仅挪 emit 位置） |
| B.2 | 轻量重试队列：Redis ZSET（`erp:event_retry`，score=首次失败时间）或小表 `erp.event_retry`；erp 启动一个 tokio 后台任务，每 N 秒扫描重试直到成功 | erp main.rs |
| B.3 | 监控指标：`erp_event_emit_total{status=success/fail/retry}`、重试队列长度 | shared-event |

### 5.2 迁移 0013 草图（仅当选 A 或 B.2 用表时）

- **表归属**：`erp.outbox_events`（或 `erp.event_retry`），跟随 erp schema 账本。
- **时间戳**：`20261008xxxxxx_outbox_events.sql`（双库账本当前尾部 `20261008000000`，下一个可用时间戳由迁移流水线分配）。
- **表结构草图（若选 A）**：
  ```
  event_id        UUID PK（幂等键，发布方生成）
  aggregate_type  TEXT（customer / sales_order / ...）
  aggregate_id    UUID
  event_type      TEXT（SearchableEntityChanged / ...）
  payload         JSONB
  status          TEXT（pending / published / dead）
  attempts        INT DEFAULT 0
  created_at      TIMESTAMPTZ
  published_at    TIMESTAMPTZ NULL
  UNIQUE (event_id)  -- 消费去重 + 防重复投递
  ```
- **与双库账本联动**：迁移随 erp schema 账本推进，不影响 search 投影表（search 只读投影，不变）。

### 5.3 验收标准

1. erp 全量测试绿（基线 902）；三态 E2E（create/update/delete）源表落库 + 投影一致断言通过。
2. **孤儿事件归零**：故意让 commit 失败（如约束冲突）→ 断言 search 投影无幽灵行。
3. **丢失事件自愈**：故意让 XADD 失败（断 Redis 模拟）→ 重连后重试队列补发，投影补齐。
4. clippy 0 warning；双门禁 py/cjs exit 0。

## 6. 风险与回退

| 风险 | 缓解 |
|---|---|
| emit 挪到 commit 后，发布失败但业务已提交 → 依赖重试队列 | B.2 重试队列 + 监控告警；与现状（事务内 emit 失败吞掉）相比已收敛 |
| 重试队列本身积压 | 指标监控 + DLQ 兜底（既有 subscribe_handler DLQ 机制复用） |
| 一次性替换全部 emit 调用点面太大 | 分阶段：先 erp 三模块，验证后再推广其他服务 |
| 迁移 0013 落库时点 | 本项只写草图；实施时与并行迁移线（0011/0012）协调时间戳 |

**回退路径**：B 方案为代码级改造，git 历史可回退；不强制落迁移表（B.2 优先用 Redis ZSET，免迁移）。

---

## 7. 待用户确认的实施范围

实施时需明确（本项不展开）：

1. **实施文件面**：是否只做 erp 三模块（customer/sales_order/purchase_order），还是一次性推广 finance/wms/hrm/scm/crm/mes/pm？
2. **重试载体**：Redis ZSET（免迁移）vs 迁移 0013 落 `erp.event_retry` 表（持久化更强）？
3. **relay/后台任务形态**：erp 内嵌 tokio 任务（同进程）vs 独立进程？
4. **0013 落库时点**：是否本次就落迁移，还是留待后续？
5. **完整 outbox（选项 A）是否本次一并做**，还是仅登记为演进路线？

---

## 8. 实施完成（2026-10-08，commit cde039d56）

> 按推荐方案 B 落地 erp 三模块；完整 outbox（A）/ CDC（C）仅登记演进路线，未实施。

- **commit 后 emit**：三模块（customer/sales_order/purchase_order）所有 SearchableEntityChanged 发布点（单行+批量+状态流转）从事务内挪到 `guard.take().commit()` 成功之后；commit 失败返回 500 且不发布——孤儿事件机制消除。旧 `emit_searchable_change(txn)` 已删除。
- **Redis ZSET 重试**：键 `topems:event_retry:erp`；member = `{entity_type,entity_id,attempts}` JSON；score = 下次重试时间戳；指数退避 30s×attempts，最大 8 次（超限 error! 告警，需 backfill 补拉）。erp main.rs 内嵌 tokio 任务每 15s 扫描到期项重发，成功 ZREM。
- **幂等**：消费侧 search 投影 UPSERT `ON CONFLICT (tenant_id,entity_type,entity_id) DO UPDATE`（projection.rs:87）天然幂等，at-least-once 无副作用；未改消费方。
- **验证**：
  - 三态 E2E（活 Redis）：create→源落库+投影落库；update→源/投影同收敛；delete→源软删+投影归 0。
  - 故障注入 b（emit 失败）：手工 ZADD 到期项 → 20s 内后台任务重发，ZSET 1→0，投影补拉"重试客户4"，日志"重试发布成功 customer id=…"。
  - 故障注入 a（commit 失败）：结构性保证（emit 在 commit 成功分支后调用，commit Err 直接 return 不进 emit）。
- **残留**：
  - typed 事件（SalesOrderCreated/Approved、PurchaseOrderCreated/Approved）仍在事务内发布，依赖 finance 定时补拉兜底——本次未挪，后续批推广。
  - 其他 7 服务（finance/wms/hrm/scm/crm/mes/pm）同型"事务内 emit"未改造，另立批登记。
  - 重试队列运维参数：扫描周期 15s、退避步长 30s、最大重试 8 次。

## 附录：typed 事件 2 组改造完成（2026-10-08）

- SalesOrderCreated / SalesOrderApproved / PurchaseOrderCreated / PurchaseOrderApproved 4 个 typed 事件全部从事务内发布挪至 commit 成功后。
- ZSET `topems:event_retry:erp` 泛化为双通道：`channel=searchable`（重试时从 DB 重建 payload）与 `channel=typed`（重试时反序列化存储 payload 直重发）。
- 验证：活 Redis create/approve → stream 各 +1；typed 通道故障注入 ZADD 到期项 → 18s 内 ZREM 且 stream +1；erp 902 测试绿；clippy 0；双门禁 PASS。
- 残留：仅"其他 7 服务（finance/wms/hrm/scm/crm/mes/pm）同型事务内 emit 推广"一项待登记。
