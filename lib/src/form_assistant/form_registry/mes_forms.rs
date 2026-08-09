use super::common::{AiFeatures, BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;
use serde_json::json;

// ==================== MES 域（2 个表单） ====================

pub(super) fn register_mes_forms(registry: &mut FormRegistry) {
    registry.register(
        FormConfig::new("production_task", "生产任务", FormDomain::Mes)
            .with_description("车间生产任务单，由生产订单下达至具体产线。")
            .with_field(FieldDefinition::new(
                "task_no",
                "任务单号",
                "text",
                "生产任务唯一编号",
                true,
                "PT20260718001",
            ))
            .with_field(FieldDefinition::new(
                "production_order_id",
                "生产订单",
                "select",
                "关联的生产订单号",
                true,
                "MO20260718001",
            ))
            .with_field(FieldDefinition::new(
                "product_id",
                "产品",
                "select",
                "生产产品 ID",
                true,
                "P001",
            ))
            .with_field(FieldDefinition::new(
                "workcenter_id",
                "工作中心",
                "select",
                "执行任务的工作中心",
                true,
                "WC001",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "任务数量",
                "number",
                "本批次生产数量",
                true,
                "200",
            ))
            .with_field(FieldDefinition::new(
                "start_time",
                "开始时间",
                "date",
                "任务实际开始时间",
                false,
                "2026-07-18 08:00",
            ))
            .with_field(FieldDefinition::new(
                "end_time",
                "结束时间",
                "date",
                "任务实际完成时间",
                false,
                "2026-07-18 16:00",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "任务状态",
                "select",
                "状态：待开工/生产中/已完工/已暂停",
                true,
                "生产中",
            ))
            .with_example(json!({
                "task_no": "PT20260718001",
                "production_order_id": "MO20260718001",
                "product_id": "P001",
                "workcenter_id": "WC001",
                "quantity": 200,
                "start_time": "2026-07-18 08:00",
                "end_time": "",
                "status": "生产中"
            }))
            .with_validation_rule(FormValidationRule::new(
                "quantity",
                "range",
                "生产数量需大于 0",
            ))
            .with_business_term(BusinessTerm::new(
                "OEE",
                Some("Overall Equipment Effectiveness".to_string()),
                "设备综合效率，衡量设备有效利用率的指标，=时间利用率×性能利用率×良品率。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: false,
                validate: true,
                translate: false,
            }),
    );

    registry.register(
        FormConfig::new("workcenter", "工作中心", FormDomain::Mes)
            .with_description("工作中心档案，定义车间生产单元的基本信息与能力。")
            .with_field(FieldDefinition::new(
                "code",
                "工作中心编码",
                "text",
                "工作中心唯一编码",
                true,
                "WC001",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "工作中心名称",
                "text",
                "工作中心名称",
                true,
                "装配一线",
            ))
            .with_field(FieldDefinition::new(
                "type",
                "工作中心类型",
                "select",
                "类型：机加工/装配/检验/包装/仓储",
                true,
                "装配",
            ))
            .with_field(FieldDefinition::new(
                "capacity",
                "标准产能",
                "number",
                "单位时间标准产出（件/小时）",
                true,
                "50",
            ))
            .with_field(FieldDefinition::new(
                "operator_count",
                "操作工人数",
                "number",
                "标配操作人员数量",
                false,
                "6",
            ))
            .with_field(FieldDefinition::new(
                "workshop",
                "所属车间",
                "select",
                "所属车间部门",
                true,
                "装配车间",
            ))
            .with_field(FieldDefinition::new(
                "manager",
                "负责人",
                "select",
                "工作中心负责人",
                false,
                "U004",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "状态",
                "select",
                "状态：正常/停用/维护中",
                true,
                "正常",
            ))
            .with_example(json!({
                "code": "WC001",
                "name": "装配一线",
                "type": "装配",
                "capacity": 50,
                "operator_count": 6,
                "workshop": "装配车间",
                "manager": "U004",
                "status": "正常"
            }))
            .with_business_term(BusinessTerm::new(
                "标准工时",
                Some("Standard Time".to_string()),
                "在标准作业条件下，完成单位产品所需的规定时间。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: false,
                validate: true,
                translate: false,
            }),
    );
}
