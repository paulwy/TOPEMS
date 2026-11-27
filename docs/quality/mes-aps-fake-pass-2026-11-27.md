# MES APS：约束检查与优化报告不再伪造结论（B371）

- 日期：2026-11-27
- 服务：`svc/mes`（`modules/aps_scheduling.rs`）、`apps/web/src/api/mes/aps.ts`
- 主题：W5-B 假成功治理 —— 「数据查不到就判通过」与「用编造值充当经营指标」

## 1. 问题：约束检查恒通过

`POST /aps/schedule/check-constraints`（`check_schedule_constraints`）声称按订单校验
物料齐套 / 设备可用 / 人员可用，实际三段判定都不成立：

| 分支 | 原实现 | 后果 |
| --- | --- | --- |
| 物料齐套 | `available_quantity: required * 1.2`（注释「模拟充足」）、`shortfall: 0.0`、`status: Passed` | 从不查任何库存；任何订单的每一项物料都「刚好充足 20%」 |
| BOM 查询 | `if let Ok(items) = bom_items { … }` | 查询报错 → 静默跳过 → 物料约束为空 → `all_passed` 仍为 `true` |
| 设备可用 | SQL 选 `equipment_name`，代码 `try_get("name")`；`next_available_time: Some(Utc::now() + Duration::hours(2))`；`WHERE status = 'normal'` | 设备名恒为空串；「下次可用时间」是编造的；查询条件本身排除了不可用设备，判定必然通过 |
| 班组 | `if let Ok(team_list) = teams { … }`，`required_members: 2` 魔法值 | 查询失败静默跳过；人数口径散落在判断里 |

`overall_passed` 由 `all_passed` 汇总，只有显式检测到「设备非 normal」才会置 false，
其余失败路径全部落回 `true`——即所谓「约束检查完成」实际上是一份无条件通过的回执。

## 2. 问题：优化报告用编造值充当指标

`GET /aps/schedule/optimization-report`（`get_optimization_report`）：

1. `total_orders` / `scheduled_orders` / `completed_orders` 三处 `COUNT(*)` 用 `.unwrap_or(0)`；
   `avg_lead_time` 用 `.ok().flatten()` —— 数据库异常时报告退化为全零的「正常报告」。
2. 工位列名错位：SQL 选 `station_name`，代码 `load.try_get("name")`，瓶颈资源名恒为空串。
3. 量纲错误：`utilization = total_hours.min(100.0)`，把「计划工时（小时）」直接当「利用率百分比」，
   48 小时会被读成 48%。
4. `impact_score = if idx < 3 { 0.9 } else { 0.6 }` —— 由数组下标决定，与工位数据无关。
5. `on_time_rate = completed_orders / total_orders` 是**完成率**，不是准时率。
6. 建议文本硬编码收益承诺：「提升产能 15-20%」「提升准时交付率至 90%+」「减少排程时间 80%」。

`GET /aps/schedule/bottleneck-analysis`（`get_bottleneck_analysis`）同病：4 个计数 + 平均周期 +
产能 + 需求全部吞错；`try_get("name")` 同样错位；`impact_score: if orders > 0 { 0.85 } else { 0.3 }`；
`utilization_rate` 用 `tasks * 2.0 / total_capacity` 的魔法系数。

## 3. 修复

### 3.1 约束检查（`check_schedule_constraints`）

- `MaterialConstraint.available_quantity` / `shortfall` 改为 `Option<f64>`：
  MES 服务内没有库存账（库存归 `wms.inventory`），因此一律返回 `None`，
  状态为新增的 `ConstraintStatus::Unknown`，并置 `all_passed = false`。
- BOM 为空时插入一条 `「BOM 未维护」` 的 Unknown 约束并阻断通过；BOM 查询报错 → 500。
- 设备：SQL 去掉 `WHERE status = 'normal'`（自证过滤），按 `equipment_code` 稳定排序，
  代码改用真实列 `equipment_name`；`next_available_time` 取真实 `next_maintenance_date`，
  仅在设备不可用时回填，可用时返回 `None`；保养日期已过期 → `Warning`。
- 班组查询报错 → 500；`required_members` 抽成 `DEFAULT_REQUIRED_MEMBERS` 常量。
- 设备为空的租户返回一条 `「设备台账为空」` 的 Unknown 约束，而不是「没有约束 = 通过」。

### 3.2 优化报告（`get_optimization_report`）

- 三个统计 + 平均周期改为 `match` 上抛（`TopemsError::internal` → 500）；删掉从未被使用的
  `completed_orders` 查询。
- 新增「排程窗口」查询（`MAX(planned_end_time) - MIN(planned_start_time)` 的小时数），
  负载率改为 `计划工时 / 窗口时长 × 100`（上限 100），窗口为 0 时给 0。
- `impact_score` 由负载率派生（`load_rate / 100`）。
- 准时率改为真实口径：`COUNT(completed AND actual_end_date <= planned_end_date) /
  COUNT(completed AND 两个日期均非空)`。
- 建议改为数据驱动：只在实测负载率 ≥ 80% / 准时率 < 80% / 存在未排程订单时给出，
  文案里带真实数值，不再承诺百分比收益。

### 3.3 瓶颈分析（`get_bottleneck_analysis`）

- 4 个计数、平均周期、产能、需求全部 `match` 上抛。
- 工位列名改 `station_name`；空名不再产生「无名瓶颈资源」。
- `utilization_rate` 改为「该工位任务数 / 全部在排任务数」，`impact_score` 与负载率同源。

### 3.4 前端契约

`apps/web/src/api/mes/aps.ts`：

- `MaterialConstraint.available_quantity` / `shortfall` → `number | null`
- 三个约束类型的 `status` 联合类型补 `'unknown'`

当前前端没有任何页面消费这些字段（只有 api 层类型定义），因此属于纯类型对齐，无运行时影响。

### 3.5 棘轮

新增 `svc/mes/src/aps_no_fabrication_ratchet.rs`（`#[cfg(test)]` 引入）：

1. `material_availability_is_never_guessed`：禁 `required * 1.2` / `模拟充足` / `shortfall: 0.0,`，
   要求 `ConstraintStatus::Unknown` 与 `available_quantity: Option<f64>` 存在。
2. `equipment_names_and_availability_are_real`：禁 `try_get("name").unwrap_or_default()`、
   禁 `Some(Utc::now() + Duration::hours(2))`，要求 `try_get("equipment_name")`。
3. `constraint_queries_do_not_swallow_errors`：禁三处 `if let Ok(...)`，要求错误文案存在。
4. `optimization_report_does_not_fake_metrics`：禁下标式 `impact_score`、禁
   `total_hours.unwrap_or(0.0).min(100.0)`、禁三条收益承诺，要求 `schedule_window_hours`
   与 `actual_end_date <= planned_end_date`。

> 注意：棘轮读取的源码里如果出现这些字面量（包括注释），断言会自匹配变红，
> 因此正文说明都改用描述性措辞。

## 4. 验证

- `cargo test -p topems-mes --lib` → **436 passed, 0 failed**（含 5 条新棘轮）。
- `cargo clippy -p topems-mes --all-targets -- -D warnings` → 通过。
- `cargo fmt --all --check` → 通过。
- `pnpm --filter topems-portal typecheck` → 通过。
- `bash scripts/dev/web_smoke_precommit.sh` → **4509/4509 PASS, 0 FAIL**（用例总数随 upstream 路由变化）。
- `perm-matrix ci-report` → R5 = 0（R3 余 WARN 不阻塞）；`check-i18n --mode=quality --strict`、
  `verify-glossary --strict`、`check-noop-param-discard --changed-only`、
  `check-soft-delete-precedence`、`check-tenant-write-sources --strict`、
  `check-tenant-context`、`check-request-txn` 全部通过。

## 5. 遗留

1. **物料齐套仍不可判**：MES 没有库存账，真实齐套性需要读 `wms.inventory`
   （跨 schema）或经 BFF 调 WMS 接口。本次只做到「不再假装充足」，
   接哪个数据源属于跨服务契约决策，未在本批擅自引入。
2. **设备与订单没有绑定关系**：检查的是租户设备池，不是「该订单已分配到某台设备」；
   真正的设备占用判定需要读 `mes.production_schedules.work_station_id` 的时段冲突。
3. **班组能力维度未实现**：只有人数下限比较，技能/排班/工时都未参与判定。
4. **`get_bottleneck_analysis` 的产能口径仍是估算**：`COUNT(active stations) * 8 * 5`
   假设「每工位每天 8 小时、每周 5 天」，需求侧 `SUM(quantity * 0.1)` 假设「每 10 件 1 小时」；
   两个系数都没有数据支撑，属下一批待清的口径问题（本次只修了吞错与列名错位）。
5. **`get_period_cost_report` 等报表**：`month_costs.get(...).copied().unwrap_or((0.0, 0.0, 0.0))`
   把缺失月份当 0 成本，与「成本未归集」不可区分，待另批处理。
6. 前端目前没有 APS 约束/报告的可视化页面，这两个端点的返回值实际上没有消费者；
   若要上线展示，需要同时确认 `unknown` 状态的 UI 表达。

## 6. 附带：推送期间撞到的上游门禁欠账

本批推送耗时主要不在 MES APS 本身，而在 main 侧并行批次留下的门禁红线：每次
`git fetch && git rebase && git push` 都会撞上新的上游提交，红线随之变化。逐条记录：

| 项 | 现状 | 最终是否由本批携带 |
| --- | --- | --- |
| `svc/mes` 84 处 `#[utoipa::path]` 缺 `security()`（R5） | 本线按 handler 真实鉴权来源（`shared/permission.rs` 的 `MesPermission::X` → `mes:read/write/delete`；只靠路由层 `require_module_write("mes")` 兜底的写端点标 `mes:admin`）补齐后 R5 84→0 | 否：main 侧并行批次已补，rebase 时按 upstream 版本收敛 |
| `svc/unified-core` doc 模块 37 处 R5（57 个 path 只 20 个有 `security()`） | 本线按同文件口径补齐（GET → `unified-core:doc:read`，写方法 → `unified-core:doc:write`） | 否：rebase 后 upstream 已补齐，R5 现状 0 |
| 前端 `templateApi.import()` 幽灵方法（`templateAssignmentApi.importTemplate` 从未定义，后端无 `/templates/{id}/import` 路由，`topems-portal` typecheck 直接 `TS2551`） | 本线删除该行后 typecheck 恢复 | 否：rebase 后 upstream 版本已无该行 |
| 前端 i18n 两道门禁欠账（`components.dashboard_template.k0` 嵌套值 `"Search..."` 与扁平 `"No data"` 冲突；`integration.integration_dashboard_page.k13` 扁平 `"Syncs by system"` vs 嵌套 `"Sync Volume by System"`） | 本线改 `"No data"` / `"Sync Volume by System"` 后 `check-i18n --mode=quality --strict` 与 `verify-glossary --strict` 转绿 | 否：rebase 后 upstream 已是修正值 |
| `svc/mes/src/modules/production_scheduling.rs:138` 的 `n as i32` | 触发 crate 级 `deny(clippy::cast_possible_truncation)` 与 `deny(clippy::as_conversions)`，`topems-mes` 在本机 clippy 门禁**编译不过**（pre-push 直接 exit 101） | 否：main 的 `106578151 fix(mes,i18n): 调度数量安全转换` 已改 `i32::try_from`，本线按 upstream 收敛 |

结论：以上五项最终都由 main 侧并行批次收口（最后一项由 `106578151` 修掉），本批按 upstream
收敛后**不重复携带**任何一项，提交只保留 MES APS 主体与棘轮。这段过程留在文档里，是因为
它说明了一件事：门禁红线的归属会在并行开发中反复漂移，rebase 时必须逐项核对「还要不要我修」。
