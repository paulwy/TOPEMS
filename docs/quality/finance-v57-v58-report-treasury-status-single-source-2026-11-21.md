# finance v57 报表 / v58 资金池划转状态单一源（W5-B / B15）

- 日期：2026-11-21
- 范围：`svc/finance/src/modules/reports_v57.rs`、`svc/finance/src/modules/treasury_v58.rs`、`finance.finance_v57_generated_reports`、`finance.finance_v58_pool_transfers`
- 结论：v57 生成报表四态、v58 资金池划转三态统一到既有枚举；解析改为严格模式，创建状态不再用字面量，列表状态过滤在 handler 前置校验。

## 1. 缺陷

| 位置 | 缺陷 | 后果 |
| --- | --- | --- |
| `ReportStatus::from_str` | 未知值静默回退 `pending` | 脏报表状态被当作待生成 |
| `generate_report` | INSERT 状态写 `'completed'` 字面量 | 枚举与 SQL 漂移 |
| `list_reports_handler` | `status` 参数不校验，任意字符串直落查询 | 非法状态返回空列表而非 400 |
| `TransferStatus::from_str` | 未知值静默回退 `pending` | 脏划转状态被当作待处理 |
| `TransferStatus` | 枚举存在但 `transfer_between_pools` INSERT 写 `'completed'` 字面量 | 枚举未被写路径使用 |
| `get_pool_history` | 只按 pool 过滤，不校验历史状态 | 脏状态原样透出 |

## 2. 唯一状态集合

| 概念 | 枚举 | 取值 | 写入口 |
| --- | --- | --- | --- |
| 生成报表 | `ReportStatus` | `pending` / `generating` / `completed` / `failed` | 当前同步生成直接落 `completed`；异步生成接入后应先用 `pending/generating` |
| 资金池划转 | `TransferStatus` | `pending` / `completed` / `failed` | 当前同步划转直接落 `completed`；异步清算接入后应先用 `pending` |

## 3. 改动

- 两个枚举增加 `ALL`，`from_str` 改为 `Option<Self>`，`trim` 后严格匹配；未知 / 空串 / 大小写不一致返回 `None`。
- `generate_report`：INSERT 状态改 `$8`，绑定 `ReportStatus::Completed`，`format` 顺延 `$9`。
- `list_reports_handler`：`status` 非空时严格校验，非法 400，文案列 `pending/generating/completed/failed`。
- `transfer_between_pools`：INSERT 状态改 `$8`，绑定 `TransferStatus::Completed`，`created_at` 顺延 `$9`。
- 单测由“未知默认值”改为“未知返回 `None`”。

## 4. 验证

- `cargo test -p topems-finance --lib reports_v57`：53 passed。
- `cargo test -p topems-finance --lib treasury_v58`：41 passed。
- `cargo check -p topems-finance`、`cargo fmt`：通过。
- 两张表本地均 0 行；INSERT 占位符数量与绑定顺序已按 SQL 核对，编译期类型检查通过。

## 5. 候选 CHECK DDL（未执行）

```sql
ALTER TABLE finance.finance_v57_generated_reports
  ADD CONSTRAINT finance_v57_generated_reports_status_check
  CHECK (status IN ('pending','generating','completed','failed')) NOT VALID;

ALTER TABLE finance.finance_v58_pool_transfers
  ADD CONSTRAINT finance_v58_pool_transfers_status_check
  CHECK (status IN ('pending','completed','failed')) NOT VALID;
```

上线前盘点：

```sql
SELECT 'report' AS src, status AS val, count(*) FROM finance.finance_v57_generated_reports GROUP BY 1,2
UNION ALL SELECT 'transfer', status, count(*) FROM finance.finance_v58_pool_transfers GROUP BY 1,2
ORDER BY 1,2;
```

## 6. 遗留

- v57 无 `pending/generating/failed` 写入口，当前全部同步生成；若接异步任务，需要补“开始生成”“失败”状态迁移与对应 API。
- v58 无 `pending/failed` 写入口，划转与余额扣减在同一事务内完成；若接银行异步清算，需要把状态机扩展为两阶段。
- `PoolTransfer.status` 仍为 `String`，前端按字符串展示；本次只统一写入口，不改读模型类型。
- 生产两表行数与状态分布未知（本地均 0 行）。
