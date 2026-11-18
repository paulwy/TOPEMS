use chrono::{DateTime, Utc};
use sqlx::{PgPool, Postgres, Result, Transaction};
use topems_shared_auth::middleware::tenant_scope::{BindTenantScope, TenantScope};
use topems_shared_db::audit::{AuditLogService, AuditOrigin, CreateAuditLogRequest};
use topems_shared_db::scope::ScopedTxn;
use uuid::Uuid;

use super::super::models::{
    CreateDocumentRequest, Document, DocumentVersion, UpdateDocumentRequest,
};

/// 版本功能上线前已存在、且从未产生版本行的文档，首次保存时先补的基线说明。
const BASELINE_VERSION_SUMMARY: &str = "历史内容基线（版本功能启用前的当前内容）";

/// 文档当前状态的轻量快照，仅用于版本编号与基线补录。
#[derive(Debug, sqlx::FromRow)]
struct DocVersionSnapshot {
    version: Option<i32>,
    content: Option<String>,
    created_by: Option<String>,
    created_at: Option<DateTime<Utc>>,
    updated_at: Option<DateTime<Utc>>,
}

/// 恢复版本的结果：用于区分「文档不存在」「版本不存在」与成功。
#[derive(Debug)]
pub enum RestoreVersionResult {
    Restored(Box<Document>),
    DocumentNotFound,
    VersionNotFound,
}

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
        sqlx::query(
            "SELECT set_config('app.tenant_id', $1, true), set_config('app.rls_system', 'off', true)",
        )
        .bind(rls_tenant)
        .execute(&mut *tx)
        .await?;
        Ok(tx)
    }

    /// 按 [`TenantScope`] 开启事务：A/B 类走 `from_claims`（租户 / 超管系统通道 / 服务令牌系统通道），
    /// C 类走 `require_tenant`。
    ///
    /// 系统通道同时置 `app.rls_system='on'`，供 SQL 里的显式系统通道谓词判定；
    /// 租户通道置 `off` 并绑定真实租户，二者互斥，不存在「绑空就全量」的降级。
    async fn scoped_txn(&self, scope: &TenantScope) -> Result<Transaction<'static, Postgres>> {
        let mut tx = self.pool.begin().await?;
        let rls_tenant = scope
            .tenant_id()
            .map(|t| t.to_string())
            .unwrap_or_else(|| Uuid::nil().to_string());
        sqlx::query(
            "SELECT set_config('app.tenant_id', $1, true), set_config('app.rls_system', $2, true)",
        )
        .bind(rls_tenant)
        .bind(if scope.is_system() { "on" } else { "off" })
        .execute(&mut *tx)
        .await?;
        Ok(tx)
    }

    pub async fn list_documents(&self, scope: &mut ScopedTxn<'_>) -> Result<Vec<Document>> {
        let rows = sqlx::query_as::<_, Document>(
            r#"SELECT id, tenant_id, title, folder_id, template_id, content, content_type, status, version, tags, description, file_name, file_path, file_size, mime_type, published_at, published_by, archived_at, archived_by, created_by, created_at, updated_at FROM public.core_doc_documents WHERE deleted_at IS NULL ORDER BY created_at DESC"#,
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
            r#"SELECT id, tenant_id, title, folder_id, template_id, content, content_type, status, version, tags, description, file_name, file_path, file_size, mime_type, published_at, published_by, archived_at, archived_by, created_by, created_at, updated_at FROM public.core_doc_documents WHERE deleted_at IS NULL AND id = $1"#,
        )
        .bind(document_id)
        .fetch_optional(&mut *scope)
        .await?;
        Ok(row)
    }

    /// 版本列表（A/B 类读路径）：按显式租户/系统通道谓词过滤，不依赖版本表自身 RLS。
    ///
    /// `public.core_doc_document_versions` 没有 `tenant_id` 列、也没有 RLS 策略，
    /// 因此必须 JOIN 文档表做归属校验，否则任何一个租户都能凭 document_id 读到别人的版本。
    pub async fn list_versions(
        &self,
        scope: &TenantScope,
        document_id: Uuid,
    ) -> Result<Vec<DocumentVersion>> {
        let predicate = scope.sql_predicate("d.tenant_id", "$2");
        let sql = format!(
            r#"SELECT v.id, v.document_id, v.version, v.content, v.summary, v.created_by, v.created_at
               FROM public.core_doc_document_versions v
               JOIN public.core_doc_documents d ON d.id = v.document_id
               WHERE v.document_id = $1 AND {predicate}
               ORDER BY v.version DESC"#
        );
        let mut tx = self.scoped_txn(scope).await?;
        let mut query =
            sqlx::query_as::<_, DocumentVersion>(sqlx::AssertSqlSafe(sql)).bind(document_id);
        query = query.bind_tenant_scope(scope);
        let rows = query.fetch_all(&mut *tx).await?;
        tx.commit().await?;
        Ok(rows)
    }

    /// 单版本详情（A/B 类读路径），归属校验同版本列表。
    pub async fn get_version(
        &self,
        scope: &TenantScope,
        document_id: Uuid,
        version: i32,
    ) -> Result<Option<DocumentVersion>> {
        let predicate = scope.sql_predicate("d.tenant_id", "$3");
        let sql = format!(
            r#"SELECT v.id, v.document_id, v.version, v.content, v.summary, v.created_by, v.created_at
               FROM public.core_doc_document_versions v
               JOIN public.core_doc_documents d ON d.id = v.document_id
               WHERE v.document_id = $1 AND v.version = $2 AND {predicate}"#
        );
        let mut tx = self.scoped_txn(scope).await?;
        let mut query = sqlx::query_as::<_, DocumentVersion>(sqlx::AssertSqlSafe(sql))
            .bind(document_id)
            .bind(version);
        query = query.bind_tenant_scope(scope);
        let row = query.fetch_optional(&mut *tx).await?;
        tx.commit().await?;
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
            INSERT INTO public.core_doc_documents (id, tenant_id, title, folder_id, template_id, content, content_type, status, tags, description, created_by)
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

        // 新建即 v1：版本链从文档诞生的那一刻开始，历史解释无缺口。
        let version = doc.version.unwrap_or(1);
        Self::append_version(
            &mut tx,
            doc.id,
            version,
            doc.content.as_deref().unwrap_or_default(),
            Some("创建文档"),
            created_by,
            None,
        )
        .await?;

        tx.commit().await?;
        Ok(doc)
    }

    /// 保存文档：同一事务内先锁文档行，再写文档与版本，版本号取自 `core_doc_documents.version + 1`。
    ///
    /// 历史数据的起点：版本功能上线前创建的文档没有任何版本行。首次保存时先补一条
    /// 「基线版本」（编号 = 文档当时的 version，时间 = 文档最后一次更新时间），
    /// 再追加本次保存版本，从而保证「上线前的内容」也能在历史里被解释，而不是凭空缺失。
    pub async fn update_document(
        &self,
        tenant_id: Uuid,
        document_id: Uuid,
        req: UpdateDocumentRequest,
        updated_by: &str,
    ) -> Result<Option<Document>> {
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;

        let snapshot = sqlx::query_as::<_, DocVersionSnapshot>(
            r#"SELECT version, content, created_by, created_at, updated_at
               FROM public.core_doc_documents
               WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
               FOR UPDATE"#,
        )
        .bind(tenant_id)
        .bind(document_id)
        .fetch_optional(&mut *tx)
        .await?;

        let Some(snapshot) = snapshot else {
            tx.rollback().await?;
            return Ok(None);
        };

        let has_history: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM public.core_doc_document_versions WHERE document_id = $1)",
        )
        .bind(document_id)
        .fetch_one(&mut *tx)
        .await?;

        if !has_history {
            Self::append_version(
                &mut tx,
                document_id,
                snapshot.version.unwrap_or(1),
                snapshot.content.as_deref().unwrap_or_default(),
                Some(BASELINE_VERSION_SUMMARY),
                snapshot.created_by.as_deref().unwrap_or("system"),
                snapshot.updated_at.or(snapshot.created_at),
            )
            .await?;
        }

        let next_version = snapshot.version.unwrap_or(1) + 1;
        let doc = sqlx::query_as::<_, Document>(
            r#"
            UPDATE public.core_doc_documents
            SET title = COALESCE($1, title), folder_id = COALESCE($2, folder_id),
                content = COALESCE($3, content), tags = COALESCE($4, tags),
                description = COALESCE($5, description), version = $6, updated_at = NOW()
            WHERE tenant_id = $7 AND id = $8
            RETURNING *
            "#,
        )
        .bind(req.title)
        .bind(req.folder_id)
        .bind(req.content)
        .bind(req.tags)
        .bind(req.description)
        .bind(next_version)
        .bind(tenant_id)
        .bind(document_id)
        .fetch_one(&mut *tx)
        .await?;

        Self::append_version(
            &mut tx,
            document_id,
            next_version,
            doc.content.as_deref().unwrap_or_default(),
            Some("更新文档"),
            updated_by,
            None,
        )
        .await?;

        tx.commit().await?;
        Ok(Some(doc))
    }

    pub async fn delete_document(&self, tenant_id: Uuid, document_id: Uuid) -> Result<bool> {
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;
        let result = sqlx::query(
            r#"UPDATE public.core_doc_documents SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"#,
        )
        .bind(tenant_id)
        .bind(document_id)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(result.rows_affected() > 0)
    }

    /// 恢复指定版本（C 类写路径：只允许租户内用户，缺失租户在 handler 即 400）。
    ///
    /// 同一事务内完成：锁文档 → 取目标版本内容 → 写回文档并递增 version →
    /// 追加一条「恢复」版本记录 → 写审计。恢复动作本身因此也进入版本历史，
    /// 且审计与恢复同事务提交，不会出现「恢复了但没留痕」。
    pub async fn restore_version(
        &self,
        tenant_id: Uuid,
        document_id: Uuid,
        version: i32,
        operator_id: Option<&str>,
        operator_name: &str,
    ) -> Result<RestoreVersionResult> {
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;

        let snapshot = sqlx::query_as::<_, DocVersionSnapshot>(
            r#"SELECT version, content, created_by, created_at, updated_at
               FROM public.core_doc_documents
               WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
               FOR UPDATE"#,
        )
        .bind(tenant_id)
        .bind(document_id)
        .fetch_optional(&mut *tx)
        .await?;

        let Some(snapshot) = snapshot else {
            tx.rollback().await?;
            return Ok(RestoreVersionResult::DocumentNotFound);
        };

        let content = sqlx::query_scalar::<_, String>(
            "SELECT content FROM public.core_doc_document_versions WHERE document_id = $1 AND version = $2",
        )
        .bind(document_id)
        .bind(version)
        .fetch_optional(&mut *tx)
        .await?;

        let Some(content) = content else {
            tx.rollback().await?;
            return Ok(RestoreVersionResult::VersionNotFound);
        };

        let next_version = snapshot.version.unwrap_or(1) + 1;
        let doc = sqlx::query_as::<_, Document>(
            r#"
            UPDATE public.core_doc_documents
            SET content = $1, version = $2, updated_at = NOW()
            WHERE tenant_id = $3 AND id = $4
            RETURNING id, tenant_id, title, folder_id, template_id, content, content_type, status,
                      version, tags, description, file_name, file_path, file_size, mime_type,
                      published_at, published_by, archived_at, archived_by, created_by,
                      created_at, updated_at
            "#,
        )
        .bind(&content)
        .bind(next_version)
        .bind(tenant_id)
        .bind(document_id)
        .fetch_one(&mut *tx)
        .await?;

        // 恢复动作必须自身留痕：新版本 = 被恢复内容，摘要写明来源版本。
        Self::append_version(
            &mut tx,
            document_id,
            next_version,
            &content,
            Some(&format!("恢复自版本 v{version}")),
            operator_name,
            None,
        )
        .await?;

        let audit_request = CreateAuditLogRequest::new(
            "restore_version".to_string(),
            "doc_document".to_string(),
            "success".to_string(),
        )
        .with_origin(AuditOrigin::Request)
        .with_tenant_id(tenant_id)
        .with_entity_id(document_id)
        .with_user(
            operator_id.unwrap_or_default().to_string(),
            operator_name.to_string(),
        )
        .with_request_details(serde_json::json!({
            "restored_version": version,
            "new_version": next_version,
        }));
        AuditLogService::new(self.pool.clone())
            .create_audit_log_with_txn(&mut tx, &audit_request)
            .await?;

        tx.commit().await?;
        Ok(RestoreVersionResult::Restored(Box::new(doc)))
    }

    /// 追加一条版本记录。`content` 列非空约束：文档 content 为 NULL 时存空串，
    /// 语义等价于「该版本没有正文」，避免版本写入被 NOT NULL 拒绝。
    async fn append_version(
        tx: &mut Transaction<'static, Postgres>,
        document_id: Uuid,
        version: i32,
        content: &str,
        summary: Option<&str>,
        created_by: &str,
        created_at: Option<DateTime<Utc>>,
    ) -> Result<()> {
        sqlx::query(
            r#"INSERT INTO public.core_doc_document_versions
               (document_id, version, content, summary, created_by, created_at)
               VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))"#,
        )
        .bind(document_id)
        .bind(version)
        .bind(content)
        .bind(summary)
        .bind(created_by)
        .bind(created_at)
        .execute(&mut **tx)
        .await?;
        Ok(())
    }
}
