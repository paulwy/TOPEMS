use super::common::{BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;
use serde_json::json;

// ==================== ERP 生产域（3 个表单） ====================

pub(super) fn register_erp_production_forms(registry: &mut FormRegistry) {
    // 12. 生产订单
    registry.register(
        FormConfig::new("production_order", "生产订单", FormDomain::ErpProduction)
            .with_description("生产订单主表，记录生产任务、计划产量与完工情况。")
            .with_field(FieldDefinition::new(
                "order_no",
                "生产单号",
                "text",
                "生产订单唯一编号",
                true,
                "MO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "product_id",
                "产品",
                "select",
                "生产的产品 ID",
                true,
                "P001",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "计划产量",
                "number",
                "计划生产数量",
                true,
                "1000",
            ))
            .with_field(FieldDefinition::new(
                "planned_start",
                "计划开始日期",
                "date",
                "生产计划开始日期",
                true,
                "2026-07-20",
            ))
            .with_field(FieldDefinition::new(
                "planned_end",
                "计划完工日期",
                "date",
                "生产计划完工日期",
                true,
                "2026-07-30",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "生产状态",
                "select",
                "状态：已下达/已开工/已完工/已关闭",
                true,
                "已下达",
            ))
            .with_example(json!({
                "order_no": "MO20260718001",
                "product_id": "P001",
                "quantity": 1000,
                "planned_start": "2026-07-20",
                "planned_end": "2026-07-30",
                "status": "已下达"
            }))
            .with_validation_rule(FormValidationRule::new(
                "planned_end",
                "logic",
                "计划完工日期需晚于开始日期",
            ))
            .with_business_term(BusinessTerm::new(
                "BOM",
                Some("Bill of Materials".to_string()),
                "物料清单，描述生产一个产品所需的原材料及其数量。",
            )),
    );

    // 13. 工单
    registry.register(
        FormConfig::new("work_order", "工单", FormDomain::ErpProduction)
            .with_description("车间工单，由生产订单拆分而来，对应具体工序。")
            .with_field(FieldDefinition::new(
                "work_order_no",
                "工单号",
                "text",
                "工单唯一编号",
                true,
                "WO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "production_order_id",
                "生产订单",
                "select",
                "关联的生产订单",
                true,
                "MO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "process",
                "工序",
                "select",
                "对应工序：下料/加工/装配/检验",
                true,
                "装配",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "工单数量",
                "number",
                "工单需完成的数量",
                true,
                "500",
            ))
            .with_example(json!({
                "work_order_no": "WO20260718001",
                "production_order_id": "MO20260718001",
                "process": "装配",
                "quantity": 500
            })),
    );

    // 14. 物料清单
    registry.register(
        FormConfig::new("bom", "物料清单", FormDomain::ErpProduction)
            .with_description("产品 BOM，定义产品的组成物料及用量。")
            .with_field(FieldDefinition::new(
                "product_id",
                "产品",
                "select",
                "BOM 所属产品",
                true,
                "P001",
            ))
            .with_field(FieldDefinition::new(
                "material_id",
                "物料",
                "select",
                "BOM 子项物料",
                true,
                "M001",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "用量",
                "number",
                "单个产品所需物料数量",
                true,
                "2",
            ))
            .with_field(FieldDefinition::new(
                "unit",
                "单位",
                "select",
                "用量单位：个/千克/米",
                true,
                "个",
            ))
            .with_example(json!({
                "product_id": "P001",
                "material_id": "M001",
                "quantity": 2,
                "unit": "个"
            })),
    );
}
