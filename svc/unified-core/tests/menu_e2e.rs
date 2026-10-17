#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：unified-core menu 模块集成测试。
//! 覆盖 core_menu_groups / core_menus 的 list/create/delete/get。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state};
use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use serde_json::Value;
use topems_unified_core::modules::menu::handlers::{
    create_group, create_menu, delete_group, get_menu, list_groups, list_menus,
};
use topems_unified_core::modules::menu::models::{
    CreateMenuGroupRequest, CreateMenuRequest, MenuGroupQuery, MenuQuery,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core_menu_groups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            name VARCHAR(200) NOT NULL,
            code VARCHAR(100) NOT NULL,
            icon VARCHAR(200),
            sort_order INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core_menus (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            group_id UUID,
            parent_id UUID,
            name VARCHAR(200) NOT NULL,
            code VARCHAR(100) NOT NULL,
            path VARCHAR(500),
            icon VARCHAR(200),
            sort_order INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            permissions JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn empty_group_query() -> MenuGroupQuery {
    MenuGroupQuery {
        search: None,
        status: None,
        page: None,
        page_size: None,
    }
}

fn empty_menu_query() -> MenuQuery {
    MenuQuery {
        group_id: None,
        parent_id: None,
        search: None,
        status: None,
        page: None,
        page_size: None,
    }
}

async fn create_group_via_handler(pool: &sqlx::PgPool, code: &str, name: &str) -> uuid::Uuid {
    let req = CreateMenuGroupRequest {
        name: name.to_string(),
        code: code.to_string(),
        icon: Some("home".to_string()),
        sort_order: Some(1),
    };
    let resp = create_group(State(test_app_state(pool.clone())), Json(req)).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("create_group error: {:?}", resp.0.message));
    serde_json::to_value(data).unwrap()["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap()
}

#[sqlx::test(migrations = false)]
async fn list_groups_empty(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let resp = list_groups(State(test_app_state(pool)), Query(empty_group_query())).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert_eq!(data.total, 0);
}

#[sqlx::test(migrations = false)]
async fn create_group_and_list(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = create_group_via_handler(&pool, "grp-core", "核心分组").await;

    let resp = list_groups(
        State(test_app_state(pool.clone())),
        Query(empty_group_query()),
    )
    .await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert_eq!(data.total, 1);
    assert_eq!(data.items[0].id, id);
    let item = serde_json::to_value(&data.items[0]).unwrap();
    assert_eq!(item["name"], "核心分组");
}

#[sqlx::test(migrations = false)]
async fn delete_group_removes(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = create_group_via_handler(&pool, "grp-tmp", "临时分组").await;

    let del = delete_group(
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
        Path(id),
    )
    .await;
    assert!(del.0.data.is_some(), "delete failed: {:?}", del.0.message);

    let resp = list_groups(State(test_app_state(pool)), Query(empty_group_query())).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert_eq!(data.total, 0);
}

#[sqlx::test(migrations = false)]
async fn list_menus_empty(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let resp = list_menus(State(test_app_state(pool)), Query(empty_menu_query())).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert_eq!(data.total, 0);
}

#[sqlx::test(migrations = false)]
async fn create_menu_with_group_and_list(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let group_id = create_group_via_handler(&pool, "grp-nav", "导航分组").await;

    let req = CreateMenuRequest {
        group_id,
        parent_id: None,
        name: "仪表盘".to_string(),
        code: "dashboard".to_string(),
        path: Some("/dashboard".to_string()),
        icon: Some("chart".to_string()),
        sort_order: Some(1),
        permissions: Some(serde_json::json!(["dashboard:read"])),
    };
    let created = create_menu(State(test_app_state(pool.clone())), Json(req)).await;
    let data = created
        .0
        .data
        .unwrap_or_else(|| panic!("create_menu error: {:?}", created.0.message));
    let menu: Value = serde_json::to_value(data).unwrap();
    assert_eq!(menu["name"], "仪表盘");
    assert_eq!(menu["code"], "dashboard");

    let resp = list_menus(State(test_app_state(pool)), Query(empty_menu_query())).await;
    let list = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert_eq!(list.total, 1);
}

#[sqlx::test(migrations = false)]
async fn get_menu_returns(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let group_id = create_group_via_handler(&pool, "grp-get", "取数分组").await;

    let req = CreateMenuRequest {
        group_id,
        parent_id: None,
        name: "报表".to_string(),
        code: "report".to_string(),
        path: Some("/report".to_string()),
        icon: None,
        sort_order: None,
        permissions: None,
    };
    let created = create_menu(State(test_app_state(pool.clone())), Json(req)).await;
    let menu_id: uuid::Uuid = serde_json::to_value(
        created
            .0
            .data
            .unwrap_or_else(|| panic!("create_menu error: {:?}", created.0.message)),
    )
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();

    let resp = get_menu(State(test_app_state(pool)), Path(menu_id)).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("get_menu error: {:?}", resp.0.message));
    let menu: Value = serde_json::to_value(data).unwrap();
    assert_eq!(menu["name"], "报表");
}
