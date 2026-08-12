use sqlx::PgPool;
use std::collections::BTreeSet;

// =====================================================================
// 📋 开发规范：GIS 数据表新增/修改列流程
// ---------------------------------------------------------------------
//  任何时候在下方 CREATE TABLE IF NOT EXISTS 里增改列时，
//  必须 **同步修改下方 TABLE_DEFS 对应条目**（定义该表的所有非 PK 列）。
//  TABLE_DEFS 是单一事实源：
//    1) 驱动增量迁移（ALTER TABLE ADD COLUMN IF NOT EXISTS）
//       → 老库存量库自动补齐，避免 "column does not exist" 崩溃
//    2) 驱动 schema 一致性自检（information_schema 实际列 vs 期望列）
//       → 若仍缺列，启动日志立即 `tracing::warn!` 告警
//
//  具体步骤：
//  (1) 找到对应表的 `CREATE TABLE IF NOT EXISTS xxx (...)` 块，
//      在里面新增列（类型 / DEFAULT / NOT NULL / REFERENCES 等按规范写）
//  (2) 往下翻到 `TABLE_DEFS`，找到对应 (table_name, &[...])，
//      按 (列名, 列DDL片段) 元组格式追加一行。列 DDL 必须与 (1) 一致：
//      e.g. ("chat_id", "UUID")
//           ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'")
//           ("map_id", "UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE")
//
//  👉 这样 (1)(2) 两处同步后，后续「补丁 + 自检」全部自动派生，无需再改其它位置。
// =====================================================================

/// gis 服务使用的默认 schema（search_path 中 "gis" 在 public 之前，
/// 因此无 schema 前缀的 CREATE TABLE 也落此 schema）。
const GIS_SCHEMA: &str = "gis";

/// 表列定义的**单一事实源**（每张表只写一次，迁移与自检共享）。
/// 格式：`(表名, &[(列名, 列DDL片段), ...])`，列DDL 与上方 CREATE TABLE 对应列保持完全一致。
/// 注：不含 PRIMARY KEY 列 id（由 CREATE TABLE 统一管理）。
const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "factory_maps",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(100) NOT NULL"),
            ("map_type", "VARCHAR(50) NOT NULL DEFAULT 'factory'"),
            ("file_url", "TEXT NOT NULL"),
            ("bounds", "JSONB"),
            ("description", "TEXT"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    (
        "device_locations",
        &[
            (
                "map_id",
                "UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE",
            ),
            ("device_name", "VARCHAR(255) NOT NULL"),
            ("device_code", "VARCHAR(100) NOT NULL"),
            ("device_type", "VARCHAR(100)"),
            ("position", "JSONB NOT NULL"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("description", "TEXT"),
            ("last_inspected", "TIMESTAMP WITH TIME ZONE"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    (
        "pipelines",
        &[
            (
                "map_id",
                "UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE",
            ),
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(100) NOT NULL"),
            ("pipeline_type", "VARCHAR(100)"),
            ("path", "JSONB NOT NULL"),
            ("properties", "JSONB"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "warehouse_locations",
        &[
            (
                "map_id",
                "UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE",
            ),
            ("warehouse_name", "VARCHAR(255) NOT NULL"),
            ("zone", "VARCHAR(100)"),
            ("position", "JSONB NOT NULL"),
            ("capacity", "INTEGER"),
            ("usage_rate", "DOUBLE PRECISION"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "location_photos",
        &[
            (
                "map_id",
                "UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE",
            ),
            ("position", "JSONB NOT NULL"),
            ("photo_url", "TEXT NOT NULL"),
            ("description", "TEXT"),
            ("taken_by", "VARCHAR(255) NOT NULL"),
            ("taken_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    (
        "business_locations",
        &[
            ("business_type", "VARCHAR(100) NOT NULL"),
            ("business_name", "VARCHAR(255) NOT NULL"),
            ("business_code", "VARCHAR(100)"),
            ("category", "VARCHAR(100)"),
            ("position", "JSONB NOT NULL"),
            ("address", "TEXT"),
            ("contact_person", "VARCHAR(255)"),
            ("contact_phone", "VARCHAR(50)"),
            ("capacity", "INTEGER"),
            ("current_usage", "INTEGER"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("properties", "JSONB"),
            ("description", "TEXT"),
            ("external_id", "UUID"),
            ("external_type", "VARCHAR(100)"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "map_markers",
        &[
            ("marker_type", "VARCHAR(100) NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("marker_style", "VARCHAR(100)"),
            ("position", "JSONB NOT NULL"),
            ("icon_svg", "TEXT"),
            ("color", "VARCHAR(50)"),
            ("size", "INTEGER DEFAULT 24"),
            ("popup_content", "TEXT"),
            ("click_action", "VARCHAR(100)"),
            ("action_data", "JSONB"),
            ("visible", "BOOLEAN DEFAULT TRUE"),
            ("z_index", "INTEGER DEFAULT 0"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    // gis.* 显式 schema 表（CREATE TABLE 原创作者已加 gis. 前缀，与 TABLE_DEFS 统一落 gis）
    (
        "maps",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(100) NOT NULL"),
            ("description", "TEXT"),
            ("map_type", "VARCHAR(50) NOT NULL DEFAULT 'general'"),
            ("projection", "VARCHAR(50) DEFAULT 'EPSG:4326'"),
            ("bounds", "JSONB"),
            ("center", "JSONB"),
            ("zoom_level", "INTEGER DEFAULT 12"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "map_layers",
        &[
            (
                "map_id",
                "UUID NOT NULL REFERENCES gis.maps(id) ON DELETE CASCADE",
            ),
            ("name", "VARCHAR(255) NOT NULL"),
            ("layer_type", "VARCHAR(50) NOT NULL"),
            ("source_type", "VARCHAR(50) NOT NULL"),
            ("source_url", "TEXT"),
            ("source_data", "JSONB"),
            ("style_config", "JSONB"),
            ("opacity", "DOUBLE PRECISION DEFAULT 1.0"),
            ("visible", "BOOLEAN DEFAULT TRUE"),
            ("z_index", "INTEGER DEFAULT 0"),
            ("min_zoom", "INTEGER"),
            ("max_zoom", "INTEGER"),
            ("properties", "JSONB"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    (
        "geodata",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("data_type", "VARCHAR(50) NOT NULL"),
            ("format", "VARCHAR(50) NOT NULL DEFAULT 'geojson'"),
            ("file_path", "TEXT"),
            ("geojson_data", "JSONB"),
            ("feature_count", "INTEGER"),
            ("extent", "JSONB"),
            ("properties_schema", "JSONB"),
            ("metadata", "JSONB"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("uploaded_by", "UUID"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    (
        "geofeatures",
        &[
            (
                "geodata_id",
                "UUID NOT NULL REFERENCES gis.geodata(id) ON DELETE CASCADE",
            ),
            ("feature_type", "VARCHAR(50) NOT NULL"),
            ("geometry", "JSONB NOT NULL"),
            ("properties", "JSONB"),
            ("centroid", "JSONB"),
            ("area", "DOUBLE PRECISION"),
            ("length", "DOUBLE PRECISION"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    (
        "spatial_analysis",
        &[
            ("analysis_type", "VARCHAR(100) NOT NULL"),
            ("input_data", "JSONB NOT NULL"),
            ("parameters", "JSONB"),
            ("result_data", "JSONB"),
            ("result_geometry", "JSONB"),
            ("statistics", "JSONB"),
            ("execution_time_ms", "INTEGER"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'completed'"),
            ("created_by", "UUID"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    (
        "locations",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(100)"),
            ("location_type", "VARCHAR(100) NOT NULL"),
            ("position", "JSONB NOT NULL"),
            ("address", "TEXT"),
            ("description", "TEXT"),
            ("properties", "JSONB"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    (
        "devices",
        &[
            ("device_code", "VARCHAR(100) NOT NULL"),
            ("device_name", "VARCHAR(255) NOT NULL"),
            ("device_type", "VARCHAR(100) NOT NULL"),
            ("description", "TEXT"),
            ("properties", "JSONB"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("registered_by", "UUID"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "device_location_records",
        &[
            (
                "device_id",
                "UUID NOT NULL REFERENCES gis.devices(id) ON DELETE CASCADE",
            ),
            ("position", "JSONB NOT NULL"),
            ("accuracy", "DOUBLE PRECISION"),
            ("speed", "DOUBLE PRECISION"),
            ("direction", "DOUBLE PRECISION"),
            ("altitude", "DOUBLE PRECISION"),
            ("battery_level", "INTEGER"),
            ("signal_strength", "INTEGER"),
            ("recorded_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    (
        "audit_log",
        &[
            ("action", "VARCHAR(100) NOT NULL"),
            ("resource_type", "VARCHAR(100) NOT NULL"),
            ("resource_id", "UUID"),
            ("old_value", "JSONB"),
            ("new_value", "JSONB"),
            ("user_id", "UUID"),
            ("ip_address", "VARCHAR(50)"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
    // 🚨 重点防御表：上次 chat_id 缺失导致 gis 启动崩溃，
    //    此处新增列必须同步更新 geofences 的 CREATE TABLE 文本
    (
        "geofences",
        &[
            ("name", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("chat_id", "UUID"),
            ("creator_id", "UUID"),
            ("shape_type", "VARCHAR(50) NOT NULL"),
            ("coordinates", "JSONB NOT NULL"),
            ("radius", "DOUBLE PRECISION"),
            ("event_types", "JSONB DEFAULT '[\"enter\"]'::jsonb"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'active'"),
            ("trigger_cooldown", "INTEGER DEFAULT 300"),
            (
                "notify_channels",
                "JSONB DEFAULT '[\"notification\"]'::jsonb",
            ),
            ("notify_users", "JSONB DEFAULT '[]'::jsonb"),
            ("gis_fence_id", "UUID"),
            ("start_at", "TIMESTAMP WITH TIME ZONE"),
            ("end_at", "TIMESTAMP WITH TIME ZONE"),
            ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ],
    ),
];

/// 对指定表执行 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`。
/// 即使列已存在也不会报错（PostgreSQL 原生支持 IF NOT EXISTS）。
/// 用于在 `CREATE TABLE IF NOT EXISTS` 之后做增量列补齐，
/// 避免"表已存在但代码新增了列 -> 老库缺列导致启动崩溃"的问题。
async fn add_column_if_missing(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), sqlx::Error> {
    let qualified = match schema {
        Some(s) => format!(r#""{}"."{}""#, s, table),
        None => format!(r#""{}""#, table),
    };
    let ddl = format!(
        r#"ALTER TABLE {} ADD COLUMN IF NOT EXISTS "{}" {}"#,
        qualified, column, definition
    );
    sqlx::query(&ddl).execute(pool).await?;
    Ok(())
}

/// 对单张表执行一组列补齐，返回尝试处理的列数（用于计数日志）。
async fn ensure_table_columns(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    columns: &[(&str, &str)],
) -> Result<usize, sqlx::Error> {
    let mut n = 0usize;
    for (col, def) in columns {
        add_column_if_missing(pool, schema, table, col, def).await?;
        n += 1;
    }
    Ok(n)
}

/// 从 information_schema 读取实际列，与期望列名对比。
/// 若有缺失列（理论上 ensure_table_columns 已补，但用于防御性自检），
/// 打印 tracing::warn!，便于运维早期发现。
async fn verify_table_columns(
    pool: &PgPool,
    schema: &str,
    table: &str,
    expected: &[&str],
) -> Result<(), sqlx::Error> {
    let rows: Vec<(String,)> = sqlx::query_as(
        r#"
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        "#,
    )
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await?;

    let actual: BTreeSet<&str> = rows.iter().map(|(c,)| c.as_str()).collect();
    let mut missing = Vec::new();
    for col in expected {
        if !actual.contains(col) {
            missing.push(*col);
        }
    }
    if !missing.is_empty() {
        tracing::warn!(
            "[schema 自检] {}.{} 仍缺失 {} 列: {:?}（请检查增量迁移是否执行）",
            schema,
            table,
            missing.len(),
            missing
        );
    }
    Ok(())
}

pub async fn init_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create gis schema if not exists
    sqlx::query("CREATE SCHEMA IF NOT EXISTS gis")
        .execute(pool)
        .await?;

    // Factory maps table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS factory_maps (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL UNIQUE,
            map_type VARCHAR(50) NOT NULL DEFAULT 'factory',
            file_url TEXT NOT NULL,
            bounds JSONB,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Device locations table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS device_locations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
            device_name VARCHAR(255) NOT NULL,
            device_code VARCHAR(100) NOT NULL,
            device_type VARCHAR(100),
            position JSONB NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            description TEXT,
            last_inspected TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Pipelines table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pipelines (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL,
            pipeline_type VARCHAR(100),
            path JSONB NOT NULL,
            properties JSONB,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Warehouse locations table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS warehouse_locations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
            warehouse_name VARCHAR(255) NOT NULL,
            zone VARCHAR(100),
            position JSONB NOT NULL,
            capacity INTEGER,
            usage_rate DOUBLE PRECISION,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Location photos table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS location_photos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
            position JSONB NOT NULL,
            photo_url TEXT NOT NULL,
            description TEXT,
            taken_by VARCHAR(255) NOT NULL,
            taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Business locations table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS business_locations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_type VARCHAR(100) NOT NULL,
            business_name VARCHAR(255) NOT NULL,
            business_code VARCHAR(100),
            category VARCHAR(100),
            position JSONB NOT NULL,
            address TEXT,
            contact_person VARCHAR(255),
            contact_phone VARCHAR(50),
            capacity INTEGER,
            current_usage INTEGER,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            properties JSONB,
            description TEXT,
            external_id UUID,
            external_type VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Map markers table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS map_markers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            marker_type VARCHAR(100) NOT NULL,
            name VARCHAR(255) NOT NULL,
            marker_style VARCHAR(100),
            position JSONB NOT NULL,
            icon_svg TEXT,
            color VARCHAR(50),
            size INTEGER DEFAULT 24,
            popup_content TEXT,
            click_action VARCHAR(100),
            action_data JSONB,
            visible BOOLEAN DEFAULT TRUE,
            z_index INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // GIS Maps table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gis.maps (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            map_type VARCHAR(50) NOT NULL DEFAULT 'general',
            projection VARCHAR(50) DEFAULT 'EPSG:4326',
            bounds JSONB,
            center JSONB,
            zoom_level INTEGER DEFAULT 12,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // GIS Map layers table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gis.map_layers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            map_id UUID NOT NULL REFERENCES gis.maps(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            layer_type VARCHAR(50) NOT NULL,
            source_type VARCHAR(50) NOT NULL,
            source_url TEXT,
            source_data JSONB,
            style_config JSONB,
            opacity DOUBLE PRECISION DEFAULT 1.0,
            visible BOOLEAN DEFAULT TRUE,
            z_index INTEGER DEFAULT 0,
            min_zoom INTEGER,
            max_zoom INTEGER,
            properties JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // GIS GeoData table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gis.geodata (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            data_type VARCHAR(50) NOT NULL,
            format VARCHAR(50) NOT NULL DEFAULT 'geojson',
            file_path TEXT,
            geojson_data JSONB,
            feature_count INTEGER,
            extent JSONB,
            properties_schema JSONB,
            metadata JSONB,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            uploaded_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // GIS GeoFeatures table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gis.geofeatures (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            geodata_id UUID NOT NULL REFERENCES gis.geodata(id) ON DELETE CASCADE,
            feature_type VARCHAR(50) NOT NULL,
            geometry JSONB NOT NULL,
            properties JSONB,
            centroid JSONB,
            area DOUBLE PRECISION,
            length DOUBLE PRECISION,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // GIS Spatial Analysis table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gis.spatial_analysis (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            analysis_type VARCHAR(100) NOT NULL,
            input_data JSONB NOT NULL,
            parameters JSONB,
            result_data JSONB,
            result_geometry JSONB,
            statistics JSONB,
            execution_time_ms INTEGER,
            status VARCHAR(50) NOT NULL DEFAULT 'completed',
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // GIS Locations table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gis.locations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100),
            location_type VARCHAR(100) NOT NULL,
            position JSONB NOT NULL,
            address TEXT,
            description TEXT,
            properties JSONB,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // GIS Devices table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gis.devices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_code VARCHAR(100) NOT NULL UNIQUE,
            device_name VARCHAR(255) NOT NULL,
            device_type VARCHAR(100) NOT NULL,
            description TEXT,
            properties JSONB,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            registered_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // GIS Device Location Records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gis.device_location_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id UUID NOT NULL REFERENCES gis.devices(id) ON DELETE CASCADE,
            position JSONB NOT NULL,
            accuracy DOUBLE PRECISION,
            speed DOUBLE PRECISION,
            direction DOUBLE PRECISION,
            altitude DOUBLE PRECISION,
            battery_level INTEGER,
            signal_strength INTEGER,
            recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // GIS Audit Log table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gis.audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100) NOT NULL,
            resource_id UUID,
            old_value JSONB,
            new_value JSONB,
            user_id UUID,
            ip_address VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes for better query performance
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_device_locations_map_id ON device_locations(map_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pipelines_map_id ON pipelines(map_id)")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_warehouse_locations_map_id ON warehouse_locations(map_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_location_photos_map_id ON location_photos(map_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_business_locations_type ON business_locations(business_type)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_map_markers_type ON map_markers(marker_type)")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_gis_geofeatures_geodata_id ON gis.geofeatures(geodata_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_gis_device_location_records_device_id ON gis.device_location_records(device_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_gis_device_location_records_recorded_at ON gis.device_location_records(recorded_at)")
        .execute(pool)
        .await?;

    // jsonb GIN indexes for efficient JSON querying (instead of GIST which requires PostGIS geometry)
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_device_locations_position ON device_locations USING GIN (position)"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_business_locations_position ON business_locations USING GIN (position)"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_gis_locations_position ON gis.locations USING GIN (position)"
    )
    .execute(pool)
    .await?;

    // Geofences table (for IM geofence sync)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gis.geofences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            chat_id UUID,
            creator_id UUID,
            shape_type VARCHAR(50) NOT NULL,
            coordinates JSONB NOT NULL,
            radius DOUBLE PRECISION,
            event_types JSONB DEFAULT '["enter"]',
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            trigger_cooldown INTEGER DEFAULT 300,
            notify_channels JSONB DEFAULT '["notification"]',
            notify_users JSONB DEFAULT '[]',
            gis_fence_id UUID,
            start_at TIMESTAMP WITH TIME ZONE,
            end_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes for geofences
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_gis_geofences_chat_id ON gis.geofences(chat_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_gis_geofences_status ON gis.geofences(status)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_gis_geofences_coordinates ON gis.geofences USING GIN (coordinates)")
        .execute(pool)
        .await?;

    // ----------------------------------------------------------------
    // 增量迁移补丁：对所有表逐列执行 ALTER TABLE ADD COLUMN IF NOT EXISTS
    // 目的：防止 CREATE TABLE IF NOT EXISTS 对"已存在的旧表"不做任何修改，
    //       导致后续新增的列（如 geofences.chat_id）在老库上缺失而启动崩溃。
    // 注：列定义与上方 CREATE TABLE 保持一致（只保留 type/default/not null，
    //     PK/UNIQUE/FK 由 IF NOT EXISTS CREATE INDEX 保证或 CREATE TABLE 首次建表时生效）。
    // ----------------------------------------------------------------
    // 阶段 1：增量迁移（TABLE_DEFS 单一事实源驱动）
    //   老库缺列自动补齐；新库列已存在 → 纯 no-op（Postgres NOTICE 仅日志可见）
    // ----------------------------------------------------------------
    let mut patched_tables = 0usize;
    let mut patched_columns = 0usize;
    let schema: Option<&str> = Some(GIS_SCHEMA);
    for (table, columns) in TABLE_DEFS {
        let n = ensure_table_columns(pool, schema, table, columns).await?;
        patched_tables += 1;
        patched_columns += n;
    }
    tracing::info!(
        "[gis 增量迁移] 完成 {} 张表 / {} 列 ADD COLUMN IF NOT EXISTS 检查",
        patched_tables,
        patched_columns
    );

    // ----------------------------------------------------------------
    // 阶段 2：schema 一致性自检（同样由 TABLE_DEFS 派生期望列，确保不脱节）
    //   从 information_schema 拉取真实列清单，与 ["id"] + TABLE_DEFS 列名 做比对
    //   → 若阶段 1 有任何遗漏，这里立即 tracing::warn! 告警，不会等到业务请求炸锅
    // ----------------------------------------------------------------
    let mut verified_tables = 0usize;
    for (table, columns) in TABLE_DEFS {
        let mut expected: Vec<&str> = Vec::with_capacity(1 + columns.len());
        expected.push("id"); // 所有表统一的 PK，TABLE_DEFS 中不重复声明
        for (col, _def) in *columns {
            expected.push(*col);
        }
        verify_table_columns(pool, GIS_SCHEMA, table, &expected).await?;
        verified_tables += 1;
    }

    tracing::info!(
        "[gis schema 自检] 完成 {} 张表结构一致性校验（缺失列会单独 WARN）",
        verified_tables
    );

    Ok(())
}
