// LIMS 服务 OpenAPI 文档
//
// 说明：LIMS 模块数量众多，此处先注册 info + tags 框架。
// 后续可逐步在各模块中添加 #[derive(ToSchema)] 并在此注册 schemas。
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "sample", description = "样品管理 API"),
        (name = "sample_barcode", description = "样品条码 API"),
        (name = "test_method", description = "检测方法 API"),
        (name = "inspection_task", description = "检测任务 API"),
        (name = "inspection_record", description = "检测记录 API"),
        (name = "instrument", description = "仪器管理 API"),
        (name = "instrument_data", description = "仪器数据 API"),
        (name = "reagent", description = "试剂管理 API"),
        (name = "report", description = "报告管理 API"),
        (name = "process", description = "流程管理 API"),
        (name = "proficiency_testing", description = "能力验证 API"),
        (name = "uncertainty", description = "不确定度评估 API"),
        (name = "statistics", description = "统计 API"),
    ),
    info(
        title = "TOPEMS LIMS API",
        version = "1.0.0",
        description = "实验室信息管理系统 API - 包含样品、检测、仪器、试剂、报告、能力验证、不确定度等"
    )
)]
pub struct LimsApiDoc;
