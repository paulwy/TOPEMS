# B228 · pm.contracts.status 状态治理

日期：2026-11-23
表列：`pm.contracts.status`（varchar NOT NULL DEFAULT `'draft'`）
枚举：`svc/pm/src/modules/contract_status.rs` → `ContractStatus`

## 发现的问题

1. **审批动作不看来源状态**：`submit_contract` / `approve_contract` / `reject_contract` 三条 `UPDATE` 只带 `WHERE id = $N`，draft 可被直接 approve 跳过提交与审批，approved 也可被再次 reject；没有状态机。
2. **三处状态字面量**：`'pending'`、`'approved'`、`'rejected'` 直接拼进 SQL。
3. **更新接口原样入库**：`update_contract` 把 `req.status` 直绑 `status = COALESCE($9, status)`，未知值可落库，也可 draft 直改 completed。
4. **前端值集缺项**：`STATUS_OPTIONS` 只有 6 值（draft/pending/approved/active/completed/cancelled），后端会写 `rejected`，列表显示原始英文且无标签。
5. **无 DB CHECK**：任意值可落库。

## 改动

- 新增 `ContractStatus`（7 态）：`DB_VALUES / DEFAULT / as_db_str / from_db_str（含历史别名）/ normalize / parse_filter / can_transition_to / is_terminal / Display / FromStr` + 单测。
- 状态机：draft→pending/cancelled；pending→approved/rejected/cancelled；approved→active/cancelled；active→completed/cancelled；rejected→draft；同值放行（幂等）。
- 新增 `ensure_contract_transition()`：加载当前状态（不存在 404、存量未知值 400、非法流转 400），三个动作处理器与更新接口统一走该函数；三处 SQL 改参数绑定 `$2`。
- `update_contract` 的 `req.status` 先 `normalize`（未知 400）再校验流转。
- 前端 `STATUS_OPTIONS` 补 `rejected`（标签 `shared.contract.k41`，中英同步）。
- 新增 `ck_contracts_status_standard`（7 值，NOT VALID），已应用到本地 `topems`；表 0 行，事务内造父项目 + 合同验证：`bogus` 被拒（`violates check constraint`）。

## 门禁

- `cargo fmt --all` / `cargo clippy -p topems-pm --lib --tests -- -D warnings` / `cargo test -p topems-pm --lib`：497 passed。
- 状态目录不刷新（无迁移候选，catalog 保持 33/5/683）；登记 prod-only 396。
- 映射 279 → 280；inventory / queue 随之刷新。
