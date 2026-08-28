//! OpenAPI 文档路由
//!
//! 提供 OpenAPI JSON 规范和交互式 API 文档查看器。
//! 使用 Redoc CDN 渲染，无需额外依赖。

use axum::response::{Html, Json};
use axum::routing::get;
use axum::Router;
use utoipa::OpenApi;

use crate::modules::openapi::IamApiDoc;
use crate::AppState;

/// OpenAPI JSON 规范端点
///
/// 返回完整的 OpenAPI 3.0 JSON 规范，可用于：
/// - Swagger UI / Redoc / Postman 等工具导入
/// - 前端代码生成
/// - API 文档自动化
async fn openapi_json() -> Json<serde_json::Value> {
    let spec = IamApiDoc::openapi();
    Json(serde_json::to_value(&spec).unwrap_or_default())
}

/// 交互式 API 文档查看器（Redoc）
///
/// 使用 Redoc CDN 渲染 OpenAPI 文档，提供：
/// - 美观的三栏布局
/// - 实时搜索
/// - 请求/响应示例
/// - 代码示例生成
async fn api_docs() -> Html<String> {
    let html = r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TOPEMS API 文档</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📚</text></svg>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 { font-size: 24px; font-weight: 600; }
        .header .info { font-size: 14px; opacity: 0.9; }
        .header .links a {
            color: white;
            text-decoration: none;
            margin-left: 20px;
            padding: 6px 12px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            font-size: 13px;
            transition: background 0.2s;
        }
        .header .links a:hover { background: rgba(255,255,255,0.3); }
        #redoc-container { height: calc(100vh - 70px); }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>📚 TOPEMS API 文档</h1>
            <div class="info">统一核心服务 API · v1.0.0</div>
        </div>
        <div class="links">
            <a href="/api-docs/openapi.json" target="_blank">📄 OpenAPI JSON</a>
            <a href="/health" target="_blank">❤️ 健康检查</a>
        </div>
    </div>
    <div id="redoc-container"></div>
    <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
    <script>
        Redoc.init(
            '/api-docs/openapi.json',
            {
                scrollYOffset: 70,
                theme: {
                    colors: {
                        primary: { main: '#667eea' },
                        http: {
                            get: '#61affe',
                            post: '#49cc90',
                            put: '#fca130',
                            delete: '#f93e3e',
                        }
                    },
                    typography: {
                        fontSize: '14px',
                        headings: { fontFamily: 'inherit' }
                    }
                }
            },
            document.getElementById('redoc-container')
        );
    </script>
</body>
</html>"#;
    Html(html.to_string())
}

/// 注册 OpenAPI 文档路由
pub fn openapi_routes() -> Router<AppState> {
    Router::new()
        .route("/api-docs", get(api_docs))
        .route("/api-docs/openapi.json", get(openapi_json))
        // 兼容常见路径
        .route("/docs", get(api_docs))
        .route("/docs/openapi.json", get(openapi_json))
        .route("/swagger", get(api_docs))
        .route("/swagger.json", get(openapi_json))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_openapi_spec_generation() {
        let spec = IamApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize");
        assert!(json.contains("openapi"));
        assert!(json.contains("TOPEMS"));
        assert!(json.contains("paths"));
    }
}
