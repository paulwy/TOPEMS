use axum::http::HeaderMap;
use sqlx::PgPool;
use topems_shared::Claims;
use uuid::Uuid;

use crate::models::*;

pub struct TenantService {
    pool: PgPool,
    tenant_id: Uuid,
}

impl TenantService {
    pub fn new(pool: PgPool, tenant_id: Uuid) -> Self {
        Self { pool, tenant_id }
    }

    pub fn tenant_id(&self) -> Uuid {
        self.tenant_id
    }

    pub async fn list_factory_maps(&self) -> Result<Vec<FactoryMap>, sqlx::Error> {
        sqlx::query_as::<_, FactoryMap>(
            "SELECT * FROM gis.factory_maps WHERE deleted_at IS NULL AND tenant_id = $1 ORDER BY created_at DESC LIMIT 100",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn create_factory_map(
        &self,
        name: &str,
        code: &str,
        map_type: &str,
        file_url: &str,
        bounds: Option<serde_json::Value>,
        description: Option<&str>,
    ) -> Result<FactoryMap, sqlx::Error> {
        sqlx::query_as::<_, FactoryMap>(
            r#"
            INSERT INTO gis.factory_maps (tenant_id, organization_id, name, code, map_type, file_url, bounds, description)
            VALUES ($1, $1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(self.tenant_id)
        .bind(name)
        .bind(code)
        .bind(map_type)
        .bind(file_url)
        .bind(bounds)
        .bind(description)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_factory_map(&self, id: Uuid) -> Result<Option<FactoryMap>, sqlx::Error> {
        sqlx::query_as::<_, FactoryMap>(
            "SELECT * FROM gis.factory_maps WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(self.tenant_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn update_factory_map(
        &self,
        id: Uuid,
        name: Option<&str>,
        code: Option<&str>,
        map_type: Option<&str>,
        file_url: Option<&str>,
        bounds: Option<serde_json::Value>,
        description: Option<&str>,
    ) -> Result<Option<FactoryMap>, sqlx::Error> {
        sqlx::query_as::<_, FactoryMap>(
            r#"
            UPDATE gis.factory_maps 
            SET name = COALESCE($2, name), code = COALESCE($3, code), 
                map_type = COALESCE($4, map_type), file_url = COALESCE($5, file_url),
                bounds = COALESCE($6, bounds), description = COALESCE($7, description),
                updated_at = NOW()
            WHERE id = $1 AND tenant_id = $8
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(code)
        .bind(map_type)
        .bind(file_url)
        .bind(bounds)
        .bind(description)
        .bind(self.tenant_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete_factory_map(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE gis.factory_maps SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(self.tenant_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn list_device_locations(&self) -> Result<Vec<DeviceLocation>, sqlx::Error> {
        sqlx::query_as::<_, DeviceLocation>(
            "SELECT * FROM gis.device_locations WHERE tenant_id = $1 ORDER BY created_at DESC",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_pipelines(&self) -> Result<Vec<Pipeline>, sqlx::Error> {
        sqlx::query_as::<_, Pipeline>(
            "SELECT * FROM gis.pipelines WHERE tenant_id = $1 ORDER BY created_at DESC",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_warehouse_locations(&self) -> Result<Vec<WarehouseLocation>, sqlx::Error> {
        sqlx::query_as::<_, WarehouseLocation>(
            "SELECT * FROM gis.warehouse_locations WHERE tenant_id = $1 ORDER BY created_at DESC",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_locations(&self) -> Result<Vec<Location>, sqlx::Error> {
        sqlx::query_as::<_, Location>(
            "SELECT * FROM gis.locations WHERE tenant_id = $1 ORDER BY created_at DESC",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_devices(&self) -> Result<Vec<Device>, sqlx::Error> {
        sqlx::query_as::<_, Device>(
            "SELECT * FROM gis.devices WHERE tenant_id = $1 ORDER BY created_at DESC",
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }
}

pub fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}
