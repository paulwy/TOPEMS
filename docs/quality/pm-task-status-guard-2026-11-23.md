# B226 · pm.pm_tasks.status 状态治理

日期：2026-11-23
表列：`pm.pm_tasks.status`（varchar NOT NULL DEFAULT `'todo'`）
枚举：`svc/pm/src/modules/task_status.rs` → `TaskStatus`

## 发现的问题

1. **创建可写入任意状态**：`create_task` 直接用 `req.status` 拼字符串入库，未知值（如 `bogus`）能落库；`task_progress_for_status` 对未知状态按传入进度静默处理。
2. **更新校验可被绕过**：`update_task` 的 `if let Ok(Some(from))` 在查询出错时直接跳过状态机校验；且状态机是裸字符串 `matches!`，没有类型约束。
3. **列表过滤裸绑**：`list_tasks`（全局列表 + 项目任务列表两处）把 `?status=` 原样绑到 `status = $2`，拼错或 `all` 静默返回空列表。
4. **分页 total 失真**：全局列表 `COUNT(*)` 只带 `deleted_at IS NULL`，不随 project/status/priority/assignee 过滤；项目列表 COUNT 也只带 project，不带 status —— 分页总数与 items 不一致。
5. **更新 SQL 状态字面量**：`progress = CASE $4 WHEN 'done' THEN 100 WHEN 'todo' THEN 0 ...` 内嵌状态字面量。
6. **前端色板缺键**：`apps/web/src/utils/status.ts` 缺 `review`，严格色板门禁会报缺口。

## 改动

- 新增 `TaskStatus`（5 值）：`DB_VALUES / DEFAULT / as_db_str / from_db_str（含历史别名）/ normalize / parse_filter（None|空|all → None，非法 Err）/ can_transition_to / progress / Display / FromStr` + 单测。
- `task_status_transition_valid`、`task_progress_for_status` 改为委托枚举（对外签名不变，既有单测继续通过）。
- 创建：`status` 走 `normalize`（缺省 `TaskStatus::DEFAULT`），未知值 400；`progress` 由枚举派生。
- 更新：先严格解析请求状态（未知 400）；加载当前状态时查询失败返回 500、未知存量状态 400；非法流转 400（`非法任务状态流转: from -> to`）。
- 两处列表：`parse_filter` 归一后绑定，非法值 400；两处 COUNT 补齐与 items 相同的过滤条件。
- 更新 SQL 的 `'done'/'todo'` 改为绑定 `$13/$14`（`TaskStatus::Done/Todo`）。
- 前端 `status.ts` 补 `review: 'warning'`。
- 新增 `ck_pm_tasks_status_standard`（5 值，NOT VALID），已应用到本地 `topems`；表 2 行均在值集内；事务内 `bogus` 被拒（`violates check constraint`），未留下脏数据。

## 门禁

- `cargo fmt --all` / `cargo clippy -p topems-pm --lib --tests -- -D warnings` / `cargo test -p topems-pm --lib`：489 passed。
- 状态目录不刷新（无迁移候选，catalog 保持 33/5/683）；登记 prod-only 394。
- 映射 277 → 278；inventory / queue 随之刷新。
