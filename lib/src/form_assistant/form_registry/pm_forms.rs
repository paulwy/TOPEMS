use serde_json::json;
use super::common::{BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;

// ==================== PM 域（4 个表单） ====================

pub(super) fn register_pm_forms(registry: &mut FormRegistry) {
    // 26. 项目
    registry.register(
        FormConfig::new("project", "项目", FormDomain::Pm)
            .with_description("项目档案，记录项目基本信息、周期与预算。")
            .with_field(FieldDefinition::new(
                "code",
                "项目编号",
                "text",
                "项目唯一编号",
                true,
                "PRJ-2026-001",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "项目名称",
                "text",
                "项目名称",
                true,
                "云海 ERP 实施项目",
            ))
            .with_field(FieldDefinition::new(
                "manager",
                "项目经理",
                "select",
                "项目负责人",
                true,
                "U001",
            ))
            .with_field(FieldDefinition::new(
                "start_date",
                "开始日期",
                "date",
                "项目开始日期",
                true,
                "2026-07-01",
            ))
            .with_field(FieldDefinition::new(
                "end_date",
                "结束日期",
                "date",
                "项目预计结束日期",
                true,
                "2026-12-31",
            ))
            .with_field(FieldDefinition::new(
                "budget",
                "项目预算",
                "number",
                "项目预算总额（元）",
                false,
                "800000.00",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "项目状态",
                "select",
                "立项中/进行中/已完成/已暂停/已取消",
                true,
                "进行中",
            ))
            .with_example(json!({
                "code": "PRJ-2026-001",
                "name": "云海 ERP 实施项目",
                "manager": "U001",
                "start_date": "2026-07-01",
                "end_date": "2026-12-31",
                "budget": 800000.00,
                "status": "进行中"
            }))
            .with_validation_rule(FormValidationRule::new(
                "end_date",
                "logic",
                "结束日期需晚于开始日期",
            ))
            .with_business_term(BusinessTerm::new(
                "WBS",
                Some("Work Breakdown Structure".to_string()),
                "工作分解结构，将项目按层级分解为可管理的任务单元。",
            )),
    );

    // 27. 任务
    registry.register(
        FormConfig::new("task", "任务", FormDomain::Pm)
            .with_description("项目任务，可拆解为子任务，分配给项目成员。")
            .with_field(FieldDefinition::new(
                "title",
                "任务标题",
                "text",
                "任务简明标题",
                true,
                "需求调研",
            ))
            .with_field(FieldDefinition::new(
                "project_id",
                "所属项目",
                "select",
                "关联的项目 ID",
                true,
                "PRJ-2026-001",
            ))
            .with_field(FieldDefinition::new(
                "assignee",
                "负责人",
                "select",
                "任务负责人",
                true,
                "U001",
            ))
            .with_field(FieldDefinition::new(
                "start_date",
                "开始日期",
                "date",
                "任务开始日期",
                true,
                "2026-07-01",
            ))
            .with_field(FieldDefinition::new(
                "due_date",
                "截止日期",
                "date",
                "任务截止日期",
                true,
                "2026-07-10",
            ))
            .with_field(FieldDefinition::new(
                "progress",
                "进度",
                "number",
                "任务完成进度（0-100）",
                false,
                "50",
            ))
            .with_example(json!({
                "title": "需求调研",
                "project_id": "PRJ-2026-001",
                "assignee": "U001",
                "start_date": "2026-07-01",
                "due_date": "2026-07-10",
                "progress": 50
            }))
            .with_validation_rule(FormValidationRule::new(
                "progress",
                "range",
                "进度需在 0-100 之间",
            )),
    );

    // 28. 结算
    registry.register(
        FormConfig::new("settlement", "结算", FormDomain::Pm)
            .with_description("项目结算单，记录项目最终费用结算。")
            .with_field(FieldDefinition::new(
                "settlement_no",
                "结算单号",
                "text",
                "结算单唯一编号",
                true,
                "STL-2026-001",
            ))
            .with_field(FieldDefinition::new(
                "project_id",
                "所属项目",
                "select",
                "关联项目 ID",
                true,
                "PRJ-2026-001",
            ))
            .with_field(FieldDefinition::new(
                "total_cost",
                "实际总成本",
                "number",
                "项目实际发生的总成本",
                true,
                "750000.00",
            ))
            .with_field(FieldDefinition::new(
                "settle_date",
                "结算日期",
                "date",
                "结算日期",
                true,
                "2026-12-31",
            ))
            .with_field(FieldDefinition::new(
                "description",
                "结算说明",
                "textarea",
                "结算情况说明",
                true,
                "项目按期完工，实际成本低于预算 6.25%",
            ))
            .with_example(json!({
                "settlement_no": "STL-2026-001",
                "project_id": "PRJ-2026-001",
                "total_cost": 750000.00,
                "settle_date": "2026-12-31",
                "description": "项目按期完工，实际成本低于预算 6.25%"
            })),
    );

    // 29. 里程碑
    registry.register(
        FormConfig::new("milestone", "里程碑", FormDomain::Pm)
            .with_description("项目里程碑，标记关键节点。")
            .with_field(FieldDefinition::new(
                "name",
                "里程碑名称",
                "text",
                "里程碑简明名称",
                true,
                "需求确认",
            ))
            .with_field(FieldDefinition::new(
                "project_id",
                "所属项目",
                "select",
                "关联项目 ID",
                true,
                "PRJ-2026-001",
            ))
            .with_field(FieldDefinition::new(
                "planned_date",
                "计划日期",
                "date",
                "里程碑计划完成日期",
                true,
                "2026-07-15",
            ))
            .with_field(FieldDefinition::new(
                "actual_date",
                "实际日期",
                "date",
                "里程碑实际完成日期",
                false,
                "2026-07-14",
            ))
            .with_example(json!({
                "name": "需求确认",
                "project_id": "PRJ-2026-001",
                "planned_date": "2026-07-15",
                "actual_date": "2026-07-14"
            })),
    );
}
