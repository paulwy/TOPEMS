# B230 · pm.project_milestones.status 状态治理

日期：2026-11-23
表列：`pm.project_milestones.status`（varchar NOT NULL DEFAULT `'pending'`）
枚举：`svc/pm/src/modules/milestone_status.rs` → `MilestoneStatus`

## 发现的问题

1. **创建 INSERT 拼 `'pending'`**：状态字面量直接写在 SQL 里。
2. **推导函数与落库值集不一致**：同文件 `milestone_status()` 返回 `upcoming`，而 create 落库 `pending`；`upcoming` 在任何 DB 值集里都不存在。
3. **更新接口原样入库**：`update_milestone` 把 `req.status` 直绑 `status = COALESCE($4, status)`，未知值可落库，且不看来源状态（completed 可被改回 pending）。
4. **无 DB CHECK**：任意值可落库；表当前 0 行。

## 改动

- 新增 `MilestoneStatus`（4 态）：`DB_VALUES / DEFAULT / as_db_str / from_db_str（含历史别名，upcoming→pending）/ normalize / parse_filter / can_transition_to（completed 终态；overdue 可回 in_progress）/ is_terminal / Display / FromStr` + 单测。
- `milestone_status()` 返回类型由 `&'static str` 改为 `MilestoneStatus`，`upcoming` 分支落为 `Pending`，单测同步改为枚举断言。
- 创建 INSERT 的 `'pending'` 改绑定 `MilestoneStatus::DEFAULT`。
- 新增 `ensure_milestone_transition()`：按 `project_id + id` 加载当前状态（不存在 404、存量未知值 400、非法流转 400）；更新接口先 `normalize`（未知 400）再校验流转，SQL 改绑 `Option<&'static str>`。
- 新增 `ck_project_milestones_status_standard`（4 值，NOT VALID），已应用到本地 `topems`；表 0 行，事务内取父项目 + 里程碑验证：`bogus` 被拒（`violates check constraint`）。

## 门禁

- `cargo fmt --all` / `cargo clippy -p topems-pm --lib --tests -- -D warnings` / `cargo test -p topems-pm --lib`：506 passed。
- 状态目录不刷新（无迁移候选，catalog 保持 33/5/683）；登记 prod-only 398。
- 映射 281 → 282；inventory / queue 随之刷新。
