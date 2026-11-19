#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：unified-core menu 模块集成测试。
//! 覆盖 core_menu_groups / core_menus 的 list/create/delete/get。
#![cfg(feature = "db-tests")]

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{commit_test_txn, super_claims, test_app_state, test_txn_cell};
use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use topems_unified_core::modules::menu::handlers::{
    create_group, create_menu, delete_group, get_menu, list_groups, list_menus,
};
use topems_unified_core::modules::menu::models::{
    CreateMenuGroupRequest, CreateMenuRequest, MenuGroupQuery, MenuQuery,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.core_menu_groups (
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
        r#"CREATE TABLE IF NOT EXISTS public.core_menus (
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
    let txn = test_txn_cell(pool).await;
    let resp = create_group(
        Extension(txn.clone()),
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
        Json(req),
    )
    .await;
    commit_test_txn(&txn).await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("create_group error: {:?}", resp.message));
    serde_json::to_value(data).unwrap()["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap()
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_groups_empty(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let resp = list_groups(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool)),
        Extension(super_claims()),
        Query(empty_group_query()),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    assert_eq!(data.total, 0);
}

#[sqlx::test(migrations = false)]
async fn create_group_and_list(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = create_group_via_handler(&pool, "grp-core", "核心分组").await;

    let resp = list_groups(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
        Query(empty_group_query()),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    assert_eq!(data.total, 1);
    assert_eq!(data.items[0].id, id);
    let item = serde_json::to_value(&data.items[0]).unwrap();
    assert_eq!(item["name"], "核心分组");
}

#[sqlx::test(migrations = false)]
async fn delete_group_removes(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = create_group_via_handler(&pool, "grp-tmp", "临时分组").await;

    let txn = test_txn_cell(&pool).await;
    let del = delete_group(
        Extension(txn.clone()),
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
        Path(id),
    )
    .await;
    commit_test_txn(&txn).await;
    assert!(del.data.is_some(), "delete failed: {:?}", del.message);

    let resp = list_groups(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool)),
        Extension(super_claims()),
        Query(empty_group_query()),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    assert_eq!(data.total, 0);
}

#[sqlx::test(migrations = false)]
async fn list_menus_empty(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let resp = list_menus(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool)),
        Extension(super_claims()),
        Query(empty_menu_query()),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
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
    let txn = test_txn_cell(&pool).await;
    let created = create_menu(
        Extension(txn.clone()),
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
        Json(req),
    )
    .await;
    commit_test_txn(&txn).await;
    let data = created
        .data
        .unwrap_or_else(|| panic!("create_menu error: {:?}", created.message));
    let menu: Value = serde_json::to_value(data).unwrap();
    assert_eq!(menu["name"], "仪表盘");
    assert_eq!(menu["code"], "dashboard");

    let resp = list_menus(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool)),
        Extension(super_claims()),
        Query(empty_menu_query()),
    )
    .await;
    let list = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
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
    let txn = test_txn_cell(&pool).await;
    let created = create_menu(
        Extension(txn.clone()),
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
        Json(req),
    )
    .await;
    commit_test_txn(&txn).await;
    let menu_id: uuid::Uuid = serde_json::to_value(
        created
            .data
            .unwrap_or_else(|| panic!("create_menu error: {:?}", created.message)),
    )
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();

    let resp = get_menu(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool)),
        Path(menu_id),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("get_menu error: {:?}", resp.message));
    let menu: Value = serde_json::to_value(data).unwrap();
    assert_eq!(menu["name"], "报表");
}

/// 构造与生产同款的连接池基线：`flow, public`。
async fn pool_with_prod_search_path(pool: &sqlx::PgPool) -> sqlx::PgPool {
    PgPoolOptions::new()
        .max_connections(1)
        .min_connections(1)
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                sqlx::query("SELECT set_config('search_path', 'flow, public', false)")
                    .execute(&mut *conn)
                    .await?;
                Ok(())
            })
        })
        .connect_with((*pool.connect_options()).clone())
        .await
        .expect("建立 flow,public 测试连接池失败")
}

/// 回归：生产 search_path 为 `flow, public` 且 flow 下存在同名空副本时，
/// 菜单读写仍必须命中 public 权威表（显式 schema 前缀，不依赖 search_path）。
#[sqlx::test(migrations = false)]
async fn menu_hits_public_when_flow_shadow_exists(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    sqlx::query("CREATE SCHEMA IF NOT EXISTS flow")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS flow.core_menu_groups (LIKE public.core_menu_groups INCLUDING ALL)",
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS flow.core_menus (LIKE public.core_menus INCLUDING ALL)",
    )
    .execute(&pool)
    .await
    .unwrap();

    let prod_pool = pool_with_prod_search_path(&pool).await;
    let group_id = create_group_via_handler(&prod_pool, "grp-prod-sp", "生产路径分组").await;

    let flow_groups: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM flow.core_menu_groups")
        .fetch_one(&prod_pool)
        .await
        .unwrap();
    let public_groups: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM public.core_menu_groups")
        .fetch_one(&prod_pool)
        .await
        .unwrap();
    assert_eq!(flow_groups, 0, "flow 影子副本不应被写入");
    assert_eq!(public_groups, 1, "菜单必须写入 public 权威表");

    let resp = list_groups(
        Extension(test_txn_cell(&prod_pool).await),
        State(test_app_state(prod_pool)),
        Extension(super_claims()),
        Query(empty_group_query()),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    assert_eq!(data.total, 1);
    assert_eq!(data.items[0].id, group_id);
}
