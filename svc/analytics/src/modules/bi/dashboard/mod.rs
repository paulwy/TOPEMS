use chrono::{DateTime, Utc};

/// 兼容 sqlx 缓存中时间列的可空/非空双态：两种类型都能落到 DateTime<Utc>。
pub(crate) trait IntoDateTime {
    fn into_datetime(self) -> DateTime<Utc>;
}

impl IntoDateTime for DateTime<Utc> {
    fn into_datetime(self) -> DateTime<Utc> {
        self
    }
}

impl IntoDateTime for Option<DateTime<Utc>> {
    fn into_datetime(self) -> DateTime<Utc> {
        self.unwrap_or_else(Utc::now)
    }
}

pub mod crud;
pub mod export;
pub mod models;
pub mod realtime;
pub mod share;
pub mod templates;

pub use crud::*;
pub use export::*;
pub use models::*;
pub use realtime::*;
pub use share::*;
pub use templates::*;
