use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::*;

pub struct TenantService {
    pool: PgPool,
    tenant_id: Option<Uuid>,
}

impl TenantService {
    pub fn new(pool: PgPool, tenant_id: Option<Uuid>) -> Self {
        Self { pool, tenant_id }
    }

    fn effective_tenant(&self) -> Uuid {
        self.tenant_id.unwrap_or_else(|| {
            Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
        })
    }

    pub fn tenant_id(&self) -> Uuid {
        self.effective_tenant()
    }

    pub async fn list_factory_maps(&self) -> Result<Vec<FactoryMap>, sqlx::Error> {
        sqlx::query_as::<_, FactoryMap>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, name, code, map_type, file_url, bounds, description, created_at, updated_at FROM gis.factory_maps WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC LIMIT 100"),
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
            only_own_schema_query!("gis", r#"
            INSERT INTO gis.factory_maps (tenant_id, name, code, map_type, file_url, bounds, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#),
        )
        .bind(self.effective_tenant())
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
            only_own_schema_query!("gis", "SELECT id, tenant_id, name, code, map_type, file_url, bounds, description, created_at, updated_at FROM gis.factory_maps WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"),
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
        sqlx::query_as::<_, FactoryMap>(only_own_schema_query!(
            "gis",
            r#"
            UPDATE gis.factory_maps 
            SET name = COALESCE($2, name), code = COALESCE($3, code), 
                map_type = COALESCE($4, map_type), file_url = COALESCE($5, file_url),
                bounds = COALESCE($6, bounds), description = COALESCE($7, description),
                updated_at = NOW()
            WHERE id = $1 AND ($8::uuid IS NULL OR tenant_id = $8)
            RETURNING *
            "#
        ))
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
        let result = sqlx::query(only_own_schema_query!(
            "gis",
            "UPDATE gis.factory_maps SET deleted_at = NOW() WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"
        ))
        .bind(id)
        .bind(self.tenant_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn list_device_locations(&self) -> Result<Vec<DeviceLocation>, sqlx::Error> {
        sqlx::query_as::<_, DeviceLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, device_name, device_code, device_type, position, status, description, last_inspected, created_at, updated_at FROM gis.device_locations WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC"),
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_pipelines(&self) -> Result<Vec<Pipeline>, sqlx::Error> {
        sqlx::query_as::<_, Pipeline>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM gis.pipelines WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC"),
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_warehouse_locations(&self) -> Result<Vec<WarehouseLocation>, sqlx::Error> {
        sqlx::query_as::<_, WarehouseLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate, status, created_at, updated_at FROM gis.warehouse_locations WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC"),
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_locations(&self) -> Result<Vec<Location>, sqlx::Error> {
        sqlx::query_as::<_, Location>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, name, code, location_type, position, address, description, properties, status, created_at, updated_at FROM gis.locations WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC"),
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_devices(&self) -> Result<Vec<Device>, sqlx::Error> {
        sqlx::query_as::<_, Device>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC"),
        )
        .bind(self.tenant_id)
        .fetch_all(&self.pool)
        .await
    }
}
