//! Finance 域「假通过」结构棘轮。
//!
//! 背景（2026-11-27）：finance 里有一类端点看着成功、实际什么也没做，
//! 共同特征是**把入参丢弃后直接返回成功**：
//!   - `AutoComplianceReviewer::evaluate_rule` 恒返回 `true`，把每条合规规则都判「通过」
//!     并写进 `finance.finance_v54_review_results`——审查记录全绿，等于伪造审计轨迹；
//!   - `write_off_payment` 拿 `payable_id` / `write_off_amount` 却一个都不用，只把付款记录
//!     标成 `written_off` 就回「核销成功」——应付一分未减、付款记录已核销，账实不符；
//!   - `u8_import::import_single_voucher` 空实现 `Ok(())`，100 张凭证全部计入 success_count，
//!     库里 0 行，批次记录还写「completed」。
//!
//! 三处的写法都是 `let _ = <入参>;` + 返回成功。本棘轮读源码断言这类写法在本 crate 内为零，
//! 并对上述三个函数逐个断言「不许再假装成功」。

use std::path::{Path, PathBuf};

fn crate_src() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src")
}

fn read(rel: &str) -> String {
    let path = crate_src().join(rel);
    // 中文注释按字节切片会撞 UTF-8 边界，统一走 from_utf8_lossy。
    match std::fs::read(&path) {
        Ok(bytes) => String::from_utf8_lossy(&bytes).to_string(),
        Err(e) => panic!("读取 {} 失败: {}", path.display(), e),
    }
}

/// 递归收集 `src/**/*.rs`（相对 crate 根）。
fn rust_files(dir: &Path, out: &mut Vec<PathBuf>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            rust_files(&path, out);
        } else if path.extension().and_then(|e| e.to_str()) == Some("rs") {
            out.push(path);
        }
    }
}

/// 去掉文件末尾的 `#[cfg(test)]` 段：测试代码里的 `let _ =` 是合法写法，不该被拦住。
fn production_part(content: &str) -> &str {
    match content.find("#[cfg(test)]") {
        Some(idx) => &content[..idx],
        None => content,
    }
}

#[test]
fn finance_has_no_param_discard_stubs_in_production_code() {
    let mut files = Vec::new();
    rust_files(&crate_src(), &mut files);
    assert!(!files.is_empty(), "未找到任何 src/*.rs，路径解析可能有误");

    let mut hits: Vec<String> = Vec::new();
    for file in &files {
        let raw = std::fs::read_to_string(file)
            .unwrap_or_else(|e| panic!("读取 {} 失败: {}", file.display(), e));
        let body = production_part(&raw);
        for (idx, line) in body.lines().enumerate() {
            let trimmed = line.trim();
            let Some(rest) = trimmed.strip_prefix("let _ = ") else {
                continue;
            };
            let Some(name) = rest.strip_suffix(';') else {
                continue;
            };
            let name = name.trim();
            let is_plain_ident = !name.is_empty()
                && name
                    .chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_');
            if is_plain_ident {
                hits.push(format!(
                    "{}:{}  {}",
                    file.strip_prefix(crate_src()).unwrap_or(file).display(),
                    idx + 1,
                    trimmed
                ));
            }
        }
    }

    assert!(
        hits.is_empty(),
        "finance 生产代码里仍有「丢弃入参后返回成功」的桩写法（假通过的典型形态）：\
         要么真的实现，要么显形失败。命中：\n{}",
        hits.join("\n")
    );
}

#[test]
fn compliance_review_does_not_fabricate_a_pass() {
    let src = read("modules/risk_v54.rs");
    let prod = production_part(&src);
    assert!(
        !prod.contains("-> bool {\n        let _ = rule;"),
        "合规审查规则求值又退回「恒返回 true」的形态：等于把每条规则都判通过"
    );
    assert!(
        prod.contains("合规自动审查规则引擎尚未实现"),
        "review_entity 必须显形为未实现，不能写全绿的审查结果"
    );
}

#[test]
fn legacy_payment_write_off_does_not_claim_success_without_payable_update() {
    let src = read("services/finance/payment_record.rs");
    let prod = production_part(&src);
    assert!(
        !prod.contains("\"核销成功\""),
        "write_off_payment 在不更新应付的情况下不得再返回「核销成功」文案"
    );
    assert!(
        prod.contains("付款核销落账尚未实现"),
        "legacy 核销必须显形失败，并指向 write_off_payment_item"
    );
}

#[test]
fn u8_voucher_import_does_not_count_unwritten_vouchers_as_success() {
    let src = read("services/finance/u8_import.rs");
    let prod = production_part(&src);
    assert!(
        !prod.contains("let _ = voucher_data;"),
        "import_single_voucher 不得再是空实现（会把 0 行当成 N 张成功）"
    );
    assert!(
        prod.contains("U8 凭证导入落库尚未实现"),
        "单张落库未实现时必须返回错误，让批次记录落成 failed"
    );
}
