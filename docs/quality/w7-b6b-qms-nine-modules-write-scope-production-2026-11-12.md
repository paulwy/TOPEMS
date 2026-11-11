# W-B6b：QMS 九模块写路径租户化与生产窗口报告

日期：2026-11-12
范围：`apqp` / `fmea` / `audit` / `spc` / `quality_dashboard` / `quality_standard` / `data_sync` / `quality_cost` / `quality_task`
规则：沿用 W-B6a（`require_tenant` + `scope_for_tenant`、子表同事务、删 0 行 404、状态 0 行 409、不吞 SQL 错误、同域引用校验属主、跨域引用留 TODO）

## 1. 结论

九个模块实测 **54 条写路由**（非估算的 51）：**51 条**完成租户化与事务化，2 条假同步路由（固定 410）与 1 条纯计算路由（SPC `calculate`，只读库）按裁决不动。

- 副本验收矩阵 **158 项全绿**，改前/改后 20 张表行数逐一对比全部回到基线（无"改对租户但丢数据"）。
- 生产短窗口复验 **probe 38 项 + write 27 项全绿**，换装后 `/health` 200，复验行清理后 20 张表全部回到 `0`。
- 修复 5 类必 500 的类型绑定错误（uuid 解码 5 处、text→timestamptz 3 处、多余 bind 2 处）。
- 门禁全绿，未使用 `--no-verify`。

| 项 | 值 |
|---|---|
| 提交 | `ca832b0dd`（apqp）、`b833c328c`（fmea/audit/spc）、`43bfa8499`（standard/dashboard/cost/sync/task）、`31a48904c`（文档） |
| 二进制 HEAD | `31a48904c`（release 构建 03:18:09） |
| 新二进制 sha256 | `132ed73cd3bd0f323f98a07a93c628ea8fab45312a3077fa8061e396eff657d9` |
| 回滚备份 sha256 | `14a1017…`（W-B6a 二进制，`topems-server.bak-20261112-b6b` 在位） |

## 2. 路由清点（实测 54）

| 模块 | 写路由 | 改造 | 说明 |
|---|---:|---:|---|
| apqp | 18 | 18 | 项目/阶段/任务/风险/审批增删改、状态流转、审批处理、approve/complete/cancel |
| fmea | 6 | 6 | 分析 3 + 条目 3 |
| audit | 7 | 7 | 计划 3、任务 2、发现 2 |
| spc | 5 | 4 | `calculate` 为纯计算只读，不改 |
| quality_dashboard | 5 | 5 | 规则 3 + 消息 2（含 acknowledge） |
| quality_standard | 4 | 4 | 增/改/删/升版 |
| data_sync | 4 | 2 | 2 条假同步固定 410 不动 |
| quality_cost | 3 | 3 | 增/改/删 |
| quality_task | 2 | 2 | 状态更新 + 缺陷上报 |
| **合计** | **54** | **51** | |

风险清单与逐条当前形态/改后期望见 [w7-b6b-risk-inventory-2026-11-12.md](w7-b6b-risk-inventory-2026-11-12.md)。

## 3. 类型绑定修复（写前按列类型核对占位符）

| 位置 | 原形态 | 结果 | 修复 |
|---|---|---|---|
| `update_apqp_risk` | SQL 11 占位符、12 个 bind | 必 500 | 删除多余 `Uuid::nil()`，`tenant_id = $12` |
| `process_apqp_approval` | 同上 | 必 500 | 删除多余 bind |
| `create_audit_plan` | `scheduled_start/end` 以 `Option<String>` 直绑 timestamptz | 必 500 | SQL 加 `$7::timestamptz`、`$8::timestamptz` |
| `create_audit_finding` | `target_date` 文本直绑 timestamptz | 必 500 | `$11::timestamptz` |
| `create_audit_task` / `complete_audit_task` / `verify_audit_finding` | RETURNING `id`、`task_id` 等 uuid 列解码进 `String` | 必 500 | RETURNING 全部 `::TEXT` |
| `retry_sync` | RETURNING `id`、`source_id`、`target_id` 裸 uuid | 必 500 | `::TEXT`；同步修正 list/get 的同类解码（读路径） |
| `quality_cost` create/update | `incurred_date` 以 `NaiveDateTime` 绑 timestamptz | 必 500 | 统一 `DateTime::<Utc>::from_naive_utc_and_offset` |
| apqp / fmea 全部日期 | 同上 | 必 500 | 同上，集中 `date_to_utc` |

`ai_training_samples` 的 `$7::jsonb` 绑 `Option<&str>`（`svc/ai/src/event_handlers/mod.rs` L62）属跨批次同类问题，本批未扩围，已登记待办。

## 4. 关键实现点

- **apqp 审批表无 `tenant_id` 列、无 RLS**：`qa_apqp_approvals` 建表未带租户列，写 `tenant_id` 会 500。改为通过父项目属主隔离：INSERT 前校验 `project_id` 属主；UPDATE 用 `project_id IN (SELECT id FROM qms.qa_apqp_projects WHERE tenant_id=$n AND deleted_at IS NULL)`。T2 处理 T1 审批实测 409。
- **子表同事务**：APQP 项目 + 5 个默认阶段；审核发现 + `task.finding_count`；SPC 数据点 + `chart.sample_count`；质量标准 + 修订记录；APQP 审批事件。全部失败 500 整体回滚，无 `let _ =`。
- **同域引用校验**：`project_id`、`phase_id`、`fmea_id`、`plan_id`、`standard_id`、`chart_id`、`rule_id`、`related_issue_id`、`inspection_id` 均"存在且同租户"否则 400；审核发现的父任务不存在按 404。
- **软删补条件**：标准/成本删除补 `AND deleted_at IS NULL`，重复删除第二次返回 404。
- **跨域引用**：`product_id` / `process_id`（pdm/mdm）在 apqp/fmea/spc 创建处显式 `TODO(w-b6b): ... 当前未校验属主`。

## 5. 副本验收（158 项）

日志：`/tmp/w7_b6b/replica_matrix.log`；夹具：T1 `00000000-…-0001`、T2 `11111111-…-1111`；副本库 `topems_w7_reh_prod_20261111`。

| 组 | 项数 | 结果 |
|---|---:|---|
| 服务身份无租户头写 15 端点 → 400 且零新增 | 16 | 全绿 |
| 服务身份带 `x-tenant-id` → 200 且落库租户精确 | 4 | 全绿 |
| T1 创建 + 子表随父 + 写后读回（阶段 5 条、修订、计数、uuid/timestamptz 解码） | 53 | 全绿 |
| 同域引用跨租户 → 400（父任务/标准缺失 → 404，T2 处理 T1 审批 → 409） | 14 | 全绿 |
| T2 不可见（详情 404 + 列表不含） | 10 | 全绿 |
| 0 行错误码（删除/更新 404、状态 409） | 28 | 全绿 |
| 删除已建行 200、重复删除 404 | 13 | 全绿 |
| 改前/改后 20 张表行数对比 | 20 | 全绿 |
| **合计** | **158** | **PASS 158 / FAIL 0** |

改前基线（改后逐表复核一致）：`apqp_projects 5 / phases 3 / tasks 0 / risks 0 / approvals 0 / fmea_analyses 5 / fmea_items 3 / audit_plans 5 / audit_tasks 3 / audit_findings 3 / spc_charts 5 / spc_data_points 3 / alert_rules 5 / alert_messages 5 / standards 5 / standard_revisions 3 / sync_records 5 / quality_costs 5 / quality_inspections 5 / inspection_results 3`。

## 6. 生产窗口

日志：`/tmp/w7_b6b_prod/window_prod.log`。

| 时间（UTC） | 动作 |
|---|---|
| 19:25:53 | 窗口开始；scp 暂存，sha256 `132ed73…` 一致 |
| 19:26:0x | `launchctl bootout gui/501/com.topems.server` |
| 19:26:0x | 备份旧二进制（`14a1017…`）→ 换新 → `bootstrap`，新 pid 29697 |
| 19:26:0x | `/health` 200 |
| 19:26:1x | probe 阶段：38 项全绿；20 表 `0…0` 前后一致（零写入） |
| 19:27:2x | write 阶段：27 项全绿；写入后 `1\|5\|0\|0\|0\|1\|1\|1\|0\|0\|1\|1\|1\|1\|1\|2\|0\|1\|0\|0` |
| 19:27:34 | 复验行清理 → 20 表全部回 `0`，`ALL PASS` |

生产证明项：无租户头写 15 端点 400 且零新增；23 个 0 行错误码（404/409）；APQP 项目创建落 5 条阶段；FMEA/SPC/标准/成本写后读回；超管+租户头可读；T2 读 T1 详情 404。

## 7. 门禁

| 门禁 | 结果 |
|---|---|
| `cargo clippy -p topems-qms --all-targets -- -D warnings` | 通过 |
| `cargo fmt --all --check` | 通过 |
| `check-tenant-context --changed-only`（9 文件） | PASS（本次 R1 0 / R2 0） |
| `check-tenant-context` 全量 | R2 由 1764 降至 1313（写路径转作用域后的净下降） |
| `run-cargo-changed.sh check` / `clippy` | 通过 |
| pre-push 全量（shellcheck / config-consistency / schema-defense / ledger-ddl-drift / migration-insert-shape / decode-contract / domain-probe） | 全绿，未使用 `--no-verify` |

## 8. 偏差与卡点（已处置，无阻塞）

1. **验收期误删夹具同步记录**：首次矩阵用 T1 种子同步记录验"删除 200"，导致 `qa_qms_sync_records` 5→4。已用同租户兄弟行克隆回填同 id 并复核基线；矩阵脚本改为"先克隆临时行再删"，后续不再触碰种子数据。
2. **APQP 阶段删除会级联删除任务**：首次矩阵先删阶段再删任务，任务已被级联，导致删除任务返回 404。脚本改为先删任务后删阶段；非代码问题。
3. **重复删除软删行**：标准/成本原 SQL 未带 `deleted_at IS NULL`，第二次删除仍 200。已补条件，重复删除 404。
4. **data_sync 读路径同类解码**：`list/get` 的 `source_id`、`target_id` 裸 uuid 也解码进 `String`，随写路径一并 `::TEXT` 修复（读路径唯一扩围处，已在提交说明体现）。
5. **服务身份权限**：副本与生产使用副本/生产密钥签发的服务 JWT（含 `qms:write`）实测；证明的是 handler 契约（无头 400、带头 200 且租户精确）。真实 portal 服务账号的授权授予未在本批变更。

## 9. 遗留 TODO

- `product_id` / `process_id` 跨域属主未校验（apqp/fmea/spc 创建/更新处已显式标注），待跨域引用治理批次。
- `ai_training_samples` `$7::jsonb` 绑 `Option<&str>`，属 ai 服务同类类型绑定问题，另立票据。
- `start_issue_approval` 的 workflow 租户透传（B6a 遗留）仍未处理。
