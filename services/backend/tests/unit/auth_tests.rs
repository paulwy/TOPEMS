use topems_erp::middleware::auth::*;

#[cfg(test)]
mod auth_tests {
    use super::*;

    #[test]
    fn test_init_middleware() {
        init_middleware();
    }

    #[test]
    fn test_auth_module_initialization() {
        let result = std::panic::catch_unwind(|| {
            init_middleware();
        });
        assert!(result.is_ok());
    }
}
