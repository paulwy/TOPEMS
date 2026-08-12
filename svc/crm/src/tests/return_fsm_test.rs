use crate::modules::aftersales::{can_transition, ProcessType, ReturnDecision, ReturnStage};

#[test]
fn return_fsm_happy_path_refund_done() {
    use ReturnStage::*;
    assert!(can_transition(Pending, Accepted).is_ok());
    assert!(can_transition(Accepted, Processing).is_ok());
    assert!(can_transition(Processing, Resolving).is_ok());
    assert!(can_transition(Resolving, Done).is_ok());
}

#[test]
fn return_fsm_returned_branch_loops_back_to_processing() {
    use ReturnStage::*;
    assert!(can_transition(Resolving, Processing).is_ok());
    assert!(can_transition(Resolving, Rejected).is_ok());
}

#[test]
fn return_fsm_three_terminal_protection() {
    use ReturnStage::*;
    assert_eq!(
        can_transition(Done, Processing).unwrap_err(),
        "TERMINAL_CANNOT_TRANSITION"
    );
    assert_eq!(
        can_transition(Rejected, Resolving).unwrap_err(),
        "TERMINAL_CANNOT_TRANSITION"
    );
    assert_eq!(
        can_transition(Cancelled, Accepted).unwrap_err(),
        "TERMINAL_CANNOT_TRANSITION"
    );
}

#[test]
fn return_fsm_cancel_from_any_non_terminal() {
    use ReturnStage::*;
    assert!(can_transition(Pending, Cancelled).is_ok());
    assert!(can_transition(Accepted, Cancelled).is_ok());
    assert!(can_transition(Processing, Cancelled).is_ok());
    assert!(can_transition(Resolving, Cancelled).is_ok());
}

#[test]
fn return_fsm_invalid_cross_stage_rejected() {
    use ReturnStage::*;
    assert_eq!(
        can_transition(Pending, Processing).unwrap_err(),
        "INVALID_TRANSITION"
    );
    assert_eq!(
        can_transition(Pending, Resolving).unwrap_err(),
        "INVALID_TRANSITION"
    );
    assert_eq!(
        can_transition(Pending, Done).unwrap_err(),
        "INVALID_TRANSITION"
    );
    assert_eq!(
        can_transition(Accepted, Done).unwrap_err(),
        "INVALID_TRANSITION"
    );
    assert_eq!(
        can_transition(Processing, Done).unwrap_err(),
        "INVALID_TRANSITION"
    );
    assert_eq!(
        can_transition(Processing, Accepted).unwrap_err(),
        "INVALID_TRANSITION"
    );
}

#[test]
fn return_fsm_stage_from_str_roundtrip() {
    let all = [
        ("pending", ReturnStage::Pending),
        ("accepted", ReturnStage::Accepted),
        ("processing", ReturnStage::Processing),
        ("resolving", ReturnStage::Resolving),
        ("done", ReturnStage::Done),
        ("rejected", ReturnStage::Rejected),
        ("cancelled", ReturnStage::Cancelled),
    ];
    for (s, stage) in &all {
        let parsed = ReturnStage::from_str(s).expect("should parse");
        assert_eq!(&parsed, stage);
        assert_eq!(parsed.as_str(), *s);
    }
    assert!(ReturnStage::from_str("unknown").is_none());
    assert!(ReturnStage::from_str("").is_none());
}

#[test]
fn return_fsm_is_terminal_matches_three() {
    use ReturnStage::*;
    assert!(Done.is_terminal());
    assert!(Rejected.is_terminal());
    assert!(Cancelled.is_terminal());
    assert!(!Pending.is_terminal());
    assert!(!Accepted.is_terminal());
    assert!(!Processing.is_terminal());
    assert!(!Resolving.is_terminal());
}

#[test]
fn return_fsm_returned_loop_processing_resolving_cycle() {
    use ReturnStage::*;
    for _ in 0..3 {
        assert!(can_transition(Processing, Resolving).is_ok());
        assert!(can_transition(Resolving, Processing).is_ok());
    }
}

#[test]
fn return_fsm_enums_variants_debug_not_empty() {
    use ReturnStage::*;
    for s in [
        Pending, Accepted, Processing, Resolving, Done, Rejected, Cancelled,
    ] {
        let dbg = format!("{:?}", s);
        assert!(!dbg.is_empty());
    }

    use ReturnDecision::*;
    for d in [
        Accept,
        Process,
        Resolve,
        ConfirmDone,
        ReturnedToProcessing,
        Reject,
        Cancel,
    ] {
        let dbg = format!("{:?}", d);
        assert!(!dbg.is_empty());
    }

    use ProcessType::*;
    for p in [Refund, Exchange, Repair] {
        let dbg = format!("{:?}", p);
        assert!(!dbg.is_empty());
    }
}

#[test]
fn return_fsm_clone_eq_partial_ord_sanity() {
    use ReturnStage::*;
    let a = Pending;
    let b = a;
    assert_eq!(a, b);
    let c = Accepted;
    assert_ne!(a, c);
    let cloned = c.clone();
    assert_eq!(cloned, c);
    assert_eq!(cloned as u32, Accepted as u32);
}
