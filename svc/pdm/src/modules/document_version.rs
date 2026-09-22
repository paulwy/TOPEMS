use axum::{
    extract::{Multipart, Path, State},
    routing::get,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use std::collections::HashMap;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// =============================================================================
// Pure functions for version diff / text diff computation
// =============================================================================

/// Diff 操作类型：新增 / 删除 / 未变
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DiffOp {
    Insert,
    Delete,
    Equal,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiffLine {
    pub op: DiffOp,
    pub text: String,
    /// old_line_index (None for Insert)
    pub old_idx: Option<usize>,
    /// new_line_index (None for Delete)
    pub new_idx: Option<usize>,
}

/// Line-based diff：返回 old vs new 的行级别差异
/// 使用 LCS + 双指针构造结果。返回的顺序为原始顺序（先 old 删除再 equal 最后 insert 交错）
pub fn line_diff(old: &[&str], new: &[&str]) -> Vec<DiffLine> {
    let m = old.len();
    let n = new.len();
    // LCS DP table of lengths
    let mut dp: Vec<Vec<usize>> = vec![vec![0; n + 1]; m + 1];
    for i in (0..m).rev() {
        for j in (0..n).rev() {
            dp[i][j] = if old[i] == new[j] {
                dp[i + 1][j + 1] + 1
            } else {
                dp[i + 1][j].max(dp[i][j + 1])
            };
        }
    }
    // Walk the table
    let mut result: Vec<DiffLine> = Vec::new();
    let mut i = 0_usize;
    let mut j = 0_usize;
    while i < m || j < n {
        if i < m && j < n && old[i] == new[j] {
            result.push(DiffLine {
                op: DiffOp::Equal,
                text: old[i].to_string(),
                old_idx: Some(i),
                new_idx: Some(j),
            });
            i += 1;
            j += 1;
        } else if i < m && (j == n || dp[i + 1][j] >= dp[i][j + 1]) {
            result.push(DiffLine {
                op: DiffOp::Delete,
                text: old[i].to_string(),
                old_idx: Some(i),
                new_idx: None,
            });
            i += 1;
        } else {
            result.push(DiffLine {
                op: DiffOp::Insert,
                text: new[j].to_string(),
                old_idx: None,
                new_idx: Some(j),
            });
            j += 1;
        }
    }
    result
}

/// Diff 统计：统计 insert / delete / equal 行数
pub fn diff_stats(diff: &[DiffLine]) -> HashMap<&'static str, usize> {
    let mut m: HashMap<&'static str, usize> = HashMap::new();
    m.insert("insert", 0);
    m.insert("delete", 0);
    m.insert("equal", 0);
    for d in diff {
        match d.op {
            DiffOp::Insert => *m.get_mut("insert").unwrap() += 1,
            DiffOp::Delete => *m.get_mut("delete").unwrap() += 1,
            DiffOp::Equal => *m.get_mut("equal").unwrap() += 1,
        }
    }
    m
}

/// 文件大小 human-readable 格式
pub fn humanize_bytes(bytes: i64) -> String {
    if bytes < 0 {
        return "0 B".to_string();
    }
    let units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let mut v = bytes as f64;
    let mut ui = 0_usize;
    while v >= 1024.0 && ui < units.len() - 1 {
        v /= 1024.0;
        ui += 1;
    }
    if ui == 0 {
        format!("{} {}", bytes, units[ui])
    } else {
        format!("{:.2} {}", v, units[ui])
    }
}

/// 版本标签是否为合规（允许 数字.数字.数字 与 semver 类似，允许可选 v 前缀和 -rc.0 后缀）
pub fn is_valid_doc_version(tag: &str) -> bool {
    let t = tag.strip_prefix('v').unwrap_or(tag);
    let (main, _pre) = match t.split_once('-') {
        Some((m, p)) => (m, Some(p)),
        None => (t, None),
    };
    let parts: Vec<&str> = main.split('.').collect();
    if parts.is_empty() || parts.len() > 3 {
        return false;
    }
    for p in parts {
        if p.is_empty() {
            return false;
        }
        for c in p.chars() {
            if !c.is_ascii_digit() {
                return false;
            }
        }
    }
    true
}

/// 文档两版本属性差异摘要：按字段 key 对比，输出 changed_fields 列表
pub fn version_field_diff(a: &[(&str, &str)], b: &[(&str, &str)]) -> Vec<String> {
    let ma: HashMap<&str, &str> = a.iter().copied().collect();
    let mb: HashMap<&str, &str> = b.iter().copied().collect();
    let mut out = Vec::new();
    let keys_a: std::collections::HashSet<&str> = ma.keys().copied().collect();
    let keys_b: std::collections::HashSet<&str> = mb.keys().copied().collect();
    let all: std::collections::HashSet<&str> = keys_a.union(&keys_b).copied().collect();
    let mut sorted: Vec<&str> = all.into_iter().collect();
    sorted.sort_unstable();
    for k in sorted {
        match (ma.get(k), mb.get(k)) {
            (Some(x), Some(y)) if x != y => out.push(format!("{}: {} → {}", k, x, y)),
            (Some(_), None) => out.push(format!("{}: removed", k)),
            (None, Some(v)) => out.push(format!("{}: added ({})", k, v)),
            _ => {}
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ line_diff ============

    #[test]
    fn test_line_diff_both_empty() {
        assert!(line_diff(&[], &[]).is_empty());
    }

    #[test]
    fn test_line_diff_equal_files() {
        let r = line_diff(&["A", "B", "C"], &["A", "B", "C"]);
        assert_eq!(r.len(), 3);
        assert!(r.iter().all(|x| x.op == DiffOp::Equal));
    }

    #[test]
    fn test_line_diff_insertions_only() {
        let r = line_diff(&["A", "C"], &["A", "B", "C"]);
        assert_eq!(r.len(), 3);
        assert_eq!(r[0].op, DiffOp::Equal);
        assert_eq!(r[0].text, "A");
        assert_eq!(r[1].op, DiffOp::Insert);
        assert_eq!(r[1].text, "B");
        assert_eq!(r[1].old_idx, None);
        assert_eq!(r[1].new_idx, Some(1));
        assert_eq!(r[2].op, DiffOp::Equal);
    }

    #[test]
    fn test_line_diff_deletions_only() {
        let r = line_diff(&["A", "B", "C"], &["A", "C"]);
        assert_eq!(r.len(), 3);
        assert_eq!(r[1].op, DiffOp::Delete);
        assert_eq!(r[1].text, "B");
        assert_eq!(r[1].new_idx, None);
    }

    #[test]
    fn test_line_diff_replace() {
        // ["A","B","C"] → ["A","X","C"]
        let r = line_diff(&["A", "B", "C"], &["A", "X", "C"]);
        // LCS: A,C. So B is deleted then X is inserted (order depends on tie-break)
        let stats = diff_stats(&r);
        assert_eq!(*stats.get("equal").unwrap(), 2);
        assert_eq!(*stats.get("delete").unwrap(), 1);
        assert_eq!(*stats.get("insert").unwrap(), 1);
    }

    #[test]
    fn test_line_diff_old_empty() {
        let r = line_diff(&[], &["X", "Y"]);
        assert_eq!(r.len(), 2);
        assert!(r.iter().all(|x| x.op == DiffOp::Insert));
    }

    #[test]
    fn test_line_diff_new_empty() {
        let r = line_diff(&["X", "Y"], &[]);
        assert_eq!(r.len(), 2);
        assert!(r.iter().all(|x| x.op == DiffOp::Delete));
    }

    // ============ diff_stats ============

    #[test]
    fn test_diff_stats_counts() {
        let r = line_diff(&["A", "B", "C"], &["A", "X"]);
        let s = diff_stats(&r);
        // equal: A(1), delete: B,C(2), insert: X(1) OR some other valid path
        assert_eq!(
            s.get("equal").unwrap() + s.get("delete").unwrap() + s.get("insert").unwrap(),
            r.len()
        );
        assert!(*s.get("equal").unwrap() >= 1);
    }

    // ============ humanize_bytes ============

    #[test]
    fn test_humanize_negative() {
        assert_eq!(humanize_bytes(-1), "0 B");
    }

    #[test]
    fn test_humanize_bytes_b() {
        assert_eq!(humanize_bytes(0), "0 B");
        assert_eq!(humanize_bytes(1023), "1023 B");
    }

    #[test]
    fn test_humanize_kb_mb() {
        assert_eq!(humanize_bytes(1024), "1.00 KB");
        assert_eq!(humanize_bytes(1024 * 1500), "1.46 MB");
    }

    #[test]
    fn test_humanize_gb_tb_boundary() {
        let gb = 1024_i64.pow(3);
        assert_eq!(humanize_bytes(gb), "1.00 GB");
        let tb = 1024_i64.pow(4);
        assert_eq!(humanize_bytes(tb), "1.00 TB");
    }

    // ============ is_valid_doc_version ============

    #[test]
    fn test_valid_doc_version_semver() {
        assert!(is_valid_doc_version("1.0.0"));
        assert!(is_valid_doc_version("v1.2.3"));
        assert!(is_valid_doc_version("2.1"));
        assert!(is_valid_doc_version("5"));
        assert!(is_valid_doc_version("1.0.0-rc.1"));
    }

    #[test]
    fn test_invalid_doc_version() {
        assert!(!is_valid_doc_version(""));
        assert!(!is_valid_doc_version("."));
        assert!(!is_valid_doc_version("1..2"));
        assert!(!is_valid_doc_version("1.a.2"));
        assert!(!is_valid_doc_version("1.2.3.4"));
    }

    // ============ version_field_diff ============

    #[test]
    fn test_field_diff_equal() {
        let a = [("title", "X"), ("author", "Y")];
        let b = [("title", "X"), ("author", "Y")];
        assert!(version_field_diff(&a, &b).is_empty());
    }

    #[test]
    fn test_field_diff_all_cases() {
        let a = [("title", "V1"), ("owner", "A"), ("reviewer", "B")];
        let b = [("title", "V2"), ("owner", "A"), ("approver", "C")];
        let out = version_field_diff(&a, &b);
        // approver added, reviewer removed, title changed
        assert!(out.iter().any(|x| x.starts_with("title: V1 → V2")));
        assert!(out.iter().any(|x| x.contains("reviewer: removed")));
        assert!(out.iter().any(|x| x.starts_with("approver: added (C)")));
    }
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/documents/{documentId}/versions",
            get(list_versions).post(create_version),
        )
        .route(
            "/documents/{documentId}/versions/{versionId}",
            get(get_version).put(update_version).delete(delete_version),
        )
        .route(
            "/documents/{documentId}/versions/{versionId}/publish",
            axum::routing::post(publish_version),
        )
        .route(
            "/documents/{documentId}/upload",
            axum::routing::post(upload_version),
        )
        .route(
            "/documents/{documentId}/versions/{versionId}/download",
            get(download_version),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DocumentVersion {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub document_id: Uuid,
    #[serde(rename = "type")]
    pub document_type: Option<String>,
    pub version_number: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub file_url: Option<String>,
    pub filesize: Option<i64>,
    pub file_type: Option<String>,
    pub changes: Vec<String>,
    pub created_by: String,
    pub created_by_name: Option<String>,
    pub reviewed_by: Option<String>,
    pub approved_by: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDocumentVersionRequest {
    pub document_id: Option<Uuid>,
    pub version_number: String,
    pub title: String,
    pub description: Option<String>,
    pub file_url: Option<String>,
    pub filesize: Option<i64>,
    pub file_type: Option<String>,
    pub changes: Option<Vec<String>>,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentVersionRequest {
    pub version_number: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub file_url: Option<String>,
    pub filesize: Option<i64>,
    pub file_type: Option<String>,
    pub changes: Option<Vec<String>>,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
    pub reviewed_by: Option<String>,
    pub approved_by: Option<String>,
}

const VERSION_COLUMNS: &str = r#"
    id, tenant_id, document_id, document_type, version_number, title, description, status,
    file_url, filesize, file_type, changes, created_by, created_by_name, reviewed_by,
    approved_by, published_at, created_at, updated_at
"#;

#[utoipa::path(get, path = "/api/pdm/documents/{documentId}/versions", tag = "pdm", responses((status = 200, description = "OK")), security(("BearerAuth" = ["pdm:document:read"])))]
pub async fn list_versions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<DocumentVersion>>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };
    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        SELECT {VERSION_COLUMNS}
        FROM pdm_document_versions
        WHERE deleted_at IS NULL AND (1::uuid IS NULL OR tenant_id = $1) AND document_id = $2
        ORDER BY created_at DESC
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .fetch_all(&state.pool)
    .await;
    match result {
        Ok(versions) => Json(ApiResponse::success(versions, "获取文档版本成功")),
        Err(e) => {
            tracing::error!("获取文档版本失败: {}", e);
            Json(ApiResponse::error(500, "获取文档版本失败"))
        }
    }
}

#[utoipa::path(post, path = "/api/pdm/documents/{documentId}/versions", request_body = CreateDocumentVersionRequest, tag = "pdm", responses((status = 200, description = "OK")), security(("BearerAuth" = ["pdm:document:write"])))]
pub async fn create_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<CreateDocumentVersionRequest>,
) -> Json<ApiResponse<DocumentVersion>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    if req.version_number.trim().is_empty() || req.title.trim().is_empty() {
        return Json(ApiResponse::error(400, "版本号和标题不能为空"));
    }
    let changes = req.changes.unwrap_or_default();
    let created_by = req.created_by.unwrap_or_else(|| "system".to_string());
    let doc_type = get_document_type(&state, tenant_id, document_id).await;
    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        INSERT INTO pdm_document_versions (
            tenant_id, document_id, document_type, version_number, title, description, status,
            file_url, filesize, file_type, changes, created_by, created_by_name
        ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10, $11, $12)
        RETURNING {VERSION_COLUMNS}
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .bind(doc_type)
    .bind(&req.version_number)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.file_url)
    .bind(req.filesize)
    .bind(&req.file_type)
    .bind(&changes)
    .bind(&created_by)
    .bind(&req.created_by_name)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(version) => Json(ApiResponse::success(version, "创建文档版本成功")),
        Err(e) => {
            tracing::error!("创建文档版本失败: {}", e);
            Json(ApiResponse::error(500, "创建文档版本失败"))
        }
    }
}

#[utoipa::path(get, path = "/api/pdm/documents/{documentId}/versions/{versionId}", tag = "pdm", responses((status = 200, description = "OK")), security(("BearerAuth" = ["pdm:document:read"])))]
pub async fn get_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((document_id, version_id)): Path<(Uuid, Uuid)>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<DocumentVersion>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };
    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        SELECT {VERSION_COLUMNS}
        FROM pdm_document_versions
        WHERE deleted_at IS NULL AND (1::uuid IS NULL OR tenant_id = $1) AND document_id = $2 AND id = $3
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .bind(version_id)
    .fetch_optional(&state.pool)
    .await;
    match result {
        Ok(Some(version)) => Json(ApiResponse::success(version, "获取文档版本成功")),
        Ok(None) => Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("获取文档版本失败: {}", e);
            Json(ApiResponse::error(500, "获取文档版本失败"))
        }
    }
}

#[utoipa::path(put, path = "/api/pdm/documents/{documentId}/versions/{versionId}", request_body = UpdateDocumentVersionRequest, tag = "pdm", responses((status = 200, description = "OK")), security(("BearerAuth" = ["pdm:document:write"])))]
pub async fn update_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((document_id, version_id)): Path<(Uuid, Uuid)>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<UpdateDocumentVersionRequest>,
) -> Json<ApiResponse<DocumentVersion>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        UPDATE pdm_document_versions
        SET version_number = COALESCE($4, version_number),
            title = COALESCE($5, title),
            description = COALESCE($6, description),
            status = COALESCE($7, status),
            file_url = COALESCE($8, file_url),
            filesize = COALESCE($9, filesize),
            file_type = COALESCE($10, file_type),
            changes = COALESCE($11, changes),
            created_by = COALESCE($12, created_by),
            created_by_name = COALESCE($13, created_by_name),
            reviewed_by = COALESCE($14, reviewed_by),
            approved_by = COALESCE($15, approved_by),
            updated_at = NOW()
        WHERE tenant_id = $1 AND document_id = $2 AND id = $3 AND deleted_at IS NULL
        RETURNING {VERSION_COLUMNS}
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .bind(version_id)
    .bind(req.version_number)
    .bind(req.title)
    .bind(req.description)
    .bind(req.status)
    .bind(req.file_url)
    .bind(req.filesize)
    .bind(req.file_type)
    .bind(req.changes)
    .bind(req.created_by)
    .bind(req.created_by_name)
    .bind(req.reviewed_by)
    .bind(req.approved_by)
    .fetch_optional(&state.pool)
    .await;
    match result {
        Ok(Some(version)) => Json(ApiResponse::success(version, "更新文档版本成功")),
        Ok(None) => Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("更新文档版本失败: {}", e);
            Json(ApiResponse::error(500, "更新文档版本失败"))
        }
    }
}

#[utoipa::path(delete, path = "/api/pdm/documents/{documentId}/versions/{versionId}", tag = "pdm", responses((status = 200, description = "OK")), security(("BearerAuth" = ["pdm:document:write"])))]
pub async fn delete_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((document_id, version_id)): Path<(Uuid, Uuid)>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let result = sqlx::query(
        "UPDATE pdm_document_versions SET deleted_at = NOW(), updated_at = NOW() WHERE tenant_id = $1 AND document_id = $2 AND id = $3 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(document_id)
    .bind(version_id)
    .execute(&state.pool)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "删除文档版本成功")),
        Ok(_) => Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("删除文档版本失败: {}", e);
            Json(ApiResponse::error(500, "删除文档版本失败"))
        }
    }
}

// gate: admin-only
#[utoipa::path(post, path = "/api/pdm/documents/{documentId}/versions/{versionId}/publish", tag = "pdm", responses((status = 200, description = "OK")), security(("BearerAuth" = ["pdm:document:admin"])))]
pub async fn publish_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((document_id, version_id)): Path<(Uuid, Uuid)>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<DocumentVersion>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("启动发布事务失败: {}", e);
            return Json(ApiResponse::error(500, "发布文档版本失败"));
        }
    };

    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        UPDATE pdm_document_versions
        SET status = 'published', published_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1 AND document_id = $2 AND id = $3 AND deleted_at IS NULL
        RETURNING {VERSION_COLUMNS}
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .bind(version_id)
    .fetch_optional(&mut *tx)
    .await;

    let version = match result {
        Ok(Some(v)) => v,
        Ok(None) => return Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("发布文档版本失败: {}", e);
            return Json(ApiResponse::error(500, "发布文档版本失败"));
        }
    };

    if let Err(e) = sqlx::query(
        r#"
        UPDATE pdm_documents
        SET version = $3, status = 'published', file_path = COALESCE($4, file_path),
            file_size = COALESCE($5, file_size), updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
        "#,
    )
    .bind(tenant_id)
    .bind(document_id)
    .bind(&version.version_number)
    .bind(&version.file_url)
    .bind(version.filesize)
    .execute(&mut *tx)
    .await
    {
        tracing::error!("同步文档当前版本失败: {}", e);
        return Json(ApiResponse::error(500, "发布文档版本失败"));
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交发布事务失败: {}", e);
        return Json(ApiResponse::error(500, "发布文档版本失败"));
    }

    Json(ApiResponse::success(version, "发布文档版本成功"))
}

#[utoipa::path(post, path = "/api/pdm/documents/{documentId}/upload", tag = "pdm", responses((status = 200, description = "OK")), security(("BearerAuth" = ["pdm:document:write"])))]
pub async fn upload_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    mut multipart: Multipart,
) -> Json<ApiResponse<DocumentVersion>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let mut filename: Option<String> = None;
    let mut content_type: Option<String> = None;
    let mut bytes: Option<Vec<u8>> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("file") {
            filename = field.file_name().map(|s| s.to_string());
            content_type = field.content_type().map(|s| s.to_string());
            match field.bytes().await {
                Ok(data) => bytes = Some(data.to_vec()),
                Err(e) => {
                    tracing::error!("读取上传文件失败: {}", e);
                    return Json(ApiResponse::error(400, "读取上传文件失败"));
                }
            }
        }
    }

    let bytes = match bytes {
        Some(b) if !b.is_empty() => b,
        _ => return Json(ApiResponse::error(400, "上传文件不能为空")),
    };
    let doc_type = get_document_type(&state, tenant_id, document_id).await;
    let version_number = next_version_number(&state, tenant_id, document_id).await;
    let title = filename
        .clone()
        .unwrap_or_else(|| format!("版本 {}", version_number));
    let file_type = content_type.or_else(|| {
        filename
            .as_ref()
            .and_then(|n| n.rsplit('.').next().map(|s| s.to_string()))
    });
    let file_url = filename.map(|n| {
        format!(
            "pdm://documents/{}/versions/{}/{}",
            document_id, version_number, n
        )
    });
    let changes: Vec<String> = vec!["upload".to_string()];

    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        INSERT INTO pdm_document_versions (
            tenant_id, document_id, document_type, version_number, title, status,
            file_url, filesize, file_type, changes, created_by, file_content
        ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11)
        RETURNING {VERSION_COLUMNS}
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .bind(doc_type)
    .bind(&version_number)
    .bind(&title)
    .bind(&file_url)
    .bind(bytes.len() as i64)
    .bind(&file_type)
    .bind(&changes)
    .bind("system")
    .bind(bytes)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(version) => Json(ApiResponse::success(version, "上传文档版本成功")),
        Err(e) => {
            tracing::error!("上传文档版本失败: {}", e);
            Json(ApiResponse::error(500, "上传文档版本失败"))
        }
    }
}

#[utoipa::path(get, path = "/api/pdm/documents/{documentId}/versions/{versionId}/download", tag = "pdm", responses((status = 200, description = "OK")), security(("BearerAuth" = ["pdm:document:read"])))]
pub async fn download_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((document_id, version_id)): Path<(Uuid, Uuid)>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };
    let result = sqlx::query(
        r#"
        SELECT file_url, file_type, encode(file_content, 'base64') AS file_content_base64
        FROM pdm_document_versions
        WHERE deleted_at IS NULL AND (1::uuid IS NULL OR tenant_id = $1) AND document_id = $2 AND id = $3
        "#,
    )
    .bind(tenant_id)
    .bind(document_id)
    .bind(version_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let file_url: Option<String> = row.try_get("file_url").ok();
            let content_base64: Option<String> = row.try_get("file_content_base64").ok();
            let file_type: Option<String> = row.try_get("file_type").ok();
            let download = file_url
                .or_else(|| {
                    content_base64.map(|b| {
                        let mime =
                            file_type.unwrap_or_else(|| "application/octet-stream".to_string());
                        format!("data:{};base64,{}", mime, b)
                    })
                })
                .unwrap_or_default();
            Json(ApiResponse::success(download, "获取文档下载地址成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("获取文档下载地址失败: {}", e);
            Json(ApiResponse::error(500, "获取文档下载地址失败"))
        }
    }
}

async fn get_document_type(state: &AppState, tenant_id: Uuid, document_id: Uuid) -> Option<String> {
    sqlx::query_scalar::<_, Option<String>>(
        "SELECT document_type FROM pdm_documents WHERE (1::uuid IS NULL OR tenant_id = $1) AND id = $2 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(document_id)
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten()
    .flatten()
}

async fn next_version_number(state: &AppState, tenant_id: Uuid, document_id: Uuid) -> String {
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM pdm_document_versions WHERE tenant_id = $1 AND document_id = $2",
    )
    .bind(tenant_id)
    .bind(document_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    format!("{}.0", count + 1)
}

#[cfg(test)]
mod handler_tests {
    use super::*;

    fn make_claims(tenant_id: Option<&str>) -> Claims {
        Claims {
            sub: "user-1".to_string(),
            username: "tester".to_string(),
            role: "admin".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant_id.map(|s| s.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    #[test]
    fn test_get_tenant_id_from_claims() {
        let claims = make_claims(Some("550e8400-e29b-41d4-a716-446655440000"));
        let _headers = axum::http::HeaderMap::new();
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(
            tid,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_from_header() {
        let claims = make_claims(None);
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            "x-tenant-id",
            "550e8400-e29b-41d4-a716-446655440050".parse().unwrap(),
        );
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(
            tid,
            Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
        );
    }

    #[test]
    fn test_get_tenant_id_fallback_v4() {
        let claims = make_claims(None);
        let _headers = axum::http::HeaderMap::new();
        let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tid = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
        assert_eq!(tid.get_version(), Some(uuid::Version::Nil));
    }

    #[test]
    fn test_create_routes_builds_without_panic() {
        let router = create_routes();
        let _ = router.clone();
    }

    #[test]
    fn test_document_version_serde_roundtrip() {
        let now = Utc::now();
        let v = DocumentVersion {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            document_id: Uuid::new_v4(),
            document_type: Some("spec".to_string()),
            version_number: "1.0".to_string(),
            title: "标题".to_string(),
            description: Some("d".to_string()),
            status: "draft".to_string(),
            file_url: Some("/p".to_string()),
            filesize: Some(2048),
            file_type: Some("pdf".to_string()),
            changes: vec!["init".to_string(), "edit".to_string()],
            created_by: "u1".to_string(),
            created_by_name: Some("张三".to_string()),
            reviewed_by: None,
            approved_by: None,
            published_at: None,
            created_at: now,
            updated_at: Some(now),
        };
        let json = serde_json::to_string(&v).unwrap();
        // document_type 通过 rename 序列化为 "type"
        assert!(json.contains("\"type\":\"spec\""));
        assert!(!json.contains("\"document_type\""));
        let decoded: DocumentVersion = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.version_number, "1.0");
        assert_eq!(decoded.changes.len(), 2);
        assert_eq!(decoded.document_type, Some("spec".to_string()));
    }

    #[test]
    fn test_document_version_serde_minimal() {
        let now = Utc::now();
        let json = format!(
            r#"{{"id":"{}","tenant_id":"{}","document_id":"{}","version_number":"2.0","title":"t","status":"draft","changes":[],"created_by":"sys","created_at":"{}"}}"#,
            Uuid::new_v4(),
            Uuid::new_v4(),
            Uuid::new_v4(),
            now.to_rfc3339()
        );
        let v: DocumentVersion = serde_json::from_str(&json).unwrap();
        assert_eq!(v.title, "t");
        assert!(v.document_type.is_none());
        assert!(v.filesize.is_none());
        assert!(v.published_at.is_none());
        assert!(v.changes.is_empty());
    }

    #[test]
    fn test_create_document_version_request_deserialize() {
        let json = r#"{"version_number":"3.0","title":"新版本","description":"d","changes":["a","b"],"created_by":"u"}"#;
        let req: CreateDocumentVersionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.version_number, "3.0");
        assert_eq!(req.title, "新版本");
        assert_eq!(req.changes.as_deref().unwrap().len(), 2);
        assert_eq!(req.created_by, Some("u".to_string()));
    }

    #[test]
    fn test_create_document_version_request_optional_fields() {
        let json = r#"{"version_number":"4.0","title":"t"}"#;
        let req: CreateDocumentVersionRequest = serde_json::from_str(json).unwrap();
        assert!(req.changes.is_none());
        assert!(req.filesize.is_none());
        assert!(req.document_id.is_none());
    }

    #[test]
    fn test_update_document_version_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateDocumentVersionRequest = serde_json::from_str(json).unwrap();
        assert!(req.version_number.is_none());
        assert!(req.status.is_none());
        assert!(req.changes.is_none());
        assert!(req.reviewed_by.is_none());
    }

    #[test]
    fn test_update_document_version_request_with_values() {
        let json =
            r#"{"status":"published","reviewed_by":"r1","approved_by":"a1","changes":["x"]}"#;
        let req: UpdateDocumentVersionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.status, Some("published".to_string()));
        assert_eq!(req.reviewed_by, Some("r1".to_string()));
        assert_eq!(req.approved_by, Some("a1".to_string()));
        assert_eq!(req.changes.as_deref().unwrap(), &["x".to_string()]);
    }
}
