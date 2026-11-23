# B189 设备主状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/mes/src/modules/equipment_status.rs`
- 枚举：`EquipmentStatus`
- 值集：`idle` / `running` / `maintenance` / `fault` / `scrapped`
- 默认：`idle`
- 单测：`DB_VALUES` 全量往返、`normal` / `available` / `bogus` 拒绝。

## 写入口绑定

- 创建：新增 `status: Option<String>`，缺省取 `EquipmentStatus::DEFAULT`，非法值 400；`INSERT` 由硬编码 `'normal'` 改为 `$5` 绑定枚举。
- 更新：`status` 先经 `from_db_str` 校验，非法值 400，再用 `$5` 绑定。
- 列表过滤：`status` 先校验；`all` 与空串视为不过滤；非法值 400。
- 设备维护：状态流转由硬编码 `'maintenance'` 改为 `$5` 绑定 `EquipmentStatus::Maintenance`。
- 响应兜底：由字符串 `"normal"` 改为 `EquipmentStatus::DEFAULT.as_db_str()`。
- 统计：不再用 `'normal'` 口径，改为按五个枚举值 `COUNT(*) FILTER`；`idle` 不再误取故障数，另补 `fault`。

## 前端对齐

- `apps/web/src/schemas/mes/equipment.ts`：状态下拉、列表色板、筛选补 `scrapped`。
- `apps/web/src/components/mes/EquipmentDetailPage.tsx`：详情标签补 `running` / `fault`，历史 `available` 按 `idle`、`in_use` 按 `running` 展示。
- `apps/web/src/utils/status.ts`：全局色板补 `fault: 'error'`。
- `apps/web/src/i18n/locales/{zh,en}/mes.json`：补设备详情 `status_running` / `status_fault`。

## 数据库验证

候选：`docs/database/equipment-status-check-candidates-2026-11-23.sql`

- 应用前将历史 `available`（10 行）、`normal`（1 行）归一为 `idle`。
- 约束 `ck_mes_equipment_status_standard` 以 `NOT VALID` 应用，`convalidated = false`。
- 应用后 `mes.equipment` 11 行全部为 `idle`。
- 新增 `bogus` 行被约束拒绝：`violates check constraint "ck_mes_equipment_status_standard"`。

## 口径变化

| 项 | B188 | B189 |
| --- | --- | --- |
| 状态 CHECK | 367 | 368 |
| 无约束状态列 | 356 | 355 |
| Rust 枚举 | 250 | 251 |
| Rust 枚举值 | 217 | 219 |
| 不在 DB CHECK 的 Rust 值 | 59 | 59 |
| 前端状态键 | 227 | 228 |
| 前端键不在 DB CHECK | 69 | 68 |
| 色板缺口 | 0 | 0 |
| 缺口队列 | 45 / 59 | 45 / 59 |

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：408 passed
- `check-request-txn` / `check-scope-api` / `check-txn-write-non2xx` / catalog / inventory `--strict-palette` / queue / glossary / i18n / web typecheck：全部通过

## 生产

只读取快照 `topems_prod_verify_20261106` 未改动；候选仅在本地 `topems` 应用，生产需按窗口后续执行。
