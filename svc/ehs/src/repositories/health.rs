use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use crate::models::*;
use anyhow::Result;

pub struct HealthRecordRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> HealthRecordRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        employee_id: Option<String>,
    ) -> Result<(Vec<HealthRecord>, i64)> {
        let offset = (page - 1) * page_size;

        let records = sqlx::query_as::<_, HealthRecord>(
            r#"
            SELECT * FROM ehs.health_records
            WHERE ($1::text IS NULL OR employee_id = $1)
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&employee_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM ehs.health_records WHERE ($1::text IS NULL OR employee_id = $1)",
        )
        .bind(&employee_id)
        .fetch_one(self.pool)
        .await?;

        Ok((records, total))
    }

    pub async fn create(&self, req: CreateHealthRecordRequest) -> Result<HealthRecord> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let allergies = req.allergies.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));
        let chronic_diseases = req.chronic_diseases.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));

        let record = sqlx::query_as::<_, HealthRecord>(
            r#"
            INSERT INTO ehs.health_records 
            (id, employee_id, employee_name, gender, birth_date, blood_type, allergies, chronic_diseases, 
             medical_history, emergency_contact, emergency_phone, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.employee_id)
        .bind(&req.employee_name)
        .bind(&req.gender)
        .bind(req.birth_date)
        .bind(&req.blood_type)
        .bind(allergies)
        .bind(chronic_diseases)
        .bind(&req.medical_history)
        .bind(&req.emergency_contact)
        .bind(&req.emergency_phone)
        .bind(&req.status)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(record)
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<HealthRecord>> {
        let record = sqlx::query_as::<_, HealthRecord>(
            "SELECT * FROM ehs.health_records WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(record)
    }

    pub async fn update(&self, id: Uuid, req: UpdateHealthRecordRequest) -> Result<HealthRecord> {
        let existing = self.get(id).await?.ok_or_else(|| anyhow::anyhow!("健康档案不存在"))?;
        let now = Utc::now();

        let allergies = req.allergies
            .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
            .unwrap_or(existing.allergies);
        let chronic_diseases = req.chronic_diseases
            .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
            .unwrap_or(existing.chronic_diseases);

        let record = sqlx::query_as::<_, HealthRecord>(
            r#"
            UPDATE ehs.health_records SET
                employee_name = $2, gender = $3, birth_date = $4, blood_type = $5,
                allergies = $6, chronic_diseases = $7, medical_history = $8,
                emergency_contact = $9, emergency_phone = $10, status = $11, updated_at = $12
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(req.employee_name.unwrap_or(existing.employee_name))
        .bind(req.gender.or(existing.gender))
        .bind(req.birth_date.or(existing.birth_date))
        .bind(req.blood_type.or(existing.blood_type))
        .bind(allergies)
        .bind(chronic_diseases)
        .bind(req.medical_history.or(existing.medical_history))
        .bind(req.emergency_contact.or(existing.emergency_contact))
        .bind(req.emergency_phone.or(existing.emergency_phone))
        .bind(req.status.unwrap_or(existing.status))
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(record)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM ehs.health_records WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

pub struct HealthCheckupRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> HealthCheckupRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        employee_id: Option<String>,
    ) -> Result<(Vec<HealthCheckup>, i64)> {
        let offset = (page - 1) * page_size;

        let checkups = sqlx::query_as::<_, HealthCheckup>(
            r#"
            SELECT * FROM ehs.health_checkups
            WHERE ($1::text IS NULL OR employee_id = $1)
            ORDER BY checkup_date DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&employee_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM ehs.health_checkups WHERE ($1::text IS NULL OR employee_id = $1)",
        )
        .bind(&employee_id)
        .fetch_one(self.pool)
        .await?;

        Ok((checkups, total))
    }

    pub async fn create(&self, req: CreateHealthCheckupRequest) -> Result<HealthCheckup> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let abnormal_items = req.abnormal_items.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));
        let attachments = req.attachments.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));

        let checkup = sqlx::query_as::<_, HealthCheckup>(
            r#"
            INSERT INTO ehs.health_checkups 
            (id, employee_id, employee_name, checkup_date, checkup_type, institution, result_summary, 
             abnormal_items, recommendations, attachments, next_checkup_date, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.employee_id)
        .bind(&req.employee_name)
        .bind(req.checkup_date)
        .bind(&req.checkup_type)
        .bind(&req.institution)
        .bind(&req.result_summary)
        .bind(abnormal_items)
        .bind(&req.recommendations)
        .bind(attachments)
        .bind(req.next_checkup_date)
        .bind(&req.status)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(checkup)
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<HealthCheckup>> {
        let checkup = sqlx::query_as::<_, HealthCheckup>(
            "SELECT * FROM ehs.health_checkups WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(checkup)
    }
}

pub struct VaccinationRecordRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> VaccinationRecordRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        employee_id: Option<String>,
    ) -> Result<(Vec<VaccinationRecord>, i64)> {
        let offset = (page - 1) * page_size;

        let records = sqlx::query_as::<_, VaccinationRecord>(
            r#"
            SELECT * FROM ehs.vaccination_records
            WHERE ($1::text IS NULL OR employee_id = $1)
            ORDER BY vaccination_date DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&employee_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM ehs.vaccination_records WHERE ($1::text IS NULL OR employee_id = $1)",
        )
        .bind(&employee_id)
        .fetch_one(self.pool)
        .await?;

        Ok((records, total))
    }

    pub async fn create(&self, req: CreateVaccinationRecordRequest) -> Result<VaccinationRecord> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let attachments = req.attachments.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));

        let record = sqlx::query_as::<_, VaccinationRecord>(
            r#"
            INSERT INTO ehs.vaccination_records 
            (id, employee_id, employee_name, vaccine_name, vaccine_type, vaccination_date, dose_number,
             institution, batch_number, expiry_date, next_dose_date, remarks, attachments, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.employee_id)
        .bind(&req.employee_name)
        .bind(&req.vaccine_name)
        .bind(&req.vaccine_type)
        .bind(req.vaccination_date)
        .bind(req.dose_number)
        .bind(&req.institution)
        .bind(&req.batch_number)
        .bind(req.expiry_date)
        .bind(req.next_dose_date)
        .bind(&req.remarks)
        .bind(attachments)
        .bind(&req.status)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(record)
    }
}