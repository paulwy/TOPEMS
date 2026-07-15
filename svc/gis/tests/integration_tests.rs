// GIS 服务集成测试

#[cfg(test)]
mod tests {
    use sqlx::postgres::PgPoolOptions;
    use uuid::Uuid;

    /// 检查数据库是否可用
    async fn ensure_db_available() -> bool {
        tokio::net::TcpStream::connect("localhost:5432")
            .await
            .is_ok()
    }

    // 测试数据库连接
    #[tokio::test]
    async fn test_database_connection() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await;

        assert!(pool.is_ok(), "数据库连接应该成功");
    }

    // 测试厂区地图创建
    #[tokio::test]
    async fn test_create_factory_map() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        let map_id = Uuid::new_v4();

        let result = sqlx::query(
            r#"
            INSERT INTO factory_maps (id, name, code, map_type, file_url, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(map_id)
        .bind("测试厂区")
        .bind(format!("MAP-{}", &map_id.to_string()[..8]))
        .bind("2d")
        .bind("/maps/test.png")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "厂区地图创建应该成功");
    }

    // 测试设备位置创建
    #[tokio::test]
    async fn test_create_device_location() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        // 首先创建一个 factory_map 以满足外键约束
        let map_id = Uuid::new_v4();
        let map_result = sqlx::query(
            r#"
            INSERT INTO factory_maps (id, name, code, map_type, file_url, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(map_id)
        .bind("测试地图")
        .bind(format!("MAP-{}", &map_id.to_string()[..8]))
        .bind("2d")
        .bind("/maps/test.png")
        .fetch_one(&pool)
        .await;

        assert!(map_result.is_ok(), "工厂地图创建应该成功");

        let location_id = Uuid::new_v4();

        let result = sqlx::query(
            r#"
            INSERT INTO device_locations (id, map_id, device_name, device_code, device_type, position, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                device_name = EXCLUDED.device_name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(location_id)
        .bind(map_id)
        .bind("测试设备")
        .bind(format!("DEV-{}", &location_id.to_string()[..8]))
        .bind("sensor")
        .bind(serde_json::json!({"lat": 31.2304, "lng": 121.4737}))
        .bind("active")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "设备位置创建应该成功");
    }

    // 测试管道创建
    #[tokio::test]
    async fn test_create_pipeline() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        // 首先创建一个 factory_map 以满足外键约束
        let map_id = Uuid::new_v4();
        let map_result = sqlx::query(
            r#"
            INSERT INTO factory_maps (id, name, code, map_type, file_url, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(map_id)
        .bind("测试地图")
        .bind(format!("MAP-{}", &map_id.to_string()[..8]))
        .bind("2d")
        .bind("/maps/test.png")
        .fetch_one(&pool)
        .await;

        assert!(map_result.is_ok(), "工厂地图创建应该成功");

        let pipeline_id = Uuid::new_v4();

        let result = sqlx::query(
            r#"
            INSERT INTO pipelines (id, map_id, name, code, pipeline_type, path, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(pipeline_id)
        .bind(map_id)
        .bind("测试管道")
        .bind(format!("PIP-{}", &pipeline_id.to_string()[..8]))
        .bind("water")
        .bind(serde_json::json!([
            {"lat": 31.2304, "lng": 121.4737},
            {"lat": 31.2310, "lng": 121.4740}
        ]))
        .bind("active")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "管道创建应该成功");
    }

    // 测试审计日志
    #[tokio::test]
    async fn test_audit_log() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        let result = sqlx::query(
            r#"
            INSERT INTO public.audit_logs (action, resource, resource_id, user_id, status)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind("create")
        .bind("factory_map")
        .bind(Uuid::new_v4())
        .bind(Uuid::new_v4())
        .bind("success")
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "审计日志记录应该成功");
    }

    // 测试GeoJSON导出
    #[tokio::test]
    async fn test_geojson_export() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        // 获取所有设备位置
        let result = sqlx::query_as::<_, (Uuid, String, serde_json::Value)>(
            "SELECT id, device_name, position FROM device_locations",
        )
        .fetch_all(&pool)
        .await;

        assert!(result.is_ok(), "GeoJSON导出数据查询应该成功");
    }
}
