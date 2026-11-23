# B231 · pm.project_expenses.status 状态治理

日期：2026-11-23
表列：`pm.project_expenses.status`（varchar(20) NOT NULL DEFAULT `'pending'`）
枚举：`svc/pm/src/modules/project_expense_status.rs` → `ProjectExpenseStatus`

## 发现的问题

1. **添加费用 INSERT 拼 `'pending'`**：状态字面量直接写在 SQL 里。
2. **`should_approve_expense()` 与状态写入脱节**：判定函数存在，但没有任何调用方，审批结果从未落库。
3. **更新接口原样入库**：`update_expense` 把 `req.status` 直绑 `status = COALESCE($5, status)`，未知值可落库，且不看来源状态（approved 可被改回 pending、rejected 可直改 approved）。
4. **无 DB CHECK**：任意值可落库；表当前 0 行。

## 改动

- 新增 `ProjectExpenseStatus`（3 态）：`DB_VALUES / DEFAULT / as_db_str / from_db_str（含历史别名）/ normalize / parse_filter / can_transition_to（pending→approved/rejected，rejected 可退回 pending 重报；approved 终态）/ is_terminal / Display / FromStr` + 单测。
- 添加费用 INSERT 的 `'pending'` 改绑定 `ProjectExpenseStatus::DEFAULT`。
- 新增 `ensure_expense_transition()`：按 `project_id + id` 加载当前状态（不存在 404、存量未知值 400、非法流转 400）；更新接口先 `normalize`（未知 400）再校验流转，SQL 改绑 `Option<&'static str>`。
- 新增 `ck_project_expenses_status_standard`（3 值，NOT VALID），已应用到本地 `topems`；表 0 行，事务内取父项目 + 费用验证：`bogus` 被拒（`violates check constraint`）。

## 门禁

- `cargo fmt --all` / `cargo clippy -p topems-pm --lib --tests -- -D warnings` / `cargo test -p topems-pm --lib`：511 passed。
- 状态目录不刷新（无迁移候选，catalog 保持 33/5/683）；登记 prod-only 399。
- 映射 282 → 283；inventory / queue 随之刷新。
