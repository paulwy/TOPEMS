use serde_json::json;
use super::common::{AiFeatures, BusinessTerm, FieldDefinition, FormDomain};
use super::config::FormConfig;
use super::registry::FormRegistry;

// ==================== LIMS 域（2 个表单） ====================

pub(super) fn register_lims_forms(registry: &mut FormRegistry) {
    registry.register(
        FormConfig::new("sample", "样品登记", FormDomain::Lims)
            .with_description("实验室样品登记表，记录样品基本信息与接收状态。")
            .with_field(FieldDefinition::new(
                "sample_no",
                "样品编号",
                "text",
                "样品唯一编号",
                true,
                "SMP20260718001",
            ))
            .with_field(FieldDefinition::new(
                "sample_name",
                "样品名称",
                "text",
                "样品名称",
                true,
                "M8不锈钢螺栓",
            ))
            .with_field(FieldDefinition::new(
                "sample_type",
                "样品类型",
                "select",
                "类型：原材料/成品/半成品/环境样品",
                true,
                "原材料",
            ))
            .with_field(FieldDefinition::new(
                "sender",
                "送样单位/人",
                "text",
                "送样部门或人员",
                true,
                "质量部-张三",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "样品数量",
                "number",
                "送检样品数量",
                true,
                "20",
            ))
            .with_field(FieldDefinition::new(
                "receive_date",
                "收样日期",
                "date",
                "实验室收到样品的日期",
                true,
                "2026-07-18",
            ))
            .with_field(FieldDefinition::new(
                "inspection_items",
                "检测项目",
                "textarea",
                "需要检测的项目清单",
                true,
                "尺寸测量、硬度测试、盐雾试验",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "样品状态",
                "select",
                "状态：待检测/检测中/已完成/已废弃",
                true,
                "待检测",
            ))
            .with_example(json!({
                "sample_no": "SMP20260718001",
                "sample_name": "M8不锈钢螺栓",
                "sample_type": "原材料",
                "sender": "质量部-张三",
                "quantity": 20,
                "receive_date": "2026-07-18",
                "inspection_items": "尺寸测量、硬度测试、盐雾试验",
                "status": "待检测"
            }))
            .with_business_term(BusinessTerm::new(
                "留样",
                Some("Retention Sample".to_string()),
                "检测完成后保留的样品，用于复检或追溯，通常保存至保质期后半年。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: true,
                validate: true,
                translate: false,
            }),
    );

    registry.register(
        FormConfig::new("inspection_task", "检验任务", FormDomain::Lims)
            .with_description("实验室检验任务单，分配检测项目与人员。")
            .with_field(FieldDefinition::new(
                "task_no",
                "任务编号",
                "text",
                "检验任务唯一编号",
                true,
                "IT20260718001",
            ))
            .with_field(FieldDefinition::new(
                "sample_id",
                "样品编号",
                "select",
                "关联的样品编号",
                true,
                "SMP20260718001",
            ))
            .with_field(FieldDefinition::new(
                "test_item",
                "检测项目",
                "select",
                "具体检测项目",
                true,
                "硬度测试",
            ))
            .with_field(FieldDefinition::new(
                "test_method",
                "检测方法",
                "text",
                "采用的检测标准或方法",
                false,
                "GB/T 230.1-2018 洛氏硬度试验",
            ))
            .with_field(FieldDefinition::new(
                "inspector",
                "检测员",
                "select",
                "负责检测的人员",
                true,
                "U005",
            ))
            .with_field(FieldDefinition::new(
                "deadline",
                "截止日期",
                "date",
                "要求完成检测的日期",
                true,
                "2026-07-20",
            ))
            .with_field(FieldDefinition::new(
                "result",
                "检测结果",
                "textarea",
                "检测结果数据与判定",
                false,
                "HRC 28-32，符合要求",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "任务状态",
                "select",
                "状态：待分配/进行中/已完成/已审核",
                true,
                "进行中",
            ))
            .with_example(json!({
                "task_no": "IT20260718001",
                "sample_id": "SMP20260718001",
                "test_item": "硬度测试",
                "test_method": "GB/T 230.1-2018 洛氏硬度试验",
                "inspector": "U005",
                "deadline": "2026-07-20",
                "result": "",
                "status": "进行中"
            }))
            .with_business_term(BusinessTerm::new(
                "CNAS",
                Some("China National Accreditation Service".to_string()),
                "中国合格评定国家认可委员会，对实验室检测能力的权威认可。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: true,
                validate: true,
                translate: false,
            }),
    );
}
