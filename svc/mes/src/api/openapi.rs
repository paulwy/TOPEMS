// MES 服务 OpenAPI 文档
use utoipa::{OpenApi, ToSchema};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProductionOrder {
    pub id: Uuid,
    pub order_no: String,
    pub product_id: Uuid,
    pub product_name: String,
    pub quantity: f64,
    pub completed_quantity: Option<f64>,
    pub status: String,
    pub priority: Option<i32>,
    pub planned_start: Option<DateTime<Utc>>,
    pub planned_end: Option<DateTime<Utc>>,
    pub actual_start: Option<DateTime<Utc>>,
    pub actual_end: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Workstation {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub location: Option<String>,
    pub status: String,
    pub current_order_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProcessRoute {
    pub id: Uuid,
    pub name: String,
    pub product_id: Uuid,
    pub version: Option<String>,
    pub steps: serde_json::Value,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QualityCheck {
    pub id: Uuid,
    pub order_id: Uuid,
    pub workstation_id: Option<Uuid>,
    pub check_type: String,
    pub sample_size: Option<i32>,
    pub qualified_count: Option<i32>,
    pub unqualified_count: Option<i32>,
    pub status: String,
    pub inspector: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            ProductionOrder,
            Workstation,
            ProcessRoute,
            QualityCheck,
        ),
    ),
    tags(
        (name = "production", description = "生产订单 API"),
        (name = "workstation", description = "工位管理 API"),
        (name = "process", description = "工艺路线 API"),
        (name = "quality", description = "质量检查 API"),
    ),
    info(
        title = "TOPEMS MES API",
        version = "1.0.0",
        description = "制造执行系统 API - 包含生产订单、工位管理、工艺路线、质量检查等功能"
    )
)]
pub struct MesApiDoc;
