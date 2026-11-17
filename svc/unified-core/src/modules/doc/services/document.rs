use sqlx::{PgPool, Postgres, Result, Transaction};
use topems_shared_db::scope::ScopedTxn;
use uuid::Uuid;

use super::super::models::{CreateDocumentRequest, Document, UpdateDocumentRequest};

pub struct DocumentService {
    pool: PgPool,
}

impl DocumentService {
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

    pub async fn list_documents(&self, scope: &mut ScopedTxn<'_>) -> Result<Vec<Document>> {
        let rows = sqlx::query_as::<_, Document>(
            r#"SELECT id, tenant_id, title, folder_id, template_id, content, content_type, status, version, tags, description, file_name, file_path, file_size, mime_type, published_at, published_by, archived_at, archived_by, created_by, created_at, updated_at FROM core_doc_documents WHERE deleted_at IS NULL ORDER BY created_at DESC"#,
        )
        .fetch_all(&mut *scope)
        .await?;
        Ok(rows)
    }

    pub async fn get_document(
        &self,
        scope: &mut ScopedTxn<'_>,
        document_id: Uuid,
    ) -> Result<Option<Document>> {
        let row = sqlx::query_as::<_, Document>(
            r#"SELECT id, tenant_id, title, folder_id, template_id, content, content_type, status, version, tags, description, file_name, file_path, file_size, mime_type, published_at, published_by, archived_at, archived_by, created_by, created_at, updated_at FROM core_doc_documents WHERE deleted_at IS NULL AND id = $1"#,
        )
        .bind(document_id)
        .fetch_optional(&mut *scope)
        .await?;
        Ok(row)
    }

    pub async fn create_document(
        &self,
        tenant_id: Uuid,
        req: CreateDocumentRequest,
        created_by: &str,
    ) -> Result<Document> {
        let id = Uuid::new_v4();
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;
        let doc = sqlx::query_as::<_, Document>(
            r#"
            INSERT INTO core_doc_documents (id, tenant_id, title, folder_id, template_id, content, content_type, status, tags, description, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(req.title)
        .bind(req.folder_id)
        .bind(req.template_id)
        .bind(req.content)
        .bind(req.content_type.unwrap_or_else(|| "html".to_string()))
        .bind(req.status.unwrap_or_else(|| "draft".to_string()))
        .bind(req.tags)
        .bind(req.description)
        .bind(Some(created_by.to_string()))
        .fetch_one(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(doc)
    }

    pub async fn update_document(
        &self,
        tenant_id: Uuid,
        document_id: Uuid,
        req: UpdateDocumentRequest,
    ) -> Result<Option<Document>> {
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;
        let doc = sqlx::query_as::<_, Document>(
            r#"
            UPDATE core_doc_documents
            SET title = COALESCE($1, title), folder_id = COALESCE($2, folder_id),
                content = COALESCE($3, content), tags = COALESCE($4, tags),
                description = COALESCE($5, description), updated_at = NOW()
            WHERE tenant_id = $6 AND id = $7
            RETURNING *
            "#,
        )
        .bind(req.title)
        .bind(req.folder_id)
        .bind(req.content)
        .bind(req.tags)
        .bind(req.description)
        .bind(tenant_id)
        .bind(document_id)
        .fetch_optional(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(doc)
    }

    pub async fn delete_document(&self, tenant_id: Uuid, document_id: Uuid) -> Result<bool> {
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;
        let result = sqlx::query(
            r#"UPDATE core_doc_documents SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"#,
        )
        .bind(tenant_id)
        .bind(document_id)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(result.rows_affected() > 0)
    }
}
