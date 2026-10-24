-- ============================================================================
-- 20261024000015_copilot_faq_table.sql
--
-- 业务 Copilot FAQ 知识库：静态 curated 升级为租户级可维护表。
--
-- 背景：svc/ai GET /dsh/copilot/modules/{module}/faq 此前返回代码内 curated_faq()
-- 静态语料（erp/finance/crm/wms 各 3 条 + general 3 条），企业无法自有维护。
-- 本迁移建 core.ai_faqs（沿用 core.ai_conversations 的 core schema 归属惯例），
-- search_faq 改走 DB：按 module + 当前租户（或全零全局行）过滤；
-- 表空/查询失败时 handler 回落 curated_faq()，前端体验不变。
--
-- 租户模型：
--   - 全零 tenant_id 行 = 平台全局默认 FAQ（本迁移 seed 的 15 条 curated），
--     RLS 策略对所有租户放行（与 scm.incoming_notices 同型谓词）；
--   - 企业自有行 tenant_id = 本租户，仅本租户可见可写。
--
-- 幂等保证：CREATE TABLE/INDEX IF NOT EXISTS；策略 DROP IF EXISTS + CREATE；
-- seed 以 WHERE NOT EXISTS (按 tenant_id+question 去重) 防重复插入。
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.ai_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT pk_core_ai_faqs PRIMARY KEY,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    module character varying(32) NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
    category character varying(64) NOT NULL DEFAULT ''::character varying,
    status character varying(16) NOT NULL DEFAULT 'active'::character varying,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_core_ai_faqs_tenant ON core.ai_faqs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_ai_faqs_module ON core.ai_faqs (module);

-- RLS（宽松策略，与 20261024000001 / scm.incoming_notices 同型）：
-- 超管/未设置 GUC/全零租户/tenant_id 为全零全局行 → 放行；否则按 app.tenant_id 匹配。
ALTER TABLE core.ai_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.ai_faqs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_core_ai_faqs ON core.ai_faqs;
CREATE POLICY tenant_isolation_core_ai_faqs ON core.ai_faqs FOR ALL
USING (
    COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'::text
    OR current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
    OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
)
WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'::text
    OR current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
    OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
);

-- ----------------------------------------------------------------------------
-- seed：现有 curated_faq() 的 15 条语料种为全局默认 FAQ（tenant_id = 全零）。
-- 幂等：按 (tenant_id, module, question) 存在即跳过，可重复执行。
-- ----------------------------------------------------------------------------
INSERT INTO core.ai_faqs (tenant_id, module, question, answer, keywords, category)
SELECT '00000000-0000-0000-0000-000000000000'::uuid, v.module, v.question, v.answer, v.keywords::jsonb, v.category
FROM (
    VALUES
    -- ERP（3）
    ('erp', '如何创建一张销售订单？',
     '在 ERP 销售模块点击「新建订单」，选择客户与物料后录入数量、价格并提交；保存后可在订单列表跟踪审批与出库状态。',
     '["销售订单","创建","客户","订单"]', '订单管理'),
    ('erp', '采购订单审批流程是怎样的？',
     '采购订单提交后按金额分级审批：5 万以下部门经理审批，5 万以上需财务复核；审批通过后自动生成收货预告并通知仓储。',
     '["采购","审批","流程","金额"]', '采购管理'),
    ('erp', '库存与 ERP 数据不一致怎么办？',
     '先在库存模块发起盘点单核对账面与实物；差异经审批后调整库存并同步 ERP 物料账，全程留痕可追溯。',
     '["库存","盘点","对账","差异"]', '库存对账'),
    -- Finance（3）
    ('finance', '如何提交一张费用报销单？',
     '进入财务模块「费用报销」，选择费用类型、上传发票并填写金额后提交；发票会自动校验重复与真伪，审批流直达部门负责人。',
     '["报销","费用","发票","提交"]', '费用报销'),
    ('finance', '付款审批需要哪些材料？',
     '付款申请需关联对应采购合同与入库单；对公付款还需供应商银行账户信息复核，全部材料齐备后财务出纳方可付款。',
     '["付款","审批","合同","出纳"]', '资金管理'),
    ('finance', '月结结账的步骤是什么？',
     '先完成应收应付核销与折旧计提，再执行试算平衡；确认无误后锁定当期期间，生成月结报表，结账后不可再补录凭证。',
     '["月结","结账","试算平衡","报表"]', '总账月结'),
    -- CRM（3）
    ('crm', '如何把一条线索转为客户？',
     '在线索列表中选择记录，点击「转化为客户」并确认联系人、公司信息；转化后线索自动归档，客户进入跟进阶段。',
     '["线索","转化","客户","联系人"]', '线索管理'),
    ('crm', '销售漏斗各阶段如何定义？',
     '默认阶段为：初步接触 → 需求确认 → 方案报价 → 商务谈判 → 赢单/输单。阶段推进需填写下一步计划与预计成交日期。',
     '["销售漏斗","阶段","赢单","报价"]', '销售过程'),
    ('crm', '如何查看客户的跟进记录？',
     '进入客户详情页的「动态」页签，可看到该客户全部跟进记录、任务与商机历史；也可在工作台按时间线筛选。',
     '["客户","跟进","动态","历史"]', '客户跟进'),
    -- WMS（3）
    ('wms', '入库收货的流程是什么？',
     '到货后凭采购订单创建收货单，逐 SKU 扫码验收数量与批次；质检合格后上架，库存实时增加并回写 ERP。',
     '["入库","收货","上架","扫码"]', '入库作业'),
    ('wms', '拣货任务如何分配？',
     '系统按波次规则自动合并出库订单并分配拣货员；拣货员用 PDA 领取任务，按推荐库位路径作业，完成后提交复核。',
     '["拣货","波次","PDA","分配"]', '出库作业'),
    ('wms', '库存预警在哪里设置？',
     '在仓储「库存预警」中按物料设置上下限阈值；低于下限自动生成补货建议，超出上限提醒滞销处理，阈值可按仓库维度配置。',
     '["预警","阈值","补货","上下限"]', '库存预警'),
    -- General（3，未单独建库模块回落使用）
    ('general', 'Copilot 能帮我做什么？',
     'Copilot 可以理解你的业务提问，识别意图后调用相应模块工具回答，例如查询订单、提交报销、创建客户；涉及写操作时会先请你确认。',
     '["Copilot","能力","意图","帮助"]', '通用'),
    ('general', '操作提交后多久生效？',
     '查询类请求即时返回；写操作经确认后由对应业务服务处理，审批类单据按企业配置的审批流流转，可在对应模块追踪进度。',
     '["生效","审批","进度","写操作"]', '通用'),
    ('general', '回答不准确怎么办？',
     '可以换一种说法补充上下文（例如说明当前所在页面或选中的单据），Copilot 会结合会话上下文重新理解；仍不满意可反馈给管理员优化知识库。',
     '["不准确","反馈","上下文","重试"]', '通用')
) AS v(module, question, answer, keywords, category)
WHERE NOT EXISTS (
    SELECT 1 FROM core.ai_faqs f
    WHERE f.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
      AND f.module = v.module
      AND f.question = v.question
);
