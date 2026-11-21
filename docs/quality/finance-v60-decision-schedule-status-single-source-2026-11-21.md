# finance v60 决策 / 调度状态单一源（W5-B / B11）

- 日期：2026-11-21
- 范围：`svc/finance/src/modules/decision_v60.rs` 与 `finance.finance_v60_decision_scenarios` / `finance.finance_v60_schedule_tasks` / `finance.finance_v60_schedule_executions`
- 结论：v60 五组状态（场景类型、场景状态、任务类型、任务状态、执行状态）在代码侧统一到既有枚举；写入口补严格解析、起始状态守卫和 0 行检查；`get_tasks` 过滤 SQL 修复为可执行语句。DB CHECK 仍未添加，候选 DDL 见文末。

## 1. 摸底发现的缺陷

| 位置 | 缺陷 | 后果 |
| --- | --- | --- |
| `get_tasks` | 先拼 `SELECT ... FROM finance.finance_v60_schedule_tasks`，再直接 `query.push_str(" AND task_type = $1")` / `AND status = ...`，没有 `WHERE` | 只要带任一过滤条件，SQL 语法错误；且 `task_type` / `status` 不校验，任意字符串直落查询 |
| `create_scenario` | 未知 `scenario_type` 静默回退 `Investment` | 非法类型被写成合法场景，前端拿不到错误 |
| `create_task` | 未知 `task_type` 静默回退 `Recurring` | 同上 |
| `evaluate_scenario` | 任意状态场景都可评估并写 `evaluated`，无起始状态谓词 | 已评估 / 已归档场景被重复评估，覆盖评估结果 |
| `execute_task` | 不检查任务状态，`completed` / `failed` 任务也能再次执行，并写一条 `completed` 执行记录、把任务改 `completed`；任务 UPDATE 无状态谓词 | 重复执行、重复计执行次数，执行历史被污染 |
| `pause_task` | 任意状态可暂停，包括 `completed` / `failed` | 终态任务被拉回可运行语义 |
| `resume_task` | 任意状态可恢复为 `pending` | 终态任务被复活 |
| `update_schedule` | 直接接受任意 `status` 字符串写库 | 任意状态可被改成任意值，绕过任务状态机 |
| 写路径字面量 | 状态写库多用 `'draft'` / `'pending'` / `'completed'` / `'paused'` 字面量 | 枚举改动后 SQL 与枚举漂移 |

文件内已有 `DecisionStatus`、`ScheduleTaskStatus`、`ScheduleExecutionStatus`、`ScheduleTaskType`、`DecisionScenarioType`，缺严格解析函数，写路径也未复用。

## 2. 唯一状态集合

| 概念 | 枚举 | 取值 | 说明 |
| --- | --- | --- | --- |
| 决策场景类型 | `DecisionScenarioType` | `investment` / `financing` / `operational` / `strategic` | 创建入参必须命中，未知 400 |
| 决策场景状态 | `DecisionStatus` | `draft` / `active` / `evaluated` / `archived` | 仅 `draft` / `active` 可评估 |
| 调度任务类型 | `ScheduleTaskType` | `recurring` / `one_time` / `event_driven` | 创建入参必须命中，未知 400 |
| 调度任务状态 | `ScheduleTaskStatus` | `pending` / `running` / `paused` / `completed` / `failed` | 执行仅 `pending` 可进入；暂停仅 `pending` / `running`；恢复仅 `paused` |
| 调度执行状态 | `ScheduleExecutionStatus` | `pending` / `running` / `completed` / `failed` / `cancelled` | 当前执行写入口落 `completed` |

## 3. 代码改动

### 3.1 枚举层

- `DecisionStatus::from_str -> Option<Self>`：`draft` / `active` / `evaluated` / `archived`，`trim` 后匹配，未知 `None`。
- `DecisionScenarioType::try_from_str`、`ScheduleTaskType::try_from_str`：严格解析，未知 `None`；旧 `from_str` 复用严格解析并保留历史默认回退，仅供未校验路径兼容。
- `ScheduleTaskStatus`：新增 `ALL: [Self; 5]` 与 `from_str -> Option<Self>`，保留 `as_str` 供 SQL 绑定和错误文案。

### 3.2 handler 入参校验（400 在 handler 层，service 只返回 `sqlx::Error`）

- `create_scenario_handler`：非空 `scenario_type` 走 `try_from_str`，非法返回 `TopemsError::ValidationFailed("非法决策场景类型: {raw}，可选值: investment/financing/operational/strategic")`。空值仍由 DB 默认 `investment` 兜底。
- `create_task_handler`：非空 `task_type` 走 `try_from_str`，非法 400，文案列出 `recurring/one_time/event_driven`。
- `get_tasks_handler`：`task_type` / `status` 非空时严格校验，非法 400；状态错误文案由 `ScheduleTaskStatus::ALL` join 生成。
- `update_task_handler`：`status` 只允许 `pending` / `paused`；`running` / `completed` / `failed` 返回 400（“更新接口只允许把任务改为 pending 或 paused；running/completed/failed 由执行流程推进”），未知状态 400。

### 3.3 service SQL 与状态守卫

- `get_tasks`：改为 `only_own_schema_query!` 静态 SQL，`WHERE ($1::text IS NULL OR task_type = $1) AND ($2::text IS NULL OR status = $2) ORDER BY priority DESC, created_at DESC LIMIT 200`；绑定 `trim` 后的值，空串转 `NULL`。
- `create_scenario`：INSERT 的 `'draft'` 改 `$8`，绑定 `DecisionStatus::Draft.as_str()`，参数顺延至 `$10`。
- `evaluate_scenario`：读场景后 `DecisionStatus::from_str(&scenario.status)`；仅 `Draft` / `Active` 可评估，`Evaluated` / `Archived` 返回 `RowNotFound`（经 `err_resp` 映射 404），未知状态返回 `Protocol`（500）。UPDATE 加 `AND status IN ($5, $6)`，绑定 `Evaluated` / `Draft` / `Active`。
- `create_task`：INSERT 的 `'pending'` 改 `$8`，绑定 `ScheduleTaskStatus::Pending.as_str()`，参数顺延至 `$10`。
- `schedule_task`：UPDATE 改 `SET status = $4 ... WHERE id = $2 AND tenant_id = $3`，绑定 `Pending`。
- `execute_task`：任务 SELECT 加 `AND status = $3`，绑定 `Pending`；执行记录 INSERT 的 `'completed'` 改 `$8`，绑定 `ScheduleExecutionStatus::Completed`，`output` 顺延 `$9`；任务 UPDATE 改 `SET status = $4 ... AND status = $5`，绑定 `Completed` / `Pending`，并检查 `rows_affected()==0` 返回 `RowNotFound`。
- `pause_task`：`SET status = $4 ... AND status IN ($5, $6)`，绑定 `Paused` / `Pending` / `Running`，`fetch_one` 0 行即 `RowNotFound`。
- `resume_task`：`SET status = $4 ... AND status = $5`，绑定 `Pending` / `Paused`，同样 0 行即 `RowNotFound`。

### 3.4 保留的历史行为（本次未动，已记录）

- `schedule_task` 对任意既有状态直接重置 `pending`，未加起始谓词；该入口是“立即运行一次”的调度动作，是否限制为 `pending/paused` 需业务确认。
- 旧 `DecisionScenarioType::from_str` / `ScheduleTaskType::from_str` 仍保留静默默认，但业务 handler 已全部改走严格解析；后续可评估删除兼容入口。
- `update_schedule` service 本身仍接受任意 `status`，目前仅靠 handler 限定 `pending` / `paused`；若有其他 service 调用方需补守卫。

## 4. 验证

- `cargo check -p topems-finance`：通过。
- `cargo clippy -p topems-finance --all-targets -- -D warnings`：通过。
- `cargo test -p topems-finance --lib`：1110 passed / 0 failed / 1 ignored。
- 新增 3 个单测：`schedule_task_status_parses_only_known_values`、`schedule_task_type_rejects_unknown_instead_of_defaulting`、`decision_scenario_type_rejects_unknown_instead_of_defaulting`；`decision_v60` 子集 61 passed。
- 本地事务演练（`BEGIN ... ROLLBACK`，RLS `app.rls_system=on`，三表原本 0 行）：
  - 任务：`pending→paused` 1 行、`paused→pending` 1 行、重复恢复 0 行、`pending→completed` 1 行、重复执行 0 行。
  - 场景：`draft→evaluated` 1 行、已评估重复评估 0 行。
  - 执行记录 INSERT 与任务 UPDATE 参数顺序已按 SQL 占位符核对，编译期类型检查通过。

## 5. 候选 CHECK DDL（未执行，需生产窗口）

三张表本地均 0 行，生产分布需先盘点。建议先 `NOT VALID` 上线，观察后再 `VALIDATE`。

```sql
ALTER TABLE finance.finance_v60_decision_scenarios
  ADD CONSTRAINT finance_v60_decision_scenarios_scenario_type_check
  CHECK (scenario_type IN ('investment','financing','operational','strategic')) NOT VALID;

ALTER TABLE finance.finance_v60_decision_scenarios
  ADD CONSTRAINT finance_v60_decision_scenarios_status_check
  CHECK (status IN ('draft','active','evaluated','archived')) NOT VALID;

ALTER TABLE finance.finance_v60_schedule_tasks
  ADD CONSTRAINT finance_v60_schedule_tasks_task_type_check
  CHECK (task_type IN ('recurring','one_time','event_driven')) NOT VALID;

ALTER TABLE finance.finance_v60_schedule_tasks
  ADD CONSTRAINT finance_v60_schedule_tasks_status_check
  CHECK (status IN ('pending','running','paused','completed','failed')) NOT VALID;

ALTER TABLE finance.finance_v60_schedule_executions
  ADD CONSTRAINT finance_v60_schedule_executions_status_check
  CHECK (status IN ('pending','running','completed','failed','cancelled')) NOT VALID;
```

上线前盘点 SQL：

```sql
SELECT 'scenario_type' AS col, scenario_type AS val, count(*) FROM finance.finance_v60_decision_scenarios GROUP BY 1,2
UNION ALL SELECT 'scenario_status', status, count(*) FROM finance.finance_v60_decision_scenarios GROUP BY 1,2
UNION ALL SELECT 'task_type', task_type, count(*) FROM finance.finance_v60_schedule_tasks GROUP BY 1,2
UNION ALL SELECT 'task_status', status, count(*) FROM finance.finance_v60_schedule_tasks GROUP BY 1,2
UNION ALL SELECT 'execution_status', status, count(*) FROM finance.finance_v60_schedule_executions GROUP BY 1,2
ORDER BY 1,2;
```

## 6. 遗留

- 生产 v60 三表实际行数与状态分布未知（本地 0 行），CHECK 不能直接 `VALIDATE`。
- v60 无前端状态映射；若后续接入页面，需按第 2 节五组集合补 `STATUS_COLOR_MAP` 键。
- `finance.finance_v60_schedule_dependencies` 未纳入本批（无状态列）。
