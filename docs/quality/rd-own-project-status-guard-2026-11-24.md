# RD 自建项目状态守卫（B259）

日期：2026-11-24
表：`rs.projects`
约束：`ck_rs_projects_status_standard`（`draft/pending_approval/active/paused/completed/cancelled`，本地 `convalidated=t`）

## 缺陷

`UpdateProjectRequest.status` 已是 `ProjectStatus` 枚举，但 handler 直接 `to_string()` 后写入：

- 没有流转校验：`completed → draft`、`draft → completed`、`cancelled → active` 都能直接落库；完成/取消不是终态。
- 列表 `status` 过滤是裸字符串，非法值只是查不到数据，不报错。
- 创建路径仍散落 `"draft"` 字面量（手工创建、批量创建、导入、repository 三条路径），与枚举默认值可能漂移。

## 落地

- `ProjectStatus` 增加 `can_transition_to`：草稿可提交/直接启动；审批中可激活或退回草稿；执行中可暂停/完成/取消；暂停可恢复；完成、取消为终态；同值幂等。
- `ProjectStatus::normalize` 统一列表过滤的大小写与 `canceled` 别名，非法筛选值 400。
- `update_project` 先解析当前态，再按流转矩阵校验；非法流转 400，库内状态异常 500，不再把非法值交给 DB 变 23514/500。
- 手工创建、批量创建、导入、repository 的 `"draft"` 全部改为 `ProjectStatus::Draft.as_db_str()`。
- 无新增 DDL：既有约束已覆盖六态且已 VALIDATE。

## 验证

- `cargo check -p topems-rd` 通过。
- `cargo clippy -p topems-rd --all-targets -- -D warnings` 通过。
- `cargo fmt -p topems-rd` 通过。
- `TEST_DATABASE_URL=postgresql:///topems_rd_test?host=/tmp cargo test -p topems-rd`：161 passed（lib）+ 18 + 13 等全部通过；新增流转矩阵单测。
- 本地 `rs.projects` 现状 5 行 `draft`，全部满足约束。

## 影响面

仅 RD 自建项目 `/projects` 的创建、批量创建、导入、列表筛选、更新状态；RD 关联项目 `rs.rs_projects` 走 B253/B258 的独立四态生命周期，不受影响。
