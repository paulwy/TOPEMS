use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use topems_finance::models::*;
use topems_finance::services::FinanceService;
use topems_shared::service_client::WorkflowServiceClient;

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
        .bind("test_tenant")
        .bind(format!("test_{}", tenant_id))
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
async fn test_create_account() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let service = FinanceService::new(pool.clone(), WorkflowServiceClient::new("http://localhost:8080").expect("Failed to create workflow client"));

    let req = CreateAccountRequest {
        code: "1001".to_string(),
        name: "现金".to_string(),
        parent_id: None,
        account_type: AccountType::Asset,
        currency: "CNY".to_string(),
        description: None,
    };

    let account = service
        .create_account(tenant_id, req)
        .await
        .expect("Failed to create account");

    assert_eq!(account.code, "1001");
    assert_eq!(account.name, "现金");
    assert_eq!(account.account_type, AccountType::Asset);
}

#[tokio::test]
async fn test_get_account() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let service = FinanceService::new(pool.clone(), WorkflowServiceClient::new("http://localhost:8080").expect("Failed to create workflow client"));

    let req = CreateAccountRequest {
        code: "1002".to_string(),
        name: "银行存款".to_string(),
        parent_id: None,
        account_type: AccountType::Asset,
        currency: "CNY".to_string(),
        description: None,
    };

    let created = service
        .create_account(tenant_id, req)
        .await
        .expect("Failed to create account");
    let retrieved = service
        .get_account(tenant_id, created.id)
        .await
        .expect("Failed to get account");

    assert_eq!(retrieved.code, "1002");
    assert_eq!(retrieved.name, "银行存款");
}

#[tokio::test]
async fn test_voucher_lifecycle() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let service = FinanceService::new(pool.clone(), WorkflowServiceClient::new("http://localhost:8080").expect("Failed to create workflow client"));

    let cash_req = CreateAccountRequest {
        code: "1001".to_string(),
        name: "现金".to_string(),
        parent_id: None,
        account_type: AccountType::Asset,
        currency: "CNY".to_string(),
        description: None,
    };
    service
        .create_account(tenant_id, cash_req)
        .await
        .expect("Failed to create cash account");

    let revenue_req = CreateAccountRequest {
        code: "5001".to_string(),
        name: "主营业务收入".to_string(),
        parent_id: None,
        account_type: AccountType::Income,
        currency: "CNY".to_string(),
        description: None,
    };
    service
        .create_account(tenant_id, revenue_req)
        .await
        .expect("Failed to create revenue account");

    let voucher_date = DateTime::parse_from_rfc3339("2024-01-15T00:00:00Z")
        .unwrap()
        .with_timezone(&Utc);
    let req = CreateVoucherRequest {
        voucher_date,
        voucher_type: VoucherType::General,
        lines: vec![
            VoucherLineRequest {
                account_code: "1001".to_string(),
                description: Some("收到现金".to_string()),
                debit: Decimal::from(1000),
                credit: Decimal::from(0),
                project_id: None,
                department_id: None,
            },
            VoucherLineRequest {
                account_code: "5001".to_string(),
                description: Some("销售收入".to_string()),
                debit: Decimal::from(0),
                credit: Decimal::from(1000),
                project_id: None,
                department_id: None,
            },
        ],
        description: Some("销售收款".to_string()),
    };

    let voucher = service
        .create_voucher(tenant_id, req, "test_user")
        .await
        .expect("Failed to create voucher");
    assert_eq!(voucher.status, VoucherStatus::Draft);

    let submitted = service
        .submit_voucher(tenant_id, voucher.id)
        .await
        .expect("Failed to submit voucher");
    assert_eq!(submitted.status, VoucherStatus::Submitted);

    let approved = service
        .approve_voucher(tenant_id, voucher.id, "approver")
        .await
        .expect("Failed to approve voucher");
    assert_eq!(approved.status, VoucherStatus::Approved);

    let posted = service
        .post_voucher(tenant_id, voucher.id, "poster")
        .await
        .expect("Failed to post voucher");
    assert_eq!(posted.status, VoucherStatus::Posted);
}

#[tokio::test]
async fn test_period_management() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let service = FinanceService::new(pool.clone(), WorkflowServiceClient::new("http://localhost:8080").expect("Failed to create workflow client"));

    let period = service
        .open_period(tenant_id, 2024, 1)
        .await
        .expect("Failed to open period");

    assert_eq!(period.year, 2024);
    assert_eq!(period.month, 1);
    assert_eq!(period.status, PeriodStatus::Open);

    let closed = service
        .close_period(tenant_id, 2024, 1, "closer")
        .await
        .expect("Failed to close period");
    assert_eq!(closed.status, PeriodStatus::Closed);
}

#[tokio::test]
async fn test_auxiliary_account() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let service = FinanceService::new(pool.clone(), WorkflowServiceClient::new("http://localhost:8080").expect("Failed to create workflow client"));

    let req = CreateAuxiliaryAccountRequest {
        aux_type: AuxType::Project,
        code: "PRJ001".to_string(),
        name: "测试项目".to_string(),
        parent_id: None,
        description: None,
    };

    let aux_account = service
        .create_aux_account(tenant_id, req)
        .await
        .expect("Failed to create auxiliary account");

    assert_eq!(aux_account.code, "PRJ001");
    assert_eq!(aux_account.name, "测试项目");
    assert_eq!(aux_account.aux_type, AuxType::Project);
}
