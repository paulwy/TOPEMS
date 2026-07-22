use serde_json::json;
use super::common::{AiFeatures, BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;

// ==================== RD 域（2 个表单） ====================

pub(super) fn register_rd_forms(registry: &mut FormRegistry) {
    registry.register(
        FormConfig::new("experiment", "实验记录", FormDomain::Rd)
            .with_description("研发实验记录，记录实验过程、数据与结论。")
            .with_field(FieldDefinition::new(
                "exp_no",
                "实验编号",
                "text",
                "实验记录唯一编号",
                true,
                "EXP20260718001",
            ))
            .with_field(FieldDefinition::new(
                "project_id",
                "所属项目",
                "select",
                "关联的研发项目",
                true,
                "RDP-001",
            ))
            .with_field(FieldDefinition::new(
                "exp_title",
                "实验名称",
                "text",
                "实验主题名称",
                true,
                "新型合金材料强度测试",
            ))
            .with_field(FieldDefinition::new(
                "exp_type",
                "实验类型",
                "select",
                "类型：性能测试/配方试验/工艺验证/可靠性测试",
                true,
                "性能测试",
            ))
            .with_field(FieldDefinition::new(
                "researcher",
                "实验人员",
                "select",
                "负责实验的研发人员",
                true,
                "U007",
            ))
            .with_field(FieldDefinition::new(
                "exp_date",
                "实验日期",
                "date",
                "实验开展日期",
                true,
                "2026-07-18",
            ))
            .with_field(FieldDefinition::new(
                "process",
                "实验过程",
                "textarea",
                "实验步骤与操作记录",
                true,
                "1. 制备试样5组 2. 使用万能试验机进行拉伸测试 3. 记录每组屈服强度与抗拉强度",
            ))
            .with_field(FieldDefinition::new(
                "conclusion",
                "实验结论",
                "textarea",
                "实验结果分析与结论",
                false,
                "",
            ))
            .with_example(json!({
                "exp_no": "EXP20260718001",
                "project_id": "RDP-001",
                "exp_title": "新型合金材料强度测试",
                "exp_type": "性能测试",
                "researcher": "U007",
                "exp_date": "2026-07-18",
                "process": "1. 制备试样5组 2. 使用万能试验机进行拉伸测试 3. 记录每组屈服强度与抗拉强度",
                "conclusion": ""
            }))
            .with_business_term(BusinessTerm::new(
                "原始记录",
                Some("Raw Record".to_string()),
                "实验过程中直接记录的第一手数据，需保持原始、真实、可追溯。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: true,
                validate: true,
                translate: false,
            }),
    );

    registry.register(
        FormConfig::new("rd_project", "研发项目", FormDomain::Rd)
            .with_description("研发项目档案，记录项目立项、进度与成果。")
            .with_field(FieldDefinition::new(
                "project_code",
                "项目编号",
                "text",
                "研发项目唯一编号",
                true,
                "RDP-001",
            ))
            .with_field(FieldDefinition::new(
                "project_name",
                "项目名称",
                "text",
                "研发项目名称",
                true,
                "新一代高强度合金材料研发",
            ))
            .with_field(FieldDefinition::new(
                "project_type",
                "项目类型",
                "select",
                "类型：新产品开发/工艺改进/材料研发/预研",
                true,
                "材料研发",
            ))
            .with_field(FieldDefinition::new(
                "project_manager",
                "项目经理",
                "select",
                "研发项目负责人",
                true,
                "U007",
            ))
            .with_field(FieldDefinition::new(
                "start_date",
                "立项日期",
                "date",
                "项目立项日期",
                true,
                "2026-01-01",
            ))
            .with_field(FieldDefinition::new(
                "planned_end",
                "计划完成日期",
                "date",
                "项目预计完成日期",
                true,
                "2026-12-31",
            ))
            .with_field(FieldDefinition::new(
                "budget",
                "研发预算",
                "number",
                "项目预算金额（元）",
                false,
                "5000000",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "项目状态",
                "select",
                "状态：立项中/进行中/已完成/已暂停/已取消",
                true,
                "进行中",
            ))
            .with_example(json!({
                "project_code": "RDP-001",
                "project_name": "新一代高强度合金材料研发",
                "project_type": "材料研发",
                "project_manager": "U007",
                "start_date": "2026-01-01",
                "planned_end": "2026-12-31",
                "budget": 5000000,
                "status": "进行中"
            }))
            .with_validation_rule(FormValidationRule::new(
                "planned_end",
                "logic",
                "计划完成日期需晚于立项日期",
            ))
            .with_business_term(BusinessTerm::new(
                "里程碑评审",
                Some("Milestone Review".to_string()),
                "研发项目在关键节点进行的阶段性评审，通过后方可进入下一阶段。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: true,
                validate: true,
                translate: false,
            }),
    );
}
