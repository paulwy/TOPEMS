//! API Signature Verification Middleware
//! 
//! Implements HMAC-SHA256 request signature verification.

use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

/// Signature algorithm
#[derive(Debug, Clone, Copy)]
pub enum SignatureAlgorithm {
    /// HMAC-SHA256
    HmacSha256,
    /// HMAC-SHA512
    HmacSha512,
}

/// API signature configuration
#[derive(Debug, Clone)]
pub struct SignatureConfig {
    /// Secret key for signing
    secret_key: String,
    /// Signature algorithm
    algorithm: SignatureAlgorithm,
    /// Timestamp tolerance in seconds (to prevent replay attacks)
    timestamp_tolerance_secs: u64,
    /// Whether to include body in signature
    include_body: bool,
    /// Whether to include headers in signature
    include_headers: bool,
    /// Headers to include in signature (when include_headers is true)
    sign_headers: Vec<String>,
}

impl SignatureConfig {
    pub fn new(secret_key: impl Into<String>) -> Self {
        Self {
            secret_key: secret_key.into(),
            algorithm: SignatureAlgorithm::HmacSha256,
            timestamp_tolerance_secs: 300, // 5 minutes
            include_body: true,
            include_headers: true,
            sign_headers: vec![
                "x-api-key".to_string(),
                "x-timestamp".to_string(),
                "content-type".to_string(),
            ],
        }
    }

    pub fn with_algorithm(mut self, algorithm: SignatureAlgorithm) -> Self {
        self.algorithm = algorithm;
        self
    }

    pub fn with_timestamp_tolerance(mut self, secs: u64) -> Self {
        self.timestamp_tolerance_secs = secs;
        self
    }

    pub fn with_body_inclusion(mut self, include: bool) -> Self {
        self.include_body = include;
        self
    }

    pub fn with_header_inclusion(mut self, include: bool) -> Self {
        self.include_headers = include;
        self
    }
}

/// Request signature data
#[derive(Debug)]
pub struct SignatureData<'a> {
    pub method: &'a str,
    pub path: &'a str,
    pub query_string: Option<&'a str>,
    pub headers: HashMap<&'a str, &'a str>,
    pub body: Option<&'a [u8]>,
    pub timestamp: u64,
    pub nonce: Option<&'a str>,
}

impl<'a> SignatureData<'a> {
    pub fn new(
        method: &'a str,
        path: &'a str,
        headers: HashMap<&'a str, &'a str>,
        body: Option<&'a [u8]>,
    ) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        Self {
            method,
            path,
            query_string: None,
            headers,
            body,
            timestamp,
            nonce: None,
        }
    }

    pub fn with_query_string(mut self, query: &'a str) -> Self {
        self.query_string = Some(query);
        self
    }

    pub fn with_timestamp(mut self, timestamp: u64) -> Self {
        self.timestamp = timestamp;
        self
    }

    pub fn with_nonce(mut self, nonce: &'a str) -> Self {
        self.nonce = Some(nonce);
        self
    }
}

/// Signature generator and verifier
#[derive(Clone)]
pub struct SignatureVerifier {
    config: SignatureConfig,
}

impl SignatureVerifier {
    pub fn new(config: SignatureConfig) -> Self {
        Self { config }
    }

    /// Generate signature for request
    pub fn sign(&self, data: &SignatureData<'_>) -> Result<String, SignatureError> {
        let string_to_sign = self.build_string_to_sign(data)?;
        let signature = self.compute_signature(&string_to_sign)?;
        Ok(signature)
    }

    /// Verify signature of request
    pub fn verify(&self, data: &SignatureData<'_>, signature: &str) -> Result<bool, SignatureError> {
        // Check timestamp freshness
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        if data.timestamp > now + self.config.timestamp_tolerance_secs {
            return Err(SignatureError::TimestampInFuture);
        }
        
        if now > data.timestamp + self.config.timestamp_tolerance_secs {
            return Err(SignatureError::TimestampExpired);
        }

        // Compute expected signature
        let expected = self.sign(data)?;
        
        // Constant-time comparison to prevent timing attacks
        Ok(constant_time_compare(&expected, signature))
    }

    fn build_string_to_sign(&self, data: &SignatureData<'_>) -> Result<String, SignatureError> {
        let mut parts = Vec::new();

        // HTTP method
        parts.push(data.method.to_uppercase());

        // Path
        parts.push(data.path.to_string());

        // Query string (if present)
        if let Some(query) = data.query_string {
            parts.push(query.to_string());
        }

        // Signed headers
        if self.config.include_headers {
            let mut header_parts = Vec::new();
            for header_name in &self.config.sign_headers {
                if let Some(value) = data.headers.get(&header_name.to_lowercase().as_str()) {
                    header_parts.push(format!("{}:{}", header_name.to_lowercase(), value));
                }
            }
            header_parts.sort();
            parts.push(header_parts.join("\n"));
        }

        // Timestamp
        parts.push(data.timestamp.to_string());

        // Nonce (if present)
        if let Some(nonce) = data.nonce {
            parts.push(nonce.to_string());
        }

        // Body hash (if enabled)
        if self.config.include_body {
            if let Some(body) = data.body {
                let body_hash = sha2::Sha256::digest(body);
                parts.push(format!("{:x}", body_hash));
            }
        }

        Ok(parts.join("\n"))
    }

    fn compute_signature(&self, string_to_sign: &str) -> Result<String, SignatureError> {
        let mut mac = match self.config.algorithm {
            SignatureAlgorithm::HmacSha256 => {
                HmacSha256::new_from_slice(self.config.secret_key.as_bytes())
                    .map_err(|_| SignatureError::InvalidKey)?
            }
            SignatureAlgorithm::HmacSha512 => {
                return Err(SignatureError::UnsupportedAlgorithm);
            }
        };

        mac.update(string_to_sign.as_bytes());
        let result = mac.finalize();
        
        Ok(format!("{:x}", result))
    }
}

/// Signature error types
#[derive(Debug, Clone)]
pub enum SignatureError {
    InvalidKey,
    UnsupportedAlgorithm,
    TimestampExpired,
    TimestampInFuture,
    InvalidSignature,
}

impl std::fmt::Display for SignatureError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidKey => write!(f, "Invalid secret key"),
            Self::UnsupportedAlgorithm => write!(f, "Unsupported signature algorithm"),
            Self::TimestampExpired => write!(f, "Request timestamp expired"),
            Self::TimestampInFuture => write!(f, "Request timestamp is in the future"),
            Self::InvalidSignature => write!(f, "Invalid signature"),
        }
    }
}

impl std::error::Error for SignatureError {}

/// Constant-time string comparison
fn constant_time_compare(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        result |= x ^ y;
    }
    result == 0
}

/// Extract signature from Authorization header
pub fn extract_signature(auth_header: &str) -> Option<String> {
    if auth_header.starts_with("Signature ") {
        Some(auth_header[10..].to_string())
    } else if auth_header.starts_with("Bearer ") {
        Some(auth_header[7..].to_string())
    } else {
        Some(auth_header.to_string())
    }
}

/// Extract timestamp from header
pub fn extract_timestamp(headers: &axum::http::HeaderMap) -> Option<u64> {
    headers
        .get("x-timestamp")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse().ok())
}

/// Extract nonce from header
pub fn extract_nonce(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("x-nonce")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// Middleware for verifying API signatures
pub async fn signature_middleware<B>(
    verifier: SignatureVerifier,
    request: axum::extract::Request<B>,
    next: axum::middleware::Next<B>,
) -> Result<axum::response::Response, axum::http::StatusCode> {
    let headers = request.headers();
    
    // Extract signature
    let auth_header = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(axum::http::StatusCode::UNAUTHORIZED)?;
    
    let signature = extract_signature(auth_header)
        .ok_or(axum::http::StatusCode::UNAUTHORIZED)?;

    // Extract components
    let method = request.method().as_str();
    let path = request.uri().path();
    let query_string = request.uri().query();
    
    let mut header_map = HashMap::new();
    for (name, value) in headers.iter() {
        if let Ok(name_str) = name.to_str() {
            if let Ok(value_str) = value.to_str() {
                header_map.insert(name_str, value_str);
            }
        }
    }

    let timestamp = extract_timestamp(headers)
        .unwrap_or_else(|| SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs());
    
    let nonce = extract_nonce(headers);

    // Build signature data
    let mut sig_data = SignatureData::new(method, path, header_map, None)
        .with_timestamp(timestamp);
    
    if let Some(query) = query_string {
        sig_data = sig_data.with_query_string(query);
    }
    
    if let Some(n) = nonce {
        sig_data = sig_data.with_nonce(&n);
    }

    // Verify signature
    match verifier.verify(&sig_data, &signature) {
        Ok(true) => Ok(next.run(request).await),
        Ok(false) => Err(axum::http::StatusCode::UNAUTHORIZED),
        Err(e) => {
            tracing::warn!("Signature verification failed: {}", e);
            Err(axum::http::StatusCode::UNAUTHORIZED)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signature_generation() {
        let config = SignatureConfig::new("secret_key_123")
            .with_timestamp_tolerance(300);
        
        let verifier = SignatureVerifier::new(config);

        let headers = HashMap::from([
            ("content-type", "application/json"),
            ("x-api-key", "test_api_key"),
        ]);

        let sig_data = SignatureData::new("POST", "/api/test", headers, Some(b"{}"))
            .with_timestamp(1700000000);

        let signature = verifier.sign(&sig_data).unwrap();
        assert!(!signature.is_empty());

        // Verify
        let is_valid = verifier.verify(&sig_data, &signature).unwrap();
        assert!(is_valid);
    }

    #[test]
    fn test_constant_time_compare() {
        assert!(constant_time_compare("abc", "abc"));
        assert!(!constant_time_compare("abc", "abd"));
        assert!(!constant_time_compare("abc", "ab"));
    }
}
