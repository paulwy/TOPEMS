use sqlx::PgPool;

pub async fn init_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create uuid-ossp extension if not exists
    sqlx::query("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
        .execute(pool)
        .await?;

    // Create factory_maps table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS factory_maps (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE NOT NULL,
            map_type VARCHAR(50) NOT NULL,
            file_url VARCHAR(500) NOT NULL,
            bounds JSONB,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create device_locations table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS device_locations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
            device_name VARCHAR(255) NOT NULL,
            device_code VARCHAR(100) NOT NULL,
            device_type VARCHAR(100),
            position JSONB NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            description TEXT,
            last_inspected TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create pipelines table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pipelines (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL,
            pipeline_type VARCHAR(100),
            path JSONB NOT NULL,
            properties JSONB,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create warehouse_locations table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS warehouse_locations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
            warehouse_name VARCHAR(255) NOT NULL,
            zone VARCHAR(100),
            position JSONB NOT NULL,
            capacity INTEGER,
            usage_rate DECIMAL(5,2),
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create location_photos table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS location_photos (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            map_id UUID NOT NULL REFERENCES factory_maps(id) ON DELETE CASCADE,
            position JSONB NOT NULL,
            photo_url VARCHAR(500) NOT NULL,
            description TEXT,
            taken_by VARCHAR(255) NOT NULL,
            taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_device_locations_map_id ON device_locations(map_id);")
        .execute(pool)
        .await?;
    
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pipelines_map_id ON pipelines(map_id);")
        .execute(pool)
        .await?;
    
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_warehouse_locations_map_id ON warehouse_locations(map_id);")
        .execute(pool)
        .await?;
    
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_location_photos_map_id ON location_photos(map_id);")
        .execute(pool)
        .await?;

    // Create business_locations table for expanded business scope
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS business_locations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            business_type VARCHAR(50) NOT NULL,
            business_name VARCHAR(255) NOT NULL,
            business_code VARCHAR(100),
            category VARCHAR(100),
            position JSONB NOT NULL,
            address TEXT,
            contact_person VARCHAR(255),
            contact_phone VARCHAR(50),
            capacity INTEGER,
            current_usage INTEGER,
            status VARCHAR(50) DEFAULT 'active',
            properties JSONB,
            description TEXT,
            external_id UUID,
            external_type VARCHAR(50),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create spatial_index for business_locations
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_business_locations_type ON business_locations(business_type);")
        .execute(pool)
        .await?;
    
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_business_locations_position ON business_locations USING GIN(position);")
        .execute(pool)
        .await?;

    // Create map_markers table for custom markers on maps
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS map_markers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            marker_type VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            marker_style VARCHAR(50),
            position JSONB NOT NULL,
            icon_svg TEXT,
            color VARCHAR(20),
            size INTEGER DEFAULT 32,
            popup_content TEXT,
            click_action VARCHAR(50),
            action_data JSONB,
            visible BOOLEAN DEFAULT true,
            z_index INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_map_markers_type ON map_markers(marker_type);")
        .execute(pool)
        .await?;

    // ==================== 新增 GIS 表结构 ====================
    
    // Enable PostGIS extension
    sqlx::query("CREATE EXTENSION IF NOT EXISTS postgis;")
        .execute(pool)
        .await?;

    // Create maps table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS maps (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            map_type VARCHAR(50) NOT NULL DEFAULT 'base',
            projection VARCHAR(50) DEFAULT 'EPSG:4326',
            bounds JSONB,
            center JSONB,
            zoom_level INTEGER DEFAULT 10,
            status VARCHAR(50) DEFAULT 'active',
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create map_layers table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS map_layers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            layer_type VARCHAR(50) NOT NULL,
            source_type VARCHAR(50) NOT NULL,
            source_url VARCHAR(500),
            source_data JSONB,
            style_config JSONB,
            opacity DECIMAL(3,2) DEFAULT 1.0,
            visible BOOLEAN DEFAULT true,
            z_index INTEGER DEFAULT 0,
            min_zoom INTEGER,
            max_zoom INTEGER,
            properties JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create geodata table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS geodata (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            data_type VARCHAR(50) NOT NULL,
            format VARCHAR(50) NOT NULL,
            file_path VARCHAR(500),
            geojson_data JSONB,
            feature_count INTEGER,
            extent JSONB,
            properties_schema JSONB,
            metadata JSONB,
            status VARCHAR(50) DEFAULT 'active',
            uploaded_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create geofeatures table with PostGIS geometry support
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS geofeatures (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            geodata_id UUID NOT NULL REFERENCES geodata(id) ON DELETE CASCADE,
            feature_type VARCHAR(50) NOT NULL,
            geometry JSONB NOT NULL,
            properties JSONB,
            centroid JSONB,
            area DECIMAL(15,5),
            length DECIMAL(15,5),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create spatial_analysis table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS spatial_analysis (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            analysis_type VARCHAR(50) NOT NULL,
            input_data JSONB NOT NULL,
            parameters JSONB,
            result_data JSONB,
            result_geometry JSONB,
            statistics JSONB,
            execution_time_ms INTEGER,
            status VARCHAR(50) DEFAULT 'completed',
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create locations table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS locations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100),
            location_type VARCHAR(50) NOT NULL,
            position JSONB NOT NULL,
            address TEXT,
            description TEXT,
            properties JSONB,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create devices table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS devices (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            device_code VARCHAR(100) UNIQUE NOT NULL,
            device_name VARCHAR(255) NOT NULL,
            device_type VARCHAR(50) NOT NULL,
            description TEXT,
            properties JSONB,
            status VARCHAR(50) DEFAULT 'active',
            registered_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create device_location_records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS device_location_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
            position JSONB NOT NULL,
            accuracy DECIMAL(10,2),
            speed DECIMAL(10,2),
            direction DECIMAL(5,2),
            altitude DECIMAL(10,2),
            battery_level INTEGER,
            signal_strength INTEGER,
            recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create audit_logs table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100) NOT NULL,
            resource_id UUID,
            old_value JSONB,
            new_value JSONB,
            user_id UUID,
            ip_address VARCHAR(50),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes for new tables
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_maps_code ON maps(code);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_map_layers_map_id ON map_layers(map_id);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_geodata_name ON geodata(name);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_geofeatures_geodata_id ON geofeatures(geodata_id);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_geofeatures_type ON geofeatures(feature_type);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_locations_position ON locations USING GIN(position);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_devices_code ON devices(device_code);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_device_location_records_device_id ON device_location_records(device_id);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_device_location_records_recorded_at ON device_location_records(recorded_at);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);")
        .execute(pool)
        .await?;

    Ok(())
}
