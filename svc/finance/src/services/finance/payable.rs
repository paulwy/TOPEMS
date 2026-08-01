use serde_json::{json, Value};
use uuid::Uuid;

use super::FinanceService;
use topems_shared::error::TopemsError;

impl FinanceService {
    pub async fn list_payables(
        &self,
        tenant_id: Uuid,
        page: i64,
        page_size: i64,
        status: Option<String>,
        supplier_id: Option<Uuid>,
    ) -> Result<Value, TopemsError> {
        let offset = (page - 1) * page_size;

        let mut sql = "SELECT * FROM erp_payables WHERE tenant_id = $1".to_string();
        let mut count_sql = "SELECT COUNT(*) FROM erp_payables WHERE tenant_id = $1".to_string();

        let mut cond = Vec::new();
        if status.is_some() {
            cond.push("status = $2".to_string());
        }
        if supplier_id.is_some() {
            let idx = if status.is_some() { 3 } else { 2 };
            cond.push(format!("supplier_id = ${}", idx));
        }

        if !cond.is_empty() {
            let cond_str = cond.join(" AND ");
            sql.push_str(" AND ");
            sql.push_str(&cond_str);
            count_sql.push_str(" AND ");
            count_sql.push_str(&cond_str);
        }

        sql.push_str(" ORDER BY created_at DESC LIMIT $");
        let limit_idx = if status.is_some() && supplier_id.is_some() {
            4
        } else if status.is_some() || supplier_id.is_some() {
            3
        } else {
            2
        };
        sql.push_str(&limit_idx.to_string());
        sql.push_str(" OFFSET $");
        sql.push_str(&(limit_idx + 1).to_string());

        let mut query = sqlx::query(&sql).bind(tenant_id);
        let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql).bind(tenant_id);

        if let Some(ref s) = status {
            query = query.bind(s);
            count_query = count_query.bind(s);
        }
        if let Some(sid) = supplier_id {
            query = query.bind(sid);
            count_query = count_query.bind(sid);
        }

        query = query.bind(page_size).bind(offset);

        let rows = query.fetch_all(&self.db_pool).await?;
        let total = count_query.fetch_one(&self.db_pool).await.unwrap_or(0);

        let items: Vec<Value> = rows
            .iter()
            .map(|row| {
                let id: Uuid = sqlx::Row::get(row, "id");
                let supplier_name: Option<String> = sqlx::Row::try_get(row, "supplier_name").ok();
                let amount: Option<f64> = sqlx::Row::try_get(row, "amount").ok();
                let status: Option<String> = sqlx::Row::try_get(row, "status").ok();
                let created_at: Option<chrono::DateTime<chrono::Utc>> =
                    sqlx::Row::try_get(row, "created_at").ok();
                json!({
                    "id": id.to_string(),
                    "supplier_name": supplier_name,
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

    pub async fn get_payable(
        &self,
        tenant_id: Uuid,
        payable_id: Uuid,
    ) -> Result<Value, TopemsError> {
        let row = sqlx::query("SELECT * FROM erp_payables WHERE tenant_id = $1 AND id = $2")
            .bind(tenant_id)
            .bind(payable_id)
            .fetch_optional(&self.db_pool)
            .await?
            .ok_or_else(|| TopemsError::NotFound("应付账款不存在".to_string()))?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let supplier_name: Option<String> = sqlx::Row::try_get(&row, "supplier_name").ok();
        let amount: Option<f64> = sqlx::Row::try_get(&row, "amount").ok();
        let status: Option<String> = sqlx::Row::try_get(&row, "status").ok();

        Ok(json!({
            "id": id.to_string(),
            "supplier_name": supplier_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn create_payable(
        &self,
        tenant_id: Uuid,
        req: Value,
        created_by: &str,
    ) -> Result<Value, TopemsError> {
        let supplier_name = req
            .get("supplier_name")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let amount = req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);

        let row = sqlx::query(
            "INSERT INTO erp_payables (tenant_id, supplier_name, amount, status, created_by)
             VALUES ($1, $2, $3, 'unpaid', $4)
             RETURNING id, supplier_name, amount, status, created_at",
        )
        .bind(tenant_id)
        .bind(supplier_name)
        .bind(amount)
        .bind(created_by)
        .fetch_one(&self.db_pool)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let supplier_name: String = sqlx::Row::get(&row, "supplier_name");
        let amount: f64 = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        Ok(json!({
            "id": id.to_string(),
            "supplier_name": supplier_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn update_payable(
        &self,
        tenant_id: Uuid,
        payable_id: Uuid,
        req: Value,
    ) -> Result<Value, TopemsError> {
        let supplier_name = req.get("supplier_name").and_then(|v| v.as_str());
        let amount = req.get("amount").and_then(|v| v.as_f64());
        let status = req.get("status").and_then(|v| v.as_str());

        let row = sqlx::query(
            "UPDATE erp_payables
             SET supplier_name = COALESCE($1, supplier_name),
                 amount = COALESCE($2, amount),
                 status = COALESCE($3, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $4 AND id = $5
             RETURNING id, supplier_name, amount, status, updated_at",
        )
        .bind(supplier_name)
        .bind(amount)
        .bind(status)
        .bind(tenant_id)
        .bind(payable_id)
        .fetch_one(&self.db_pool)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let supplier_name: String = sqlx::Row::get(&row, "supplier_name");
        let amount: f64 = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        Ok(json!({
            "id": id.to_string(),
            "supplier_name": supplier_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn delete_payable(
        &self,
        tenant_id: Uuid,
        payable_id: Uuid,
    ) -> Result<(), TopemsError> {
        let result = sqlx::query("DELETE FROM erp_payables WHERE tenant_id = $1 AND id = $2")
            .bind(tenant_id)
            .bind(payable_id)
            .execute(&self.db_pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(TopemsError::NotFound("应付账款不存在".to_string()));
        }

        Ok(())
    }

    pub async fn get_payable_aging(&self, tenant_id: Uuid) -> Result<Value, TopemsError> {
        let rows = sqlx::query(
            "SELECT
                '0-30天' as bucket,
                COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0) as amount,
                COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE - INTERVAL '30 days' AND status = 'unpaid') as cnt
             FROM erp_payables WHERE tenant_id = $1
             UNION ALL
             SELECT '31-60天',
                COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0),
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days' AND status = 'unpaid')
             FROM erp_payables WHERE tenant_id = $1
             UNION ALL
             SELECT '61-90天',
                COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0),
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days' AND status = 'unpaid')
             FROM erp_payables WHERE tenant_id = $1
             UNION ALL
             SELECT '90天以上',
                COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '90 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0),
                COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '90 days' AND status = 'unpaid')
             FROM erp_payables WHERE tenant_id = $1",
        )
        .bind(tenant_id)
        .fetch_all(&self.db_pool)
        .await?;

        let mut aging_buckets = Vec::new();
        let mut total_amount = 0.0_f64;
        let mut total_count = 0_i64;

        for row in &rows {
            let bucket: String = sqlx::Row::get(row, "bucket");
            let amount: f64 = sqlx::Row::try_get(row, "amount").unwrap_or(0.0);
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

    pub async fn batch_create_payables(
        &self,
        tenant_id: Uuid,
        items: Vec<Value>,
        created_by: &str,
    ) -> Result<Value, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for item in items {
            match self.create_payable(tenant_id, item, created_by).await {
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
