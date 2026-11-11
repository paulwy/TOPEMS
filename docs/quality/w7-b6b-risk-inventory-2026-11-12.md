# W-B6b · 9 模块写路径租户化 · 风险清单（2026-11-12）

> 状态：只读盘点完成，未改任何代码。本清单按**风险排序**，不按文件平铺。
> 风险判据（用户给定三条）：① 0 行是否返回 200（静默成功）；② 是否写子表且子表失败被吞；③ 是否接收外部 id 引用（跨租户引用）。
> 额外增列：④ 类型绑定错误（uuid / timestamptz / jsonb）导致必 500；⑤ 完全缺失身份提取（无 Claims / 无 Header）。

## 0. 结论

- 实测写路由 **54 条**（用户估 ~51），分布：apqp 18 / fmea 6 / audit 7 / spc 5 / quality_dashboard 5 / quality_standard 4 / data_sync 4 / quality_cost 3 / quality_task 2。
- **P0（必 500 或已确认跨租户写/全局泄漏）共 22 条**，其中：
  - **完全无身份提取、直接落 `Uuid::nil()` 或硬编码 T1**：apqp 7 条（含 approvals）、quality_dashboard 2 条、quality_task 1 条。
  - **无租户谓词、按 id 跨租户改/删**：apqp 6 条、quality_dashboard 2 条。
  - **占位符与 bind 数量不一致（恒 500）**：apqp 2 条。
  - **uuid 列被 `String` 解码（恒 500）**：audit 4 条、data_sync retry 1 条。
  - **`String` 绑 `timestamptz`（恒 500）**：audit create finding 1 条。
- **P1（静默成功 / 子表吞错 / 跨租户引用可挂靠）共 22 条**。
- **P2（`get_tenant_id` 随机兜底或仅时间类型待修）共 7 条**，随机兜底是孤儿行的统一来源。
- **R3 无需改动 3 条**：`data_sync` 两个手动同步通道恒返 410、无 DB 写；`spc/calculate` 纯计算无落库。
- 档位合计：22 + 22 + 7 + 3 = **54**，与实测路由数一致。

## 1. 每模块最高风险写路由（按风险排序）

| 排名 | 模块 | 最高风险路由（代表） | 风险档 | 当前形态 | 改后期望 |
|---|---|---|---|---|---|
| 1 | **apqp**（18 条） | `POST /apqp/projects` | P0 | 处理器**没有 `Claims`/`HeaderMap` 提取器**；`tenant_id` 直接 `.bind(Uuid::nil())`；创建成功后 `tokio::spawn` 调 `init_default_phases`，子表 5 行同样 `Uuid::nil()`，错误用 `_ =` 丢弃且**不在主事务内** | `require_tenant` + `scope_for_tenant`；项目与其 5 条阶段**同事务**写入、`tenant_id` 继承父行；子表失败整体回滚 500；`product_id` 记跨域 TODO（显式写明未校验属主） |
| 1 | apqp | `POST /apqp/phases`、`POST /apqp/tasks`、`POST /apqp/risks` | P0 | 同样无 `Claims`；`tenant_id = nil`；`project_id` / `phase_id` 仅做 UUID 格式校验，**不校验存在性与属主** | `require_tenant` + scope；父行存在且 `tenant_id` 匹配，否则 400；子行继承父行租户 |
| 1 | apqp | `PUT/DELETE /apqp/phases/{id}`、`/tasks/{id}`、`/risks/{id}` | P0 | **SQL 完全没有 `tenant_id` 谓词**，仅按 `id` 操作 → 任一租户可改/删他人阶段、任务、风险 | scope + `tenant_id` 谓词；删除 0 行 404、更新 0 行 404 |
| 1 | apqp | `PUT /apqp/risks/{id}` | P0 | SQL 只有 `$1..$11`，却 bind 了 12 个值（末尾多一个 `Uuid::nil()`）→ 扩展协议报参数数量不符，**必 500** | 删除多余 bind；补 `tenant_id` 谓词 |
| 1 | apqp | `POST /apqp/approvals/{id}/process` | P0 | SQL 只有 `$1..$4`，却 bind 5 个值（末尾多 `Uuid::nil()`）→ **必 500**；且无租户谓词 | 删除多余 bind；scope + 租户谓词；状态 0 行 409 |
| 2 | **quality_dashboard**（5 条） | `POST /alert-rules`、`POST /alert-messages` | P0 | 无 `Claims`；`tenant_id` 直接 `Uuid::nil()` → **全局规则/消息，所有租户读得到**；`rule_id` 仅格式解析 | `require_tenant` + scope；`rule_id` 若给出须同租户存在，否则 400 |
| 2 | quality_dashboard | `PUT/DELETE /alert-rules/{id}` | P0 | 无 `Claims`、SQL 无租户谓词；DELETE 用 `execute` 不查 `rows_affected` → **跨租户改/删且 0 行返回 200** | scope + 租户谓词；删除 0 行 404 |
| 2 | quality_dashboard | `POST /alert-messages/{id}/acknowledge` | P1 | `get_tenant_id_from_claims` 无租户时返回 nil，SQL 里 `$2 = nil` 分支**放行任意租户**；0 行返 404 | `require_tenant`；去掉 nil 放行分支；状态 0 行 409 |
| 3 | **quality_standard**（4 条） | `POST/PUT/DELETE /api/qms/standards*` | P0/P1 | 三处均用 `get_tenant_id`（缺失时**随机 UUID**）；`update` 先按 `tenant_opt` 读父行、再向 `qa_standard_revisions` 插子行，子行 `let _ =` 且**事务外**，即使随后父行更新 404，子行也已落脏数据；DELETE 不查行数 | `require_tenant` + `scope_for_tenant`；父行与 revision 同事务；父行 0 行 404；删除 0 行 404 |
| 4 | **audit**（7 条） | `POST /audit-plans/{plan_id}/tasks`、`PUT /audit-tasks/{id}/complete`、`POST /audit-findings`、`POST /audit-findings/{id}/verify` | P0 | 四条 `RETURNING id, tenant_id`（**裸 uuid**）解码进 `id: String / tenant_id: String` → **必 500**；`create_audit_finding` 还把 `Option<String>` 的 `target_date` 绑进 `timestamptz` 列 → 另一处必 500 | `RETURNING id::TEXT, tenant_id::TEXT`；`$n::timestamptz`；`finding_count` 同事务；`standard_id`/`plan_id` 校验同租户 |
| 4 | audit | `POST /audit-plans`、`POST /audit-tasks` 的引用 | P1 | `standard_id`（同域 qa_standards）、`plan_id`（同域 qa_audit_plans）**不校验存在与属主** → 可挂到他人租户 | 存在且同租户，否则 400 |
| 4 | audit | `POST /audit-plans/{id}/start|complete`、`PUT /audit-tasks/{id}/complete` | P1 | `fetch_one` + `RowNotFound → 404`；状态类 0 行应 409 | 状态类 0 行 409 |
| 5 | **quality_task**（2 条） | `POST /defect-records` | P0 | 无租户时 `tenant_id` **硬编码回退到 T1**（`00000000-...-0001`）；`inspection_id` 缺省 `Uuid::nil()` 且**不校验属主** → 跨租户写入并可能挂空检验 | `require_tenant`；`inspection_id` 必填且同租户，否则 400；禁止 T1 兜底与 nil 兜底 |
| 5 | quality_task | `PUT /quality-tasks/{id}/status` | P1 | 已查 `rows_affected`，0 行返 404；无租户头时 `tenant_opt = None` → **可改任意租户任务** | `require_tenant`；状态 0 行 409 |
| 6 | **spc**（5 条） | `POST /spc/data-points` | P1 | 图归属查询失败被 `.as_ref().ok()` **吞掉**（跨租户图 → None → 继续插入）；`sample_count` 更新 `let _ =` 且**事务外** | 图存在且同租户否则 400；数据点与计数同事务 |
| 6 | spc | `DELETE /spc/charts/{id}` | P1 | `execute` 不查行数 → 0 行 200 | 0 行 404 |
| 6 | spc | `POST/PUT /spc/charts` | P2 | `get_tenant_id` 随机兜底 | `require_tenant` + scope |
| 6 | spc | `POST /spc/calculate` | R3 | 纯计算、无 DB 写、无租户依赖 | 不改（如要统一鉴权可后续单独评估） |
| 7 | **fmea**（6 条） | `POST /fmea-items` | P1 | `fmea_id` 仅格式解析、**不校验属主**；`target_date` 以 `NaiveDateTime` 绑 `timestamptz` 列（类型风险，见 §3） | `fmea_id` 同租户否则 400；时间统一 `DateTime<Utc>` |
| 7 | fmea | `DELETE /fmea/{id}`、`DELETE /fmea-items/{id}` | P1 | `execute` 不查行数 → 0 行 200 | 0 行 404 |
| 7 | fmea | create/update/delete 全部 | P2 | `get_tenant_id` 随机兜底 | `require_tenant` + scope |
| 8 | **quality_cost**（3 条） | `PUT /api/qms/quality-costs/{id}` | P1 | `related_issue_id`（同域 qa_quality_issues）**不校验属主**；`incurred_date` 以 `NaiveDateTime` 绑 `timestamptz` 列 | 同租户否则 400；时间统一 `DateTime<Utc>` |
| 8 | quality_cost | `DELETE /api/qms/quality-costs/{id}` | P1 | `execute` 不查行数 → 0 行 200 | 0 行 404 |
| 8 | quality_cost | create/update/delete | P2 | `get_tenant_id` 随机兜底 | `require_tenant` + scope |
| 9 | **data_sync**（4 条） | `POST /sync-records/{id}/retry` | P0 | `RETURNING id, tenant_id::TEXT, ..., source_id, ..., target_id, ...` 中 `id/source_id/target_id` 为裸 uuid，模型是 `String/Option<String>` → **必 500** | RETURNING 全部 `::TEXT`；`require_tenant`；状态类 0 行 409 |
| 9 | data_sync | `DELETE /sync-records/{id}` | P1 | `execute` 不查行数 → 0 行 200 | 0 行 404 |
| 9 | data_sync | `POST /sync/inspection-to-lims`、`POST /sync/issue-to-ehs` | R3 | 恒返 410，无 DB 写 | 不改 |

## 2. 全量 54 条写路由风险档位

> 口径：一条路由只计其**最高档**，去重后合计 54。

| 档位 | 条数 | 明细 |
|---|---:|---|
| P0 | 22 | **apqp 12**：create project / create phase / create task / create risk / create approval / update phase / delete phase / update task / delete task / update risk / delete risk / update risk(多 bind) / process approval(多 bind)；**audit 4**：create task / complete task / create finding / verify finding；**quality_dashboard 4**：create rule / update rule / delete rule / create message；**data_sync 1**：retry；**quality_task 1**：report defect |
| P1 | 22 | **apqp 5**：delete project（静默 200）/ transition（0 行 500）/ approve / complete / cancel（事件吞错）；**audit 3**：create plan（引用未校验）/ start / complete（0 行应为 409）；**spc 2**：delete chart（静默）/ add data point（吞归属）；**fmea 3**：delete analysis / delete item（静默）/ create item（引用未校验）；**quality_cost 2**：update（引用未校验）/ delete（静默）；**quality_standard 4**：create / update / delete / create revision（子表吞错、随机租户）；**quality_dashboard 1**：acknowledge（nil 放行 + 应为 409）；**data_sync 1**：delete（静默）；**quality_task 1**：status（`tenant_opt=None` 放行 + 应为 409） |
| P2 | 7 | **fmea 3**：create analysis / update analysis / update item（`get_tenant_id` 随机）；**spc 2**：create chart / update chart；**quality_cost 1**：create；**apqp 1**：update project（时间类型待修） |
| R3 | 3 | **data_sync 2**：inspection-to-lims / issue-to-ehs（恒 410，无 DB 写）；**spc 1**：calculate（纯计算） |

## 3. 类型绑定隐患（uuid / timestamptz / jsonb）

> B6a 已证实两类必 500：`uuid` 列绑 `&str`、`timestamptz` 列绑文本。本批逐条核对 INSERT/UPDATE 与 RETURNING。

### 3.1 必 500（已确认）

| 位置 | 现状 | 修法 |
|---|---|---|
| `audit.rs` `create_audit_task` L340 | `RETURNING id, tenant_id, ...` → 模型 `id: String, tenant_id: String` | `id::TEXT, tenant_id::TEXT` |
| `audit.rs` `complete_audit_task` L378 | 同上 | 同上 |
| `audit.rs` `create_audit_finding` L523 | `RETURNING id, tenant_id, ...`；另外 `$11` 绑 `Option<String>` 到 `timestamptz` 列 | `id::TEXT, tenant_id::TEXT`；`$11::timestamptz` |
| `audit.rs` `verify_audit_finding` L570 | `RETURNING id, tenant_id, ...` | `id::TEXT, tenant_id::TEXT` |
| `data_sync.rs` `retry_sync` L304 | `RETURNING id, ..., source_id, ..., target_id, ...` 裸 uuid → `SyncRecord{ id:String, source_id:Option<String>, target_id:Option<String> }` | 全部 `::TEXT` |
| `apqp.rs` `update_apqp_risk` L1156 | SQL `$1..$11`，bind 12 个 | 删多余 `.bind(Uuid::nil())` |
| `apqp.rs` `process_apqp_approval` L1474 | SQL `$1..$4`，bind 5 个 | 删多余 `.bind(Uuid::nil())` |

### 3.2 类型风险（按 B6a 同类处理，改前先定修法）

| 位置 | 现状 | 修法 |
|---|---|---|
| `apqp.rs` create/update project（start/target/actual_end）、create/update phase（start/end/actual_start/actual_end）、create/update task（due/completed）、create/update risk（target） | `NaiveDate.and_hms_opt()` → `NaiveDateTime` 绑 `timestamptz` 列，共 10 处 | 统一 `DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc)`（或 `.and_utc()`）后绑 `DateTime<Utc>` |
| `fmea.rs` create/update item `target_date` | `NaiveDateTime` → `timestamptz`，2 处 | 同上 |
| `quality_cost.rs` create/update `incurred_date` | `NaiveDateTime` → `timestamptz`，2 处 | 同上 |
| `svc/ai/src/event_handlers/mod.rs` L62 `ai_training_samples.$7::jsonb` | `features_json: Option<&str>` 绑 `$7::jsonb`（text→jsonb 显式 cast）；属**跨批次**（ai 服务，不在本次 9 模块） | 先实测；若失败改绑 `serde_json::Value`；本次仅在清单登记，不扩围 |

**已核对安全**：
- 所有 `tenant_id` / `*_id` 的 bind 均为 `Uuid`，非 `String`。
- `numeric` 列（quality_cost.amount、spc.usl/lsl/ucl/cl/lcl、alert_rules.threshold、alert_messages.metric_value/threshold）绑定 `BigDecimal`，无 `f64 → numeric`。
- `qa_apqp_*`、`qa_fmea_*`、`qa_audit_*`（plan）、`qa_spc_*`、`qa_quality_costs`、`qa_alert_*` 的 RETURNING 已用 `::TEXT`（除 §3.1 列出的 audit tasks/findings 与 data_sync retry）。
- `jsonb` 列在本次 9 模块内无 INSERT/UPDATE（`qa_qms_sync_records.payload/response` 仅读）。

## 4. 改前数据基线（副本 `topems_w7_reh_prod_20261111`，超管直连绕过 RLS）

记录时间：2026-11-12，文件 `/tmp/w7_b6b/baseline_before.txt`。

| 表 | 行数 | 表 | 行数 |
|---|---:|---|---:|
| qa_apqp_projects | 5 | qa_apqp_phases | 3 |
| qa_apqp_tasks | 0 | qa_apqp_risks | 0 |
| qa_apqp_approvals | 0 | qa_fmea_analyses | 5 |
| qa_fmea_items | 3 | qa_audit_plans | 5 |
| qa_audit_tasks | 3 | qa_audit_findings | 3 |
| qa_spc_charts | 5 | qa_spc_data_points | 3 |
| qa_alert_rules | 5 | qa_alert_messages | 5 |
| qa_standards | 5 | qa_standard_revisions | 3 |
| qa_qms_sync_records | 5 | qa_quality_costs | 5 |
| qa_quality_inspections | 5 | qa_inspection_results | 3 |

> 改后逐表复测，必须与上表**完全一致**（验收时按创建 id 硬删除测试行，不保留任何净增）。

## 5. 改后期望与验收增量（沿用 B6a 矩阵）

每条写路由改后必须满足：

1. `require_tenant`：无租户头且非服务身份 → **400，且零新增行**；带头 → 正常写入。
2. `scope_for_tenant`：写操作在事务级 `app.tenant_id` 下执行，显式 `tenant_id` 谓词保留为第二层。
3. 创建类：落库 `tenant_id` 精确等于 T1；T2 身份不可见；T2 身份按 id 读写 → 404。
4. 子表：与父行同事务，`tenant_id` 继承父行；子表失败整体回滚 500（禁止 `let _ = execute`）。
5. 同域引用：存在且同租户，否则 400（`standard_id`、`plan_id`、`fmea_id`、`project_id`、`phase_id`、`related_issue_id`、`inspection_id`、`rule_id`）。
6. 跨域引用（`product_id` 类）：记 `TODO(w-b6b)`，并显式写明“当前未校验属主”。
7. 错误码：删除类 0 行 404；状态类（start/complete/approve/acknowledge/retry/transition）0 行 409。
8. 不吞 SQL 错误：子表/计数/事件写入失败一律返回 500，不返回 200。
9. 类型：`uuid` 一律 `Uuid` 绑定或 `::TEXT` 输出；`timestamptz` 一律 `DateTime<Utc>`；`jsonb` 一律 `serde_json::Value`。
10. 数据基线：§4 表逐项不变。

## 6. 实施顺序（按风险，非按文件）

1. **apqp**（18 条）——P0 最密集：先补身份提取与 scope，再修 6 条无谓词路由，再修 2 条多 bind，最后事务化 `init_default_phases` 与审批事件。
2. **quality_dashboard**（5 条）——全局 nil 租户与无谓词改删。
3. **audit**（7 条）——4 条 RETURNING 类型 + finding 子表事务 + 引用校验。
4. **quality_standard**（4 条）——revision 子表事务 + 随机租户。
5. **quality_task**（2 条）——T1 硬编码兜底与 inspection 属主。
6. **spc**（5 条）——data-point 归属校验 + 计数事务 + 删除行数。
7. **fmea**（6 条）——item 归属 + 删除行数 + 时间类型。
8. **quality_cost**（3 条）——issue 归属 + 删除行数 + 时间类型。
9. **data_sync**（4 条）——retry RETURNING 类型 + 删除行数；两个 410 路由不动。

每模块完成后：`cargo clippy -D warnings`、`cargo fmt`、`check-tenant-context --changed-only`，并复测 §4 行数。
