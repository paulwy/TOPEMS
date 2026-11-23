# B203 办公用品状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/erp/src/modules/office_supply_status.rs`
- 枚举：`OfficeSupplyStatus`
- 值集：`in_stock` / `low_stock` / `out_of_stock` / `discontinued`
- 默认：`in_stock`
- 落库列：`erp.office_supplies.status`（varchar NOT NULL，DB 默认 `in_stock`）

值集对齐前端 `apps/web/src/schemas/erp/officeSupplies.ts` 的下拉、筛选、`statusBadge.colorMap`
与 `labelMap`（同一套 4 值），默认值与创建写入口、DB 默认三方一致，无需变更默认或回填。

单测：4 值往返；`bogus` / `available` 拒绝；`out_stock` 别名归一 `out_of_stock`；
`normalize` 空串与未知值回落 `in_stock`；`parse_filter` 覆盖 `None` / 空白 / `ALL` / 合法 / 非法。

## 代码侧收敛

| 位置 | 收敛前 | 收敛后 |
| --- | --- | --- |
| `list_supplies` | `status_filter = params.status.clone()` 原样绑定（非法值静默查空、空串当真实值查） | `OfficeSupplyStatus::parse_filter` 校验，非法 400，`all` / 空串忽略 |
| `create_supply` | `VALUES (..., 'in_stock', ...)` | 绑 `OfficeSupplyStatus::DEFAULT` |
| `update_supply` | `req.status.unwrap_or(existing.status)` 可写任意串 | 有值时枚举校验、非法 400；无值沿用原值 |
| 响应出口 | 原样返回库内字符串 | 列表分页 + 创建/详情/更新共 4 个出口经 `normalize_supply` 归一 |

## 前端色板补齐

`apps/web/src/utils/status.ts` 全局色板原本只有 `in_stock`，缺 `low_stock` / `out_of_stock` /
`discontinued`（`officeSupplies.ts` 的 `colorMap` 有这三项）。不补会让这三个状态在全局兜底里显示为灰色，
并让 `--strict-palette` 门禁失败。本次按 schema 的语义补：`low_stock: 'warning'`、
`out_of_stock: 'error'`、`discontinued: 'default'`。前端键总数 232 → 235。

## 数据库约束

- 候选：`docs/database/office-supply-status-check-candidates-2026-11-23.sql`
- 约束：`ck_erp_office_supplies_status_standard`，`CHECK (status IN (4 值))`，`NOT VALID`
- 本地应用：`erp.office_supplies` 0 行，`convalidated=false`
- 探针：`status='bogus'` 事务内插入被该约束拒绝，事务回滚，表仍 0 行

## 门禁

- `cargo clippy -p topems-erp --lib --tests -- -D warnings` 通过
- `cargo test -p topems-erp --lib`：897 passed
