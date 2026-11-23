# B246 · `ehs.qa_ehs_hazardous_materials.status` 状态守卫（2026-11-23）

## 结论

`ehs.qa_ehs_hazardous_materials.status` 已收敛到唯一 Rust 枚举 `HazardousMaterialStatus`
（`active` / `inactive` / `restricted` / `archived`，默认 `active`）；
创建、更新、前端类型与数据库 CHECK 共用同一值集，非法值返回 400，
旧约束中只有 `archived`、前端契约中只有 `restricted` 的三方分裂已消除。

## 修复的真实缺陷

1. **DB / 前端 / 统计三方值集分裂**：
   - 既有 `ck_qa_ehs_hazardous_materials_status_standard` 只允许 `active/inactive/archived`；
   - 前端 `HazardousMaterial.status` 契约是 `active/inactive/restricted`；
   - 后端统计查询 `status='expired'`，而 `expired` 既不在 DB 也不在前端。
   现统一为四态 `active/inactive/restricted/archived`，并替换旧约束。
2. **创建默认值硬编码 `"active"`**：改为绑定 `HazardousMaterialStatus::DEFAULT`。
3. **更新接口原样落库**：动态拼接 `status = $N` 且不校验；现先解析枚举，非法值返回 400。
4. **统计查询使用非法状态 `expired`**：危险品主表没有有效期字段，该查询永远为 0；现固定为 0 并注明“有效期模型未落地”，不再用非法状态伪装统计。
5. **前端类型缺 `archived`、色板缺 `restricted`**：类型补齐四态，色板补 `restricted: warning`。

## 状态语义

- 四个值都是运营态，允许互相调整（启用、停用、限制使用、归档），没有不可逆终态。
- 更新只校验“目标值合法 + 当前值合法”，不阻止业务回退。

## 数据库

- 旧约束：`ehs.qa_ehs_hazardous_materials.ck_qa_ehs_hazardous_materials_status_standard`（validated，`active/inactive/archived`）已在本地 DROP。
- 新约束：`ehs.qa_ehs_hazardous_materials.ck_qa_ehs_hazardous_materials_status_lifecycle_standard`
- 定义：`CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','restricted','archived'])) NOT VALID`
- 本地 `topems`：已真实应用，`convalidated=false`；应用前 39 行，全部 `active`，合法。
  - 事务内探针 `status='bogus'`：`violates check constraint "ck_qa_ehs_hazardous_materials_status_lifecycle_standard"`。
  - 事务内探针 `status='restricted'`：写入成功后回滚。
- 参考库仍保留旧约束，新约束不存在；已登记 `prod-only-status-checks-2026-11-23.json`（第 414 条，`ehs` schema）。
- 部署时必须先 DROP 旧约束再 ADD 新约束，否则 `restricted` 仍会被旧 CHECK 拒绝。

## 门禁

- `cargo fmt --all --check`
- `cargo clippy -p topems-ehs --all-targets -- -D warnings`
- `cargo test -p topems-ehs --lib`
- `dump-status-checks.mjs --check`
- `dump-status-code-inventory.mjs --check --strict-palette`
- `status-db-check-queue.mjs --check`
- mappings / prod-only
- request-txn / scope-api / txn-2xx、glossary、i18n 7-in-1、前端 `typecheck`

结果（2026-11-23 本地实测）：

- `cargo fmt --all --check`：PASS
- `cargo clippy -p topems-ehs --all-targets -- -D warnings`：PASS
- `cargo test -p topems-ehs --lib`：259 passed / 0 failed
- `check-request-txn.mjs`：bare_txn 1650（基线 1651，rd 163→162 可核销）
- `check-scope-api.mjs`：OK，未标记调用与 Db::new 未增加
- `check-txn-write-non2xx.py --changed-only`：OK
- `dump-status-checks.mjs --check`：33 CHECK / 5 ENUM / 683 无约束列
- `dump-status-code-inventory.mjs --check --strict-palette`：312 枚举 / 250 前端键，色板缺口 0
- `status-db-check-queue.mjs --check`：186 枚举 / 194 值分桶一致
- `verify-glossary.cjs --strict`：100% 一致
- `check-openapi-coverage.cjs`：PASS（顺带补齐 B241 漏登记的 `POST /api/qms/audit-plans/{id}/schedule`）
- `check-i18n.cjs --mode=quality --strict`：7-in-1 PASS
- `apps/web npm run typecheck`：PASS
