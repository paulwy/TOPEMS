use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;
use topems_shared::permission::{ModulePermission as SharedModulePermission, check_module_permission};

#[derive(Debug, Clone, PartialEq)]
pub enum EhsPermission {
    IncidentRead,
    IncidentWrite,
    SafetyCheckRead,
    SafetyCheckWrite,
    RiskAssessmentRead,
    RiskAssessmentWrite,
    TrainingRead,
    TrainingWrite,
    EmergencyPlanRead,
    EmergencyPlanWrite,
    HazardRead,
    HazardWrite,
    DrillRead,
    DrillWrite,
    All,
}

impl std::fmt::Display for EhsPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EhsPermission::IncidentRead => write!(f, "incident_read"),
            EhsPermission::IncidentWrite => write!(f, "incident_write"),
            EhsPermission::SafetyCheckRead => write!(f, "safety_check_read"),
            EhsPermission::SafetyCheckWrite => write!(f, "safety_check_write"),
            EhsPermission::RiskAssessmentRead => write!(f, "risk_assessment_read"),
            EhsPermission::RiskAssessmentWrite => write!(f, "risk_assessment_write"),
            EhsPermission::TrainingRead => write!(f, "training_read"),
            EhsPermission::TrainingWrite => write!(f, "training_write"),
            EhsPermission::EmergencyPlanRead => write!(f, "emergency_plan_read"),
            EhsPermission::EmergencyPlanWrite => write!(f, "emergency_plan_write"),
            EhsPermission::HazardRead => write!(f, "hazard_read"),
            EhsPermission::HazardWrite => write!(f, "hazard_write"),
            EhsPermission::DrillRead => write!(f, "drill_read"),
            EhsPermission::DrillWrite => write!(f, "drill_write"),
            EhsPermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for EhsPermission {
    fn module_name() -> &'static str {
        "ehs"
    }
    
    fn all_permission() -> Self {
        EhsPermission::All
    }
}

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &EhsPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_module_permission(db, claims, permission).await
}

pub async fn check_hazard_permission<T>(
    db: &PgPool,
    claims: &Claims,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_permission(db, claims, &EhsPermission::HazardRead).await
}

pub async fn check_hazard_write_permission<T>(
    db: &PgPool,
    claims: &Claims,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_permission(db, claims, &EhsPermission::HazardWrite).await
}

pub async fn check_safety_check_permission<T>(
    db: &PgPool,
    claims: &Claims,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_permission(db, claims, &EhsPermission::SafetyCheckRead).await
}

pub async fn check_safety_check_write_permission<T>(
    db: &PgPool,
    claims: &Claims,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_permission(db, claims, &EhsPermission::SafetyCheckWrite).await
}

pub async fn check_emergency_plan_permission<T>(
    db: &PgPool,
    claims: &Claims,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_permission(db, claims, &EhsPermission::EmergencyPlanRead).await
}

pub async fn check_emergency_plan_write_permission<T>(
    db: &PgPool,
    claims: &Claims,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_permission(db, claims, &EhsPermission::EmergencyPlanWrite).await
}

pub async fn check_drill_permission<T>(
    db: &PgPool,
    claims: &Claims,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_permission(db, claims, &EhsPermission::DrillRead).await
}

pub async fn check_drill_write_permission<T>(
    db: &PgPool,
    claims: &Claims,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_permission(db, claims, &EhsPermission::DrillWrite).await
}
