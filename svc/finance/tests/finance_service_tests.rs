#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
#![cfg(feature = "db-tests")]
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use topems_finance::models::*;
use topems_finance::services::FinanceService;
use topems_shared_core::error::TopemsError;
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

fn test_database_url() -> String {
    std::env::var("TEST_DATABASE_URL").expect(
        "[test-dsn] 未设置 TEST_DATABASE_URL：测试库 DSN 必须显式提供，禁止回退到 DATABASE_URL 或硬编码开发库",
    )
}

async fn create_test_pool() -> PgPool {
    let database_url = test_database_url();

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
#[ignore = "requires PostgreSQL"]
async fn test_create_account() {
    assert!(
        ensure_db_available().await,
        "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
    );
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let service = FinanceService::new(
        topems_shared_db::scope::Db::new(pool.clone(), "finance, public, shared"),
        TypedServiceClient::new(WorkflowApi, "http://localhost:8080")
            .expect("Failed to create workflow client"),
    );

    let mut txn = pool.begin().await.expect("Failed to begin transaction");
    let req = CreateAccountRequest {
        code: "1001".to_string(),
        name: "现金".to_string(),
        parent_id: None,
        account_type: Some(AccountType::Asset),
        currency: "CNY".to_string(),
        description: None,
        name_en: None,
    };

    let account = service
        .create_account(tenant_id, req, &mut txn)
        .await
        .expect("Failed to create account");
    txn.commit().await.expect("Failed to commit transaction");

    assert_eq!(account.code, "1001");
    assert_eq!(account.name, "现金");
    assert_eq!(account.account_type, Some(AccountType::Asset));
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_get_account() {
    assert!(
        ensure_db_available().await,
        "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
    );
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let service = FinanceService::new(
        topems_shared_db::scope::Db::new(pool.clone(), "finance, public, shared"),
        TypedServiceClient::new(WorkflowApi, "http://localhost:8080")
            .expect("Failed to create workflow client"),
    );

    let req = CreateAccountRequest {
        code: "1002".to_string(),
        name: "银行存款".to_string(),
        parent_id: None,
        account_type: Some(AccountType::Asset),
        currency: "CNY".to_string(),
        description: None,
        name_en: None,
    };

    let mut txn = pool.begin().await.expect("Failed to begin transaction");
    let created = service
        .create_account(tenant_id, req, &mut txn)
        .await
        .expect("Failed to create account");
    let retrieved = service
        .get_account(tenant_id, created.id, "zh", &mut txn)
        .await
        .expect("Failed to get account");
    txn.commit().await.expect("Failed to commit transaction");

    assert_eq!(retrieved.code, "1002");
    assert_eq!(retrieved.name, "银行存款");
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_voucher_lifecycle() {
    assert!(
        ensure_db_available().await,
        "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
    );
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let service = FinanceService::new(
        topems_shared_db::scope::Db::new(pool.clone(), "finance, public, shared"),
        TypedServiceClient::new(WorkflowApi, "http://localhost:8080")
            .expect("Failed to create workflow client"),
    );

    let cash_req = CreateAccountRequest {
        code: "1001".to_string(),
        name: "现金".to_string(),
        parent_id: None,
        account_type: Some(AccountType::Asset),
        currency: "CNY".to_string(),
        description: None,
        name_en: None,
    };
    let mut txn = pool.begin().await.expect("Failed to begin transaction");
    service
        .create_account(tenant_id, cash_req, &mut txn)
        .await
        .expect("Failed to create cash account");

    let revenue_req = CreateAccountRequest {
        code: "5001".to_string(),
        name: "主营业务收入".to_string(),
        parent_id: None,
        account_type: Some(AccountType::Income),
        currency: "CNY".to_string(),
        description: None,
        name_en: None,
    };
    service
        .create_account(tenant_id, revenue_req, &mut txn)
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
                aux_type: None,
                aux_id: None,
            },
            VoucherLineRequest {
                account_code: "5001".to_string(),
                description: Some("销售收入".to_string()),
                debit: Decimal::from(0),
                credit: Decimal::from(1000),
                project_id: None,
                department_id: None,
                aux_type: None,
                aux_id: None,
            },
        ],
        description: Some("销售收款".to_string()),
        template_id: None,
    };

    let voucher = service
        .create_voucher(tenant_id, req, "test_user", "zh", &mut txn)
        .await
        .expect("Failed to create voucher");
    assert_eq!(voucher.status, VoucherStatus::Draft);

    let submitted = service
        .submit_voucher(tenant_id, voucher.id, &mut txn)
        .await
        .expect("Failed to submit voucher");
    assert_eq!(submitted.status, VoucherStatus::Submitted);

    let approved = service
        .approve_voucher(tenant_id, voucher.id, "approver", &mut txn)
        .await
        .expect("Failed to approve voucher");
    assert_eq!(approved.status, VoucherStatus::Approved);

    let posted = service
        .post_voucher(tenant_id, voucher.id, "poster", &mut txn)
        .await
        .expect("Failed to post voucher");
    assert_eq!(posted.status, VoucherStatus::Posted);
    txn.commit().await.expect("Failed to commit transaction");
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_period_management() {
    assert!(
        ensure_db_available().await,
        "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
    );
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let service = FinanceService::new(
        topems_shared_db::scope::Db::new(pool.clone(), "finance, public, shared"),
        TypedServiceClient::new(WorkflowApi, "http://localhost:8080")
            .expect("Failed to create workflow client"),
    );

    let mut txn = pool.begin().await.expect("Failed to begin transaction");
    let period = service
        .open_period(tenant_id, 2024, 1, &mut txn)
        .await
        .expect("Failed to open period");

    assert_eq!(period.year, 2024);
    assert_eq!(period.month, 1);
    assert_eq!(period.status, PeriodStatus::Open);

    let closed = service
        .close_period(tenant_id, 2024, 1, "closer", &mut txn)
        .await
        .expect("Failed to close period");
    assert_eq!(closed.status, PeriodStatus::Closed);
    txn.commit().await.expect("Failed to commit transaction");
}

#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_auxiliary_account() {
    assert!(
        ensure_db_available().await,
        "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
    );
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let service = FinanceService::new(
        topems_shared_db::scope::Db::new(pool.clone(), "finance, public, shared"),
        TypedServiceClient::new(WorkflowApi, "http://localhost:8080")
            .expect("Failed to create workflow client"),
    );

    let req = CreateAuxiliaryAccountRequest {
        aux_type: AuxType::Project,
        code: "PRJ001".to_string(),
        name: "测试项目".to_string(),
        parent_id: None,
        description: None,
    };

    let mut txn = pool.begin().await.expect("Failed to begin transaction");
    let aux_account = service
        .create_aux_account(tenant_id, req, &mut txn)
        .await
        .expect("Failed to create auxiliary account");
    txn.commit().await.expect("Failed to commit transaction");

    assert_eq!(aux_account.code, "PRJ001");
    assert_eq!(aux_account.name, "测试项目");
    assert_eq!(aux_account.aux_type, AuxType::Project);
}

/// 存在 draft 凭证时，科目余额表接口返回非零 `unposted`，且未过账金额不进入表内合计。
#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_account_balance_report_unposted_not_in_totals() {
    assert!(
        ensure_db_available().await,
        "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
    );
    let pool = create_test_pool().await;
    let tenant_id = create_test_tenant(&pool).await;
    let company_id = Uuid::new_v4();
    let service = FinanceService::new(
        topems_shared_db::scope::Db::new(pool.clone(), "finance, public, shared"),
        TypedServiceClient::new(WorkflowApi, "http://localhost:8080")
            .expect("Failed to create workflow client"),
    );

    let period = "202611";
    let cash_id = Uuid::new_v4();
    let payable_id = Uuid::new_v4();

    for (id, code, name, account_type) in [
        (cash_id, "1001", "库存现金", "asset"),
        (payable_id, "2001", "应付账款", "liability"),
    ] {
        sqlx::query(
            r#"INSERT INTO finance.core_finance_accounts (id, tenant_id, code, name, account_type)
               VALUES ($1, $2, $3, $4, $5::account_type)"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(code)
        .bind(name)
        .bind(account_type)
        .execute(&pool)
        .await
        .expect("Failed to create account");
    }

    // 已过账凭证：进入总账，构成本期借贷各 1,000。
    let posted_voucher_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO finance.core_finance_vouchers
             (id, tenant_id, company_id, voucher_no, voucher_date, period,
              voucher_type, total_debit, total_credit, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'general', 1000, 1000, 'posted', 'test_user')"#,
    )
    .bind(posted_voucher_id)
    .bind(tenant_id)
    .bind(company_id)
    .bind("TEST-AB-POSTED")
    .bind(Utc::now())
    .bind(period)
    .execute(&pool)
    .await
    .expect("Failed to create posted voucher");

    for (account_id, code, name, debit, credit) in [
        (cash_id, "1001", "库存现金", 1000_i64, 0_i64),
        (payable_id, "2001", "应付账款", 0, 1000),
    ] {
        sqlx::query(
            r#"INSERT INTO finance.core_finance_ledger
                 (tenant_id, company_id, account_id, account_code, account_name,
                  voucher_id, voucher_no, voucher_date, period, debit, credit)
               VALUES ($1, $2, $3, $4, $5, $6, 'TEST-AB-POSTED', $7, $8, $9, $10)"#,
        )
        .bind(tenant_id)
        .bind(company_id)
        .bind(account_id)
        .bind(code)
        .bind(name)
        .bind(posted_voucher_id)
        .bind(Utc::now())
        .bind(period)
        .bind(debit)
        .bind(credit)
        .execute(&pool)
        .await
        .expect("Failed to create ledger entry");
    }

    // 未过账凭证：不进总账，只能在 unposted 提示里出现。
    sqlx::query(
        r#"INSERT INTO finance.core_finance_vouchers
             (id, tenant_id, company_id, voucher_no, voucher_date, period,
              voucher_type, total_debit, total_credit, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'general', 500, 500, 'draft', 'test_user')"#,
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(company_id)
    .bind("TEST-AB-DRAFT")
    .bind(Utc::now())
    .bind(period)
    .execute(&pool)
    .await
    .expect("Failed to create draft voucher");

    let mut txn = pool.begin().await.expect("Failed to begin transaction");
    let report = service
        .get_account_balance_report(tenant_id, company_id, period, &mut txn)
        .await
        .expect("Failed to get account balance report");
    txn.commit().await.expect("Failed to commit transaction");

    assert_eq!(report.unposted.count, 1, "应提示 1 张未过账凭证");
    assert_eq!(
        report.unposted.amount,
        Decimal::from(500),
        "未过账提示金额应为 draft 凭证合计"
    );
    assert!(report.balanced, "表内勾稽应平衡");
    assert_eq!(
        report.total_period_debit,
        Decimal::from(1000),
        "本期借方只含已过账金额"
    );
    assert_eq!(
        report.total_period_credit,
        Decimal::from(1000),
        "本期贷方只含已过账金额"
    );
}

/// §2.1.2 A 类判定：业务读写端点收到 nil 租户必须显式报「缺少租户上下文」，
/// 不允许降级为全租户视角或静默 0 行。
#[tokio::test]
#[ignore = "requires PostgreSQL"]
async fn test_nil_tenant_rejected_on_business_reads() {
    assert!(
        ensure_db_available().await,
        "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
    );
    let pool = create_test_pool().await;
    let service = FinanceService::new(
        topems_shared_db::scope::Db::new(pool.clone(), "finance, public, shared"),
        TypedServiceClient::new(WorkflowApi, "http://localhost:8080")
            .expect("Failed to create workflow client"),
    );

    let mut txn = pool.begin().await.expect("Failed to begin transaction");
    let err = service
        .list_receivables(Uuid::nil(), 1, 20, None, None, &mut txn)
        .await
        .expect_err("nil 租户必须被拒绝");
    assert!(
        matches!(err, TopemsError::ValidationFailed(ref m) if m == "缺少租户上下文"),
        "应报「缺少租户上下文」，实际: {err:?}"
    );

    let err = service
        .get_trial_balance(Uuid::nil(), "202611", &mut txn)
        .await
        .expect_err("nil 租户必须被拒绝");
    assert!(
        matches!(err, TopemsError::ValidationFailed(ref m) if m == "缺少租户上下文"),
        "应报「缺少租户上下文」，实际: {err:?}"
    );
}
