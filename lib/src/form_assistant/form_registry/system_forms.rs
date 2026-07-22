use serde_json::json;
use super::common::{FieldDefinition, FormDomain};
use super::config::FormConfig;
use super::registry::FormRegistry;

// ==================== 系统域（4 个表单） ====================

pub(super) fn register_system_forms(registry: &mut FormRegistry) {
    // 35. 租户
    registry.register(
        FormConfig::new("tenant", "租户", FormDomain::System)
            .with_description("租户档案，多租户架构下的隔离主体。")
            .with_field(FieldDefinition::new(
                "code",
                "租户编码",
                "text",
                "租户唯一编码",
                true,
                "T001",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "租户名称",
                "text",
                "租户企业名称",
                true,
                "云海科技",
            ))
            .with_field(FieldDefinition::new(
                "plan",
                "套餐版本",
                "select",
                "套餐：基础版/专业版/企业版",
                true,
                "企业版",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "租户状态",
                "select",
                "状态：试用/正式/已停用",
                true,
                "正式",
            ))
            .with_field(FieldDefinition::new(
                "expire_date",
                "到期日期",
                "date",
                "套餐到期日期",
                true,
                "2027-07-18",
            ))
            .with_example(json!({
                "code": "T001",
                "name": "云海科技",
                "plan": "企业版",
                "status": "正式",
                "expire_date": "2027-07-18"
            })),
    );

    // 36. 菜单
    registry.register(
        FormConfig::new("menu", "菜单", FormDomain::System)
            .with_description("系统菜单配置，支持多级菜单树。")
            .with_field(FieldDefinition::new(
                "code",
                "菜单编码",
                "text",
                "菜单唯一编码",
                true,
                "crm.customer",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "菜单名称",
                "text",
                "菜单显示名",
                true,
                "客户管理",
            ))
            .with_field(FieldDefinition::new(
                "path",
                "路由路径",
                "text",
                "前端路由路径",
                false,
                "/crm/customer",
            ))
            .with_field(FieldDefinition::new(
                "icon",
                "菜单图标",
                "text",
                "菜单图标名称",
                false,
                "user",
            ))
            .with_field(FieldDefinition::new(
                "parent_id",
                "上级菜单",
                "select",
                "上级菜单 ID",
                false,
                "",
            ))
            .with_example(json!({
                "code": "crm.customer",
                "name": "客户管理",
                "path": "/crm/customer",
                "icon": "user",
                "parent_id": ""
            })),
    );

    // 37. 字典
    registry.register(
        FormConfig::new("dict", "字典", FormDomain::System)
            .with_description("系统字典项，用于下拉选项等枚举值。")
            .with_field(FieldDefinition::new(
                "type",
                "字典类型",
                "text",
                "字典类型编码",
                true,
                "industry",
            ))
            .with_field(FieldDefinition::new(
                "label",
                "字典标签",
                "text",
                "字典项显示文本",
                true,
                "信息技术",
            ))
            .with_field(FieldDefinition::new(
                "value",
                "字典值",
                "text",
                "字典项实际值",
                true,
                "IT",
            ))
            .with_field(FieldDefinition::new(
                "sort",
                "排序",
                "number",
                "字典项排序值",
                false,
                "1",
            ))
            .with_example(json!({
                "type": "industry",
                "label": "信息技术",
                "value": "IT",
                "sort": 1
            })),
    );

    // 38. 通知
    registry.register(
        FormConfig::new("notification", "通知", FormDomain::System)
            .with_description("系统通知消息，可发送给指定用户或全员。")
            .with_field(FieldDefinition::new(
                "title",
                "通知标题",
                "text",
                "通知标题",
                true,
                "系统升级公告",
            ))
            .with_field(FieldDefinition::new(
                "content",
                "通知内容",
                "textarea",
                "通知正文内容",
                true,
                "系统将于 2026-07-20 02:00-04:00 进行升级维护，期间服务不可用。",
            ))
            .with_field(FieldDefinition::new(
                "type",
                "通知类型",
                "select",
                "类型：系统/业务/营销/告警",
                true,
                "系统",
            ))
            .with_field(FieldDefinition::new(
                "recipient_scope",
                "接收范围",
                "select",
                "范围：全员/指定用户/指定部门",
                true,
                "全员",
            ))
            .with_example(json!({
                "title": "系统升级公告",
                "content": "系统将于 2026-07-20 02:00-04:00 进行升级维护，期间服务不可用。",
                "type": "系统",
                "recipient_scope": "全员"
            })),
    );
}
