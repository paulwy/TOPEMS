# portal / erp：被丢弃的入参与被吞掉的统计（B369）

- 日期：2026-11-27
- 范围：`svc/erp`（主数据退役/合并报表/GraphQL 主数据）、`svc/portal`（部署回滚、自愈健康汇总、搜索、流式处理、实时聚合、GraphQL 安全发现）
- 承接：B368 新增的全仓门禁 `scripts/ci/check-noop-param-discard.cjs` 首跑暴露 28 处 `let _ = x;`，其中 portal 9 处、erp 6 处。本批把这 15 处逐一判定为「真缺口 / 无害写法」，真缺口修掉，无害写法显形。

## 结论

`node scripts/ci/check-noop-param-discard.cjs`：**28 处 / 21 文件 → 13 处 / 11 文件**，portal 与 erp **清零**。

被修掉的都是「接口吃下参数、回 2xx，但参数对行为零影响」的路径。

## erp

### 1. 主数据退役执行/回滚的审计轨迹缺失（真缺口）

`execute_retirement_plan` 收 `RetirementExecuteRequest { executed_by }`，`rollback_retirement_plan` 收
`RetirementRollbackRequest { reason, rollback_by }`，两个 handler 都写成 `let _ = req;` 后直接改状态回
「退役已执行 / 已回滚」。结果是：计划进入 Completed / RolledBack，但**谁执行的、谁回滚的、为什么回滚一个字都没落**，
`RetirementPlan` 结构体里也没有对应字段可落。

修复：

- `RetirementPlan` 增补 `executed_by`、`rolled_back_by`、`rollback_reason`、`rolled_back_at` 四个字段
  （`serde` 增量字段，读侧兼容；两处结构体字面量同步补 `None`）。
- `execute_retirement_plan`：写入 `executed_by`（请求未带则落 `"unknown"`，不再静默丢失）。
- `rollback_retirement_plan`：写入 `rolled_back_by` / `rollback_reason` / `rolled_back_at`。
- `rollback_retirement_plan_verb`（`POST /mdm-v49/rollback-retirement-plan` 别名）：同样从 payload 取
  `rollback_by` / `reason` 落库，此前只改状态。
- 顺带加状态门：`execute` 现在只允许从 `Confirmed` / `Executing` 进入 `Completed`。**未确认的退役计划不允许直接执行**
  （此前 Draft 也能被「执行」）。
- 删死变量：`execute` 里算了 `planned_rollback_window` 又在末尾 `let _ = planned_rollback_window;`，
  而该值已用于计算 `post_retirement_review_at`，纯冗余。

### 2. verb 别名在缺 id 时对「计划列表第一条」动手（真缺口，危险）

`cancel_retirement_plan_verb`（`GET /mdm-v49/cancel-retirement-plan`）与 `rollback_retirement_plan_verb`
在 `plan_id` / `id` 缺省时走 `plans.first_mut()`，对**任意一条**计划执行取消/回滚。前端 `apps/web/src/api/erp/readOps.ts`
正是无参 GET 调用该路径：一次页面预取就可能取消掉一条真实的退役计划。现在两者缺 id 一律 `400 缺少 plan_id`。

（附带记录，未改：`cancel-retirement-plan` 仍是 GET 且会改状态，`readOps.ts` 注释里也标注了「动作型接口按后端实际方法对齐为 POST」，
但改方法属于契约变更，留给 api-contract 专项。）

### 3. 合并报表提交/审批的操作人被丢弃（伪缺口）

`consolidation/reports.rs` 的 `submit_report` / `approve_report` 从 `x-username` 取 `username` 后紧跟 `let _ = username;`，
看起来是死代码；实际上 `username` **后面会传给 `call_finance_core_approval`**。真正的问题是那行 `let _ = username;`
把「已提取且已使用」伪装成「提取了没用」，会误导后续清理。本批删掉该行、保留提取，并加注释说明去向。

### 4. `handle_mdm_stats` 的 `let _ = req;`

该 GraphQL 查询不接收变量，属「无参 handler 的占位写法」，改名 `_req` 显形，不再假消费。

## portal

### 1. 回滚状态查询条件被整体丢弃（真缺口）

`GET /api/portal/deployment-manager/rollback/status` 声明了 `ListRollbackPoliciesQuery { trigger, enabled_only }`，
handler 却固定调 `get_rollback_status(None)` 并 `let _ = params;`：**任何筛选都返回全量**。

修复：`RollbackManager::get_rollback_status(policy_id, trigger, enabled_only)` 真正按 `trigger`（`automatic` / `manual`）
与 `enabled` 过滤；handler 传参并在 `trigger` 非法时回 `400`（不再退化成「返回全量」）。
新增回归测试 `rollback_status_honors_trigger_and_enabled_filters`：断言筛选结果与 `get_rollback_policies` 的过滤口径一致、
且未知 trigger 返回空集。

### 2. 自愈健康汇总丢掉了服务总数（真缺口）

`get_health_summary` 先算 `total_services = unique_services.len()`，然后 `let _ = total_services;`——
`HealthSummary` 只有 `total_checks`，前端拿不到分母，无法判断「3 个不健康」是 3/3 还是 3/300。现补 `total_services` 字段并填值。

### 3. 流式分片丢掉会话标识（真缺口）

`chunk_response` 生成 `session_id = stream-{query_hash}-{n}` 后 `let _ = session_id;`，分片 metadata 里只有
`query_hash / chunk_index / total_chunks`，客户端无法把分片归并到「同一次流」（同一 query 的多次调用 hash 相同）。
现把 `session_id` 写入每个分片的 metadata。

### 4. 背压统计丢实时队列深度（真缺口）

`get_backpressure_stats` 取了 `current_depth = state.queue_depth` 后在循环末尾 `let _ = current_depth;`，
`BackpressureStats` 里没有这个字段。现补 `current_queue_depth` 并填值。

（同一函数里的 `avg_queue_depth = max_depth / total_processed` 口径可疑——是「历史最大深度 / 处理数」而不是平均值。
本批不动：改成真平均值需要按窗口累计样本，属统计口径变更，已记遗留。）

### 5. 实时聚合启动时空转加锁（真缺口）

`start_aggregation` 在写入 `aggregation_stats` 之后：

```rust
let mut configs = store.aggregation_configs.lock().await;
if let Some(cfg) = configs.get_mut(config_id) { let _ = cfg; }
Ok(true)
```

拿到配置后什么都没做：既不校验配置存在，也不回写任何状态，但接口照样 `Ok(true)`。现改为校验配置存在，
不存在返回 `ResourceNotFound`（此前不存在的 `config_id` 也能「启动成功」并留下一条 stats）。

### 6. 搜索的两处无害写法显形

- `by_service` 聚合闭包的 `svc_name`（人类可读名）从未参与结果，改名 `_svc_name` 并注释说明聚合仍按 code 计数。
- 两个搜索端点的 `Extension(claims)` 在本服务内不参与过滤：结果由下游服务按透传 token 做租户鉴权。
  **不是**「丢了租户隔离」，改名 `_claims` 并注释说明鉴权位置，避免被后续清理误判成泄漏。

## 验证

| 项目 | 结果 |
| --- | --- |
| `cargo test -p topems-erp --lib` | 921 passed |
| `cargo test -p topems-portal --lib` | 590 passed |
| `cargo clippy -p topems-erp -p topems-portal --all-targets -- -D warnings` | 通过 |
| `node scripts/ci/check-noop-param-discard.cjs` | 28 处 → 13 处（portal / erp 清零） |
| `node scripts/ci/check-noop-param-discard.cjs --changed-only` | exit 0 |

## 遗留

1. `avg_queue_depth` 口径 = `max_queue_depth / total_processed`，不是平均值；需按窗口累计样本后才能改成真平均。
2. `master_data_graphql::handle_mdm_stats` 的 `avg_quality_score: 87.3`、`active_services: 6`、`sync_jobs_today: 128`、
   `data_quality_trend` 全是硬编码常量，而 `MasterDataEntity` 没有质量分字段；整个 `MDM_GRAPHQL_STORE` 是启动时随机的内存演示数据。
   要修得先决定「主数据质量分从哪来」，否则只能整体标 stub。
3. `GET /mdm-v49/cancel-retirement-plan` 仍是 GET 改状态，应改 POST（需同步 `apps/web/src/api/erp/readOps.ts` 与 api-contract）。
4. `RetirementPlan` 仍在内存 store（`get_lifecycle_store()`），审计字段只活在进程内；重启即丢，落库需迁移窗口。
5. 门禁 `check-noop-param-discard.cjs` 仍是行级正则 `let _ = <小写标识符>;`，不区分「函数入参」和「局部变量」；
   本批的 `graphql_security.rs` 就是局部借用收尾，被误报后已改为直接 `drop(queries)`。
6. 全仓剩余 13 处：integration 4、lims 2、wms 2、ai 1、communication 1、master-data 1、pm 1、unified-core 1。
