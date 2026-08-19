use rust_decimal::Decimal;
use std::collections::BTreeMap;
use std::fmt;

use super::super::super::models::{PeriodStatus, VoucherStatus};

#[derive(Debug, Clone, PartialEq)]
pub struct ReverseJournalEntry {
    pub account_code: String,
    pub account_name: String,
    pub debit: Decimal,
    pub credit: Decimal,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ReverseableVoucherInput {
    pub voucher_no: String,
    pub reference_no: Option<String>,
    pub status: VoucherStatus,
    pub period_id: String,
    pub entries: Vec<ReverseJournalEntry>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ReversePeriodInput {
    pub id: String,
    pub status: PeriodStatus,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ReversalValidationError {
    OriginalNotPosted {
        actual: VoucherStatus,
    },
    OriginalPeriodMismatch {
        original_period: String,
        period_id: String,
    },
    PeriodNotOpen {
        actual: PeriodStatus,
    },
    ReversalInvalidStatus {
        actual: VoucherStatus,
    },
    ReferenceNoMismatch {
        original_voucher_no: String,
        reversal_reference_no: Option<String>,
    },
    EmptyEntries,
    EmptyAccountCode {
        index: usize,
    },
    MissingAccountInReversal {
        account_code: String,
    },
    ExtraAccountInReversal {
        account_code: String,
    },
    AccountNameMismatch {
        account_code: String,
        original_name: String,
        reversal_name: String,
    },
    DebitCreditSwapMismatch {
        account_code: String,
        original_debit: Decimal,
        original_credit: Decimal,
        reversal_debit: Decimal,
        reversal_credit: Decimal,
    },
    ZeroAmountAfterFlip {
        index: usize,
    },
}

impl fmt::Display for ReversalValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ReversalValidationError::OriginalNotPosted { actual } => {
                write!(
                    f,
                    "original voucher must be Posted to reverse, actual status: {:?}",
                    actual
                )
            }
            ReversalValidationError::OriginalPeriodMismatch {
                original_period,
                period_id,
            } => {
                write!(
                    f,
                    "original voucher period {} does not match context period {}",
                    original_period, period_id
                )
            }
            ReversalValidationError::PeriodNotOpen { actual } => {
                write!(
                    f,
                    "cannot reverse in non-Open period, actual status: {:?}",
                    actual
                )
            }
            ReversalValidationError::ReversalInvalidStatus { actual } => {
                write!(
                    f,
                    "reversal voucher must be Draft or Pending at validation time, actual: {:?}",
                    actual
                )
            }
            ReversalValidationError::ReferenceNoMismatch {
                original_voucher_no,
                reversal_reference_no,
            } => {
                write!(
                    f,
                    "reversal reference_no does not link to original: original voucher_no={}, reversal reference_no={:?}",
                    original_voucher_no, reversal_reference_no
                )
            }
            ReversalValidationError::EmptyEntries => {
                write!(f, "reversal voucher has no entries")
            }
            ReversalValidationError::EmptyAccountCode { index } => {
                write!(
                    f,
                    "reversal entry at index {} has empty account_code",
                    index
                )
            }
            ReversalValidationError::MissingAccountInReversal { account_code } => {
                write!(
                    f,
                    "account {} present in original but missing from reversal",
                    account_code
                )
            }
            ReversalValidationError::ExtraAccountInReversal { account_code } => {
                write!(
                    f,
                    "account {} present in reversal but not in original",
                    account_code
                )
            }
            ReversalValidationError::AccountNameMismatch {
                account_code,
                original_name,
                reversal_name,
            } => {
                write!(
                    f,
                    "account {} has mismatched name: original name={}, reversal name={}",
                    account_code, original_name, reversal_name
                )
            }
            ReversalValidationError::DebitCreditSwapMismatch {
                account_code,
                original_debit,
                original_credit,
                reversal_debit,
                reversal_credit,
            } => {
                write!(
                    f,
                    "account {} debit/credit swap mismatch: original (debit={}, credit={}), reversal (debit={}, credit={})",
                    account_code, original_debit, original_credit, reversal_debit, reversal_credit
                )
            }
            ReversalValidationError::ZeroAmountAfterFlip { index } => {
                write!(
                    f,
                    "reversal entry at index {} has zero amount after flipping sign",
                    index
                )
            }
        }
    }
}

impl std::error::Error for ReversalValidationError {}

pub fn validate_reverse_voucher(
    original: &ReverseableVoucherInput,
    reversal: &ReverseableVoucherInput,
    period: &ReversePeriodInput,
) -> Result<(), ReversalValidationError> {
    if !matches!(original.status, VoucherStatus::Posted) {
        return Err(ReversalValidationError::OriginalNotPosted {
            actual: original.status.clone(),
        });
    }

    if original.period_id != period.id {
        return Err(ReversalValidationError::OriginalPeriodMismatch {
            original_period: original.period_id.clone(),
            period_id: period.id.clone(),
        });
    }

    if !matches!(period.status, PeriodStatus::Open) {
        return Err(ReversalValidationError::PeriodNotOpen {
            actual: period.status.clone(),
        });
    }

    if !matches!(
        reversal.status,
        VoucherStatus::Draft | VoucherStatus::Submitted
    ) {
        return Err(ReversalValidationError::ReversalInvalidStatus {
            actual: reversal.status.clone(),
        });
    }

    match &reversal.reference_no {
        Some(ref_no) if ref_no == &original.voucher_no => {}
        other => {
            return Err(ReversalValidationError::ReferenceNoMismatch {
                original_voucher_no: original.voucher_no.clone(),
                reversal_reference_no: other.clone(),
            });
        }
    }

    if reversal.entries.is_empty() {
        return Err(ReversalValidationError::EmptyEntries);
    }

    for (i, entry) in reversal.entries.iter().enumerate() {
        if entry.account_code.trim().is_empty() {
            return Err(ReversalValidationError::EmptyAccountCode { index: i });
        }
        let flipped_debit = entry.credit;
        let flipped_credit = entry.debit;
        if flipped_debit == Decimal::ZERO && flipped_credit == Decimal::ZERO {
            return Err(ReversalValidationError::ZeroAmountAfterFlip { index: i });
        }
    }

    let mut original_by_code: BTreeMap<String, &ReverseJournalEntry> = BTreeMap::new();
    for entry in &original.entries {
        original_by_code.insert(entry.account_code.clone(), entry);
    }

    let mut reversal_by_code: BTreeMap<String, &ReverseJournalEntry> = BTreeMap::new();
    for (i, entry) in reversal.entries.iter().enumerate() {
        if reversal_by_code.contains_key(&entry.account_code) {
            continue;
        }
        reversal_by_code.insert(entry.account_code.clone(), entry);
        let _ = i;
    }

    for code in original_by_code.keys() {
        if !reversal_by_code.contains_key(code) {
            return Err(ReversalValidationError::MissingAccountInReversal {
                account_code: code.clone(),
            });
        }
    }

    for code in reversal_by_code.keys() {
        if !original_by_code.contains_key(code) {
            return Err(ReversalValidationError::ExtraAccountInReversal {
                account_code: code.clone(),
            });
        }
    }

    for (code, orig_entry) in &original_by_code {
        let rev_entry = reversal_by_code.get(code).unwrap();

        if orig_entry.account_name != rev_entry.account_name {
            return Err(ReversalValidationError::AccountNameMismatch {
                account_code: code.clone(),
                original_name: orig_entry.account_name.clone(),
                reversal_name: rev_entry.account_name.clone(),
            });
        }

        let expected_rev_debit = orig_entry.credit;
        let expected_rev_credit = orig_entry.debit;

        if rev_entry.debit != expected_rev_debit || rev_entry.credit != expected_rev_credit {
            return Err(ReversalValidationError::DebitCreditSwapMismatch {
                account_code: code.clone(),
                original_debit: orig_entry.debit,
                original_credit: orig_entry.credit,
                reversal_debit: rev_entry.debit,
                reversal_credit: rev_entry.credit,
            });
        }
    }

    Ok(())
}

#[cfg(test)]
mod reversal_tests {
    use super::super::periods::{validate_children_all_closed, PeriodValidationError};
    use super::super::trial_balance::{
        calculate_trial_balance, validate_period_close_with_trial_balance,
    };
    use super::super::voucher::{
        validate_post_entry, PostJournalEntry, PostPeriodInput, PostVoucherInput,
    };
    use super::*;
    use crate::models::JournalEntry;
    use chrono::{DateTime, Utc};

    fn rev_entry(
        account_code: &str,
        account_name: &str,
        debit: i64,
        credit: i64,
    ) -> ReverseJournalEntry {
        ReverseJournalEntry {
            account_code: account_code.to_string(),
            account_name: account_name.to_string(),
            debit: Decimal::new(debit, 0),
            credit: Decimal::new(credit, 0),
        }
    }

    fn rev_voucher(
        voucher_no: &str,
        reference_no: Option<&str>,
        status: VoucherStatus,
        period_id: &str,
        entries: Vec<ReverseJournalEntry>,
    ) -> ReverseableVoucherInput {
        ReverseableVoucherInput {
            voucher_no: voucher_no.to_string(),
            reference_no: reference_no.map(|s| s.to_string()),
            status,
            period_id: period_id.to_string(),
            entries,
        }
    }

    fn rev_period(id: &str, status: PeriodStatus) -> ReversePeriodInput {
        ReversePeriodInput {
            id: id.to_string(),
            status,
        }
    }

    fn original_posted_2line() -> (
        ReverseableVoucherInput,
        ReverseableVoucherInput,
        ReversePeriodInput,
    ) {
        let orig_entries = vec![
            rev_entry("1001", "库存现金", 1000, 0),
            rev_entry("2001", "应付账款", 0, 1000),
        ];
        let rev_entries = vec![
            rev_entry("1001", "库存现金", 0, 1000),
            rev_entry("2001", "应付账款", 1000, 0),
        ];
        let orig = rev_voucher(
            "记2026080001",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let rev = rev_voucher(
            "记2026080002",
            Some("记2026080001"),
            VoucherStatus::Draft,
            "202608",
            rev_entries,
        );
        let period = rev_period("202608", PeriodStatus::Open);
        (orig, rev, period)
    }

    // ===== Rule 1: OriginalNotPosted =====

    #[test]
    fn test_rev_err_original_draft() {
        let (mut orig, rev, period) = original_posted_2line();
        orig.status = VoucherStatus::Draft;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::OriginalNotPosted {
                actual: VoucherStatus::Draft
            }
        ));
        assert!(format!("{}", e).contains("must be Posted"));
    }

    #[test]
    fn test_rev_err_original_submitted() {
        let (mut orig, rev, period) = original_posted_2line();
        orig.status = VoucherStatus::Submitted;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::OriginalNotPosted {
                actual: VoucherStatus::Submitted
            }
        ));
    }

    #[test]
    fn test_rev_err_original_approved() {
        let (mut orig, rev, period) = original_posted_2line();
        orig.status = VoucherStatus::Approved;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::OriginalNotPosted {
                actual: VoucherStatus::Approved
            }
        ));
    }

    #[test]
    fn test_rev_err_original_reversed() {
        let (mut orig, rev, period) = original_posted_2line();
        orig.status = VoucherStatus::Reversed;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::OriginalNotPosted {
                actual: VoucherStatus::Reversed
            }
        ));
    }

    // ===== Rule 2: OriginalPeriodMismatch =====

    #[test]
    fn test_rev_err_period_mismatch_different_month() {
        let (orig, rev, _period) = original_posted_2line();
        let period = rev_period("202609", PeriodStatus::Open);
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::OriginalPeriodMismatch {
                ref original_period,
                ref period_id,
            }
            if original_period == "202608" && period_id == "202609"
        ));
        assert!(format!("{}", e).contains("does not match"));
    }

    #[test]
    fn test_rev_err_period_mismatch_different_year() {
        let (orig, rev, _period) = original_posted_2line();
        let period = rev_period("202508", PeriodStatus::Open);
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::OriginalPeriodMismatch { .. }
        ));
    }

    // ===== Rule 3: PeriodNotOpen =====

    #[test]
    fn test_rev_err_period_closed() {
        let (orig, rev, _period) = original_posted_2line();
        let period = rev_period("202608", PeriodStatus::Closed);
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::PeriodNotOpen {
                actual: PeriodStatus::Closed
            }
        ));
        assert!(format!("{}", e).contains("non-Open"));
    }

    #[test]
    fn test_rev_err_period_closing() {
        let (orig, rev, _period) = original_posted_2line();
        let period = rev_period("202608", PeriodStatus::Closing);
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::PeriodNotOpen {
                actual: PeriodStatus::Closing
            }
        ));
    }

    // ===== Rule 6: ReversalInvalidStatus =====

    #[test]
    fn test_rev_err_reversal_posted() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.status = VoucherStatus::Posted;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::ReversalInvalidStatus {
                actual: VoucherStatus::Posted
            }
        ));
        assert!(format!("{}", e).contains("Draft or Pending"));
    }

    #[test]
    fn test_rev_err_reversal_approved() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.status = VoucherStatus::Approved;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::ReversalInvalidStatus {
                actual: VoucherStatus::Approved
            }
        ));
    }

    #[test]
    fn test_rev_err_reversal_reversed() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.status = VoucherStatus::Reversed;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::ReversalInvalidStatus {
                actual: VoucherStatus::Reversed
            }
        ));
    }

    // ===== Rule 7: ReferenceNoMismatch =====

    #[test]
    fn test_rev_err_reference_none() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.reference_no = None;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::ReferenceNoMismatch {
                ref original_voucher_no,
                reversal_reference_no: None,
            }
            if original_voucher_no == "记2026080001"
        ));
        assert!(format!("{}", e).contains("does not link"));
    }

    #[test]
    fn test_rev_err_reference_wrong_value() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.reference_no = Some("记2026089999".to_string());
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::ReferenceNoMismatch {
                reversal_reference_no: Some(_),
                ..
            }
        ));
    }

    // ===== EmptyEntries =====

    #[test]
    fn test_rev_err_empty_entries() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries = vec![];
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(e, ReversalValidationError::EmptyEntries));
        assert!(format!("{}", e).contains("no entries"));
    }

    // ===== EmptyAccountCode =====

    #[test]
    fn test_rev_err_empty_account_code_first() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries[0].account_code = "".to_string();
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::EmptyAccountCode { index: 0 }
        ));
    }

    #[test]
    fn test_rev_err_whitespace_account_code() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries[1].account_code = "   ".to_string();
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::EmptyAccountCode { index: 1 }
        ));
    }

    // ===== Rule 4a: MissingAccountInReversal =====

    #[test]
    fn test_rev_err_missing_one_account() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries = vec![rev_entry("1001", "库存现金", 0, 1000)];
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::MissingAccountInReversal { ref account_code }
            if account_code == "2001"
        ));
        assert!(format!("{}", e).contains("missing from reversal"));
    }

    #[test]
    fn test_rev_err_missing_second_account() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries = vec![rev_entry("2001", "应付账款", 1000, 0)];
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::MissingAccountInReversal { ref account_code }
            if account_code == "1001"
        ));
    }

    // ===== Rule 4b: ExtraAccountInReversal =====

    #[test]
    fn test_rev_err_extra_account() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries.push(rev_entry("3001", "实收资本", 500, 0));
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::ExtraAccountInReversal { ref account_code }
            if account_code == "3001"
        ));
        assert!(format!("{}", e).contains("present in reversal but not"));
    }

    #[test]
    fn test_rev_err_two_extra_accounts() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries.push(rev_entry("1002", "银行存款", 500, 0));
        rev.entries.push(rev_entry("4001", "主营业务收入", 0, 500));
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
    }

    // ===== Rule 4c: AccountNameMismatch =====

    #[test]
    fn test_rev_err_account_name_mismatch() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries[0].account_name = "库存现金-错误".to_string();
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::AccountNameMismatch {
                ref account_code,
                ref original_name,
                ref reversal_name,
            }
            if account_code == "1001" && original_name == "库存现金" && reversal_name == "库存现金-错误"
        ));
        assert!(format!("{}", e).contains("mismatched name"));
    }

    #[test]
    fn test_rev_err_account_name_mismatch_second_account() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries[1].account_name = "应付账款-错".to_string();
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::AccountNameMismatch { ref account_code, .. }
            if account_code == "2001"
        ));
    }

    // ===== Rule 4d: DebitCreditSwapMismatch =====

    #[test]
    fn test_rev_err_swap_mismatch_amount_off_by_one() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries[0].credit = Decimal::new(999, 0);
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::DebitCreditSwapMismatch {
                ref account_code,
                original_debit,
                original_credit,
                reversal_debit: _,
                reversal_credit,
            }
            if account_code == "1001"
                && original_debit == Decimal::new(1000, 0)
                && original_credit == Decimal::ZERO
                && reversal_credit == Decimal::new(999, 0)
        ));
        assert!(format!("{}", e).contains("swap mismatch"));
    }

    #[test]
    fn test_rev_err_swap_mismatch_not_swapped() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries[0].debit = Decimal::new(1000, 0);
        rev.entries[0].credit = Decimal::ZERO;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::DebitCreditSwapMismatch { .. }
        ));
    }

    #[test]
    fn test_rev_err_swap_mismatch_off_by_0_01() {
        let orig_entries = vec![
            ReverseJournalEntry {
                account_code: "1001".to_string(),
                account_name: "库存现金".to_string(),
                debit: Decimal::new(100000, 2),
                credit: Decimal::ZERO,
            },
            ReverseJournalEntry {
                account_code: "2001".to_string(),
                account_name: "应付账款".to_string(),
                debit: Decimal::ZERO,
                credit: Decimal::new(100000, 2),
            },
        ];
        let rev_entries = vec![
            ReverseJournalEntry {
                account_code: "1001".to_string(),
                account_name: "库存现金".to_string(),
                debit: Decimal::ZERO,
                credit: Decimal::new(99999, 2),
            },
            ReverseJournalEntry {
                account_code: "2001".to_string(),
                account_name: "应付账款".to_string(),
                debit: Decimal::new(100000, 2),
                credit: Decimal::ZERO,
            },
        ];
        let orig = rev_voucher(
            "记2026080001",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let rev = rev_voucher(
            "记2026080002",
            Some("记2026080001"),
            VoucherStatus::Draft,
            "202608",
            rev_entries,
        );
        let period = rev_period("202608", PeriodStatus::Open);
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err(), "差 0.01 应被检测到");
    }

    // ===== Rule 5: ZeroAmountAfterFlip =====

    #[test]
    fn test_rev_err_zero_after_flip_first_entry() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries[0].debit = Decimal::ZERO;
        rev.entries[0].credit = Decimal::ZERO;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ReversalValidationError::ZeroAmountAfterFlip { index: 0 }
        ));
        assert!(format!("{}", e).contains("zero amount"));
    }

    #[test]
    fn test_rev_err_zero_after_flip_second_entry() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.entries[1].debit = Decimal::ZERO;
        rev.entries[1].credit = Decimal::ZERO;
        let r = validate_reverse_voucher(&orig, &rev, &period);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::ZeroAmountAfterFlip { index: 1 }
        ));
    }

    // ===== Happy paths =====

    #[test]
    fn test_rev_ok_simple_2line() {
        let (orig, rev, period) = original_posted_2line();
        assert!(validate_reverse_voucher(&orig, &rev, &period).is_ok());
    }

    #[test]
    fn test_rev_ok_reversal_status_submitted() {
        let (orig, mut rev, period) = original_posted_2line();
        rev.status = VoucherStatus::Submitted;
        assert!(validate_reverse_voucher(&orig, &rev, &period).is_ok());
    }

    #[test]
    fn test_rev_ok_4_accounts_multi_line() {
        let orig_entries = vec![
            rev_entry("1001", "库存现金", 1000, 0),
            rev_entry("1002", "银行存款", 2000, 0),
            rev_entry("2001", "应付账款", 0, 1500),
            rev_entry("3001", "实收资本", 0, 1500),
        ];
        let rev_entries = vec![
            rev_entry("1001", "库存现金", 0, 1000),
            rev_entry("1002", "银行存款", 0, 2000),
            rev_entry("2001", "应付账款", 1500, 0),
            rev_entry("3001", "实收资本", 1500, 0),
        ];
        let orig = rev_voucher(
            "记2026080010",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let rev = rev_voucher(
            "记2026080011",
            Some("记2026080010"),
            VoucherStatus::Draft,
            "202608",
            rev_entries,
        );
        let period = rev_period("202608", PeriodStatus::Open);
        assert!(validate_reverse_voucher(&orig, &rev, &period).is_ok());
    }

    #[test]
    fn test_rev_ok_decimal_precision() {
        let orig_entries = vec![
            ReverseJournalEntry {
                account_code: "1001".to_string(),
                account_name: "库存现金".to_string(),
                debit: Decimal::new(12345, 2),
                credit: Decimal::ZERO,
            },
            ReverseJournalEntry {
                account_code: "2001".to_string(),
                account_name: "应付账款".to_string(),
                debit: Decimal::ZERO,
                credit: Decimal::new(12345, 2),
            },
        ];
        let rev_entries = vec![
            ReverseJournalEntry {
                account_code: "1001".to_string(),
                account_name: "库存现金".to_string(),
                debit: Decimal::ZERO,
                credit: Decimal::new(12345, 2),
            },
            ReverseJournalEntry {
                account_code: "2001".to_string(),
                account_name: "应付账款".to_string(),
                debit: Decimal::new(12345, 2),
                credit: Decimal::ZERO,
            },
        ];
        let orig = rev_voucher(
            "记2026080020",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let rev = rev_voucher(
            "记2026080021",
            Some("记2026080020"),
            VoucherStatus::Submitted,
            "202608",
            rev_entries,
        );
        let period = rev_period("202608", PeriodStatus::Open);
        assert!(validate_reverse_voucher(&orig, &rev, &period).is_ok());
    }

    // ===== Error trait tests =====

    #[test]
    fn test_rev_error_clone_and_partial_eq() {
        let a = ReversalValidationError::DebitCreditSwapMismatch {
            account_code: "1001".to_string(),
            original_debit: Decimal::new(100, 0),
            original_credit: Decimal::ZERO,
            reversal_debit: Decimal::ZERO,
            reversal_credit: Decimal::new(200, 0),
        };
        let b = a.clone();
        assert_eq!(a, b);
        let c = ReversalValidationError::DebitCreditSwapMismatch {
            account_code: "1001".to_string(),
            original_debit: Decimal::new(100, 0),
            original_credit: Decimal::ZERO,
            reversal_debit: Decimal::ZERO,
            reversal_credit: Decimal::new(300, 0),
        };
        assert_ne!(a, c);
    }

    #[test]
    fn test_rev_error_is_std_error() {
        let err: Box<dyn std::error::Error> = Box::new(ReversalValidationError::EmptyEntries);
        assert!(err.source().is_none());
    }

    #[test]
    fn test_rev_error_display_reference_mismatch() {
        let err = ReversalValidationError::ReferenceNoMismatch {
            original_voucher_no: "V001".to_string(),
            reversal_reference_no: Some("V999".to_string()),
        };
        let display = format!("{}", err);
        assert!(display.contains("does not link"));
        assert!(display.contains("V001"));
        assert!(display.contains("V999"));
    }

    // ===== E2E Integration tests (H1-H8) =====

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn post_entry(
        account_code: &str,
        account_name: &str,
        debit: i64,
        credit: i64,
    ) -> PostJournalEntry {
        PostJournalEntry {
            voucher_no: "记2026080001".to_string(),
            voucher_date: now(),
            account_code: account_code.to_string(),
            account_name: account_name.to_string(),
            description: None,
            debit: Decimal::new(debit, 0),
            credit: Decimal::new(credit, 0),
        }
    }

    fn post_voucher(
        status: VoucherStatus,
        period_id: &str,
        entries: Vec<PostJournalEntry>,
    ) -> PostVoucherInput {
        PostVoucherInput {
            status,
            period_id: period_id.to_string(),
            entries,
        }
    }

    fn post_period(id: &str, status: PeriodStatus) -> PostPeriodInput {
        PostPeriodInput {
            id: id.to_string(),
            status,
        }
    }

    fn balanced_post_entries() -> Vec<PostJournalEntry> {
        vec![
            post_entry("1001", "库存现金", 1000, 0),
            post_entry("2001", "应付账款", 0, 1000),
        ]
    }

    fn to_journal_entries(post_entries: &[PostJournalEntry]) -> Vec<JournalEntry> {
        post_entries
            .iter()
            .cloned()
            .map(JournalEntry::from)
            .collect()
    }

    fn flip_post_entries(entries: &[PostJournalEntry]) -> Vec<PostJournalEntry> {
        entries
            .iter()
            .map(|e| PostJournalEntry {
                voucher_no: e.voucher_no.clone(),
                voucher_date: e.voucher_date,
                account_code: e.account_code.clone(),
                account_name: e.account_name.clone(),
                description: e.description.clone(),
                debit: e.credit,
                credit: e.debit,
            })
            .collect()
    }

    fn to_rev_entries(entries: &[PostJournalEntry]) -> Vec<ReverseJournalEntry> {
        entries
            .iter()
            .map(|e| ReverseJournalEntry {
                account_code: e.account_code.clone(),
                account_name: e.account_name.clone(),
                debit: e.debit,
                credit: e.credit,
            })
            .collect()
    }

    // H1: original post → balanced → OK
    #[test]
    fn test_e2e_h1_original_post_balanced_ok() {
        let lines = balanced_post_entries();
        let v = post_voucher(VoucherStatus::Approved, "202608", lines.clone());
        let p = post_period("202608", PeriodStatus::Open);
        let post_r = validate_post_entry(&v, &p);
        assert!(post_r.is_ok(), "H1: 原始凭证过账应成功");

        let j = to_journal_entries(&lines);
        let tb = calculate_trial_balance(&j);
        assert!(tb.is_balanced, "H1: 试算应平衡");

        let close_r = validate_period_close_with_trial_balance(&tb);
        assert!(close_r.is_ok(), "H1: 试算平衡应允许结账");
    }

    // H2: after post, try reverse in closed period → rejected
    #[test]
    fn test_e2e_h2_reverse_in_closed_period_rejected() {
        let lines = balanced_post_entries();
        let v = post_voucher(VoucherStatus::Approved, "202608", lines.clone());
        let p_open = post_period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&v, &p_open).is_ok(), "H2: 过账应成功");

        let orig_entries = to_rev_entries(&lines);
        let rev_entries = to_rev_entries(&flip_post_entries(&lines));
        let orig = rev_voucher(
            "记2026080001",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let rev = rev_voucher(
            "记2026080002",
            Some("记2026080001"),
            VoucherStatus::Draft,
            "202608",
            rev_entries,
        );
        let p_closed = rev_period("202608", PeriodStatus::Closed);
        let rev_r = validate_reverse_voucher(&orig, &rev, &p_closed);
        assert!(rev_r.is_err(), "H2: 已关闭期间不应允许冲销");
        assert!(matches!(
            rev_r.unwrap_err(),
            ReversalValidationError::PeriodNotOpen {
                actual: PeriodStatus::Closed
            }
        ));
    }

    // H3: post then reverse successfully → new trial balance after reversal nets to 0
    #[test]
    fn test_e2e_h3_post_reverse_then_tb_zero() {
        let orig_lines = balanced_post_entries();
        let rev_lines = flip_post_entries(&orig_lines);

        let orig_v = post_voucher(VoucherStatus::Approved, "202608", orig_lines.clone());
        let p = post_period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&orig_v, &p).is_ok(), "H3: 原始过账 OK");

        let rev_v_post = post_voucher(VoucherStatus::Draft, "202608", rev_lines.clone());
        assert!(
            validate_post_entry(&rev_v_post, &p).is_ok(),
            "H3: 冲销凭证自身过账校验 OK"
        );

        let orig_entries = to_rev_entries(&orig_lines);
        let rev_entries = to_rev_entries(&rev_lines);
        let orig_rev = rev_voucher(
            "记2026080001",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let rev_rev = rev_voucher(
            "记2026080002",
            Some("记2026080001"),
            VoucherStatus::Draft,
            "202608",
            rev_entries,
        );
        let rp = rev_period("202608", PeriodStatus::Open);
        assert!(
            validate_reverse_voucher(&orig_rev, &rev_rev, &rp).is_ok(),
            "H3: 冲销校验通过"
        );

        let mut combined: Vec<JournalEntry> = to_journal_entries(&orig_lines);
        combined.extend(to_journal_entries(&rev_lines));
        let tb_combined = calculate_trial_balance(&combined);
        assert_eq!(
            tb_combined.total_debits, tb_combined.total_credits,
            "H3: 合并后借贷应相等"
        );
        assert!(tb_combined.is_balanced, "H3: 冲销后合并试算应平衡");
        for acct in &tb_combined.per_account_totals {
            assert_eq!(
                acct.total_debit, acct.total_credit,
                "H3: 每个账户冲销后应净额为0: account={}",
                acct.account_code
            );
        }
    }

    // H4: post then reverse incorrectly (mismatched amounts) → blocked
    #[test]
    fn test_e2e_h4_reverse_incorrect_amounts_blocked() {
        let orig_lines = balanced_post_entries();
        let orig_v = post_voucher(VoucherStatus::Approved, "202608", orig_lines.clone());
        let p = post_period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&orig_v, &p).is_ok(), "H4: 过账 OK");

        let orig_entries = to_rev_entries(&orig_lines);
        let mut wrong_rev = to_rev_entries(&flip_post_entries(&orig_lines));
        wrong_rev[0].credit = Decimal::new(900, 0);
        let orig_rev = rev_voucher(
            "记2026080001",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let rev_rev = rev_voucher(
            "记2026080002",
            Some("记2026080001"),
            VoucherStatus::Draft,
            "202608",
            wrong_rev,
        );
        let rp = rev_period("202608", PeriodStatus::Open);
        let r = validate_reverse_voucher(&orig_rev, &rev_rev, &rp);
        assert!(r.is_err(), "H4: 金额不匹配的冲销应被阻止");
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::DebitCreditSwapMismatch { .. }
        ));
    }

    // H5: try reverse a Draft voucher → blocked
    #[test]
    fn test_e2e_h5_reverse_draft_blocked() {
        let lines = balanced_post_entries();
        let orig_entries = to_rev_entries(&lines);
        let rev_entries = to_rev_entries(&flip_post_entries(&lines));

        let orig_draft = rev_voucher(
            "记2026080001",
            None,
            VoucherStatus::Draft,
            "202608",
            orig_entries,
        );
        let rev = rev_voucher(
            "记2026080002",
            Some("记2026080001"),
            VoucherStatus::Draft,
            "202608",
            rev_entries,
        );
        let rp = rev_period("202608", PeriodStatus::Open);
        let r = validate_reverse_voucher(&orig_draft, &rev, &rp);
        assert!(r.is_err(), "H5: Draft 凭证不能被冲销");
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::OriginalNotPosted {
                actual: VoucherStatus::Draft
            }
        ));
    }

    // H6: reverse reference_no doesn't link → blocked
    #[test]
    fn test_e2e_h6_reference_no_missing_link_blocked() {
        let lines = balanced_post_entries();
        let orig_entries = to_rev_entries(&lines);
        let rev_entries = to_rev_entries(&flip_post_entries(&lines));

        let orig = rev_voucher(
            "记2026080001",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let mut rev = rev_voucher(
            "记2026080002",
            Some("记2026080001"),
            VoucherStatus::Draft,
            "202608",
            rev_entries,
        );
        rev.reference_no = Some("记2026089999".to_string());
        let rp = rev_period("202608", PeriodStatus::Open);
        let r = validate_reverse_voucher(&orig, &rev, &rp);
        assert!(r.is_err(), "H6: reference_no 不关联应被阻止");
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::ReferenceNoMismatch { .. }
        ));
    }

    // H7: original 3-account multi-line post → exact sign-flip reversal → ok → period close ok
    #[test]
    fn test_e2e_h7_3account_reverse_then_close_ok() {
        let orig_lines = vec![
            post_entry("1001", "库存现金", 1000, 0),
            post_entry("1002", "银行存款", 2000, 0),
            post_entry("2001", "应付账款", 0, 3000),
        ];
        let rev_lines = flip_post_entries(&orig_lines);

        let orig_v = post_voucher(VoucherStatus::Approved, "202608", orig_lines.clone());
        let p = post_period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&orig_v, &p).is_ok(), "H7: 原始过账 OK");

        let orig_entries = to_rev_entries(&orig_lines);
        let rev_entries = to_rev_entries(&rev_lines);
        let orig_rev = rev_voucher(
            "记2026080010",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let rev_rev = rev_voucher(
            "记2026080011",
            Some("记2026080010"),
            VoucherStatus::Submitted,
            "202608",
            rev_entries,
        );
        let rp = rev_period("202608", PeriodStatus::Open);
        assert!(
            validate_reverse_voucher(&orig_rev, &rev_rev, &rp).is_ok(),
            "H7: 冲销校验通过"
        );

        let mut combined: Vec<JournalEntry> = to_journal_entries(&orig_lines);
        combined.extend(to_journal_entries(&rev_lines));
        let tb = calculate_trial_balance(&combined);
        assert!(tb.is_balanced, "H7: 合并试算平衡");
        let close_r = validate_period_close_with_trial_balance(&tb);
        assert!(close_r.is_ok(), "H7: 平衡后允许结账");
    }

    // H8: original then reversed then period still has child open → parent close blocked
    #[test]
    fn test_e2e_h8_child_open_blocks_parent_close() {
        let orig_lines = balanced_post_entries();
        let rev_lines = flip_post_entries(&orig_lines);

        let orig_v = post_voucher(VoucherStatus::Approved, "202606", orig_lines.clone());
        let p_jun = post_period("202606", PeriodStatus::Open);
        assert!(
            validate_post_entry(&orig_v, &p_jun).is_ok(),
            "H8: 6月原始过账 OK"
        );

        let orig_entries = to_rev_entries(&orig_lines);
        let rev_entries = to_rev_entries(&rev_lines);
        let orig_rev = rev_voucher(
            "记2026060001",
            None,
            VoucherStatus::Posted,
            "202606",
            orig_entries,
        );
        let rev_rev = rev_voucher(
            "记2026060002",
            Some("记2026060001"),
            VoucherStatus::Draft,
            "202606",
            rev_entries,
        );
        let rp_jun = rev_period("202606", PeriodStatus::Open);
        assert!(
            validate_reverse_voucher(&orig_rev, &rev_rev, &rp_jun).is_ok(),
            "H8: 冲销校验通过"
        );

        let mut combined: Vec<JournalEntry> = to_journal_entries(&orig_lines);
        combined.extend(to_journal_entries(&rev_lines));
        let tb = calculate_trial_balance(&combined);
        assert!(
            validate_period_close_with_trial_balance(&tb).is_ok(),
            "H8: 试算平衡 OK"
        );

        let child_statuses = vec![
            PeriodStatus::Closed,
            PeriodStatus::Open,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
        ];
        let close_r = validate_children_all_closed(&child_statuses);
        assert!(close_r.is_err(), "H8: 2月(index=1)还是Open，关闭6月应失败");
        assert!(matches!(
            close_r.unwrap_err(),
            PeriodValidationError::ChildPeriodNotClosed { index: 1, .. }
        ));
    }

    // Additional E2E: reversing in Closing period should fail
    #[test]
    fn test_e2e_additional_reverse_in_closing_fails() {
        let lines = balanced_post_entries();
        let orig_entries = to_rev_entries(&lines);
        let rev_entries = to_rev_entries(&flip_post_entries(&lines));
        let orig = rev_voucher(
            "记2026080001",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let rev = rev_voucher(
            "记2026080002",
            Some("记2026080001"),
            VoucherStatus::Draft,
            "202608",
            rev_entries,
        );
        let rp = rev_period("202608", PeriodStatus::Closing);
        let r = validate_reverse_voucher(&orig, &rev, &rp);
        assert!(r.is_err(), "Closing期间不允许冲销(必须严格Open)");
    }

    // Additional E2E: reversal status Posted should fail
    #[test]
    fn test_e2e_additional_reversal_status_posted_fails() {
        let lines = balanced_post_entries();
        let orig_entries = to_rev_entries(&lines);
        let rev_entries = to_rev_entries(&flip_post_entries(&lines));
        let orig = rev_voucher(
            "记2026080001",
            None,
            VoucherStatus::Posted,
            "202608",
            orig_entries,
        );
        let mut rev = rev_voucher(
            "记2026080002",
            Some("记2026080001"),
            VoucherStatus::Draft,
            "202608",
            rev_entries,
        );
        rev.status = VoucherStatus::Posted;
        let rp = rev_period("202608", PeriodStatus::Open);
        let r = validate_reverse_voucher(&orig, &rev, &rp);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ReversalValidationError::ReversalInvalidStatus {
                actual: VoucherStatus::Posted
            }
        ));
    }
}
