//! 财务写端点权限下沉的棘轮（B375）。
//!
//! 背景：`reconcile_orders` / `audit_v52` / `risk_v54` 三个模块的整个 Router 只挂了一个
//! `finance:*:read` 细码，写端点（建单/自动对账/确认/争议/取消、审计规则 CRUD、运行审计、
//! 异常检测、预警确认、风险确认/处置、反欺诈评分、合规审查/工作流推进）在独立部署
//! （不经网关 `require_finance_write`）时对只读角色敞开。
//!
//! 本棘轮锁住「读块只放读、写块挂写门」的结构，防止后续把写端点又合并回读 Router。
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

fn split_blocks(src: &str) -> (&str, &str) {
    let read_start = src
        .find("let read_routes = Router::new()")
        .expect("read 块缺失");
    let write_start = src
        .find("let write_routes = Router::new()")
        .expect("write 块缺失");
    assert!(read_start < write_start, "read 块必须在 write 块之前");
    (&src[read_start..write_start], &src[write_start..])
}

fn assert_no_write_verb(read_block: &str, name: &str) {
    for verb in [
        "routing::post(",
        "routing::put(",
        "routing::delete(",
        ".post(",
        ".put(",
        ".delete(",
    ] {
        assert!(
            !read_block.contains(verb),
            "{name} 的读 Router 不应包含写动词 {verb}"
        );
    }
}

#[test]
fn reconcile_read_and_write_routers_are_split() {
    let src = include_str!("modules/reconcile_orders.rs");
    let (read, write) = split_blocks(src);
    assert_no_write_verb(read, "reconcile_orders");
    assert!(
        read.contains("require_permission(\"finance:reconcile_orders:read\")"),
        "读块必须挂 finance:reconcile_orders:read"
    );
    assert!(
        write.contains("require_permission(\"finance:reconcile_orders:write\")"),
        "写块必须挂 finance:reconcile_orders:write（权限字典已有该码）"
    );
    for path in [
        "\"/reconcile/auto\"",
        "\"/reconcile/{order_id}/confirm\"",
        "\"/reconcile/{order_id}/dispute\"",
        "\"/reconcile/{order_id}/cancel\"",
        "\"/reconcile/{order_id}/items/{item_id}\"",
    ] {
        assert!(write.contains(path), "写块缺少路由 {path}");
        assert!(!read.contains(path), "读块不应再包含写路由 {path}");
    }
}

#[test]
fn audit_and_risk_write_routers_require_module_admin() {
    for (name, src, read_code) in [
        (
            "audit_v52",
            include_str!("modules/audit_v52.rs"),
            "finance:audit:read",
        ),
        (
            "risk_v54",
            include_str!("modules/risk_v54.rs"),
            "finance:risk:read",
        ),
    ] {
        let (read, write) = split_blocks(src);
        assert_no_write_verb(read, name);
        assert!(
            read.contains(&format!("require_permission(\"{read_code}\")")),
            "{name} 读块必须挂 {read_code}"
        );
        // 字典里没有 audit/risk 的写码 → 写门统一用模块管理员（finance:admin）
        assert!(
            write.contains("require_module_write(\"finance\")"),
            "{name} 写块必须挂 require_module_write(\"finance\")"
        );
    }
}

#[test]
fn audit_write_routes_are_not_in_read_block() {
    let src = include_str!("modules/audit_v52.rs");
    let (read, _) = split_blocks(src);
    for path in [
        "\"/audit-v52/anomaly/detect\"",
        "\"/audit-v52/alerts/{id}/acknowledge\"",
        "\"/audit-v52/run\"",
    ] {
        assert!(!read.contains(path), "审计读块不应包含写路由 {path}");
    }
}

#[test]
fn risk_write_routes_are_not_in_read_block() {
    let src = include_str!("modules/risk_v54.rs");
    let (read, _) = split_blocks(src);
    for path in [
        "\"/finance-v54/risk/alerts/{id}/acknowledge\"",
        "\"/finance-v54/risk/alerts/{id}/resolve\"",
        "\"/finance-v54/fraud/score\"",
    ] {
        assert!(!read.contains(path), "风险读块不应包含写路由 {path}");
    }
}
