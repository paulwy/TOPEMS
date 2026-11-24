# RD 里程碑/阶段状态流转守卫（B261）

日期：2026-11-24
表：`rs.project_milestones`、`rs.project_phases`

## 现状

两张表已有 VALID CHECK：

- `project_milestones.status`：`pending / achieved / delayed`
- `project_phases.status`：`not_started / in_progress / completed / delayed`

Rust 侧也已有 `MilestoneStatus`、`PhaseStatus` 的 DB 值集，但更新 handler 只做 `COALESCE($6, status)`，没有状态机：

- 里程碑 `achieved → pending`、阶段 `completed → not_started` 可直接把已完成工作回退。
- 非法值只会在 DB 层触发 23514，返回 500，而不是 400。
- 创建路径仍散落 `"pending"` / `"not_started"` 字面量。

## 落地

- `MilestoneStatus::can_transition_to`：待达成 → 达成/延期；延期 → 待达成/达成；达成 → 只允许延期，不允许回退待达成；同值幂等。
- `PhaseStatus::can_transition_to`：未开始 → 执行中/完成/延期；执行中 → 完成/延期；延期 → 执行中/完成；已完成为终态；同值幂等。
- 两个更新语句用单条 `UPDATE ... CASE` 按当前态允许目标态：非法流转不改变原值，handler 比对返回态后回 400；不新增查询，不破坏 `request-txn` 门禁。
- 创建绑定 `MilestoneStatus::DEFAULT` / `PhaseStatus::DEFAULT`，去掉字面量。
- `normalize` 统一大小写与首尾空格，便于后续筛选/导入复用。
- 无新增 DDL：既有 CHECK 已 `convalidated=t`。

## 验证

- `cargo check -p topems-rd`、`cargo fmt` 通过。
- `cargo clippy -p topems-rd --all-targets -- -D warnings` 通过。
- `TEST_DATABASE_URL=postgresql:///topems_rd_test?host=/tmp cargo test -p topems-rd`：**164 passed**。
- 本地两表当前 0 行，新增状态均为默认合法值。

## 影响面

RD 项目详情中的里程碑/阶段创建与状态更新；不涉及 RD 自建项目 `rs.projects`（B259）与关联项目 `rs.rs_projects`（B253/B258）。
