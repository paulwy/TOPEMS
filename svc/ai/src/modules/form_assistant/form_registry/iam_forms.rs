use super::common::{FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;
use serde_json::json;

// ==================== IAM 域（5 个表单） ====================

pub(super) fn register_iam_forms(registry: &mut FormRegistry) {
    // 30. 用户
    registry.register(
        FormConfig::new("user", "用户", FormDomain::Iam)
            .with_description("用户档案，记录账号、姓名与所属部门。")
            .with_field(FieldDefinition::new(
                "username",
                "用户名",
                "text",
                "登录用户名，需唯一",
                true,
                "zhangsan",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "姓名",
                "text",
                "用户真实姓名",
                true,
                "张三",
            ))
            .with_field(FieldDefinition::new(
                "email",
                "邮箱",
                "text",
                "用户邮箱",
                true,
                "zhangsan@example.com",
            ))
            .with_field(FieldDefinition::new(
                "phone",
                "手机号",
                "text",
                "用户手机号",
                false,
                "13800138000",
            ))
            .with_field(FieldDefinition::new(
                "department_id",
                "所属部门",
                "select",
                "用户所在部门",
                false,
                "D001",
            ))
            .with_example(json!({
                "username": "zhangsan",
                "name": "张三",
                "email": "zhangsan@example.com",
                "phone": "13800138000",
                "department_id": "D001"
            }))
            .with_validation_rule(
                FormValidationRule::new("email", "format", "邮箱需符合标准格式")
                    .with_pattern(r"^[^@\s]+@[^@\s]+\.[^@\s]+$"),
            )
            .with_validation_rule(
                FormValidationRule::new("phone", "format", "手机号需为 11 位数字")
                    .with_pattern(r"^1\d{10}$"),
            ),
    );

    // 31. 角色
    registry.register(
        FormConfig::new("role", "角色", FormDomain::Iam)
            .with_description("角色档案，用于权限聚合分配。")
            .with_field(FieldDefinition::new(
                "code",
                "角色编码",
                "text",
                "角色唯一编码",
                true,
                "sales_manager",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "角色名称",
                "text",
                "角色中文名",
                true,
                "销售经理",
            ))
            .with_field(FieldDefinition::new(
                "description",
                "角色描述",
                "textarea",
                "角色职责说明",
                false,
                "负责销售团队管理与商机审批",
            ))
            .with_example(json!({
                "code": "sales_manager",
                "name": "销售经理",
                "description": "负责销售团队管理与商机审批"
            })),
    );

    // 32. 权限
    registry.register(
        FormConfig::new("permission", "权限", FormDomain::Iam)
            .with_description("权限项定义，包括菜单、操作与数据权限。")
            .with_field(FieldDefinition::new(
                "code",
                "权限编码",
                "text",
                "权限唯一编码",
                true,
                "crm:customer:create",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "权限名称",
                "text",
                "权限中文名",
                true,
                "创建客户",
            ))
            .with_field(FieldDefinition::new(
                "type",
                "权限类型",
                "select",
                "权限类型：menu/button/data",
                true,
                "button",
            ))
            .with_field(FieldDefinition::new(
                "module",
                "所属模块",
                "select",
                "权限所属业务模块",
                true,
                "crm",
            ))
            .with_example(json!({
                "code": "crm:customer:create",
                "name": "创建客户",
                "type": "button",
                "module": "crm"
            })),
    );

    // 33. 岗位
    registry.register(
        FormConfig::new("position", "岗位", FormDomain::Iam)
            .with_description("岗位档案，记录岗位编码、名称与层级。")
            .with_field(FieldDefinition::new(
                "code",
                "岗位编码",
                "text",
                "岗位唯一编码",
                true,
                "POS-001",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "岗位名称",
                "text",
                "岗位名称",
                true,
                "销售总监",
            ))
            .with_field(FieldDefinition::new(
                "level",
                "岗位层级",
                "select",
                "层级：L1/L2/L3/L4",
                false,
                "L2",
            ))
            .with_field(FieldDefinition::new(
                "department_id",
                "所属部门",
                "select",
                "岗位所属部门",
                false,
                "D001",
            ))
            .with_example(json!({
                "code": "POS-001",
                "name": "销售总监",
                "level": "L2",
                "department_id": "D001"
            })),
    );

    // 34. 部门
    registry.register(
        FormConfig::new("department", "部门", FormDomain::Iam)
            .with_description("部门档案，支持多级部门树。")
            .with_field(FieldDefinition::new(
                "code",
                "部门编码",
                "text",
                "部门唯一编码",
                true,
                "D001",
            ))
            .with_field(FieldDefinition::new(
                "name",
                "部门名称",
                "text",
                "部门名称",
                true,
                "销售部",
            ))
            .with_field(FieldDefinition::new(
                "parent_id",
                "上级部门",
                "select",
                "上级部门 ID，顶级部门为空",
                false,
                "",
            ))
            .with_field(FieldDefinition::new(
                "manager",
                "部门负责人",
                "select",
                "部门负责人 ID",
                false,
                "U001",
            ))
            .with_example(json!({
                "code": "D001",
                "name": "销售部",
                "parent_id": "",
                "manager": "U001"
            })),
    );
}
