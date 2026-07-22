use serde_json::json;
use super::common::{BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;

// ==================== ERP 财务域（8 个表单） ====================

pub(super) fn register_erp_finance_forms(registry: &mut FormRegistry) {
    // 15. 凭证
    registry.register(
        FormConfig::new("voucher", "凭证", FormDomain::ErpFinance)
            .with_description("会计凭证主表，记录借贷分录与摘要。")
            .with_field(FieldDefinition::new(
                "voucher_no",
                "凭证字号",
                "text",
                "凭证编号，格式：记-20260718-001",
                true,
                "记-20260718-001",
            ))
            .with_field(FieldDefinition::new(
                "voucher_date",
                "凭证日期",
                "date",
                "凭证的会计日期",
                true,
                "2026-07-18",
            ))
            .with_field(FieldDefinition::new(
                "summary",
                "摘要",
                "textarea",
                "凭证摘要，简述业务背景",
                true,
                "收到云海科技销售货款",
            ))
            .with_field(FieldDefinition::new(
                "debit_subject",
                "借方科目",
                "select",
                "借方会计科目",
                true,
                "1002 银行存款",
            ))
            .with_field(FieldDefinition::new(
                "credit_subject",
                "贷方科目",
                "select",
                "贷方会计科目",
                true,
                "6001 主营业务收入",
            ))
            .with_field(FieldDefinition::new(
                "amount",
                "金额",
                "number",
                "凭证金额（元）",
                true,
                "120000.00",
            ))
            .with_example(json!({
                "voucher_no": "记-20260718-001",
                "voucher_date": "2026-07-18",
                "summary": "收到云海科技销售货款",
                "debit_subject": "1002 银行存款",
                "credit_subject": "6001 主营业务收入",
                "amount": 120000.00
            }))
            .with_validation_rule(FormValidationRule::new(
                "amount",
                "logic",
                "借贷金额必须相等",
            ))
            .with_validation_rule(FormValidationRule::new(
                "voucher_no",
                "format",
                "凭证字号需符合『记-日期-序号』格式",
            ))
            .with_business_term(BusinessTerm::new(
                "借贷必相等",
                Some("Double-entry Bookkeeping".to_string()),
                "复式记账法核心原则，每笔凭证借方金额合计必须等于贷方金额合计。",
            ))
            .with_business_term(BusinessTerm::new(
                "摘要",
                Some("Summary".to_string()),
                "对会计分录业务内容的简明文字说明。",
            )),
    );

    // 16. 应收账款
    registry.register(
        FormConfig::new("receivable", "应收账款", FormDomain::ErpFinance)
            .with_description("应收账款记录，由销售产生，待客户支付。")
            .with_field(FieldDefinition::new(
                "customer_id",
                "客户",
                "select",
                "欠款客户",
                true,
                "1001",
            ))
            .with_field(FieldDefinition::new(
                "amount",
                "应收金额",
                "number",
                "应收账款金额（元）",
                true,
                "120000.00",
            ))
            .with_field(FieldDefinition::new(
                "due_date",
                "到期日期",
                "date",
                "应收账款到期日",
                true,
                "2026-08-18",
            ))
            .with_field(FieldDefinition::new(
                "source_order",
                "源单据",
                "text",
                "产生应收的源销售订单号",
                true,
                "SO20260718001",
            ))
            .with_example(json!({
                "customer_id": "1001",
                "amount": 120000.00,
                "due_date": "2026-08-18",
                "source_order": "SO20260718001"
            }))
            .with_business_term(BusinessTerm::new(
                "账龄",
                Some("Aging".to_string()),
                "应收账款从发生到当前的时间长度，用于评估回款风险。",
            )),
    );

    // 17. 应付账款
    registry.register(
        FormConfig::new("payable", "应付账款", FormDomain::ErpFinance)
            .with_description("应付账款记录，由采购产生，待向供应商支付。")
            .with_field(FieldDefinition::new(
                "supplier_id",
                "供应商",
                "select",
                "应付对象供应商",
                true,
                "S001",
            ))
            .with_field(FieldDefinition::new(
                "amount",
                "应付金额",
                "number",
                "应付账款金额（元）",
                true,
                "80000.00",
            ))
            .with_field(FieldDefinition::new(
                "due_date",
                "到期日期",
                "date",
                "应付账款到期日",
                true,
                "2026-08-15",
            ))
            .with_field(FieldDefinition::new(
                "source_order",
                "源单据",
                "text",
                "产生应付的源采购订单号",
                true,
                "PO20260718001",
            ))
            .with_example(json!({
                "supplier_id": "S001",
                "amount": 80000.00,
                "due_date": "2026-08-15",
                "source_order": "PO20260718001"
            })),
    );

    // 18. 收款
    registry.register(
        FormConfig::new("collection", "收款", FormDomain::ErpFinance)
            .with_description("收款单，记录客户实际回款。")
            .with_field(FieldDefinition::new(
                "customer_id",
                "客户",
                "select",
                "付款客户",
                true,
                "1001",
            ))
            .with_field(FieldDefinition::new(
                "amount",
                "收款金额",
                "number",
                "实际收款金额（元）",
                true,
                "120000.00",
            ))
            .with_field(FieldDefinition::new(
                "collection_date",
                "收款日期",
                "date",
                "款项入账日期",
                true,
                "2026-07-18",
            ))
            .with_field(FieldDefinition::new(
                "method",
                "收款方式",
                "select",
                "收款方式：银行转账/现金/支票/电汇",
                true,
                "银行转账",
            ))
            .with_field(FieldDefinition::new(
                "receivable_id",
                "核销应收",
                "select",
                "本次收款核销的应收单号",
                false,
                "AR001",
            ))
            .with_example(json!({
                "customer_id": "1001",
                "amount": 120000.00,
                "collection_date": "2026-07-18",
                "method": "银行转账",
                "receivable_id": "AR001"
            })),
    );

    // 19. 付款
    registry.register(
        FormConfig::new("payment", "付款", FormDomain::ErpFinance)
            .with_description("付款单，记录向供应商的实际付款。")
            .with_field(FieldDefinition::new(
                "supplier_id",
                "供应商",
                "select",
                "收款供应商",
                true,
                "S001",
            ))
            .with_field(FieldDefinition::new(
                "amount",
                "付款金额",
                "number",
                "实际付款金额（元）",
                true,
                "80000.00",
            ))
            .with_field(FieldDefinition::new(
                "payment_date",
                "付款日期",
                "date",
                "款项出账日期",
                true,
                "2026-07-19",
            ))
            .with_field(FieldDefinition::new(
                "method",
                "付款方式",
                "select",
                "付款方式：银行转账/现金/支票/电汇",
                true,
                "银行转账",
            ))
            .with_example(json!({
                "supplier_id": "S001",
                "amount": 80000.00,
                "payment_date": "2026-07-19",
                "method": "银行转账"
            })),
    );

    // 20. 费用
    registry.register(
        FormConfig::new("expense", "费用", FormDomain::ErpFinance)
            .with_description("费用报销单，记录员工发生的费用支出。")
            .with_field(FieldDefinition::new(
                "applicant",
                "申请人",
                "select",
                "费用申请人",
                true,
                "U001",
            ))
            .with_field(FieldDefinition::new(
                "category",
                "费用类别",
                "select",
                "费用类别：差旅/招待/办公/交通",
                true,
                "差旅",
            ))
            .with_field(FieldDefinition::new(
                "amount",
                "报销金额",
                "number",
                "报销金额（元）",
                true,
                "3200.00",
            ))
            .with_field(FieldDefinition::new(
                "occur_date",
                "发生日期",
                "date",
                "费用发生日期",
                true,
                "2026-07-15",
            ))
            .with_field(FieldDefinition::new(
                "description",
                "费用说明",
                "textarea",
                "费用详细说明",
                true,
                "上海客户现场实施差旅，含机票与住宿",
            ))
            .with_example(json!({
                "applicant": "U001",
                "category": "差旅",
                "amount": 3200.00,
                "occur_date": "2026-07-15",
                "description": "上海客户现场实施差旅，含机票与住宿"
            }))
            .with_validation_rule(FormValidationRule::new(
                "amount",
                "range",
                "金额需大于 0",
            )),
    );

    // 21. 预算
    registry.register(
        FormConfig::new("budget", "预算", FormDomain::ErpFinance)
            .with_description("部门/项目预算单，记录预算总额与执行情况。")
            .with_field(FieldDefinition::new(
                "budget_no",
                "预算编号",
                "text",
                "预算单唯一编号",
                true,
                "BUD-2026-001",
            ))
            .with_field(FieldDefinition::new(
                "department_id",
                "预算部门",
                "select",
                "预算所属部门",
                true,
                "D001",
            ))
            .with_field(FieldDefinition::new(
                "period",
                "预算期间",
                "text",
                "预算期间，如 2026-Q3",
                true,
                "2026-Q3",
            ))
            .with_field(FieldDefinition::new(
                "total_amount",
                "预算总额",
                "number",
                "预算期间总金额（元）",
                true,
                "500000.00",
            ))
            .with_field(FieldDefinition::new(
                "category",
                "预算类别",
                "select",
                "预算类别：人力/差旅/采购/营销",
                true,
                "差旅",
            ))
            .with_example(json!({
                "budget_no": "BUD-2026-001",
                "department_id": "D001",
                "period": "2026-Q3",
                "total_amount": 500000.00,
                "category": "差旅"
            }))
            .with_business_term(BusinessTerm::new(
                "预算执行率",
                Some("Budget Execution Rate".to_string()),
                "已执行预算金额占预算总额的百分比。",
            )),
    );

    // 22. 会计科目
    registry.register(
        FormConfig::new("account", "会计科目", FormDomain::ErpFinance)
            .with_description("会计科目档案，定义科目编码、名称与类别。")
            .with_field(FieldDefinition::new(
                "code",
                "科目编码",
                "text",
                "会计科目编码",
                true,
                "1002",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "科目名称",
                "text",
                "会计科目名称",
                true,
                "银行存款",
            ))
            .with_field(FieldDefinition::new(
                "category",
                "科目类别",
                "select",
                "资产/负债/权益/成本/损益",
                true,
                "资产",
            ))
            .with_field(FieldDefinition::new(
                "balance_direction",
                "余额方向",
                "select",
                "借/贷",
                true,
                "借",
            ))
            .with_field(FieldDefinition::new(
                "parent_code",
                "上级科目",
                "text",
                "上级科目编码",
                false,
                "1000",
            ))
            .with_example(json!({
                "code": "1002",
                "name": "银行存款",
                "category": "资产",
                "balance_direction": "借",
                "parent_code": "1000"
            }))
            .with_validation_rule(FormValidationRule::new(
                "code",
                "format",
                "科目编码需为数字",
            ))
            .with_business_term(BusinessTerm::new(
                "借贷方向",
                Some("Debit/Credit".to_string()),
                "科目的默认余额方向，资产/成本类为借，负债/权益/损益类为贷。",
            )),
    );
}
