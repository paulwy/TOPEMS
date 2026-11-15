-- B 类列补齐（1/7）· erp · erp.holidays.date
--
-- 口径：B 类 = prod 缺列、且 HEAD 代码已真实读/写该列（取证门结论见
--   docs/database/column-drift-attribution-2026-11-15.md §4.2.2）。本迁移只做 ADD COLUMN，
--   不建索引、不建约束、不改策略、不含 BEGIN/COMMIT。
--
-- 目标定义（以 dev 现有定义为唯一依据）：
--   erp.holidays.date  date  NOT NULL  （无默认值）
--
-- 证据（取证门已回读，行号直接引用）：
--   读：svc/erp/src/modules/holidays.rs:107-108
--       SELECT COUNT(*) FROM erp.holidays WHERE tenant_id = $1 AND year = $2 AND date = $3 AND kind = $4
--   prod 缺列时的失败方式：该语句在 parse/analyze 阶段即报
--       SQLSTATE 42703 undefined_column（column "date" does not exist），
--       节假日日历查询稳定 500，不是数据层的慢查询或空结果。
--
-- 前置断言：表存在；date 列不存在；表 0 行（dev 定义为 NOT NULL，非 0 行则拒绝直接加 NOT NULL）。
-- 同名对象冲突：本迁移不创建任何索引/约束，故不存在同名对象创建冲突；目标列在 prod 不存在，
--   既有索引/约束不可能引用它（已核 prod：erp.holidays 仅 holidays_pkey(id) 与空表结构）。
-- 后置断言：列存在且形状 = (date, NOT NULL, 无默认)。
--
-- 残余缺列（不在本批，按 §4.2.3/§4.4 另行处置）：prod 的 erp.holidays 还缺 year / kind / name /
--   tenant_id，因此上面第 107-108 行那条 SQL 要端到端可用仍需该批落地；本迁移只负责 date。
--
-- 回滚：database/rollback/20261115141200_b_class_erp_holidays_date.rollback.sql
--   （仅当列内无任何非空值才删列，有数据则保留并 RAISE NOTICE）。

-- 1. 前置断言
DO $$
DECLARE
    n_rows bigint;
BEGIN
    IF to_regclass('erp.holidays') IS NULL THEN
        RAISE EXCEPTION 'B 类前置断言失败：表 erp.holidays 不存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'erp' AND table_name = 'holidays' AND column_name = 'date'
    ) THEN
        RAISE EXCEPTION 'B 类前置断言失败：erp.holidays.date 已存在，本迁移只补缺失列';
    END IF;

    EXECUTE 'SELECT count(*) FROM erp.holidays' INTO n_rows;
    IF n_rows <> 0 THEN
        RAISE EXCEPTION 'B 类前置断言失败：erp.holidays 有 % 行，dev 定义为 NOT NULL，禁止直接加 NOT NULL', n_rows;
    END IF;
END $$;

-- 2. 补列
ALTER TABLE erp.holidays ADD COLUMN IF NOT EXISTS date date NOT NULL;

-- 3. 后置断言：形状与 dev 定义逐项对齐
DO $$
DECLARE
    v_type text;
    v_nullable text;
    v_default text;
BEGIN
    SELECT data_type, is_nullable, column_default
      INTO v_type, v_nullable, v_default
      FROM information_schema.columns
     WHERE table_schema = 'erp' AND table_name = 'holidays' AND column_name = 'date';

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'B 类后置断言失败：erp.holidays.date 未创建';
    END IF;
    IF v_type <> 'date' OR v_nullable <> 'NO' OR v_default IS NOT NULL THEN
        RAISE EXCEPTION 'B 类后置断言失败：erp.holidays.date 形状=(%,%,%)，期望=(date,NO,NULL)',
            v_type, v_nullable, coalesce(v_default, 'NULL');
    END IF;
END $$;
