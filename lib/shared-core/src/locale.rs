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

    /// Rust 侧双语字段选择：与 SQL `CASE WHEN ? = 'en' THEN COALESCE(name_en, name) ELSE name END` 等价。
    ///
    /// - [`Locale::En`] 且 `name_en` 非空 → 返回 `name_en`；
    /// - 其他情况（中文、或英文缺失/空串）→ 回退 `name`。
    ///
    /// 用于已把 `name`/`name_en` 同时读到内存、需在 Rust 中切换展示的场景；
    /// SQL 层直接用 `CASE WHEN` + [`Locale::as_sql`] 绑定即可，不必经此函数。
    pub fn pick_name(&self, name: &str, name_en: Option<&str>) -> String {
        match self {
            Locale::En => match name_en {
                Some(v) if !v.trim().is_empty() => v.to_string(),
                _ => name.to_string(),
            },
            Locale::Zh => name.to_string(),
        }
    }

    /// 可选 name 字段的双语选择；当 `name` 本身为 `None` 时返回 `None`。
    pub fn pick_optional_name(&self, name: Option<&str>, name_en: Option<&str>) -> Option<String> {
        name.map(|n| self.pick_name(n, name_en))
    }
}

/// 自由函数版双语选择，便于在未持有 [`Locale`] 枚举、仅有语言字符串的场景调用。
///
/// `lang` 为 `"en"`（大小写不敏感）时走英文分支，其他值（含 `"zh"`、空串）走中文回退。
pub fn pick_name(name: &str, name_en: Option<&str>, lang: &str) -> String {
    let locale = if lang.eq_ignore_ascii_case("en") {
        Locale::En
    } else {
        Locale::Zh
    };
    locale.pick_name(name, name_en)
}

/// 自由函数版可选 name 双语选择。
pub fn pick_optional_name(name: Option<&str>, name_en: Option<&str>, lang: &str) -> Option<String> {
    name.map(|n| pick_name(n, name_en, lang))
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

    #[test]
    fn pick_name_zh_returns_chinese_even_with_english() {
        assert_eq!(Locale::Zh.pick_name("供应商", Some("Supplier")), "供应商");
    }

    #[test]
    fn pick_name_en_returns_english_when_present() {
        assert_eq!(Locale::En.pick_name("供应商", Some("Supplier")), "Supplier");
    }

    #[test]
    fn pick_name_en_falls_back_to_chinese_when_missing() {
        assert_eq!(Locale::En.pick_name("供应商", None), "供应商");
        assert_eq!(Locale::En.pick_name("供应商", Some("")), "供应商");
        assert_eq!(Locale::En.pick_name("供应商", Some("   ")), "供应商");
    }

    #[test]
    fn pick_optional_name_handles_none_name() {
        assert_eq!(Locale::En.pick_optional_name(None, Some("X")), None);
        assert_eq!(
            Locale::En.pick_optional_name(Some("名"), Some("Name")),
            Some("Name".to_string())
        );
    }

    #[test]
    fn free_function_pick_name_parses_lang_string() {
        assert_eq!(pick_name("名", Some("Name"), "en"), "Name");
        assert_eq!(pick_name("名", Some("Name"), "EN"), "Name");
        assert_eq!(pick_name("名", Some("Name"), "zh"), "名");
        assert_eq!(pick_name("名", Some("Name"), ""), "名");
    }
}
