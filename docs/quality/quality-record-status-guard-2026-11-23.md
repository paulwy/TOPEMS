# B191 质量记录状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/mes/src/modules/quality_traceability_status.rs`
- 枚举：`QualityRecordStatus`
- 值集：`pending` / `qualified` / `rejected`
- 默认：`pending`
- 单测：DB 值往返；`pass` / `bogus` 拒绝。

## 读入口绑定

- `list_quality_records` 的 `status` 过滤先经 `from_db_str` 校验；`all` 与空串视为不过滤；非法值 400。
- 列表响应 `quality_status` 兜底统一为枚举默认 `pending`，不再输出原始字符串。
- 当前 `mes.quality_records` 无创建/更新入口，本批收口读边界与响应契约。

## 数据库验证

候选：`docs/database/quality-record-status-check-candidates-2026-11-23.sql`

- `ck_mes_quality_records_quality_status_standard` 以 `NOT VALID` 应用，`convalidated = false`。
- 应用时表 0 行，无需历史归一。
- 新增 `bogus` 行被约束拒绝：`violates check constraint "ck_mes_quality_records_quality_status_standard"`。

## 口径变化

| 项 | B190 | B191 |
| --- | --- | --- |
| 状态 CHECK | 369 | 370 |
| 无约束状态列 | 354 | 353 |
| Rust 枚举 | 252 | 253 |
| Rust 枚举值 | 220 | 220 |
| 不在 DB CHECK 的 Rust 值 | 58 | 58 |
| 前端状态键 | 229 | 229 |
| 前端键不在 DB CHECK | 67 | 67 |
| 色板缺口 | 0 | 0 |
| 缺口队列 | 45 / 58 | 45 / 58 |

## 门禁

- `cargo test -p topems-mes --lib`：412 passed
- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- catalog / inventory `--strict-palette` / queue / 其余固定门禁：通过

## 生产

只读快照未改动；候选仅在本地 `topems` 应用。
