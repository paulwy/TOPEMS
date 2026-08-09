use super::common::{BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;
use serde_json::json;

// ==================== ERP 采购域（2 个表单） ====================

pub(super) fn register_erp_purchase_forms(registry: &mut FormRegistry) {
    // 10. 采购订单
    registry.register(
        FormConfig::new("purchase_order", "采购订单", FormDomain::ErpPurchase)
            .with_description("采购订单主表，记录向供应商采购商品的信息。")
            .with_field(FieldDefinition::new(
                "order_no",
                "采购单号",
                "text",
                "采购订单唯一编号",
                true,
                "PO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "supplier_id",
                "供应商",
                "select",
                "供应商 ID",
                true,
                "S001",
            ))
            .with_field(FieldDefinition::new(
                "order_date",
                "采购日期",
                "date",
                "采购订单下达日期",
                true,
                "2026-07-18",
            ))
            .with_field(FieldDefinition::new(
                "total_amount",
                "采购总额",
                "number",
                "采购总金额（元）",
                true,
                "80000.00",
            ))
            .with_field(FieldDefinition::new(
                "expected_date",
                "预计到货日期",
                "date",
                "供应商预计到货日期",
                true,
                "2026-07-25",
            ))
            .with_example(json!({
                "order_no": "PO20260718001",
                "supplier_id": "S001",
                "order_date": "2026-07-18",
                "total_amount": 80000.00,
                "expected_date": "2026-07-25"
            }))
            .with_validation_rule(FormValidationRule::new(
                "order_no",
                "format",
                "采购单号需以 PO 开头",
            ))
            .with_business_term(BusinessTerm::new(
                "采购到货",
                Some("Goods Receipt".to_string()),
                "供应商交付采购商品并由仓库验收入库的过程。",
            )),
    );

    // 11. 供应商订单
    registry.register(
        FormConfig::new("supplier_order", "供应商订单", FormDomain::ErpPurchase)
            .with_description("供应商确认的订单，对账采购订单的执行情况。")
            .with_field(FieldDefinition::new(
                "order_no",
                "供应商订单号",
                "text",
                "供应商系统中的订单编号",
                true,
                "SO-V001",
            ))
            .with_field(FieldDefinition::new(
                "purchase_order_id",
                "采购订单",
                "select",
                "关联的采购订单 ID",
                true,
                "PO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "confirmed_date",
                "确认日期",
                "date",
                "供应商确认订单的日期",
                true,
                "2026-07-19",
            ))
            .with_example(json!({
                "order_no": "SO-V001",
                "purchase_order_id": "PO20260718001",
                "confirmed_date": "2026-07-19"
            })),
    );
}
