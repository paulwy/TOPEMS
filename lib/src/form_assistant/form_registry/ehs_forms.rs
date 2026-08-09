use super::common::{AiFeatures, BusinessTerm, FieldDefinition, FormDomain};
use super::config::FormConfig;
use super::registry::FormRegistry;
use serde_json::json;

// ==================== EHS 域（2 个表单） ====================

pub(super) fn register_ehs_forms(registry: &mut FormRegistry) {
    registry.register(
        FormConfig::new("safety_check", "安全检查", FormDomain::Ehs)
            .with_description("安全检查记录，记录现场安全巡检与隐患排查情况。")
            .with_field(FieldDefinition::new(
                "check_no",
                "检查编号",
                "text",
                "安全检查唯一编号",
                true,
                "SC20260718001",
            ))
            .with_field(FieldDefinition::new(
                "check_type",
                "检查类型",
                "select",
                "类型：日常巡检/专项检查/节前检查/年度检查",
                true,
                "日常巡检",
            ))
            .with_field(FieldDefinition::new(
                "check_area",
                "检查区域",
                "select",
                "检查的区域或车间",
                true,
                "装配车间",
            ))
            .with_field(FieldDefinition::new(
                "checker",
                "检查人",
                "select",
                "负责检查的安全人员",
                true,
                "U006",
            ))
            .with_field(FieldDefinition::new(
                "check_date",
                "检查日期",
                "date",
                "检查发生日期",
                true,
                "2026-07-18",
            ))
            .with_field(FieldDefinition::new(
                "issues_found",
                "发现问题",
                "textarea",
                "检查中发现的安全隐患描述",
                false,
                "3号工位消防通道被物料占用",
            ))
            .with_field(FieldDefinition::new(
                "rectification_required",
                "是否需整改",
                "bool",
                "是否需要整改",
                true,
                "是",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "检查状态",
                "select",
                "状态：正常/待整改/整改中/已复核",
                true,
                "待整改",
            ))
            .with_example(json!({
                "check_no": "SC20260718001",
                "check_type": "日常巡检",
                "check_area": "装配车间",
                "checker": "U006",
                "check_date": "2026-07-18",
                "issues_found": "3号工位消防通道被物料占用",
                "rectification_required": true,
                "status": "待整改"
            }))
            .with_business_term(BusinessTerm::new(
                "三违",
                Some("Three Violations".to_string()),
                "违章指挥、违章操作、违反劳动纪律，是安全检查的重点排查内容。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: true,
                validate: true,
                translate: false,
            }),
    );

    registry.register(
        FormConfig::new("incident_report", "事故报告", FormDomain::Ehs)
            .with_description("安全事故报告，记录事故经过、原因与处理措施。")
            .with_field(FieldDefinition::new(
                "incident_no",
                "事故编号",
                "text",
                "事故报告唯一编号",
                true,
                "INC20260718001",
            ))
            .with_field(FieldDefinition::new(
                "title",
                "事故标题",
                "text",
                "事故简明描述",
                true,
                "装配车间叉车剐蹭货架事件",
            ))
            .with_field(FieldDefinition::new(
                "incident_type",
                "事故类型",
                "select",
                "类型：人身伤害/设备损坏/火灾/化学品泄漏/环境污染",
                true,
                "设备损坏",
            ))
            .with_field(FieldDefinition::new(
                "severity",
                "严重等级",
                "select",
                "等级：一般/较大/重大/特别重大",
                true,
                "一般",
            ))
            .with_field(FieldDefinition::new(
                "location",
                "事故地点",
                "text",
                "事故发生具体位置",
                true,
                "装配车间西区A-12货架",
            ))
            .with_field(FieldDefinition::new(
                "incident_time",
                "发生时间",
                "date",
                "事故发生时间",
                true,
                "2026-07-18 10:30",
            ))
            .with_field(FieldDefinition::new(
                "description",
                "事故经过",
                "textarea",
                "事故详细经过描述",
                true,
                "叉车驾驶员在倒车时未注意后方，剐蹭到A-12货架，导致货架变形",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "处理状态",
                "select",
                "状态：已上报/调查中/处理中/已结案",
                true,
                "调查中",
            ))
            .with_example(json!({
                "incident_no": "INC20260718001",
                "title": "装配车间叉车剐蹭货架事件",
                "incident_type": "设备损坏",
                "severity": "一般",
                "location": "装配车间西区A-12货架",
                "incident_time": "2026-07-18 10:30",
                "description": "叉车驾驶员在倒车时未注意后方，剐蹭到A-12货架，导致货架变形",
                "status": "调查中"
            }))
            .with_business_term(BusinessTerm::new(
                "四不放过",
                Some("Four Nons".to_string()),
                "事故处理原则：原因未查清不放过、责任人未处理不放过、整改措施未落实不放过、有关人员未受到教育不放过。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: true,
                validate: true,
                translate: false,
            }),
    );
}
