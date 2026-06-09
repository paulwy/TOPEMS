use axum::http::HeaderMap;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use topems_shared::Claims;

pub fn extract_user_id_from_token(headers: &HeaderMap, secret: &str) -> Result<String, ()> {
    let auth_header = headers.get("Authorization")
        .and_then(|h| h.to_str().ok());
    
    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => return Err(()),
    };

    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    ) {
        Ok(token_data) => Ok(token_data.claims.sub),
        Err(_) => Err(()),
    }
}