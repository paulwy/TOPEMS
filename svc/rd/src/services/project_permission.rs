use sqlx::{PgPool, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub enum ProjectRole {
    Owner,
    Manager,
    Member,
    Viewer,
    None,
}

impl std::fmt::Display for ProjectRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProjectRole::Owner => write!(f, "OWNER"),
            ProjectRole::Manager => write!(f, "MANAGER"),
            ProjectRole::Member => write!(f, "MEMBER"),
            ProjectRole::Viewer => write!(f, "VIEWER"),
            ProjectRole::None => write!(f, "NONE"),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum ProjectPermission {
    Read,
    Update,
    Delete,
    ManageMembers,
    ManagePhases,
    ManageMilestones,
    All,
}

impl std::fmt::Display for ProjectPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProjectPermission::Read => write!(f, "read"),
            ProjectPermission::Update => write!(f, "update"),
            ProjectPermission::Delete => write!(f, "delete"),
            ProjectPermission::ManageMembers => write!(f, "manage_members"),
            ProjectPermission::ManagePhases => write!(f, "manage_phases"),
            ProjectPermission::ManageMilestones => write!(f, "manage_milestones"),
            ProjectPermission::All => write!(f, "all"),
        }
    }
}

pub async fn get_project_role(
    db: &mut sqlx::PgConnection,
    user_id: &Uuid,
    project_id: &Uuid,
) -> Result<ProjectRole, sqlx::Error> {
    let result = sqlx::query(
        r#"
        SELECT leader FROM projects WHERE id = $1
        "#,
    )
    .bind(project_id)
    .fetch_optional(&mut *db)
    .await?;

    if let Some(row) = result {
        let leader: String = row.get("leader");
        if leader == user_id.to_string() {
            return Ok(ProjectRole::Owner);
        }
    }

    let member_result = sqlx::query(
        r#"
        SELECT role FROM project_members WHERE project_id = $1 AND employee_id = $2 AND status = 'active'
        "#,
    )
    .bind(project_id)
    .bind(user_id.to_string())
    .fetch_optional(&mut *db)
    .await?;

    if let Some(row) = member_result {
        let role: String = row.get("role");
        match role.as_str() {
            "PROJECT_MANAGER" | "TECH_LEAD" => return Ok(ProjectRole::Manager),
            "DEVELOPER" | "DESIGNER" | "TESTER" | "ANALYST" => return Ok(ProjectRole::Member),
            _ => return Ok(ProjectRole::Viewer),
        }
    }

    Ok(ProjectRole::None)
}

pub fn has_project_permission(role: &ProjectRole, permission: &ProjectPermission) -> bool {
    match role {
        ProjectRole::Owner => true,
        ProjectRole::Manager => match permission {
            ProjectPermission::Read
            | ProjectPermission::Update
            | ProjectPermission::ManageMembers
            | ProjectPermission::ManagePhases
            | ProjectPermission::ManageMilestones => true,
            ProjectPermission::Delete => false,
            ProjectPermission::All => false,
        },
        ProjectRole::Member => matches!(
            permission,
            ProjectPermission::Read
                | ProjectPermission::Update
                | ProjectPermission::ManagePhases
                | ProjectPermission::ManageMilestones
        ),
        ProjectRole::Viewer => matches!(permission, ProjectPermission::Read),
        ProjectRole::None => false,
    }
}

pub async fn check_project_permission<T>(
    db: &mut sqlx::PgConnection,
    claims: &Claims,
    project_id: &Uuid,
    permission: &ProjectPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    let user_id = match claims.user_id() {
        Ok(id) => id,
        Err(_) => {
            return Err(axum::Json(ApiResponse::error(401, "无效的用户ID")));
        }
    };

    if claims.has_permission("projects.manage") {
        return Ok(());
    }

    let role = match get_project_role(&mut *db, &user_id, project_id).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询项目角色失败: {}", e);
            return Err(axum::Json(ApiResponse::error(500, "权限检查失败")));
        }
    };

    if role == ProjectRole::None {
        return Err(axum::Json(ApiResponse::error(
            403,
            "您不是该项目的成员，无法访问",
        )));
    }

    if !has_project_permission(&role, permission) {
        return Err(axum::Json(ApiResponse::error(
            403,
            &format!(
                "权限不足：您在该项目中的角色是 {}，需要 {} 权限",
                role, permission
            ),
        )));
    }

    Ok(())
}

pub async fn check_project_owner<T>(
    db: &mut sqlx::PgConnection,
    claims: &Claims,
    project_id: &Uuid,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    let user_id = match claims.user_id() {
        Ok(id) => id,
        Err(_) => {
            return Err(axum::Json(ApiResponse::error(401, "无效的用户ID")));
        }
    };

    if claims.has_permission("projects.manage") {
        return Ok(());
    }

    let role = match get_project_role(&mut *db, &user_id, project_id).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询项目角色失败: {}", e);
            return Err(axum::Json(ApiResponse::error(500, "权限检查失败")));
        }
    };

    if role != ProjectRole::Owner {
        return Err(axum::Json(ApiResponse::error(
            403,
            "权限不足：只有项目负责人才能执行此操作",
        )));
    }

    Ok(())
}
