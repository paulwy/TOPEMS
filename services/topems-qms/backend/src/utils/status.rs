use thiserror::Error;

/// 质量问题状态
#[derive(Debug, Clone, PartialEq)]
pub enum IssueStatus {
    Open,
    InProgress,
    Resolved,
    Closed,
}

impl IssueStatus {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "open" => Some(IssueStatus::Open),
            "in_progress" => Some(IssueStatus::InProgress),
            "resolved" => Some(IssueStatus::Resolved),
            "closed" => Some(IssueStatus::Closed),
            _ => None,
        }
    }
    
    pub fn as_str(&self) -> &'static str {
        match self {
            IssueStatus::Open => "open",
            IssueStatus::InProgress => "in_progress",
            IssueStatus::Resolved => "resolved",
            IssueStatus::Closed => "closed",
        }
    }
    
    /// 检查状态流转是否合法
    pub fn can_transition_to(&self, target: &IssueStatus) -> bool {
        match self {
            IssueStatus::Open => {
                // open -> in_progress, resolved, closed
                target == &IssueStatus::InProgress 
                    || target == &IssueStatus::Resolved 
                    || target == &IssueStatus::Closed
            }
            IssueStatus::InProgress => {
                // in_progress -> resolved, closed
                target == &IssueStatus::Resolved 
                    || target == &IssueStatus::Closed
            }
            IssueStatus::Resolved => {
                // resolved -> closed, open ( reopened)
                target == &IssueStatus::Closed 
                    || target == &IssueStatus::Open
            }
            IssueStatus::Closed => {
                // closed -> open (reopened)
                target == &IssueStatus::Open
            }
        }
    }
}

/// 纠正措施状态
#[derive(Debug, Clone, PartialEq)]
pub enum ActionStatus {
    Pending,
    InProgress,
    Implemented,
    Verified,
    Closed,
}

impl ActionStatus {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(ActionStatus::Pending),
            "in_progress" => Some(ActionStatus::InProgress),
            "implemented" => Some(ActionStatus::Implemented),
            "verified" => Some(ActionStatus::Verified),
            "closed" => Some(ActionStatus::Closed),
            _ => None,
        }
    }
    
    pub fn as_str(&self) -> &'static str {
        match self {
            ActionStatus::Pending => "pending",
            ActionStatus::InProgress => "in_progress",
            ActionStatus::Implemented => "implemented",
            ActionStatus::Verified => "verified",
            ActionStatus::Closed => "closed",
        }
    }
    
    /// 检查状态流转是否合法
    pub fn can_transition_to(&self, target: &ActionStatus) -> bool {
        match self {
            ActionStatus::Pending => {
                // pending -> in_progress, closed
                target == &ActionStatus::InProgress 
                    || target == &ActionStatus::Closed
            }
            ActionStatus::InProgress => {
                // in_progress -> implemented, closed
                target == &ActionStatus::Implemented 
                    || target == &ActionStatus::Closed
            }
            ActionStatus::Implemented => {
                // implemented -> verified, closed
                target == &ActionStatus::Verified 
                    || target == &ActionStatus::Closed
            }
            ActionStatus::Verified => {
                // verified -> closed
                target == &ActionStatus::Closed
            }
            ActionStatus::Closed => {
                // closed -> pending (reopened)
                target == &ActionStatus::Pending
            }
        }
    }
}

/// 检查状态
#[derive(Debug, Clone, PartialEq)]
pub enum InspectionStatus {
    Pending,
    InProgress,
    Completed,
}

impl InspectionStatus {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(InspectionStatus::Pending),
            "in_progress" => Some(InspectionStatus::InProgress),
            "completed" => Some(InspectionStatus::Completed),
            _ => None,
        }
    }
    
    pub fn as_str(&self) -> &'static str {
        match self {
            InspectionStatus::Pending => "pending",
            InspectionStatus::InProgress => "in_progress",
            InspectionStatus::Completed => "completed",
        }
    }
    
    /// 检查状态流转是否合法
    pub fn can_transition_to(&self, target: &InspectionStatus) -> bool {
        match self {
            InspectionStatus::Pending => {
                // pending -> in_progress, completed
                target == &InspectionStatus::InProgress 
                    || target == &InspectionStatus::Completed
            }
            InspectionStatus::InProgress => {
                // in_progress -> completed
                target == &InspectionStatus::Completed
            }
            InspectionStatus::Completed => {
                // completed -> pending (reopened)
                target == &InspectionStatus::Pending
            }
        }
    }
}

#[derive(Error, Debug)]
pub enum StatusError {
    #[error("无效的状态: {0}")]
    InvalidStatus(String),
    #[error("不允许从 {from} 状态转换到 {to} 状态")]
    InvalidTransition { from: String, to: String },
}

/// 验证问题状态流转
pub fn validate_issue_status_transition(from: &str, to: &str) -> Result<(), StatusError> {
    let from_status = IssueStatus::from_str(from)
        .ok_or_else(|| StatusError::InvalidStatus(from.to_string()))?;
    let to_status = IssueStatus::from_str(to)
        .ok_or_else(|| StatusError::InvalidStatus(to.to_string()))?;
    
    if !from_status.can_transition_to(&to_status) {
        return Err(StatusError::InvalidTransition {
            from: from.to_string(),
            to: to.to_string(),
        });
    }
    
    Ok(())
}

/// 验证纠正措施状态流转
pub fn validate_action_status_transition(from: &str, to: &str) -> Result<(), StatusError> {
    let from_status = ActionStatus::from_str(from)
        .ok_or_else(|| StatusError::InvalidStatus(from.to_string()))?;
    let to_status = ActionStatus::from_str(to)
        .ok_or_else(|| StatusError::InvalidStatus(to.to_string()))?;
    
    if !from_status.can_transition_to(&to_status) {
        return Err(StatusError::InvalidTransition {
            from: from.to_string(),
            to: to.to_string(),
        });
    }
    
    Ok(())
}

/// 验证检查状态流转
pub fn validate_inspection_status_transition(from: &str, to: &str) -> Result<(), StatusError> {
    let from_status = InspectionStatus::from_str(from)
        .ok_or_else(|| StatusError::InvalidStatus(from.to_string()))?;
    let to_status = InspectionStatus::from_str(to)
        .ok_or_else(|| StatusError::InvalidStatus(to.to_string()))?;
    
    if !from_status.can_transition_to(&to_status) {
        return Err(StatusError::InvalidTransition {
            from: from.to_string(),
            to: to.to_string(),
        });
    }
    
    Ok(())
}