use chrono::Utc;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use topems_pdm::modules::product::Product;

async fn create_test_pool() -> PgPool {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to test database")
}

async fn create_test_tenant(pool: &PgPool) -> Uuid {
    let tenant_id = Uuid::new_v4();
    sqlx::query("INSERT INTO core_tenants (id, name, code, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)")
        .bind(tenant_id)
        .bind("test_pdm_tenant")
        .bind(format!("test_pdm_{}", tenant_id))
        .bind("active")
        .bind(Utc::now())
        .bind(Utc::now())
        .execute(pool)
        .await
        .expect("Failed to create test tenant");
    tenant_id
}

/// 检查数据库是否可用
async fn ensure_db_available() -> bool {
    tokio::net::TcpStream::connect("localhost:5432")
        .await
        .is_ok()
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_create_product() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;

    let product_no = format!("PRD-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let result = sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO pdm_products (tenant_id, product_no, name, description, version, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&product_no)
    .bind("测试产品")
    .bind(Some("测试产品描述"))
    .bind(Some("1.0"))
    .bind("active")
    .fetch_one(&pool)
    .await;

    if let Err(e) = &result { eprintln!("❌ Error: {:?}", e); } assert!(result.is_ok());
    let product = result.unwrap();
    assert_eq!(product.product_no, product_no);
    assert_eq!(product.name, "测试产品");
    assert_eq!(product.status, "active");
    assert_eq!(product.tenant_id, Some(tenant_id));
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_get_product() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;

    let product_no = format!("PRD-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let created = sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO pdm_products (tenant_id, product_no, name, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&product_no)
    .bind("测试产品")
    .bind("active")
    .fetch_one(&pool)
    .await
    .unwrap();

    let retrieved = sqlx::query_as::<_, Product>(
        "SELECT id, tenant_id, product_no, name, description, version, status, created_at, updated_at FROM pdm_products WHERE id = $1 AND tenant_id = $2",
    )
    .bind(created.id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await;

    assert!(retrieved.is_ok());
    assert!(retrieved.unwrap().is_some());
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_update_product() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;

    let product_no = format!("PRD-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let created = sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO pdm_products (tenant_id, product_no, name, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&product_no)
    .bind("测试产品")
    .bind("active")
    .fetch_one(&pool)
    .await
    .unwrap();

    let updated = sqlx::query_as::<_, Product>(
        r#"
        UPDATE pdm_products SET name = $2, version = $3, updated_at = $4 WHERE id = $1 AND tenant_id = $5
        RETURNING id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        "#,
    )
    .bind(created.id)
    .bind("更新后的产品名称")
    .bind(Some("2.0"))
    .bind(Utc::now())
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await;

    assert!(updated.is_ok());
    let updated_product = updated.unwrap().unwrap();
    assert_eq!(updated_product.name, "更新后的产品名称");
    assert_eq!(updated_product.version, Some("2.0".to_string()));
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_delete_product() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;

    let product_no = format!("PRD-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let created = sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO pdm_products (tenant_id, product_no, name, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&product_no)
    .bind("测试产品")
    .bind("active")
    .fetch_one(&pool)
    .await
    .unwrap();

    let result = sqlx::query("DELETE FROM pdm_products WHERE id = $1 AND tenant_id = $2")
        .bind(created.id)
        .bind(tenant_id)
        .execute(&pool)
        .await;

    if let Err(e) = &result { eprintln!("❌ Error: {:?}", e); } assert!(result.is_ok());
    assert_eq!(result.unwrap().rows_affected(), 1);

    let remaining = sqlx::query_as::<_, Product>(
        "SELECT id, tenant_id, product_no, name, description, version, status, created_at, updated_at FROM pdm_products WHERE id = $1 AND tenant_id = $2",
    )
    .bind(created.id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await;

    assert!(remaining.is_ok());
    assert!(remaining.unwrap().is_none());
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_tenant_isolation() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant1 = create_test_tenant(&pool).await;
    let tenant2 = create_test_tenant(&pool).await;

    let product_no = "PRD-TENANT-TEST";
    sqlx::query(
        "INSERT INTO pdm_products (tenant_id, product_no, name, status) VALUES ($1, $2, $3, $4)",
    )
    .bind(tenant1)
    .bind(product_no)
    .bind("租户1产品")
    .bind("active")
    .execute(&pool)
    .await
    .unwrap();

    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM pdm_products WHERE tenant_id = $1 AND product_no = $2",
    )
    .bind(tenant2)
    .bind(product_no)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(count, 0);
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_list_products_with_pagination() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;

    for i in 0..15 {
        let product_no = format!("PRD-PAGE-{}", i);
        sqlx::query("INSERT INTO pdm_products (tenant_id, product_no, name, status) VALUES ($1, $2, $3, $4)")
            .bind(tenant_id)
            .bind(&product_no)
            .bind(format!("分页测试产品{}", i))
            .bind("active")
            .execute(&pool)
            .await
            .unwrap();
    }

    let page1 = sqlx::query_as::<_, Product>(
        "SELECT id, tenant_id, product_no, name, description, version, status, created_at, updated_at FROM pdm_products WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 10",
    )
    .bind(tenant_id)
    .fetch_all(&pool)
    .await;

    assert!(page1.is_ok());
    assert_eq!(page1.unwrap().len(), 10);
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_create_material() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;

    let material_no = format!("MAT-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let result = sqlx::query(
        r#"
        INSERT INTO pdm_materials (tenant_id, material_no, name, spec, unit, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(tenant_id)
    .bind(&material_no)
    .bind("测试原材料")
    .bind(Some("规格A"))
    .bind(Some("kg"))
    .bind("active")
    .execute(&pool)
    .await;

    if let Err(e) = &result { eprintln!("❌ Error: {:?}", e); } assert!(result.is_ok());
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_create_change_notice() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;

    let ecn_no = format!("ECN-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let result = sqlx::query(
        r#"
        INSERT INTO pdm_change_notices (tenant_id, ecn_no, title, description, change_type, initiator, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(tenant_id)
    .bind(&ecn_no)
    .bind("设计变更通知")
    .bind(Some("变更原因描述"))
    .bind("engineering")
    .bind("test_user")
    .bind("draft")
    .execute(&pool)
    .await;

    if let Err(e) = &result { eprintln!("❌ Error: {:?}", e); } assert!(result.is_ok());
}
