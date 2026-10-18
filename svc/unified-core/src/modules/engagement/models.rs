//! 通用评论 / 收藏（engagement）数据模型。
//!
//! 对齐前端契约 `apps/web/src/api/shared/index.ts` 的 Comment / Favorite 接口。
//! 评论为扁平结构（parent_id 记录回复锚点，首版不在服务端组装 replies 树）；
//! 收藏按当前登录用户隔离。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 通用评论（对齐前端 Comment 契约）。
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Comment {
    pub id: Uuid,
    #[serde(skip_serializing, default)]
    pub tenant_id: Uuid,
    pub content: String,
    pub author_id: String,
    pub author_name: String,
    pub entity_type: String,
    pub entity_id: String,
    #[serde(rename = "parentId", skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<Uuid>,
    /// 回复树由前端按需组装；服务端首版不下发，DB 无此列，sqlx 完全忽略。
    #[sqlx(skip)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replies: Option<Vec<Comment>>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
}

/// 创建评论请求（对齐 CreateCommentRequest）。
#[derive(Debug, Clone, Deserialize)]
pub struct CreateCommentRequest {
    pub content: String,
    pub entity_type: String,
    pub entity_id: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<Uuid>,
}

/// 更新评论请求（仅改内容，对齐 UpdateCommentRequest）。
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateCommentRequest {
    pub content: String,
}

/// 评论列表查询参数。
#[derive(Debug, Clone, Deserialize)]
pub struct CommentListQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
}

/// 通用收藏（对齐前端 Favorite 契约）。
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Favorite {
    pub id: Uuid,
    #[serde(skip_serializing, default)]
    pub tenant_id: Uuid,
    pub entity_type: String,
    pub entity_id: String,
    pub entity_name: String,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
}

/// 添加收藏请求（对齐 AddFavoriteRequest）。
#[derive(Debug, Clone, Deserialize)]
pub struct AddFavoriteRequest {
    pub entity_type: String,
    pub entity_id: String,
    #[serde(default)]
    pub entity_name: String,
}

/// 收藏查重查询参数。
#[derive(Debug, Clone, Deserialize)]
pub struct FavoriteCheckQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    fn sample_time() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2024-01-15T10:30:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    #[test]
    fn comment_serde_uses_parent_id_camel() {
        let c = Comment {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            content: "好的".to_string(),
            author_id: "u-1".to_string(),
            author_name: "alice".to_string(),
            entity_type: "document".to_string(),
            entity_id: "doc-1".to_string(),
            parent_id: Some(Uuid::new_v4()),
            replies: None,
            created_at: sample_time(),
            updated_at: Some(sample_time()),
        };
        let v: serde_json::Value = serde_json::to_value(&c).unwrap();
        // 前端契约用 camelCase 的 parentId，不应出现蛇形 parent_id
        assert!(v.get("parentId").is_some());
        assert!(v.get("parent_id").is_none());
        assert_eq!(v.get("author_name").and_then(|x| x.as_str()), Some("alice"));
    }

    #[test]
    fn favorite_serde_roundtrip() {
        let f = Favorite {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            entity_type: "document".to_string(),
            entity_id: "doc-1".to_string(),
            entity_name: "季度报告".to_string(),
            user_id: "u-1".to_string(),
            created_at: sample_time(),
        };
        let json = serde_json::to_string(&f).unwrap();
        let de: Favorite = serde_json::from_str(&json).unwrap();
        assert_eq!(de.entity_name, "季度报告");
    }

    #[test]
    fn create_comment_request_parses_parent_id() {
        let raw = r#"{"content":"回复","entity_type":"document","entity_id":"d1","parentId":"00000000-0000-0000-0000-000000000001"}"#;
        let req: CreateCommentRequest = serde_json::from_str(raw).unwrap();
        assert!(req.parent_id.is_some());
        assert_eq!(req.entity_type, "document");
    }
}
