# 对账订单/明细状态单一源（2026-11-21）

## 结论

`finance.reconcile_orders.status` 与 `finance.reconcile_items.status` 原本是自由文本：

- 手工建单写 `pending`，自动对账写 `draft`，同一接口族两套初始值；
- 确认、标记争议不校验起始状态，已确认/已取消的订单仍可被改成其它状态；
- 明细状态 `status` 接受任意字符串，且已确认订单的明细仍可修改，会改动已锁定金额。

现统一为两组唯一集合：

- 订单：`draft / pending / confirmed / disputed / cancelled`，与前端 `reconciliation.ts` 联合类型一致；
- 明细：`unmatched / matched / disputed`，与前端 `ReconciliationItem.status` 一致。

## 状态机

- 建单（手工与自动）：`draft`；
- 确认：`draft` / `pending` / `disputed` → `confirmed`；
- 标记争议：`draft` / `pending` / `disputed` → `disputed`；
- 取消：非 `confirmed` / `cancelled` → `cancelled`；
- `confirmed` / `cancelled` 为终态，拒绝再次确认、争议或取消；
- 明细只能在 `draft` / `pending` / `disputed` 订单下修改。

## 改动

- 新增 `svc/finance/src/modules/reconcile_status.rs`：`ReconcileOrderStatus`、`ReconcileItemStatus`、归一函数、4 个单测。
- `reconcile_orders.rs`：
  - 手工建单由 `pending` 改为 `draft`，与自动对账一致；
  - 两处 INSERT 状态改为参数绑定，不再写字面量；
  - 列表 `status` 过滤校验枚举，非法值 400；
  - `confirm` / `dispute` 增加原子状态谓词；命中 0 行时区分 404 与 409，不再对终态订单假成功；
  - `update_reconcile_item` 校验明细状态，且已确认/已取消订单的明细不可修改；
  - 非法状态返回 400，错误文案列出允许值。
- 前端类型无需改动，原本已是上述两组值；后续若新增状态，需同步 `apps/web/src/api/finance/reconciliation.ts`。

## 验证

- `cargo test -p topems-finance --lib modules::reconcile_status`：4 passed。
- `cargo clippy -p topems-finance --lib -- -D warnings`：通过。
- 本地库事务回滚验证：
  - `draft` 建单成功；
  - `draft → confirmed` 更新 1 行；
  - 已确认后再 `disputed` / `cancelled` 均更新 0 行；
  - 已确认订单下明细更新 0 行。
- 本地 `reconcile_orders` / `reconcile_items` 均 0 行，未做数据迁移。

## DB CHECK（待生产窗口）

本地可直接加；生产先盘点存量状态，确认无五值/三值以外的业务值，再加 `NOT VALID`，核对后 `VALIDATE`。

```sql
ALTER TABLE finance.reconcile_orders
  ADD CONSTRAINT reconcile_orders_status_check
  CHECK (status IN ('draft','pending','confirmed','disputed','cancelled')) NOT VALID;

ALTER TABLE finance.reconcile_items
  ADD CONSTRAINT reconcile_items_status_check
  CHECK (status IN ('unmatched','matched','disputed')) NOT VALID;

-- 存量核对（先看分布，再决定映射；不要盲目归一）
SELECT status, count(*) FROM finance.reconcile_orders GROUP BY 1 ORDER BY 2 DESC;
SELECT status, count(*) FROM finance.reconcile_items GROUP BY 1 ORDER BY 2 DESC;

ALTER TABLE finance.reconcile_orders VALIDATE CONSTRAINT reconcile_orders_status_check;
ALTER TABLE finance.reconcile_items VALIDATE CONSTRAINT reconcile_items_status_check;
```

生产若存在 `completed`、`settled`、`partial` 等业务值，必须先与财务确认映射，不得直接改成 `confirmed`。

## 回滚

```sql
ALTER TABLE finance.reconcile_orders DROP CONSTRAINT IF EXISTS reconcile_orders_status_check;
ALTER TABLE finance.reconcile_items DROP CONSTRAINT IF EXISTS reconcile_items_status_check;
```

代码回滚到 `af38aac8d` 可恢复旧行为（不推荐：会重新允许终态订单被改写）。
