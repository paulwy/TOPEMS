# PM 项目状态流转守卫（B267，2026-11-24）

## 问题

`pm.projects.status` 已有值域约束 `ck_projects_status_standard`（7 态，已 VALIDATE），后端 `ProjectStatus` 也能严格解析，但通用更新入口 `update_project` 只要值合法就写入，不校验来源态与目标态，导致：

- 已完成/已取消项目可被直接改回 `active`，终态失去意义；
- `draft` 可跳过审批直接进入 `active`；
- `completed` 与 `paused` 可任意互跳；
- 前端项目列表“待审批”统计仍按 `pending` 判断，真实值为 `pending_approval`，计数恒为 0。

## 改动

### 状态机

`svc/pm/src/models/project.rs` 增加 `is_terminal()` 与 `can_transition_to()`，作为通用更新入口的唯一流转口径：

| 来源 | 允许目标 |
| --- | --- |
| draft | pending_approval / cancelled |
| pending_approval | active / rejected / draft |
| rejected | draft / pending_approval |
| active | paused / completed / cancelled |
| paused | active / completed / cancelled |
| completed | 仅 completed（终态） |
| cancelled | 仅 cancelled（终态） |

同值写入视为幂等，允许通过；审批专用写入路径不受此表限制。

### 写入口

`svc/pm/src/modules/project.rs`：

- 创建入口由硬编码 `"draft"` 改为 `ProjectStatus::DEFAULT.as_db_str()`；
- 更新入口先把请求值解析为枚举，未知值仍返回 400；
- 在事务内先读取当前状态，再按上表校验流转，非法流转回滚并返回 400（含来源态和目标态）；
- 审计 details 与 SQL 绑定均使用枚举规范值，不再透传原始字符串。

### 前端

`apps/web/src/components/pm/PmProjectListPage.tsx` 的待审批统计由 `status === 'pending'` 修正为 `status === 'pending_approval'`。

## 验证

- `cargo test -p topems-pm --lib`：541 passed，0 failed；新增 `test_project_status_transition_guard` 覆盖合法流转、非法跳转、终态与幂等。
- `cargo fmt -p topems-pm`、`cargo clippy -p topems-pm --all-targets -- -D warnings`：通过。
- `pnpm --dir apps/web typecheck`：通过。
- 本地库复核：`pm.projects.ck_projects_status_standard` 为 `convalidated=t`，`status` 默认 `'draft'`、`NOT NULL`；现有数据 `active` 14 行、`draft` 24 行，均在值域内。
- 状态台账：318 个 Rust 枚举 / 251 个前端状态键；188 队列 / 192 值；enum contract 12/12，均 PASS。

本批无新增 DDL，沿用既有值域约束；流转守卫在应用层生效。
