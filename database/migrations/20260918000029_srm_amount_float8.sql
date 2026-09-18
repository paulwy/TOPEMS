-- TOPEMS database migration 20260918000029
-- srm 金额列 numeric → double precision：代码模型为 f64（sqlx 严格类型，f64 不兼容 NUMERIC 导致
-- quotation/bidding 的 list & create 全部 500）。numeric 转 double precision 数据无损。
-- 幂等：ALTER COLUMN TYPE 重复执行无副作用。

ALTER TABLE srm.quotations ALTER COLUMN total_amount TYPE double precision;
ALTER TABLE srm.biddings ALTER COLUMN budget_amount TYPE double precision;
ALTER TABLE srm.biddings ALTER COLUMN winner_amount TYPE double precision;
