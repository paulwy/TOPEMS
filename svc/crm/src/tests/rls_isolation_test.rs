use crate::models::customer::{CreateCustomerRequest, Customer};
use sqlx::PgPool;
use uuid::Uuid;

// 注意：本测试文件使用 #[sqlx::test] 宏，需要超级用户权限运行
// 因为 sqlx::test 需要创建临时数据库（基于模板数据库），这需要 PostgreSQL 超级用户权限
// 运行方式：DATABASE_URL="postgres://<superuser>@localhost:5432/topems" cargo test -p topems-crm rls_isolation_test

#[sqlx::test]
async fn customer_isolated_by_tenant(pool: PgPool) {
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();

    let cust_a = create_customer_for(&pool, tenant_a, "Factory A").await;
    let cust_b = create_customer_for(&pool, tenant_b, "Factory B").await;

    let list_a: Vec<Customer> = sqlx::query_as::<_, Customer>(
        "SELECT * FROM crm.customers WHERE tenant_id = $1 AND deleted_at IS NULL",
    )
    .bind(tenant_a)
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(list_a.len(), 1);
    assert_eq!(list_a[0].id, cust_a.id);

    let list_b: Vec<Customer> = sqlx::query_as::<_, Customer>(
        "SELECT * FROM crm.customers WHERE tenant_id = $1 AND deleted_at IS NULL",
    )
    .bind(tenant_b)
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(list_b.len(), 1);
    assert_eq!(list_b[0].id, cust_b.id);
}

async fn create_customer_for(pool: &PgPool, tenant_id: Uuid, name: &str) -> Customer {
    let req = CreateCustomerRequest {
        name: name.into(),
        customer_type: "enterprise".into(),
        industry: Some("Mock".into()),
        rating: Some("C".into()),
        region: None,
        owner_id: Uuid::new_v4(),
        tags: Some(vec![]),
    };
    sqlx::query_as::<_, Customer>(r#"
        INSERT INTO crm.customers (tenant_id, name, customer_type, industry, rating, region, owner_id, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, code, email, phone, website, address, city, province, country, company_size, employee_count, revenue, source, status, created_at, updated_at, deleted_at
    "#)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.customer_type)
    .bind(req.industry.as_deref())
    .bind(req.rating.as_deref())
    .bind(req.region.as_deref())
    .bind(req.owner_id)
    .bind(req.tags.as_deref())
    .fetch_one(pool)
    .await
    .unwrap()
}

#[sqlx::test]
async fn rls_txn_context_isolates_tenant(pool: PgPool) {
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();

    // 测试库（sqlx::test 模板）可能未带 RLS 策略——测试内幂等启用，验证隔离语义本身
    sqlx::query("ALTER TABLE crm.customers ENABLE ROW LEVEL SECURITY")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("ALTER TABLE crm.customers FORCE ROW LEVEL SECURITY")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("DROP POLICY IF EXISTS rls_tenant_isolation ON crm.customers")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query(
        "CREATE POLICY rls_tenant_isolation ON crm.customers USING (
           current_setting('app.tenant_id', true) IS NULL
           OR current_setting('app.tenant_id', true) = ''
           OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
           OR tenant_id IS NULL
           OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
         ) WITH CHECK (
           current_setting('app.tenant_id', true) IS NULL
           OR current_setting('app.tenant_id', true) = ''
           OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
           OR tenant_id IS NULL
           OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
         )",
    )
    .execute(&pool)
    .await
    .unwrap();

    let cust_a = create_customer_for(&pool, tenant_a, "Factory A").await;
    let cust_b = create_customer_for(&pool, tenant_b, "Factory B").await;

    // 模拟 tenant_middleware：请求级事务 + SET LOCAL app.tenant_id
    //（handler 经 Extension<Arc<Mutex<Transaction>>> 提取后用 &mut **txn 查询）
    // 注意：使用 SET ROLE 切换到非超级用户，否则超级用户会绕过 RLS
    // 首先创建测试角色（如果不存在）
    sqlx::query("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rls_test_user') THEN CREATE ROLE rls_test_user NOLOGIN; END IF; END $$;")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("GRANT USAGE ON SCHEMA crm TO rls_test_user;")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("GRANT SELECT, INSERT ON crm.customers TO rls_test_user;")
        .execute(&pool)
        .await
        .unwrap();

    let mut txn_a = pool.begin().await.unwrap();
    sqlx::query("SET LOCAL ROLE rls_test_user")
        .execute(&mut *txn_a)
        .await
        .unwrap();
    sqlx::query("SET LOCAL row_security = on")
        .execute(&mut *txn_a)
        .await
        .unwrap();
    sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(tenant_a.to_string())
        .execute(&mut *txn_a)
        .await
        .unwrap();
    let rows_a: Vec<Customer> =
        sqlx::query_as::<_, Customer>("SELECT * FROM crm.customers WHERE deleted_at IS NULL")
            .fetch_all(&mut *txn_a)
            .await
            .unwrap();
    assert_eq!(rows_a.len(), 1, "租户A上下文下应仅见本租户");
    assert_eq!(rows_a[0].id, cust_a.id);
    txn_a.rollback().await.unwrap();

    let mut txn_b = pool.begin().await.unwrap();
    sqlx::query("SET LOCAL ROLE rls_test_user")
        .execute(&mut *txn_b)
        .await
        .unwrap();
    sqlx::query("SET LOCAL row_security = on")
        .execute(&mut *txn_b)
        .await
        .unwrap();
    sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(tenant_b.to_string())
        .execute(&mut *txn_b)
        .await
        .unwrap();
    let rows_b: Vec<Customer> =
        sqlx::query_as::<_, Customer>("SELECT * FROM crm.customers WHERE deleted_at IS NULL")
            .fetch_all(&mut *txn_b)
            .await
            .unwrap();
    assert_eq!(rows_b.len(), 1, "租户B上下文下应仅见本租户");
    assert_eq!(rows_b[0].id, cust_b.id);
    txn_b.rollback().await.unwrap();

    // 无上下文（pool 直连，模拟未注入中间件的连接）→ 策略放行（兼容）
    let all: Vec<Customer> =
        sqlx::query_as::<_, Customer>("SELECT * FROM crm.customers WHERE deleted_at IS NULL")
            .fetch_all(&pool)
            .await
            .unwrap();
    assert_eq!(all.len(), 2, "无上下文应放行（全量）");
}
