//! OpenAPI spec 完整性守卫：权限管理 API 路径必须出现在生成的 spec 中。
//! 新增/删除 IAM 权限端点时同步维护 `expect_*` 断言，防止文档悄悄缺失。

use topems_unified_core::ApiDoc;
use utoipa::OpenApi;

fn spec_paths() -> Vec<String> {
    ApiDoc::openapi()
        .paths
        .paths
        .keys()
        .map(|p| p.to_string())
        .collect()
}

#[test]
fn iam_permission_endpoints_are_in_openapi() {
    let paths = spec_paths();
    for expect in [
        "/iam/roles",
        "/iam/roles/{id}",
        "/iam/permissions",
        "/iam/positions",
        "/iam/permissions/verify",
        "/iam/permissions/verify-multiple",
        "/iam/permissions/my-permissions",
        "/iam/users/{user_id}/permissions",
    ] {
        assert!(paths.iter().any(|p| p == expect), "spec 缺失路径: {expect}");
    }
}

#[test]
fn iam_auth_endpoints_are_in_openapi() {
    let paths = spec_paths();
    // 注：crud 系列沿用历史约定 path="/users"（不带 /iam 前缀），auth 系列为 /iam/auth/*；
    // 仅断言已在 openapi.rs 注册的路径（get_user 等未注册端点待后续补充）。
    for expect in ["/iam/auth/login", "/iam/auth/register", "/users"] {
        assert!(paths.iter().any(|p| p == expect), "spec 缺失路径: {expect}");
    }
}

#[test]
fn spec_has_no_duplicate_paths() {
    let paths = spec_paths();
    let mut seen = std::collections::HashSet::new();
    let mut dups = Vec::new();
    for p in &paths {
        if !seen.insert(p.clone()) {
            dups.push(p.clone());
        }
    }
    assert!(dups.is_empty(), "OpenAPI 存在重复路径: {dups:?}");
}
