use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use topems_shared_core::response::ApiResponse;

// ============ 类型定义 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmStatistics {
    pub total_projects: i64,
    pub draft_projects: i64,
    pub pending_projects: i64,
    pub active_projects: i64,
    pub completed_projects: i64,
    pub cancelled_projects: i64,

    pub total_contracts: i64,
    pub pending_contracts: i64,
    pub active_contracts: i64,
    pub completed_contracts: i64,

    pub total_budget: f64,
    pub spent_budget: f64,
    pub budget_usage_rate: f64,

    pub total_risks: i64,
    pub open_risks: i64,
    pub closed_risks: i64,

    pub total_tasks: i64,
    pub pending_tasks: i64,
    pub in_progress_tasks: i64,
    pub completed_tasks: i64,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_time_projects: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delayed_projects: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub average_progress: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub high_risk_projects: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub medium_risk_projects: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub low_risk_projects: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectStatistics {
    pub total_projects: i64,
    pub by_status: Vec<StatusCount>,
    pub by_type: Vec<TypeCount>,
    pub by_leader: Vec<LeaderCount>,
    pub average_progress: f64,
    pub on_time_rate: f64,
    pub high_risk_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeCount {
    #[serde(rename = "type")]
    pub project_type: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaderCount {
    pub leader: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractStatistics {
    pub total_contracts: i64,
    pub by_status: Vec<StatusCount>,
    pub by_type: Vec<TypeCount>,
    pub total_amount: f64,
    pub avg_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetStatistics {
    pub total_budget: f64,
    pub allocated_budget: f64,
    pub spent_budget: f64,
    pub remaining_budget: f64,
    pub budget_usage_rate: f64,
    pub by_category: Vec<CategoryCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryCount {
    pub category: String,
    pub total: f64,
    pub spent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskStatistics {
    pub total_risks: i64,
    pub open_risks: i64,
    pub closed_risks: i64,
    pub by_level: Vec<LevelCount>,
    pub by_category: Vec<CategoryCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LevelCount {
    pub level: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStatistics {
    pub total_tasks: i64,
    pub by_status: Vec<StatusCount>,
    pub by_priority: Vec<PriorityCount>,
    pub completion_rate: f64,
    pub overdue_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriorityCount {
    pub priority: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardOverview {
    pub projects: ProjectStatistics,
    pub contracts: ContractStatistics,
    pub budget: BudgetStatistics,
    pub risks: RiskStatistics,
    pub tasks: TaskStatistics,
}

#[derive(Debug, Deserialize)]
pub struct StatsQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i64>,
}

// ============ 路由 ============

pub fn create_routes(db: PgPool) -> Router {
    Router::new()
        .route("/statistics", get(get_statistics))
        .route("/statistics/projects", get(get_project_statistics))
        .route("/statistics/contracts", get(get_contract_statistics))
        .route("/statistics/budget", get(get_budget_statistics))
        .route("/statistics/risks", get(get_risk_statistics))
        .route("/statistics/tasks", get(get_task_statistics))
        .route("/statistics/dashboard", get(get_dashboard))
        .with_state(db)
}

// ============ Handler ============

async fn get_statistics(State(db): State<PgPool>) -> Json<ApiResponse<PmStatistics>> {
    let stats = PmStatistics {
        total_projects: query_count(&db, "SELECT COUNT(*) FROM pm_projects").await,
        draft_projects: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'draft'",
        )
        .await,
        pending_projects: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'pending'",
        )
        .await,
        active_projects: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'active'",
        )
        .await,
        completed_projects: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'completed'",
        )
        .await,
        cancelled_projects: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'cancelled'",
        )
        .await,

        total_contracts: query_count(&db, "SELECT COUNT(*) FROM pm_contracts").await,
        pending_contracts: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_contracts WHERE status = 'pending'",
        )
        .await,
        active_contracts: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_contracts WHERE status = 'active'",
        )
        .await,
        completed_contracts: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_contracts WHERE status = 'completed'",
        )
        .await,

        total_budget: query_sum(&db, "SELECT COALESCE(SUM(total_amount), 0) FROM pm_budgets").await,
        spent_budget: query_sum(&db, "SELECT COALESCE(SUM(spent_amount), 0) FROM pm_budgets").await,
        budget_usage_rate: 0.0,

        total_risks: query_count(&db, "SELECT COUNT(*) FROM pm_risks").await,
        open_risks: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_risks WHERE status IN ('identified', 'mitigating')",
        )
        .await,
        closed_risks: query_count(&db, "SELECT COUNT(*) FROM pm_risks WHERE status = 'closed'")
            .await,

        total_tasks: query_count(&db, "SELECT COUNT(*) FROM pm_tasks").await,
        pending_tasks: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_tasks WHERE status = 'pending'",
        )
        .await,
        in_progress_tasks: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_tasks WHERE status = 'in_progress'",
        )
        .await,
        completed_tasks: query_count(
            &db,
            "SELECT COUNT(*) FROM pm_tasks WHERE status = 'completed'",
        )
        .await,

        on_time_projects: None,
        delayed_projects: None,
        average_progress: None,
        high_risk_projects: None,
        medium_risk_projects: None,
        low_risk_projects: None,
    };

    Json(ApiResponse::success(stats, "统计数据获取成功"))
}

async fn get_project_statistics(
    State(db): State<PgPool>,
    Query(params): Query<StatsQuery>,
) -> Json<ApiResponse<ProjectStatistics>> {
    let total_projects = query_count(&db, "SELECT COUNT(*) FROM pm_projects").await;

    let by_status = query_status_counts(
        &db,
        "SELECT status, COUNT(*) as count FROM pm_projects GROUP BY status",
    )
    .await;

    let by_type: Vec<TypeCount> = sqlx::query_as::<_, (String, i64)>(
        "SELECT project_type, COUNT(*) as count FROM pm_projects GROUP BY project_type",
    )
    .fetch_all(&db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(project_type, count)| TypeCount {
        project_type,
        count,
    })
    .collect();

    let by_leader: Vec<LeaderCount> = sqlx::query_as::<_, (String, i64)>(
        "SELECT leader as leader, COUNT(*) as count FROM pm_projects WHERE leader IS NOT NULL GROUP BY leader ORDER BY count DESC",
    )
    .fetch_all(&db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(leader, count)| LeaderCount { leader, count })
    .collect();

    let average_progress: f64 = sqlx::query_scalar(
        "SELECT COALESCE(AVG(progress), 0) FROM pm_projects WHERE status = 'active'",
    )
    .fetch_one(&db)
    .await
    .unwrap_or(0.0);

    let high_risk_count = query_count(
        &db,
        "SELECT COUNT(*) FROM pm_projects WHERE risklevel = 'high'",
    )
    .await;

    let on_time_rate = if total_projects > 0 {
        let on_time = query_count(
            &db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'completed' AND end_date <= (SELECT end_date FROM pm_projects p2 WHERE p2.id = pm_projects.id)",
        )
        .await;
        on_time as f64 / total_projects as f64 * 100.0
    } else {
        0.0
    };

    let stats = ProjectStatistics {
        total_projects,
        by_status,
        by_type,
        by_leader,
        average_progress,
        on_time_rate,
        high_risk_count,
    };

    Json(ApiResponse::success(stats, "项目统计数据获取成功"))
}

async fn get_contract_statistics(
    State(db): State<PgPool>,
    Query(params): Query<StatsQuery>,
) -> Json<ApiResponse<ContractStatistics>> {
    let total_contracts = query_count(&db, "SELECT COUNT(*) FROM pm_contracts").await;

    let by_status = query_status_counts(
        &db,
        "SELECT status, COUNT(*) as count FROM pm_contracts GROUP BY status",
    )
    .await;

    let by_type: Vec<TypeCount> = sqlx::query_as::<_, (String, i64)>(
        "SELECT contract_type, COUNT(*) as count FROM pm_contracts GROUP BY contract_type",
    )
    .fetch_all(&db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(project_type, count)| TypeCount {
        project_type,
        count,
    })
    .collect();

    let total_amount: f64 = sqlx::query_scalar("SELECT COALESCE(SUM(amount), 0) FROM pm_contracts")
        .fetch_one(&db)
        .await
        .unwrap_or(0.0);

    let avg_amount = if total_contracts > 0 {
        total_amount / total_contracts as f64
    } else {
        0.0
    };

    let stats = ContractStatistics {
        total_contracts,
        by_status,
        by_type,
        total_amount,
        avg_amount,
    };

    Json(ApiResponse::success(stats, "合同统计数据获取成功"))
}

async fn get_budget_statistics(
    State(db): State<PgPool>,
    Query(params): Query<StatsQuery>,
) -> Json<ApiResponse<BudgetStatistics>> {
    let total_budget: f64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(total_amount), 0) FROM pm_budgets")
            .fetch_one(&db)
            .await
            .unwrap_or(0.0);

    let allocated_budget: f64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(allocated_amount), 0) FROM pm_budgets")
            .fetch_one(&db)
            .await
            .unwrap_or(0.0);

    let spent_budget: f64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(spent_amount), 0) FROM pm_budgets")
            .fetch_one(&db)
            .await
            .unwrap_or(0.0);

    let remaining_budget = total_budget - spent_budget;
    let budget_usage_rate = if total_budget > 0 {
        spent_budget / total_budget * 100.0
    } else {
        0.0
    };

    let by_category: Vec<CategoryCount> = sqlx::query_as::<_, (String, f64, f64)>(
        "SELECT COALESCE(category, 'uncategorized'), SUM(budget_amount), SUM(spent_amount) FROM pm_budget_items GROUP BY category",
    )
    .fetch_all(&db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(category, total, spent)| CategoryCount { category, total, spent })
    .collect();

    let stats = BudgetStatistics {
        total_budget,
        allocated_budget,
        spent_budget,
        remaining_budget,
        budget_usage_rate,
        by_category,
    };

    Json(ApiResponse::success(stats, "预算统计数据获取成功"))
}

async fn get_risk_statistics(
    State(db): State<PgPool>,
    Query(params): Query<StatsQuery>,
) -> Json<ApiResponse<RiskStatistics>> {
    let total_risks = query_count(&db, "SELECT COUNT(*) FROM pm_risks").await;
    let open_risks = query_count(
        &db,
        "SELECT COUNT(*) FROM pm_risks WHERE status IN ('identified', 'mitigating')",
    )
    .await;
    let closed_risks =
        query_count(&db, "SELECT COUNT(*) FROM pm_risks WHERE status = 'closed'").await;

    let by_level: Vec<LevelCount> = sqlx::query_as::<_, (String, i64)>(
        "SELECT COALESCE(level, 'unknown'), COUNT(*) FROM pm_risks GROUP BY level",
    )
    .fetch_all(&db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(level, count)| LevelCount { level, count })
    .collect();

    let by_category: Vec<CategoryCount> = sqlx::query_as::<_, (String, i64, i64)>(
        "SELECT COALESCE(risk_category, 'uncategorized'), COUNT(*), SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) FROM pm_risks GROUP BY risk_category",
    )
    .fetch_all(&db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(category, total, spent)| CategoryCount {
        category,
        total: total as f64,
        spent: spent as f64,
    })
    .collect();

    let stats = RiskStatistics {
        total_risks,
        open_risks,
        closed_risks,
        by_level,
        by_category,
    };

    Json(ApiResponse::success(stats, "风险统计数据获取成功"))
}

async fn get_task_statistics(
    State(db): State<PgPool>,
    Query(params): Query<StatsQuery>,
) -> Json<ApiResponse<TaskStatistics>> {
    let total_tasks = query_count(&db, "SELECT COUNT(*) FROM pm_tasks").await;

    let by_status = query_status_counts(
        &db,
        "SELECT status, COUNT(*) as count FROM pm_tasks GROUP BY status",
    )
    .await;

    let by_priority: Vec<PriorityCount> = sqlx::query_as::<_, (String, i64)>(
        "SELECT COALESCE(priority, 'normal'), COUNT(*) FROM pm_tasks GROUP BY priority",
    )
    .fetch_all(&db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(priority, count)| PriorityCount { priority, count })
    .collect();

    let completed = query_count(
        &db,
        "SELECT COUNT(*) FROM pm_tasks WHERE status = 'completed'",
    )
    .await;
    let completion_rate = if total_tasks > 0 {
        completed as f64 / total_tasks as f64 * 100.0
    } else {
        0.0
    };

    let overdue_count = query_count(
        &db,
        "SELECT COUNT(*) FROM pm_tasks WHERE status NOT IN ('completed', 'cancelled') AND due_date < CURRENT_TIMESTAMP",
    )
    .await;

    let stats = TaskStatistics {
        total_tasks,
        by_status,
        by_priority,
        completion_rate,
        overdue_count,
    };

    Json(ApiResponse::success(stats, "任务统计数据获取成功"))
}

async fn get_dashboard(State(db): State<PgPool>) -> Json<ApiResponse<DashboardOverview>> {
    let project_stats = get_project_statistics(
        State(db.clone()),
        Query(StatsQuery {
            start_date: None,
            end_date: None,
            status: None,
            limit: None,
        }),
    )
    .await;

    let contract_stats = get_contract_statistics(
        State(db.clone()),
        Query(StatsQuery {
            start_date: None,
            end_date: None,
            status: None,
            limit: None,
        }),
    )
    .await;

    let budget_stats = get_budget_statistics(
        State(db.clone()),
        Query(StatsQuery {
            start_date: None,
            end_date: None,
            status: None,
            limit: None,
        }),
    )
    .await;

    let risk_stats = get_risk_statistics(
        State(db.clone()),
        Query(StatsQuery {
            start_date: None,
            end_date: None,
            status: None,
            limit: None,
        }),
    )
    .await;

    let task_stats = get_task_statistics(
        State(db.clone()),
        Query(StatsQuery {
            start_date: None,
            end_date: None,
            status: None,
            limit: None,
        }),
    )
    .await;

    // 从 ApiResponse 中提取数据
    let projects = project_stats.data.unwrap_or_default();
    let contracts = contract_stats.data.unwrap_or_default();
    let budget = budget_stats.data.unwrap_or_default();
    let risks = risk_stats.data.unwrap_or_default();
    let tasks = task_stats.data.unwrap_or_default();

    let dashboard = DashboardOverview {
        projects,
        contracts,
        budget,
        risks,
        tasks,
    };

    Json(ApiResponse::success(dashboard, "仪表板数据获取成功"))
}

// ============ 辅助函数 ============

async fn query_count(db: &PgPool, sql: &str) -> i64 {
    sqlx::query_scalar(sql).fetch_one(db).await.unwrap_or(0)
}

async fn query_sum(db: &PgPool, sql: &str) -> f64 {
    sqlx::query_scalar(sql).fetch_one(db).await.unwrap_or(0.0)
}

async fn query_status_counts(db: &PgPool, sql: &str) -> Vec<StatusCount> {
    sqlx::query_as::<_, (String, i64)>(sql)
        .fetch_all(db)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|(status, count)| StatusCount { status, count })
        .collect()
}
