use chrono::{DateTime, NaiveDateTime, Utc};
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

                if let Ok(naive_date) = s.parse::<chrono::NaiveDate>() {
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Datelike, Timelike};
    use serde::{Deserialize, Serialize};
    use serde_json::json;

    // ---------- option_uuid tests ----------

    #[derive(Debug, Serialize, Deserialize, PartialEq)]
    struct UuidWrapper {
        #[serde(with = "option_uuid")]
        id: Option<Uuid>,
    }

    #[test]
    fn test_option_uuid_deserialize_null() {
        let w: UuidWrapper = serde_json::from_value(json!({ "id": null })).unwrap();
        assert_eq!(w.id, None);
    }

    #[test]
    fn test_option_uuid_deserialize_empty_string_becomes_none() {
        let w: UuidWrapper = serde_json::from_value(json!({ "id": "" })).unwrap();
        assert_eq!(w.id, None);
        let w: UuidWrapper = serde_json::from_value(json!({ "id": "   " })).unwrap();
        assert_eq!(w.id, None);
    }

    #[test]
    fn test_option_uuid_deserialize_valid_uuid() {
        let s = "550e8400-e29b-41d4-a716-446655440000";
        let expected = Uuid::parse_str(s).unwrap();
        let w: UuidWrapper = serde_json::from_value(json!({ "id": s })).unwrap();
        assert_eq!(w.id, Some(expected));
    }

    #[test]
    fn test_option_uuid_deserialize_invalid_uuid_errors() {
        // Uuid::parse_str returns an error that we forward via
        // serde::de::Error::custom; just ensure deserialization fails on
        // malformed input.
        let result = serde_json::from_value::<UuidWrapper>(json!({ "id": "not-a-uuid" }));
        assert!(result.is_err(), "expected error, got {:?}", result.ok());
        let err = result.unwrap_err();
        assert!(
            !err.to_string().is_empty(),
            "error message should be non-empty"
        );
    }

    #[test]
    fn test_option_uuid_serialize_none() {
        let w = UuidWrapper { id: None };
        let v = serde_json::to_value(&w).unwrap();
        assert_eq!(v, json!({ "id": null }));
    }

    #[test]
    fn test_option_uuid_serialize_some() {
        let u = Uuid::parse_str("a1a2a3a4-b1b2-c1c2-d1d2-d3d4d5d6d7d8").unwrap();
        let w = UuidWrapper { id: Some(u) };
        let v = serde_json::to_value(&w).unwrap();
        assert_eq!(v, json!({ "id": "a1a2a3a4-b1b2-c1c2-d1d2-d3d4d5d6d7d8" }));
    }

    // ---------- option_uuid_vec tests ----------

    #[derive(Debug, Serialize, Deserialize, PartialEq)]
    struct UuidVecWrapper {
        #[serde(with = "option_uuid_vec")]
        ids: Option<Vec<Uuid>>,
    }

    #[test]
    fn test_option_uuid_vec_deserialize_null() {
        let w: UuidVecWrapper = serde_json::from_value(json!({ "ids": null })).unwrap();
        assert_eq!(w.ids, None);
    }

    #[test]
    fn test_option_uuid_vec_deserialize_empty_array_becomes_none() {
        let w: UuidVecWrapper = serde_json::from_value(json!({ "ids": [] })).unwrap();
        assert_eq!(w.ids, None);
    }

    #[test]
    fn test_option_uuid_vec_deserialize_all_empty_strings_becomes_none() {
        // All items are blank strings → after filtering uuids is_empty → None
        let w: UuidVecWrapper = serde_json::from_value(json!({ "ids": ["", "   "] })).unwrap();
        assert_eq!(w.ids, None);
    }

    #[test]
    fn test_option_uuid_vec_deserialize_valid_mixed_with_blanks() {
        let u1 = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();
        let u2 = Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap();
        let w: UuidVecWrapper = serde_json::from_value(json!({
            "ids": [
                "11111111-1111-1111-1111-111111111111",
                "", // blank → skipped
                "22222222-2222-2222-2222-222222222222",
                "  ", // whitespace → skipped
            ]
        }))
        .unwrap();
        assert_eq!(w.ids, Some(vec![u1, u2]));
    }

    #[test]
    fn test_option_uuid_vec_deserialize_invalid_uuid_in_vec_errors() {
        // Any non-hex UUID string in the vec should cause parse failure
        let result = serde_json::from_value::<UuidVecWrapper>(json!({
            "ids": ["11111111-1111-1111-1111-111111111111", "garbage"]
        }));
        assert!(result.is_err(), "expected error, got {:?}", result.ok());
    }

    #[test]
    fn test_option_uuid_vec_serialize_none() {
        let w = UuidVecWrapper { ids: None };
        let v = serde_json::to_value(&w).unwrap();
        assert_eq!(v, json!({ "ids": null }));
    }

    #[test]
    fn test_option_uuid_vec_serialize_some() {
        let u = Uuid::parse_str("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee").unwrap();
        let w = UuidVecWrapper { ids: Some(vec![u]) };
        let v = serde_json::to_value(&w).unwrap();
        assert_eq!(
            v,
            json!({ "ids": ["aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"] })
        );
    }

    // ---------- option_date_time tests ----------

    #[derive(Debug, Serialize, Deserialize, PartialEq)]
    struct DateTimeWrapper {
        #[serde(with = "option_date_time")]
        t: Option<DateTime<Utc>>,
    }

    #[test]
    fn test_option_date_time_deserialize_null() {
        let w: DateTimeWrapper = serde_json::from_value(json!({ "t": null })).unwrap();
        assert_eq!(w.t, None);
    }

    #[test]
    fn test_option_date_time_deserialize_empty_string() {
        let w: DateTimeWrapper = serde_json::from_value(json!({ "t": "" })).unwrap();
        assert_eq!(w.t, None);
        let w: DateTimeWrapper = serde_json::from_value(json!({ "t": "  " })).unwrap();
        assert_eq!(w.t, None);
    }

    #[test]
    fn test_option_date_time_deserialize_rfc3339() {
        let w: DateTimeWrapper =
            serde_json::from_value(json!({ "t": "2025-06-01T12:34:56Z" })).unwrap();
        let dt = w.t.unwrap();
        assert_eq!(dt.year(), 2025);
        assert_eq!(dt.month(), 6);
        assert_eq!(dt.day(), 1);
        assert_eq!(dt.hour(), 12);
        assert_eq!(dt.minute(), 34);
        assert_eq!(dt.second(), 56);
    }

    #[test]
    fn test_option_date_time_deserialize_rfc3339_with_offset() {
        // +08:00 offset → converted to UTC
        let w: DateTimeWrapper =
            serde_json::from_value(json!({ "t": "2025-06-01T20:00:00+08:00" })).unwrap();
        let dt = w.t.unwrap();
        // 20:00+08 = 12:00 UTC
        assert_eq!(dt.hour(), 12);
        assert_eq!(dt.day(), 1);
    }

    #[test]
    fn test_option_date_time_deserialize_naive_datetime_format() {
        let w: DateTimeWrapper =
            serde_json::from_value(json!({ "t": "2025-07-04 09:30:45" })).unwrap();
        let dt = w.t.unwrap();
        assert_eq!(dt.year(), 2025);
        assert_eq!(dt.month(), 7);
        assert_eq!(dt.day(), 4);
        assert_eq!(dt.hour(), 9);
        assert_eq!(dt.minute(), 30);
        assert_eq!(dt.second(), 45);
    }

    #[test]
    fn test_option_date_time_deserialize_date_only_fills_zero_time() {
        let w: DateTimeWrapper = serde_json::from_value(json!({ "t": "2025-12-25" })).unwrap();
        let dt = w.t.unwrap();
        assert_eq!(dt.year(), 2025);
        assert_eq!(dt.month(), 12);
        assert_eq!(dt.day(), 25);
        assert_eq!(dt.hour(), 0);
        assert_eq!(dt.minute(), 0);
        assert_eq!(dt.second(), 0);
    }

    #[test]
    fn test_option_date_time_deserialize_invalid_string_errors() {
        let err =
            serde_json::from_value::<DateTimeWrapper>(json!({ "t": "not-a-date" })).unwrap_err();
        assert!(err.to_string().contains("无法解析日期"), "err={}", err);
    }

    #[test]
    fn test_option_date_time_serialize_none() {
        let w = DateTimeWrapper { t: None };
        let v = serde_json::to_value(&w).unwrap();
        assert_eq!(v, json!({ "t": null }));
    }

    #[test]
    fn test_option_date_time_serialize_some_roundtrips_rfc3339() {
        // Build a known UTC timestamp and ensure serialization output matches
        // chrono's default RFC3339 format for DateTime<Utc>.
        let naive = chrono::NaiveDate::from_ymd_opt(2025, 8, 15)
            .unwrap()
            .and_hms_opt(10, 20, 30)
            .unwrap();
        let dt = DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc);
        let w = DateTimeWrapper { t: Some(dt) };
        let s = serde_json::to_string(&w).unwrap();
        // Round trip the JSON string back via our deserializer to verify
        // consistency.
        let w2: DateTimeWrapper = serde_json::from_str(&s).unwrap();
        assert_eq!(w.t, w2.t);
    }
}
