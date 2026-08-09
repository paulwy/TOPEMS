use utoipa::OpenApi;

use crate::models::*;
use crate::modules::*;

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            Account,
            AccountType,
            Voucher,
            VoucherType,
            VoucherStatus,
            VoucherLine,
            VoucherResponse,
            CreateAccountRequest,
            CreateVoucherRequest,
            VoucherLineRequest,
            LedgerEntry,
            TrialBalance,
            Period,
            PeriodStatus,
            BalanceSheet,
            BalanceItem,
            IncomeStatement,
            IncomeItem,
            CashFlowStatement,
            CashFlowItem,
            AuxType,
            AuxiliaryAccount,
            Payment,
            PaymentItem,
            PaymentResponse,
            CreatePaymentRequest,
            PaymentItemRequest,
        ),
    ),
    paths(
        list_accounts,
        create_account,
        get_account,
        list_vouchers,
        create_voucher,
        get_voucher,
        submit_voucher,
        approve_voucher,
        post_voucher,
        get_ledger,
        get_trial_balance,
        get_balance_sheet,
        get_income_statement,
    ),
    tags(
        (name = "Finance", description = "财务管理"),
        (name = "Voucher", description = "凭证管理"),
        (name = "Accounting", description = "科目管理"),
        (name = "Report", description = "报表生成"),
        (name = "Cost", description = "成本核算"),
        (name = "Reconciliation", description = "对账中心"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-finance API",
        version = "1.0.0",
        description = "TOPEMS 财务服务 - 凭证管理、科目管理、报表生成、成本核算",
    ),
    servers(
        (url = "http://localhost:8011", description = "本地开发环境"),
    )
)]
pub struct ApiDoc;
