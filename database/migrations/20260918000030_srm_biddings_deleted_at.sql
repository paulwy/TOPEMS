-- TOPEMS database migration 20260918000030
-- srm.biddings 补 deleted_at（000028 遗漏——代码 create_bidding 以 deleted_at IS NULL 查重）
-- 幂等：ADD COLUMN IF NOT EXISTS。

ALTER TABLE srm.biddings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
