# B149 · 状态候选本地落地清尾

日期：2026-11-22

## 背景

B148 已把 W5-B 枚举队列清零，但本地库仍有一批更早的状态候选只生成、未实际应用：WMS B106/B109/B110/B112～B117、B120/B121/B123～B126，CRM B127/B128/B131/B132，以及 SRM 供应商合同和 CRM 合同/商机候选。本批统一在本地 `topems` 实际应用并核验。

## 本地应用

共执行 21 份候选 DDL，并补 3 条单条约束：

- WMS：slotting、盘点差异、出库执行三列、盘点调整、盘点审批、盘点明细质量、批次、入库、出库、补货订单/明细/建议、序列号、调拨、波次、库位。
- CRM：销售预测、交互记录、联系人审批、客户审批。
- SRM：供应商合同。
- 单条约束：`stock_takes.status`（B113 候选与已存在的审批约束重复，单独补 status）、`crm.contracts` 与 `crm.opportunities`（候选文件原为演练脚本，本批去掉测试 INSERT/ROLLBACK 后正式建约束）。

关键替换：

- `wms.batches` 旧 VALID 错误 CHECK `active/inactive/archived` 已替换为 `in_stock/reserved/out_stock/frozen/scrapped`，并新增质量状态四值约束。
- `wms.stock_take_items` 旧 VALID 错误 CHECK `active/inactive/archived` 已替换为 `pending/completed`，质量状态补三值。
- `wms.replenishment_orders` 273 行 `active` 已按候选归一为 `pending`。
- 其余表未改数据；`crm.interactions` 保留 1 行 `in_progress`，`crm.customers` 301 行、`crm.contacts` 6 行仍全 `none`。

## 核验

- 候选中的 64 个 canonical `ck_*` 标准约束已全部在本地存在：64/64，缺失 0。
- 本批新建/替换的约束均为 `NOT VALID`，`convalidated=false`；新写入立即受约束，存量不阻塞。
- 相关 NOT NULL 列无 NULL：出库三阶段、盘点主/明细、销售预测/交互状态均为 0 条 NULL。
- 状态队列仍 144 枚举 / 152 值、`resolved_enums=144`；盘点仍 208/191/152/206、色板缺口 0。
- 本批为本地数据库变更，无代码改动；生产快照 `topems_prod_verify_20261106` 保持只读，未应用。正式发布需逐条执行候选并 `VALIDATE`。

## 备注

- `wms-stock-take-status-check-candidates-2026-11-22.sql` 同时包含已存在的审批约束，直接整份执行会重复；本批只补其 `ck_stock_takes_status_standard`，审批约束沿用 B125 已应用版本。
- 合同/商机候选原文件自带非法样例 INSERT 与 `ROLLBACK`，属于本地演练脚本；本批只提取并正式建立约束，不执行样例写入。
