-- 2026-10-26 training_records 重设计加固缺陷修复（审计实测，20261026090000 遗留）
-- 背景：20261026090000 修复了 hrm 的 status DEFAULT 'planned' ↔ CHECK 冲突炸弹，
--       但 ehs.training_records 存在同款未修：status DEFAULT 'enrolled' 不在新建的
--       三态 CHECK ('ongoing','completed','failed') 内——不带 status 的 INSERT 必违反
--       （实测复现：new row violates check constraint "ck_training_records_status"）。
--       另：record_no 唯一约束未 NOT NULL（UNIQUE 允许多 NULL，业务单号语义应非空；
--       实测 21 行全非空，可安全收紧）。
-- 现状核实（2026-10-26 dev DB）：ehs.training_records 21 行、status 全 'ongoing'、
--       record_no 全非空、created_at ≤ 2026-10-23（早于加固迁移，"两表 0 行"注释已失真，
--       但行值均在 CHECK 内，无数据风险）。
-- 修复：DEFAULT 'enrolled' → 'ongoing'（对齐 CHECK 且与业务默认创建态一致）；
--       record_no SET NOT NULL（空值存在时守卫跳过留待人工）。
-- 幂等：全部条件守卫，可重复执行；仅改默认值与可空性，零数据迁移。

DO $$
BEGIN
    -- F1. ehs.status DEFAULT 对齐三态 CHECK（'enrolled' 为历史遗留值，svc/ehs 代码零引用）
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'ehs' AND table_name = 'training_records'
                 AND column_name = 'status'
                 AND column_default = '''enrolled''::character varying') THEN
        ALTER TABLE ehs.training_records ALTER COLUMN status SET DEFAULT 'ongoing';
    END IF;

    -- F2. record_no 收紧 NOT NULL（表内无 NULL 时才执行；有 NULL 则跳过留待人工清理）
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'ehs' AND table_name = 'training_records'
                 AND column_name = 'record_no' AND is_nullable = 'YES')
       AND NOT EXISTS (SELECT 1 FROM ehs.training_records WHERE record_no IS NULL) THEN
        ALTER TABLE ehs.training_records ALTER COLUMN record_no SET NOT NULL;
    END IF;
END $$;
