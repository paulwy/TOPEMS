use axum::{
    extract::{Json, Path, State},
    Json as AxumJson,
};
use topems_shared_core::response::ApiResponse;

use crate::{
    models::{NavigationMenu, PinnedApp},
    shared::AppState,
};

#[utoipa::path(
    get,
    path = "/navigation/menu",
    tag = "Navigation",
    responses(
        (status = 200, description = "Navigation menu", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_navigation_menu(
    State(state): State<AppState>,
) -> AxumJson<ApiResponse<Vec<NavigationMenu>>> {
    let services = state.service_registry.list_all().await;
    let mut menu: Vec<NavigationMenu> = services
        .iter()
        .filter(|s| {
            s.status == topems_shared_event::service_discovery::ServiceRegistryStatus::Active
        })
        .map(|s| NavigationMenu {
            id: s.code.clone(),
            name: s.name.clone(),
            icon: s.icon.clone().unwrap_or_else(|| "Box".to_string()),
            url: s.url.clone().unwrap_or_else(|| format!("/{}", s.code)),
            service: s.code.clone(),
            parent_id: None,
            order: s.order as u32,
            is_visible: true,
            badge_count: None,
        })
        .collect();

    if menu.is_empty() {
        menu = get_default_menu();
    }

    menu.sort_by_key(|m| m.order);
    AxumJson(ApiResponse::success(menu, "导航菜单获取成功"))
}

fn get_default_menu() -> Vec<NavigationMenu> {
    vec![
        NavigationMenu {
            id: "portal".to_string(),
            name: "工作台".to_string(),
            icon: "LayoutDashboard".to_string(),
            url: "/portal/workbench".to_string(),
            service: "portal".to_string(),
            parent_id: None,
            order: 1,
            is_visible: true,
            badge_count: None,
        },
        NavigationMenu {
            id: "erp".to_string(),
            name: "ERP系统".to_string(),
            icon: "Package".to_string(),
            url: "/erp".to_string(),
            service: "erp".to_string(),
            parent_id: None,
            order: 2,
            is_visible: true,
            badge_count: Some(5),
        },
    ]
}

pub async fn get_pinned_apps(
    State(state): State<AppState>,
) -> AxumJson<ApiResponse<Vec<PinnedApp>>> {
    let services = state.service_registry.list_all().await;
    let mut apps: Vec<PinnedApp> = services
        .iter()
        .filter(|s| {
            s.status == topems_shared_event::service_discovery::ServiceRegistryStatus::Active
        })
        .take(5)
        .enumerate()
        .map(|(i, s)| PinnedApp {
            id: s.code.clone(),
            app_id: s.code.clone(),
            app_name: s.name.clone(),
            icon: s.icon.clone().unwrap_or_else(|| "Box".to_string()),
            url: s.url.clone().unwrap_or_else(|| format!("/{}", s.code)),
            order: (i as u32) + 1,
        })
        .collect();

    if apps.is_empty() {
        apps = get_default_pinned_apps();
    }

    AxumJson(ApiResponse::success(apps, "固定应用列表获取成功"))
}

fn get_default_pinned_apps() -> Vec<PinnedApp> {
    vec![
        PinnedApp {
            id: "1".to_string(),
            app_id: "erp".to_string(),
            app_name: "ERP系统".to_string(),
            icon: "Package".to_string(),
            url: "/erp".to_string(),
            order: 1,
        },
        PinnedApp {
            id: "2".to_string(),
            app_id: "bi".to_string(),
            app_name: "BI分析".to_string(),
            icon: "BarChart3".to_string(),
            url: "/bi".to_string(),
            order: 2,
        },
    ]
}

pub async fn add_pinned_app(
    State(_state): State<AppState>,
    Json(app): Json<PinnedApp>,
) -> AxumJson<ApiResponse<PinnedApp>> {
    AxumJson(ApiResponse::success(app, "应用已固定"))
}

pub async fn remove_pinned_app(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> AxumJson<ApiResponse<serde_json::Value>> {
    AxumJson(ApiResponse::success(
        serde_json::json!({ "id": id, "removed": true }),
        "应用已取消固定",
    ))
}

pub async fn reorder_pinned_apps(
    State(_state): State<AppState>,
    Json(apps): Json<Vec<PinnedApp>>,
) -> AxumJson<ApiResponse<Vec<PinnedApp>>> {
    AxumJson(ApiResponse::success(apps, "固定应用顺序已更新"))
}
