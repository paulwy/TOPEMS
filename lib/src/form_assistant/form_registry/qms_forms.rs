use super::common::{AiFeatures, BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;
use serde_json::json;

// ==================== QMS 域（2 个表单） ====================

pub(super) fn register_qms_forms(registry: &mut FormRegistry) {
    registry.register(
        FormConfig::new("quality_inspection", "质量检验单", FormDomain::Qms)
            .with_description("质量检验单，记录来料、过程或成品的检验结果。")
            .with_field(FieldDefinition::new(
                "inspection_no",
                "检验单号",
                "text",
                "质量检验单唯一编号",
                true,
                "QI20260718001",
            ))
            .with_field(FieldDefinition::new(
                "inspection_type",
                "检验类型",
                "select",
                "检验类型：来料检验/过程检验/成品检验/出货检验",
                true,
                "来料检验",
            ))
            .with_field(FieldDefinition::new(
                "material_id",
                "物料",
                "select",
                "被检验物料 ID",
                true,
                "M001",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "检验数量",
                "number",
                "送检数量",
                true,
                "500",
            ))
            .with_field(FieldDefinition::new(
                "sample_size",
                "抽样数量",
                "number",
                "抽样检验的样本数量",
                false,
                "50",
            ))
            .with_field(FieldDefinition::new(
                "inspector",
                "检验员",
                "select",
                "负责检验的人员",
                true,
                "U003",
            ))
            .with_field(FieldDefinition::new(
                "result",
                "检验结果",
                "select",
                "检验结论：合格/不合格/特采/待判定",
                true,
                "合格",
            ))
            .with_field(FieldDefinition::new(
                "inspection_date",
                "检验日期",
                "date",
                "检验完成日期",
                true,
                "2026-07-18",
            ))
            .with_example(json!({
                "inspection_no": "QI20260718001",
                "inspection_type": "来料检验",
                "material_id": "M001",
                "quantity": 500,
                "sample_size": 50,
                "inspector": "U003",
                "result": "合格",
                "inspection_date": "2026-07-18"
            }))
            .with_validation_rule(FormValidationRule::new(
                "quantity",
                "range",
                "检验数量需大于 0",
            ))
            .with_business_term(BusinessTerm::new(
                "AQL",
                Some("Acceptable Quality Level".to_string()),
                "可接收质量水平，抽样检验中允许的最差过程平均质量水平。",
            ))
            .with_business_term(BusinessTerm::new(
                "特采",
                Some("Special Accept".to_string()),
                "对不合格品经评审后，在一定条件下特许接收的处理方式。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: false,
                validate: true,
                translate: false,
            }),
    );

    registry.register(
        FormConfig::new("quality_issue", "质量问题", FormDomain::Qms)
            .with_description("质量问题记录，跟踪不合格品及纠正预防措施。")
            .with_field(FieldDefinition::new(
                "issue_no",
                "问题编号",
                "text",
                "质量问题唯一编号",
                true,
                "QI-2026-001",
            ))
            .with_field(FieldDefinition::new(
                "title",
                "问题标题",
                "text",
                "质量问题简明描述",
                true,
                "M8螺栓尺寸超差",
            ))
            .with_field(FieldDefinition::new(
                "severity",
                "严重程度",
                "select",
                "严重等级：轻微/一般/严重/致命",
                true,
                "一般",
            ))
            .with_field(FieldDefinition::new(
                "source",
                "问题来源",
                "select",
                "来源：来料/生产/客户投诉/内审",
                true,
                "来料",
            ))
            .with_field(FieldDefinition::new(
                "description",
                "问题描述",
                "textarea",
                "质量问题的详细描述",
                true,
                "抽检发现 M8 螺栓外径超出公差上限 0.02mm",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "处理状态",
                "select",
                "状态：待处理/处理中/已关闭/验证中",
                true,
                "处理中",
            ))
            .with_field(FieldDefinition::new(
                "responsible",
                "责任人",
                "select",
                "负责处理的人员",
                true,
                "U003",
            ))
            .with_field(FieldDefinition::new(
                "found_date",
                "发现日期",
                "date",
                "问题发现日期",
                true,
                "2026-07-18",
            ))
            .with_example(json!({
                "issue_no": "QI-2026-001",
                "title": "M8螺栓尺寸超差",
                "severity": "一般",
                "source": "来料",
                "description": "抽检发现 M8 螺栓外径超出公差上限 0.02mm",
                "status": "处理中",
                "responsible": "U003",
                "found_date": "2026-07-18"
            }))
            .with_business_term(BusinessTerm::new(
                "CAR",
                Some("Corrective Action Request".to_string()),
                "纠正措施要求，针对已发生的不合格采取的消除原因的措施。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: true,
                validate: true,
                translate: false,
            }),
    );
}
