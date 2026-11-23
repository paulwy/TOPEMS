# B232 · pm.project_phases.status 状态治理

日期：2026-11-23
表列：`pm.project_phases.status`（varchar NOT NULL DEFAULT `'pending'`）
枚举：`svc/pm/src/modules/project_phase_status.rs` → `ProjectPhaseStatus`

## 发现的问题

1. **创建阶段 INSERT 拼 `'pending'`**：状态字面量直接写在 SQL 里。
2. **更新接口原样入库**：`update_phase` 把 `req.status` 直绑 `status = COALESCE($7, status)`，未知值可落库，且不看来源状态（completed 可改回 pending、pending 可直改 completed 跳过 active）。
3. **前后端值集靠约定**：前端 `PmProjectDetailPage` 只认 `completed` / `active`，其余一律按 `pending` 灰显；后端无任何约束，拼错即静默降级。
4. **无 DB CHECK**：任意值可落库；表当前 0 行。

## 改动

- 新增 `ProjectPhaseStatus`（3 态）：`DB_VALUES / DEFAULT / as_db_str / from_db_str（含历史别名）/ normalize / parse_filter / can_transition_to（pending→active/completed、active→completed，completed 终态）/ is_terminal / Display / FromStr` + 单测。
- 创建 INSERT 的 `'pending'` 改绑定 `ProjectPhaseStatus::DEFAULT`。
- 新增 `ensure_phase_transition()`：按 `project_id + id` 加载当前状态（不存在 404、存量未知值 400、非法流转 400）；更新接口先 `normalize`（未知 400）再校验流转，SQL 改绑 `Option<&'static str>`。
- 新增 `ck_project_phases_status_standard`（3 值，NOT VALID），已应用到本地 `topems`；表 0 行，事务内取父项目 + 阶段验证：`bogus` 被拒（`violates check constraint`）。

## 门禁

- `cargo fmt --all` / `cargo clippy -p topems-pm --lib --tests -- -D warnings` / `cargo test -p topems-pm --lib`：516 passed。
- 状态目录不刷新（无迁移候选，catalog 保持 33/5/683）；登记 prod-only 400。
- 映射 283 → 284；inventory / queue 随之刷新。
