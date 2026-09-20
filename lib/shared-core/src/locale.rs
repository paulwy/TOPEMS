//! 后端运行时语言检测基础设施。
//!
//! 从请求头解析用户语言，供 SQL 层做字段级双语切换（`*_en` 列 + `CASE WHEN`）使用。
//! 默认中文，与现有行为保持一致。

use axum::http::HeaderMap;

/// 请求语言。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Locale {
    Zh,
    En,
}

impl Locale {
    /// 从请求头解析语言：优先 `X-Lang`，其次 `Accept-Language`。
    ///
    /// `Accept-Language` 取第一个 token（逗号分隔，忽略权重后缀）：
    /// 含 "en" → [`Locale::En`]；含 "zh"/"cn" → [`Locale::Zh`]；
    /// 其他或缺失 → [`Locale::Zh`]（默认中文，与现状一致）。
    pub fn from_headers(headers: &HeaderMap) -> Self {
        if let Some(x_lang) = headers.get("x-lang").and_then(|v| v.to_str().ok()) {
            let lower = x_lang.to_ascii_lowercase();
            if lower.starts_with("en") {
                return Locale::En;
            }
            if lower.starts_with("zh") || lower.starts_with("cn") {
                return Locale::Zh;
            }
        }
        if let Some(accept) = headers.get("accept-language").and_then(|v| v.to_str().ok()) {
            // 取第一个 token（逗号分隔），截断 `;q=` 权重
            let first = accept
                .split(',')
                .next()
                .unwrap_or("")
                .trim()
                .split(';')
                .next()
                .unwrap_or("")
                .to_ascii_lowercase();
            if first.contains("en") {
                return Locale::En;
            }
            if first.contains("zh") || first.contains("cn") {
                return Locale::Zh;
            }
        }
        Locale::Zh
    }

    /// 序列化为 SQL 绑定用的 `&'static str`：`"zh"` / `"en"`。
    pub fn as_sql(&self) -> &'static str {
        match self {
            Locale::Zh => "zh",
            Locale::En => "en",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderMap;

    #[test]
    fn defaults_to_zh_when_empty() {
        let h = HeaderMap::new();
        assert_eq!(Locale::from_headers(&h), Locale::Zh);
    }

    #[test]
    fn parses_accept_language_en() {
        let mut h = HeaderMap::new();
        h.insert("accept-language", "en-US,en;q=0.9,zh;q=0.8".parse().unwrap());
        assert_eq!(Locale::from_headers(&h), Locale::En);
    }

    #[test]
    fn parses_accept_language_zh() {
        let mut h = HeaderMap::new();
        h.insert("accept-language", "zh-CN,zh;q=0.9".parse().unwrap());
        assert_eq!(Locale::from_headers(&h), Locale::Zh);
    }

    #[test]
    fn x_lang_takes_precedence() {
        let mut h = HeaderMap::new();
        h.insert("x-lang", "en".parse().unwrap());
        h.insert("accept-language", "zh-CN".parse().unwrap());
        assert_eq!(Locale::from_headers(&h), Locale::En);
    }

    #[test]
    fn as_sql_values() {
        assert_eq!(Locale::Zh.as_sql(), "zh");
        assert_eq!(Locale::En.as_sql(), "en");
    }
}
