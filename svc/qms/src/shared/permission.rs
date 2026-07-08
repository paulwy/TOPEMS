use axum::{middleware::Next, response::Response};
use topems_shared::{ApiResponse, Claims};

fn has_qms_permission(claims: &Claims, required_action: &str) -> bool {
    let action_levels = [
        ("read", 1),
        ("write", 2),
        ("delete", 3),
        ("approve", 3),
        ("admin", 4),
    ];

    let required_level = action_levels
        .iter()
        .find(|(a, _)| *a == required_action)
        .map(|(_, l)| *l)
        .unwrap_or(0);

    if required_level == 0 {
        return true;
    }

    for (action, level) in &action_levels {
        if *level >= required_level && claims.has_permission(&format!("qms:{}", action)) {
            return true;
        }
    }

    claims.has_permission("all")
}

pub async fn check_permission(
    req: axum::http::Request<axum::body::Body>,
    next: Next,
) -> Result<Response, axum::Json<ApiResponse<()>>> {
    let claims = req.extensions().get::<Claims>();

    if let Some(claims) = claims {
        if claims.is_superuser {
            return Ok(next.run(req).await);
        }

        let path = req.uri().path().to_string();
        let method = req.method().as_str();

        let required_action = match (path.as_str(), method) {
            (p, m) if p.starts_with("/api/qms/checks") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/issues") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/standards") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/actions") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/audit-plans") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/audit-tasks") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/audit-findings") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/spc") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/quality-costs") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/eightd") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/fmea") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/fmea-items") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/quality-dashboard") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/alert-rules") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/alert-messages") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/apqp") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/sync") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/sync-records") => match m {
                "GET" => Some("read"),
                "POST" | "PUT" | "DELETE" => Some("write"),
                _ => None,
            },
            (p, m) if p.starts_with("/api/qms/dashboard") => match m {
                "GET" => Some("read"),
                _ => None,
            },
            _ => None,
        };

        if let Some(action) = required_action {
            if !has_qms_permission(claims, action) {
                return Err(axum::Json(ApiResponse::error(403, "权限不足")));
            }
        }

        return Ok(next.run(req).await);
    }

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
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/issues") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/standards") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/actions") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/audit-plans") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/audit-tasks") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/audit-findings") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/spc") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/quality-costs") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/eightd") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/fmea") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/fmea-items") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/quality-dashboard") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/alert-rules") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/alert-messages") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/apqp") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/sync") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/sync-records") => match m {
            "GET" => Some("qms:read"),
            "POST" | "PUT" | "DELETE" => Some("qms:write"),
            _ => None,
        },
        (p, m) if p.starts_with("/api/qms/dashboard") => match m {
            "GET" => Some("qms:read"),
            _ => None,
        },
        _ => None,
    };

    if let Some(permission) = required_permission {
        if !user_permissions
            .iter()
            .any(|p| p == "all" || p == "qms:admin" || p == permission)
        {
            return Err(axum::Json(ApiResponse::error(403, "权限不足")));
        }
    }

    Ok(next.run(req).await)
}
