use std::time::Duration;

pub const CACHE_TTL_SHORT: Duration = Duration::from_secs(60);
pub const CACHE_TTL_MEDIUM: Duration = Duration::from_secs(300);
pub const CACHE_TTL_LONG: Duration = Duration::from_secs(1800);
pub const CACHE_TTL_XLONG: Duration = Duration::from_secs(3600);
pub const HTTP_TIMEOUT_DEFAULT: Duration = Duration::from_secs(30);
pub const HTTP_TIMEOUT_LONG: Duration = Duration::from_secs(120);
pub const LIVENESS_PROBE_INTERVAL: Duration = Duration::from_secs(30);
pub const SYNC_INTERVAL_STANDARD: Duration = Duration::from_secs(30);
pub const AUDIT_INTERVAL_STANDARD: Duration = Duration::from_secs(3600);
pub const POLL_INTERVAL_SHORT: Duration = Duration::from_secs(2);
