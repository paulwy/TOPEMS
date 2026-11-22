# B148 · RD / PM 项目状态收口

日期：2026-11-22

## 目标

把 RD 项目、里程碑、阶段三段状态和 PM 项目状态统一为唯一 Rust 枚举口径；写入口严格校验，DB 侧补 `NOT VALID` CHECK 并在本地实际应用。B148 完成后 W5-B 未解决枚举清零。

## 收口前

- `rs.projects`：本地 5 行全 draft，`NOT NULL` 默认 active，无 CHECK。代码创建写 `'draft'`，但 `ProjectStatus` 的 `Display` 输出大写，更新绑定会写 `'DRAFT'`。
- `rs.project_milestones`：0 行，默认旧值 `'PENDING'`；代码创建写 `'pending'`，更新绑定 `Display` 写 `'PENDING'`。
- `rs.project_phases`：0 行，默认旧值 `'NOT_STARTED'`；代码创建写 `'not_started'`，更新绑定 `Display` 写 `'NOT_STARTED'`。
- `pm.projects`：本地 38 行（draft 24 / active 13 / in_progress 1），`NOT NULL` 默认 draft，无 CHECK。事件处理器审批驳回写 `'rejected'`，枚举缺该变体；更新入口 `status` 原样写库。
- 生产：`rs.projects=0`、两个 RD 子表=0、`pm.projects=0`。

## 代码改动

- RD `ProjectStatus/MilestoneStatus/PhaseStatus`：补 `DB_VALUES/DEFAULT/as_db_str/from_db_str`；`Display` 全部改为小写，保证 Encode/绑定写小写。
- RD 里程碑/阶段更新入口：`.bind(payload.status.map(|s| s.as_db_str()))`，不再通过 `Display` 写大写。
- PM `ProjectStatus`：新增 `Rejected`，补七值 `DB_VALUES/DEFAULT/as_db_str/from_db_str`。
- PM 项目列表/更新入口：`status` 均先经 `from_db_str` 归一为小写；非法值直接 400，更新绑定归一后的 `status`，`details` 记录归一值。
- RD/PM 枚举自身保持不变量的 API serde 大写；DB 口径固定小写。

## 本地应用

候选：`docs/database/rd-pm-status-check-candidates-2026-11-22.sql`

- `rs.projects`：DROP 同名后六值小写 CHECK（draft/pending_approval/active/paused/completed/cancelled），默认 draft、`NOT NULL`、`NOT VALID`。
- `rs.project_milestones`：三值小写 CHECK（pending/achieved/delayed），默认 pending、`NOT NULL`、`NOT VALID`。
- `rs.project_phases`：四值小写 CHECK（not_started/in_progress/completed/delayed），默认 not_started、`NOT NULL`、`NOT VALID`。
- `pm.projects`：先把 1 行 `in_progress` 回填 `active`，再建七值 CHECK（draft/pending_approval/active/paused/completed/cancelled/rejected），默认 draft、`NOT NULL`、`NOT VALID`。
- 本地核验：四约束 `convalidated=false`；`pm.projects` 现 active 14 / draft 24；`rs.projects` 仍 draft 5。
- **生产快照只读，未应用**；正式发布需逐条执行并 `VALIDATE`。

## 队列与门禁

- 映射补 4 条：`rd::ProjectStatus`、`rd::MilestoneStatus`、`rd::PhaseStatus`、`pm::ProjectStatus` 分别到对应表列。
- 队列 144 枚举 / 152 值，`resolved_enums=140→144`，未解决枚举清零。
- RD clippy 通过，`--lib` 155 passed；PM clippy 通过，`--lib` 484 passed（RD 仓库测试使用 `TEST_DATABASE_URL` 测试库）。
- 盘点 208 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0；queue `--check` PASS。
- request-txn 1651、scope-api 未标记 176 / `Db::new` 144 均未增；txn-write-non2xx PASS；glossary / i18n 7-in-1 PASS。
