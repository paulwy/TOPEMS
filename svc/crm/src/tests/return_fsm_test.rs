#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
use crate::modules::aftersales::{ProcessType, ReturnDecision};
use crate::modules::return_status::ReturnStatus;

#[test]
fn return_status_happy_paths() {
    use ReturnStatus::*;
    assert!(Pending.can_transition_to(Accepted));
    assert!(Accepted.can_transition_to(Processing));
    assert!(Processing.can_transition_to(Completed));

    assert!(Pending.can_transition_to(Approved));
    assert!(Approved.can_transition_to(Processing));
    assert!(Processing.can_transition_to(Completed));
}

#[test]
fn return_status_reject_branch() {
    use ReturnStatus::*;
    assert!(Pending.can_transition_to(Rejected));
    assert!(Accepted.can_transition_to(Rejected));
    assert!(Processing.can_transition_to(Rejected));
}

#[test]
fn return_status_terminal_protection() {
    use ReturnStatus::*;
    for terminal in [Completed, Rejected, Cancelled] {
        assert!(terminal.is_terminal());
        for target in [
            Pending, Accepted, Approved, Processing, Completed, Rejected, Cancelled,
        ] {
            assert!(!terminal.can_transition_to(target));
        }
    }
}

#[test]
fn return_status_cancel_from_non_terminal() {
    use ReturnStatus::*;
    for status in [Pending, Accepted, Approved, Processing] {
        assert!(status.can_transition_to(Cancelled));
    }
}

#[test]
fn return_status_invalid_cross_stage_rejected() {
    use ReturnStatus::*;
    assert!(!Pending.can_transition_to(Processing));
    assert!(!Pending.can_transition_to(Completed));
    assert!(!Accepted.can_transition_to(Completed));
    assert!(!Processing.can_transition_to(Accepted));
    assert!(!Processing.can_transition_to(Approved));
}

#[test]
fn return_status_db_roundtrip_and_read_aliases() {
    for value in ReturnStatus::DB_VALUES {
        let parsed = ReturnStatus::from_db_str(value).expect("should parse");
        assert_eq!(parsed.as_db_str(), value);
    }
    assert_eq!(
        ReturnStatus::from_read_str("resolving"),
        Some(ReturnStatus::Processing)
    );
    assert_eq!(
        ReturnStatus::from_read_str("received"),
        Some(ReturnStatus::Processing)
    );
    assert_eq!(
        ReturnStatus::from_read_str("done"),
        Some(ReturnStatus::Completed)
    );
    assert!(ReturnStatus::from_db_str("unknown").is_none());
    assert!(ReturnStatus::from_db_str("").is_none());
}

#[test]
fn return_status_debug_not_empty() {
    for status in [
        ReturnStatus::Pending,
        ReturnStatus::Accepted,
        ReturnStatus::Approved,
        ReturnStatus::Processing,
        ReturnStatus::Completed,
        ReturnStatus::Rejected,
        ReturnStatus::Cancelled,
    ] {
        assert!(!format!("{:?}", status).is_empty());
    }

    use ReturnDecision::*;
    for decision in [
        Accept,
        Process,
        Resolve,
        ConfirmDone,
        ReturnedToProcessing,
        Reject,
        Cancel,
    ] {
        assert!(!format!("{:?}", decision).is_empty());
    }

    use ProcessType::*;
    for process_type in [Refund, Exchange, Repair] {
        assert!(!format!("{:?}", process_type).is_empty());
    }
}

#[test]
fn return_status_clone_eq_sanity() {
    let a = ReturnStatus::Pending;
    let b = a;
    assert_eq!(a, b);
    let c = ReturnStatus::Accepted;
    assert_ne!(a, c);
    let cloned = c;
    assert_eq!(cloned, c);
}
