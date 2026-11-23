# B204 · ERP 生产订单状态护栏证据（2026-11-23）

## 范围

- 表列：`erp.erp_production_orders.status`，`character varying(50) NOT NULL DEFAULT 'pending'`
- 代码：`svc/erp/src/modules/production_order.rs`
- 枚举：`svc/erp/src/modules/production_order_status.rs`（新增，`ProductionOrderStatus`）
- 本地数据：`SELECT count(*)` = 0 行

## 值集与依据

| 值 | 含义 | 依据 |
| --- | --- | --- |
| `pending` | 待审批（默认） | DB 默认、创建 SQL 原字面量、删除守卫 |
| `approved` | 已审批，触发下发事件 | `if req.status == "approved"` 分支 |
| `released` | 已下达 MES | 编辑守卫 `IN ('pending','released')` |
| `in_progress` | 生产中（MES 回写） | 模块内既有单测 payload |
| `completed` | 已完工（MES 回写） | 模块内既有单测 payload |
| `cancelled` | 已取消 | 删除守卫、`canceled` 作为别名归一 |

不含 `paused` / `closed`：这两个值只存在于 MES 自己的执行态
（`apps/web/src/schemas/mes/productionOrder.ts` 与 `mes.production_orders`），
ERP 这一列不承接。前端色板 6 个键在 `apps/web/src/utils/status.ts` 均已存在，无缺口。

## 修掉的缺陷

1. **状态流转接口可写任意串**：`update_production_status` 原来 `SET status = $2` 直接 `.bind(&req.status)`，
   任何字符串都能落库，且 `if req.status == "approved"` 用自由串比较决定是否发布
   `ErpProductionOrderDispatched`（误触发 / 该发不发）。现先 `from_db_str` 严格校验，非法 400，
   事件判断改用 `next == ProductionOrderStatus::Approved`。
2. **进度更新与 MES 回写透传**：`update_production_progress` 和 `receive_mes_progress` 的
   `status = COALESCE($3, status)` 原样绑定 `&req.status`（`Option<String>`）。现走同一
   `parse_optional_status`（None / 空串 => 不改变状态；未知 => 400），`.bind` 只传枚举 `as_db_str()`。
3. **列表过滤静默查空**：`status_filter = params.status.clone()` 原样绑定到两条查询
   （列表 + count），非法值查空、空串当真实值。现 `parse_filter`（None / 空串 / `all` => 不过滤，
   未知 => 400）。
4. **守卫元组字面量**：删除 `status IN ('pending','cancelled')`、编辑
   `status IN ('pending','released')` 改为 `status = ANY($n)` 并绑定枚举值，词表变化时不再漏改。
5. **创建硬编码**：`INSERT ... 0, 'pending', $6` 改为 `$17` 参数绑 `ProductionOrderStatus::DEFAULT`。
6. **响应出口**：7 处 `ApiResponse::success`（列表、创建、详情、更新、进度、状态、MES 同步）
   统一经 `normalize_order`，未知历史值回落 `pending`，避免把脏串透给前端。

## 本地验证

```sql
-- 应用候选（NOT VALID，仅约束新写入）
ALTER TABLE erp.erp_production_orders ADD CONSTRAINT ck_erp_erp_production_orders_status_standard
  CHECK (status IS NULL OR status IN ('pending','approved','released','in_progress','completed','cancelled')) NOT VALID;
```

- 执行结果：`ALTER TABLE` / `COMMENT` 成功，`convalidated = f`。
- 负向验证：插入 `status='bogus'` 被约束拒绝（`new row violates check constraint`），事务回滚，表仍 0 行。
  `bogus` 走 API 时由 `from_db_str` 在落库前返回 400。
- 生产快照 `topems_prod_verify_20261106` 只读，未应用；正式发布需按窗口逐条执行并在业务确认后 `VALIDATE`。

## 刷新与门禁

- catalog：**388 条状态 CHECK / 5 个 PG ENUM / 335 个无约束列**
- 盘点：**271 个 Rust 枚举 / 226 值 / 58 不在 DB CHECK / 235 前端键 / 色板缺口 0**
- 缺口队列：**45 枚举 / 58 值，全部 internal_state**
- 前端键不在 DB CHECK：**67**
- 映射新增 1 条：`production_order.rs#ProductionOrderStatus -> erp.erp_production_orders.status`

## 已知取舍

ERP 侧生产订单只有「审批 + 下发」两段，MES 回写的 `in_progress` / `completed` 也写回本列，
因此本枚举跨两侧词表取并集。若后续 MES 与 ERP 拆分进度字段（如独立 `execution_status`），
本列应收敛回 `pending / approved / released / cancelled` 四值，候选约束同步收紧。
