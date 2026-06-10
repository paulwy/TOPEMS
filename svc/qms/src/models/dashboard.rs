use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// 质量管理仪表盘统计数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    /// 质量标准统计
    pub standards: StandardStats,
    /// 质量检查统计
    pub inspections: InspectionStats,
    /// 质量问题统计
    pub issues: IssueStats,
    /// 纠正措施统计
    pub actions: ActionStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandardStats {
    /// 总数
    pub total: i64,
    /// 活跃数量
    pub active: i64,
    /// 已归档数量
    pub archived: i64,
    /// 按类别统计
    pub by_category: Vec<CategoryCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InspectionStats {
    /// 总数
    pub total: i64,
    /// 待检查数量
    pub pending: i64,
    /// 进行中数量
    pub in_progress: i64,
    /// 已完成数量
    pub completed: i64,
    /// 通过数量
    pub passed: i64,
    /// 不通过数量
    pub failed: i64,
    /// 按检查类型统计
    pub by_type: Vec<TypeCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueStats {
    /// 总数
    pub total: i64,
    /// 开放数量
    pub open: i64,
    /// 处理中数量
    pub in_progress: i64,
    /// 已解决数量
    pub resolved: i64,
    /// 已关闭数量
    pub closed: i64,
    /// 按严重程度统计
    pub by_severity: Vec<SeverityCount>,
    /// 按优先级统计
    pub by_priority: Vec<PriorityCount>,
    /// 逾期数量
    pub overdue: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionStats {
    /// 总数
    pub total: i64,
    /// 待处理数量
    pub pending: i64,
    /// 进行中数量
    pub in_progress: i64,
    /// 已实施数量
    pub implemented: i64,
    /// 已验证数量
    pub verified: i64,
    /// 已关闭数量
    pub closed: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CategoryCount {
    pub category: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TypeCount {
    pub inspection_type: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SeverityCount {
    pub severity: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PriorityCount {
    pub priority: String,
    pub count: i64,
}

/// 问题详情（包含关联的纠正措施）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueWithActions {
    pub issue: super::QualityIssue,
    pub actions: Vec<super::CorrectiveAction>,
}

/// 检查详情（包含关联的质量标准）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InspectionWithStandard {
    pub inspection: super::QualityInspection,
    pub standard: Option<super::QualityStandard>,
}