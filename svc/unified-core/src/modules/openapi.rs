// IAM 模块 OpenAPI 文档提取
//
// 独立于 main.rs 中的 ApiDoc（覆盖全平台），
// 此处仅注册 IAM 核心 schema（User / Role / Permission），
// 供 scripts/openapi/generate.sh --extract 模式通过 cargo test 提取。
//
// 与 WMS openapi.rs 同样的模式：自定义 schema 结构 + components(schemas(...))。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

// ============ IAM 核心 Schema ============

/// IAM 用户实体
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub is_active: bool,
    pub is_superuser: bool,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// IAM 角色实体
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Role {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub permissions: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// IAM 权限实体
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Permission {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub module: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// IAM OpenAPI 文档（仅 IAM 模块）
#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            User,
            Role,
            Permission,
        ),
    ),
    paths(
        crate::modules::iam::user::crud::list_users,
        crate::modules::iam::user::crud::create_user,
        crate::modules::iam::auth::login,
        crate::modules::iam::auth::register,
    ),
    tags(
        (name = "IAM", description = "身份与访问管理 - 用户、角色、权限管理"),
        (name = "IAM-Auth", description = "认证接口 - 登录、注册、Token刷新"),
        (name = "IAM-Role", description = "角色管理 - 角色CRUD"),
        (name = "IAM-Permission", description = "权限管理 - 权限验证、权限查询"),
    ),
    info(
        title = "TOPEMS IAM API",
        version = "1.0.0",
        description = "TOPEMS 身份与访问管理服务 API - 用户、角色、权限管理"
    )
)]
pub struct IamApiDoc;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = IamApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-unified-core-openapi.json", json)
            .expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-unified-core-openapi.json");
    }
}
