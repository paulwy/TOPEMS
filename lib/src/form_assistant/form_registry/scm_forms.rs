use serde_json::json;
use super::common::{AiFeatures, BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
use super::config::FormConfig;
use super::registry::FormRegistry;

// ==================== SCM 域（2 个表单） ====================

pub(super) fn register_scm_forms(registry: &mut FormRegistry) {
    registry.register(
        FormConfig::new("supplier", "供应商", FormDomain::Scm)
            .with_description("供应商档案，记录供应商基本信息、资质与评级。")
            .with_field(FieldDefinition::new(
                "supplier_code",
                "供应商编码",
                "text",
                "供应商唯一编码",
                true,
                "S001",
            ))
            .with_field(FieldDefinition::new(
                "supplier_name",
                "供应商名称",
                "text",
                "供应商法定全称",
                true,
                "上海精工制造有限公司",
            ))
            .with_field(FieldDefinition::new(
                "category",
                "供应类别",
                "select",
                "供应物料类别：原材料/零部件/设备/服务",
                true,
                "原材料",
            ))
            .with_field(FieldDefinition::new(
                "credit_level",
                "信用等级",
                "select",
                "供应商评级：A/B/C/D",
                false,
                "A",
            ))
            .with_field(FieldDefinition::new(
                "contact_person",
                "联系人",
                "text",
                "供应商对接人姓名",
                true,
                "李四",
            ))
            .with_field(FieldDefinition::new(
                "contact_phone",
                "联系电话",
                "text",
                "供应商联系电话",
                true,
                "021-66668888",
            ))
            .with_field(FieldDefinition::new(
                "address",
                "供应商地址",
                "textarea",
                "供应商办公或厂址",
                false,
                "上海市闵行区XX路XX号",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "状态",
                "select",
                "状态：合作中/已停用/待评估",
                true,
                "合作中",
            ))
            .with_example(json!({
                "supplier_code": "S001",
                "supplier_name": "上海精工制造有限公司",
                "category": "原材料",
                "credit_level": "A",
                "contact_person": "李四",
                "contact_phone": "021-66668888",
                "address": "上海市闵行区XX路XX号",
                "status": "合作中"
            }))
            .with_business_term(BusinessTerm::new(
                "供应商准入",
                Some("Supplier Onboarding".to_string()),
                "对新供应商进行资质审核、样品验证后纳入合格供应商名录的过程。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: false,
                validate: true,
                translate: false,
            }),
    );

    registry.register(
        FormConfig::new("purchase_requisition", "请购单", FormDomain::Scm)
            .with_description("请购单，由需求部门提出的物料采购申请。")
            .with_field(FieldDefinition::new(
                "pr_no",
                "请购单号",
                "text",
                "请购单唯一编号",
                true,
                "PR20260718001",
            ))
            .with_field(FieldDefinition::new(
                "applicant_department",
                "申请部门",
                "select",
                "提出请购的部门",
                true,
                "D001",
            ))
            .with_field(FieldDefinition::new(
                "applicant",
                "申请人",
                "select",
                "请购申请人",
                true,
                "U001",
            ))
            .with_field(FieldDefinition::new(
                "material_id",
                "请购物料",
                "select",
                "申请采购的物料 ID",
                true,
                "M001",
            ))
            .with_field(FieldDefinition::new(
                "quantity",
                "请购数量",
                "number",
                "申请采购数量",
                true,
                "1000",
            ))
            .with_field(FieldDefinition::new(
                "required_date",
                "需求日期",
                "date",
                "物料需要到位的日期",
                true,
                "2026-07-25",
            ))
            .with_field(FieldDefinition::new(
                "purpose",
                "请购用途",
                "textarea",
                "请购物料的用途说明",
                false,
                "生产订单 MO20260718001 备料",
            ))
            .with_field(FieldDefinition::new(
                "status",
                "审批状态",
                "select",
                "状态：草稿/审批中/已批准/已驳回/已关闭",
                true,
                "审批中",
            ))
            .with_example(json!({
                "pr_no": "PR20260718001",
                "applicant_department": "D001",
                "applicant": "U001",
                "material_id": "M001",
                "quantity": 1000,
                "required_date": "2026-07-25",
                "purpose": "生产订单 MO20260718001 备料",
                "status": "审批中"
            }))
            .with_validation_rule(FormValidationRule::new(
                "quantity",
                "range",
                "请购数量需大于 0",
            ))
            .with_business_term(BusinessTerm::new(
                "PR转PO",
                Some("PR to PO".to_string()),
                "请购单（Purchase Requisition）经审批后转换为采购订单（Purchase Order）的流程。",
            ))
            .with_ai_features(AiFeatures {
                suggest: true,
                enhance: true,
                validate: true,
                translate: false,
            }),
    );
}
