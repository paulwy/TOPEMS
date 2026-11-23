# 生产记录状态守卫（B181）

- 批次：W5-B / B181
- 日期：2026-11-23
- 列：`mes.production_records.status`

## 唯一值源

`svc/mes/src/modules/production_record_status.rs` 的 `ProductionRecordStatus`：

| 值 | 含义 |
| --- | --- |
| `pending` | 待开始 |
| `in_progress` | 进行中（DB 默认） |
| `completed` | 已完成（按完成接口写入时补 end_time） |
| `cancelled` | 已取消 |

与前端 `apps/web/src/schemas/mes/productionRecord.ts` 四项一致。

## 入口绑定

- 列表 `status` 由枚举校验，`all` 与空值视为不过滤，非法值 400。
- 创建硬编码 `'in_progress'` 改为参数 `$8` 并绑定默认值。
- 更新按 `end_time` 是否传入选择 `Completed` / `InProgress`，再以参数 `$7` 写入。
- 完成接口的 `SET status` 与前置条件 `WHERE status` 从字面量改为参数 `$4/$5`，分别绑定 `Completed` / `InProgress`。
- 创建查询从 `query!` 改为运行期 `query_as` + 既有 `ProductionRecordRow`，避免 SQLx 离线缓存漂移。

## 数据库约束

- 约束名：`ck_mes_production_records_status_standard`
- 定义：`CHECK (status = ANY (ARRAY['pending','in_progress','completed','cancelled'])) NOT VALID`
- 本地已应用 `docs/database/mes-production-record-status-check-candidates-2026-11-23.sql`。
- 存量 3 行均为 `in_progress`，合规；对存量行更新为 `bogus` 被该约束拒绝后回滚。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：392 passed
- 生产快照只读，未应用本候选；发布前按窗口 `VALIDATE CONSTRAINT`。
