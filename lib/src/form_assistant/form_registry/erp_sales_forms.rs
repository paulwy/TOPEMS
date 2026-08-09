use super::common::{BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;
use serde_json::json;

// ==================== ERP 销售域（3 个表单） ====================

pub(super) fn register_erp_sales_forms(registry: &mut FormRegistry) {
    // 7. 销售订单
    registry.register(
        FormConfig::new("sales_order", "销售订单", FormDomain::ErpSales)
            .with_description("销售订单主表，记录客户订购商品、金额与交付要求。")
            .with_field(FieldDefinition::new(
                "order_no",
                "订单编号",
                "text",
                "销售订单唯一编号",
                true,
                "SO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "customer_id",
                "客户",
                "select",
                "下单客户 ID",
                true,
                "1001",
            ))
            .with_field(FieldDefinition::new(
                "order_date",
                "订单日期",
                "date",
                "订单签订日期",
                true,
                "2026-07-18",
            ))
            .with_field(FieldDefinition::new(
                "total_amount",
                "订单总金额",
                "number",
                "订单总金额（含税，元）",
                true,
                "120000.00",
            ))
            .with_field(FieldDefinition::new(
                "delivery_date",
                "交货日期",
                "date",
                "约定交货日期",
                true,
                "2026-08-01",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "订单状态",
                "select",
                "订单状态：草稿/已确认/已发货/已完成/已取消",
                true,
                "已确认",
            ))
            .with_example(json!({
                "order_no": "SO20260718001",
                "customer_id": "1001",
                "order_date": "2026-07-18",
                "total_amount": 120000.00,
                "delivery_date": "2026-08-01",
                "status": "已确认"
            }))
            .with_validation_rule(FormValidationRule::new(
                "order_no",
                "format",
                "订单编号需以 SO 开头并包含日期",
            ))
            .with_validation_rule(FormValidationRule::new(
                "total_amount",
                "range",
                "金额需大于 0",
            ))
            .with_validation_rule(FormValidationRule::new(
                "delivery_date",
                "logic",
                "交货日期应晚于订单日期",
            ))
            .with_business_term(BusinessTerm::new(
                "含税金额",
                Some("Tax-inclusive Amount".to_string()),
                "已包含增值税的金额，与不含税金额相对。",
            )),
    );

    // 8. 客户订单
    registry.register(
        FormConfig::new("customer_order", "客户订单", FormDomain::ErpSales)
            .with_description("客户在线下达的订单，与销售订单一一关联。")
            .with_field(FieldDefinition::new(
                "order_no",
                "订单编号",
                "text",
                "客户订单编号",
                true,
                "CO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "source",
                "下单渠道",
                "select",
                "下单来源：官网/小程序/电话",
                true,
                "官网",
            ))
            .with_field(FieldDefinition::new(
                "remark",
                "客户备注",
                "textarea",
                "客户的特殊要求或备注",
                false,
                "请加急配送并提供发票",
            ))
            .with_example(json!({
                "order_no": "CO20260718001",
                "source": "官网",
                "remark": "请加急配送并提供发票"
            })),
    );

    // 9. 报价单
    registry.register(
        FormConfig::new("quotation", "报价单", FormDomain::ErpSales)
            .with_description("向客户出具的报价单，可转为销售订单。")
            .with_field(FieldDefinition::new(
                "quote_no",
                "报价单号",
                "text",
                "报价单唯一编号",
                true,
                "QT20260718001",
            ))
            .with_field(FieldDefinition::new(
                "customer_id",
                "客户",
                "select",
                "报价对象客户",
                true,
                "1001",
            ))
            .with_field(FieldDefinition::new(
                "valid_until",
                "报价有效期",
                "date",
                "报价有效截止日期",
                true,
                "2026-08-18",
            ))
            .with_field(FieldDefinition::new(
                "total_amount",
                "报价总额",
                "number",
                "报价合计金额（元）",
                true,
                "98000.00",
            ))
            .with_example(json!({
                "quote_no": "QT20260718001",
                "customer_id": "1001",
                "valid_until": "2026-08-18",
                "total_amount": 98000.00
            }))
            .with_validation_rule(FormValidationRule::new(
                "valid_until",
                "logic",
                "有效期需晚于报价日期",
            )),
    );
}
