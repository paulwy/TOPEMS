use sqlx::{PgPool, Postgres, Result, Transaction};
use topems_shared_db::scope::ScopedTxn;
use uuid::Uuid;

use super::super::models::{CreateTemplateRequest, Template, UpdateTemplateRequest};

pub struct TemplateService {
    pool: PgPool,
}

impl TemplateService {
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

    pub async fn list_templates(&self, scope: &mut ScopedTxn<'_>) -> Result<Vec<Template>> {
        let rows = sqlx::query_as::<_, Template>(
            r#"SELECT id, tenant_id, name, category, description, content, content_type, fields, is_enabled, is_default, created_by, created_at, updated_at FROM public.core_doc_templates WHERE deleted_at IS NULL ORDER BY name"#,
        )
        .fetch_all(&mut *scope)
        .await?;
        Ok(rows)
    }

    pub async fn get_template(
        &self,
        scope: &mut ScopedTxn<'_>,
        template_id: Uuid,
    ) -> Result<Option<Template>> {
        let row = sqlx::query_as::<_, Template>(
            r#"SELECT id, tenant_id, name, category, description, content, content_type, fields, is_enabled, is_default, created_by, created_at, updated_at FROM public.core_doc_templates WHERE deleted_at IS NULL AND id = $1"#,
        )
        .bind(template_id)
        .fetch_optional(&mut *scope)
        .await?;
        Ok(row)
    }

    pub async fn create_template(
        &self,
        tenant_id: Uuid,
        req: CreateTemplateRequest,
        created_by: &str,
    ) -> Result<Template> {
        let fields = req.fields.unwrap_or(serde_json::json!([]));
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;
        let template = sqlx::query_as::<_, Template>(
            r#"
            INSERT INTO public.core_doc_templates (tenant_id, name, category, description, content, content_type, fields, is_enabled, is_default, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(tenant_id)
        .bind(req.name)
        .bind(req.category)
        .bind(req.description)
        .bind(req.content)
        .bind(req.content_type.unwrap_or_else(|| "html".to_string()))
        .bind(Some(fields))
        .bind(req.is_enabled.unwrap_or(true))
        .bind(req.is_default.unwrap_or(false))
        .bind(Some(created_by.to_string()))
        .fetch_one(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(template)
    }

    pub async fn update_template(
        &self,
        tenant_id: Uuid,
        template_id: Uuid,
        req: UpdateTemplateRequest,
    ) -> Result<Option<Template>> {
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;
        let template = sqlx::query_as::<_, Template>(
            r#"
            UPDATE public.core_doc_templates
            SET name = COALESCE($2, name),
                category = COALESCE($3, category),
                description = COALESCE($4, description),
                content = COALESCE($5, content),
                content_type = COALESCE($6, content_type),
                fields = COALESCE($7, fields),
                is_enabled = COALESCE($8, is_enabled),
                is_default = COALESCE($9, is_default),
                updated_at = NOW()
            WHERE tenant_id = $10 AND id = $1
            RETURNING *
            "#,
        )
        .bind(template_id)
        .bind(req.name)
        .bind(req.category)
        .bind(req.description)
        .bind(req.content)
        .bind(req.content_type)
        .bind(req.fields)
        .bind(req.is_enabled)
        .bind(req.is_default)
        .bind(tenant_id)
        .fetch_optional(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(template)
    }

    pub async fn delete_template(&self, tenant_id: Uuid, template_id: Uuid) -> Result<bool> {
        let mut tx = self.tenant_txn(Some(tenant_id)).await?;
        let result = sqlx::query(
            r#"UPDATE public.core_doc_templates SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"#,
        )
        .bind(tenant_id)
        .bind(template_id)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn list_categories(&self, scope: &mut ScopedTxn<'_>) -> Result<Vec<String>> {
        let rows = sqlx::query_scalar::<_, String>(
            r#"SELECT DISTINCT category FROM public.core_doc_templates WHERE deleted_at IS NULL AND category IS NOT NULL ORDER BY category"#,
        )
        .fetch_all(&mut *scope)
        .await?;
        Ok(rows)
    }
}
