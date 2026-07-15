use chrono::Utc;
use sqlx::postgres::PgPool;
use uuid::Uuid;

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
        .bind("test_ehs_tenant")
        .bind(format!("test_ehs_{}", tenant_id))
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
async fn test_create_risk() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let _tenant_id = create_test_tenant(&pool).await;

    let risk_no = format!("RSK-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let result = sqlx::query(
        r#"
        INSERT INTO qa_ehs_risks (risk_no, title, description, risk_type, hazard_factor, likelihood, severity, risk_level, control_measures, status, assessed_by, assessed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        "#,
    )
    .bind(&risk_no)
    .bind("火灾风险")
    .bind(Some("生产车间存在火灾隐患"))
    .bind(Some("火灾"))
    .bind(Some("易燃物品"))
    .bind(Some(3))
    .bind(Some(4))
    .bind(Some("high"))
    .bind(Some("配备消防器材"))
    .bind("identified")
    .bind(Some("test_user"))
    .bind(Some(Utc::now()))
    .execute(&pool)
    .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_create_hazard() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let _tenant_id = create_test_tenant(&pool).await;

    let hazard_no = format!("HAZ-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let result = sqlx::query(
        r#"
        INSERT INTO qa_ehs_hazards (hazard_no, title, description, category, level, source, location, reported_by, reported_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#,
    )
    .bind(&hazard_no)
    .bind("化学品泄漏")
    .bind(Some("仓库化学品可能泄漏"))
    .bind(Some("chemical"))
    .bind(Some("high"))
    .bind(Some("仓库"))
    .bind(Some("A区仓库"))
    .bind("test_user")
    .bind(Utc::now())
    .bind("reported")
    .execute(&pool)
    .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_create_hazard_rectification() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let _tenant_id = create_test_tenant(&pool).await;

    let hazard_no = format!(
        "HAZ-RECT-{}",
        Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let hazard_result = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO qa_ehs_hazards (hazard_no, title, description, category, level, source, location, reported_by, reported_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
        "#,
    )
    .bind(&hazard_no)
    .bind("化学品泄漏")
    .bind(Some("测试隐患"))
    .bind(Some("chemical"))
    .bind(Some("high"))
    .bind(Some("仓库"))
    .bind(Some("A区"))
    .bind("test_user")
    .bind(Utc::now())
    .bind("reported")
    .fetch_one(&pool)
    .await;

    assert!(hazard_result.is_ok());
    let hazard_id = hazard_result.unwrap();

    let result = sqlx::query(
        r#"
        INSERT INTO qa_ehs_hazard_rectifications (hazard_id, description, responsible, deadline, status, progress, started_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(hazard_id)
    .bind("清理泄漏区域")
    .bind("张三")
    .bind(Some(Utc::now().date_naive() + chrono::Duration::days(7)))
    .bind("in_progress")
    .bind(Some(50))
    .bind(Some(Utc::now()))
    .bind(None::<chrono::DateTime<chrono::Utc>>)
    .execute(&pool)
    .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_create_accident() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let _tenant_id = create_test_tenant(&pool).await;

    let accident_no = format!("ACC-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let result = sqlx::query(
        r#"
        INSERT INTO qa_ehs_accidents (accident_no, title, description, accident_type, severity, location, occurred_at, casualties, economic_loss, status, reported_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        "#,
    )
    .bind(&accident_no)
    .bind("设备故障事故")
    .bind(Some("生产设备突然故障"))
    .bind(Some("equipment"))
    .bind(Some("medium"))
    .bind(Some("车间B区"))
    .bind(Utc::now())
    .bind(Some(0))
    .bind(Some(10000.0))
    .bind("reported")
    .bind("test_user")
    .execute(&pool)
    .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_create_training() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let _tenant_id = create_test_tenant(&pool).await;

    let training_no = format!("TRN-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let result = sqlx::query(
        r#"
        INSERT INTO qa_ehs_trainings (training_no, title, content, trainer, training_type, duration_hours, scheduled_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(&training_no)
    .bind("消防安全培训")
    .bind(Some("火灾预防和应急处理"))
    .bind(Some("安全部门"))
    .bind(Some("safety"))
    .bind(Some(4))
    .bind(Some(Utc::now() + chrono::Duration::days(7)))
    .bind("scheduled")
    .execute(&pool)
    .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_create_inspection_plan() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let _tenant_id = create_test_tenant(&pool).await;

    let plan_no = format!("PLAN-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let result = sqlx::query(
        r#"
        INSERT INTO qa_ehs_inspection_plans (plan_no, title, description, inspection_type, frequency, start_date, end_date, inspector, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
    )
    .bind(&plan_no)
    .bind("月度安全检查计划")
    .bind(Some("每月例行安全检查"))
    .bind(Some("safety"))
    .bind(Some("monthly"))
    .bind(Some(Utc::now().date_naive()))
    .bind(Some(Utc::now().date_naive() + chrono::Duration::days(30)))
    .bind(Some("安全管理员"))
    .bind("active")
    .execute(&pool)
    .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_create_emergency_plan() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let _tenant_id = create_test_tenant(&pool).await;

    let plan_no = format!("EMG-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let result = sqlx::query(
        r#"
        INSERT INTO qa_ehs_emergency_plans (plan_no, title, description, category, version, status, scope, emergency_level, responsible_dept, responsible_person, contact_phone, content, created_by, approved_by, approved_at, effective_date, expiry_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        "#,
    )
    .bind(&plan_no)
    .bind("火灾应急预案")
    .bind(Some("工厂火灾应急处理方案"))
    .bind(Some("fire"))
    .bind(Some("1.0"))
    .bind("draft")
    .bind(Some("全厂"))
    .bind(Some("high"))
    .bind(Some("安全部"))
    .bind(Some("张三"))
    .bind(Some("13800000000"))
    .bind(Some("应急流程描述..."))
    .bind("admin")
    .bind(None::<String>)
    .bind(None::<chrono::DateTime<chrono::Utc>>)
    .bind(None::<chrono::DateTime<chrono::Utc>>)
    .bind(None::<chrono::DateTime<chrono::Utc>>)
    .execute(&pool)
    .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_create_hazardous_material() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let _tenant_id = create_test_tenant(&pool).await;

    let material_no = format!("HM-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let result = sqlx::query(
        r#"
        INSERT INTO qa_ehs_hazardous_materials (material_no, name, alias, english_name, cas_no, category, hazard_level, hazard_class, specification, unit, packaging, storage_condition, storage_location, max_stock, min_stock, current_stock, safety_data_sheet, emergency_measures, supplier, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        "#,
    )
    .bind(&material_no)
    .bind("危险化学品A")
    .bind(None::<String>)
    .bind(None::<String>)
    .bind(None::<String>)
    .bind("flammable")
    .bind(Some("high"))
    .bind(Some("{}"))
    .bind(Some("500ml"))
    .bind(Some("瓶"))
    .bind(Some("铁桶"))
    .bind(Some("阴凉干燥处"))
    .bind(Some("危险品仓库"))
    .bind(Some(1000.0))
    .bind(Some(100.0))
    .bind(Some(500.0))
    .bind(None::<String>)
    .bind(None::<String>)
    .bind(None::<String>)
    .bind("active")
    .execute(&pool)
    .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_risk_lifecycle() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let _tenant_id = create_test_tenant(&pool).await;

    let risk_no = format!("RSK-LC-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let risk_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO qa_ehs_risks (risk_no, title, description, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
    )
    .bind(&risk_no)
    .bind("风险生命周期测试")
    .bind(Some("测试风险"))
    .bind("identified")
    .fetch_one(&pool)
    .await
    .unwrap();

    let result = sqlx::query("UPDATE qa_ehs_risks SET status = $1 WHERE id = $2")
        .bind("assessed")
        .bind(risk_id)
        .execute(&pool)
        .await;

    assert!(result.is_ok());

    let result = sqlx::query("UPDATE qa_ehs_risks SET status = $1 WHERE id = $2")
        .bind("controlled")
        .bind(risk_id)
        .execute(&pool)
        .await;

    assert!(result.is_ok());

    let final_status =
        sqlx::query_scalar::<_, String>("SELECT status FROM qa_ehs_risks WHERE id = $1")
            .bind(risk_id)
            .fetch_one(&pool)
            .await;

    assert!(final_status.is_ok());
    assert_eq!(final_status.unwrap(), "controlled");
}

#[tokio::test]
async fn test_hazard_workflow() {
    if !ensure_db_available().await {
        eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
        return;
    }
    let pool = create_test_pool().await;
    let _tenant_id = create_test_tenant(&pool).await;

    let hazard_no = format!("HAZ-WF-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let hazard_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO qa_ehs_hazards (hazard_no, title, description, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
    )
    .bind(&hazard_no)
    .bind("隐患处理流程测试")
    .bind(Some("测试隐患"))
    .bind("reported")
    .fetch_one(&pool)
    .await
    .unwrap();

    let result = sqlx::query("INSERT INTO qa_ehs_hazard_rectifications (hazard_id, description, responsible, status) VALUES ($1, $2, $3, $4)")
        .bind(hazard_id)
        .bind("整改措施")
        .bind("责任人")
        .bind("in_progress")
        .execute(&pool)
        .await;

    assert!(result.is_ok());

    let result = sqlx::query(
        "INSERT INTO qa_ehs_hazard_verifications (hazard_id, verifier, result) VALUES ($1, $2, $3)",
    )
    .bind(hazard_id)
    .bind("审核员")
    .bind("passed")
    .execute(&pool)
    .await;

    assert!(result.is_ok());

    let result = sqlx::query("UPDATE qa_ehs_hazards SET status = $1 WHERE id = $2")
        .bind("resolved")
        .bind(hazard_id)
        .execute(&pool)
        .await;

    assert!(result.is_ok());
}
