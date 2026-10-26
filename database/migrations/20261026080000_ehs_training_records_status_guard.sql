-- 2026-10-26 ehs.training_records status 列守卫（上游建议 A 项）
-- 目的：20261026090000 的 A2 段（ADD CONSTRAINT ck_training_records_status CHECK ...）在
--       status 列缺失的环境（如按陈旧 init 快照建库的路径）会直接报 "column status does not
--       exist"。本迁移置于 090000 之前，先补列并归一 DEFAULT，保证后续 CHECK 在任何环境可建。
-- 另：init 幽灵快照（database/init/10_ehs_schema.sql）定义 status DEFAULT 'active'——与迁移链
--       三态 CHECK 冲突同型；此处一并把 'active'/'enrolled' 归一到 'ongoing'（业务默认创建态）。
-- 幂等：ADD COLUMN IF NOT EXISTS + DEFAULT 条件守卫，可重复执行；零数据迁移（仅默认值/可空性）。

DO $$
BEGIN
    -- G1. status 列存在性守卫（列缺失 → 补列，默认 'ongoing'）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'ehs' AND table_name = 'training_records'
                     AND column_name = 'status') THEN
        ALTER TABLE ehs.training_records ADD COLUMN status varchar(32) DEFAULT 'ongoing';
    END IF;

    -- G2. DEFAULT 归一（历史遗留 'active'/'enrolled' → 'ongoing'，与 CHECK 三态及业务默认一致）
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'ehs' AND table_name = 'training_records'
                 AND column_name = 'status'
                 AND column_default IN ('''active''::character varying',
                                        '''enrolled''::character varying',
                                        '''planned''::character varying')) THEN
        ALTER TABLE ehs.training_records ALTER COLUMN status SET DEFAULT 'ongoing';
    END IF;
END $$;
