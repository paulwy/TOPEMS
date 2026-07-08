#![allow(dead_code)]

// 财务报表生成服务
// 生成资产负债表、利润表、现金流量表等

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

// 报表类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ReportType {
    BalanceSheet,    // 资产负债表
    IncomeStatement, // 利润表
    CashFlow,        // 现金流量表
    OwnerEquity,     // 所有者权益变动表
}

// 报表期间
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportPeriod {
    pub year: i32,
    pub quarter: Option<i32>,
    pub month: Option<i32>,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

// 报表项目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportItem {
    pub code: String,
    pub name: String,
    pub level: i32,
    pub is_summary: bool,
    pub current_period: Decimal,
    pub prior_period: Option<Decimal>,
    pub formula: Option<String>,
    pub notes: Option<String>,
}

// 财务报表
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialReport {
    pub report_id: Uuid,
    pub report_type: ReportType,
    pub period: ReportPeriod,
    pub company_id: Uuid,
    pub company_name: String,
    pub currency: String,
    pub items: Vec<ReportItem>,
    pub total_assets: Option<Decimal>,
    pub total_liabilities: Option<Decimal>,
    pub total_equity: Option<Decimal>,
    pub generated_at: DateTime<Utc>,
    pub status: String,
}

// 资产负债表结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceSheetData {
    // 资产
    pub current_assets: Vec<ReportItem>,     // 流动资产
    pub non_current_assets: Vec<ReportItem>, // 非流动资产

    // 负债
    pub current_liabilities: Vec<ReportItem>,     // 流动负债
    pub non_current_liabilities: Vec<ReportItem>, // 非流动负债

    // 所有者权益
    pub equity: Vec<ReportItem>,

    // 小计
    pub current_assets_subtotal: Decimal,
    pub non_current_assets_subtotal: Decimal,
    pub current_liabilities_subtotal: Decimal,
    pub non_current_liabilities_subtotal: Decimal,
    pub equity_subtotal: Decimal,

    // 平衡验证
    pub total_assets: Decimal,
    pub total_liabilities: Decimal,
    pub total_equity: Decimal,
}

// 利润表结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncomeStatementData {
    pub revenue: Vec<ReportItem>,      // 营业收入
    pub cost: Vec<ReportItem>,         // 营业成本
    pub gross_profit: Decimal,         // 毛利
    pub expenses: Vec<ReportItem>,     // 费用
    pub other_income: Vec<ReportItem>, // 其他收益
    pub profit_before_tax: Decimal,    // 税前利润
    pub tax_expense: Decimal,          // 所得税
    pub net_profit: Decimal,           // 净利润
}

// 现金流量表结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashFlowData {
    pub operating_activities: Vec<ReportItem>, // 经营活动
    pub investing_activities: Vec<ReportItem>, // 投资活动
    pub financing_activities: Vec<ReportItem>, // 筹资活动
    pub net_cash_flow: Decimal,                // 净流量
    pub beginning_balance: Decimal,            // 期初余额
    pub ending_balance: Decimal,               // 期末余额
}

// 所有者权益变动表结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OwnerEquityData {
    pub share_capital: Vec<ReportItem>,     // 股本
    pub capital_reserve: Vec<ReportItem>,   // 资本公积
    pub surplus_reserve: Vec<ReportItem>,   // 盈余公积
    pub retained_earnings: Vec<ReportItem>, // 未分配利润
    pub total_equity: Decimal,
}

// 报表生成请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateReportRequest {
    pub report_type: ReportType,
    pub company_id: Uuid,
    pub period: ReportPeriod,
    pub include_prior_period: bool,
    pub currency: Option<String>,
}

// 报表生成响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateReportResponse {
    pub success: bool,
    pub report_id: Option<Uuid>,
    pub report: Option<FinancialReport>,
    pub message: String,
    pub error_details: Option<String>,
}

// 创建报表项目的帮助函数
fn create_report_item(
    code: &str,
    name: &str,
    amount: Decimal,
    prior: Option<Decimal>,
    is_summary: bool,
    level: i32,
) -> ReportItem {
    ReportItem {
        code: code.to_string(),
        name: name.to_string(),
        level,
        is_summary,
        current_period: amount,
        prior_period: prior,
        formula: None,
        notes: None,
    }
}

// 计算合计
fn calculate_total(items: &[ReportItem]) -> Decimal {
    items.iter().map(|i| i.current_period).sum()
}

// 报表生成服务
pub struct FinancialReportService;

impl FinancialReportService {
    pub fn new() -> Self {
        FinancialReportService
    }

    // 生成完整的资产负债表
    pub fn generate_balance_sheet(
        &self,
        company_id: Uuid,
        period: ReportPeriod,
    ) -> BalanceSheetData {
        tracing::info!("生成资产负债表, 公司: {}, 期间: {:?}", company_id, period);

        // 流动资产
        let current_assets = vec![
            create_report_item(
                "1001",
                "货币资金",
                Decimal::new(1000000, 2),
                Some(Decimal::new(800000, 2)),
                false,
                3,
            ),
            create_report_item(
                "1002",
                "交易性金融资产",
                Decimal::new(50000, 2),
                Some(Decimal::new(30000, 2)),
                false,
                3,
            ),
            create_report_item(
                "1122",
                "应收账款",
                Decimal::new(500000, 2),
                Some(Decimal::new(450000, 2)),
                false,
                3,
            ),
            create_report_item(
                "1123",
                "预付款项",
                Decimal::new(80000, 2),
                Some(Decimal::new(70000, 2)),
                false,
                3,
            ),
            create_report_item(
                "1221",
                "其他应收款",
                Decimal::new(20000, 2),
                Some(Decimal::new(15000, 2)),
                false,
                3,
            ),
            create_report_item(
                "1405",
                "存货",
                Decimal::new(300000, 2),
                Some(Decimal::new(280000, 2)),
                false,
                3,
            ),
            create_report_item(
                "1601",
                "待摊费用",
                Decimal::new(0, 2),
                Some(Decimal::new(5000, 2)),
                false,
                3,
            ),
        ];

        // 非流动资产
        let non_current_assets = vec![
            create_report_item(
                "1501",
                "长期股权投资",
                Decimal::new(200000, 2),
                Some(Decimal::new(200000, 2)),
                false,
                3,
            ),
            create_report_item(
                "1601",
                "固定资产",
                Decimal::new(2000000, 2),
                Some(Decimal::new(2100000, 2)),
                false,
                3,
            ),
            create_report_item(
                "1602",
                "累计折旧",
                Decimal::new(-200000, 2),
                Some(Decimal::new(-150000, 2)),
                false,
                3,
            ),
            create_report_item(
                "1603",
                "固定资产净值",
                Decimal::new(2600000, 2),
                Some(Decimal::new(1950000, 2)),
                true,
                3,
            ),
            create_report_item(
                "1701",
                "无形资产",
                Decimal::new(150000, 2),
                Some(Decimal::new(160000, 2)),
                false,
                3,
            ),
            create_report_item(
                "1801",
                "长期待摊费用",
                Decimal::new(50000, 2),
                Some(Decimal::new(60000, 2)),
                false,
                3,
            ),
        ];

        // 流动负债
        let current_liabilities = vec![
            create_report_item(
                "2001",
                "短期借款",
                Decimal::new(500000, 2),
                Some(Decimal::new(400000, 2)),
                false,
                3,
            ),
            create_report_item(
                "2202",
                "应付账款",
                Decimal::new(300000, 2),
                Some(Decimal::new(320000, 2)),
                false,
                3,
            ),
            create_report_item(
                "2203",
                "预收款项",
                Decimal::new(100000, 2),
                Some(Decimal::new(80000, 2)),
                false,
                3,
            ),
            create_report_item(
                "2211",
                "应付工资",
                Decimal::new(50000, 2),
                Some(Decimal::new(45000, 2)),
                false,
                3,
            ),
            create_report_item(
                "2221",
                "应交税金",
                Decimal::new(80000, 2),
                Some(Decimal::new(70000, 2)),
                false,
                3,
            ),
            create_report_item(
                "2241",
                "其他应付款",
                Decimal::new(20000, 2),
                Some(Decimal::new(25000, 2)),
                false,
                3,
            ),
        ];

        // 非流动负债
        let non_current_liabilities = vec![
            create_report_item(
                "2501",
                "长期借款",
                Decimal::new(1000000, 2),
                Some(Decimal::new(1000000, 2)),
                false,
                3,
            ),
            create_report_item(
                "2701",
                "递延税款贷项",
                Decimal::new(0, 2),
                Some(Decimal::new(0, 2)),
                false,
                3,
            ),
        ];

        // 所有者权益
        let equity = vec![
            create_report_item(
                "4001",
                "实收资本",
                Decimal::new(3000000, 2),
                Some(Decimal::new(3000000, 2)),
                false,
                3,
            ),
            create_report_item(
                "4002",
                "资本公积",
                Decimal::new(100000, 2),
                Some(Decimal::new(100000, 2)),
                false,
                3,
            ),
            create_report_item(
                "4101",
                "盈余公积",
                Decimal::new(50000, 2),
                Some(Decimal::new(45000, 2)),
                false,
                3,
            ),
            create_report_item(
                "4103",
                "未分配利润",
                Decimal::new(-250000, 2),
                Some(Decimal::new(-170000, 2)),
                false,
                3,
            ),
        ];

        // 计算小计
        let current_assets_subtotal = calculate_total(&current_assets);
        // 非流动资产合计：
        // - 排除累计折旧(1602)，因为固定资产净值(1603)已包含折旧
        // - 排除固定资产原值(1601)，因为固定资产净值(1603)是它的净值表示
        let non_current_assets_subtotal = non_current_assets
            .iter()
            .filter(|i| !i.is_summary && i.code != "1602" && i.code != "1601")
            .map(|i| i.current_period)
            .sum::<Decimal>()
            + non_current_assets
                .iter()
                .filter(|i| i.is_summary)
                .map(|i| i.current_period)
                .sum::<Decimal>();
        let current_liabilities_subtotal = calculate_total(&current_liabilities);
        let non_current_liabilities_subtotal = calculate_total(&non_current_liabilities);
        let equity_subtotal = calculate_total(&equity);

        let total_assets = current_assets_subtotal + non_current_assets_subtotal;
        let total_liabilities = current_liabilities_subtotal + non_current_liabilities_subtotal;
        let total_equity = equity_subtotal;

        BalanceSheetData {
            current_assets,
            non_current_assets,
            current_liabilities,
            non_current_liabilities,
            equity,
            current_assets_subtotal,
            non_current_assets_subtotal,
            current_liabilities_subtotal,
            non_current_liabilities_subtotal,
            equity_subtotal,
            total_assets,
            total_liabilities,
            total_equity,
        }
    }

    // 生成完整的利润表
    pub fn generate_income_statement(
        &self,
        company_id: Uuid,
        period: ReportPeriod,
    ) -> IncomeStatementData {
        tracing::info!("生成利润表, 公司: {}, 期间: {:?}", company_id, period);

        // 营业收入
        let revenue = vec![
            create_report_item(
                "6001",
                "主营业务收入",
                Decimal::new(5000000, 2),
                Some(Decimal::new(4500000, 2)),
                false,
                3,
            ),
            create_report_item(
                "6051",
                "其他业务收入",
                Decimal::new(100000, 2),
                Some(Decimal::new(80000, 2)),
                false,
                3,
            ),
        ];

        // 营业成本
        let cost = vec![
            create_report_item(
                "6401",
                "主营业务成本",
                Decimal::new(3000000, 2),
                Some(Decimal::new(2700000, 2)),
                false,
                3,
            ),
            create_report_item(
                "6402",
                "其他业务成本",
                Decimal::new(50000, 2),
                Some(Decimal::new(40000, 2)),
                false,
                3,
            ),
        ];

        // 毛利 = 营业收入 - 营业成本
        let revenue_total = calculate_total(&revenue);
        let cost_total = calculate_total(&cost);
        let gross_profit = revenue_total - cost_total;

        // 费用
        let expenses = vec![
            create_report_item(
                "6601",
                "销售费用",
                Decimal::new(150000, 2),
                Some(Decimal::new(140000, 2)),
                false,
                3,
            ),
            create_report_item(
                "6602",
                "管理费用",
                Decimal::new(300000, 2),
                Some(Decimal::new(280000, 2)),
                false,
                3,
            ),
            create_report_item(
                "6603",
                "财务费用",
                Decimal::new(100000, 2),
                Some(Decimal::new(95000, 2)),
                false,
                3,
            ),
            create_report_item(
                "6604",
                "资产减值损失",
                Decimal::new(0, 2),
                Some(Decimal::new(5000, 2)),
                false,
                3,
            ),
        ];

        // 其他收益
        let other_income = vec![
            create_report_item(
                "6111",
                "投资收益",
                Decimal::new(50000, 2),
                Some(Decimal::new(30000, 2)),
                false,
                3,
            ),
            create_report_item(
                "6301",
                "营业外收入",
                Decimal::new(10000, 2),
                Some(Decimal::new(5000, 2)),
                false,
                3,
            ),
            create_report_item(
                "6711",
                "营业外支出",
                Decimal::new(5000, 2),
                Some(Decimal::new(3000, 2)),
                false,
                3,
            ),
        ];

        // 计算税前利润 = 毛利 - 费用 + 其他收益
        let expenses_total = calculate_total(&expenses);
        let other_total = calculate_total(&other_income);
        let profit_before_tax = gross_profit - expenses_total + other_total;

        // 所得税率 15% (简化计算)
        let tax_rate = Decimal::from_str("0.15").unwrap_or_default();
        let tax_expense = profit_before_tax * tax_rate;
        let net_profit = profit_before_tax - tax_expense;

        IncomeStatementData {
            revenue,
            cost,
            gross_profit,
            expenses,
            other_income,
            profit_before_tax,
            tax_expense,
            net_profit,
        }
    }

    // 生成现金流量表
    pub fn generate_cash_flow(&self, company_id: Uuid, period: ReportPeriod) -> CashFlowData {
        tracing::info!("生成现金流量表, 公司: {}, 期间: {:?}", company_id, period);

        // 经营活动
        let operating_activities = vec![
            create_report_item(
                "C001",
                "销售商品、提供劳务收到的现金",
                Decimal::new(5500000, 2),
                Some(Decimal::new(5000000, 2)),
                false,
                3,
            ),
            create_report_item(
                "C002",
                "收到的税费返还",
                Decimal::new(0, 2),
                Some(Decimal::new(0, 2)),
                false,
                3,
            ),
            create_report_item(
                "C003",
                "收到其他与经营活动有关的现金",
                Decimal::new(50000, 2),
                Some(Decimal::new(30000, 2)),
                false,
                3,
            ),
            create_report_item(
                "C004",
                "购买商品、接受劳务支付的现金",
                Decimal::new(3200000, 2),
                Some(Decimal::new(2900000, 2)),
                false,
                3,
            ),
            create_report_item(
                "C005",
                "支付给职工的工资",
                Decimal::new(500000, 2),
                Some(Decimal::new(450000, 2)),
                false,
                3,
            ),
            create_report_item(
                "C006",
                "支付的各项税费",
                Decimal::new(200000, 2),
                Some(Decimal::new(180000, 2)),
                false,
                3,
            ),
            create_report_item(
                "C007",
                "支付其他与经营活动有关的现金",
                Decimal::new(100000, 2),
                Some(Decimal::new(90000, 2)),
                false,
                3,
            ),
        ];

        // 投资活动
        let investing_activities = vec![
            create_report_item(
                "I001",
                "收回投资收到的现金",
                Decimal::new(0, 2),
                Some(Decimal::new(50000, 2)),
                false,
                3,
            ),
            create_report_item(
                "I002",
                "取得投资收益收到的现金",
                Decimal::new(50000, 2),
                Some(Decimal::new(30000, 2)),
                false,
                3,
            ),
            create_report_item(
                "I003",
                "处置固定资产收回的现金净额",
                Decimal::new(0, 2),
                Some(Decimal::new(10000, 2)),
                false,
                3,
            ),
            create_report_item(
                "I004",
                "购建固定资产、无形资产支付的现金",
                Decimal::new(200000, 2),
                Some(Decimal::new(300000, 2)),
                false,
                3,
            ),
            create_report_item(
                "I005",
                "投资支付的现金",
                Decimal::new(0, 2),
                Some(Decimal::new(50000, 2)),
                false,
                3,
            ),
        ];

        // 筹资活动
        let financing_activities = vec![
            create_report_item(
                "F001",
                "吸收投资收到的现金",
                Decimal::new(0, 2),
                Some(Decimal::new(0, 2)),
                false,
                3,
            ),
            create_report_item(
                "F002",
                "取得借款收到的现金",
                Decimal::new(200000, 2),
                Some(Decimal::new(0, 2)),
                false,
                3,
            ),
            create_report_item(
                "F003",
                "收到其他与筹资活动有关的现金",
                Decimal::new(0, 2),
                Some(Decimal::new(0, 2)),
                false,
                3,
            ),
            create_report_item(
                "F004",
                "偿还债务支付的现金",
                Decimal::new(100000, 2),
                Some(Decimal::new(150000, 2)),
                false,
                3,
            ),
            create_report_item(
                "F005",
                "分配股利、利润或偿付利息支付的现金",
                Decimal::new(50000, 2),
                Some(Decimal::new(45000, 2)),
                false,
                3,
            ),
        ];

        // 计算净流量
        let operating_net = calculate_total(&operating_activities);
        let investing_net = calculate_total(&investing_activities);
        let financing_net = calculate_total(&financing_activities);
        let net_cash_flow = operating_net + investing_net + financing_net;

        let beginning_balance = Decimal::new(800000, 2);
        let ending_balance = beginning_balance + net_cash_flow;

        CashFlowData {
            operating_activities,
            investing_activities,
            financing_activities,
            net_cash_flow,
            beginning_balance,
            ending_balance,
        }
    }

    // 生成所有者权益变动表
    pub fn generate_owner_equity(&self, company_id: Uuid, period: ReportPeriod) -> OwnerEquityData {
        tracing::info!(
            "生成所有者权益变动表, 公司: {}, 期间: {:?}",
            company_id,
            period
        );

        let share_capital = vec![
            create_report_item("S001", "年初余额", Decimal::new(3000000, 2), None, false, 3),
            create_report_item("S002", "本年增加", Decimal::new(0, 2), None, false, 3),
            create_report_item("S003", "本年减少", Decimal::new(0, 2), None, false, 3),
            create_report_item("S004", "年末余额", Decimal::new(3000000, 2), None, true, 3),
        ];

        let capital_reserve = vec![
            create_report_item("R001", "年初余额", Decimal::new(100000, 2), None, false, 3),
            create_report_item("R002", "本年增加", Decimal::new(0, 2), None, false, 3),
            create_report_item("R003", "本年减少", Decimal::new(0, 2), None, false, 3),
            create_report_item("R004", "年末余额", Decimal::new(100000, 2), None, true, 3),
        ];

        let surplus_reserve = vec![
            create_report_item("E001", "年初余额", Decimal::new(45000, 2), None, false, 3),
            create_report_item("E002", "本年增加", Decimal::new(5000, 2), None, false, 3),
            create_report_item("E003", "本年减少", Decimal::new(0, 2), None, false, 3),
            create_report_item("E004", "年末余额", Decimal::new(50000, 2), None, true, 3),
        ];

        let retained_earnings = vec![
            create_report_item(
                "P001",
                "年初未分配利润",
                Decimal::new(-170000, 2),
                None,
                false,
                3,
            ),
            create_report_item(
                "P002",
                "加: 本年净利润",
                Decimal::new(1062500, 2),
                None,
                false,
                3,
            ),
            create_report_item(
                "P003",
                "减: 提取盈余公积",
                Decimal::new(5000, 2),
                None,
                false,
                3,
            ),
            create_report_item(
                "P004",
                "减: 应付普通股股利",
                Decimal::new(0, 2),
                None,
                false,
                3,
            ),
            create_report_item(
                "P005",
                "年末未分配利润",
                Decimal::new(887500, 2),
                None,
                true,
                3,
            ),
        ];

        let total_equity = Decimal::new(4337500, 2);

        OwnerEquityData {
            share_capital,
            capital_reserve,
            surplus_reserve,
            retained_earnings,
            total_equity,
        }
    }

    // 生成报表主方法
    pub fn generate_report(&self, req: GenerateReportRequest) -> GenerateReportResponse {
        tracing::info!("生成财务报表: {:?}", req.report_type);

        let report_id = Uuid::new_v4();
        let (items, total_assets, total_liabilities, total_equity) = match req.report_type {
            ReportType::BalanceSheet => {
                let bs = self.generate_balance_sheet(req.company_id, req.period.clone());
                let mut all_items = Vec::new();

                // 添加流动资产小计
                all_items.push(create_report_item(
                    "1000",
                    "流动资产合计",
                    bs.current_assets_subtotal,
                    None,
                    true,
                    2,
                ));
                all_items.extend(bs.current_assets.clone());

                // 添加非流动资产小计
                all_items.push(create_report_item(
                    "1800",
                    "非流动资产合计",
                    bs.non_current_assets_subtotal,
                    None,
                    true,
                    2,
                ));
                all_items.extend(bs.non_current_assets.clone());

                // 添加资产总计
                all_items.push(create_report_item(
                    "1",
                    "资产总计",
                    bs.total_assets,
                    None,
                    true,
                    1,
                ));

                all_items.push(create_report_item(
                    "2000",
                    "流动负债合计",
                    bs.current_liabilities_subtotal,
                    None,
                    true,
                    2,
                ));
                all_items.extend(bs.current_liabilities.clone());

                all_items.push(create_report_item(
                    "2500",
                    "非流动负债合计",
                    bs.non_current_liabilities_subtotal,
                    None,
                    true,
                    2,
                ));
                all_items.extend(bs.non_current_liabilities.clone());

                all_items.push(create_report_item(
                    "2",
                    "负债合计",
                    bs.total_liabilities,
                    None,
                    true,
                    1,
                ));

                all_items.extend(bs.equity.clone());

                all_items.push(create_report_item(
                    "3",
                    "所有者权益合计",
                    bs.total_equity,
                    None,
                    true,
                    1,
                ));

                // 验证资产负债表平衡
                if bs.total_assets != bs.total_liabilities + bs.total_equity {
                    tracing::warn!(
                        "资产负债表不平衡: 资产={}, 负债+权益={}",
                        bs.total_assets,
                        bs.total_liabilities + bs.total_equity
                    );
                }

                (
                    all_items,
                    Some(bs.total_assets),
                    Some(bs.total_liabilities),
                    Some(bs.total_equity),
                )
            }
            ReportType::IncomeStatement => {
                let is = self.generate_income_statement(req.company_id, req.period.clone());
                let mut all_items = Vec::new();

                all_items.extend(is.revenue.clone());

                // 营业收入合计
                all_items.push(create_report_item(
                    "6000",
                    "营业收入合计",
                    calculate_total(&is.revenue),
                    None,
                    true,
                    2,
                ));

                all_items.extend(is.cost.clone());

                // 营业成本合计
                all_items.push(create_report_item(
                    "6400",
                    "营业成本合计",
                    calculate_total(&is.cost),
                    None,
                    true,
                    2,
                ));

                // 毛利
                all_items.push(create_report_item(
                    "6101",
                    "毛利",
                    is.gross_profit,
                    None,
                    true,
                    2,
                ));

                all_items.extend(is.expenses.clone());

                // 费用合计
                all_items.push(create_report_item(
                    "6600",
                    "费用合计",
                    calculate_total(&is.expenses),
                    None,
                    true,
                    2,
                ));

                all_items.extend(is.other_income.clone());

                // 营业利润
                let operating_profit = is.gross_profit - calculate_total(&is.expenses)
                    + calculate_total(&is.other_income);
                all_items.push(create_report_item(
                    "6102",
                    "营业利润",
                    operating_profit,
                    None,
                    true,
                    2,
                ));

                // 税前利润
                all_items.push(create_report_item(
                    "6103",
                    "利润总额",
                    is.profit_before_tax,
                    None,
                    true,
                    2,
                ));

                // 所得税
                all_items.push(create_report_item(
                    "6104",
                    "所得税",
                    is.tax_expense,
                    None,
                    false,
                    2,
                ));

                // 净利润
                all_items.push(create_report_item(
                    "6105",
                    "净利润",
                    is.net_profit,
                    None,
                    true,
                    1,
                ));

                (all_items, None, None, Some(is.net_profit))
            }
            ReportType::CashFlow => {
                let cf = self.generate_cash_flow(req.company_id, req.period.clone());
                let mut all_items = Vec::new();

                // 经营活动
                all_items.push(create_report_item(
                    "C000",
                    "经营活动现金流入",
                    cf.operating_activities
                        .iter()
                        .take(3)
                        .map(|i| i.current_period)
                        .sum(),
                    None,
                    true,
                    2,
                ));
                all_items.extend(cf.operating_activities.clone());

                all_items.push(create_report_item(
                    "C999",
                    "经营活动现金流出",
                    cf.operating_activities
                        .iter()
                        .skip(3)
                        .map(|i| i.current_period)
                        .sum(),
                    None,
                    true,
                    2,
                ));

                // 投资活动
                all_items.push(create_report_item(
                    "I000",
                    "投资活动现金流量",
                    calculate_total(&cf.investing_activities),
                    None,
                    true,
                    2,
                ));
                all_items.extend(cf.investing_activities.clone());

                // 筹资活动
                all_items.push(create_report_item(
                    "F000",
                    "筹资活动现金流量",
                    calculate_total(&cf.financing_activities),
                    None,
                    true,
                    2,
                ));
                all_items.extend(cf.financing_activities.clone());

                // 期末现金及现金等价物余额
                all_items.push(create_report_item(
                    "Z001",
                    "期初余额",
                    cf.beginning_balance,
                    None,
                    false,
                    2,
                ));

                all_items.push(create_report_item(
                    "Z002",
                    "净增加额",
                    cf.net_cash_flow,
                    None,
                    true,
                    2,
                ));

                all_items.push(create_report_item(
                    "Z003",
                    "期末余额",
                    cf.ending_balance,
                    None,
                    true,
                    1,
                ));

                (all_items, Some(cf.ending_balance), None, None)
            }
            ReportType::OwnerEquity => {
                let oe = self.generate_owner_equity(req.company_id, req.period.clone());
                let mut all_items = Vec::new();

                all_items.extend(oe.share_capital.clone());
                all_items.extend(oe.capital_reserve.clone());
                all_items.extend(oe.surplus_reserve.clone());
                all_items.extend(oe.retained_earnings.clone());

                all_items.push(create_report_item(
                    "T",
                    "所有者权益总计",
                    oe.total_equity,
                    None,
                    true,
                    1,
                ));

                (all_items, None, None, Some(oe.total_equity))
            }
        };

        let report = FinancialReport {
            report_id,
            report_type: req.report_type.clone(),
            period: req.period,
            company_id: req.company_id,
            company_name: "公司".to_string(),
            currency: req.currency.unwrap_or_else(|| "人民币".to_string()),
            items,
            total_assets,
            total_liabilities,
            total_equity,
            generated_at: Utc::now(),
            status: "generated".to_string(),
        };

        GenerateReportResponse {
            success: true,
            report_id: Some(report.report_id),
            report: Some(report),
            message: "报表生成成功".to_string(),
            error_details: None,
        }
    }
}

impl Default for FinancialReportService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_balance_sheet() {
        let service = FinancialReportService::new();
        let period = ReportPeriod {
            year: 2024,
            quarter: Some(1),
            month: None,
            start_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2024, 3, 31).unwrap(),
        };

        let bs = service.generate_balance_sheet(Uuid::new_v4(), period);
        assert_eq!(bs.total_assets, bs.total_liabilities + bs.total_equity);
    }
}
