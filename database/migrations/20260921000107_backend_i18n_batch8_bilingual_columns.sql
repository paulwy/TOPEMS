-- 000107: 后端数据多语言第八批（主数据/字典/系统预设，字段级双语列）
--   pdm 物料/产品/生产配方/生产工艺；lims 试剂/仪器/流程；
--   ehs 危害因素/危险化学品/危害事件/安全隐患；srm 供应商类别/评分维度；
--   tms 路线；wms 上架区；ai 模型/提示词模板；
--   communication 邮件模板/通知渠道；ticket SLA策略/自动化规则；core 插件。
-- 目的：在已有中文字段之外新增英文备用列 <col>_en，运行时按 X-Lang / Accept-Language 由 SQL CASE WHEN 切换：
--         CASE WHEN $lang = 'en' THEN COALESCE(<col>_en, <col>) ELSE <col> END AS <col>
--       未提供英文时 COALESCE 回退中文原列，保证向后兼容。
-- 说明：
--   - 搜索仍按中文原名（ILIKE 不动）；名称快照表（*_snapshots / *_items 冗余快照）不翻译。
--   - ehs.qa_ehs_hazardous_materials 已有 english_name 列，服务端可直接 COALESCE(english_name, name)，
--     此处仍补 name_en 以保持命名统一（可二选一，不重复写值）。
--   - lims.qa_lab_processes 同时暴露 name 与 process_name，两列均补英文列。
--   - core.core_plugins.author_name 为作者标识，非展示名，不翻译。
-- 兼容性：幂等（ADD COLUMN IF NOT EXISTS），双库（5432 / 5433）可重放。

-- 1. pdm 物料
ALTER TABLE pdm.pdm_materials ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
-- 2. pdm 产品
ALTER TABLE pdm.pdm_products ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
-- 3. pdm 生产配方
ALTER TABLE pdm.pdm_production_formulas ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
-- 4. pdm 生产工艺
ALTER TABLE pdm.pdm_production_processes ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 5. lims 试剂
ALTER TABLE lims.qa_lab_reagents ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
-- 6. lims 仪器
ALTER TABLE lims.qa_lab_instruments ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
-- 7. lims 实验流程（name 与 process_name 双展示列）
ALTER TABLE lims.qa_lab_processes ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE lims.qa_lab_processes ADD COLUMN IF NOT EXISTS process_name_en VARCHAR(255);

-- 8. ehs 危害因素
--    ehs.qa_ehs_hazard_factors / ehs.qa_ehs_hazardous_materials 无任何迁移定义（遗留表），
--    按 ehs 服务查询列补齐真表（供下方双语列 ALTER 及运行时使用）
CREATE TABLE IF NOT EXISTS ehs.qa_ehs_hazard_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factor_no VARCHAR(64),
    name VARCHAR(256) NOT NULL,
    name_en VARCHAR(256),
    factor_type VARCHAR(64),
    category VARCHAR(64),
    description TEXT,
    hazard_level VARCHAR(32),
    exposure_limit VARCHAR(128),
    unit VARCHAR(32),
    sources TEXT,
    affected_positions TEXT,
    affected_count INTEGER DEFAULT 0,
    status VARCHAR(32) DEFAULT 'active',
    remarks TEXT,
    tenant_id UUID,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS ehs.qa_ehs_hazardous_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_no VARCHAR(64),
    name VARCHAR(256) NOT NULL,
    name_en VARCHAR(256),
    alias VARCHAR(256),
    english_name VARCHAR(256),
    cas_no VARCHAR(64),
    category VARCHAR(64),
    hazard_level VARCHAR(32),
    hazard_class VARCHAR(32),
    specification VARCHAR(256),
    unit VARCHAR(32),
    packaging VARCHAR(128),
    storage_condition VARCHAR(256),
    storage_location VARCHAR(256),
    max_stock NUMERIC(15,3),
    min_stock NUMERIC(15,3),
    current_stock NUMERIC(15,3),
    safety_data_sheet TEXT,
    emergency_measures TEXT,
    supplier VARCHAR(256),
    status VARCHAR(32) DEFAULT 'active',
    remarks TEXT,
    tenant_id UUID,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);
ALTER TABLE ehs.qa_ehs_hazard_factors ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
--    ehs.qa_ehs_hazards 无任何迁移定义（遗留表，rehome 也无 public 源），按 ehs 服务 hazard.rs 查询列补齐真表
CREATE TABLE IF NOT EXISTS ehs.qa_ehs_hazards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_no VARCHAR(64),
    title VARCHAR(256) NOT NULL,
    title_en VARCHAR(256),
    description TEXT,
    category VARCHAR(64),
    level VARCHAR(32),
    source VARCHAR(128),
    location VARCHAR(256),
    reported_by VARCHAR(128),
    reported_at timestamptz,
    status VARCHAR(32) DEFAULT 'active',
    inspection_id UUID,
    tenant_id UUID,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);
-- 9. ehs 危险化学品（已有 english_name，此处补 name_en 保持统一）
ALTER TABLE ehs.qa_ehs_hazardous_materials ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
-- 10. ehs 危害事件（展示列为 title）
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS title_en VARCHAR(255);
-- 11. ehs 安全隐患
ALTER TABLE ehs.safety_hazards ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 12. srm 供应商类别
ALTER TABLE srm.supplier_categories ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
-- 13. srm 评分维度
ALTER TABLE srm.scoring_dimensions ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 14. tms 运输路线
ALTER TABLE tms.tms_routes ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 15. wms 上架区
ALTER TABLE wms.slotting_zones ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 16. ai 模型（含真实数据，验证勿改真实行）
ALTER TABLE ai.ai_models ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
-- 17. ai 提示词模板
ALTER TABLE ai.ai_prompt_templates ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 18. communication 邮件模板
--   真表 communication.core_email_templates 无任何迁移定义（007_communication.sql 仅建 public 影子表）；
--   补齐真表（结构对齐 007 public 版本），确保 ALTER 可执行且服务运行时 SEARCH_PATH 解析一致
CREATE TABLE IF NOT EXISTS communication.core_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    subject_template VARCHAR(512) NOT NULL,
    body_template TEXT NOT NULL,
    description TEXT,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);
ALTER TABLE communication.core_email_templates ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
-- 19. communication 通知渠道
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 20. ticket SLA 策略
ALTER TABLE ticket.core_ticket_sla_policies ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
-- 21. ticket 自动化规则
ALTER TABLE ticket.ticket_automation_rules ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 22. core 插件
ALTER TABLE core.core_plugins ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- 23. communication 运行时影子表兼容（实测）：
--   svc/communication main.rs 硬编码 SEARCH_PATH=public, communication（public 在前），
--   未限定表名运行时解析到 public.*；而本服务的表同时存在于 communication.*。
--   为使双语列在运行时可解析且读写一致，给 public.* 影子表同步补列。
--   用 IF EXISTS 守卫：5432 编译参考库无 public 副本时跳过，5433 运行库生效，双库可重放。
ALTER TABLE IF EXISTS public.core_email_templates ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE IF EXISTS public.notification_channels ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
