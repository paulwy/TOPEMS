use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use uuid::Uuid;

pub mod option_uuid {
    use super::*;

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<Uuid>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = Option::<String>::deserialize(deserializer)?;
        match s {
            Some(s) if s.trim().is_empty() => Ok(None),
            Some(s) => Uuid::parse_str(&s)
                .map(Some)
                .map_err(serde::de::Error::custom),
            None => Ok(None),
        }
    }

    pub fn serialize<S>(value: &Option<Uuid>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        Option::<Uuid>::serialize(value, serializer)
    }
}

pub mod option_uuid_vec {
    use super::*;

    #[allow(dead_code)]
    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<Vec<Uuid>>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let vec = Option::<Vec<String>>::deserialize(deserializer)?;
        match vec {
            Some(vec) => {
                let mut uuids = Vec::new();
                for s in vec {
                    if !s.trim().is_empty() {
                        let uuid = Uuid::parse_str(&s).map_err(serde::de::Error::custom)?;
                        uuids.push(uuid);
                    }
                }
                if uuids.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(uuids))
                }
            }
            None => Ok(None),
        }
    }

    #[allow(dead_code)]
    pub fn serialize<S>(value: &Option<Vec<Uuid>>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        Option::<Vec<Uuid>>::serialize(value, serializer)
    }
}

pub mod option_date_time {
    use super::*;

    #[allow(dead_code)]
    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = Option::<String>::deserialize(deserializer)?;
        match s {
            Some(s) if s.trim().is_empty() => Ok(None),
            Some(s) => {
                if let Ok(dt) = DateTime::parse_from_rfc3339(&s) {
                    return Ok(Some(dt.with_timezone(&Utc)));
                }

                if let Ok(naive_dt) = NaiveDateTime::parse_from_str(&s, "%Y-%m-%d %H:%M:%S") {
                    return Ok(Some(DateTime::<Utc>::from_naive_utc_and_offset(
                        naive_dt, Utc,
                    )));
                }

                if let Ok(naive_date) = NaiveDate::parse_from_str(&s, "%Y-%m-%d") {
                    let naive_dt = naive_date
                        .and_hms_opt(0, 0, 0)
                        .ok_or_else(|| serde::de::Error::custom("无效的日期"))?;
                    return Ok(Some(DateTime::<Utc>::from_naive_utc_and_offset(
                        naive_dt, Utc,
                    )));
                }

                Err(serde::de::Error::custom(format!("无法解析日期: {}", s)))
            }
            None => Ok(None),
        }
    }

    #[allow(dead_code)]
    pub fn serialize<S>(value: &Option<DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        Option::<DateTime<Utc>>::serialize(value, serializer)
    }
}
