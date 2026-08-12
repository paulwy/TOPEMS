use crate::modules::opportunity::{can_transition, OppStage};

#[test]
fn opp_fsm_6_stages_3_terminal_all_adjacency_pairs() {
    use OppStage::*;
    assert!(can_transition(Draft, Lead, true).is_ok());
    assert!(can_transition(Lead, Qualified, true).is_ok());
    assert!(can_transition(Qualified, Proposal, true).is_ok());
    assert!(can_transition(Proposal, Negotiation, true).is_ok());
    assert!(can_transition(Negotiation, Won, true).is_ok());
    assert!(can_transition(Negotiation, Lost, true).is_ok());
    assert!(can_transition(Negotiation, Closed, true).is_ok());

    assert!(can_transition(Qualified, Lead, true).is_ok());
    assert!(can_transition(Proposal, Qualified, true).is_ok());
    assert!(can_transition(Negotiation, Proposal, true).is_ok());

    assert!(can_transition(Lead, Negotiation, true).is_err());

    assert!(can_transition(Won, Negotiation, true).is_err());
    assert!(can_transition(Lost, Negotiation, true).is_err());
    assert!(can_transition(Closed, Negotiation, true).is_err());

    assert_eq!(
        can_transition(Lead, Qualified, false).unwrap_err(),
        "NOT_OWNER"
    );
}

#[test]
fn opp_stage_from_str_and_back() {
    let pairs = [
        ("draft", OppStage::Draft),
        ("lead", OppStage::Lead),
        ("qualified", OppStage::Qualified),
        ("proposal", OppStage::Proposal),
        ("negotiation", OppStage::Negotiation),
        ("won", OppStage::Won),
        ("lost", OppStage::Lost),
        ("closed", OppStage::Closed),
    ];
    for (s, stage) in pairs.iter() {
        assert_eq!(OppStage::from_str(s), Some(*stage));
        assert_eq!(stage.as_str(), *s);
    }
    assert!(OppStage::from_str("unknown").is_none());
}

#[test]
fn opp_terminal_detection() {
    use OppStage::*;
    assert!(Won.is_terminal());
    assert!(Lost.is_terminal());
    assert!(Closed.is_terminal());
    assert!(!Draft.is_terminal());
    assert!(!Lead.is_terminal());
    assert!(!Qualified.is_terminal());
    assert!(!Proposal.is_terminal());
    assert!(!Negotiation.is_terminal());
}

#[test]
fn opp_fsm_invalid_transitions_detailed() {
    use OppStage::*;
    assert_eq!(
        can_transition(Won, Lead, true).unwrap_err(),
        "TERMINAL_CANNOT_TRANSITION"
    );
    assert_eq!(
        can_transition(Draft, Proposal, true).unwrap_err(),
        "INVALID_TRANSITION"
    );
    assert_eq!(
        can_transition(Proposal, Draft, true).unwrap_err(),
        "INVALID_TRANSITION"
    );
}
