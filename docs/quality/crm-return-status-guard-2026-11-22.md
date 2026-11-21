# CRM 退换货状态收口（B105）

日期：2026-11-22
范围：`crm.returns.status`、`svc/crm/src/modules/aftersales.rs`、CRM 退换货前端
基线：B104 `34da2b40c`（workspace 修复）之后的 `main`

## 命中问题

退换货同时存在两套状态机，且其中一套会直接触发 DB CHECK：

| 来源 | 状态集合 | 问题 |
|---|---|---|
| spec FSM / `ReturnStage` | pending → accepted → processing → resolving → done，另有 rejected/cancelled | `resolving`、`done` 不在地库 CHECK 允许集合 |
| DB `ck_returns_status_standard` | pending/accepted/approved/rejected/processing/completed/cancelled | 无 resolving/done |
| 前端 `ReturnStatus` | pending/approved/rejected/received/completed/cancelled | `received` 不是 DB 值；`processing`、`accepted` 无标签/色板 |

具体故障：

- `/returns/{id}/resolve` 默认写 `resolving`，被 `ck_returns_status_standard` 以 23514 拒绝，接口 500。
- `/returns/{id}/confirm` 正常结案写 `done`，同样被 23514 拒绝。
- 确认收货写 `processing`，但前端只认 `received`，详情页收货后没有对应操作按钮，无法继续完成。
- 列表 `status` 参数原样拼 SQL，未知值静默返回空集；详情与动作没有状态集合过滤。
- 所有动作先查后改但没有起始态谓词，并发重复审批/收货/完成会双成功或覆盖。

## 收口决策

规范集合直接对齐既有 `ck_returns_status_standard` 七值，不新增 DDL：

`pending / accepted / approved / rejected / processing / completed / cancelled`

历史口径只在读取侧兼容，不进入写入：

- `resolving` → `processing`
- `done` → `completed`
- 前端旧值 `received` → `processing`

新增 `svc/crm/src/modules/return_status.rs`：

- `DB_VALUES`、`DEFAULT = pending`
- `from_db_str` 严格解析规范七值
- `from_read_str` 兼容 resolving/done/received
- `as_db_str`、`is_terminal`
- `can_transition_to` 规范状态机
- `DELETABLE = pending/cancelled`
- `CANCELLABLE = pending/accepted/approved/processing`
- `APPROVABLE_FROM = pending/accepted`
- `PROCESS_FROM = accepted/approved`
- `RESOLVE_FROM = accepted/approved/processing`

状态机：

```
pending  → accepted | approved | rejected | cancelled
accepted → approved | rejected | processing | cancelled
approved → processing | cancelled
processing → completed | rejected | cancelled
completed / rejected / cancelled：终态
```

## 写入口

- 创建：INSERT 的 `status` 由字面量 `'pending'` 改为绑定 `ReturnStatus::DEFAULT`。
- 列表：`status` 参数走 `from_read_str`，未知 400；SELECT 与 COUNT 同时加
  `status = ANY(DB_VALUES)` 和 `deleted_at IS NULL`，列表 SELECT 补齐原先漏掉的软删过滤。
- 详情：加 `status = ANY(DB_VALUES)`，集合外行 404。
- 更新：预读加状态集合过滤，UPDATE 加 `status = ANY(DB_VALUES)` 与软删谓词，0 行 409，不再把并发覆盖当成功。
- 删除：只允许 pending/cancelled，UPDATE 加 `status = ANY(DELETABLE)`，0 行 409；修掉原先先 commit 再判断 0 行的问题。
- 审批/拒绝：允许 pending/accepted；目标态改绑定枚举，UPDATE 加 `status = ANY(APPROVABLE_FROM)`，0 行 409。
- 受理：pending → accepted，目标态与起始态均绑定枚举，0 行 409。
- 确认收货：approved → processing，目标态绑定枚举，起始态 `approved`，0 行 409。
- 处理：accepted/approved → processing，目标态绑定枚举，起始态 `ANY(PROCESS_FROM)`，0 行 409。
- 方案确认：`resolving` 收敛为 `processing`，允许 accepted/approved/processing 重入，首次写 `resolved_at`，0 行 409。
- 完成：processing → completed，目标态绑定枚举，起始态 `processing`，0 行 409。
- 取消：非终态均可取消，目标态绑定枚举，起始态 `ANY(CANCELLABLE)`，0 行 409。
- 结案：processing → completed/rejected；`completed_at` 只在 completed 分支写，rejected 不再错误写完成时间；主状态谓词为 `processing`，0 行 409。
- 财务/库存联动状态查询：存在性检查也加 `status = ANY(DB_VALUES)`。

所有动作的 0 行分支都在写入前/写入 0 行时返回 409，不触发 `txn-write-non2xx`。

## 前端

- `ReturnStatus` 收敛为规范七值，删除 `received`。
- 详情页标签/色板补 `accepted`、`processing`，补上原先缺失的中文 `status_approved`。
- 时间线：pending → approved → processing → completed；accepted 兼容态按 pending 展示进度。
- 操作按钮：
  - pending/accepted：审批通过、拒绝
  - approved：确认收货
  - processing：完成
  - pending/accepted/approved/processing：取消
  - pending/cancelled：删除
- 列表 schema 的状态选项、色板、筛选同步七值；`shared.return` 补 accepted/processing 中英文标签。

## 本地验证

- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：505 passed
- Web `typecheck`：通过
- 既有约束逐值演练（本地 `topems` 库，事务内）：
  - 七个规范值各插 1 行，`INSERT 0 7`，`count = 7`
  - 插入 `bogus` 触发 `ck_returns_status_standard` 23514
  - 两次均 `ROLLBACK`，`RTN-CK-%` 残留 0
- 现有数据：`crm.returns` 282 行，全部 `pending`，未被触碰。

## 生产预检

本批不需要新增 CHECK，因为规范集合就是既有约束。上线前只需只读预检：

`docs/database/crm-return-status-precheck-2026-11-22.sql`

- 检查是否存在七值之外的存量：预期 0。
- 检查约束定义是否仍为七值：若生产约束被改宽/改窄，需要先按候选流程重建后再发布代码。
- 历史 `resolving`/`done` 在严格 CHECK 下不可能落库；若生产历史约束较松且存在这两类值，需先迁移为 `processing`/`completed`。

## 盘点

- Rust 枚举 180（+ReturnStatus）
- 唯一值 178（七值均已在地库 CHECK，未新增缺口）
- 不在 DB CHECK 139
- 前端键 193，色板缺口 0
- 队列 124 枚举 / 139 值，resolved_enums 92
- 同批登记 B101～B103 的候选映射，队列 resolved 90→92；B103 CRM BillingStatus 因四值已被其他表覆盖而不产生独立缺口行，映射仍保留候选路径。

## 未做

- 没有把 CRM Billing 的 `ck_billing_records_status_standard` 替换落地；仍等生产窗口。
- 没有新增退换货独立“方案确认”状态；按当前 DB 能力收敛进 processing，若产品要求可观测“方案已确认”，需另立字段或扩 CHECK。
- 没有对 282 行 pending 做任何数据迁移。
- 没有启动统一入口做接口级冒烟；动作路径以编译、单测、SQL 约束演练和静态门禁验证。
