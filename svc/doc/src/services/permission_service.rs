#![allow(dead_code)]

use crate::db::repository::{
    FilePermissionRepository, FileRepository, FolderPermissionRepository, FolderRepository,
};
use crate::models::{FilePermission, FolderPermission, Permission};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct PermissionService {
    pool: PgPool,
    file_perm_repo: FilePermissionRepository,
    folder_perm_repo: FolderPermissionRepository,
    folder_repo: FolderRepository,
    file_repo: FileRepository,
}

impl PermissionService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool: pool.clone(),
            file_perm_repo: FilePermissionRepository::new(pool.clone()),
            folder_perm_repo: FolderPermissionRepository::new(pool.clone()),
            folder_repo: FolderRepository::new(pool.clone()),
            file_repo: FileRepository::new(pool.clone()),
        }
    }

    pub async fn check_file_permission(
        &self,
        file_id: Uuid,
        user_id: Uuid,
        user_roles: &[Uuid],
        required: &Permission,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        let user_id_str = user_id.to_string();
        let file = match self.file_repo.find_by_id(file_id).await? {
            Some(f) => f,
            None => return Ok(false),
        };

        if file.created_by == user_id_str {
            return Ok(true);
        }

        let file_perms = self.file_perm_repo.list_by_file_id(file_id).await?;
        if has_required_permission(&file_perms, user_id, user_roles, required) {
            return Ok(true);
        }

        if let Some(folder_id) = file.folder_id {
            let mut folder_ids = vec![folder_id];
            let ancestors = self.folder_repo.get_ancestors(folder_id).await?;
            folder_ids.extend(ancestors);

            let folder_perms = self
                .folder_perm_repo
                .list_for_folder_hierarchy(&folder_ids)
                .await?;
            let inherited_perms: Vec<FolderPermission> =
                folder_perms.into_iter().filter(|p| p.inherit).collect();

            if has_inherited_folder_permission(&inherited_perms, user_id, user_roles, required) {
                return Ok(true);
            }
        }

        Ok(false)
    }

    pub async fn check_folder_permission(
        &self,
        folder_id: Uuid,
        user_id: Uuid,
        user_roles: &[Uuid],
        required: &Permission,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        let user_id_str = user_id.to_string();
        let folder = match self.folder_repo.find_by_id(folder_id).await? {
            Some(f) => f,
            None => return Ok(false),
        };

        if folder.created_by == user_id_str {
            return Ok(true);
        }

        let mut folder_ids = vec![folder_id];
        let ancestors = self.folder_repo.get_ancestors(folder_id).await?;
        folder_ids.extend(ancestors);

        let folder_perms = self
            .folder_perm_repo
            .list_for_folder_hierarchy(&folder_ids)
            .await?;

        if has_inherited_folder_permission(&folder_perms, user_id, user_roles, required) {
            return Ok(true);
        }

        Ok(false)
    }

    pub async fn set_file_permission(
        &self,
        file_id: Uuid,
        user_id: Option<Uuid>,
        role_id: Option<Uuid>,
        permission: Permission,
    ) -> Result<FilePermission, Box<dyn std::error::Error + Send + Sync>> {
        let now = chrono::Utc::now();
        let file_perm = FilePermission {
            id: Uuid::new_v4(),
            file_id,
            user_id,
            role_id,
            permission,
            created_at: now,
        };

        Ok(self.file_perm_repo.create(file_perm).await?)
    }

    pub async fn set_folder_permission(
        &self,
        folder_id: Uuid,
        user_id: Option<Uuid>,
        role_id: Option<Uuid>,
        permission: Permission,
        inherit: bool,
    ) -> Result<FolderPermission, Box<dyn std::error::Error + Send + Sync>> {
        let now = chrono::Utc::now();
        let folder_perm = FolderPermission {
            id: Uuid::new_v4(),
            folder_id,
            user_id,
            role_id,
            permission,
            inherit,
            created_at: now,
        };

        Ok(self.folder_perm_repo.create(folder_perm).await?)
    }

    pub async fn get_file_permissions(
        &self,
        file_id: Uuid,
    ) -> Result<Vec<FilePermission>, Box<dyn std::error::Error + Send + Sync>> {
        Ok(self.file_perm_repo.list_by_file_id(file_id).await?)
    }

    pub async fn get_folder_permissions(
        &self,
        folder_id: Uuid,
    ) -> Result<Vec<FolderPermission>, Box<dyn std::error::Error + Send + Sync>> {
        Ok(self.folder_perm_repo.list_by_folder_id(folder_id).await?)
    }

    pub async fn remove_file_permission(
        &self,
        permission_id: Uuid,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        Ok(self.file_perm_repo.delete(permission_id).await?)
    }

    pub async fn remove_folder_permission(
        &self,
        permission_id: Uuid,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        Ok(self.folder_perm_repo.delete(permission_id).await?)
    }
}

fn has_required_permission(
    perms: &[FilePermission],
    user_id: Uuid,
    user_roles: &[Uuid],
    required: &Permission,
) -> bool {
    for perm in perms {
        let matches = if let Some(perm_user_id) = perm.user_id {
            perm_user_id == user_id
        } else if let Some(perm_role_id) = perm.role_id {
            user_roles.contains(&perm_role_id)
        } else {
            false
        };

        if matches && perm.permission.includes(required) {
            return true;
        }
    }
    false
}

fn has_inherited_folder_permission(
    perms: &[FolderPermission],
    user_id: Uuid,
    user_roles: &[Uuid],
    required: &Permission,
) -> bool {
    for perm in perms {
        let matches = if let Some(perm_user_id) = perm.user_id {
            perm_user_id == user_id
        } else if let Some(perm_role_id) = perm.role_id {
            user_roles.contains(&perm_role_id)
        } else {
            false
        };

        if matches && perm.permission.includes(required) {
            return true;
        }
    }
    false
}
