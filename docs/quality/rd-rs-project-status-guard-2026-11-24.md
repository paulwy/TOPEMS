# B253：RD 关联项目状态收敛

日期：2026-11-24

## 结论

`rs.rs_projects.status` 从散落的字符串收敛为 `RdProjectStatus` 四态
`pending / in_progress / completed / cancelled`，并修复完成事件按项目名误更新、统计四态各自硬编码的问题。

## 治理前事实

- 表 `rs.rs_projects` 由 PM 项目事件维护，不对外提供 CRUD；本地 17 行全部为 `pending`，无任何 CHECK。
- 代码里没有该表的枚举：
  - 创建事件直接写 `'pending'`；
  - 完成事件直接写 `'completed'`，且 `WHERE name = $2 AND tenant_id = $3`，同租户同名项目会被一起完成；
  - 统计接口四次硬编码 `pending / in_progress / completed / cancelled`。
- `in_progress` 没有任何写入方：创建只写 `pending`，完成只写 `completed`，因此统计中的“进行中”长期为 0，属于生命周期缺口而非数据事实。

## 改动

1. 新增 `svc/rd/src/modules/rd_project_status.rs`：四态、`DB_VALUES`、`as_db_str/from_db_str/normalize`、终态判断和 `can_transition_to`（pending → in_progress/completed/cancelled，in_progress → completed/cancelled，终态不再流转）。
2. PM 项目创建事件改为绑定 `RdProjectStatus::Pending`，不再硬编码 `'pending'`。
3. PM 项目完成事件改为按 `source_type='pm_project' AND source_id=project_id AND tenant_id` 定位，避免同名项目误伤；状态绑定 `Completed`，并排除已 `cancelled` 的项目，防止完成事件把取消项目复活。
4. 统计接口四个计数改为绑定 `RdProjectStatus` 的 DB 值，消除查询字符串与写入字符串的漂移。
5. `in_progress` 仍没有事件来源，本批不伪造写入；已在本文档登记为后续事件接线缺口。

## 数据库约束

`CHECK (status::text = ANY (ARRAY['pending','in_progress','completed','cancelled'])) NOT VALID`

候选 SQL：`docs/database/rd-rs-project-status-check-candidates-2026-11-24.sql`。本地已应用，17 行 `pending` 合法。

## 验证

- `cargo check -p topems-rd` PASS；新增单测覆盖四态 roundtrip、`in-progress` 归一化、终态与流转矩阵。
- 本地探针：`UPDATE rs.rs_projects SET status='bogus'` 被 `ck_rs_projects_status_lifecycle_standard` 拒绝；`in_progress` 写入成功（事务内回滚）。
- 数据分布仍为 17 行 `pending`，无历史数据被改写。
- 完成事件新条件使用 `source_id`，不再依赖项目名。

## 计数

- status-code inventory：314 → **315** 枚举；242 值 / 195 不在 DB CHECK / 251 前端键 / 色板缺口 0（新枚举值均已被全局 CHECK 覆盖）。
- status-db-check queue：187 / 195（不变；新枚举值均已被全局 CHECK 覆盖）。
- mappings：300 → **301**（`svc/rd/src/modules/rd_project_status.rs#RdProjectStatus` → `rs.rs_projects.status`）。
- prod-only：418 → **419**（`rs` 7 → 8，B253 = 1）。
