// AI 服务权限定义
use axum::{
    extract::Request,
    http::StatusCode,
    http::header::AUTHORIZATION,
};
use topems_shared::permission::ModulePermission;
use topems_shared::auth::{Claims, verify_jwt_token};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AiPermission {
    // 向量操作
    VectorRead,
    VectorWrite,
    VectorDelete,
    VectorSearch,
    // 文档操作
    DocumentRead,
    DocumentWrite,
    DocumentDelete,
    DocumentProcess,
    // QA 操作
    QaRead,
    QaWrite,
    QaFeedback,
    // 分析操作
    AnalysisRead,
    AnalysisWrite,
    // 连接器操作
    ConnectorRead,
    ConnectorWrite,
    ConnectorDelete,
    // 管理权限
    Manage,
}

impl std::fmt::Display for AiPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AiPermission::VectorRead => write!(f, "ai.vector_read"),
            AiPermission::VectorWrite => write!(f, "ai.vector_write"),
            AiPermission::VectorDelete => write!(f, "ai.vector_delete"),
            AiPermission::VectorSearch => write!(f, "ai.vector_search"),
            AiPermission::DocumentRead => write!(f, "ai.document_read"),
            AiPermission::DocumentWrite => write!(f, "ai.document_write"),
            AiPermission::DocumentDelete => write!(f, "ai.document_delete"),
            AiPermission::DocumentProcess => write!(f, "ai.document_process"),
            AiPermission::QaRead => write!(f, "ai.qa_read"),
            AiPermission::QaWrite => write!(f, "ai.qa_write"),
            AiPermission::QaFeedback => write!(f, "ai.qa_feedback"),
            AiPermission::AnalysisRead => write!(f, "ai.analysis_read"),
            AiPermission::AnalysisWrite => write!(f, "ai.analysis_write"),
            AiPermission::ConnectorRead => write!(f, "ai.connector_read"),
            AiPermission::ConnectorWrite => write!(f, "ai.connector_write"),
            AiPermission::ConnectorDelete => write!(f, "ai.connector_delete"),
            AiPermission::Manage => write!(f, "ai.manage"),
        }
    }
}

impl ModulePermission for AiPermission {
    fn module_name() -> &'static str {
        "ai"
    }

    fn all_permission() -> Self {
        AiPermission::Manage
    }
}

/// 从请求中解析 JWT 并检查权限
pub async fn check_request_permission<P>(
    req: Request,
) -> Result<(Claims, Request), (StatusCode, axum::Json<topems_shared::ApiResponse<()>>)>
where
    P: ModulePermission + std::fmt::Display + Clone,
{
    // 获取 Authorization header
    let auth_header = req.headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => {
            return Err((
                StatusCode::UNAUTHORIZED,
                axum::Json(topems_shared::ApiResponse::error(401, "缺少认证信息")),
            ));
        }
    };

    // 解析 JWT
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let claims = match verify_jwt_token(token, &secret) {
        Ok(c) => c,
        Err(_) => {
            return Err((
                StatusCode::UNAUTHORIZED,
                axum::Json(topems_shared::ApiResponse::error(401, "无效的认证信息")),
            ));
        }
    };

    Ok((claims, req))
}

/// 检查 AI 权限
pub fn check_ai_permission<P>(claims: &Claims) -> Result<(), (StatusCode, axum::Json<topems_shared::ApiResponse<()>>)>
where
    P: ModulePermission + std::fmt::Display,
{
    // 超级用户拥有所有权限
    if claims.is_superuser {
        return Ok(());
    }

    // 检查模块管理权限
    let module_manage = format!("{}.manage", P::module_name());
    if claims.has_permission(&module_manage) {
        return Ok(());
    }

    // 检查具体权限
    let perm_str = P::module_name();
    if claims.has_permission(perm_str) {
        return Ok(());
    }

    Err((
        StatusCode::FORBIDDEN,
        axum::Json(topems_shared::ApiResponse::error(
            403,
            &format!("权限不足：需要 {} 权限", perm_str),
        )),
    ))
}
