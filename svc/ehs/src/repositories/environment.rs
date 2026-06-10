use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use crate::models::*;
use anyhow::Result;

pub struct MonitoringPointRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> MonitoringPointRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        point_type: Option<String>,
        status: Option<String>,
    ) -> Result<(Vec<MonitoringPoint>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let points = sqlx::query_as::<_, MonitoringPoint>(
            r#"
            SELECT * FROM ehs.monitoring_points
            WHERE ($1::text IS NULL OR name ILIKE $1 OR point_no ILIKE $1)
              AND ($2::text IS NULL OR point_type = $2)
              AND ($3::text IS NULL OR status = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(&search_pattern)
        .bind(&point_type)
        .bind(&status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM ehs.monitoring_points
            WHERE ($1::text IS NULL OR name ILIKE $1 OR point_no ILIKE $1)
              AND ($2::text IS NULL OR point_type = $2)
              AND ($3::text IS NULL OR status = $3)
            "#,
        )
        .bind(&search_pattern)
        .bind(&point_type)
        .bind(&status)
        .fetch_one(self.pool)
        .await?;

        Ok((points, total))
    }

    pub async fn create(&self, req: CreateMonitoringPointRequest) -> Result<MonitoringPoint> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let parameters = serde_json::to_value(&req.parameters).unwrap_or(serde_json::json!([]));

        let point = sqlx::query_as::<_, MonitoringPoint>(
            r#"
            INSERT INTO ehs.monitoring_points 
            (id, point_no, name, point_type, location, latitude, longitude, parameters, thresholds, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.point_no)
        .bind(&req.name)
        .bind(&req.point_type)
        .bind(&req.location)
        .bind(req.latitude)
        .bind(req.longitude)
        .bind(parameters)
        .bind(&req.thresholds)
        .bind(&req.status)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(point)
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<MonitoringPoint>> {
        let point = sqlx::query_as::<_, MonitoringPoint>(
            "SELECT * FROM ehs.monitoring_points WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(point)
    }

    pub async fn update(&self, id: Uuid, req: UpdateMonitoringPointRequest) -> Result<MonitoringPoint> {
        let existing = self.get(id).await?.ok_or_else(|| anyhow::anyhow!("监测点不存在"))?;
        let now = Utc::now();

        let parameters = req.parameters
            .map(|v| serde_json::to_value(&v).unwrap_or(existing.parameters.clone()))
            .unwrap_or(existing.parameters);

        let point = sqlx::query_as::<_, MonitoringPoint>(
            r#"
            UPDATE ehs.monitoring_points SET
                point_no = $2, name = $3, point_type = $4, location = $5, latitude = $6, longitude = $7,
                parameters = $8, thresholds = $9, status = $10, updated_at = $11
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(req.point_no.unwrap_or(existing.point_no))
        .bind(req.name.unwrap_or(existing.name))
        .bind(req.point_type.unwrap_or(existing.point_type))
        .bind(req.location.or(existing.location))
        .bind(req.latitude.or(existing.latitude))
        .bind(req.longitude.or(existing.longitude))
        .bind(parameters)
        .bind(req.thresholds.or(existing.thresholds))
        .bind(req.status.unwrap_or(existing.status))
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(point)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM ehs.monitoring_points WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

pub struct EnvironmentalDataRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> EnvironmentalDataRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, req: CreateEnvironmentalDataRequest) -> Result<EnvironmentalData> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let data = sqlx::query_as::<_, EnvironmentalData>(
            r#"
            INSERT INTO ehs.environmental_data 
            (id, point_id, data_time, parameter, value, unit, quality, remarks, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(req.point_id)
        .bind(req.data_time)
        .bind(&req.parameter)
        .bind(req.value)
        .bind(&req.unit)
        .bind(&req.quality)
        .bind(&req.remarks)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(data)
    }

    pub async fn list_by_point(
        &self,
        point_id: Uuid,
        query: EnvironmentalDataQuery,
    ) -> Result<Vec<EnvironmentalData>> {
        let limit = query.limit.unwrap_or(100).min(1000);

        let data = sqlx::query_as::<_, EnvironmentalData>(
            r#"
            SELECT * FROM ehs.environmental_data
            WHERE point_id = $1
              AND ($2::timestamptz IS NULL OR data_time >= $2)
              AND ($3::timestamptz IS NULL OR data_time <= $3)
              AND ($4::text IS NULL OR parameter = $4)
            ORDER BY data_time DESC
            LIMIT $5
            "#,
        )
        .bind(point_id)
        .bind(query.start_time)
        .bind(query.end_time)
        .bind(&query.parameter)
        .bind(limit)
        .fetch_all(self.pool)
        .await?;

        Ok(data)
    }
}

pub struct EnvironmentalAlertRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> EnvironmentalAlertRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        status: Option<String>,
    ) -> Result<(Vec<EnvironmentalAlert>, i64)> {
        let offset = (page - 1) * page_size;

        let alerts = sqlx::query_as::<_, EnvironmentalAlert>(
            r#"
            SELECT * FROM ehs.environmental_alerts
            WHERE ($1::text IS NULL OR status = $1)
            ORDER BY alert_time DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM ehs.environmental_alerts WHERE ($1::text IS NULL OR status = $1)",
        )
        .bind(&status)
        .fetch_one(self.pool)
        .await?;

        Ok((alerts, total))
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<EnvironmentalAlert>> {
        let alert = sqlx::query_as::<_, EnvironmentalAlert>(
            "SELECT * FROM ehs.environmental_alerts WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(alert)
    }

    pub async fn handle(&self, id: Uuid, req: HandleAlertRequest) -> Result<EnvironmentalAlert> {
        let now = Utc::now();

        let alert = sqlx::query_as::<_, EnvironmentalAlert>(
            r#"
            UPDATE ehs.environmental_alerts SET
                status = 'handled', handled_time = $2, handle_result = $3
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(now)
        .bind(&req.handle_result)
        .fetch_one(self.pool)
        .await?;

        Ok(alert)
    }
}