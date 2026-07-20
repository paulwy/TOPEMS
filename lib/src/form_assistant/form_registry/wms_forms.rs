use serde_json::json;
use super::common::{AiFeatures, BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;

// ==================== WMS 域（2 个表单） ====================

pub(super) fn register_wms_forms(registry: &mut FormRegistry) {
    registry.register(
        FormConfig::new("inbound_order", "入库单", FormDomain::Wms)
            .with_description("入库单，记录物料或商品入库的明细信息。")
            .with_field(FieldDefinition::new(
                "inbound_no",
                "入库单号",
                "text",
                "入库单唯一编号",
                true,
                "IN20260718001",
            ))
            .with_field(FieldDefinition::new(
                "inbound_type",
                "入库类型",
                "select",
                "类型：采购入库/生产入库/退货入库/调拨入库",
                true,
                "采购入库",
            ))
            .with_field(FieldDefinition::new(
                "source_order",
                "源单据号",
                "text",
                "关联的来源单据号（采购订单/生产订单等）",
                false,
                "PO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "warehouse_id",
                "入库仓库",
                "select",
                "接收物料的仓库",
                true,
                "W001",
            ))
            .with_field(FieldDefinition::new(
                "material_id",
                "物料",
                "select",
                "入库物料 ID",
                true,
                "M001",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "入库数量",
                "number",
                "实际入库数量",
                true,
                "500",
            ))
            .with_field(FieldDefinition::new(
                "operator",
                "经办人",
                "select",
                "入库经办人",
                true,
                "U002",
            ))
            .with_field(FieldDefinition::new(
                "inbound_date",
                "入库日期",
                "date",
                "实际入库日期",
                true,
                "2026-07-18",
            ))
            .with_example(json!({
                "inbound_no": "IN20260718001",
                "inbound_type": "采购入库",
                "source_order": "PO20260718001",
                "warehouse_id": "W001",
                "material_id": "M001",
                "quantity": 500,
                "operator": "U002",
                "inbound_date": "2026-07-18"
            }))
            .with_validation_rule(FormValidationRule::new(
                "quantity",
                "range",
                "入库数量需大于 0",
            ))
            .with_business_term(BusinessTerm::new(
                "库位",
                Some("Location".to_string()),
                "仓库中具体存放物料的位置，通常按库区-排-列-层编码。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: false,
                validate: true,
                translate: false,
            }),
    );

    registry.register(
        FormConfig::new("outbound_order", "出库单", FormDomain::Wms)
            .with_description("出库单，记录物料或商品出库的明细信息。")
            .with_field(FieldDefinition::new(
                "outbound_no",
                "出库单号",
                "text",
                "出库单唯一编号",
                true,
                "OUT20260718001",
            ))
            .with_field(FieldDefinition::new(
                "outbound_type",
                "出库类型",
                "select",
                "类型：销售出库/生产领料/调拨出库/退货出库",
                true,
                "销售出库",
            ))
            .with_field(FieldDefinition::new(
                "source_order",
                "源单据号",
                "text",
                "关联的来源单据号（销售订单/工单等）",
                false,
                "SO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "warehouse_id",
                "出库仓库",
                "select",
                "发出物料的仓库",
                true,
                "W001",
            ))
            .with_field(FieldDefinition::new(
                "material_id",
                "物料",
                "select",
                "出库物料 ID",
                true,
                "P001",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "出库数量",
                "number",
                "实际出库数量",
                true,
                "100",
            ))
            .with_field(FieldDefinition::new(
                "operator",
                "经办人",
                "select",
                "出库经办人",
                true,
                "U002",
            ))
            .with_field(FieldDefinition::new(
                "outbound_date",
                "出库日期",
                "date",
                "实际出库日期",
                true,
                "2026-07-18",
            ))
            .with_example(json!({
                "outbound_no": "OUT20260718001",
                "outbound_type": "销售出库",
                "source_order": "SO20260718001",
                "warehouse_id": "W001",
                "material_id": "P001",
                "quantity": 100,
                "operator": "U002",
                "outbound_date": "2026-07-18"
            }))
            .with_validation_rule(FormValidationRule::new(
                "quantity",
                "range",
                "出库数量需大于 0 且不超过可用库存",
            ))
            .with_business_term(BusinessTerm::new(
                "先进先出",
                Some("FIFO".to_string()),
                "First In First Out，先入库的物料先出库，确保物料效期管理。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: false,
                validate: true,
                translate: false,
            }),
    );
}
