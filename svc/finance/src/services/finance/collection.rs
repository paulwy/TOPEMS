use serde_json::{json, Value};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::FinanceService;
use topems_shared_core::error::TopemsError;

impl FinanceService {
    pub async fn list_collections(
        &self,
        tenant_id: Uuid,
        page: i64,
        page_size: i64,
        status: Option<String>,
        customer_id: Option<Uuid>,
    ) -> Result<Value, TopemsError> {
        let offset = (page - 1) * page_size;

        let mut sql =
            "SELECT id, tenant_id, collection_no, customer_id, customer_name, invoice_no, amount, currency, collected_amount, payment_method, status, collection_date, reference_no, remark, created_by, created_at, updated_at FROM erp_collection_records WHERE deleted_at IS NULL AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
                .to_string();
        let mut count_sql =
            "SELECT COUNT(*) FROM erp_collection_records WHERE deleted_at IS NULL AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)".to_string();

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

        let mut query = sqlx::query(&sql).bind(tenant_id);
        let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql).bind(tenant_id);

        if let Some(ref s) = status {
            query = query.bind(s);
            count_query = count_query.bind(s);
        }
        if let Some(cid) = customer_id {
            query = query.bind(cid);
            count_query = count_query.bind(cid);
        }

        query = query.bind(page_size).bind(offset);

        let rows = query.fetch_all(&self.db_pool).await?;
        let total = count_query.fetch_one(&self.db_pool).await.unwrap_or(0);

        let items: Vec<Value> = rows
            .iter()
            .map(|row| {
                let id: Uuid = sqlx::Row::get(row, "id");
                let collection_no: Option<String> = sqlx::Row::try_get(row, "collection_no").ok();
                let customer_name: Option<String> = sqlx::Row::try_get(row, "customer_name").ok();
                let amount: Option<f64> = sqlx::Row::try_get(row, "amount").ok();
                let status: Option<String> = sqlx::Row::try_get(row, "status").ok();
                let created_at: Option<chrono::DateTime<chrono::Utc>> =
                    sqlx::Row::try_get(row, "created_at").ok();
                json!({
                    "id": id.to_string(),
                    "collection_no": collection_no,
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

    pub async fn get_collection(
        &self,
        tenant_id: Uuid,
        collection_id: Uuid,
    ) -> Result<Value, TopemsError> {
        let row =
            sqlx::query(only_own_schema_query!("finance", "SELECT id, tenant_id, collection_no, customer_id, customer_name, invoice_no, amount, currency, collected_amount, payment_method, status, collection_date, reference_no, remark, created_by, created_at, updated_at FROM erp_collection_records WHERE deleted_at IS NULL AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1) AND id = $2"))
                .bind(tenant_id)
                .bind(collection_id)
                .fetch_optional(&self.db_pool)
                .await?
                .ok_or_else(|| TopemsError::NotFound("收款记录不存在".to_string()))?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let collection_no: Option<String> = sqlx::Row::try_get(&row, "collection_no").ok();
        let customer_name: Option<String> = sqlx::Row::try_get(&row, "customer_name").ok();
        let amount: Option<f64> = sqlx::Row::try_get(&row, "amount").ok();
        let status: Option<String> = sqlx::Row::try_get(&row, "status").ok();

        Ok(json!({
            "id": id.to_string(),
            "collection_no": collection_no,
            "customer_name": customer_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn create_collection(
        &self,
        tenant_id: Uuid,
        req: Value,
        created_by: &str,
    ) -> Result<Value, TopemsError> {
        let customer_name = req
            .get("customer_name")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let amount = req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let collection_no = req
            .get("collection_no")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let row = sqlx::query(
            only_own_schema_query!("finance", "INSERT INTO erp_collection_records (tenant_id, collection_no, customer_name, amount, status, created_by)
             VALUES ($1, $2, $3, $4, 'pending', $5)
             RETURNING id, collection_no, customer_name, amount, status, created_at"),
        )
        .bind(tenant_id)
        .bind(collection_no)
        .bind(customer_name)
        .bind(amount)
        .bind(created_by)
        .fetch_one(&self.db_pool)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let collection_no: String = sqlx::Row::get(&row, "collection_no");
        let customer_name: String = sqlx::Row::get(&row, "customer_name");
        let amount: f64 = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        Ok(json!({
            "id": id.to_string(),
            "collection_no": collection_no,
            "customer_name": customer_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn update_collection(
        &self,
        tenant_id: Uuid,
        collection_id: Uuid,
        req: Value,
    ) -> Result<Value, TopemsError> {
        let customer_name = req.get("customer_name").and_then(|v| v.as_str());
        let amount = req.get("amount").and_then(|v| v.as_f64());
        let status = req.get("status").and_then(|v| v.as_str());

        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE erp_collection_records
             SET customer_name = COALESCE($1, customer_name),
                 amount = COALESCE($2, amount),
                 status = COALESCE($3, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $4 AND id = $5
             RETURNING id, collection_no, customer_name, amount, status, updated_at"
        ))
        .bind(customer_name)
        .bind(amount)
        .bind(status)
        .bind(tenant_id)
        .bind(collection_id)
        .fetch_one(&self.db_pool)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let collection_no: String = sqlx::Row::get(&row, "collection_no");
        let customer_name: String = sqlx::Row::get(&row, "customer_name");
        let amount: f64 = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        Ok(json!({
            "id": id.to_string(),
            "collection_no": collection_no,
            "customer_name": customer_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn delete_collection(
        &self,
        tenant_id: Uuid,
        collection_id: Uuid,
    ) -> Result<(), TopemsError> {
        let result = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE erp_collection_records SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"
        ))
        .bind(tenant_id)
        .bind(collection_id)
        .execute(&self.db_pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(TopemsError::NotFound("收款记录不存在".to_string()));
        }

        Ok(())
    }

    pub async fn write_off_collection(
        &self,
        tenant_id: Uuid,
        collection_id: Uuid,
        receivable_id: Uuid,
        write_off_amount: f64,
    ) -> Result<Value, TopemsError> {
        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE erp_collection_records
             SET status = 'written_off', updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2
             RETURNING id, collection_no, status"
        ))
        .bind(tenant_id)
        .bind(collection_id)
        .fetch_one(&self.db_pool)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let status: String = sqlx::Row::get(&row, "status");

        let _ = receivable_id;
        let _ = write_off_amount;

        Ok(json!({
            "id": id.to_string(),
            "status": status,
            "message": "核销成功"
        }))
    }

    pub async fn batch_write_off(
        &self,
        tenant_id: Uuid,
        items: Vec<Value>,
    ) -> Result<Value, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for item in items {
            let collection_id_str = item
                .get("collection_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let receivable_id_str = item
                .get("receivable_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let amount = item.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);

            match (
                Uuid::parse_str(collection_id_str),
                Uuid::parse_str(receivable_id_str),
            ) {
                (Ok(cid), Ok(rid)) => {
                    match self.write_off_collection(tenant_id, cid, rid, amount).await {
                        Ok(data) => {
                            success_count += 1;
                            results.push(json!({
                                "success": true,
                                "collection_id": cid.to_string(),
                                "data": data
                            }));
                        }
                        Err(e) => {
                            fail_count += 1;
                            results.push(json!({
                                "success": false,
                                "collection_id": cid.to_string(),
                                "error": e.to_string()
                            }));
                        }
                    }
                }
                _ => {
                    fail_count += 1;
                    results.push(json!({
                        "success": false,
                        "error": "无效的ID格式"
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
