use sqlx::postgres::PgPool;
use crate::models::{
    Sample, TestRecord, Equipment,
    CreateSampleRequest, CreateTestRecordRequest, CreateEquipmentRequest,
    UpdateSampleRequest, UpdateTestRecordRequest, UpdateEquipmentRequest,
};
use chrono::{Utc, NaiveDate};
use uuid::Uuid;

pub struct SampleRepository {
    pool: PgPool,
}

impl SampleRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, req: CreateSampleRequest) -> Result<Sample, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let received_date = NaiveDate::parse_from_str(&req.received_date, "%Y-%m-%d").unwrap();
        let status = req.status.unwrap_or_else(|| "pending".to_string());

        let query = r#"
            INSERT INTO lims.samples (id, sample_id, name, description, sample_type, status, received_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, sample_id, name, description, sample_type, status, received_date, analysis_date, created_by, created_at, updated_at
        "#;

        sqlx::query_as::<_, Sample>(query)
            .bind(id)
            .bind(req.sample_id)
            .bind(req.name)
            .bind(req.description)
            .bind(req.sample_type)
            .bind(status)
            .bind(received_date)
            .bind(now)
            .bind(now)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<Sample>, sqlx::Error> {
        let query = r#"
            SELECT id, sample_id, name, description, sample_type, status, received_date, analysis_date, created_by, created_at, updated_at
            FROM lims.samples
            WHERE id = $1
        "#;

        sqlx::query_as::<_, Sample>(query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<Sample>, sqlx::Error> {
        let query = r#"
            SELECT id, sample_id, name, description, sample_type, status, received_date, analysis_date, created_by, created_at, updated_at
            FROM lims.samples
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        "#;

        sqlx::query_as::<_, Sample>(query)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn update(&self, id: Uuid, req: UpdateSampleRequest) -> Result<Option<Sample>, sqlx::Error> {
        let existing = self.get(id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        let s = existing.unwrap();
        let new_sample_id = req.sample_id.unwrap_or(s.sample_id);
        let new_name = req.name.unwrap_or(s.name);
        let new_description = req.description.or(s.description);
        let new_sample_type = req.sample_type.unwrap_or(s.sample_type);
        let new_status = req.status.unwrap_or(s.status);
        let new_analysis_date = req.analysis_date.and_then(|d| NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok()).or(s.analysis_date);

        let query = r#"
            UPDATE lims.samples
            SET sample_id = $1, name = $2, description = $3, sample_type = $4, status = $5, analysis_date = $6, updated_at = $7
            WHERE id = $8
            RETURNING id, sample_id, name, description, sample_type, status, received_date, analysis_date, created_by, created_at, updated_at
        "#;

        sqlx::query_as::<_, Sample>(query)
            .bind(new_sample_id)
            .bind(new_name)
            .bind(new_description)
            .bind(new_sample_type)
            .bind(new_status)
            .bind(new_analysis_date)
            .bind(Utc::now())
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let query = "DELETE FROM lims.samples WHERE id = $1";
        let result = sqlx::query(query)
            .bind(id)
            .execute(&self.pool)
            .await?;
        
        Ok(result.rows_affected() > 0)
    }
}

pub struct TestRecordRepository {
    pool: PgPool,
}

impl TestRecordRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, req: CreateTestRecordRequest) -> Result<TestRecord, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let status = req.status.unwrap_or_else(|| "pending".to_string());

        let query = r#"
            INSERT INTO lims.test_records (id, sample_id, test_name, test_method, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, sample_id, test_name, test_method, status, result, unit, standard, tested_by, tested_at, created_at, updated_at
        "#;

        sqlx::query_as::<_, TestRecord>(query)
            .bind(id)
            .bind(req.sample_id)
            .bind(req.test_name)
            .bind(req.test_method)
            .bind(status)
            .bind(now)
            .bind(now)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<TestRecord>, sqlx::Error> {
        let query = r#"
            SELECT id, sample_id, test_name, test_method, status, result, unit, standard, tested_by, tested_at, created_at, updated_at
            FROM lims.test_records
            WHERE id = $1
        "#;

        sqlx::query_as::<_, TestRecord>(query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list(&self, sample_id: Option<Uuid>, limit: i64, offset: i64) -> Result<Vec<TestRecord>, sqlx::Error> {
        let query = if let Some(_sid) = sample_id {
            r#"
                SELECT id, sample_id, test_name, test_method, status, result, unit, standard, tested_by, tested_at, created_at, updated_at
                FROM lims.test_records
                WHERE sample_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            "#
        } else {
            r#"
                SELECT id, sample_id, test_name, test_method, status, result, unit, standard, tested_by, tested_at, created_at, updated_at
                FROM lims.test_records
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
            "#
        };

        let mut q = sqlx::query_as::<_, TestRecord>(query);
        if let Some(sid) = sample_id {
            q = q.bind(sid).bind(limit).bind(offset);
        } else {
            q = q.bind(limit).bind(offset);
        }

        q.fetch_all(&self.pool).await
    }

    pub async fn update(&self, id: Uuid, req: UpdateTestRecordRequest) -> Result<Option<TestRecord>, sqlx::Error> {
        let existing = self.get(id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        let t = existing.unwrap();
        let new_test_name = req.test_name.unwrap_or(t.test_name);
        let new_test_method = req.test_method.or(t.test_method);
        let new_status = req.status.unwrap_or(t.status);
        let new_result = req.result.or(t.result);
        let new_unit = req.unit.or(t.unit);
        let new_standard = req.standard.or(t.standard);
        let new_tested_by = req.tested_by.or(t.tested_by);
        let tested_at = if new_status == "completed" && t.tested_at.is_none() {
            Some(Utc::now())
        } else {
            t.tested_at
        };

        let query = r#"
            UPDATE lims.test_records
            SET test_name = $1, test_method = $2, status = $3, result = $4, unit = $5, standard = $6, tested_by = $7, tested_at = $8, updated_at = $9
            WHERE id = $10
            RETURNING id, sample_id, test_name, test_method, status, result, unit, standard, tested_by, tested_at, created_at, updated_at
        "#;

        sqlx::query_as::<_, TestRecord>(query)
            .bind(new_test_name)
            .bind(new_test_method)
            .bind(new_status)
            .bind(new_result)
            .bind(new_unit)
            .bind(new_standard)
            .bind(new_tested_by)
            .bind(tested_at)
            .bind(Utc::now())
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let query = "DELETE FROM lims.test_records WHERE id = $1";
        let result = sqlx::query(query)
            .bind(id)
            .execute(&self.pool)
            .await?;
        
        Ok(result.rows_affected() > 0)
    }
}

pub struct EquipmentRepository {
    pool: PgPool,
}

impl EquipmentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, req: CreateEquipmentRequest) -> Result<Equipment, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let status = req.status.unwrap_or_else(|| "available".to_string());
        let last_calibration_date = req.last_calibration_date.and_then(|d| NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok());
        let next_calibration_date = req.next_calibration_date.and_then(|d| NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok());

        let query = r#"
            INSERT INTO lims.equipments (id, name, model, serial_number, status, location, last_calibration_date, next_calibration_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, name, model, serial_number, status, location, last_calibration_date, next_calibration_date, created_at, updated_at
        "#;

        sqlx::query_as::<_, Equipment>(query)
            .bind(id)
            .bind(req.name)
            .bind(req.model)
            .bind(req.serial_number)
            .bind(status)
            .bind(req.location)
            .bind(last_calibration_date)
            .bind(next_calibration_date)
            .bind(now)
            .bind(now)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<Equipment>, sqlx::Error> {
        let query = r#"
            SELECT id, name, model, serial_number, status, location, last_calibration_date, next_calibration_date, created_at, updated_at
            FROM lims.equipments
            WHERE id = $1
        "#;

        sqlx::query_as::<_, Equipment>(query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<Equipment>, sqlx::Error> {
        let query = r#"
            SELECT id, name, model, serial_number, status, location, last_calibration_date, next_calibration_date, created_at, updated_at
            FROM lims.equipments
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        "#;

        sqlx::query_as::<_, Equipment>(query)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn update(&self, id: Uuid, req: UpdateEquipmentRequest) -> Result<Option<Equipment>, sqlx::Error> {
        let existing = self.get(id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        let e = existing.unwrap();
        let new_name = req.name.unwrap_or(e.name);
        let new_model = req.model.or(e.model);
        let new_serial_number = req.serial_number.or(e.serial_number);
        let new_status = req.status.unwrap_or(e.status);
        let new_location = req.location.or(e.location);
        let new_last_cal = req.last_calibration_date.and_then(|d| NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok()).or(e.last_calibration_date);
        let new_next_cal = req.next_calibration_date.and_then(|d| NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok()).or(e.next_calibration_date);

        let query = r#"
            UPDATE lims.equipments
            SET name = $1, model = $2, serial_number = $3, status = $4, location = $5, last_calibration_date = $6, next_calibration_date = $7, updated_at = $8
            WHERE id = $9
            RETURNING id, name, model, serial_number, status, location, last_calibration_date, next_calibration_date, created_at, updated_at
        "#;

        sqlx::query_as::<_, Equipment>(query)
            .bind(new_name)
            .bind(new_model)
            .bind(new_serial_number)
            .bind(new_status)
            .bind(new_location)
            .bind(new_last_cal)
            .bind(new_next_cal)
            .bind(Utc::now())
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let query = "DELETE FROM lims.equipments WHERE id = $1";
        let result = sqlx::query(query)
            .bind(id)
            .execute(&self.pool)
            .await?;
        
        Ok(result.rows_affected() > 0)
    }
}
