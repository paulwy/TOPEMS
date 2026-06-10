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
