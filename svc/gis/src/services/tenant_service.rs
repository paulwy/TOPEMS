use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::*;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

pub struct TenantService {
    db: Db,
    tenant_id: Option<Uuid>,
}

impl TenantService {
    pub fn new(db: Db, tenant_id: Option<Uuid>) -> Self {
        Self { db, tenant_id }
    }

    fn effective_tenant(&self) -> Uuid {
        self.tenant_id
            .unwrap_or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap())
    }

    pub fn tenant_id(&self) -> Uuid {
        self.effective_tenant()
    }

    pub async fn list_factory_maps(
        &self,
        txn_arc: &RlsTxnCell,
    ) -> Result<Vec<FactoryMap>, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query_as::<_, FactoryMap>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, name, code, map_type, file_url, bounds, description, created_at, updated_at FROM gis.factory_maps WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100"),
        )
        .fetch_all(&mut scope)
        .await;
        if result.is_ok() {
            scope.commit().await?;
        }
        result
    }

    pub async fn create_factory_map(
        &self,
        txn_arc: &RlsTxnCell,
        name: &str,
        code: &str,
        map_type: &str,
        file_url: &str,
        bounds: Option<serde_json::Value>,
        description: Option<&str>,
    ) -> Result<FactoryMap, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query_as::<_, FactoryMap>(
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
        .fetch_one(&mut scope)
        .await;
        if result.is_ok() {
            scope.commit().await?;
        }
        result
    }

    pub async fn get_factory_map(
        &self,
        txn_arc: &RlsTxnCell,
        id: Uuid,
    ) -> Result<Option<FactoryMap>, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query_as::<_, FactoryMap>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, name, code, map_type, file_url, bounds, description, created_at, updated_at FROM gis.factory_maps WHERE deleted_at IS NULL AND id = $1"),
        )
        .bind(id)
        .fetch_optional(&mut scope)
        .await;
        if result.is_ok() {
            scope.commit().await?;
        }
        result
    }

    pub async fn update_factory_map(
        &self,
        txn_arc: &RlsTxnCell,
        id: Uuid,
        name: Option<&str>,
        code: Option<&str>,
        map_type: Option<&str>,
        file_url: Option<&str>,
        bounds: Option<serde_json::Value>,
        description: Option<&str>,
    ) -> Result<Option<FactoryMap>, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query_as::<_, FactoryMap>(only_own_schema_query!(
            "gis",
            r#"
            UPDATE gis.factory_maps 
            SET name = COALESCE($2, name), code = COALESCE($3, code), 
                map_type = COALESCE($4, map_type), file_url = COALESCE($5, file_url),
                bounds = COALESCE($6, bounds), description = COALESCE($7, description),
                updated_at = NOW()
            WHERE id = $1
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
        .fetch_optional(&mut scope)
        .await;
        if result.is_ok() {
            scope.commit().await?;
        }
        result
    }

    pub async fn delete_factory_map(
        &self,
        txn_arc: &RlsTxnCell,
        id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query(only_own_schema_query!(
            "gis",
            "UPDATE gis.factory_maps SET deleted_at = NOW() WHERE id = $1"
        ))
        .bind(id)
        .execute(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn list_device_locations(
        &self,
        txn_arc: &RlsTxnCell,
    ) -> Result<Vec<DeviceLocation>, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query_as::<_, DeviceLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, device_name, device_code, device_type, position, status, description, last_inspected, created_at, updated_at FROM gis.device_locations ORDER BY created_at DESC"),
        )
        .fetch_all(&mut scope)
        .await;
        if result.is_ok() {
            scope.commit().await?;
        }
        result
    }

    pub async fn list_pipelines(&self, txn_arc: &RlsTxnCell) -> Result<Vec<Pipeline>, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query_as::<_, Pipeline>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM gis.pipelines ORDER BY created_at DESC"),
        )
        .fetch_all(&mut scope)
        .await;
        if result.is_ok() {
            scope.commit().await?;
        }
        result
    }

    pub async fn list_warehouse_locations(
        &self,
        txn_arc: &RlsTxnCell,
    ) -> Result<Vec<WarehouseLocation>, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query_as::<_, WarehouseLocation>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, warehouse_name, zone, position, capacity, usage_rate, status, created_at, updated_at FROM gis.warehouse_locations ORDER BY created_at DESC"),
        )
        .fetch_all(&mut scope)
        .await;
        if result.is_ok() {
            scope.commit().await?;
        }
        result
    }

    pub async fn list_locations(&self, txn_arc: &RlsTxnCell) -> Result<Vec<Location>, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query_as::<_, Location>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, name, code, location_type, position, address, description, properties, status, created_at, updated_at FROM gis.locations ORDER BY created_at DESC"),
        )
        .fetch_all(&mut scope)
        .await;
        if result.is_ok() {
            scope.commit().await?;
        }
        result
    }

    pub async fn list_devices(&self, txn_arc: &RlsTxnCell) -> Result<Vec<Device>, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query_as::<_, Device>(
            only_own_schema_query!("gis", "SELECT id, tenant_id, device_code, device_name, device_type, description, properties, status, registered_by, created_at, updated_at FROM gis.devices ORDER BY created_at DESC"),
        )
        .fetch_all(&mut scope)
        .await;
        if result.is_ok() {
            scope.commit().await?;
        }
        result
    }
}
