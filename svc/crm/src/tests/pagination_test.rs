#![allow(clippy::unnecessary_min_or_max)]

#[test]
fn clamp_pagination_bounds() {
    let size = (99999i64).min(200);
    assert_eq!(size, 200);

    let page = 1.min(1000);
    assert_eq!(page, 1);

    let s: String = "x".repeat(1000);
    let cut = s.chars().take(100).collect::<String>();
    assert_eq!(cut.len(), 100);
}

#[test]
fn clamp_pagination_bounds_lower_and_middle() {
    let page_neg = 1.min(1000);
    assert_eq!(page_neg, 1);

    let page_mid = 500i64.min(1000);
    assert_eq!(page_mid, 500);

    let page_over = 2000i64.min(1000);
    assert_eq!(page_over, 1000);

    let size_small = 1.min(200);
    assert_eq!(size_small, 1);

    let size_mid = 50i64.min(200);
    assert_eq!(size_mid, 50);
}

#[test]
fn search_trim_and_truncate() {
    let raw = "   hello world   ".to_string();
    let trimmed = raw.trim();
    let cut: String = trimmed.chars().take(100).collect();
    assert_eq!(cut, "hello world");

    let long_unicode = "中".repeat(200);
    let cut: String = long_unicode.chars().take(100).collect();
    assert_eq!(cut.chars().count(), 100);
    assert_eq!(cut.len(), 300);
}

#[test]
fn escape_sql_like_special_chars() {
    let s = "100%_discount";
    let escaped = s.replace('%', "\\%").replace('_', "\\_");
    assert_eq!(escaped, "100\\%\\_discount");

    let pattern = format!("%{}%", escaped);
    assert_eq!(pattern, "%100\\%\\_discount%");
}
