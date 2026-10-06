use super::common::{AiFeatures, BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;
use serde_json::json;

// ==================== HRM 域（2 个表单） ====================

pub(super) fn register_hrm_forms(registry: &mut FormRegistry) {
    registry.register(
        FormConfig::new("employee", "员工档案", FormDomain::Hrm)
            .with_description("员工档案主表，记录员工基本信息、岗位与入职信息。")
            .with_field(FieldDefinition::new(
                "emp_no",
                "工号",
                "text",
                "员工唯一工号",
                true,
                "E2026001",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "姓名",
                "text",
                "员工姓名",
                true,
                "张三",
            ))
            .with_field(FieldDefinition::new(
                "gender",
                "性别",
                "select",
                "性别：男/女",
                true,
                "男",
            ))
            .with_field(FieldDefinition::new(
                "department_id",
                "所属部门",
                "select",
                "员工所在部门",
                true,
                "D001",
            ))
            .with_field(FieldDefinition::new(
                "position_id",
                "岗位",
                "select",
                "员工岗位",
                true,
                "POS-001",
            ))
            .with_field(FieldDefinition::new(
                "entry_date",
                "入职日期",
                "date",
                "员工入职日期",
                true,
                "2026-01-15",
            ))
            .with_field(FieldDefinition::new(
                "phone",
                "联系电话",
                "text",
                "员工手机号",
                true,
                "13800138000",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "员工状态",
                "select",
                "状态：在职/离职/试用/休假中",
                true,
                "在职",
            ))
            .with_example(json!({
                "emp_no": "E2026001",
                "name": "张三",
                "gender": "男",
                "department_id": "D001",
                "position_id": "POS-001",
                "entry_date": "2026-01-15",
                "phone": "13800138000",
                "status": "在职"
            }))
            .with_validation_rule(
                FormValidationRule::new("phone", "format", "手机号需为 11 位数字")
                    .with_pattern(r"^1\d{10}$"),
            )
            .with_business_term(BusinessTerm::new(
                "试用期",
                Some("Probation Period".to_string()),
                "新员工入职后的考察期，期满考核合格后转为正式员工。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: false,
                validate: true,
                translate: false,
            }),
    );

    registry.register(
        FormConfig::new("attendance", "考勤记录", FormDomain::Hrm)
            .with_description("员工考勤记录，记录每日打卡、请假与加班情况。")
            .with_field(FieldDefinition::new(
                "emp_no",
                "员工工号",
                "text",
                "员工工号",
                true,
                "E2026001",
            ))
            .with_field(FieldDefinition::new(
                "attendance_date",
                "考勤日期",
                "date",
                "考勤日期",
                true,
                "2026-07-18",
            ))
            .with_field(FieldDefinition::new(
                "check_in",
                "上班打卡时间",
                "date",
                "实际上班打卡时间",
                false,
                "2026-07-18 08:55",
            ))
            .with_field(FieldDefinition::new(
                "check_out",
                "下班打卡时间",
                "date",
                "实际下班打卡时间",
                false,
                "2026-07-18 18:05",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "考勤状态",
                "select",
                "状态：正常/迟到/早退/缺勤/请假/出差",
                true,
                "正常",
            ))
            .with_field(FieldDefinition::new(
                "overtime_hours",
                "加班时长",
                "number",
                "当日加班小时数",
                false,
                "0",
            ))
            .with_field(FieldDefinition::new(
                "leave_type",
                "请假类型",
                "select",
                "请假类型：事假/病假/年假/婚假/产假",
                false,
                "",
            ))
            .with_field(FieldDefinition::new(
                "remark",
                "备注",
                "textarea",
                "异常考勤说明",
                false,
                "",
            ))
            .with_example(json!({
                "emp_no": "E2026001",
                "attendance_date": "2026-07-18",
                "check_in": "2026-07-18 08:55",
                "check_out": "2026-07-18 18:05",
                "status": "正常",
                "overtime_hours": 2,
                "leave_type": "",
                "remark": ""
            }))
            .with_business_term(BusinessTerm::new(
                "全勤",
                Some("Perfect Attendance".to_string()),
                "在规定工作日内无迟到、早退、缺勤、请假的出勤状态。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: false,
                validate: true,
                translate: false,
            }),
    );
}
