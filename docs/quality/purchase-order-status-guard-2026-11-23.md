# B165 · 采购订单状态（2026-11-23）

## 枚举
- `svc/scm/src/modules/purchase_order_status.rs` → `PurchaseOrderStatus`：`draft / pending / approved / rejected / confirmed / cancelled / closed / completed`，默认 `pending`。
  - 前端 `apps/web/src/schemas/scm/purchaseOrder.ts` 的 `draft / pending / approved / confirmed / completed / cancelled` 全部包含。
  - 额外保留 `rejected`：驳回接口会写该值；保留 `closed`：关闭接口会写该值，不能只按前端下拉裁剪。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 列表：`status` 过滤支持空 / `all` 不过滤，非法值返回 400，SQL 只绑定规范值。
- 创建：硬编码 `'pending'` 改为绑定 `PurchaseOrderStatus::DEFAULT`，SQL 占位符同步重排为 `$1..$11`。
- 更新：请求 `status` 先枚举解析；未传时校验存量值，非法值返回 400；SQL 绑定枚举字符串。
- 审批 / 驳回：当前状态与目标状态全部走枚举，SQL 的 `'approved' / 'rejected' / 'pending'` 字面量改为参数绑定。
- 确认 / 取消 / 关闭：通用流转的允许状态与目标状态改为 `PurchaseOrderStatus` 枚举，非法存量状态直接拒绝。

## 本地 DB 应用
文件：`docs/database/purchase-order-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `scm.purchase_orders.status` → `ck_scm_purchase_orders_status_standard`（八值）

存量 65 行全 `draft`，无 NULL，在集合内。执行一次 `'bogus'` UPDATE，被标准约束拦截。

## 刷新结果
- catalog：**344 条状态 CHECK / 5 个 PG ENUM / 379 个无约束状态列**
- 盘点：**227 个 Rust 枚举 / 203 个值 / 59 个不在 DB CHECK / 214 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**70**
- 映射：共 **199 条**

## 门禁
- `cargo clippy -p topems-scm --all-targets -- -D warnings`：PASS
- `cargo test -p topems-scm --lib`：346 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。
