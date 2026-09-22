//! RFM 客户分群分析模块
//!
//! 基于 R（Recency 最近购买）、F（Frequency 购买频次）、M（Monetary 消费金额）
//! 三个维度对客户进行五分位打分，并映射到 8 种客户分群。
//!
//! 数据来源：crm.sales_orders 表（wms ShippingOrderRequested 事件写入）
//! 缓存表：crm.rfm_results 表（分析结果）

use axum::{
    extract::{Extension, Path, State},
    routing::{get, post},
    Json, Router,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};
use utoipa::ToSchema;
use uuid::Uuid;

use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::response::{api_error, ApiResponse};
use topems_shared_core::locale::Locale;
// ---------------------------------------------------------------------------
// 数据模型
// ---------------------------------------------------------------------------

/// RFM 分析配置
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct RfmConfig {
    /// 参考日期（默认今天），R 值 = 参考日期 - 最近购买日期
    #[serde(default)]
    pub reference_date: Option<NaiveDate>,
    /// 统计周期天数（默认 365），仅统计该周期内的订单
    #[serde(default = "default_period_days")]
    pub period_days: i32,
    /// R 维度权重（默认 [1.0]）
    #[serde(default = "default_weights")]
    pub r_weights: Vec<f64>,
    /// F 维度权重（默认 [1.0]）
    #[serde(default = "default_weights")]
    pub f_weights: Vec<f64>,
    /// M 维度权重（默认 [1.0]）
    #[serde(default = "default_weights")]
    pub m_weights: Vec<f64>,
}

fn default_period_days() -> i32 {
    365
}
fn default_weights() -> Vec<f64> {
    vec![1.0]
}

/// 客户分群枚举
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum RfmSegment {
    /// 重要价值客户（高 R 高 F 高 M）
    Champion,
    /// 忠诚客户（高频购买）
    Loyal,
    /// 潜力客户（近期有购买但频次低）
    Potential,
    /// 新客户（近期购买、低频低额）
    New,
    /// 流失风险客户（曾经活跃、近期下降）
    AtRisk,
    /// 不可流失客户（高价值但已沉寂）
    CannotLost,
    /// 休眠客户（低 R 低 F）
    Hibernating,
    /// 流失客户（全维度最低）
    Lost,
}

impl RfmSegment {
    pub fn as_str(&self) -> &'static str {
        match self {
            RfmSegment::Champion => "champion",
            RfmSegment::Loyal => "loyal",
            RfmSegment::Potential => "potential",
            RfmSegment::New => "new",
            RfmSegment::AtRisk => "at_risk",
            RfmSegment::CannotLost => "cannot_lost",
            RfmSegment::Hibernating => "hibernating",
            RfmSegment::Lost => "lost",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "champion" => RfmSegment::Champion,
            "loyal" => RfmSegment::Loyal,
            "potential" => RfmSegment::Potential,
            "new" => RfmSegment::New,
            "at_risk" => RfmSegment::AtRisk,
            "cannot_lost" => RfmSegment::CannotLost,
            "hibernating" => RfmSegment::Hibernating,
            "lost" => RfmSegment::Lost,
            _ => RfmSegment::Hibernating,
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            RfmSegment::Champion => "重要价值客户",
            RfmSegment::Loyal => "忠诚客户",
            RfmSegment::Potential => "潜力客户",
            RfmSegment::New => "新客户",
            RfmSegment::AtRisk => "流失风险客户",
            RfmSegment::CannotLost => "不可流失客户",
            RfmSegment::Hibernating => "休眠客户",
            RfmSegment::Lost => "流失客户",
        }
    }

    pub fn all() -> &'static [RfmSegment] {
        &[
            RfmSegment::Champion,
            RfmSegment::Loyal,
            RfmSegment::Potential,
            RfmSegment::New,
            RfmSegment::AtRisk,
            RfmSegment::CannotLost,
            RfmSegment::Hibernating,
            RfmSegment::Lost,
        ]
    }
}

/// 单个客户的 RFM 记录
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RfmRecord {
    pub customer_id: Uuid,
    pub customer_name: String,
    /// 最近一次购买距今天数
    pub recency_days: i32,
    /// 指定周期内购买次数
    pub frequency: i32,
    /// 指定周期内消费总金额
    pub monetary: f64,
    /// R 得分（1-5，5 为最佳）
    pub r_score: u32,
    /// F 得分（1-5）
    pub f_score: u32,
    /// M 得分（1-5）
    pub m_score: u32,
    /// 综合得分 = r_score * r_weight + f_score * f_weight + m_score * m_weight
    pub rfm_score: f64,
    /// 客户分群
    pub segment: RfmSegment,
}

/// 分群统计
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SegmentStats {
    pub segment: RfmSegment,
    pub label: String,
    pub customer_count: i64,
    pub avg_monetary: f64,
    pub avg_frequency: f64,
    pub avg_recency_days: f64,
    pub avg_rfm_score: f64,
}

/// 从数据库查询的原始 RFM 数值
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct RawRfm {
    customer_id: Uuid,
    customer_name: String,
    recency_days: f64,
    frequency: f64,
    monetary: f64,
}

// ---------------------------------------------------------------------------
// RFM 核心算法（纯函数，可独立测试）
// ---------------------------------------------------------------------------

/// 对一组数值按五分位（quintile）打分 1-5。
/// - `higher_is_better = true`：值越大得分越高（F、M）
/// - `higher_is_better = false`：值越小得分越高（R，recency 越小越好）
pub fn assign_quintile_scores(values: &[f64], higher_is_better: bool) -> Vec<u32> {
    let n = values.len();
    if n == 0 {
        return vec![];
    }

    // 构建排序后的索引
    let mut indexed: Vec<(usize, f64)> = values.iter().enumerate().map(|(i, &v)| (i, v)).collect();
    if higher_is_better {
        // 降序：值大的排前面（rank 0 = 最佳）
        indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    } else {
        // 升序：值小的排前面（rank 0 = 最佳）
        indexed.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
    }

    let mut scores = vec![1u32; n];
    for (rank, (original_idx, _)) in indexed.iter().enumerate() {
        // rank 0 = 最佳 → score 5；rank n-1 = 最差 → score 1
        let group = if n == 1 { 0 } else { (rank * 5) / n };
        let score = 5 - group.min(4) as u32;
        scores[*original_idx] = score;
    }
    scores
}

/// 根据 R/F/M 得分映射到客户分群
pub fn map_segment(r: u32, f: u32, m: u32) -> RfmSegment {
    // 重要价值客户：三高
    if r >= 4 && f >= 4 && m >= 4 {
        return RfmSegment::Champion;
    }
    // 不可流失客户：高价值但已沉寂（低 R 高 F 高 M）
    if r <= 2 && f >= 4 && m >= 4 {
        return RfmSegment::CannotLost;
    }
    // 流失风险客户：曾经活跃、近期下降
    if r <= 2 && (f >= 3 || m >= 3) {
        return RfmSegment::AtRisk;
    }
    // 流失客户：全维度最低
    if r <= 1 && f <= 1 && m <= 1 {
        return RfmSegment::Lost;
    }
    // 休眠客户：低 R 低 F
    if r <= 2 && f <= 2 {
        return RfmSegment::Hibernating;
    }
    // 忠诚客户：高频购买（低 R 已被上面拦截）
    if f >= 4 {
        return RfmSegment::Loyal;
    }
    // 新客户：近期购买但低频低额
    if r >= 4 && f <= 2 && m <= 2 {
        return RfmSegment::New;
    }
    // 潜力客户：近期有购买但频次不高
    if r >= 4 && f <= 3 {
        return RfmSegment::Potential;
    }
    // 中间客户默认归为潜力
    RfmSegment::Potential
}

/// 纯函数：基于原始 R/F/M 数据和配置计算 RFM 记录
pub fn compute_rfm_records(raw: Vec<RawRfm>, config: &RfmConfig) -> Vec<RfmRecord> {
    if raw.is_empty() {
        return vec![];
    }

    let r_weight = config.r_weights.first().copied().unwrap_or(1.0);
    let f_weight = config.f_weights.first().copied().unwrap_or(1.0);
    let m_weight = config.m_weights.first().copied().unwrap_or(1.0);

    let recencies: Vec<f64> = raw.iter().map(|r| r.recency_days).collect();
    let frequencies: Vec<f64> = raw.iter().map(|r| r.frequency).collect();
    let monetaries: Vec<f64> = raw.iter().map(|r| r.monetary).collect();

    // R：recency 越小越好；F/M：越大越好
    let r_scores = assign_quintile_scores(&recencies, false);
    let f_scores = assign_quintile_scores(&frequencies, true);
    let m_scores = assign_quintile_scores(&monetaries, true);

    raw.iter()
        .enumerate()
        .map(|(i, r)| {
            let r_score = r_scores[i];
            let f_score = f_scores[i];
            let m_score = m_scores[i];
            let rfm_score =
                r_score as f64 * r_weight + f_score as f64 * f_weight + m_score as f64 * m_weight;
            let segment = map_segment(r_score, f_score, m_score);
            RfmRecord {
                customer_id: r.customer_id,
                customer_name: r.customer_name.clone(),
                recency_days: r.recency_days as i32,
                frequency: r.frequency as i32,
                monetary: r.monetary,
                r_score,
                f_score,
                m_score,
                rfm_score,
                segment,
            }
        })
        .collect()
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------

pub fn create_routes() -> Router<ApiState> {
    let strict_config = RateLimitConfig::new(30, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let strict_limiter = Arc::new(RateLimitMiddleware::new(strict_config));
    let strict_layer = axum::middleware::from_fn({
        let mw = strict_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    });

    Router::new()
        .route("/rfm/analyze", post(analyze_rfm))
        .route("/rfm/segments", get(get_segments))
        .route("/rfm/customer/{id}", get(get_customer_rfm))
        .layer(strict_layer)
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /rfm/analyze — 执行 RFM 分析
async fn analyze_rfm(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<RfmConfig>,
) -> Json<ApiResponse<Vec<RfmRecord>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let reference_date = req
        .reference_date
        .unwrap_or_else(|| chrono::Utc::now().date_naive());
    let period_days = req.period_days.max(1).min(3650);
    let period_start = reference_date - chrono::Duration::days(period_days as i64);

    // 从 sales_orders 聚合原始 R/F/M
    let raw_result = sqlx::query_as::<_, RawRfm>(
        r#"
        SELECT
            c.id   AS customer_id,
            c.name AS customer_name,
            COALESCE(($1::date - MAX(o.order_date))::int, 9999)::float8 AS recency_days,
            COUNT(o.id)::float8 AS frequency,
            COALESCE(SUM(o.total_amount), 0)::float8 AS monetary
        FROM crm.customers c
        LEFT JOIN crm.sales_orders o
            ON o.customer_id = c.id
           AND o.status = 'completed'
           AND o.order_date >= $3
        WHERE ($2::uuid IS NULL OR c.tenant_id = $2) AND c.deleted_at IS NULL
        GROUP BY c.id, c.name
        ORDER BY c.name
        "#,
    )
    .bind(reference_date)
    .bind(tenant_opt)
    .bind(period_start)
    .fetch_all(&mut **txn)
    .await;

    let raw = match raw_result {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("[rfm] 查询客户订单聚合失败: {}", e);
            return Json(api_error(500, "RFM 分析失败：无法查询订单数据"));
        }
    };

    let records = compute_rfm_records(raw, &req);

    // 缓存结果到 rfm_results 表（先删后插）
    let now = chrono::Utc::now();
    let _ = sqlx::query("DELETE FROM crm.rfm_results WHERE tenant_id = $1")
        .bind(tenant_id)
        .execute(&mut **txn)
        .await;

    for rec in &records {
        let _ = sqlx::query(
            r#"
            INSERT INTO crm.rfm_results
                (tenant_id, customer_id, recency_days, frequency, monetary,
                 r_score, f_score, m_score, rfm_score, segment, analyzed_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            "#,
        )
        .bind(tenant_id)
        .bind(rec.customer_id)
        .bind(rec.recency_days)
        .bind(rec.frequency)
        .bind(rec.monetary)
        .bind(rec.r_score as i32)
        .bind(rec.f_score as i32)
        .bind(rec.m_score as i32)
        .bind(rec.rfm_score)
        .bind(rec.segment.as_str())
        .bind(now)
        .bind(now)
        .bind(now)
        .execute(&mut **txn)
        .await;
    }

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return Json(api_error(500, "事务提交失败"));
        }
    }
    Json(ApiResponse::success(records, "RFM 分析完成"))
}

/// GET /rfm/segments — 获取所有分群及统计
async fn get_segments(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<SegmentStats>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    #[derive(sqlx::FromRow)]
    struct SegmentRow {
        segment: String,
        customer_count: i64,
        avg_monetary: f64,
        avg_frequency: f64,
        avg_recency_days: f64,
        avg_rfm_score: f64,
    }

    let rows_result = sqlx::query_as::<_, SegmentRow>(
        r#"
        SELECT
            segment,
            COUNT(*)::int8 AS customer_count,
            COALESCE(AVG(monetary), 0)::float8 AS avg_monetary,
            COALESCE(AVG(frequency), 0)::float8 AS avg_frequency,
            COALESCE(AVG(recency_days), 0)::float8 AS avg_recency_days,
            COALESCE(AVG(rfm_score), 0)::float8 AS avg_rfm_score
        FROM crm.rfm_results
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
        GROUP BY segment
        "#,
    )
    .bind(tenant_opt)
    .fetch_all(&mut **txn)
    .await;

    let mut stats: Vec<SegmentStats> = Vec::new();
    let found: std::collections::HashMap<String, SegmentRow> = match rows_result {
        Ok(rows) => rows.into_iter().map(|r| (r.segment.clone(), r)).collect(),
        Err(e) => {
            tracing::error!("[rfm] 查询分群统计失败: {}", e);
            return Json(api_error(500, "获取分群统计失败"));
        }
    };

    // 确保所有 8 种分群都返回（即使没有客户）
    for seg in RfmSegment::all() {
        if let Some(row) = found.get(seg.as_str()) {
            stats.push(SegmentStats {
                segment: seg.clone(),
                label: seg.label().to_string(),
                customer_count: row.customer_count,
                avg_monetary: row.avg_monetary,
                avg_frequency: row.avg_frequency,
                avg_recency_days: row.avg_recency_days,
                avg_rfm_score: row.avg_rfm_score,
            });
        } else {
            stats.push(SegmentStats {
                segment: seg.clone(),
                label: seg.label().to_string(),
                customer_count: 0,
                avg_monetary: 0.0,
                avg_frequency: 0.0,
                avg_recency_days: 0.0,
                avg_rfm_score: 0.0,
            });
        }
    }

    Json(ApiResponse::success(stats, "获取分群统计成功"))
}

/// GET /rfm/customer/{id} — 获取单个客户的 RFM 记录
async fn get_customer_rfm(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<RfmRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    #[derive(sqlx::FromRow)]
    struct RfmResultRow {
        customer_id: Uuid,
        recency_days: i32,
        frequency: i32,
        monetary: f64,
        r_score: i32,
        f_score: i32,
        m_score: i32,
        rfm_score: f64,
        segment: String,
    }

    let row_result = sqlx::query_as::<_, RfmResultRow>(
        r#"
        SELECT customer_id, recency_days, frequency, monetary,
               r_score, f_score, m_score, rfm_score, segment
        FROM crm.rfm_results
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND customer_id = $2
        "#,
    )
    .bind(tenant_opt)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    // 获取客户名称
    let locale = Locale::from_headers(&headers).as_sql();
    let name_result = sqlx::query_scalar::<_, String>(
        "SELECT CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END FROM crm.customers WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)",
    )
    .bind(id)
    .bind(tenant_opt)
    .bind(locale)
    .fetch_optional(&mut **txn)
    .await;

    let customer_name = name_result.unwrap_or(None).unwrap_or_default();

    match row_result {
        Ok(Some(row)) => {
            let record = RfmRecord {
                customer_id: row.customer_id,
                customer_name,
                recency_days: row.recency_days,
                frequency: row.frequency,
                monetary: row.monetary,
                r_score: row.r_score as u32,
                f_score: row.f_score as u32,
                m_score: row.m_score as u32,
                rfm_score: row.rfm_score,
                segment: RfmSegment::from_str(&row.segment),
            };
            Json(ApiResponse::success(record, "获取客户 RFM 记录成功"))
        }
        Ok(None) => Json(api_error(404, "未找到该客户的 RFM 记录，请先执行 RFM 分析")),
        Err(e) => {
            tracing::error!("[rfm] 查询客户 RFM 记录失败: {}", e);
            Json(api_error(500, "获取客户 RFM 记录失败"))
        }
    }
}

// ---------------------------------------------------------------------------
// 单元测试
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn make_raw(customer_id: Uuid, name: &str, recency: f64, freq: f64, monetary: f64) -> RawRfm {
        RawRfm {
            customer_id,
            customer_name: name.to_string(),
            recency_days: recency,
            frequency: freq,
            monetary,
        }
    }

    fn default_config() -> RfmConfig {
        RfmConfig {
            reference_date: None,
            period_days: 365,
            r_weights: vec![1.0],
            f_weights: vec![1.0],
            m_weights: vec![1.0],
        }
    }

    // ---- 测试 1：五分位打分逻辑 ----

    #[test]
    fn test_quintile_scoring_higher_is_better() {
        // 5 个值，从高到低应该得到 5,4,3,2,1
        let values = vec![100.0, 80.0, 60.0, 40.0, 20.0];
        let scores = assign_quintile_scores(&values, true);
        assert_eq!(scores, vec![5, 4, 3, 2, 1]);
    }

    #[test]
    fn test_quintile_scoring_lower_is_better() {
        // recency 越小越好：最小值得 5 分
        let values = vec![10.0, 20.0, 30.0, 40.0, 50.0];
        let scores = assign_quintile_scores(&values, false);
        assert_eq!(scores, vec![5, 4, 3, 2, 1]);
    }

    #[test]
    fn test_quintile_scoring_single_element() {
        let scores = assign_quintile_scores(&[42.0], true);
        assert_eq!(scores, vec![5]);
    }

    #[test]
    fn test_quintile_scoring_empty() {
        let scores = assign_quintile_scores(&[], true);
        assert!(scores.is_empty());
    }

    #[test]
    fn test_quintile_scoring_ten_elements() {
        // 10 个值，每两个分一组
        let values: Vec<f64> = (1..=10).map(|x| x as f64).collect(); // 升序
        let scores = assign_quintile_scores(&values, true); // 越大越好
                                                            // rank 0,1 → 5; rank 2,3 → 4; rank 4,5 → 3; rank 6,7 → 2; rank 8,9 → 1
        assert_eq!(scores, vec![1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    }

    // ---- 测试 2：分群映射 ----

    #[test]
    fn test_segment_champion() {
        assert_eq!(map_segment(5, 5, 5), RfmSegment::Champion);
        assert_eq!(map_segment(4, 4, 4), RfmSegment::Champion);
    }

    #[test]
    fn test_segment_cannot_lost() {
        // 高 F 高 M 但低 R → 不可流失
        assert_eq!(map_segment(1, 5, 5), RfmSegment::CannotLost);
        assert_eq!(map_segment(2, 4, 4), RfmSegment::CannotLost);
    }

    #[test]
    fn test_segment_at_risk() {
        // 曾经活跃（F>=3）但近期下降（R<=2）
        assert_eq!(map_segment(1, 3, 2), RfmSegment::AtRisk);
        assert_eq!(map_segment(2, 2, 3), RfmSegment::AtRisk);
    }

    #[test]
    fn test_segment_lost() {
        assert_eq!(map_segment(1, 1, 1), RfmSegment::Lost);
    }

    #[test]
    fn test_segment_hibernating() {
        // 低 R 低 F 但 M 不算最低
        assert_eq!(map_segment(2, 2, 2), RfmSegment::Hibernating);
    }

    #[test]
    fn test_segment_loyal() {
        // 高频购买但不是 Champion（M 不够高）
        assert_eq!(map_segment(3, 5, 3), RfmSegment::Loyal);
    }

    #[test]
    fn test_segment_new() {
        // 近期购买但低频低额
        assert_eq!(map_segment(5, 1, 1), RfmSegment::New);
        assert_eq!(map_segment(4, 2, 2), RfmSegment::New);
    }

    #[test]
    fn test_segment_potential() {
        // 近期购买但频次不高
        assert_eq!(map_segment(5, 2, 3), RfmSegment::Potential);
        assert_eq!(map_segment(4, 3, 3), RfmSegment::Potential);
    }

    #[test]
    fn test_segment_all_variants_reachable() {
        // 确保每个分群都能被映射到
        let mut found = std::collections::HashSet::new();
        for r in 1..=5u32 {
            for f in 1..=5u32 {
                for m in 1..=5u32 {
                    found.insert(map_segment(r, f, m));
                }
            }
        }
        for seg in RfmSegment::all() {
            assert!(
                found.contains(seg),
                "分群 {:?} 未被任何 R/F/M 组合映射到",
                seg
            );
        }
    }

    // ---- 测试 3：空数据 ----

    #[test]
    fn test_compute_rfm_empty_input() {
        let records = compute_rfm_records(vec![], &default_config());
        assert!(records.is_empty());
    }

    #[test]
    fn test_compute_rfm_single_customer() {
        let id = Uuid::new_v4();
        let raw = vec![make_raw(id, "客户A", 5.0, 10.0, 5000.0)];
        let records = compute_rfm_records(raw, &default_config());
        assert_eq!(records.len(), 1);
        // 单客户 → 所有维度得分 5（rank 0 = best）
        let rec = &records[0];
        assert_eq!(rec.r_score, 5);
        assert_eq!(rec.f_score, 5);
        assert_eq!(rec.m_score, 5);
        assert_eq!(rec.segment, RfmSegment::Champion);
        // rfm_score = 5*1 + 5*1 + 5*1 = 15
        assert!((rec.rfm_score - 15.0).abs() < 0.001);
    }

    #[test]
    fn test_compute_rfm_weighted_score() {
        let config = RfmConfig {
            reference_date: None,
            period_days: 365,
            r_weights: vec![2.0], // R 权重 2
            f_weights: vec![1.0],
            m_weights: vec![1.0],
        };
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        let raw = vec![
            make_raw(id1, "最佳客户", 1.0, 10.0, 5000.0),
            make_raw(id2, "普通客户", 100.0, 1.0, 100.0),
        ];
        let records = compute_rfm_records(raw, &config);
        let best = &records[0];
        // best: r=5, f=5, m=5 → 5*2 + 5*1 + 5*1 = 20
        assert!((best.rfm_score - 20.0).abs() < 0.001);
    }

    #[test]
    fn test_compute_rfm_multiple_customers() {
        let ids: Vec<Uuid> = (0..5).map(|_| Uuid::new_v4()).collect();
        let raw = vec![
            make_raw(ids[0], "客户1", 1.0, 10.0, 5000.0), // best
            make_raw(ids[1], "客户2", 10.0, 8.0, 4000.0),
            make_raw(ids[2], "客户3", 30.0, 5.0, 3000.0),
            make_raw(ids[3], "客户4", 60.0, 2.0, 1000.0),
            make_raw(ids[4], "客户5", 90.0, 1.0, 100.0), // worst
        ];
        let records = compute_rfm_records(raw, &default_config());
        assert_eq!(records.len(), 5);
        // 最佳客户应该是 Champion
        let best = records.iter().find(|r| r.customer_id == ids[0]).unwrap();
        assert_eq!(best.r_score, 5);
        assert_eq!(best.f_score, 5);
        assert_eq!(best.m_score, 5);
        assert_eq!(best.segment, RfmSegment::Champion);
        // 最差客户应该是 Lost
        let worst = records.iter().find(|r| r.customer_id == ids[4]).unwrap();
        assert_eq!(worst.r_score, 1);
        assert_eq!(worst.f_score, 1);
        assert_eq!(worst.m_score, 1);
        assert_eq!(worst.segment, RfmSegment::Lost);
    }

    #[test]
    fn test_segment_str_roundtrip() {
        for seg in RfmSegment::all() {
            let s = seg.as_str();
            let back = RfmSegment::from_str(s);
            assert_eq!(*seg, back, "分群 {:?} 的字符串往返转换失败", seg);
        }
    }

    #[test]
    fn test_segment_from_str_unknown() {
        assert_eq!(RfmSegment::from_str("unknown"), RfmSegment::Hibernating);
    }

    #[test]
    fn test_segment_label_not_empty() {
        for seg in RfmSegment::all() {
            assert!(!seg.label().is_empty());
        }
    }

    #[test]
    fn test_rfm_config_defaults() {
        let config = RfmConfig {
            reference_date: None,
            period_days: default_period_days(),
            r_weights: default_weights(),
            f_weights: default_weights(),
            m_weights: default_weights(),
        };
        assert_eq!(config.period_days, 365);
        assert_eq!(config.r_weights, vec![1.0]);
    }

    #[test]
    fn test_rfm_config_deserialize() {
        let json = r#"{"period_days": 90}"#;
        let config: RfmConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.period_days, 90);
        assert!(config.reference_date.is_none());
        assert_eq!(config.r_weights, vec![1.0]);
        assert_eq!(config.f_weights, vec![1.0]);
        assert_eq!(config.m_weights, vec![1.0]);
    }

    #[test]
    fn test_rfm_config_deserialize_full() {
        let json = r#"{"reference_date": "2026-01-01", "period_days": 180, "r_weights": [2.0], "f_weights": [1.5], "m_weights": [1.0]}"#;
        let config: RfmConfig = serde_json::from_str(json).unwrap();
        assert_eq!(
            config.reference_date,
            Some(NaiveDate::from_ymd_opt(2026, 1, 1).unwrap())
        );
        assert_eq!(config.period_days, 180);
        assert_eq!(config.r_weights, vec![2.0]);
        assert_eq!(config.f_weights, vec![1.5]);
    }
}
