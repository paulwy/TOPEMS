-- ============================================================
-- 20261127150000: mes.production_lines 车间外键改为「租户内复合外键」（来源重建）
--
-- 背景（2026-11-27 排查结论）：
--   本机 dev 账本存在 `20261127130000 | mes production line workshop tenant fk`（success=t），
--   其效果是 mes.production_lines 的车间外键由单列 `(workshop_id)` 改为复合
--   `(workshop_id, tenant_id) REFERENCES mes.workshops(id, tenant_id)`；但该文件未提交即
--   从工作区撤回（origin / checksums / manifest 均无登记）→ 又一条「有结构、无来源」的
--   orphan，新库 / drill / prod 都重建不出这条租户内复合外键。
--
-- 处置：本文件以幂等 DDL 复刻该效果，作为可重放来源：
--   1) 若 `mes.workshops` 缺少 `(id, tenant_id)` 唯一索引 → 先建（由 20261127110000 提供，
--      这里做兜底守卫，缺则补）；
--   2) 若复合外键不存在 → 建 `production_lines_workshop_tenant_fkey`；
--   3) 若单列外键 `production_lines_workshop_id_fkey` 仍存在 → 删除（避免双份车间外键口径不一）；
--   4) 收尾断言：复合外键在位、单列外键不存在。
--
-- 前置核查（2026-11-27）：dev / prod 的 mes.production_lines 均 0 行、workshop_id 全 NULL，
--   建复合外键零校验冲突。
-- 幂等：全部走 to_regclass / pg_constraint / pg_indexes 存在性守卫。
-- 事务：文件内不含 BEGIN/COMMIT（由迁移执行器包裹）。
-- 回滚：database/rollback/20261127150000_mes_production_lines_workshop_tenant_fk.rollback.sql
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

DO $mig$
BEGIN
  IF to_regclass('mes.production_lines') IS NULL OR to_regclass('mes.workshops') IS NULL THEN
    RAISE NOTICE 'skip: mes.production_lines / mes.workshops 不存在';
    RETURN;
  END IF;

  -- (1) 兜底：复合外键所需的 (id, tenant_id) 唯一索引
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'mes' AND tablename = 'workshops' AND indexname = 'workshops_id_tenant_key'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS workshops_id_tenant_key ON mes.workshops (id, tenant_id);
    RAISE NOTICE 'created: mes.workshops (id, tenant_id) unique index';
  END IF;

  -- (2) 复合外键
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'mes.production_lines'::regclass
      AND conname = 'production_lines_workshop_tenant_fkey'
  ) THEN
    ALTER TABLE mes.production_lines
      ADD CONSTRAINT production_lines_workshop_tenant_fkey
      FOREIGN KEY (workshop_id, tenant_id) REFERENCES mes.workshops (id, tenant_id);
    RAISE NOTICE 'created: production_lines_workshop_tenant_fkey (workshop_id, tenant_id)';
  ELSE
    RAISE NOTICE 'skip: production_lines_workshop_tenant_fkey 已存在';
  END IF;

  -- (3) 单列外键让位
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'mes.production_lines'::regclass
      AND conname = 'production_lines_workshop_id_fkey'
  ) THEN
    ALTER TABLE mes.production_lines DROP CONSTRAINT IF EXISTS production_lines_workshop_id_fkey;
    RAISE NOTICE 'dropped: production_lines_workshop_id_fkey（单列口径，由复合外键替代）';
  END IF;
END
$mig$;

-- (4) 收尾断言
DO $mig$
DECLARE
  v_bad text := NULL;
BEGIN
  IF to_regclass('mes.production_lines') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'mes.production_lines'::regclass
      AND conname = 'production_lines_workshop_tenant_fkey'
  ) THEN
    v_bad := concat_ws(', ', v_bad, '缺少复合外键 production_lines_workshop_tenant_fkey');
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'mes.production_lines'::regclass
      AND conname = 'production_lines_workshop_id_fkey'
  ) THEN
    v_bad := concat_ws(', ', v_bad, '单列外键 production_lines_workshop_id_fkey 仍存在');
  END IF;

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'production_lines 车间外键收敛未完成：%', v_bad;
  END IF;
END
$mig$;
