//! Risk handlers

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/hazards", get(list_risks).post(create_risk))
        .route(
            "/hazards/{id}",
            get(get_risk).put(update_risk).delete(delete_risk),
        )
        .route("/hazards/{id}/assessments", post(assess_risk))
        .route(
            "/hazards/{id}/controls",
            get(list_control_measures).post(create_control_measure),
        )
        .route(
            "/hazards/{id}/controls/{measure_id}",
            put(update_control_measure).delete(delete_control_measure),
        )
}

#[derive(Debug, Deserialize)]
pub struct RiskQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub risk_level: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Risk {
    pub id: String,
    pub risk_no: String,
    pub title: String,
    pub description: Option<String>,
    pub risk_type: Option<String>,
    pub hazard_factor: Option<String>,
    pub likelihood: Option<i32>,
    pub severity: Option<i32>,
    pub risk_level: Option<String>,
    pub control_measures: Option<String>,
    pub status: String,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RiskControlMeasure {
    pub id: String,
    pub risk_id: String,
    pub title: String,
    pub description: Option<String>,
    pub measure_type: Option<String>,
    pub status: String,
    pub created_at: String,

    pub tenant_id: Uuid,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:risk:read"])),
    path = "/api/ehs/hazards",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_risks(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<Risk>>> {
    tracing::debug!("Listing risks");
    Json(ApiResponse::success(Vec::<Risk>::new(), "获取风险列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:risk:write"])),
    path = "/api/ehs/hazards",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_risk(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Risk>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Creating risk: {:?}", req);
    Json(ApiResponse::success(
        Risk {
            id: uuid::Uuid::new_v4().to_string(),
            risk_no: format!(
                "RSK-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: "风险".to_string(),
            description: None,
            risk_type: None,
            hazard_factor: None,
            likelihood: Some(3),
            severity: Some(3),
            risk_level: Some("medium".to_string()),
            control_measures: None,
            status: "identified".to_string(),

            tenant_id,
        },
        "风险创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:risk:read"])),
    path = "/api/ehs/hazards/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_risk(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Risk>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Getting risk: {}", id);
    Json(ApiResponse::success(
        Risk {
            id,
            risk_no: "RSK-001".to_string(),
            title: "火灾风险".to_string(),
            description: Some("生产车间存在火灾隐患".to_string()),
            risk_type: Some("火灾".to_string()),
            hazard_factor: Some("易燃物品".to_string()),
            likelihood: Some(3),
            severity: Some(4),
            risk_level: Some("high".to_string()),
            control_measures: Some("配备消防器材".to_string()),
            status: "assessed".to_string(),

            tenant_id,
        },
        "获取风险成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:risk:write"])),
    path = "/api/ehs/hazards/{id}",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_risk(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Risk>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Updating risk {}: {:?}", id, req);
    Json(ApiResponse::success(
        Risk {
            id,
            risk_no: "RSK-001".to_string(),
            title: "火灾风险".to_string(),
            description: Some("生产车间存在火灾隐患".to_string()),
            risk_type: Some("火灾".to_string()),
            hazard_factor: Some("易燃物品".to_string()),
            likelihood: Some(3),
            severity: Some(4),
            risk_level: Some("high".to_string()),
            control_measures: Some("配备消防器材".to_string()),
            status: "assessed".to_string(),

            tenant_id,
        },
        "风险更新成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:risk:write"])),
    path = "/api/ehs/hazards/{id}/assessments",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn assess_risk(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Risk>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Assessing risk {}: {:?}", id, req);
    Json(ApiResponse::success(
        Risk {
            id,
            risk_no: "RSK-001".to_string(),
            title: "火灾风险".to_string(),
            description: Some("生产车间存在火灾隐患".to_string()),
            risk_type: Some("火灾".to_string()),
            hazard_factor: Some("易燃物品".to_string()),
            likelihood: Some(3),
            severity: Some(4),
            risk_level: Some("high".to_string()),
            control_measures: Some("配备消防器材".to_string()),
            status: "controlled".to_string(),

            tenant_id,
        },
        "风险评估成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:risk:write"])),
    path = "/api/ehs/hazards/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_risk(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting risk: {}", id);
    Json(ApiResponse::success((), "风险删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazards/{id}/controls",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn list_control_measures(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<RiskControlMeasure>>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Listing control measures for risk: {}", id);
    Json(ApiResponse::success(
        vec![
            RiskControlMeasure {
                id: uuid::Uuid::new_v4().to_string(),
                risk_id: id.clone(),
                title: "安装烟雾报警器".to_string(),
                description: Some("在生产车间安装烟雾报警器".to_string()),
                measure_type: Some("engineering".to_string()),
                status: "completed".to_string(),
                created_at: "2024-01-15T10:00:00Z".to_string(),

                tenant_id,
            },
            RiskControlMeasure {
                id: uuid::Uuid::new_v4().to_string(),
                risk_id: id,
                title: "消防安全培训".to_string(),
                description: Some("定期组织员工消防安全培训".to_string()),
                measure_type: Some("administrative".to_string()),
                status: "in_progress".to_string(),
                created_at: "2024-01-20T14:00:00Z".to_string(),

                tenant_id,
            },
        ],
        "获取控制措施列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/hazards/{id}/controls",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn create_control_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<RiskControlMeasure>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Creating control measure for risk {}: {:?}", id, req);
    Json(ApiResponse::success(
        RiskControlMeasure {
            id: uuid::Uuid::new_v4().to_string(),
            risk_id: id,
            title: req
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("新控制措施")
                .to_string(),
            description: req
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            measure_type: req
                .get("measure_type")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            status: "pending".to_string(),
            created_at: "2024-01-25T10:00:00Z".to_string(),

            tenant_id,
        },
        "控制措施创建成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/hazards/{id}/controls/{measure_id}",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id"),
        ("measure_id" = String, Path, description = "measure_id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_control_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path((id, measure_id)): axum::extract::Path<(String, String)>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<RiskControlMeasure>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!(
        "Updating control measure {} for risk {}: {:?}",
        measure_id,
        id,
        req
    );
    Json(ApiResponse::success(
        RiskControlMeasure {
            id: measure_id,
            risk_id: id,
            title: req
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("控制措施")
                .to_string(),
            description: req
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            measure_type: req
                .get("measure_type")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            status: req
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("pending")
                .to_string(),
            created_at: "2024-01-25T10:00:00Z".to_string(),

            tenant_id,
        },
        "控制措施更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/hazards/{id}/controls/{measure_id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id"),
        ("measure_id" = String, Path, description = "measure_id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_control_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path((_id, measure_id)): axum::extract::Path<(String, String)>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting control measure: {}", measure_id);
    Json(ApiResponse::success((), "控制措施删除成功"))
}

pub fn risk_matrix_score(likelihood: u8, severity: u8) -> u8 {
    let l = likelihood.min(5).max(1);
    let s = severity.min(5).max(1);
    l * s
}

pub fn matrix_classify(score: u8) -> &'static str {
    match score {
        1..=2 => "low",
        3..=6 => "medium",
        7..=12 => "high",
        13..=25 => "critical",
        _ => "low",
    }
}

pub fn lec_score(l: u8, e: u8, c: u8) -> u32 {
    let lv = l.min(10).max(1) as u32;
    let ev = e.min(10).max(1) as u32;
    let cv = c.min(100).max(1) as u32;
    lv * ev * cv
}

pub fn lec_classify(lec: u32) -> &'static str {
    match lec {
        0..=20 => "轻微风险",
        21..=70 => "一般风险",
        71..=160 => "显著风险",
        161..=320 => "高度风险",
        _ => "极其危险",
    }
}

pub fn residual_risk(inherent: u8, control_effectiveness: f64) -> u8 {
    let ce = control_effectiveness.clamp(0.0, 1.0);
    let reduced = inherent as f64 * (1.0 - ce);
    reduced.round() as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matrix_score_basic() {
        assert_eq!(risk_matrix_score(1, 1), 1);
        assert_eq!(risk_matrix_score(5, 5), 25);
        assert_eq!(risk_matrix_score(3, 3), 9);
    }

    #[test]
    fn test_matrix_score_clamping() {
        assert_eq!(risk_matrix_score(0, 3), 3);
        assert_eq!(risk_matrix_score(3, 0), 3);
        assert_eq!(risk_matrix_score(10, 3), 15);
        assert_eq!(risk_matrix_score(3, 10), 15);
    }

    #[test]
    fn test_matrix_classify_low() {
        assert_eq!(matrix_classify(1), "low");
        assert_eq!(matrix_classify(2), "low");
        assert_eq!(matrix_classify(0), "low");
    }

    #[test]
    fn test_matrix_classify_medium() {
        assert_eq!(matrix_classify(3), "medium");
        assert_eq!(matrix_classify(4), "medium");
        assert_eq!(matrix_classify(6), "medium");
    }

    #[test]
    fn test_matrix_classify_high() {
        assert_eq!(matrix_classify(7), "high");
        assert_eq!(matrix_classify(9), "high");
        assert_eq!(matrix_classify(12), "high");
    }

    #[test]
    fn test_matrix_classify_critical() {
        assert_eq!(matrix_classify(13), "critical");
        assert_eq!(matrix_classify(20), "critical");
        assert_eq!(matrix_classify(25), "critical");
        assert_eq!(matrix_classify(100), "low");
    }

    #[test]
    fn test_lec_score_basic() {
        assert_eq!(lec_score(1, 1, 1), 1);
        assert_eq!(lec_score(6, 6, 15), 540);
        assert_eq!(lec_score(3, 4, 10), 120);
    }

    #[test]
    fn test_lec_score_clamping() {
        assert_eq!(lec_score(0, 5, 5), 25);
        assert_eq!(lec_score(20, 5, 5), 250);
        assert_eq!(lec_score(5, 0, 5), 25);
        assert_eq!(lec_score(5, 20, 5), 250);
        assert_eq!(lec_score(5, 5, 0), 25);
        assert_eq!(lec_score(5, 5, 200), 2500);
    }

    #[test]
    fn test_lec_classify_all_levels() {
        assert_eq!(lec_classify(10), "轻微风险");
        assert_eq!(lec_classify(20), "轻微风险");
        assert_eq!(lec_classify(21), "一般风险");
        assert_eq!(lec_classify(70), "一般风险");
        assert_eq!(lec_classify(71), "显著风险");
        assert_eq!(lec_classify(160), "显著风险");
        assert_eq!(lec_classify(161), "高度风险");
        assert_eq!(lec_classify(320), "高度风险");
        assert_eq!(lec_classify(321), "极其危险");
        assert_eq!(lec_classify(1000), "极其危险");
    }

    #[test]
    fn test_residual_risk_no_control() {
        assert_eq!(residual_risk(10, 0.0), 10);
    }

    #[test]
    fn test_residual_risk_full_control() {
        assert_eq!(residual_risk(10, 1.0), 0);
    }

    #[test]
    fn test_residual_risk_half_control() {
        assert_eq!(residual_risk(10, 0.5), 5);
    }

    #[test]
    fn test_residual_risk_70pct() {
        assert_eq!(residual_risk(10, 0.7), 3);
    }

    #[test]
    fn test_residual_risk_clamping() {
        assert_eq!(residual_risk(10, -0.5), 10);
        assert_eq!(residual_risk(10, 2.0), 0);
    }

    #[test]
    fn test_risk_struct_serde_roundtrip() {
        use serde_json;
        let tenant_id = Uuid::new_v4();
        let risk = Risk {
            id: "risk-001".to_string(),
            risk_no: "RSK-2024-001".to_string(),
            title: "Test Risk".to_string(),
            description: Some("Test description".to_string()),
            risk_type: Some("safety".to_string()),
            hazard_factor: Some("坠落".to_string()),
            likelihood: Some(3),
            severity: Some(4),
            risk_level: Some("high".to_string()),
            control_measures: Some("防护栏".to_string()),
            status: "identified".to_string(),
            tenant_id,
        };
        let json = serde_json::to_string(&risk).unwrap();
        let deserialized: Risk = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, risk.id);
        assert_eq!(deserialized.risk_no, risk.risk_no);
        assert_eq!(deserialized.title, risk.title);
        assert_eq!(deserialized.tenant_id, risk.tenant_id);
    }

    #[test]
    fn test_risk_struct_clone() {
        let tenant_id = Uuid::new_v4();
        let risk = Risk {
            id: "1".to_string(),
            risk_no: "RSK-001".to_string(),
            title: "Risk".to_string(),
            description: None,
            risk_type: None,
            hazard_factor: None,
            likelihood: None,
            severity: None,
            risk_level: None,
            control_measures: None,
            status: "open".to_string(),
            tenant_id,
        };
        let cloned = risk.clone();
        assert_eq!(cloned.id, risk.id);
        assert_eq!(cloned.tenant_id, risk.tenant_id);
    }

    #[test]
    fn test_risk_control_measure_serde() {
        use serde_json;
        let tenant_id = Uuid::new_v4();
        let measure = RiskControlMeasure {
            id: "m-001".to_string(),
            risk_id: "r-001".to_string(),
            title: "安装防护栏".to_string(),
            description: Some("在平台边缘安装1.2m高防护栏".to_string()),
            measure_type: Some("engineering".to_string()),
            status: "active".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            tenant_id,
        };
        let json = serde_json::to_string(&measure).unwrap();
        let de: RiskControlMeasure = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, measure.id);
        assert_eq!(de.risk_id, measure.risk_id);
        assert_eq!(de.title, measure.title);
    }

    #[test]
    fn test_risk_query_defaults() {
        let q: RiskQuery = serde_json::from_str("{}").unwrap();
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.status.is_none());
        assert!(q.risk_level.is_none());
    }

    #[test]
    fn test_risk_query_with_values() {
        let q: RiskQuery = serde_json::from_str(
            r#"{"page":1,"page_size":20,"status":"open","risk_level":"high"}"#,
        )
        .unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(20));
        assert_eq!(q.status.as_deref(), Some("open"));
        assert_eq!(q.risk_level.as_deref(), Some("high"));
    }
}
