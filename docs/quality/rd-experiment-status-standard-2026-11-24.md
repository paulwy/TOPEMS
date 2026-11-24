# RD 试验状态词表收口（B264）

日期：2026-11-24
表：`rs.experiments`
迁移：`database/migrations/20261124193000_rd_experiment_status_standard.sql`

## 缺陷

- `rs.experiments.status` 无 CHECK，列默认值是 `planning`。
- 后端创建固定写 `planned`；前端试验表单的四个状态值实际是中文 `进行中 / 已完成 / 暂停 / 失败`。
- 更新接口直接 `req.status.unwrap_or(existing.status)`，推进阶段接口直接接受任意 `new_status`；`已完成/失败` 可被改回 `进行中`，非法值只会在前端显示成未知 chip。
- 本地表 0 行，但三条写入路径已经产生三套词表。

## 落地

- 新增 `ExperimentStatus` 五态：`planned / in_progress / completed / paused / failed`，与迁移 CHECK 同源。
- `normalize` 兼容：`planning/计划中→planned`、`in-progress/running/进行中→in_progress`、`done/已完成→completed`、`on_hold/暂停→paused`、`failure/失败→failed`；未知值 fail-closed。
- `CreateExperimentRequest` 增加可选 `status`，前端表单值不再被静默丢弃；缺省绑定 `ExperimentStatus::DEFAULT.as_db_str()`。
- 更新先解析当前态与目标态：已完成/失败为终态，暂停可恢复，非法回退 400；原 `'planned'`/`&status` 绑定改为枚举。
- 推进阶段先校验状态流转，`new_status` 缺省 `in_progress`，非法值或终态推进 400。
- 四个列表端点（总表、lab、pilot、scaleup）状态筛选统一归一，非法筛选值 400；中文旧值仍可查询。
- 前端 `experiment.ts` 状态选项值改为英文五态、默认 `in_progress`，颜色映射同步；新增 `schemas.experiment.k7`（计划中/Planned）标签。
- 迁移：旧默认/别名/中文值归一 → 默认值固定 `'planned'` → `ADD CONSTRAINT ck_experiments_status_standard CHECK (五态) NOT VALID` → `VALIDATE`。
- fail-closed：归一后仍有五态之外的数据则 `RAISE EXCEPTION`。

## 本地应用与验证

- 迁移执行成功：`B264 完成：rs.experiments.status 已建立五态约束`。
- `pg_constraint`：`ck_experiments_status_standard`，`convalidated=t`。
- 列默认值：`'planned'::text`。
- 事务内探针：插入成功；更新为 `bogus` 被 23514 拒绝；回滚后表内 0 行。
- `cargo check -p topems-rd`、`cargo fmt`、`clippy --all-targets -- -D warnings` 通过。
- `TEST_DATABASE_URL=... cargo test -p topems-rd`：169 passed。
- 状态盘点：318 个 Rust 枚举；队列 188 枚举 / `real_gap 0`。

## 未纳入本批

`rs.experiments.phase` 仍无 CHECK（lab/pilot/scaleup/production 由推进接口隐式约束），本批只收口 `status`，避免把阶段词表与状态词表混在同一迁移。

## 回滚

`database/rollback/20261124193000_rd_experiment_status_standard.rollback.sql`：DROP 约束、默认值恢复旧值 `'planning'`。历史中文/别名归一不可逆。
