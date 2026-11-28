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

fn block<'a>(src: &'a str, start: &str, end: &str) -> &'a str {
    let s = src.find(start).expect("块起始标记缺失");
    let e = src[s..].find(end).expect("块结束标记缺失") + s;
    &src[s..e]
}

/// B376: 付款域读块只放 GET；建/改/删各挂字典里真实存在的细码。
#[test]
fn payment_routes_are_split_by_action() {
    let src = include_str!("modules/mod.rs");
    let read = block(
        src,
        "let payment_read_routes = Router::new()",
        "let payment_create_routes = Router::new()",
    );
    assert_no_write_verb(read, "payment_read_routes");
    assert!(
        read.contains("\"finance:payment:read\""),
        "付款读块必须挂 finance:payment:read"
    );

    for (start, end, code) in [
        (
            "let payment_create_routes = Router::new()",
            "let payment_update_routes = Router::new()",
            "finance:payment:create",
        ),
        (
            "let payment_update_routes = Router::new()",
            "let payment_delete_routes = Router::new()",
            "finance:payment:update",
        ),
        (
            "let payment_delete_routes = Router::new()",
            "let payment_admin_routes = Router::new()",
            "finance:payment:delete",
        ),
    ] {
        let w = block(src, start, end);
        assert!(w.contains(&format!("\"{code}\"")), "付款写块必须挂 {code}");
    }

    let admin = block(
        src,
        "let payment_admin_routes = Router::new()",
        "let payment_routes = Router::new()",
    );
    assert!(
        admin.contains("require_module_write(\"finance\")"),
        "付款导出必须挂模块管理员（finance:admin）"
    );
    assert!(
        !src.contains("finance:payment:admin"),
        "finance:payment:admin 不在权限字典里，注解不得再引用"
    );
}

/// B376: 应收/应付域读块只放 GET；收款单建/改/删与批量建应收应付各有写门。
#[test]
fn ar_ap_routes_are_split_by_action() {
    let src = include_str!("modules/mod.rs");
    let read = block(
        src,
        "let ar_ap_read_routes = Router::new()",
        "let ar_ap_create_routes = Router::new()",
    );
    assert_no_write_verb(read, "ar_ap_read_routes");
    assert!(
        read.contains("\"finance:receivable:read\""),
        "应收应付读块必须挂 finance:receivable:read"
    );

    for (start, end, code) in [
        (
            "let ar_ap_create_routes = Router::new()",
            "let ar_ap_batch_payable_routes = Router::new()",
            "finance:receivable:create",
        ),
        (
            "let ar_ap_batch_payable_routes = Router::new()",
            "let ar_ap_update_routes = Router::new()",
            "finance:receivable_payable:create",
        ),
        (
            "let ar_ap_update_routes = Router::new()",
            "let ar_ap_delete_routes = Router::new()",
            "finance:receivable:update",
        ),
        (
            "let ar_ap_delete_routes = Router::new()",
            "let ar_ap_routes = Router::new()",
            "finance:receivable:delete",
        ),
    ] {
        let w = block(src, start, end);
        assert!(
            w.contains(&format!("\"{code}\"")),
            "应收应付写块必须挂 {code}"
        );
    }
}

/// B376: 收款单/付款单的写路径不能回落到读块。
#[test]
fn collection_and_payment_write_paths_are_not_in_read_blocks() {
    let src = include_str!("modules/mod.rs");
    let pay_read = block(
        src,
        "let payment_read_routes = Router::new()",
        "let payment_create_routes = Router::new()",
    );
    let arap_read = block(
        src,
        "let ar_ap_read_routes = Router::new()",
        "let ar_ap_create_routes = Router::new()",
    );
    for path in [
        "\"/payments/{payment_id}/approve\"",
        "\"/payments/{payment_id}/execute\"",
        "\"/payment-records/batch-write-off\"",
    ] {
        assert!(!pay_read.contains(path), "付款读块不应包含写路由 {path}");
    }
    for path in [
        "\"/collections/write-off\"",
        "\"/collections/batch-write-off\"",
        "\"/receivables/batch\"",
    ] {
        assert!(
            !arap_read.contains(path),
            "应收应付读块不应包含写路由 {path}"
        );
    }
}
