use axum::http::HeaderMap;
use topems_shared_auth::auth::verify_jwt_token;

pub fn extract_user_id_from_token(headers: &HeaderMap, secret: &str) -> Result<String, ()> {
    let auth_header = headers.get("Authorization").and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => return Err(()),
    };

    match verify_jwt_token(token, secret) {
        Ok(claims) => Ok(claims.sub),
        Err(_) => Err(()),
    }
}

pub fn extract_bearer_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| {
            if v.starts_with("Bearer ") {
                Some(v["Bearer ".len()..].to_string())
            } else {
                None
            }
        })
}
