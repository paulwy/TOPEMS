# finance 差异调整状态单一源（W5-B / B16）

- 日期：2026-11-21
- 范围：`svc/finance/src/modules/settlement_center/service.rs`、`handlers.rs`、`settlement_center_status.rs`、`finance.difference_adjustments`
- 结论：差异调整三态 `pending/approved/rejected` 固定到 `DifferenceAdjustmentStatus`；创建 / 审批 / 拒绝写库全部绑定枚举；列表状态过滤在 handler 前置校验，非法 400。

## 1. 缺陷

| 位置 | 缺陷 | 后果 |
| --- | --- | --- |
| `create_difference` | INSERT 写 `'pending'` 字面量 | 枚举与 SQL 漂移 |
| `approve_difference` / `reject_difference` | 写 `'approved'` / `'rejected'` 与谓词 `'pending'` 字面量 | 同上 |
| `list_differences` handler | `query.status` 不校验，任意字符串直落 SQL | 非法状态静默返回空列表，调用方无法发现拼写错误 |
| 状态定义 | 无独立枚举，三态散落在三个 SQL 中 | 后续新增状态无单一源 |

审批 / 拒绝的“仅 pending 可操作”谓词原本已有，本次保留并改为枚举绑定。

## 2. 唯一状态集合

| 状态 | 含义 | 入口 |
| --- | --- | --- |
| `pending` | 待审批（创建默认） | `POST /differences` |
| `approved` | 已批准 | `POST /differences/{id}/approve`，仅 `pending` 可进入 |
| `rejected` | 已拒绝 | `POST /differences/{id}/reject`，仅 `pending` 可进入 |

## 3. 改动

- `settlement_center_status.rs` 新增 `DifferenceAdjustmentStatus`：`ALL: [Self; 3]`、`as_str`、`Display`、`FromStr`（`trim` 严格匹配，未知返回 `Err`）。
- `create_difference`：INSERT 状态改 `$10`，绑定 `Pending`，`remark/created_by/created_at` 顺延 `$11/$12/$13`。
- `approve_difference`：`SET status = $4 ... AND status = $5`，绑定 `Approved` / `Pending`，返回 `Option`，0 行仍由 handler 返回 400“不存在或状态不允许”。
- `reject_difference`：`SET status = $4 ... AND status = $5`，绑定 `Rejected` / `Pending`。
- `list_differences` handler：`query.status` 非空时 `parse::<DifferenceAdjustmentStatus>()`，失败返回 `ValidationFailed` 400，文案列 `pending/approved/rejected`。
- 新增单测 `difference_values_roundtrip`，覆盖三值往返与未知 / 大小写拒绝。

## 4. 验证

- `cargo test -p topems-finance --lib settlement_center`：20 passed（含新增单测）。
- 本地事务演练（表 0 行，`BEGIN ... ROLLBACK`，RLS `app.rls_system=on`）：
  - 插入 `pending` 差异 1 行；
  - 审批 `pending→approved` 1 行；
  - 重复审批 0 行；
  - 已批准再拒绝 0 行。
- clippy / 全量 finance lib 提交前统一跑。

## 5. 候选 CHECK DDL（未执行）

```sql
ALTER TABLE finance.difference_adjustments
  ADD CONSTRAINT difference_adjustments_status_check
  CHECK (status IN ('pending','approved','rejected')) NOT VALID;
```

上线前盘点：

```sql
SELECT status, count(*) FROM finance.difference_adjustments GROUP BY 1 ORDER BY 1;
```

## 6. 遗留

- 差异调整没有“撤销批准 / 重新打开”入口；`approved` / `rejected` 为终态。
- `get_statistics` 中 `WHERE status = 'pending'` 仍是字面量（只读统计，不参与状态迁移）；如需完全去字面量可后续改为绑定参数。
- 生产表行数与状态分布未知（本地 0 行）。
