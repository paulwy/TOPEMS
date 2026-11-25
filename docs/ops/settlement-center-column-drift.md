# settlement_center 明细快照列名漂移（结案 2026-11-25）

## 现象

`svc/finance/src/modules/settlement_center/service.rs` 里 4 段 SQL 全部按「旧列名」写：

| 代码认为的列 | 库里真实的列（`finance.reconciliation_item_snapshots`） |
|---|---|
| `reconciliation_id` | `recon_id` |
| `item_type = 'debit'` + `amount` | `debit_amount` |
| `item_type = 'credit'` + `amount` | `credit_amount` |

`match_status / updated_at / tenant_id / deleted_at` 两边一致，`finance.reconciliation_settlement_links.reconciliation_id` 也是真列（未动）。

## 路由在哪（上一版文档写错，这里更正）

模块**是挂载的**，只是路径被双重前缀：`svc/server` 的 finance 模块以 `api_prefix=/api/finance` nest，而 `settlement_center/routes.rs` 里写的是绝对路径 `/api/core/settlement-center/...`，于是真实路径是

`/api/finance/api/core/settlement-center/...`

前端 `apiClient.finance` 的 baseURL 也是 `/api/finance`，调用方又写 `/api/core/settlement-center/...`，两层拼起来正好对上，所以列表页是通的。我先前按 `/api/core/settlement-center/...` 直接 curl 得到 404，属于路径判断错误，不是模块缺失。

## 为什么暴露不了：列表能过、写路径直接 500

只读三个接口（reconciliations / settlements / differences）不碰明细快照，实测 200 空列表。真正踩列名的是写路径：

```
POST /api/finance/api/core/settlement-center/auto-reconcile {"period":"2026-11"}
→ 500   日志：column ri.reconciliation_id does not exist at line 3827
```

`reconcile`（手工核销）同理。表 0 行也不影响——解析阶段就报错。

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
- 旧二进制实测：`auto-reconcile` 500 + 日志报 `ri.reconciliation_id does not exist`（复现）
- 新二进制实测：同一请求 200（重建后复验，见下）

## 仍未做

模块挂载本身没动：路由需要挂到 `svc/server` 或 finance 服务，属于产品/权限决策。挂载当天这段 SQL 已可用。
