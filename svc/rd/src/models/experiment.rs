use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

/// 试验状态（DB 契约固定小写英文）。
///
/// 历史三套写法：DB 默认 `planning`、后端创建写 `planned`、前端提交中文
/// 「进行中/已完成/暂停/失败」。本枚举统一为五态并兼容旧值与中文值。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExperimentStatus {
    Planned,
    InProgress,
    Completed,
    Paused,
    Failed,
}

impl ExperimentStatus {
    pub const DB_VALUES: [&'static str; 5] =
        ["planned", "in_progress", "completed", "paused", "failed"];
    pub const DEFAULT: Self = Self::Planned;

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Planned => "planned",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Paused => "paused",
            Self::Failed => "failed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "planned" => Some(Self::Planned),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "paused" => Some(Self::Paused),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }

    /// 兼容 DB 旧默认 `planning`、前端中文值与常见英文别名；未知值 fail-closed。
    #[must_use]
    pub fn normalize(raw: &str) -> Option<Self> {
        match raw.trim().to_lowercase().as_str() {
            "planned" | "planning" | "计划中" => Some(Self::Planned),
            "in_progress" | "in-progress" | "running" | "进行中" => Some(Self::InProgress),
            "completed" | "done" | "已完成" => Some(Self::Completed),
            "paused" | "on_hold" | "暂停" => Some(Self::Paused),
            "failed" | "failure" | "失败" => Some(Self::Failed),
            _ => None,
        }
    }

    /// 状态机：计划中可开始/失败；进行中可完成/暂停/失败；
    /// 暂停可恢复/完成/失败；已完成、失败为终态；同值幂等。
    #[must_use]
    pub const fn can_transition_to(self, target: Self) -> bool {
        matches!(
            (self, target),
            (
                Self::Planned,
                Self::Planned | Self::InProgress | Self::Failed
            ) | (
                Self::InProgress,
                Self::InProgress | Self::Completed | Self::Paused | Self::Failed
            ) | (
                Self::Paused,
                Self::Paused | Self::InProgress | Self::Completed | Self::Failed
            ) | (Self::Completed, Self::Completed)
                | (Self::Failed, Self::Failed)
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Experiment {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: String,
    /// project_id 列可空（迁移 20260918000078 建表无 NOT NULL，历史/兜底行可能为 NULL），
    /// 读模型按 Option<Uuid> 容错，避免列表/详情解码 unexpected null。
    pub project_id: Option<Uuid>,
    pub formula_id: Option<Uuid>,
    pub experiment_type: String,
    pub phase: String,
    pub status: String,
    pub objective: String,
    pub method: String,
    /// results 列可空（历史 psql 兜底行可能为 NULL），读模型按 Option 容错，避免列表解码 unexpected null。
    pub results: Option<serde_json::Value>,
    pub conclusions: Option<String>,
    /// experimenter 列可空（迁移 20260918000078 建表无 NOT NULL），读模型 Option<String> 容错 NULL 行。
    pub experimenter: Option<String>,
    pub batch_number: Option<String>,
    pub scale: Option<f64>,
    pub scale_unit: Option<String>,
    /// started_at 列可空（迁移 20260918000078 建表无 NOT NULL），读模型 Option<DateTime<Utc>> 容错 NULL 行。
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    /// 列可空；迁移对齐为 varchar 后按用户名文本存储，读模型 Option 容错历史 NULL 行。
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateExperimentRequest {
    pub name: String,
    pub code: String,
    pub project_id: Uuid,
    pub formula_id: Option<Uuid>,
    pub experiment_type: String,
    pub phase: String,
    pub objective: String,
    pub method: String,
    pub experimenter: String,
    pub batch_number: Option<String>,
    pub scale: Option<f64>,
    pub scale_unit: Option<String>,
    /// 兼容前端表单直传；缺省为 Planned，中文/旧值由 ExperimentStatus 归一。
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateExperimentRequest {
    pub name: Option<String>,
    pub status: Option<String>,
    pub results: Option<serde_json::Value>,
    pub conclusions: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
    pub batch_number: Option<String>,
    pub scale: Option<f64>,
    pub scale_unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct ExperimentRecord {
    pub id: Uuid,
    pub experiment_id: Uuid,
    pub record_type: String,
    pub content: String,
    pub attachments: Vec<String>,
    pub recorded_by: String,
    pub recorded_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct BatchTraceItem {
    pub id: Uuid,
    pub batch_number: String,
    pub experiment_id: Uuid,
    pub experiment_name: String,
    pub phase: String,
    pub formula_id: Uuid,
    pub formula_name: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2024-06-01T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn sample_experiment() -> Experiment {
        Experiment {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            name: "实验A".to_string(),
            code: "EXP-001".to_string(),
            project_id: Some(Uuid::nil()),
            formula_id: Some(Uuid::nil()),
            experiment_type: "synthesis".to_string(),
            phase: "testing".to_string(),
            status: "planned".to_string(),
            objective: "验证配方".to_string(),
            method: "对照实验".to_string(),
            results: Some(serde_json::json!({"yield": 0.95})),
            conclusions: Some("达标".to_string()),
            experimenter: Some("张三".to_string()),
            batch_number: Some("B-001".to_string()),
            scale: Some(1.5),
            scale_unit: Some("kg".to_string()),
            started_at: Some(now()),
            completed_at: None,
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_experiment_serde_roundtrip() {
        let exp = sample_experiment();
        let json = serde_json::to_string(&exp).unwrap();
        let back: Experiment = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.code, "EXP-001");
        assert_eq!(back.results, Some(serde_json::json!({"yield": 0.95})));
    }

    #[test]
    fn test_experiment_clone_preserves_serialization() {
        let exp = sample_experiment();
        let cloned = exp.clone();
        assert_eq!(
            serde_json::to_string(&exp).unwrap(),
            serde_json::to_string(&cloned).unwrap()
        );
    }

    #[test]
    fn test_experiment_debug_contains_name() {
        let exp = sample_experiment();
        let debug = format!("{:?}", exp);
        assert!(debug.contains("Experiment"));
        assert!(debug.contains("EXP-001"));
    }

    #[test]
    fn test_create_experiment_request_roundtrip() {
        let req = CreateExperimentRequest {
            name: "实验B".to_string(),
            code: "EXP-002".to_string(),
            project_id: Uuid::nil(),
            formula_id: None,
            experiment_type: "analysis".to_string(),
            phase: "formulation".to_string(),
            objective: "目标".to_string(),
            method: "方法".to_string(),
            experimenter: "李四".to_string(),
            batch_number: None,
            scale: None,
            scale_unit: None,
            status: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateExperimentRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "实验B");
        assert_eq!(back.formula_id, None);
    }

    #[test]
    fn test_update_experiment_request_roundtrip_all_none() {
        let req = UpdateExperimentRequest {
            name: None,
            status: None,
            results: None,
            conclusions: None,
            completed_at: None,
            batch_number: None,
            scale: None,
            scale_unit: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: UpdateExperimentRequest = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
    }

    #[test]
    fn test_experiment_record_roundtrip() {
        let rec = ExperimentRecord {
            id: Uuid::nil(),
            experiment_id: Uuid::nil(),
            record_type: "note".to_string(),
            content: "记录内容".to_string(),
            attachments: vec!["a.pdf".to_string(), "b.png".to_string()],
            recorded_by: "admin".to_string(),
            recorded_at: now(),
        };
        let json = serde_json::to_string(&rec).unwrap();
        let back: ExperimentRecord = serde_json::from_str(&json).unwrap();
        assert_eq!(back.attachments.len(), 2);
        assert_eq!(back.attachments[0], "a.pdf");
    }

    #[test]
    fn test_batch_trace_item_roundtrip() {
        let item = BatchTraceItem {
            id: Uuid::nil(),
            batch_number: "B-001".to_string(),
            experiment_id: Uuid::nil(),
            experiment_name: "实验A".to_string(),
            phase: "testing".to_string(),
            formula_id: Uuid::nil(),
            formula_name: "配方1".to_string(),
            status: "completed".to_string(),
            created_at: now(),
            completed_at: Some(now()),
        };
        let json = serde_json::to_string(&item).unwrap();
        let back: BatchTraceItem = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert!(back.completed_at.is_some());
    }

    #[test]
    fn test_experiment_optional_fields_none() {
        let exp = Experiment {
            formula_id: None,
            conclusions: None,
            batch_number: None,
            scale: None,
            scale_unit: None,
            completed_at: None,
            ..sample_experiment()
        };
        let json = serde_json::to_string(&exp).unwrap();
        let back: Experiment = serde_json::from_str(&json).unwrap();
        assert!(back.formula_id.is_none());
        assert!(back.completed_at.is_none());
    }

    #[test]
    fn experiment_status_db_contract_and_legacy_values() {
        assert_eq!(ExperimentStatus::DB_VALUES.len(), 5);
        assert_eq!(ExperimentStatus::DEFAULT.as_db_str(), "planned");
        for value in ExperimentStatus::DB_VALUES {
            let parsed = ExperimentStatus::from_db_str(value).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), value);
        }
        assert_eq!(
            ExperimentStatus::normalize("planning"),
            Some(ExperimentStatus::Planned)
        );
        assert_eq!(
            ExperimentStatus::normalize("进行中"),
            Some(ExperimentStatus::InProgress)
        );
        assert_eq!(
            ExperimentStatus::normalize("已完成"),
            Some(ExperimentStatus::Completed)
        );
        assert_eq!(
            ExperimentStatus::normalize("暂停"),
            Some(ExperimentStatus::Paused)
        );
        assert_eq!(
            ExperimentStatus::normalize("失败"),
            Some(ExperimentStatus::Failed)
        );
        assert_eq!(ExperimentStatus::normalize("unknown"), None);
    }

    #[test]
    fn experiment_status_transitions_guard_terminal_states() {
        assert!(ExperimentStatus::Planned.can_transition_to(ExperimentStatus::InProgress));
        assert!(ExperimentStatus::InProgress.can_transition_to(ExperimentStatus::Completed));
        assert!(ExperimentStatus::Paused.can_transition_to(ExperimentStatus::InProgress));
        assert!(!ExperimentStatus::Completed.can_transition_to(ExperimentStatus::InProgress));
        assert!(!ExperimentStatus::Failed.can_transition_to(ExperimentStatus::InProgress));
        assert!(!ExperimentStatus::Planned.can_transition_to(ExperimentStatus::Completed));
        assert!(ExperimentStatus::InProgress.can_transition_to(ExperimentStatus::InProgress));
    }
}
