# B235 · pm.project_risks.status 状态治理

日期：2026-11-23
表列：`pm.project_risks.status`（varchar NOT NULL DEFAULT `'identified'`）
枚举：`svc/pm/src/modules/project_risk_status.rs` → `ProjectRiskStatus`

## 发现的问题

1. **创建风险 INSERT 拼 `'identified'`**：状态字面量直接写在 SQL 里。
2. **更新接口原样入库**：`update_risk` 把 `req.status` 直绑 `status = COALESCE($8, status)`，未知值可落库，且不看来源状态（closed 可改回 identified、identified 可直改 closed 跳过 mitigated）。
3. **审计记录绑定原始入参**：`details` 用的是 `req.status` 原值，别名/大小写与落库值可能不一致。
4. **无 DB CHECK**：任意值可落库；表当前 0 行。

## 改动

- 新增 `ProjectRiskStatus`（3 态）：`DB_VALUES / DEFAULT / as_db_str / from_db_str（含历史别名）/ normalize / parse_filter / can_transition_to（identified→mitigated/closed、mitigated→identified 重开/closed，closed 终态）/ is_terminal / Display / FromStr` + 单测。
- 创建 INSERT 的 `'identified'` 改绑定 `ProjectRiskStatus::DEFAULT`，占位符顺延。
- 新增 `ensure_risk_transition()`：加载当前状态（不存在 404、存量未知值 400、非法流转 400）；更新接口先 `normalize`（未知 400）再校验流转，SQL 改绑 `Option<&'static str>`。
- 审计 `details.status` 改用归一后的 `requested_status`，避免记录原始别名。
- 新增 `ck_project_risks_status_standard`（3 值，NOT VALID），已应用到本地 `topems`；表 0 行，事务内取父项目 + 风险验证：`bogus` 被拒（`violates check constraint`）。

## 门禁

- `cargo fmt --all` / `cargo clippy -p topems-pm --lib --tests -- -D warnings` / `cargo test -p topems-pm --lib`：531 passed。
- 状态目录不刷新（无迁移候选，catalog 保持 33/5/683）；登记 prod-only 403。
- 映射 286 → 287；inventory / queue 随之刷新。
