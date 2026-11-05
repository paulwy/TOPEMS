//! PostgreSQL `::text` 风格时间字段的**反序列化兼容**适配。
//!
//! 历史上接口以 `created_at::text` 形式返回时间，对外 JSON 形如
//! `2026-11-05 15:19:00.123456+00`。现在统一输出 RFC3339，本模块只保留
//! 反序列化能力，用于兼容旧的输入格式（空格分隔、无时区后缀）。
//!
//! 用法：
//! - `#[serde(deserialize_with = "topems_shared_db::datetime_text::deserialize")]`
//! - `#[serde(deserialize_with = "topems_shared_db::datetime_text::option::deserialize")]`

use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Deserializer, Serializer};

fn to_pg_text(dt: &DateTime<Utc>) -> String {
    format!("{}+00", dt.format("%Y-%m-%d %H:%M:%S%.f"))
}

fn from_str(s: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Some(dt.with_timezone(&Utc));
    }
    let trimmed = s
        .trim_end_matches("+00:00")
        .trim_end_matches("+0000")
        .trim_end_matches("+00")
        .trim_end_matches('Z');
    NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S%.f")
        .ok()
        .map(|naive| DateTime::from_naive_utc_and_offset(naive, Utc))
}

pub fn serialize<S: Serializer>(value: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(&to_pg_text(value))
}

pub fn deserialize<'de, D: Deserializer<'de>>(deserializer: D) -> Result<DateTime<Utc>, D::Error> {
    let raw = String::deserialize(deserializer)?;
    from_str(&raw).ok_or_else(|| serde::de::Error::custom(format!("无法解析时间: {raw}")))
}

pub mod option {
    use super::*;

    pub fn serialize<S: Serializer>(
        value: &Option<DateTime<Utc>>,
        serializer: S,
    ) -> Result<S::Ok, S::Error> {
        match value {
            Some(dt) => serializer.serialize_str(&to_pg_text(dt)),
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(
        deserializer: D,
    ) -> Result<Option<DateTime<Utc>>, D::Error> {
        let raw = Option::<String>::deserialize(deserializer)?;
        match raw {
            Some(s) if s.trim().is_empty() => Ok(None),
            Some(s) => from_str(&s)
                .map(Some)
                .ok_or_else(|| serde::de::Error::custom(format!("无法解析时间: {s}"))),
            None => Ok(None),
        }
    }
}
