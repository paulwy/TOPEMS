use uuid::Uuid;

pub fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .expect("hardcoded default tenant UUID should be valid")
}

pub fn generate_payment_no() -> String {
    let now = chrono::Local::now();
    format!(
        "PY{}{:06}",
        now.format("%Y%m%d"),
        rand::random::<u32>() % 1000000
    )
}

pub fn generate_voucher_no() -> String {
    let now = chrono::Local::now();
    format!(
        "V{}{:06}",
        now.format("%Y%m%d"),
        rand::random::<u32>() % 1000000
    )
}
