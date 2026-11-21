# finance v54 审核工作流状态单一源（W5-B / B12）

- 日期：2026-11-21
- 范围：`svc/finance/src/modules/risk_v54.rs`、`finance.finance_v54_review_workflows`
- 结论：审核工作流四态 `pending/in_progress/completed/rejected` 统一到 `ReviewWorkflowStatus`；创建与推进写库不再用字面量；`rejected` / `completed` 不可再推进，未知状态返回 500 而非静默归一到 `pending`。

## 1. 缺陷

| 位置 | 缺陷 | 后果 |
| --- | --- | --- |
| `ReviewWorkflowStatus::from_str` | 未知值静默返回 `Pending` | 脏状态被当作待审核，工作流被重置语义 |
| `create_review_workflow` | INSERT 写 `'pending'` 字面量 | 枚举与 SQL 漂移 |
| `advance_workflow` | 读取工作流后不校验状态，任意状态都进入步骤推进；UPDATE 无状态谓词 | `rejected` 工作流可被推进成 `completed`，`completed` 工作流可反复推进并改写 `steps` |
| `advance_workflow` | 新状态写 `"completed"` / `"in_progress"` 字面量 | 同上 |

## 2. 唯一状态集合

`pending` → `in_progress` → `completed`；`rejected` 为另一终态，仅由拒绝路径写入。

- `pending`：待处理，可推进。
- `in_progress`：推进中，可继续推进。
- `completed`：全部步骤完成，终态，不可再推进。
- `rejected`：已拒绝，终态，不可再推进。

## 3. 改动

- `ReviewWorkflowStatus::ALL: [Self; 4]`，供盘点与错误文案复用。
- `from_str` 改为 `Option<Self>`，`trim` 后严格匹配，未知 / 空串 / 大小写不一致返回 `None`；单测由“未知默认 pending”改为“未知拒绝”。
- `create_review_workflow`：INSERT 状态改 `$5`，绑定 `Pending.as_str()`，后续参数顺延至 `$9`。
- `advance_workflow`：读取后按状态解析——
  - `Pending` / `InProgress`：允许推进；
  - `Completed` / `Rejected`：返回 `sqlx::Error::RowNotFound`（经 `err_resp` 映射 404，避免泄露终态细节）；
  - 未知：返回 `sqlx::Error::Protocol`（500）。
- `advance_workflow` 的新状态改为枚举 `Completed` / `InProgress`，UPDATE 增加 `AND status IN ($6, $7)` 绑定 `Pending` / `InProgress`，0 行时 `fetch_one` 返回 `RowNotFound`。

## 4. 验证

- `cargo test -p topems-finance --lib risk_v54`：40 passed。
- 本地事务演练（表 0 行，`BEGIN ... ROLLBACK`，RLS `app.rls_system=on`）：
  - 插入 `pending` 工作流，`status IN ('pending','in_progress')` 推进 1 行；
  - 重复推进 0 行。
- 全量 finance lib / clippy 在本批提交前统一跑。

## 5. 候选 CHECK DDL（未执行）

```sql
ALTER TABLE finance.finance_v54_review_workflows
  ADD CONSTRAINT finance_v54_review_workflows_status_check
  CHECK (status IN ('pending','in_progress','completed','rejected')) NOT VALID;
```

上线前盘点：

```sql
SELECT status, count(*) FROM finance.finance_v54_review_workflows GROUP BY 1 ORDER BY 1;
```

## 6. 遗留

- `steps` 内部步骤状态仍是 jsonb 自由文本（`pending/in_progress/completed`），不在 DB 约束范围内；若后续要做步骤级状态机，需单独建模。
- 当前无“拒绝工作流”写入口，`rejected` 仅可能来自历史数据或其他服务；本次只保证它不会被推进覆盖。
- 生产表行数与状态分布未知（本地 0 行）。
