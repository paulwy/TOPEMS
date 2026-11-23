-- B203 办公用品状态候选约束（2026-11-23）
--
-- 目标：把 `erp.office_supplies.status` 收敛到唯一枚举
--   `OfficeSupplyStatus` → erp.office_supplies.status
--
-- 现状：列 varchar NOT NULL，DB 默认 `in_stock`，创建也写 `'in_stock'`（一致）。
-- 代码侧此前：更新接口 `req.status.unwrap_or(existing.status)` 直接透传（可写任意串）；
-- 列表 `status` 过滤 `params.status.clone()` 原样绑定（非法值静默查空、空串当真实值查）。
-- 本批改为枚举校验 + 参数绑定；DB 默认与枚举默认一致，无需变更默认、无需回填。
-- 约束以 NOT VALID 应用，生产历史行不做回填校验，只约束后续写入；生产需按窗口单独 VALIDATE。

ALTER TABLE erp.office_supplies
  ADD CONSTRAINT ck_erp_office_supplies_status_standard
  CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued'))
  NOT VALID;
