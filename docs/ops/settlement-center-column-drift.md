# settlement_center 明细快照列名漂移（结案 2026-11-25）

## 现象

`svc/finance/src/modules/settlement_center/service.rs` 里 4 段 SQL 全部按「旧列名」写：

| 代码认为的列 | 库里真实的列（`finance.reconciliation_item_snapshots`） |
|---|---|
| `reconciliation_id` | `recon_id` |
| `item_type = 'debit'` + `amount` | `debit_amount` |
| `item_type = 'credit'` + `amount` | `credit_amount` |

`match_status / updated_at / tenant_id / deleted_at` 两边一致，`finance.reconciliation_settlement_links.reconciliation_id` 也是真列（未动）。

## 为什么一直没暴露

`settlement_center` 路由在 8099 / 8000 / 8011 上都是 404——模块没挂载，这段 SQL 从未被真实请求打到。表本身 0 行。所以是**待引爆的 500**，不是线上故障。

## 处置

按「代码对齐 D 侧列」的口径改 SQL，不动表结构、不造迁移：

1. 手工核销 UPDATE：`WHERE reconciliation_id = $1` → `WHERE recon_id = $1`
2. 统计 SELECT：`SUM(CASE WHEN item_type='debit' THEN amount END)` → `SUM(debit_amount)`，`credit` 同理
3. 自动对账 UPDATE：`ri.reconciliation_id = r.id` → `ri.recon_id = r.id`；子查询同改；金额相等原则从「单列 amount 相等」改为「debit_amount 与 credit_amount 双列都相等」
4. 汇总 UPDATE：`SELECT reconciliation_id ... GROUP BY reconciliation_id` → `recon_id`；`WHERE r.id = s.reconciliation_id` → `s.recon_id`

## 验证

- 四段 SQL 逐条 `PREPARE` 走真库 schema，`prepare_exit=0`（列/类型全部可解析）
- `cargo check -p topems-finance --lib` 通过
- 绑定参数个数与占位符一致（$1..$5 未增减）

## 仍未做

模块挂载本身没动：路由需要挂到 `svc/server` 或 finance 服务，属于产品/权限决策。挂载当天这段 SQL 已可用。
