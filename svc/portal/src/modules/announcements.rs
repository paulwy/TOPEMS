use axum::{extract::Path, Json};
use topems_shared::ApiResponse;

use crate::{
    models::{Announcement, NewAnnouncement},
    services::announcement::AnnouncementService,
};

pub async fn get_announcements() -> Json<ApiResponse<Vec<Announcement>>> {
    let service = AnnouncementService::new();
    let announcements = service.get_announcements();
    Json(ApiResponse::success(announcements, "公告列表获取成功"))
}

pub async fn get_announcement(Path(id): Path<String>) -> Json<ApiResponse<Announcement>> {
    let service = AnnouncementService::new();
    let announcement = service.get_announcement(id);
    Json(ApiResponse::success(announcement, "公告详情获取成功"))
}

pub async fn create_announcement(
    Json(data): Json<NewAnnouncement>,
) -> Json<ApiResponse<Announcement>> {
    let service = AnnouncementService::new();
    let announcement = service.create_announcement(data);
    Json(ApiResponse::success(announcement, "公告创建成功"))
}

pub async fn update_announcement(
    Path(id): Path<String>,
    Json(data): Json<NewAnnouncement>,
) -> Json<ApiResponse<Announcement>> {
    let service = AnnouncementService::new();
    let announcement = service.update_announcement(id, data);
    Json(ApiResponse::success(announcement, "公告更新成功"))
}

pub async fn delete_announcement(Path(id): Path<String>) -> Json<ApiResponse<serde_json::Value>> {
    let service = AnnouncementService::new();
    let result = service.delete_announcement(id);
    Json(ApiResponse::success(result, "公告删除成功"))
}

pub async fn toggle_announcement_pin(Path(id): Path<String>) -> Json<ApiResponse<Announcement>> {
    let service = AnnouncementService::new();
    let announcement = service.toggle_pin(id);
    Json(ApiResponse::success(announcement, "公告置顶状态已更新"))
}

pub async fn get_pinned_announcements() -> Json<ApiResponse<Vec<Announcement>>> {
    let service = AnnouncementService::new();
    let announcements = service.get_pinned_announcements();
    Json(ApiResponse::success(announcements, "置顶公告获取成功"))
}
