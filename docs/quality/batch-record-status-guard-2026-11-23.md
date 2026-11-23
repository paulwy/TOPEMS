# B192 生产批次状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/mes/src/modules/batch_record_status.rs`
- 枚举：`BatchRecordStatus`
- 值集：`active` / `completed` / `cancelled`
- 默认：`active`
- 单测：DB 值往返；`archived` / `bogus` 拒绝。

## 读入口绑定

- `backward_traceability` 读 `mes.batch_records.status` 后统一经 `from_db_str` 解析，未知或空值回落 `BatchRecordStatus::DEFAULT`，不再把原始字符串直接放进追溯节点。
- 表可空，NULL 在追溯响应中按 `active` 展示；数据库 CHECK 保留 NULL 合法。

## 数据库验证

候选：`docs/database/batch-record-status-check-candidates-2026-11-23.sql`

- `ck_mes_batch_records_status_standard` 以 `NOT VALID` 应用，`convalidated = false`。
- 条件为 `status IS NULL OR status IN ('active','completed','cancelled')`。
- 应用时表 0 行，无需历史归一。
- 新增 `bogus` 行被约束拒绝：`violates check constraint "ck_mes_batch_records_status_standard"`。

## 口径变化

| 项 | B191 | B192 |
| --- | --- | --- |
| 状态 CHECK | 370 | 371 |
| 无约束状态列 | 353 | 352 |
| Rust 枚举 | 253 | 254 |
| Rust 枚举值 | 220 | 220 |
| 不在 DB CHECK 的 Rust 值 | 58 | 58 |
| 前端状态键 | 229 | 229 |
| 前端键不在 DB CHECK | 67 | 67 |
| 色板缺口 | 0 | 0 |
| 缺口队列 | 45 / 58 | 45 / 58 |

## 门禁

- `cargo test -p topems-mes --lib`：414 passed
- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- catalog / inventory `--strict-palette` / queue / 其余固定门禁：通过

## 生产

只读快照未改动；候选仅在本地 `topems` 应用。
