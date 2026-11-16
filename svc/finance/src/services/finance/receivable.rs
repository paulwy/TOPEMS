use rust_decimal::Decimal;
use serde_json::{json, Value};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

/// 从 JSON 数值解析为 Decimal（仅入参解析，落库保持 Decimal 精度）
fn decimal_from_value(v: Option<&Value>) -> Option<Decimal> {
    v.and_then(|v| v.as_f64())
        .and_then(Decimal::from_f64_retain)
}

use super::FinanceService;
use topems_shared_core::error::TopemsError;

impl FinanceService {
    pub async fn list_receivables(
        &self,
        tenant_id: Uuid,
        page: i64,
        page_size: i64,
        status: Option<String>,
        customer_id: Option<Uuid>,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let offset = (page - 1) * page_size;

        let mut sql =
            "SELECT id, tenant_id, receivable_no, customer_id, customer_name, invoice_no, invoice_date, due_date, amount, currency, received_amount, status, description, created_by, created_at, updated_at FROM erp_receivables WHERE deleted_at IS NULL AND (tenant_id = $1::uuid)".to_string();
        let mut count_sql =
            "SELECT COUNT(*) FROM erp_receivables WHERE deleted_at IS NULL AND (tenant_id = $1::uuid)"
                .to_string();

        let mut cond = Vec::new();
        if status.is_some() {
            cond.push("status = $2".to_string());
        }
        if customer_id.is_some() {
            let idx = if status.is_some() { 3 } else { 2 };
            cond.push(format!("customer_id = ${}", idx));
        }

        if !cond.is_empty() {
            let cond_str = cond.join(" AND ");
            sql.push_str(" AND ");
            sql.push_str(&cond_str);
            count_sql.push_str(" AND ");
            count_sql.push_str(&cond_str);
        }

        sql.push_str(" ORDER BY created_at DESC LIMIT $");
        let limit_idx = if status.is_some() && customer_id.is_some() {
            4
        } else if status.is_some() || customer_id.is_some() {
            3
        } else {
            2
        };
        sql.push_str(&limit_idx.to_string());
        sql.push_str(" OFFSET $");
        sql.push_str(&(limit_idx + 1).to_string());

        let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(tenant_id);
        let mut count_query =
            sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql)).bind(tenant_id);

        if let Some(ref s) = status {
            query = query.bind(s);
            count_query = count_query.bind(s);
        }
        if let Some(cid) = customer_id {
            query = query.bind(cid);
            count_query = count_query.bind(cid);
        }

        query = query.bind(page_size).bind(offset);

        let mut scope = self.read_scope(txn).await?;

        let rows = query.fetch_all(&mut scope).await?;
        let total = count_query.fetch_one(&mut scope).await.unwrap_or(0);

        let items: Vec<Value> = rows
            .iter()
            .map(|row| {
                let id: Uuid = sqlx::Row::get(row, "id");
                let customer_name: Option<String> = sqlx::Row::try_get(row, "customer_name").ok();
                let amount: Option<Decimal> = sqlx::Row::try_get(row, "amount").ok();
                let status: Option<String> = sqlx::Row::try_get(row, "status").ok();
                let created_at: Option<chrono::DateTime<chrono::Utc>> =
                    sqlx::Row::try_get(row, "created_at").ok();
                json!({
                    "id": id.to_string(),
                    "customer_name": customer_name,
                    "amount": amount,
                    "status": status,
                    "created_at": created_at.map(|d| d.to_rfc3339()),
                })
            })
            .collect();

        Ok(json!({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size
        }))
    }

    pub async fn get_receivable(
        &self,
        tenant_id: Uuid,
        receivable_id: Uuid,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let mut scope = self.read_scope(txn).await?;

        let row = sqlx::query(
            only_own_schema_query!("finance", "SELECT id, tenant_id, receivable_no, customer_id, customer_name, invoice_no, invoice_date, due_date, amount, currency, received_amount, status, description, created_by, created_at, updated_at FROM erp_receivables WHERE deleted_at IS NULL AND (tenant_id = $1::uuid) AND id = $2"),
        )
        .bind(tenant_id)
        .bind(receivable_id)
        .fetch_optional(&mut scope)
        .await?
        .ok_or_else(|| TopemsError::NotFound("应收账款不存在".to_string()))?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let customer_name: Option<String> = sqlx::Row::try_get(&row, "customer_name").ok();
        let amount: Option<Decimal> = sqlx::Row::try_get(&row, "amount").ok();
        let status: Option<String> = sqlx::Row::try_get(&row, "status").ok();

        Ok(json!({
            "id": id.to_string(),
            "customer_name": customer_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn create_receivable(
        &self,
        tenant_id: Uuid,
        req: Value,
        created_by: &str,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let customer_name = req
            .get("customer_name")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let amount = decimal_from_value(req.get("amount")).unwrap_or(Decimal::ZERO);

        let mut scope = self.write_scope(txn).await?;

        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "INSERT INTO erp_receivables (tenant_id, customer_name, amount, status, created_by)
             VALUES ($1, $2, $3, 'unpaid', $4)
             RETURNING id, customer_name, amount, status, created_at"
        ))
        .bind(tenant_id)
        .bind(customer_name)
        .bind(amount)
        .bind(created_by)
        .fetch_one(&mut scope)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let customer_name: String = sqlx::Row::get(&row, "customer_name");
        let amount: Decimal = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        scope.commit().await?;

        Ok(json!({
            "id": id.to_string(),
            "customer_name": customer_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn update_receivable(
        &self,
        tenant_id: Uuid,
        receivable_id: Uuid,
        req: Value,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let customer_name = req.get("customer_name").and_then(|v| v.as_str());
        let amount = decimal_from_value(req.get("amount"));
        let status = req.get("status").and_then(|v| v.as_str());

        let mut scope = self.write_scope(txn).await?;

        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE erp_receivables
             SET customer_name = COALESCE($1, customer_name),
                 amount = COALESCE($2, amount),
                 status = COALESCE($3, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $4 AND id = $5
             RETURNING id, customer_name, amount, status, updated_at"
        ))
        .bind(customer_name)
        .bind(amount)
        .bind(status)
        .bind(tenant_id)
        .bind(receivable_id)
        .fetch_one(&mut scope)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let customer_name: String = sqlx::Row::get(&row, "customer_name");
        let amount: Decimal = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        scope.commit().await?;

        Ok(json!({
            "id": id.to_string(),
            "customer_name": customer_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn delete_receivable(
        &self,
        tenant_id: Uuid,
        receivable_id: Uuid,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<(), TopemsError> {
        let mut scope = self.write_scope(txn).await?;

        let result = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE erp_receivables SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"
        ))
        .bind(tenant_id)
        .bind(receivable_id)
        .execute(&mut scope)
        .await?;

        if result.rows_affected() == 0 {
            return Err(TopemsError::NotFound("应收账款不存在".to_string()));
        }

        scope.commit().await?;

        Ok(())
    }

    pub async fn get_receivable_aging(
        &self,
        tenant_id: Uuid,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let mut scope = self.read_scope(txn).await?;

        let rows = sqlx::query(
            only_own_schema_query!("finance", "SELECT
                '0-30天' as bucket,
                COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0) as amount,
                COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE - INTERVAL '30 days' AND status = 'unpaid') as cnt
             FROM erp_receivables WHERE (tenant_id = $1::uuid)
             UNION ALL
             SELECT '31-60天',
                COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0),
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days' AND status = 'unpaid')
             FROM erp_receivables WHERE (tenant_id = $1::uuid)
             UNION ALL
             SELECT '61-90天',
                COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0),
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days' AND status = 'unpaid')
             FROM erp_receivables WHERE (tenant_id = $1::uuid)
             UNION ALL
             SELECT '90天以上',
                COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '90 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0),
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '90 days' AND status = 'unpaid')
             FROM erp_receivables WHERE (tenant_id = $1::uuid)"),
        )
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;

        let mut aging_buckets = Vec::new();
        let mut total_amount = Decimal::ZERO;
        let mut total_count = 0_i64;

        for row in &rows {
            let bucket: String = sqlx::Row::get(row, "bucket");
            let amount: Decimal = sqlx::Row::try_get(row, "amount").unwrap_or(Decimal::ZERO);
            let cnt: i64 = sqlx::Row::try_get(row, "cnt").unwrap_or(0);
            total_amount += amount;
            total_count += cnt;
            aging_buckets.push(json!({
                "bucket": bucket,
                "amount": amount,
                "count": cnt
            }));
        }

        Ok(json!({
            "aging_buckets": aging_buckets,
            "total_overdue_amount": total_amount,
            "total_overdue_count": total_count
        }))
    }

    pub async fn batch_create_receivables(
        &self,
        tenant_id: Uuid,
        items: Vec<Value>,
        created_by: &str,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for item in items {
            match self
                .create_receivable(tenant_id, item, created_by, txn)
                .await
            {
                Ok(data) => {
                    success_count += 1;
                    results.push(json!({
                        "success": true,
                        "data": data
                    }));
                }
                Err(e) => {
                    fail_count += 1;
                    results.push(json!({
                        "success": false,
                        "error": e.to_string()
                    }));
                }
            }
        }

        Ok(json!({
            "success_count": success_count,
            "fail_count": fail_count,
            "results": results
        }))
    }
}
