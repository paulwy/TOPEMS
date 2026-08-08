// AI 服务权限定义
use axum::{extract::Request, http::header::AUTHORIZATION, http::StatusCode};
use sqlx::PgPool;
use topems_shared_auth::auth::{verify_jwt_token, Claims};
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, PartialEq, Eq)]
#[allow(dead_code)]
pub enum AiPermission {
    VectorRead,
    VectorWrite,
    VectorDelete,
    VectorSearch,
    DocumentRead,
    DocumentWrite,
    DocumentDelete,
    DocumentProcess,
    QaRead,
    QaWrite,
    QaFeedback,
    AnalysisRead,
    AnalysisWrite,
    ConnectorRead,
    ConnectorWrite,
    ConnectorDelete,
    Manage,
}

impl AiPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            AiPermission::VectorRead => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Read)
            }
            AiPermission::VectorWrite => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Write)
            }
            AiPermission::VectorDelete => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Delete)
            }
            AiPermission::VectorSearch => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Read)
            }
            AiPermission::DocumentRead => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Read)
            }
            AiPermission::DocumentWrite => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Write)
            }
            AiPermission::DocumentDelete => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Delete)
            }
            AiPermission::DocumentProcess => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Write)
            }
            AiPermission::QaRead => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Read)
            }
            AiPermission::QaWrite => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Write)
            }
            AiPermission::QaFeedback => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Write)
            }
            AiPermission::AnalysisRead => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Read)
            }
            AiPermission::AnalysisWrite => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Write)
            }
            AiPermission::ConnectorRead => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Read)
            }
            AiPermission::ConnectorWrite => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Write)
            }
            AiPermission::ConnectorDelete => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Delete)
            }
            AiPermission::Manage => {
                SharedModulePermission::new(ModuleCode::Ai, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for AiPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

#[allow(dead_code)]
pub type ModulePermission = AiPermission;

#[allow(dead_code)]
pub async fn check_request_permission(
    req: Request,
) -> Result<(Claims, Request), (StatusCode, axum::Json<ApiResponse<()>>)> {
    let auth_header = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => {
            return Err((
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "缺少认证信息")),
            ));
        }
    };

    let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set in production");
    let claims = match verify_jwt_token(token, &secret) {
        Ok(c) => c,
        Err(_) => {
            return Err((
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "无效的认证信息")),
            ));
        }
    };

    Ok((claims, req))
}

#[allow(dead_code)]
pub async fn check_ai_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &AiPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

#[allow(dead_code)]
pub fn has_ai_permission(claims: &Claims, permission: &AiPermission) -> bool {
    if claims.is_superuser {
        return true;
    }
    let perm_str = permission.to_string();
    claims.has_permission(&perm_str) || claims.has_permission("ai:admin")
}
