# B193 设备点检记录状态收敛证据（2026-11-23）

## 唯一枚举

- `svc/mes/src/modules/equipment_inspection_overall_status.rs`
  - `EquipmentInspectionOverallStatus`
  - 值集 `normal` / `abnormal`，默认 `normal`
- `svc/mes/src/modules/equipment_inspection_record_status.rs`
  - `EquipmentInspectionRecordStatus`
  - 值集 `completed` / `needs_repair`，默认 `completed`
- 每个枚举 2 个单测：DB 值往返、未知值拒绝。

## 值集依据

- `overall_status`：`svc/mes/tests/integration_tests.rs` 的设备点检记录用例实际写入 `normal` 与 `abnormal`。
- `status`：同用例写入 `needs_repair`；数据库列默认值为 `completed`。
- 当前 `svc/mes` 无该表读写入口，本批先固定词汇与数据库边界，后续新增入口必须直接引用这两个枚举。

## 数据库验证

候选：`docs/database/equipment-inspection-record-status-check-candidates-2026-11-23.sql`

- `ck_mes_equipment_inspection_records_overall_status_standard`：`overall_status IN ('normal','abnormal')`，`NOT VALID`。
- `ck_mes_equipment_inspection_records_status_standard`：`status IN ('completed','needs_repair')`，`NOT VALID`。
- 两条约束 `convalidated` 均为 `false`；应用时表 0 行。
- `overall_status='bogus'` 新行被第一条约束拒绝；`status='bogus'` 新行被第二条约束拒绝。

## 前端对齐

- `apps/web/src/utils/status.ts` 补 `needs_repair: 'warning'`，`normal` / `abnormal` 已在色板中，缺口 0。

## 口径变化

| 项 | B192 | B193 |
| --- | --- | --- |
| 状态 CHECK | 371 | 373 |
| 无约束状态列 | 352 | 350 |
| Rust 枚举 | 254 | 256 |
| Rust 枚举值 | 220 | 221 |
| 不在 DB CHECK 的 Rust 值 | 58 | 58 |
| 前端状态键 | 229 | 230 |
| 前端键不在 DB CHECK | 67 | 67 |
| 色板缺口 | 0 | 0 |
| 缺口队列 | 45 / 58 | 45 / 58 |

## 门禁

- `cargo test -p topems-mes --lib`：418 passed
- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- catalog / inventory `--strict-palette` / queue / 其余固定门禁：通过

## 生产

只读快照未改动；候选仅在本地 `topems` 应用。
