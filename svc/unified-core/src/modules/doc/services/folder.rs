use sqlx::{PgPool, Postgres, Result, Transaction};
use uuid::Uuid;

use super::super::models::{CreateFolderRequest, Folder, UpdateFolderRequest};

pub struct FolderService {
    pool: PgPool,
}

impl FolderService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 请求级租户作用域：本事务内 `SET LOCAL app.tenant_id`，事务内所有语句共用同一连接。
    ///
    /// 为什么必须是事务级（`set_config(..., true)`）而不是会话级：
    /// `self.pool` 每次查询会从池里随机借一条连接，会话级 GUC 设在中间件独占的那条连接上，
    /// 业务查询很可能借到另一条干净连接 → `app.tenant_id` 为空 → RLS 三分支全不成立 → 恒 0 行
    /// （fail-closed，superadmin 也查不到）。事务级 GUC 随事务绑定连接，查询语句必然继承。
    ///
    /// 租户取值：普通用户传真实租户（命中 `tenant_id = current_setting('app.tenant_id')` 分支）；
    /// superadmin / 无租户传 nil UUID（命中策略里的 `'00000000-0000-0000-0000-000000000000'` 全零旁路）。
    async fn tenant_txn(&self, tenant_id: Option<Uuid>) -> Result<Transaction<'static, Postgres>> {
        let mut tx = self.pool.begin().await?;
        let rls_tenant = tenant_id
            .map(|t| t.to_string())
            .unwrap_or_else(|| Uuid::nil().to_string());
        sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
            .bind(rls_tenant)
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    pub async fn list_folders(&self, tenant_id: Option<Uuid>) -> Result<Vec<Folder>> {
        let mut tx = self.tenant_txn(tenant_id).await?;
        let rows = sqlx::query_as::<_, Folder>(
            r#"SELECT id, tenant_id, name, parent_id, description, sort_order, is_enabled, created_by, created_at, updated_at FROM core_doc_folders WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY name"#,
        )
        .bind(tenant_id)
        .fetch_all(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(rows)
    }

    pub async fn get_folder(
        &self,
        tenant_id: Option<Uuid>,
        folder_id: Uuid,
    ) -> Result<Option<Folder>> {
        let mut tx = self.tenant_txn(tenant_id).await?;
        let row = sqlx::query_as::<_, Folder>(
            r#"SELECT id, tenant_id, name, parent_id, description, sort_order, is_enabled, created_by, created_at, updated_at FROM core_doc_folders WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND id = $2"#,
        )
        .bind(tenant_id)
        .bind(folder_id)
        .fetch_optional(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(row)
    }

    pub async fn create_folder(
        &self,
        tenant_id: Uuid,
        req: CreateFolderRequest,
        created_by: &str,
    ) -> Result<Folder> {
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;
        let folder = sqlx::query_as::<_, Folder>(
            r#"
            INSERT INTO core_doc_folders (tenant_id, name, parent_id, description, sort_order, is_enabled, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(tenant_id)
        .bind(req.name)
        .bind(req.parent_id)
        .bind(req.description)
        .bind(req.sort_order.unwrap_or(0))
        .bind(req.is_enabled.unwrap_or(true))
        .bind(Some(created_by.to_string()))
        .fetch_one(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(folder)
    }

    pub async fn update_folder(
        &self,
        tenant_id: Uuid,
        folder_id: Uuid,
        req: UpdateFolderRequest,
    ) -> Result<Option<Folder>> {
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;
        let folder = sqlx::query_as::<_, Folder>(
            r#"
            UPDATE core_doc_folders
            SET name = COALESCE($2, name),
                parent_id = COALESCE($3, parent_id),
                description = COALESCE($4, description),
                sort_order = COALESCE($5, sort_order),
                is_enabled = COALESCE($6, is_enabled),
                updated_at = NOW()
            WHERE tenant_id = $7 AND id = $1
            RETURNING *
            "#,
        )
        .bind(folder_id)
        .bind(req.name)
        .bind(req.parent_id)
        .bind(req.description)
        .bind(req.sort_order)
        .bind(req.is_enabled)
        .bind(tenant_id)
        .fetch_optional(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(folder)
    }

    pub async fn delete_folder(&self, tenant_id: Uuid, folder_id: Uuid) -> Result<bool> {
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;
        let result = sqlx::query(
            r#"UPDATE core_doc_folders SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"#,
        )
        .bind(tenant_id)
        .bind(folder_id)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(result.rows_affected() > 0)
    }
}
