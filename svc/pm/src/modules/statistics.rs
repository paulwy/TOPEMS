use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;

use topems_shared_core::response::ApiResponse;

// ============ 类型定义 ============

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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

impl Default for PmStatistics {
    fn default() -> Self {
        Self {
            total_projects: 0,
            draft_projects: 0,
            pending_projects: 0,
            active_projects: 0,
            completed_projects: 0,
            cancelled_projects: 0,
            total_contracts: 0,
            pending_contracts: 0,
            active_contracts: 0,
            completed_contracts: 0,
            total_budget: 0.0,
            spent_budget: 0.0,
            budget_usage_rate: 0.0,
            total_risks: 0,
            open_risks: 0,
            closed_risks: 0,
            total_tasks: 0,
            pending_tasks: 0,
            in_progress_tasks: 0,
            completed_tasks: 0,
            on_time_projects: None,
            delayed_projects: None,
            average_progress: None,
            high_risk_projects: None,
            medium_risk_projects: None,
            low_risk_projects: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProjectStatistics {
    pub total_projects: i64,
    pub by_status: Vec<StatusCount>,
    pub by_type: Vec<TypeCount>,
    pub by_leader: Vec<LeaderCount>,
    pub average_progress: f64,
    pub on_time_rate: f64,
    pub high_risk_count: i64,
}

impl Default for ProjectStatistics {
    fn default() -> Self {
        Self {
            total_projects: 0,
            by_status: Vec::new(),
            by_type: Vec::new(),
            by_leader: Vec::new(),
            average_progress: 0.0,
            on_time_rate: 0.0,
            high_risk_count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

impl Default for StatusCount {
    fn default() -> Self {
        Self {
            status: String::new(),
            count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TypeCount {
    #[serde(rename = "type")]
    pub project_type: String,
    pub count: i64,
}

impl Default for TypeCount {
    fn default() -> Self {
        Self {
            project_type: String::new(),
            count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LeaderCount {
    pub leader: String,
    pub count: i64,
}

impl Default for LeaderCount {
    fn default() -> Self {
        Self {
            leader: String::new(),
            count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ContractStatistics {
    pub total_contracts: i64,
    pub by_status: Vec<StatusCount>,
    pub by_type: Vec<TypeCount>,
    pub total_amount: f64,
    pub avg_amount: f64,
}

impl Default for ContractStatistics {
    fn default() -> Self {
        Self {
            total_contracts: 0,
            by_status: Vec::new(),
            by_type: Vec::new(),
            total_amount: 0.0,
            avg_amount: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BudgetStatistics {
    pub total_budget: f64,
    pub allocated_budget: f64,
    pub spent_budget: f64,
    pub remaining_budget: f64,
    pub budget_usage_rate: f64,
    pub by_category: Vec<CategoryCount>,
}

impl Default for BudgetStatistics {
    fn default() -> Self {
        Self {
            total_budget: 0.0,
            allocated_budget: 0.0,
            spent_budget: 0.0,
            remaining_budget: 0.0,
            budget_usage_rate: 0.0,
            by_category: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CategoryCount {
    pub category: String,
    pub total: f64,
    pub spent: f64,
}

impl Default for CategoryCount {
    fn default() -> Self {
        Self {
            category: String::new(),
            total: 0.0,
            spent: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RiskStatistics {
    pub total_risks: i64,
    pub open_risks: i64,
    pub closed_risks: i64,
    pub by_level: Vec<LevelCount>,
    pub by_category: Vec<CategoryCount>,
}

impl Default for RiskStatistics {
    fn default() -> Self {
        Self {
            total_risks: 0,
            open_risks: 0,
            closed_risks: 0,
            by_level: Vec::new(),
            by_category: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LevelCount {
    pub level: String,
    pub count: i64,
}

impl Default for LevelCount {
    fn default() -> Self {
        Self {
            level: String::new(),
            count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TaskStatistics {
    pub total_tasks: i64,
    pub by_status: Vec<StatusCount>,
    pub by_priority: Vec<PriorityCount>,
    pub completion_rate: f64,
    pub overdue_count: i64,
}

impl Default for TaskStatistics {
    fn default() -> Self {
        Self {
            total_tasks: 0,
            by_status: Vec::new(),
            by_priority: Vec::new(),
            completion_rate: 0.0,
            overdue_count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PriorityCount {
    pub priority: String,
    pub count: i64,
}

impl Default for PriorityCount {
    fn default() -> Self {
        Self {
            priority: String::new(),
            count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DashboardOverview {
    pub projects: ProjectStatistics,
    pub contracts: ContractStatistics,
    pub budget: BudgetStatistics,
    pub risks: RiskStatistics,
    pub tasks: TaskStatistics,
}

impl Default for DashboardOverview {
    fn default() -> Self {
        Self {
            projects: ProjectStatistics::default(),
            contracts: ContractStatistics::default(),
            budget: BudgetStatistics::default(),
            risks: RiskStatistics::default(),
            tasks: TaskStatistics::default(),
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
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

// ============ Handler（内部逻辑抽取，避免 extractor 直接调用） ============

async fn build_pm_statistics(db: &PgPool) -> PmStatistics {
    PmStatistics {
        total_projects: query_count(db, "SELECT COUNT(*) FROM pm_projects").await,
        draft_projects: query_count(
            db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'draft'",
        )
        .await,
        pending_projects: query_count(
            db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'pending'",
        )
        .await,
        active_projects: query_count(
            db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'active'",
        )
        .await,
        completed_projects: query_count(
            db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'completed'",
        )
        .await,
        cancelled_projects: query_count(
            db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'cancelled'",
        )
        .await,

        total_contracts: query_count(db, "SELECT COUNT(*) FROM pm_contracts").await,
        pending_contracts: query_count(
            db,
            "SELECT COUNT(*) FROM pm_contracts WHERE status = 'pending'",
        )
        .await,
        active_contracts: query_count(
            db,
            "SELECT COUNT(*) FROM pm_contracts WHERE status = 'active'",
        )
        .await,
        completed_contracts: query_count(
            db,
            "SELECT COUNT(*) FROM pm_contracts WHERE status = 'completed'",
        )
        .await,

        total_budget: query_sum(db, "SELECT COALESCE(SUM(total_amount), 0) FROM pm_budgets").await,
        spent_budget: query_sum(db, "SELECT COALESCE(SUM(spent_amount), 0) FROM pm_budgets").await,
        budget_usage_rate: 0.0,

        total_risks: query_count(db, "SELECT COUNT(*) FROM pm_risks").await,
        open_risks: query_count(
            db,
            "SELECT COUNT(*) FROM pm_risks WHERE status IN ('identified', 'mitigating')",
        )
        .await,
        closed_risks: query_count(db, "SELECT COUNT(*) FROM pm_risks WHERE status = 'closed'")
            .await,

        total_tasks: query_count(db, "SELECT COUNT(*) FROM pm_tasks").await,
        pending_tasks: query_count(db, "SELECT COUNT(*) FROM pm_tasks WHERE status = 'pending'")
            .await,
        in_progress_tasks: query_count(
            db,
            "SELECT COUNT(*) FROM pm_tasks WHERE status = 'in_progress'",
        )
        .await,
        completed_tasks: query_count(
            db,
            "SELECT COUNT(*) FROM pm_tasks WHERE status = 'completed'",
        )
        .await,

        on_time_projects: None,
        delayed_projects: None,
        average_progress: None,
        high_risk_projects: None,
        medium_risk_projects: None,
        low_risk_projects: None,
    }
}

async fn build_project_statistics(db: &PgPool) -> ProjectStatistics {
    let total_projects = query_count(db, "SELECT COUNT(*) FROM pm_projects").await;

    let by_status = query_status_counts(
        db,
        "SELECT status, COUNT(*) as count FROM pm_projects GROUP BY status",
    )
    .await;

    let by_type: Vec<TypeCount> = sqlx::query_as::<_, (String, i64)>(
        "SELECT project_type, COUNT(*) as count FROM pm_projects GROUP BY project_type",
    )
    .fetch_all(db)
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
    .fetch_all(db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(leader, count)| LeaderCount { leader, count })
    .collect();

    let average_progress: f64 = sqlx::query_scalar(
        "SELECT COALESCE(AVG(progress), 0) FROM pm_projects WHERE status = 'active'",
    )
    .fetch_one(db)
    .await
    .unwrap_or(0.0);

    let high_risk_count = query_count(
        db,
        "SELECT COUNT(*) FROM pm_projects WHERE risklevel = 'high'",
    )
    .await;

    let on_time_rate = if total_projects > 0 {
        let on_time = query_count(
            db,
            "SELECT COUNT(*) FROM pm_projects WHERE status = 'completed' AND end_date <= (SELECT end_date FROM pm_projects p2 WHERE p2.id = pm_projects.id)",
        )
        .await;
        on_time as f64 / total_projects as f64 * 100.0
    } else {
        0.0
    };

    ProjectStatistics {
        total_projects,
        by_status,
        by_type,
        by_leader,
        average_progress,
        on_time_rate,
        high_risk_count,
    }
}

async fn build_contract_statistics(db: &PgPool) -> ContractStatistics {
    let total_contracts = query_count(db, "SELECT COUNT(*) FROM pm_contracts").await;

    let by_status = query_status_counts(
        db,
        "SELECT status, COUNT(*) as count FROM pm_contracts GROUP BY status",
    )
    .await;

    let by_type: Vec<TypeCount> = sqlx::query_as::<_, (String, i64)>(
        "SELECT contract_type, COUNT(*) as count FROM pm_contracts GROUP BY contract_type",
    )
    .fetch_all(db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(project_type, count)| TypeCount {
        project_type,
        count,
    })
    .collect();

    let total_amount: f64 = sqlx::query_scalar("SELECT COALESCE(SUM(amount), 0) FROM pm_contracts")
        .fetch_one(db)
        .await
        .unwrap_or(0.0);

    let avg_amount = if total_contracts > 0 {
        total_amount / total_contracts as f64
    } else {
        0.0
    };

    ContractStatistics {
        total_contracts,
        by_status,
        by_type,
        total_amount,
        avg_amount,
    }
}

async fn build_budget_statistics(db: &PgPool) -> BudgetStatistics {
    let total_budget: f64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(total_amount), 0) FROM pm_budgets")
            .fetch_one(db)
            .await
            .unwrap_or(0.0);

    let allocated_budget: f64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(allocated_amount), 0) FROM pm_budgets")
            .fetch_one(db)
            .await
            .unwrap_or(0.0);

    let spent_budget: f64 =
        sqlx::query_scalar("SELECT COALESCE(SUM(spent_amount), 0) FROM pm_budgets")
            .fetch_one(db)
            .await
            .unwrap_or(0.0);

    let remaining_budget = total_budget - spent_budget;
    let budget_usage_rate = if total_budget > 0.0 {
        spent_budget / total_budget * 100.0
    } else {
        0.0
    };

    let by_category: Vec<CategoryCount> = sqlx::query_as::<_, (String, f64, f64)>(
        "SELECT COALESCE(category, 'uncategorized'), SUM(budget_amount), SUM(spent_amount) FROM pm_budget_items GROUP BY category",
    )
    .fetch_all(db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(category, total, spent)| CategoryCount { category, total, spent })
    .collect();

    BudgetStatistics {
        total_budget,
        allocated_budget,
        spent_budget,
        remaining_budget,
        budget_usage_rate,
        by_category,
    }
}

async fn build_risk_statistics(db: &PgPool) -> RiskStatistics {
    let total_risks = query_count(db, "SELECT COUNT(*) FROM pm_risks").await;
    let open_risks = query_count(
        db,
        "SELECT COUNT(*) FROM pm_risks WHERE status IN ('identified', 'mitigating')",
    )
    .await;
    let closed_risks =
        query_count(db, "SELECT COUNT(*) FROM pm_risks WHERE status = 'closed'").await;

    let by_level: Vec<LevelCount> = sqlx::query_as::<_, (String, i64)>(
        "SELECT COALESCE(level, 'unknown'), COUNT(*) FROM pm_risks GROUP BY level",
    )
    .fetch_all(db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(level, count)| LevelCount { level, count })
    .collect();

    let by_category: Vec<CategoryCount> = sqlx::query_as::<_, (String, i64, i64)>(
        "SELECT COALESCE(risk_category, 'uncategorized'), COUNT(*), SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) FROM pm_risks GROUP BY risk_category",
    )
    .fetch_all(db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(category, total, spent)| CategoryCount {
        category,
        total: total as f64,
        spent: spent as f64,
    })
    .collect();

    RiskStatistics {
        total_risks,
        open_risks,
        closed_risks,
        by_level,
        by_category,
    }
}

async fn build_task_statistics(db: &PgPool) -> TaskStatistics {
    let total_tasks = query_count(db, "SELECT COUNT(*) FROM pm_tasks").await;

    let by_status = query_status_counts(
        db,
        "SELECT status, COUNT(*) as count FROM pm_tasks GROUP BY status",
    )
    .await;

    let by_priority: Vec<PriorityCount> = sqlx::query_as::<_, (String, i64)>(
        "SELECT COALESCE(priority, 'normal'), COUNT(*) FROM pm_tasks GROUP BY priority",
    )
    .fetch_all(db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(priority, count)| PriorityCount { priority, count })
    .collect();

    let completed = query_count(
        db,
        "SELECT COUNT(*) FROM pm_tasks WHERE status = 'completed'",
    )
    .await;
    let completion_rate = if total_tasks > 0 {
        completed as f64 / total_tasks as f64 * 100.0
    } else {
        0.0
    };

    let overdue_count = query_count(
        db,
        "SELECT COUNT(*) FROM pm_tasks WHERE status NOT IN ('completed', 'cancelled') AND due_date < CURRENT_TIMESTAMP",
    )
    .await;

    TaskStatistics {
        total_tasks,
        by_status,
        by_priority,
        completion_rate,
        overdue_count,
    }
}

// ============ 路由 Handler（附加 utoipa 宏） ============

#[utoipa::path(
    get,
    path = "/statistics",
    tag = "pm_statistics",
    responses(
        (status = 200, description = "PM 综合统计数据", body = ApiResponse<PmStatistics>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_statistics(State(db): State<PgPool>) -> Json<ApiResponse<PmStatistics>> {
    let stats = build_pm_statistics(&db).await;
    Json(ApiResponse::success(stats, "统计数据获取成功"))
}

#[utoipa::path(
    get,
    path = "/statistics/projects",
    tag = "pm_statistics",
    params(
        ("start_date" = Option<String>, Query, description = "开始日期"),
        ("end_date" = Option<String>, Query, description = "结束日期"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("limit" = Option<i64>, Query, description = "返回条数限制"),
    ),
    responses(
        (status = 200, description = "项目维度统计", body = ApiResponse<ProjectStatistics>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_project_statistics(
    State(db): State<PgPool>,
    Query(_params): Query<StatsQuery>,
) -> Json<ApiResponse<ProjectStatistics>> {
    let stats = build_project_statistics(&db).await;
    Json(ApiResponse::success(stats, "项目统计数据获取成功"))
}

#[utoipa::path(
    get,
    path = "/statistics/contracts",
    tag = "pm_statistics",
    params(
        ("start_date" = Option<String>, Query, description = "开始日期"),
        ("end_date" = Option<String>, Query, description = "结束日期"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("limit" = Option<i64>, Query, description = "返回条数限制"),
    ),
    responses(
        (status = 200, description = "合同维度统计", body = ApiResponse<ContractStatistics>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_contract_statistics(
    State(db): State<PgPool>,
    Query(_params): Query<StatsQuery>,
) -> Json<ApiResponse<ContractStatistics>> {
    let stats = build_contract_statistics(&db).await;
    Json(ApiResponse::success(stats, "合同统计数据获取成功"))
}

#[utoipa::path(
    get,
    path = "/statistics/budget",
    tag = "pm_statistics",
    params(
        ("start_date" = Option<String>, Query, description = "开始日期"),
        ("end_date" = Option<String>, Query, description = "结束日期"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("limit" = Option<i64>, Query, description = "返回条数限制"),
    ),
    responses(
        (status = 200, description = "预算维度统计", body = ApiResponse<BudgetStatistics>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_budget_statistics(
    State(db): State<PgPool>,
    Query(_params): Query<StatsQuery>,
) -> Json<ApiResponse<BudgetStatistics>> {
    let stats = build_budget_statistics(&db).await;
    Json(ApiResponse::success(stats, "预算统计数据获取成功"))
}

#[utoipa::path(
    get,
    path = "/statistics/risks",
    tag = "pm_statistics",
    params(
        ("start_date" = Option<String>, Query, description = "开始日期"),
        ("end_date" = Option<String>, Query, description = "结束日期"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("limit" = Option<i64>, Query, description = "返回条数限制"),
    ),
    responses(
        (status = 200, description = "风险维度统计", body = ApiResponse<RiskStatistics>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_risk_statistics(
    State(db): State<PgPool>,
    Query(_params): Query<StatsQuery>,
) -> Json<ApiResponse<RiskStatistics>> {
    let stats = build_risk_statistics(&db).await;
    Json(ApiResponse::success(stats, "风险统计数据获取成功"))
}

#[utoipa::path(
    get,
    path = "/statistics/tasks",
    tag = "pm_statistics",
    params(
        ("start_date" = Option<String>, Query, description = "开始日期"),
        ("end_date" = Option<String>, Query, description = "结束日期"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("limit" = Option<i64>, Query, description = "返回条数限制"),
    ),
    responses(
        (status = 200, description = "任务维度统计", body = ApiResponse<TaskStatistics>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_task_statistics(
    State(db): State<PgPool>,
    Query(_params): Query<StatsQuery>,
) -> Json<ApiResponse<TaskStatistics>> {
    let stats = build_task_statistics(&db).await;
    Json(ApiResponse::success(stats, "任务统计数据获取成功"))
}

#[utoipa::path(
    get,
    path = "/statistics/dashboard",
    tag = "pm_statistics",
    responses(
        (status = 200, description = "PM 仪表板综合数据", body = ApiResponse<DashboardOverview>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_dashboard(State(db): State<PgPool>) -> Json<ApiResponse<DashboardOverview>> {
    let projects = build_project_statistics(&db).await;
    let contracts = build_contract_statistics(&db).await;
    let budget = build_budget_statistics(&db).await;
    let risks = build_risk_statistics(&db).await;
    let tasks = build_task_statistics(&db).await;

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
