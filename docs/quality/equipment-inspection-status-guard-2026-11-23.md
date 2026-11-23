# B190 设备点检状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/mes/src/modules/equipment_inspection_status.rs`
- 枚举：`EquipmentInspectionStatus`
- 值集：`normal` / `abnormal`
- 默认：`normal`
- 单测：DB 值往返；`pending` / `bogus` 拒绝。

## 写入口绑定

- `create_inspection`：`status` 缺省取 `EquipmentInspectionStatus::DEFAULT`；非法值返回 400（允许值 `normal/abnormal`）；`INSERT` 由透传原始字符串改为 `status.as_db_str()` 绑定。
- 列表与创建响应：状态兜底统一经 `from_db_str` 解析，未知存量回落到 `normal`。
- 无独立状态更新入口；点检状态只在创建时确定。

## 前端对齐

- `apps/web/src/utils/status.ts`：全局色板补 `abnormal: 'error'`，`normal` 保持 `success`。
- 无点检专用列表/表单组件引用该状态列。

## 数据库验证

候选：`docs/database/equipment-inspection-status-check-candidates-2026-11-23.sql`

- `ck_mes_equipment_inspections_status_standard` 以 `NOT VALID` 应用，`convalidated = false`。
- 应用时 `mes.equipment_inspections` 为 0 行，无需历史归一。
- 新增 `bogus` 行被约束拒绝：`violates check constraint "ck_mes_equipment_inspections_status_standard"`。

## 口径变化

| 项 | B189 | B190 |
| --- | --- | --- |
| 状态 CHECK | 368 | 369 |
| 无约束状态列 | 355 | 354 |
| Rust 枚举 | 251 | 252 |
| Rust 枚举值 | 219 | 220 |
| 不在 DB CHECK 的 Rust 值 | 59 | 58 |
| 前端状态键 | 228 | 229 |
| 前端键不在 DB CHECK | 68 | 67 |
| 色板缺口 | 0 | 0 |
| 缺口队列 | 45 / 59 | 45 / 58 |

## 门禁

- `cargo test -p topems-mes --lib`：410 passed
- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- catalog / inventory `--strict-palette` / queue / 其余固定门禁：通过

## 生产

只读快照未改动；候选仅在本地 `topems` 应用。
