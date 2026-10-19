//! 全局共享 reqwest 客户端（P2-4 / F11）。
//!
//! 生产侧原先各处裸 `reqwest::Client::new()`，每次调用都新建客户端：不复用连接池、
//! 无统一超时。本模块提供进程级单例客户端，`reqwest::Client` 内部以 Arc 持有连接池，
//! clone 廉价且共享同一连接池与超时配置。
//!
//! 默认：整体超时 30s、连接超时 5s（与 BaseServiceClient 对齐）。

use std::sync::OnceLock;
use std::time::Duration;

use reqwest::Client;

static SHARED_CLIENT: OnceLock<Client> = OnceLock::new();

/// 默认全局共享客户端（30s 整体超时 / 5s 连接超时）。
///
/// 返回的 `Client` 可直接 clone 使用，内部共享连接池，无需重复构建。
pub fn shared_http_client() -> Client {
    SHARED_CLIENT
        .get_or_init(|| {
            Client::builder()
                .timeout(Duration::from_secs(30))
                .connect_timeout(Duration::from_secs(5))
                .build()
                .unwrap_or_else(|_| Client::new())
        })
        .clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_client_repeatable_and_clonable() {
        let a = shared_http_client();
        let b = shared_http_client();
        // 重复获取不 panic、可 clone；连接池在内部 Arc 共享。
        let _ = a.clone();
        let _ = b;
    }
}
