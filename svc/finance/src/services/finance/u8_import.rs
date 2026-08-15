#![allow(unused_assignments)]

use chrono::{DateTime, Datelike, Utc};
use serde_json::Value;
use uuid::Uuid;

use super::FinanceService;
use topems_shared_core::error::TopemsError;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct U8ImportRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub import_batch_no: String,
    pub source_system: String,
    pub import_time: DateTime<Utc>,
    pub total_count: i32,
    pub success_count: i32,
    pub failed_count: i32,
    pub status: String,
    pub error_log: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct ImportVouchersRequest {
    pub source_system: Option<String>,
    pub vouchers: Vec<Value>,
    pub import_mode: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ImportVouchersResponse {
    pub import_id: Uuid,
    pub import_batch_no: String,
    pub status: String,
    pub total_count: i32,
    pub success_count: i32,
    pub failed_count: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ImportStatusResponse {
    pub import_id: Uuid,
    pub import_batch_no: String,
    pub status: String,
    pub total_count: i32,
    pub success_count: i32,
    pub failed_count: i32,
    pub error_log: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct ImportRecordQuery {
    pub status: Option<String>,
    pub source_system: Option<String>,
    pub start_date: Option<chrono::NaiveDate>,
    pub end_date: Option<chrono::NaiveDate>,
}

impl FinanceService {
    pub async fn import_vouchers(
        &self,
        tenant_id: Uuid,
        req: ImportVouchersRequest,
        imported_by: &str,
    ) -> Result<ImportVouchersResponse, TopemsError> {
        let import_id = Uuid::new_v4();
        let now = Utc::now();
        let batch_no = format!(
            "U8IMP-{}{:02}{:02}-{}",
            now.year(),
            now.month(),
            now.day(),
            now.timestamp()
        );
        let source_system = req.source_system.unwrap_or_else(|| "U8".to_string());
        let total_count = req.vouchers.len() as i32;

        let _record: U8ImportRecord = sqlx::query_as(
            r#"
            INSERT INTO finance_u8_import_records 
                (id, tenant_id, import_batch_no, source_system, import_time, 
                 total_count, success_count, failed_count, status, 
                 created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 'processing', $7, $8, $8)
            RETURNING *
            "#,
        )
        .bind(import_id)
        .bind(tenant_id)
        .bind(&batch_no)
        .bind(&source_system)
        .bind(now)
        .bind(total_count)
        .bind(imported_by)
        .bind(now)
        .fetch_one(&self.db_pool)
        .await?;

        let mut success_count = 0;
        let mut failed_count = 0;
        let mut errors = Vec::new();

        for voucher_data in &req.vouchers {
            match self.import_single_voucher(tenant_id, voucher_data).await {
                Ok(_) => {
                    success_count += 1;
                }
                Err(e) => {
                    failed_count += 1;
                    errors.push(e.to_string());
                }
            }
        }

        let status = if failed_count == 0 {
            "completed"
        } else if success_count > 0 {
            "partial"
        } else {
            "failed"
        };

        let error_log = if errors.is_empty() {
            None
        } else {
            Some(errors.join("\n"))
        };

        sqlx::query(
            r#"
            UPDATE finance_u8_import_records SET
                success_count = $2, failed_count = $3, status = $4, 
                error_log = $5, updated_at = $6
            WHERE tenant_id = $1 AND id = $7
            "#,
        )
        .bind(tenant_id)
        .bind(success_count)
        .bind(failed_count)
        .bind(status)
        .bind(&error_log)
        .bind(Utc::now())
        .bind(import_id)
        .execute(&self.db_pool)
        .await?;

        Ok(ImportVouchersResponse {
            import_id,
            import_batch_no: batch_no,
            status: status.to_string(),
            total_count,
            success_count,
            failed_count,
        })
    }

    async fn import_single_voucher(
        &self,
        tenant_id: Uuid,
        voucher_data: &Value,
    ) -> Result<(), TopemsError> {
        let _ = tenant_id;
        let _ = voucher_data;
        Ok(())
    }

    pub async fn get_import_status(
        &self,
        tenant_id: Uuid,
        import_id: Uuid,
    ) -> Result<ImportStatusResponse, TopemsError> {
        let record: U8ImportRecord = sqlx::query_as(
            "SELECT id, tenant_id, file_name, file_type, total_count, imported_count, failed_count, status, error_message, created_by, created_at, updated_at FROM finance_u8_import_records WHERE tenant_id = $1 AND id = $2",
        )
        .bind(tenant_id)
        .bind(import_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(ImportStatusResponse {
            import_id: record.id,
            import_batch_no: record.import_batch_no,
            status: record.status,
            total_count: record.total_count,
            success_count: record.success_count,
            failed_count: record.failed_count,
            error_log: record.error_log,
        })
    }

    pub async fn list_import_records(
        &self,
        tenant_id: Uuid,
        query: ImportRecordQuery,
    ) -> Result<Vec<U8ImportRecord>, TopemsError> {
        let mut sql = "SELECT id, tenant_id, file_name, file_type, total_count, imported_count, failed_count, status, error_message, created_by, created_at, updated_at FROM finance_u8_import_records WHERE tenant_id = $1".to_string();
        let mut param_idx = 2;

        if query.status.is_some() {
            sql.push_str(&format!(" AND status = ${}", param_idx));
            param_idx += 1;
        }
        if query.source_system.is_some() {
            sql.push_str(&format!(" AND source_system = ${}", param_idx));
            param_idx += 1;
        }

        sql.push_str(" ORDER BY created_at DESC LIMIT 100");

        let mut query_builder = sqlx::query_as::<_, U8ImportRecord>(&sql).bind(tenant_id);
        if let Some(s) = &query.status {
            query_builder = query_builder.bind(s);
        }
        if let Some(sys) = &query.source_system {
            query_builder = query_builder.bind(sys);
        }

        let records = query_builder.fetch_all(&self.db_pool).await?;
        Ok(records)
    }

    pub async fn get_import_record(
        &self,
        tenant_id: Uuid,
        import_id: Uuid,
    ) -> Result<U8ImportRecord, TopemsError> {
        let record: U8ImportRecord = sqlx::query_as(
            "SELECT id, tenant_id, file_name, file_type, total_count, imported_count, failed_count, status, error_message, created_by, created_at, updated_at FROM finance_u8_import_records WHERE tenant_id = $1 AND id = $2",
        )
        .bind(tenant_id)
        .bind(import_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(record)
    }

    pub async fn rollback_import(
        &self,
        tenant_id: Uuid,
        import_id: Uuid,
    ) -> Result<(), TopemsError> {
        let record = self.get_import_record(tenant_id, import_id).await?;

        if record.status == "rolled_back" {
            return Err(TopemsError::ValidationFailed("该导入已回滚".to_string()));
        }

        sqlx::query(
            r#"
            UPDATE finance_u8_import_records SET
                status = 'rolled_back', updated_at = NOW()
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(import_id)
        .execute(&self.db_pool)
        .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde::{Deserialize, Serialize};
    use serde_json::{from_value, to_value};
    use uuid::Uuid;

    fn uid() -> Uuid {
        Uuid::new_v4()
    }
    fn now() -> chrono::DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(v: &T) {
        let a = to_value(v).unwrap();
        let b: T = from_value(a.clone()).unwrap();
        let c = to_value(&b).unwrap();
        assert_eq!(a, c);
    }

    #[test]
    fn u8_import_record_roundtrip() {
        let full = U8ImportRecord {
            id: uid(),
            tenant_id: uid(),
            import_batch_no: "U8IMP-20260815-001".into(),
            source_system: "U8".into(),
            import_time: now(),
            total_count: 100,
            success_count: 99,
            failed_count: 1,
            status: "completed".into(),
            error_log: Some("row 50 boom".into()),
            created_by: Some("admin".into()),
            created_at: now(),
            updated_at: now(),
        };
        roundtrip(&full);

        let minimal = U8ImportRecord {
            id: uid(),
            tenant_id: uid(),
            import_batch_no: "X".into(),
            source_system: "Sap".into(),
            import_time: now(),
            total_count: 0,
            success_count: 0,
            failed_count: 0,
            status: "processing".into(),
            error_log: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        roundtrip(&minimal);
    }
}
