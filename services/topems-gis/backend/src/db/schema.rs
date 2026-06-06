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

    Ok(())
}
