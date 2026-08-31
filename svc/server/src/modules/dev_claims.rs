//! 开发验证模式的模拟认证中间件（真实业务模块共用）
//!
//! 真实服务 handler 通过 `Extension<Claims>` 提取用户身份（由独立部署的
//! auth_middleware 注入）。在模块化单体开发验证阶段，统一入口尚未接入完整
//! 认证体系，此中间件注入模拟 Claims 以便验证真实业务逻辑。
//! ⚠️ 生产环境必须替换为真实 auth_middleware（基于 JWT 校验）。

use topems_shared::Claims;

/// 使用默认租户（core_tenants 表真实存在的记录，满足外键约束）
const DEV_TENANT_ID: &str = "00000000-0000-0000-0000-000000000001";

pub async fn inject_dev_claims(
    mut req: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let claims = Claims {
        sub: "11111111-1111-1111-1111-111111111111".to_string(),
        username: "dev-admin".to_string(),
        role: "admin".to_string(),
        roles: vec!["admin".to_string()],
        permissions: vec!["*".to_string()],
        // is_superuser=true 使 require_permission 等权限检查全部放行
        is_superuser: true,
        exp: 4_102_444_800, // 2100-01-01
        iat: 1_700_000_000,
        email: Some("dev@topems.local".to_string()),
        department: Some("IT".to_string()),
        tenant_id: Some(DEV_TENANT_ID.to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
    };
    req.extensions_mut().insert(claims);
    next.run(req).await
}
