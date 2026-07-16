use axum::{
    body::{to_bytes, Body},
    http::{header, HeaderValue, Request, Response},
    middleware::Next,
};
use brotli::CompressorWriter;
use flate2::{write::DeflateEncoder, write::GzEncoder, Compression};
use std::collections::HashSet;
use std::io::Write;
use std::sync::Arc;
use tracing::info;

#[derive(Debug, Clone)]
pub struct CompressionConfig {
    pub enabled: bool,
    pub min_content_length: usize,
    pub excluded_mime_types: HashSet<String>,
    pub supported_algorithms: HashSet<CompressionAlgorithm>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum CompressionAlgorithm {
    Gzip,
    Deflate,
    Brotli,
}

impl CompressionAlgorithm {
    pub fn to_header_value(&self) -> &'static str {
        match self {
            CompressionAlgorithm::Gzip => "gzip",
            CompressionAlgorithm::Deflate => "deflate",
            CompressionAlgorithm::Brotli => "br",
        }
    }
}

impl Default for CompressionConfig {
    fn default() -> Self {
        let mut excluded = HashSet::new();
        excluded.insert("image/png".to_string());
        excluded.insert("image/jpeg".to_string());
        excluded.insert("image/jpg".to_string());
        excluded.insert("image/gif".to_string());
        excluded.insert("image/webp".to_string());
        excluded.insert("image/svg+xml".to_string());
        excluded.insert("image/bmp".to_string());
        excluded.insert("video/mp4".to_string());
        excluded.insert("video/webm".to_string());
        excluded.insert("video/ogg".to_string());
        excluded.insert("audio/mpeg".to_string());
        excluded.insert("audio/wav".to_string());
        excluded.insert("audio/ogg".to_string());
        excluded.insert("application/octet-stream".to_string());
        excluded.insert("application/pdf".to_string());
        excluded.insert("application/zip".to_string());
        excluded.insert("application/gzip".to_string());
        excluded.insert("application/x-brotli".to_string());
        excluded.insert("application/x-7z-compressed".to_string());

        let mut supported = HashSet::new();
        supported.insert(CompressionAlgorithm::Gzip);
        supported.insert(CompressionAlgorithm::Deflate);
        supported.insert(CompressionAlgorithm::Brotli);

        Self {
            enabled: true,
            min_content_length: 1024,
            excluded_mime_types: excluded,
            supported_algorithms: supported,
        }
    }
}

impl CompressionConfig {
    pub fn lenient() -> Self {
        Self {
            min_content_length: 512,
            ..Self::default()
        }
    }

    pub fn strict() -> Self {
        Self {
            min_content_length: 4096,
            ..Self::default()
        }
    }

    pub fn with_min_content_length(mut self, length: usize) -> Self {
        self.min_content_length = length;
        self
    }

    pub fn with_excluded_mime_types(mut self, types: HashSet<String>) -> Self {
        self.excluded_mime_types = types;
        self
    }

    pub fn add_excluded_mime_type(mut self, mime_type: &str) -> Self {
        self.excluded_mime_types.insert(mime_type.to_string());
        self
    }

    pub fn with_supported_algorithms(mut self, algorithms: HashSet<CompressionAlgorithm>) -> Self {
        self.supported_algorithms = algorithms;
        self
    }
}

pub struct CompressionMiddleware {
    config: Arc<CompressionConfig>,
}

impl CompressionMiddleware {
    pub fn new(config: CompressionConfig) -> Self {
        Self {
            config: Arc::new(config),
        }
    }

    pub fn into_middleware(self) -> Arc<Self> {
        Arc::new(self)
    }

    pub async fn middleware(self: Arc<Self>, req: Request<Body>, next: Next) -> Response<Body> {
        if !self.config.enabled {
            return next.run(req).await;
        }

        let accept_encoding = req
            .headers()
            .get(header::ACCEPT_ENCODING)
            .and_then(|h| h.to_str().ok())
            .unwrap_or_default();

        let selected_algorithm = self.select_algorithm(accept_encoding);

        if selected_algorithm.is_none() {
            return next.run(req).await;
        }

        let algorithm = selected_algorithm.expect("algorithm should be selected");
        let response = next.run(req).await;

        if !self.should_compress(&response) {
            return response;
        }

        self.compress_response(response, algorithm).await
    }

    fn select_algorithm(&self, accept_encoding: &str) -> Option<CompressionAlgorithm> {
        let parts: Vec<&str> = accept_encoding.split(',').collect();

        for part in parts {
            let part = part.trim().to_lowercase();
            if part.starts_with("br")
                && self
                    .config
                    .supported_algorithms
                    .contains(&CompressionAlgorithm::Brotli)
            {
                return Some(CompressionAlgorithm::Brotli);
            }
            if part.starts_with("gzip")
                && self
                    .config
                    .supported_algorithms
                    .contains(&CompressionAlgorithm::Gzip)
            {
                return Some(CompressionAlgorithm::Gzip);
            }
            if part.starts_with("deflate")
                && self
                    .config
                    .supported_algorithms
                    .contains(&CompressionAlgorithm::Deflate)
            {
                return Some(CompressionAlgorithm::Deflate);
            }
        }

        None
    }

    fn should_compress(&self, response: &Response<Body>) -> bool {
        if response.status().is_redirection() || response.status().is_informational() {
            return false;
        }

        if response.headers().contains_key(header::CONTENT_ENCODING) {
            return false;
        }

        let content_type = response
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|h| h.to_str().ok())
            .unwrap_or_default();

        let mime_type = content_type
            .split(';')
            .next()
            .unwrap_or(content_type)
            .trim()
            .to_lowercase();
        if self.config.excluded_mime_types.contains(&mime_type) {
            return false;
        }

        match response.headers().get(header::CONTENT_LENGTH) {
            Some(len) => match len.to_str().ok().and_then(|s| s.parse::<usize>().ok()) {
                Some(length) => length >= self.config.min_content_length,
                None => true,
            },
            None => true,
        }
    }

    async fn compress_response(
        &self,
        mut response: Response<Body>,
        algorithm: CompressionAlgorithm,
    ) -> Response<Body> {
        let body = std::mem::take(response.body_mut());
        let bytes = to_bytes(body, 10 * 1024 * 1024).await.unwrap_or_default();

        if bytes.len() < self.config.min_content_length {
            *response.body_mut() = Body::from(bytes);
            return response;
        }

        let compressed_data = match algorithm {
            CompressionAlgorithm::Gzip => self.compress_gzip(&bytes),
            CompressionAlgorithm::Deflate => self.compress_deflate(&bytes),
            CompressionAlgorithm::Brotli => self.compress_brotli(&bytes),
        };

        match compressed_data {
            Ok(compressed) => {
                info!(
                    "Compressed response: {} bytes -> {} bytes ({}%)",
                    bytes.len(),
                    compressed.len(),
                    ((compressed.len() as f64 / bytes.len() as f64) * 100.0).round()
                );

                response.headers_mut().insert(
                    header::CONTENT_ENCODING,
                    HeaderValue::from_static(algorithm.to_header_value()),
                );
                if let Ok(content_length) = HeaderValue::from_str(&compressed.len().to_string()) {
                    response
                        .headers_mut()
                        .insert(header::CONTENT_LENGTH, content_length);
                }
                response.headers_mut().remove(header::ETAG);

                *response.body_mut() = Body::from(compressed);
                response
            }
            Err(e) => {
                tracing::error!("Compression failed: {}", e);
                *response.body_mut() = Body::from(bytes);
                response
            }
        }
    }

    fn compress_gzip(&self, data: &[u8]) -> Result<Vec<u8>, std::io::Error> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data)?;
        encoder.finish()
    }

    fn compress_deflate(&self, data: &[u8]) -> Result<Vec<u8>, std::io::Error> {
        let mut encoder = DeflateEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data)?;
        encoder.finish()
    }

    fn compress_brotli(&self, data: &[u8]) -> Result<Vec<u8>, std::io::Error> {
        let mut result = Vec::new();
        {
            let mut compressor = CompressorWriter::new(&mut result, data.len(), 11, 22);
            compressor.write_all(data)?;
            compressor.flush()?;
        }
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_config_default() {
        let config = CompressionConfig::default();

        assert!(config.enabled);
        assert_eq!(config.min_content_length, 1024);
        assert!(config
            .supported_algorithms
            .contains(&CompressionAlgorithm::Gzip));
        assert!(config
            .supported_algorithms
            .contains(&CompressionAlgorithm::Deflate));
        assert!(config
            .supported_algorithms
            .contains(&CompressionAlgorithm::Brotli));
        assert!(config.excluded_mime_types.contains("image/png"));
        assert!(config.excluded_mime_types.contains("video/mp4"));
    }

    #[test]
    fn test_algorithm_selection() {
        let config = CompressionConfig::default();
        let middleware = CompressionMiddleware::new(config);

        let alg = middleware.select_algorithm("br, gzip, deflate");
        assert_eq!(alg, Some(CompressionAlgorithm::Brotli));

        let alg = middleware.select_algorithm("gzip, deflate");
        assert_eq!(alg, Some(CompressionAlgorithm::Gzip));

        let alg = middleware.select_algorithm("deflate");
        assert_eq!(alg, Some(CompressionAlgorithm::Deflate));

        let alg = middleware.select_algorithm("none");
        assert_eq!(alg, None);
    }

    #[test]
    fn test_compression_algorithms() {
        let config = CompressionConfig::default();
        let middleware = CompressionMiddleware::new(config);

        let test_data = b"Hello, world! This is a test string for compression.";
        let gzip_result = middleware
            .compress_gzip(test_data)
            .expect("gzip compression failed");
        let deflate_result = middleware
            .compress_deflate(test_data)
            .expect("deflate compression failed");
        let brotli_result = middleware
            .compress_brotli(test_data)
            .expect("brotli compression failed");

        assert!(!gzip_result.is_empty());
        assert!(!deflate_result.is_empty());
        assert!(!brotli_result.is_empty());
    }

    #[test]
    fn test_should_compress_excluded_mime_type() {
        let config = CompressionConfig::default();
        let middleware = CompressionMiddleware::new(config);

        let response = Response::builder()
            .header(header::CONTENT_TYPE, "image/png")
            .header(header::CONTENT_LENGTH, "10000")
            .body(Body::empty())
            .expect("failed to build response");

        assert!(!middleware.should_compress(&response));
    }

    #[test]
    fn test_should_compress_json() {
        let config = CompressionConfig::default();
        let middleware = CompressionMiddleware::new(config);

        let response = Response::builder()
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::CONTENT_LENGTH, "2000")
            .body(Body::empty())
            .expect("failed to build response");

        assert!(middleware.should_compress(&response));
    }
}
