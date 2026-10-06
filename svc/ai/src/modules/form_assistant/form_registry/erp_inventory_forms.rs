use super::common::{BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;
use serde_json::json;

// ==================== ERP 库存域（3 个表单） ====================

pub(super) fn register_erp_inventory_forms(registry: &mut FormRegistry) {
    // 23. 库存
    registry.register(
        FormConfig::new("inventory", "库存", FormDomain::ErpInventory)
            .with_description("库存台账，记录物料的现存数量与仓库分布。")
            .with_field(FieldDefinition::new(
                "material_id",
                "物料",
                "select",
                "物料 ID",
                true,
                "M001",
            ))
            .with_field(FieldDefinition::new(
                "warehouse_id",
                "仓库",
                "select",
                "所在仓库 ID",
                true,
                "W001",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "库存数量",
                "number",
                "当前库存数量",
                true,
                "500",
            ))
            .with_field(FieldDefinition::new(
                "safety_stock",
                "安全库存",
                "number",
                "安全库存阈值",
                false,
                "100",
            ))
            .with_field(FieldDefinition::new(
                "unit",
                "单位",
                "select",
                "库存单位：个/千克/米",
                true,
                "个",
            ))
            .with_example(json!({
                "material_id": "M001",
                "warehouse_id": "W001",
                "quantity": 500,
                "safety_stock": 100,
                "unit": "个"
            }))
            .with_validation_rule(FormValidationRule::new(
                "quantity",
                "range",
                "库存数量需大于等于 0",
            ))
            .with_business_term(BusinessTerm::new(
                "安全库存",
                Some("Safety Stock".to_string()),
                "为应对需求波动而设定的最低库存阈值，低于此值需触发采购。",
            )),
    );

    // 24. 物料
    registry.register(
        FormConfig::new("material", "物料", FormDomain::ErpInventory)
            .with_description("物料档案，定义物料编码、名称、规格与单位。")
            .with_field(FieldDefinition::new(
                "code",
                "物料编码",
                "text",
                "物料唯一编码",
                true,
                "M001",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "物料名称",
                "text",
                "物料中文名称",
                true,
                "M8 螺栓",
            ))
            .with_field(FieldDefinition::new(
                "specification",
                "规格型号",
                "text",
                "规格型号描述",
                false,
                "M8×30 不锈钢",
            ))
            .with_field(FieldDefinition::new(
                "category",
                "物料类别",
                "select",
                "原料/成品/半成品/辅料",
                true,
                "原料",
            ))
            .with_field(FieldDefinition::new(
                "unit",
                "计量单位",
                "select",
                "计量单位：个/千克/米",
                true,
                "个",
            ))
            .with_example(json!({
                "code": "M001",
                "name": "M8 螺栓",
                "specification": "M8×30 不锈钢",
                "category": "原料",
                "unit": "个"
            })),
    );

    // 25. 仓库
    registry.register(
        FormConfig::new("warehouse", "仓库", FormDomain::ErpInventory)
            .with_description("仓库档案，记录仓库基本信息与责任人。")
            .with_field(FieldDefinition::new(
                "code",
                "仓库编码",
                "text",
                "仓库唯一编码",
                true,
                "W001",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "仓库名称",
                "text",
                "仓库名称",
                true,
                "上海主仓库",
            ))
            .with_field(FieldDefinition::new(
                "location",
                "仓库地址",
                "textarea",
                "仓库物理地址",
                false,
                "上海市浦东新区XX路XX号",
            ))
            .with_field(FieldDefinition::new(
                "manager",
                "仓管员",
                "select",
                "仓库负责人",
                true,
                "U002",
            ))
            .with_example(json!({
                "code": "W001",
                "name": "上海主仓库",
                "location": "上海市浦东新区XX路XX号",
                "manager": "U002"
            })),
    );
}
