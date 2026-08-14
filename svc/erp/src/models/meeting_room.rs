use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MeetingRoom {
    pub id: Uuid,
    pub name: String,
    pub capacity: i32,
    pub location: Option<String>,
    pub facilities: Option<Vec<String>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMeetingRoomRequest {
    pub name: String,
    pub capacity: i32,
    pub location: Option<String>,
    pub facilities: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMeetingRoomRequest {
    pub name: Option<String>,
    pub capacity: Option<i32>,
    pub location: Option<String>,
    pub facilities: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MeetingBooking {
    pub id: Uuid,
    pub room_id: Uuid,
    pub room_name: String,
    pub title: String,
    pub organizer: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMeetingBookingRequest {
    pub room_id: Uuid,
    pub title: String,
    pub organizer: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMeetingBookingRequest {
    pub title: Option<String>,
    pub organizer: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use uuid::Uuid;

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    // ========== MeetingRoom ==========
    #[test]
    fn test_meeting_room_serde_full() {
        let r = MeetingRoom {
            id: sample_uuid(),
            name: "301大会议室".into(),
            capacity: 50,
            location: Some("3楼东侧".into()),
            facilities: Some(vec!["投影仪".into(), "白板".into(), "视频会议".into()]),
            status: "available".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: MeetingRoom = serde_json::from_value(v).unwrap();
        assert_eq!(r.name, r2.name);
        assert_eq!(r.capacity, r2.capacity);
        assert_eq!(r.facilities, r2.facilities);
    }

    #[test]
    fn test_meeting_room_minimal() {
        let r = MeetingRoom {
            id: sample_uuid(),
            name: "小隔间".into(),
            capacity: 2,
            location: None,
            facilities: None,
            status: "maintenance".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&r).unwrap();
        let r2: MeetingRoom = serde_json::from_str(&s).unwrap();
        assert_eq!(r2.capacity, 2);
        assert!(r2.location.is_none());
        assert!(r2.facilities.is_none());
    }

    #[test]
    fn test_meeting_room_negative_capacity() {
        let r = MeetingRoom {
            id: sample_uuid(),
            name: "无效".into(),
            capacity: -5,
            location: None,
            facilities: Some(vec![]),
            status: "disabled".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: MeetingRoom = serde_json::from_value(v).unwrap();
        assert_eq!(r2.capacity, -5);
        assert_eq!(r2.facilities, Some(vec![]));
    }

    #[test]
    fn test_create_meeting_room_request() {
        let r = CreateMeetingRoomRequest {
            name: "新会议室".into(),
            capacity: 20,
            location: Some("5楼".into()),
            facilities: Some(vec!["TV".into()]),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateMeetingRoomRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.name, "新会议室");
        assert_eq!(r2.capacity, 20);
    }

    #[test]
    fn test_update_meeting_room_request() {
        let r = UpdateMeetingRoomRequest {
            name: Some("改名了".into()),
            capacity: Some(999),
            location: None,
            facilities: None,
            status: Some("occupied".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateMeetingRoomRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.capacity, Some(999));
        assert_eq!(r2.status, Some("occupied".into()));
    }

    // ========== MeetingBooking ==========
    #[test]
    fn test_meeting_booking_serde() {
        let b = MeetingBooking {
            id: sample_uuid(),
            room_id: sample_uuid(),
            room_name: "301".into(),
            title: "季度复盘会".into(),
            organizer: "张经理".into(),
            start_time: Utc::now(),
            end_time: Utc::now(),
            status: "confirmed".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&b).unwrap();
        let b2: MeetingBooking = serde_json::from_value(v).unwrap();
        assert_eq!(b.title, b2.title);
        assert_eq!(b.organizer, b2.organizer);
        assert_eq!(b.status, b2.status);
    }

    #[test]
    fn test_create_meeting_booking_request() {
        let r = CreateMeetingBookingRequest {
            room_id: sample_uuid(),
            title: "临时讨论".into(),
            organizer: "李".into(),
            start_time: Utc::now(),
            end_time: Utc::now(),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateMeetingBookingRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.title, "临时讨论");
    }

    #[test]
    fn test_update_meeting_booking_request_all_none() {
        let r = UpdateMeetingBookingRequest {
            title: None,
            organizer: None,
            start_time: None,
            end_time: None,
            status: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateMeetingBookingRequest = serde_json::from_value(v).unwrap();
        assert!(r2.title.is_none());
    }

    #[test]
    fn test_update_meeting_booking_request_all_some() {
        let r = UpdateMeetingBookingRequest {
            title: Some("新标题".into()),
            organizer: Some("新组织者".into()),
            start_time: Some(Utc::now()),
            end_time: Some(Utc::now()),
            status: Some("cancelled".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateMeetingBookingRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.title, Some("新标题".into()));
        assert_eq!(r2.status, Some("cancelled".into()));
    }
}
