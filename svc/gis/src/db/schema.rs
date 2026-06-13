use sqlx::PgPool;

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
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

    tracing::info!("✅ GIS 数据库表初始化完成");

    Ok(())
}
