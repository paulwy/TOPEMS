#![allow(dead_code)]
use std::sync::Mutex;

use super::types::*;

// ==================== VersionNegotiator ====================

struct VersionNegotiator {
    supported_versions: Vec<SupportedVersion>,
    default_version: String,
    negotiation_strategy: VersionNegotiationStrategy,
    negotiation_log: Vec<NegotiationLogEntry>,
}

#[derive(Clone)]
pub(crate) struct NegotiationLogEntry {
    id: String,
    requested_version: String,
    matched_version: Option<String>,
    fallback_used: bool,
    strategy_used: String,
    negotiated_at: chrono::DateTime<chrono::Utc>,
}

impl VersionNegotiator {
    fn new() -> Self {
        Self {
            supported_versions: Vec::new(),
            default_version: "v1.0.0".to_string(),
            negotiation_strategy: VersionNegotiationStrategy::LatestCompatible,
            negotiation_log: Vec::new(),
        }
    }

    fn negotiate(
        &mut self,
        requested_version: &str,
        strategy: Option<VersionNegotiationStrategy>,
    ) -> NegotiatedVersion {
        let strategy = strategy.unwrap_or(self.negotiation_strategy);
        let supported: Vec<String> = self
            .supported_versions
            .iter()
            .map(|v| v.version.clone())
            .collect();

        let result = match strategy {
            VersionNegotiationStrategy::ExactMatch => {
                if self.is_version_supported(requested_version) {
                    NegotiatedVersion {
                        requested_version: requested_version.to_string(),
                        matched_version: Some(requested_version.to_string()),
                        fallback_used: false,
                        supported_versions: supported.clone(),
                        strategy_used: "exact_match".to_string(),
                    }
                } else {
                    NegotiatedVersion {
                        requested_version: requested_version.to_string(),
                        matched_version: None,
                        fallback_used: false,
                        supported_versions: supported,
                        strategy_used: "exact_match".to_string(),
                    }
                }
            }
            VersionNegotiationStrategy::LatestCompatible => {
                if self.is_version_supported(requested_version) {
                    let status = self.get_version_status(requested_version);
                    match status {
                        VersionStatus::Unsupported => {
                            let fallback = self.get_latest_active_version();
                            NegotiatedVersion {
                                requested_version: requested_version.to_string(),
                                matched_version: Some(fallback.clone()),
                                fallback_used: true,
                                supported_versions: supported,
                                strategy_used: "latest_compatible".to_string(),
                            }
                        }
                        _ => NegotiatedVersion {
                            requested_version: requested_version.to_string(),
                            matched_version: Some(requested_version.to_string()),
                            fallback_used: false,
                            supported_versions: supported,
                            strategy_used: "latest_compatible".to_string(),
                        },
                    }
                } else {
                    let fallback = self.get_latest_active_version();
                    NegotiatedVersion {
                        requested_version: requested_version.to_string(),
                        matched_version: Some(fallback.clone()),
                        fallback_used: true,
                        supported_versions: supported,
                        strategy_used: "latest_compatible".to_string(),
                    }
                }
            }
            VersionNegotiationStrategy::DeprecatedWithFallback => {
                if self.is_version_supported(requested_version) {
                    let status = self.get_version_status(requested_version);
                    match status {
                        VersionStatus::Deprecated | VersionStatus::Sunset => {
                            let fallback = self.get_latest_active_version();
                            NegotiatedVersion {
                                requested_version: requested_version.to_string(),
                                matched_version: Some(fallback.clone()),
                                fallback_used: true,
                                supported_versions: supported,
                                strategy_used: "deprecated_with_fallback".to_string(),
                            }
                        }
                        _ => NegotiatedVersion {
                            requested_version: requested_version.to_string(),
                            matched_version: Some(requested_version.to_string()),
                            fallback_used: false,
                            supported_versions: supported,
                            strategy_used: "deprecated_with_fallback".to_string(),
                        },
                    }
                } else {
                    let fallback = self.get_latest_active_version();
                    NegotiatedVersion {
                        requested_version: requested_version.to_string(),
                        matched_version: Some(fallback.clone()),
                        fallback_used: true,
                        supported_versions: supported,
                        strategy_used: "deprecated_with_fallback".to_string(),
                    }
                }
            }
            VersionNegotiationStrategy::ForceVersion => {
                if self.is_version_supported(requested_version) {
                    NegotiatedVersion {
                        requested_version: requested_version.to_string(),
                        matched_version: Some(requested_version.to_string()),
                        fallback_used: false,
                        supported_versions: supported,
                        strategy_used: "force_version".to_string(),
                    }
                } else {
                    NegotiatedVersion {
                        requested_version: requested_version.to_string(),
                        matched_version: None,
                        fallback_used: false,
                        supported_versions: supported,
                        strategy_used: "force_version".to_string(),
                    }
                }
            }
        };

        let log_entry = NegotiationLogEntry {
            id: generate_id(),
            requested_version: result.requested_version.clone(),
            matched_version: result.matched_version.clone(),
            fallback_used: result.fallback_used,
            strategy_used: result.strategy_used.clone(),
            negotiated_at: now_utc(),
        };
        self.negotiation_log.push(log_entry);

        result
    }

    fn is_version_supported(&self, version: &str) -> bool {
        self.supported_versions.iter().any(|v| v.version == version)
    }

    fn get_latest_active_version(&self) -> String {
        self.supported_versions
            .iter()
            .filter(|v| v.status == VersionStatus::Active)
            .max_by(|a, b| {
                a.version
                    .cmp(&b.version)
                    .then_with(|| a.deprecated_at.cmp(&b.deprecated_at))
            })
            .map(|v| v.version.clone())
            .unwrap_or_else(|| self.default_version.clone())
    }

    fn get_version_status(&self, version: &str) -> VersionStatus {
        self.supported_versions
            .iter()
            .find(|v| v.version == version)
            .map(|v| v.status)
            .unwrap_or(VersionStatus::Unsupported)
    }

    fn get_supported_versions(&self) -> Vec<SupportedVersion> {
        self.supported_versions.clone()
    }

    fn set_default_version(&mut self, version: String) {
        self.default_version = version;
    }

    fn set_strategy(&mut self, strategy: VersionNegotiationStrategy) {
        self.negotiation_strategy = strategy;
    }

    fn add_version(&mut self, version: String, status: VersionStatus) -> SupportedVersion {
        let supported = SupportedVersion {
            version: version.clone(),
            status,
            deprecated_at: None,
            sunset_at: None,
        };
        self.supported_versions.push(supported.clone());
        supported
    }

    fn deprecate_version(
        &mut self,
        version: &str,
        sunset_at: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Option<SupportedVersion> {
        let entry = self
            .supported_versions
            .iter_mut()
            .find(|v| v.version == version)?;
        entry.status = VersionStatus::Deprecated;
        entry.deprecated_at = Some(now_utc());
        entry.sunset_at = sunset_at;
        Some(entry.clone())
    }

    fn get_negotiation_log(&self, limit: usize) -> Vec<NegotiationLogEntry> {
        let mut log = self.negotiation_log.clone();
        log.reverse();
        log.truncate(limit);
        log
    }
}

// ==================== 全局单例 ====================

static VERSION_NEGOTIATOR: std::sync::OnceLock<Mutex<VersionNegotiator>> =
    std::sync::OnceLock::new();

fn version_negotiator() -> &'static Mutex<VersionNegotiator> {
    VERSION_NEGOTIATOR.get_or_init(|| Mutex::new(VersionNegotiator::new()))
}

// ==================== 公共 API 函数 ====================

pub fn negotiate_version(
    requested_version: &str,
    strategy: Option<VersionNegotiationStrategy>,
) -> NegotiatedVersion {
    version_negotiator()
        .lock()
        .unwrap()
        .negotiate(requested_version, strategy)
}

pub fn get_supported_versions() -> Vec<SupportedVersion> {
    version_negotiator()
        .lock()
        .unwrap()
        .get_supported_versions()
}

pub fn deprecate_version(
    version: &str,
    sunset_at: Option<chrono::DateTime<chrono::Utc>>,
) -> Option<SupportedVersion> {
    version_negotiator()
        .lock()
        .unwrap()
        .deprecate_version(version, sunset_at)
}

pub fn get_version_status(version: &str) -> VersionStatus {
    version_negotiator()
        .lock()
        .unwrap()
        .get_version_status(version)
}

pub fn set_default_version(version: String) {
    version_negotiator()
        .lock()
        .unwrap()
        .set_default_version(version);
}

pub fn set_negotiation_strategy(strategy: VersionNegotiationStrategy) {
    version_negotiator().lock().unwrap().set_strategy(strategy);
}

pub fn add_supported_version(version: String, status: VersionStatus) -> SupportedVersion {
    version_negotiator()
        .lock()
        .unwrap()
        .add_version(version, status)
}

pub(crate) fn get_negotiation_log(limit: usize) -> Vec<NegotiationLogEntry> {
    version_negotiator()
        .lock()
        .unwrap()
        .get_negotiation_log(limit)
}

// ==================== 初始化函数 ====================

pub fn init_version_negotiation() {
    let mut negotiator = version_negotiator().lock().unwrap();

    negotiator.add_version("v1.0.0".to_string(), VersionStatus::Active);
    negotiator.add_version("v1.1.0".to_string(), VersionStatus::Active);
    negotiator.add_version("v2.0.0".to_string(), VersionStatus::Active);

    negotiator.set_default_version("v2.0.0".to_string());
    negotiator.set_strategy(VersionNegotiationStrategy::LatestCompatible);
}
