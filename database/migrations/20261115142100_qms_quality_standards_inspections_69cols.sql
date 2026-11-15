-- 空壳表整表对齐（3/6）· qms · quality_standards(26 列 + 11 索引) + quality_inspections(43 列 + 12 索引 + 1 外键)
--
-- 口径：docs/database/code-schema-gap-2026-11-15.md §7.2 第 1 条、§7.3。
--
-- 为什么父子两表放同一版本：
--   两表 prod 均 0 行、只做 ADD COLUMN + CREATE INDEX + 单条 FK，无数据搬迁；
--   "父表先建、子表 FK 同窗"本身要求原子性，拆两个版本只会在父子之间留一个
--   可被读到半成品的时间窗。回滚粒度不受影响：rollback 单文件按"先删 FK →
--   子表索引/列 → 父表索引/列"逆序执行即可完整还原。
--
-- 现状（2026-11-15 实测）：
--   qms.quality_standards   prod 2 列（id, deleted_at）/ 0 行 → dev 28 列
--   qms.quality_inspections prod 2 列（id, deleted_at）/ 0 行 → dev 45 列
--   prod 两表均 relrowsecurity=true / relforcerowsecurity=true，各有
--   rls_tenant_isolation（tenant_id 谓词）+ qms_allow_all_*（true）两条策略；
--   新增列不进入谓词，RLS 行可见集合与写入许可不变。
--   prod 已有列 id 的默认值为 gen_random_uuid()，dev 为 uuid_generate_v4()；
--   该默认值差异属既有类型/默认值漂移，**本迁移不改**。
--
-- 代码证据（prod 缺列时的失败方式，42703 undefined_column）：
--   svc/qms/src/modules/quality/mod.rs、quality_standards.rs、quality_inspections.rs 的
--   写/读路径（INSERT 列清单、SELECT 列清单、UPDATE SET、WHERE 过滤列）。
--
-- 边界（本批只做止血，不做治理）：
--   * 只 ADD COLUMN + CREATE INDEX + ADD CONSTRAINT(FK)；
--   * 不改任何已有列类型/默认值、不改代码、不改 RLS 策略。
--
-- 前置断言：两表存在；两表 0 行（含 NOT NULL 列，非 0 行无法安全直加）；目标列均不存在；FK 不存在。
-- 后置断言：69 列类型/长度/精度/可空/默认值逐项对齐 dev；23 索引定义与 dev 逐字一致；FK 列与引用目标正确。
--
-- 回滚：database/rollback/20261115142100_qms_quality_standards_inspections_69cols.rollback.sql

-- 1. 前置断言
DO $$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('qms.quality_standards') IS NULL OR to_regclass('qms.quality_inspections') IS NULL THEN
        RAISE EXCEPTION '空壳表前置断言失败：qms.quality_standards / qms.quality_inspections 不全存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'qms' AND table_name = 'quality_standards'
           AND column_name IN ('organization_id','code','name','description','category','version',
                               'standard_type','authority','effective_date','expiry_date','requirements',
                               'criteria','compliance_level','status','is_mandatory','review_frequency',
                               'last_review_date','next_review_date','reviewer','notes','attachments',
                               'created_at','updated_at','created_by','updated_by','tenant_id')
    ) THEN
        RAISE EXCEPTION '前置断言失败：qms.quality_standards 已有本次要补的列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'qms' AND table_name = 'quality_inspections'
           AND column_name IN ('organization_id','standard_id','inspection_number','title','description',
                               'inspection_type','inspection_method','inspection_category','object_type',
                               'object_id','object_name','object_batch','inspector','inspector_id',
                               'department','location','planned_date','actual_date','start_time','end_time',
                               'duration_minutes','status','result','score','pass_rate','total_items',
                               'passed_items','failed_items','findings','conclusion','recommendations',
                               'risk_level','next_inspection_date','follow_up_required','approved_by',
                               'approved_at','attachments','notes','created_at','updated_at','created_by',
                               'updated_by','tenant_id')
    ) THEN
        RAISE EXCEPTION '前置断言失败：qms.quality_inspections 已有本次要补的列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'qms.quality_inspections'::regclass
           AND contype = 'f' AND conname = 'quality_inspections_standard_id_fkey'
    ) THEN
        RAISE EXCEPTION '前置断言失败：外键 quality_inspections_standard_id_fkey 已存在';
    END IF;

    EXECUTE 'SELECT count(*) FROM qms.quality_standards' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION '空壳表前置断言失败：qms.quality_standards 有 % 行，含 NOT NULL 无默认列，禁止直接加', n;
    END IF;
    EXECUTE 'SELECT count(*) FROM qms.quality_inspections' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION '空壳表前置断言失败：qms.quality_inspections 有 % 行，含 NOT NULL 无默认列，禁止直接加', n;
    END IF;
END $$;

-- 2. 父表：qms.quality_standards 补 26 列（顺序同 dev ordinal_position）
ALTER TABLE qms.quality_standards
    ADD COLUMN IF NOT EXISTS organization_id  uuid         NOT NULL,
    ADD COLUMN IF NOT EXISTS code             varchar(100) NOT NULL,
    ADD COLUMN IF NOT EXISTS name             varchar(255) NOT NULL,
    ADD COLUMN IF NOT EXISTS description      text,
    ADD COLUMN IF NOT EXISTS category         varchar(50),
    ADD COLUMN IF NOT EXISTS version          varchar(50)  DEFAULT '1.0',
    ADD COLUMN IF NOT EXISTS standard_type    varchar(50),
    ADD COLUMN IF NOT EXISTS authority        varchar(255),
    ADD COLUMN IF NOT EXISTS effective_date   date,
    ADD COLUMN IF NOT EXISTS expiry_date      date,
    ADD COLUMN IF NOT EXISTS requirements     text,
    ADD COLUMN IF NOT EXISTS criteria         text,
    ADD COLUMN IF NOT EXISTS compliance_level varchar(50),
    ADD COLUMN IF NOT EXISTS status           varchar(20)  NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS is_mandatory     boolean      DEFAULT false,
    ADD COLUMN IF NOT EXISTS review_frequency varchar(50),
    ADD COLUMN IF NOT EXISTS last_review_date date,
    ADD COLUMN IF NOT EXISTS next_review_date date,
    ADD COLUMN IF NOT EXISTS reviewer         varchar(255),
    ADD COLUMN IF NOT EXISTS notes            text,
    ADD COLUMN IF NOT EXISTS attachments      jsonb,
    ADD COLUMN IF NOT EXISTS created_at       timestamptz  NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at       timestamptz  NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by       uuid,
    ADD COLUMN IF NOT EXISTS updated_by       uuid,
    ADD COLUMN IF NOT EXISTS tenant_id        uuid;

-- 3. 父表索引（11 只，定义与 dev pg_indexes 逐字一致）
CREATE INDEX IF NOT EXISTS idx_qms_quality_standards_tenant_id ON qms.quality_standards USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quality_standards_category ON qms.quality_standards USING btree (category);
CREATE INDEX IF NOT EXISTS idx_quality_standards_code ON qms.quality_standards USING btree (code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_standards_code_unique ON qms.quality_standards USING btree (code, organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quality_standards_effective_date ON qms.quality_standards USING btree (effective_date);
CREATE INDEX IF NOT EXISTS idx_quality_standards_name ON qms.quality_standards USING btree (name);
CREATE INDEX IF NOT EXISTS idx_quality_standards_next_review_date ON qms.quality_standards USING btree (next_review_date);
CREATE INDEX IF NOT EXISTS idx_quality_standards_organization_id ON qms.quality_standards USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_quality_standards_standard_type ON qms.quality_standards USING btree (standard_type);
CREATE INDEX IF NOT EXISTS idx_quality_standards_status ON qms.quality_standards USING btree (status);
CREATE INDEX IF NOT EXISTS quality_standards_tenant_id_idx ON qms.quality_standards USING btree (tenant_id);

-- 4. 子表：qms.quality_inspections 补 43 列
ALTER TABLE qms.quality_inspections
    ADD COLUMN IF NOT EXISTS organization_id     uuid,
    ADD COLUMN IF NOT EXISTS standard_id         uuid,
    ADD COLUMN IF NOT EXISTS inspection_number   varchar(100),
    ADD COLUMN IF NOT EXISTS title               varchar(255) NOT NULL,
    ADD COLUMN IF NOT EXISTS description         text,
    ADD COLUMN IF NOT EXISTS inspection_type     varchar(50)  NOT NULL,
    ADD COLUMN IF NOT EXISTS inspection_method   varchar(50),
    ADD COLUMN IF NOT EXISTS inspection_category varchar(50),
    ADD COLUMN IF NOT EXISTS object_type         varchar(50),
    ADD COLUMN IF NOT EXISTS object_id           uuid,
    ADD COLUMN IF NOT EXISTS object_name         varchar(255),
    ADD COLUMN IF NOT EXISTS object_batch        varchar(100),
    ADD COLUMN IF NOT EXISTS inspector           varchar(255) NOT NULL,
    ADD COLUMN IF NOT EXISTS inspector_id        uuid,
    ADD COLUMN IF NOT EXISTS department          varchar(100),
    ADD COLUMN IF NOT EXISTS location            varchar(255),
    ADD COLUMN IF NOT EXISTS planned_date        date,
    ADD COLUMN IF NOT EXISTS actual_date         date,
    ADD COLUMN IF NOT EXISTS start_time          time,
    ADD COLUMN IF NOT EXISTS end_time            time,
    ADD COLUMN IF NOT EXISTS duration_minutes    integer,
    ADD COLUMN IF NOT EXISTS status              varchar(20)  NOT NULL DEFAULT 'planned',
    ADD COLUMN IF NOT EXISTS result              varchar(20),
    ADD COLUMN IF NOT EXISTS score               numeric(5,2),
    ADD COLUMN IF NOT EXISTS pass_rate           numeric(5,2),
    ADD COLUMN IF NOT EXISTS total_items         integer,
    ADD COLUMN IF NOT EXISTS passed_items        integer,
    ADD COLUMN IF NOT EXISTS failed_items        integer,
    ADD COLUMN IF NOT EXISTS findings            text,
    ADD COLUMN IF NOT EXISTS conclusion          text,
    ADD COLUMN IF NOT EXISTS recommendations     text,
    ADD COLUMN IF NOT EXISTS risk_level          varchar(20),
    ADD COLUMN IF NOT EXISTS next_inspection_date date,
    ADD COLUMN IF NOT EXISTS follow_up_required  boolean      DEFAULT false,
    ADD COLUMN IF NOT EXISTS approved_by         varchar(255),
    ADD COLUMN IF NOT EXISTS approved_at         timestamptz,
    ADD COLUMN IF NOT EXISTS attachments         jsonb,
    ADD COLUMN IF NOT EXISTS notes               text,
    ADD COLUMN IF NOT EXISTS created_at          timestamptz  NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at          timestamptz  NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by          uuid,
    ADD COLUMN IF NOT EXISTS updated_by          uuid,
    ADD COLUMN IF NOT EXISTS tenant_id           uuid;

-- 5. 子表索引（12 只）
CREATE INDEX IF NOT EXISTS idx_qms_quality_inspections_tenant_id ON qms.quality_inspections USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_actual_date ON qms.quality_inspections USING btree (actual_date);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_inspection_number ON qms.quality_inspections USING btree (inspection_number);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_inspector ON qms.quality_inspections USING btree (inspector);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_object_id ON qms.quality_inspections USING btree (object_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_organization_id ON qms.quality_inspections USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_planned_date ON qms.quality_inspections USING btree (planned_date);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_result ON qms.quality_inspections USING btree (result);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_standard_id ON qms.quality_inspections USING btree (standard_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_status ON qms.quality_inspections USING btree (status);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_type ON qms.quality_inspections USING btree (inspection_type);
CREATE INDEX IF NOT EXISTS quality_inspections_tenant_id_idx ON qms.quality_inspections USING btree (tenant_id);

-- 6. 子表外键（父表列已在上方补齐）
ALTER TABLE qms.quality_inspections
    ADD CONSTRAINT quality_inspections_standard_id_fkey
    FOREIGN KEY (standard_id) REFERENCES qms.quality_standards(id) ON DELETE SET NULL;

-- 7. 后置断言：父表 26 列形状
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('organization_id','uuid',NULL::int,NULL::int,NULL::int,'NO',NULL::text),
            ('code','character varying',100,NULL::int,NULL::int,'NO',NULL::text),
            ('name','character varying',255,NULL::int,NULL::int,'NO',NULL::text),
            ('description','text',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('category','character varying',50,NULL::int,NULL::int,'YES',NULL::text),
            ('version','character varying',50,NULL::int,NULL::int,'YES','''1.0''::character varying'),
            ('standard_type','character varying',50,NULL::int,NULL::int,'YES',NULL::text),
            ('authority','character varying',255,NULL::int,NULL::int,'YES',NULL::text),
            ('effective_date','date',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('expiry_date','date',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('requirements','text',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('criteria','text',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('compliance_level','character varying',50,NULL::int,NULL::int,'YES',NULL::text),
            ('status','character varying',20,NULL::int,NULL::int,'NO','''active''::character varying'),
            ('is_mandatory','boolean',NULL::int,NULL::int,NULL::int,'YES','false'),
            ('review_frequency','character varying',50,NULL::int,NULL::int,'YES',NULL::text),
            ('last_review_date','date',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('next_review_date','date',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('reviewer','character varying',255,NULL::int,NULL::int,'YES',NULL::text),
            ('notes','text',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('attachments','jsonb',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('created_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'NO','now()'),
            ('updated_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'NO','now()'),
            ('created_by','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('updated_by','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('tenant_id','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text)
        ) AS v(col, typ, maxlen, numprec, numscale, nullable, dflt_exact)
    LOOP
        PERFORM 1 FROM information_schema.columns
          WHERE table_schema='qms' AND table_name='quality_standards'
            AND column_name=r.col AND data_type=r.typ AND is_nullable=r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND numeric_precision IS NOT DISTINCT FROM r.numprec
            AND numeric_scale IS NOT DISTINCT FROM r.numscale
            AND column_default IS NOT DISTINCT FROM r.dflt_exact;
        IF NOT FOUND THEN
            RAISE EXCEPTION '后置断言失败：qms.quality_standards.% 形状与 dev 不一致', r.col;
        END IF;
    END LOOP;
END $$;

-- 8. 后置断言：子表 43 列形状
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('organization_id','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('standard_id','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('inspection_number','character varying',100,NULL::int,NULL::int,'YES',NULL::text),
            ('title','character varying',255,NULL::int,NULL::int,'NO',NULL::text),
            ('description','text',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('inspection_type','character varying',50,NULL::int,NULL::int,'NO',NULL::text),
            ('inspection_method','character varying',50,NULL::int,NULL::int,'YES',NULL::text),
            ('inspection_category','character varying',50,NULL::int,NULL::int,'YES',NULL::text),
            ('object_type','character varying',50,NULL::int,NULL::int,'YES',NULL::text),
            ('object_id','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('object_name','character varying',255,NULL::int,NULL::int,'YES',NULL::text),
            ('object_batch','character varying',100,NULL::int,NULL::int,'YES',NULL::text),
            ('inspector','character varying',255,NULL::int,NULL::int,'NO',NULL::text),
            ('inspector_id','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('department','character varying',100,NULL::int,NULL::int,'YES',NULL::text),
            ('location','character varying',255,NULL::int,NULL::int,'YES',NULL::text),
            ('planned_date','date',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('actual_date','date',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('start_time','time without time zone',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('end_time','time without time zone',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('duration_minutes','integer',NULL::int,32,0,'YES',NULL::text),
            ('status','character varying',20,NULL::int,NULL::int,'NO','''planned''::character varying'),
            ('result','character varying',20,NULL::int,NULL::int,'YES',NULL::text),
            ('score','numeric',NULL::int,5,2,'YES',NULL::text),
            ('pass_rate','numeric',NULL::int,5,2,'YES',NULL::text),
            ('total_items','integer',NULL::int,32,0,'YES',NULL::text),
            ('passed_items','integer',NULL::int,32,0,'YES',NULL::text),
            ('failed_items','integer',NULL::int,32,0,'YES',NULL::text),
            ('findings','text',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('conclusion','text',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('recommendations','text',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('risk_level','character varying',20,NULL::int,NULL::int,'YES',NULL::text),
            ('next_inspection_date','date',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('follow_up_required','boolean',NULL::int,NULL::int,NULL::int,'YES','false'),
            ('approved_by','character varying',255,NULL::int,NULL::int,'YES',NULL::text),
            ('approved_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('attachments','jsonb',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('notes','text',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('created_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'NO','now()'),
            ('updated_at','timestamp with time zone',NULL::int,NULL::int,NULL::int,'NO','now()'),
            ('created_by','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('updated_by','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text),
            ('tenant_id','uuid',NULL::int,NULL::int,NULL::int,'YES',NULL::text)
        ) AS v(col, typ, maxlen, numprec, numscale, nullable, dflt_exact)
    LOOP
        PERFORM 1 FROM information_schema.columns
          WHERE table_schema='qms' AND table_name='quality_inspections'
            AND column_name=r.col AND data_type=r.typ AND is_nullable=r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND numeric_precision IS NOT DISTINCT FROM r.numprec
            AND numeric_scale IS NOT DISTINCT FROM r.numscale
            AND column_default IS NOT DISTINCT FROM r.dflt_exact;
        IF NOT FOUND THEN
            RAISE EXCEPTION '后置断言失败：qms.quality_inspections.% 形状与 dev 不一致', r.col;
        END IF;
    END LOOP;
END $$;

-- 9. 后置断言：23 只索引定义逐字一致
DO $$
DECLARE
    r record;
    actual text;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('idx_qms_quality_standards_tenant_id','CREATE INDEX idx_qms_quality_standards_tenant_id ON qms.quality_standards USING btree (tenant_id)'),
            ('idx_quality_standards_category','CREATE INDEX idx_quality_standards_category ON qms.quality_standards USING btree (category)'),
            ('idx_quality_standards_code','CREATE INDEX idx_quality_standards_code ON qms.quality_standards USING btree (code)'),
            ('idx_quality_standards_code_unique','CREATE UNIQUE INDEX idx_quality_standards_code_unique ON qms.quality_standards USING btree (code, organization_id) WHERE (deleted_at IS NULL)'),
            ('idx_quality_standards_effective_date','CREATE INDEX idx_quality_standards_effective_date ON qms.quality_standards USING btree (effective_date)'),
            ('idx_quality_standards_name','CREATE INDEX idx_quality_standards_name ON qms.quality_standards USING btree (name)'),
            ('idx_quality_standards_next_review_date','CREATE INDEX idx_quality_standards_next_review_date ON qms.quality_standards USING btree (next_review_date)'),
            ('idx_quality_standards_organization_id','CREATE INDEX idx_quality_standards_organization_id ON qms.quality_standards USING btree (organization_id)'),
            ('idx_quality_standards_standard_type','CREATE INDEX idx_quality_standards_standard_type ON qms.quality_standards USING btree (standard_type)'),
            ('idx_quality_standards_status','CREATE INDEX idx_quality_standards_status ON qms.quality_standards USING btree (status)'),
            ('quality_standards_tenant_id_idx','CREATE INDEX quality_standards_tenant_id_idx ON qms.quality_standards USING btree (tenant_id)'),
            ('idx_qms_quality_inspections_tenant_id','CREATE INDEX idx_qms_quality_inspections_tenant_id ON qms.quality_inspections USING btree (tenant_id)'),
            ('idx_quality_inspections_actual_date','CREATE INDEX idx_quality_inspections_actual_date ON qms.quality_inspections USING btree (actual_date)'),
            ('idx_quality_inspections_inspection_number','CREATE INDEX idx_quality_inspections_inspection_number ON qms.quality_inspections USING btree (inspection_number)'),
            ('idx_quality_inspections_inspector','CREATE INDEX idx_quality_inspections_inspector ON qms.quality_inspections USING btree (inspector)'),
            ('idx_quality_inspections_object_id','CREATE INDEX idx_quality_inspections_object_id ON qms.quality_inspections USING btree (object_id)'),
            ('idx_quality_inspections_organization_id','CREATE INDEX idx_quality_inspections_organization_id ON qms.quality_inspections USING btree (organization_id)'),
            ('idx_quality_inspections_planned_date','CREATE INDEX idx_quality_inspections_planned_date ON qms.quality_inspections USING btree (planned_date)'),
            ('idx_quality_inspections_result','CREATE INDEX idx_quality_inspections_result ON qms.quality_inspections USING btree (result)'),
            ('idx_quality_inspections_standard_id','CREATE INDEX idx_quality_inspections_standard_id ON qms.quality_inspections USING btree (standard_id)'),
            ('idx_quality_inspections_status','CREATE INDEX idx_quality_inspections_status ON qms.quality_inspections USING btree (status)'),
            ('idx_quality_inspections_type','CREATE INDEX idx_quality_inspections_type ON qms.quality_inspections USING btree (inspection_type)'),
            ('quality_inspections_tenant_id_idx','CREATE INDEX quality_inspections_tenant_id_idx ON qms.quality_inspections USING btree (tenant_id)')
        ) AS v(idx, def)
    LOOP
        SELECT pg_get_indexdef(to_regclass('qms.' || r.idx)) INTO actual;
        IF actual IS DISTINCT FROM r.def THEN
            RAISE EXCEPTION '后置断言失败：索引 % 定义与 dev 不一致（实际：%）', r.idx, COALESCE(actual, '<缺失>');
        END IF;
    END LOOP;
END $$;

-- 10. 后置断言：外键列与引用目标、ON DELETE 动作正确
DO $$
DECLARE
    v_conkey smallint[];
    v_confrel oid;
    v_confkey smallint[];
    v_deltype "char";
BEGIN
    SELECT conkey, confrelid, confkey, confdeltype
      INTO v_conkey, v_confrel, v_confkey, v_deltype
      FROM pg_constraint
     WHERE conrelid = 'qms.quality_inspections'::regclass
       AND contype = 'f' AND conname = 'quality_inspections_standard_id_fkey';

    IF v_conkey IS NULL
       OR v_conkey <> ARRAY[(SELECT attnum FROM pg_attribute
                              WHERE attrelid='qms.quality_inspections'::regclass AND attname='standard_id')]::smallint[]
       OR v_confrel <> 'qms.quality_standards'::regclass
       OR v_confkey <> ARRAY[(SELECT attnum FROM pg_attribute
                               WHERE attrelid='qms.quality_standards'::regclass AND attname='id')]::smallint[]
       OR v_deltype <> 'n' THEN
        RAISE EXCEPTION '后置断言失败：外键 quality_inspections_standard_id_fkey 定义与 dev 不一致';
    END IF;
END $$;
