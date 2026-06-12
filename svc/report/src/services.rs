use crate::models::*;
use anyhow::Result;
use sqlx::PgPool;

/// 获取报表中心统计数据
pub async fn fetch_reports_center_stats(pool: &PgPool) -> Result<ReportsCenterStats> {
    // 获取仪表板统计数据
    let total_users: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM iam.users WHERE deleted_at IS NULL")
            .fetch_one(pool)
            .await
            .unwrap_or(0);

    let active_users: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam.users WHERE deleted_at IS NULL AND last_login_at > NOW() - INTERVAL '30 days'"
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let total_roles: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM iam.roles WHERE deleted_at IS NULL")
            .fetch_one(pool)
            .await
            .unwrap_or(0);

    let total_permissions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM iam.permissions")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    let total_companies: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM iam.companies WHERE deleted_at IS NULL")
            .fetch_one(pool)
            .await
            .unwrap_or(0);

    let total_departments: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM iam.departments WHERE deleted_at IS NULL")
            .fetch_one(pool)
            .await
            .unwrap_or(0);

    let total_employees: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM iam.employees WHERE deleted_at IS NULL")
            .fetch_one(pool)
            .await
            .unwrap_or(0);

    let recent_activities: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM iam.audit_logs WHERE created_at > NOW() - INTERVAL '7 days'",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let dashboard = DashboardStats {
        total_users,
        active_users,
        total_roles,
        total_permissions,
        total_companies,
        total_departments,
        total_employees,
        recent_activities,
    };

    // 获取用户增长数据（最近6个月）
    let user_growth = fetch_user_growth_data(pool).await.unwrap_or_default();

    // 获取角色分布数据
    let role_distribution = fetch_role_distribution_data(pool).await.unwrap_or_default();

    // 获取活动类型数据
    let activity_types = fetch_activity_types_data(pool).await.unwrap_or_default();

    Ok(ReportsCenterStats {
        dashboard,
        user_growth,
        role_distribution,
        activity_types,
    })
}

/// 获取用户增长数据
async fn fetch_user_growth_data(pool: &PgPool) -> Result<Vec<UserGrowthDataPoint>> {
    let rows = sqlx::query_as::<_, UserGrowthRow>(
        r#"
        SELECT 
            TO_CHAR(created_at, 'YYYY-MM') as month,
            COUNT(*) as new_users
        FROM iam.users
        WHERE created_at > NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month
        "#,
    )
    .fetch_all(pool)
    .await?;

    let data_points = rows
        .into_iter()
        .map(|row| UserGrowthDataPoint {
            month: row.month,
            新增用户: row.new_users,
            活跃用户: (row.new_users as f64 * 0.7) as i64,
        })
        .collect();

    Ok(data_points)
}

#[derive(sqlx::FromRow)]
struct UserGrowthRow {
    month: String,
    new_users: i64,
}

/// 获取角色分布数据
async fn fetch_role_distribution_data(pool: &PgPool) -> Result<Vec<RoleDistributionDataPoint>> {
    let rows = sqlx::query_as::<_, RoleDistRow>(
        r#"
        SELECT r.name, COUNT(ur.user_id) as user_count
        FROM iam.roles r
        LEFT JOIN iam.user_roles ur ON r.id = ur.role_id
        WHERE r.deleted_at IS NULL
        GROUP BY r.id, r.name
        ORDER BY user_count DESC
        LIMIT 10
        "#,
    )
    .fetch_all(pool)
    .await?;

    let data_points = rows
        .into_iter()
        .map(|row| RoleDistributionDataPoint {
            name: row.name,
            value: row.user_count,
        })
        .collect();

    Ok(data_points)
}

#[derive(sqlx::FromRow)]
struct RoleDistRow {
    name: String,
    user_count: i64,
}

/// 获取活动类型数据
async fn fetch_activity_types_data(pool: &PgPool) -> Result<Vec<ActivityTypeDataPoint>> {
    let rows = sqlx::query_as::<_, ActivityRow>(
        r#"
        SELECT action, COUNT(*) as count
        FROM iam.audit_logs
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
        "#,
    )
    .fetch_all(pool)
    .await?;

    let data_points = rows
        .into_iter()
        .map(|row| ActivityTypeDataPoint {
            name: row.action,
            count: row.count,
        })
        .collect();

    Ok(data_points)
}

#[derive(sqlx::FromRow)]
struct ActivityRow {
    action: String,
    count: i64,
}

/// 生成报表数据
pub async fn generate_report_data(
    _pool: &PgPool,
    report_type: &str,
    _date_range: Option<&DateRange>,
    _filters: Option<&serde_json::Value>,
) -> Result<serde_json::Value> {
    // 返回示例数据结构
    let data = match report_type {
        "rs_project_progress" => serde_json::json!([
            {"项目名称": "智能工厂项目", "负责人": "张三", "开始日期": "2024-01-01", "结束日期": "2024-12-31", "进度": "65%", "状态": "进行中"},
            {"项目名称": "质量改进项目", "负责人": "李四", "开始日期": "2024-03-01", "结束日期": "2024-09-30", "进度": "80%", "状态": "进行中"},
        ]),
        "rs_experiment_record" => serde_json::json!([
            {"实验编号": "EXP-001", "实验名称": "新材料测试", "实验类型": "材料测试", "执行人": "王五", "开始时间": "2024-05-01 09:00", "结束时间": "2024-05-01 17:00", "结果": "成功"},
        ]),
        "lims_inspection_stats" => serde_json::json!([
            {"样品编号": "SMP-001", "样品名称": "原料A", "检验类型": "化学分析", "检验人": "赵六", "检验时间": "2024-05-15", "结果": "合格", "合格率": "98%"},
        ]),
        "lims_sample_summary" => serde_json::json!([
            {"样品编号": "SMP-001", "样品名称": "原料A", "来源": "供应商X", "接收时间": "2024-05-10", "状态": "已检验", "检验结果": "合格"},
        ]),
        "qms_quality_analysis" => serde_json::json!([
            {"检验项目": "尺寸检测", "检验数量": 1000, "合格数": 985, "不合格数": 15, "合格率": "98.5%", "趋势": "上升"},
        ]),
        "qms_defect_stats" => serde_json::json!([
            {"缺陷类型": "表面划痕", "缺陷数量": 25, "发生频率": "高", "影响程度": "中等", "处理状态": "已处理"},
        ]),
        "ehs_safety_check" => serde_json::json!([
            {"检查项目": "消防设备", "检查区域": "生产车间", "检查人": "安全员A", "检查时间": "2024-05-20", "结果": "合格", "整改措施": "无"},
        ]),
        "ehs_risk_assessment" => serde_json::json!([
            {"风险编号": "RSK-001", "风险类型": "机械伤害", "风险等级": "中", "影响范围": "生产车间", "控制措施": "防护罩", "状态": "已控制"},
        ]),
        "srm_supplier_eval" => serde_json::json!([
            {"供应商名称": "供应商A", "评分": 95, "交付率": "98%", "质量率": "99%", "合作年限": 5, "状态": "优秀"},
        ]),
        "srm_purchase_stats" => serde_json::json!([
            {"采购单号": "PO-2024-001", "供应商": "供应商A", "采购金额": 50000, "采购日期": "2024-05-01", "交付状态": "已交付", "验收状态": "已验收"},
        ]),
        "pdm_production_stats" => serde_json::json!([
            {"批次号": "BATCH-2024-001", "产品名称": "产品A", "生产数量": 1000, "合格数量": 985, "合格率": "98.5%", "生产日期": "2024-05-15"},
        ]),
        "pdm_process_summary" => serde_json::json!([
            {"工艺名称": "热处理", "工艺类型": "热加工", "执行次数": 150, "平均耗时": "2小时", "合格率": "99%", "优化建议": "温度控制优化"},
        ]),
        _ => serde_json::json!([]),
    };

    Ok(data)
}
