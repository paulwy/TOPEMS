use super::common::{BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;
use serde_json::json;

// ==================== CRM 域（6 个表单） ====================

pub(super) fn register_crm_forms(registry: &mut FormRegistry) {
    // 1. 客户
    registry.register(
        FormConfig::new("customer", "客户", FormDomain::Crm)
            .with_description("客户档案主表，记录企业客户的基本信息、信用与分类。")
            .with_field(FieldDefinition::new(
                "name",
                "客户名称",
                "text",
                "客户的法定全称，需与营业执照一致",
                true,
                "上海云海科技股份有限公司",
            ))
            .with_field(FieldDefinition::new(
                "industry",
                "所属行业",
                "select",
                "客户所属行业分类",
                true,
                "信息技术",
            ))
            .with_field(FieldDefinition::new(
                "credit_level",
                "信用等级",
                "select",
                "客户信用评级（A/B/C/D）",
                false,
                "A",
            ))
            .with_field(FieldDefinition::new(
                "contact_phone",
                "联系电话",
                "text",
                "客户主联系电话",
                true,
                "021-88888888",
            ))
            .with_field(FieldDefinition::new(
                "address",
                "客户地址",
                "textarea",
                "客户办公地址",
                false,
                "上海市浦东新区张江高科技园区",
            ))
            .with_example(json!({
                "name": "上海云海科技股份有限公司",
                "industry": "信息技术",
                "credit_level": "A",
                "contact_phone": "021-88888888",
                "address": "上海市浦东新区张江高科技园区"
            }))
            .with_validation_rule(FormValidationRule::new(
                "name",
                "required",
                "客户名称不能为空且需为合法企业名",
            ))
            .with_validation_rule(
                FormValidationRule::new("contact_phone", "format", "电话格式需符合区号-号码规则")
                    .with_pattern(r"^\d{3,4}-\d{7,8}$"),
            )
            .with_validation_rule(FormValidationRule::new(
                "credit_level",
                "range",
                "信用等级仅允许 A/B/C/D",
            ))
            .with_business_term(BusinessTerm::new(
                "信用等级",
                Some("Credit Level".to_string()),
                "用于衡量客户付款信用与违约风险，A 级最高、D 级最低。",
            ))
            .with_business_term(BusinessTerm::new(
                "客户画像",
                Some("Customer Profile".to_string()),
                "对客户基本信息、行业、消费能力等的综合描述。",
            )),
    );

    // 2. 联系人
    registry.register(
        FormConfig::new("contact", "联系人", FormDomain::Crm)
            .with_description("客户单位的联系人信息，关联到客户档案。")
            .with_field(FieldDefinition::new(
                "customer_id",
                "所属客户",
                "select",
                "关联的客户 ID",
                true,
                "1001",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "联系人姓名",
                "text",
                "联系人真实姓名",
                true,
                "李雷",
            ))
            .with_field(FieldDefinition::new(
                "position",
                "职务",
                "text",
                "联系人在客户单位的职务",
                false,
                "采购经理",
            ))
            .with_field(FieldDefinition::new(
                "phone",
                "手机号",
                "text",
                "联系人的手机号码",
                true,
                "13800138000",
            ))
            .with_field(FieldDefinition::new(
                "email",
                "邮箱",
                "text",
                "联系人的电子邮箱",
                false,
                "lilei@example.com",
            ))
            .with_example(json!({
                "customer_id": "1001",
                "name": "李雷",
                "position": "采购经理",
                "phone": "13800138000",
                "email": "lilei@example.com"
            }))
            .with_validation_rule(
                FormValidationRule::new("phone", "format", "手机号需为 11 位数字")
                    .with_pattern(r"^1\d{10}$"),
            )
            .with_validation_rule(
                FormValidationRule::new("email", "format", "邮箱需符合标准格式")
                    .with_pattern(r"^[^@\s]+@[^@\s]+\.[^@\s]+$"),
            ),
    );

    // 3. 商机
    registry.register(
        FormConfig::new("opportunity", "商机", FormDomain::Crm)
            .with_description("销售商机，记录潜在销售机会、预计金额与推进阶段。")
            .with_field(FieldDefinition::new(
                "title",
                "商机名称",
                "text",
                "商机主题，需简明描述销售机会",
                true,
                "云海科技 ERP 升级项目",
            ))
            .with_field(FieldDefinition::new(
                "customer_id",
                "客户",
                "select",
                "关联的客户 ID",
                true,
                "1001",
            ))
            .with_field(FieldDefinition::new(
                "amount",
                "预计金额",
                "number",
                "商机预计成交金额（元）",
                true,
                "1200000",
            ))
            .with_field(FieldDefinition::new(
                "stage",
                "商机阶段",
                "select",
                "销售阶段：初步接触/需求确认/方案报价/谈判/成交",
                true,
                "方案报价",
            ))
            .with_field(FieldDefinition::new(
                "expected_close_date",
                "预计成交日期",
                "date",
                "商机预计成交的日期",
                false,
                "2026-09-30",
            ))
            .with_example(json!({
                "title": "云海科技 ERP 升级项目",
                "customer_id": "1001",
                "amount": 1200000,
                "stage": "方案报价",
                "expected_close_date": "2026-09-30"
            }))
            .with_validation_rule(FormValidationRule::new(
                "amount",
                "range",
                "金额需大于 0 且不超过 1 亿",
            ))
            .with_validation_rule(FormValidationRule::new(
                "stage",
                "logic",
                "阶段需与销售漏斗推进顺序一致",
            ))
            .with_business_term(BusinessTerm::new(
                "商机阶段",
                Some("Opportunity Stage".to_string()),
                "描述商机所处的销售推进阶段，便于漏斗分析与销售预测。",
            )),
    );

    // 4. 客户互动
    registry.register(
        FormConfig::new("interaction", "客户互动", FormDomain::Crm)
            .with_description("记录与客户的沟通互动，包括电话、拜访、邮件等。")
            .with_field(FieldDefinition::new(
                "customer_id",
                "客户",
                "select",
                "关联的客户 ID",
                true,
                "1001",
            ))
            .with_field(FieldDefinition::new(
                "channel",
                "互动渠道",
                "select",
                "沟通方式：电话/拜访/邮件/微信",
                true,
                "拜访",
            ))
            .with_field(FieldDefinition::new(
                "content",
                "互动内容",
                "textarea",
                "沟通的主要内容记录",
                true,
                "客户对新版 ERP 报价方案反馈良好，预计下周签约",
            ))
            .with_field(FieldDefinition::new(
                "interaction_time",
                "互动时间",
                "date",
                "互动发生时间",
                true,
                "2026-07-18 14:30",
            ))
            .with_example(json!({
                "customer_id": "1001",
                "channel": "拜访",
                "content": "客户对新版 ERP 报价方案反馈良好，预计下周签约",
                "interaction_time": "2026-07-18 14:30"
            })),
    );

    // 5. 工单
    registry.register(
        FormConfig::new("ticket", "工单", FormDomain::Crm)
            .with_description("客户服务工单，用于跟踪售后问题、投诉、咨询等。")
            .with_field(FieldDefinition::new(
                "title",
                "工单标题",
                "text",
                "简明描述工单问题",
                true,
                "ERP 报表导出失败",
            ))
            .with_field(FieldDefinition::new(
                "customer_id",
                "客户",
                "select",
                "提交工单的客户",
                true,
                "1001",
            ))
            .with_field(FieldDefinition::new(
                "priority",
                "优先级",
                "select",
                "工单优先级：低/中/高/紧急",
                true,
                "高",
            ))
            .with_field(FieldDefinition::new(
                "category",
                "工单分类",
                "select",
                "工单类型：咨询/投诉/故障/需求",
                true,
                "故障",
            ))
            .with_field(FieldDefinition::new(
                "description",
                "问题描述",
                "textarea",
                "问题的详细描述",
                true,
                "在导出销售月报时提示『服务器错误』，已持续 2 天",
            ))
            .with_example(json!({
                "title": "ERP 报表导出失败",
                "customer_id": "1001",
                "priority": "高",
                "category": "故障",
                "description": "在导出销售月报时提示『服务器错误』，已持续 2 天"
            }))
            .with_business_term(BusinessTerm::new(
                "SLA",
                Some("Service Level Agreement".to_string()),
                "服务等级协议，约定工单响应时长与解决时长。",
            )),
    );

    // 6. 退换货
    registry.register(
        FormConfig::new("return", "退换货", FormDomain::Crm)
            .with_description("客户退换货申请单，关联原销售订单。")
            .with_field(FieldDefinition::new(
                "order_id",
                "原订单",
                "select",
                "关联的原销售订单 ID",
                true,
                "SO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "type",
                "退换类型",
                "select",
                "退货/换货",
                true,
                "退货",
            ))
            .with_field(FieldDefinition::new(
                "reason",
                "退换原因",
                "textarea",
                "客户申请退换的具体原因",
                true,
                "到货商品存在外观损坏",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "退换数量",
                "number",
                "退换的商品数量",
                true,
                "5",
            ))
            .with_example(json!({
                "order_id": "SO20260718001",
                "type": "退货",
                "reason": "到货商品存在外观损坏",
                "quantity": 5
            })),
    );
}
