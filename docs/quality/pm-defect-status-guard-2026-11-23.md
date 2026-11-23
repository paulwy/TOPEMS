# B234 · pm.defects.status 状态治理

日期：2026-11-23
表列：`pm.defects.status`（text NOT NULL，DB 默认 `'open'`）
枚举：`svc/pm/src/modules/defect_status.rs` → `DefectStatus`

## 发现的问题

1. **创建缺陷 INSERT 拼 `'open'`**：状态字面量直接写在 SQL 里。
2. **`resolved_at` 依赖 SQL 字面量**：`CASE WHEN COALESCE($5, status) = 'resolved'` 硬编码判断，状态改名后需要改 SQL 才会同步。
3. **更新接口原样入库**：`update_defect` 把 `req.status` 直绑 `status = COALESCE($5, status)`，未知值可落库，且不看来源状态（closed 可改回 open、resolved 可退回 in_progress）。
4. **无 DB CHECK**：任意值可落库；表当前 0 行。

## 改动

- 新增 `DefectStatus`（4 态）：`DB_VALUES / DEFAULT / as_db_str / from_db_str（含历史别名）/ normalize / parse_filter / can_transition_to（open→in_progress/resolved/closed、in_progress→resolved/closed、resolved→closed，closed 终态）/ is_terminal / Display / FromStr` + 单测。
- 创建 INSERT 的 `'open'` 改绑定 `DefectStatus::DEFAULT`，占位符顺延。
- 新增 `ensure_defect_transition()`：加载当前状态（不存在 404、存量未知值 400、非法流转 400）；更新接口先 `normalize`（未知 400）再校验流转。
- `resolved_at` 的 SQL 字面量改为布尔参数 `$9`（`is_resolving`，由 `requested_status == Resolved` 计算），`updated_at`/`WHERE` 占位符顺延。
- 新增 `ck_defects_status_standard`（4 值，NOT VALID），已应用到本地 `topems`；表 0 行，事务内取父项目 + 缺陷验证：`bogus` 被拒（`violates check constraint`）。

## 门禁

- `cargo fmt --all` / `cargo clippy -p topems-pm --lib --tests -- -D warnings` / `cargo test -p topems-pm --lib`：526 passed。
- 状态目录不刷新（无迁移候选，catalog 保持 33/5/683）；登记 prod-only 402。
- 映射 285 → 286；inventory / queue 随之刷新。
