// QMS 服务 OpenAPI 文档
//
// 说明：QMS 模块数量众多，此处注册 quality_standard、quality_inspection、quality_issue
// 三个核心模块的实体与路径，使 /api-docs/openapi.json 端点可用。
// 后续可逐步在各模块中添加 #[derive(ToSchema)] 并在此注册 schemas。
use utoipa::OpenApi;

use crate::modules::quality_inspection::{
    AssignInspectionRequest, AuditInspectionRequest, CreateInspectionRequest, Inspection,
    InspectionAudit, InspectionResultItem, ListInspectionsResponse, SubmitInspectionResultRequest,
    UpdateInspectionRequest,
};
use crate::modules::quality_issue::{
    CreateIssueRequest, QualityIssue, QualityIssueWithWorkflow, UpdateIssueRequest,
};
use crate::modules::quality_standard::{
    CreateStandardRequest, ListStandardsResponse, QualityStandard, StandardRevision,
    UpdateStandardRequest,
};

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            // quality_standard
            QualityStandard,
            StandardRevision,
            ListStandardsResponse,
            CreateStandardRequest,
            UpdateStandardRequest,
            // quality_inspection
            Inspection,
            InspectionAudit,
            InspectionResultItem,
            ListInspectionsResponse,
            CreateInspectionRequest,
            UpdateInspectionRequest,
            AssignInspectionRequest,
            SubmitInspectionResultRequest,
            AuditInspectionRequest,
            // quality_issue
            QualityIssue,
            QualityIssueWithWorkflow,
            CreateIssueRequest,
            UpdateIssueRequest,
        ),
    ),
    paths(
        crate::modules::quality_standard::list_standards,
        crate::modules::quality_standard::create_standard,
        crate::modules::quality_standard::get_standard,
        crate::modules::quality_inspection::list_inspections,
        crate::modules::quality_inspection::create_inspection,
        crate::modules::quality_inspection::get_inspection,
        crate::modules::quality_issue::list_issues,
        crate::modules::quality_issue::create_issue,
    ),
    tags(
        (name = "quality_standard", description = "质量标准 API"),
        (name = "quality_inspection", description = "质量检验 API"),
        (name = "quality_issue", description = "质量问题 API"),
        (name = "quality_cost", description = "质量成本 API"),
        (name = "apqp", description = "产品质量先期策划 API"),
        (name = "fmea", description = "失效模式分析 API"),
        (name = "eight_d", description = "8D 报告 API"),
        (name = "corrective_action", description = "纠正措施 API"),
        (name = "spc", description = "统计过程控制 API"),
        (name = "dashboard", description = "质量仪表盘 API"),
    ),
    info(
        title = "TOPEMS QMS API",
        version = "1.0.0",
        description = "质量管理系统 API - 包含质量标准、检验、问题、成本、APQP、FMEA、8D、纠正措施、SPC 等"
    )
)]
pub struct QmsApiDoc;

#[cfg(test)]
mod tests {
    use super::*;
    use tracing;

    #[test]
    fn extract_openapi_spec() {
        let spec = QmsApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-qms-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-qms-openapi.json");
    }
}
