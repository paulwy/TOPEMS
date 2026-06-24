//! Permission checking middleware

use axum::{
    extract::State,
    middleware::Next,
    response::Response,
};
use topems_shared::ApiResponse;

pub async fn check_permission(
    State(state): State<crate::AppState>,
    req: axum::http::Request<axum::body::Body>,
    next: Next,
) -> Result<Response, axum::Json<ApiResponse<()>>> {
    let permissions_header = req.headers().get("X-User-Permissions");
    let user_permissions: Vec<String> = match permissions_header {
        Some(h) => match h.to_str() {
            Ok(s) => s.split(',').map(|p| p.trim().to_string()).collect(),
            Err(_) => Vec::new(),
        },
        None => Vec::new(),
    };

    let path = req.uri().path().to_string();
    let method = req.method().as_str();

    let required_permission = match (path.as_str(), method) {
        (p, m) if p.starts_with("/api/qms/checks") => match m {
            "GET" => Some("qa:quality:inspection:read"),
            "POST" | "PUT" | "DELETE" => Some("qa:quality:inspection:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/issues") => match m {
            "GET" => Some("qa:quality:issue:read"),
            "POST" | "PUT" | "DELETE" => Some("qa:quality:issue:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/standards") => match m {
            "GET" => Some("qa:quality:standard:read"),
            "POST" | "PUT" | "DELETE" => Some("qa:quality:standard:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/actions") => match m {
            "GET" => Some("qa:quality:action:read"),
            "POST" | "PUT" | "DELETE" => Some("qa:quality:action:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/audit-plans") => match m {
            "GET" => Some("qa:audit:plan:read"),
            "POST" | "PUT" | "DELETE" => Some("qa:audit:plan:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/audit-tasks") => match m {
            "GET" => Some("qa:audit:task:read"),
            "POST" | "PUT" | "DELETE" => Some("qa:audit:task:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/audit-findings") => match m {
            "GET" => Some("qa:audit:finding:read"),
            "POST" | "PUT" | "DELETE" => Some("qa:audit:finding:write"),
            _ => None,
        },
        _ => None,
    };

    if let Some(permission) = required_permission {
        if !user_permissions.contains(&permission.to_string()) {
            return Err(axum::Json(ApiResponse::error(403, "权限不足")));
        }
    }

    Ok(next.run(req).await)
}
