# WMS 补货订单状态收口（B117）

- 日期：2026-11-22
- 范围：`wms.replenishment_orders.status`
- 结论：状态收敛为 `pending / confirmed / completed` 三值；历史 `active` 统一映射/归并为 `pending`；创建响应不再谎报 active；列表状态筛选真正生效；通用编辑不能再直接改状态，确认与完成只接受各自起始态。

## 状态集合

```
pending → confirmed → completed
```

默认 `pending`，`completed` 为终态。历史 `active` 是 B37 之前创建订单误写的初始态，语义与 `pending` 相同：读侧投影为 `pending`，确认动作接受 `active`，候选 DDL 上线时一次性归并。

## 本批发现并修掉的问题

1. **创建写 `pending`，响应却返回 `active`**：DB 与接口返回不一致，前端拿到 active 后没有确认按钮，用户以为创建成了另一种状态。现在响应返回 `pending`。
2. **273 行历史 `active` 永远无法确认**：确认谓词只认 `pending`，本地全部 273 行都是 `active`，这批订单在 UI 上既没有确认按钮，即使直接调接口也 0 行。现在确认接受 `pending | active`，列表/详情把 `active` 投影为 `pending`，候选 SQL 批量归并为 `pending`。
3. **列表忽略 `status` 与 `search` 参数**：前端筛选和搜索框都在传，后端完全没用，用户看到的是全量数据。现在两个参数都生效，状态严格解析，非法 400；旧 `active` 通过读别名参与过滤。
4. **列表 SELECT 没有 `deleted_at IS NULL`，COUNT 却有**：已删除订单会出现在列表里，但总数不算它，分页与计数自相矛盾。现在 SELECT/COUNT 口径一致，并补租户过滤。
5. **详情不过滤软删、不投影旧状态**：已删订单仍可打开，`active` 原样漏给前端。现在补软删、租户与规范集合过滤，状态投影为三值。
6. **通用 PUT 可直接写 `status`**：`pending` 可以一步改成 `completed`，绕过确认；且没有软删与租户过滤。现在状态字段只允许传 `pending`（等同不变），传其他值 400；SQL 只允许编辑 `pending / active` 且把旧 `active` 归一为 `pending`；0 行 409。
7. **删除不限制状态，且硬删明细**：已确认/已完成订单也能删，明细被物理删除，无法追溯。现在只允许删除 `pending / active`；明细改为软删；0 行 409。
8. **确认/完成只按 id 更新，无租户与软删条件，失败返回 404**：跨租户依赖 RLS 兜底、已删订单仍可能命中、并发下 404 与 409 语义混乱。现在两动作都带租户与软删过滤，并统一返回 409。
9. **明细列表不过滤软删**：订单软删后明细仍会被单独列出。现在明细查询补 `deleted_at IS NULL`。

## 代码

- `svc/wms/src/modules/smart_replenishment/status.rs`：
  - `ReplenishmentOrderStatus` 增加 `from_read_str(active)=Pending`、`can_transition_to`（pending→confirmed→completed）与迁移矩阵单测。
  - `confirm_from()` 接受 `pending | active`。
- `svc/wms/src/modules/smart_replenishment/orders.rs`：列表、详情、创建响应、更新、删除、明细、确认、完成全部收口。
- 前端 `apps/web/src/schemas/wms/replenishment.ts`：订单状态选项、默认值、色板、标签、筛选从六个幽灵值收敛为三值（去掉 `draft / in_progress / cancelled`）。
- 前端 `apps/web/src/components/wms/ReplenishmentPage.tsx`：完成按钮只对 `confirmed` 展示，去掉不存在的 `in_progress`。

## 本地事务演练

本地 `wms.replenishment_orders` 273 行全部为 `active`；生产快照 0 行。DDL 与探针在事务内执行，最后回滚。

1. 迁移前：`active = 273`。
2. 执行 `UPDATE status='pending' WHERE status='active'`：`UPDATE 273`，迁移后 `pending = 273`。
3. 建三值 `NOT VALID` CHECK。
4. 合法链路：取一单 `pending → confirmed`（1 行），再 `confirmed → completed`（1 行）。
5. 改回 `active`：触发 `ERROR 23514`，被 CHECK 拦下。
6. 最终事务内分布：`pending 272 / completed 1`。
7. 回滚后：恢复 `active = 273`，约束计数 0。

## 验证

- `cargo fmt --all`
- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo test -p topems-wms --lib`：580 passed（B116 为 579，新增 1 个迁移矩阵单测）

## 后续

- 候选 DDL 含数据归并，生产执行需窗口；窗口内先跑 SQL 头部两条预检，顺序为改默认、归并 active、再加 `NOT VALID` CHECK。
- 前端已移除 `draft / in_progress / cancelled`，但这三个值没有对应业务动作；若后续要做取消或执行中，需要新增端点与库存/建议联动，不能只加回选项。
- `wms.replenishment_order_items.status` 仍是自由文本，当前只有创建写入 `pending`，没有流转端点，留待明细状态批次。
- 补货建议 `wms.replenishment_suggestions.status`（draft/active/confirmed，7332 行）本批未动，仍是下一批候选。
