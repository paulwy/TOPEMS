use anyhow::Result;
use sqlx::PgPool;
use tracing::{debug, warn};
use uuid::Uuid;

use crate::models::file::{FileRecord, Visibility};
use crate::models::permission::{
    FilePermission, Permission, PermissionCheckResult, Principal, PrincipalType,
    ShareFileRequest,
};

pub struct PermissionService {
    pool: PgPool,
}

impl PermissionService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 检查用户是否有权限访问文件
    pub async fn check_permission(
        &self,
        file_id: Uuid,
        user_id: Uuid,
        user_department_id: Option<Uuid>,
        required_permission: Permission,
    ) -> Result<PermissionCheckResult> {
        // 1. 获取文件信息
        let file = sqlx::query_as::<_, FileRecord>(
            "SELECT * FROM storage.files WHERE id = $1 AND status = 'active'",
        )
        .bind(file_id)
        .fetch_optional(&self.pool)
        .await?;

        let file = match file {
            Some(f) => f,
            None => return Ok(PermissionCheckResult::deny("文件不存在")),
        };

        // 2. 检查是否是所有者
        if file.owner_id == user_id {
            debug!("User {} is owner of file {}", user_id, file_id);
            return Ok(PermissionCheckResult::allow());
        }

        // 3. 检查 visibility
        match file.visibility.as_str() {
            "public" => {
                if matches!(required_permission, Permission::Read) {
                    debug!("File {} is public, allowing read access", file_id);
                    return Ok(PermissionCheckResult::allow());
                }
            }
            "department" => {
                if let Some(user_dept) = user_department_id {
                    if file.owner_department_id == Some(user_dept) {
                        debug!(
                            "User department {} matches file department {:?}",
                            user_dept, file.owner_department_id
                        );
                        if matches!(required_permission, Permission::Read) {
                            return Ok(PermissionCheckResult::allow());
                        }
                    }
                }
            }
            _ => {}
        }

        // 4. 检查权限表
        let has_permission = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM storage.file_permissions
                WHERE file_id = $1
                AND principal_type = 'user'
                AND principal_id = $2
                AND permission = $3
                AND (expires_at IS NULL OR expires_at > NOW())
            )
            "#,
        )
        .bind(file_id)
        .bind(user_id)
        .bind(String::from(required_permission.clone()))
        .fetch_one(&self.pool)
        .await?;

        if has_permission {
            debug!(
                "User {} has {} permission on file {}",
                user_id,
                String::from(required_permission),
                file_id
            );
            return Ok(PermissionCheckResult::allow());
        }

        // 5. 检查角色权限（如果需要）
        let has_role_permission = self
            .check_role_permission(file_id, user_id, &required_permission)
            .await?;

        if has_role_permission {
            return Ok(PermissionCheckResult::allow());
        }

        Ok(PermissionCheckResult::deny("没有访问权限"))
    }

    /// 检查用户角色是否有权限
    async fn check_role_permission(
        &self,
        file_id: Uuid,
        user_id: Uuid,
        _required_permission: &Permission,
    ) -> Result<bool> {
        // 获取用户的角色
        let roles: Vec<String> = sqlx::query_scalar(
            "SELECT COALESCE(array_to_string(roles, ','), '') FROM iam.users WHERE id = $1::uuid",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?
        .flatten()
        .map(|s: String| {
            if s.is_empty() {
                vec![]
            } else {
                s.split(',').map(|x| x.to_string()).collect()
            }
        })
        .unwrap_or_default();

        // 检查是否有 admin 角色
        if roles.contains(&"admin".to_string()) || roles.contains(&"管理员".to_string()) {
            warn!("User {} has admin role, granting full access", user_id);
            return Ok(true);
        }

        Ok(false)
    }

    /// 分享文件
    pub async fn share_file(
        &self,
        file_id: Uuid,
        request: ShareFileRequest,
        granted_by: Uuid,
    ) -> Result<FilePermission> {
        let id = Uuid::new_v4();

        sqlx::query(
            r#"
            INSERT INTO storage.file_permissions
            (id, file_id, principal_type, principal_id, permission, granted_by, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (file_id, principal_type, principal_id, permission)
            DO UPDATE SET expires_at = $7, granted_by = $6
            "#,
        )
        .bind(id)
        .bind(file_id)
        .bind(&request.principal_type)
        .bind(request.principal_id)
        .bind(&request.permission)
        .bind(granted_by)
        .bind(request.expires_at)
        .execute(&self.pool)
        .await?;

        // 更新文件的 is_shared 标志
        sqlx::query(
            "UPDATE storage.files SET is_shared = true WHERE id = $1",
        )
        .bind(file_id)
        .execute(&self.pool)
        .await?;

        Ok(FilePermission {
            id,
            file_id,
            principal_type: request.principal_type,
            principal_id: request.principal_id,
            permission: request.permission,
            granted_by: Some(granted_by),
            expires_at: request.expires_at,
            created_at: chrono::Utc::now(),
        })
    }

    /// 获取文件的所有权限
    pub async fn get_file_permissions(&self, file_id: Uuid) -> Result<Vec<FilePermission>> {
        let permissions = sqlx::query_as::<_, FilePermission>(
            "SELECT * FROM storage.file_permissions WHERE file_id = $1",
        )
        .bind(file_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(permissions)
    }

    /// 撤销分享权限
    pub async fn revoke_permission(
        &self,
        file_id: Uuid,
        principal_type: &str,
        principal_id: Uuid,
        permission: &str,
    ) -> Result<()> {
        sqlx::query(
            "DELETE FROM storage.file_permissions WHERE file_id = $1 AND principal_type = $2 AND principal_id = $3 AND permission = $4",
        )
        .bind(file_id)
        .bind(principal_type)
        .bind(principal_id)
        .bind(permission)
        .execute(&self.pool)
        .await?;

        // 检查是否还有其他权限，如果没有则更新 is_shared
        let remaining = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM storage.file_permissions WHERE file_id = $1",
        )
        .bind(file_id)
        .fetch_one(&self.pool)
        .await?;

        if remaining == 0 {
            sqlx::query("UPDATE storage.files SET is_shared = false WHERE id = $1")
                .bind(file_id)
                .execute(&self.pool)
                .await?;
        }

        Ok(())
    }
}
