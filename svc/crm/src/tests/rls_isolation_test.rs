use crate::models::customer::{CreateCustomerRequest, Customer};
use sqlx::PgPool;
use uuid::Uuid;

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
        RETURNING id, tenant_id, name, customer_type, industry, rating, region, owner_id, tags, approval_status, created_at, updated_at, deleted_at
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
