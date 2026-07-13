use sqlx::PgPool;

/// 预置系统基础字典数据
///
/// 包含：通用状态、性别、是/否、用户类型、审批状态、优先级、货币、单位等
pub async fn seed_dict_data(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 检查是否已初始化（避免重复插入）
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_dict_types WHERE category = 'system'")
            .fetch_one(pool)
            .await?;

    if count > 0 {
        tracing::info!("字典数据已存在，跳过初始化（{} 条系统字典类型）", count);
        return Ok(());
    }

    tracing::info!("开始初始化系统基础字典数据...");

    let system_dicts = get_system_dict_definitions();

    for (type_code, type_name, items) in &system_dicts {
        // 插入字典类型
        let type_id: uuid::Uuid = sqlx::query_scalar(
            r#"INSERT INTO core_dict_types (code, name, category, description)
               VALUES ($1, $2, 'system', $3)
               ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
               RETURNING id"#,
        )
        .bind(type_code)
        .bind(type_name)
        .bind(format!("系统预置 - {}", type_name))
        .fetch_one(pool)
        .await?;

        // 批量插入字典项
        for (idx, (code, name, value)) in items.iter().enumerate() {
            sqlx::query(
                r#"INSERT INTO core_dict_items (dict_type_id, code, name, value, sort_order)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (dict_type_id, code) DO UPDATE SET name = EXCLUDED.name, value = EXCLUDED.value"#,
            )
            .bind(type_id)
            .bind(code)
            .bind(name)
            .bind(value)
            .bind(idx as i32)
            .execute(pool)
            .await?;
        }
    }

    tracing::info!(
        "系统基础字典数据初始化完成（{} 个字典类型）",
        system_dicts.len()
    );
    Ok(())
}

type DictItemDef = (&'static str, &'static str, Option<&'static str>);
type DictTypeDef = (&'static str, &'static str, &'static [DictItemDef]);

fn get_system_dict_definitions() -> Vec<DictTypeDef> {
    vec![
        // 通用状态
        (
            "common_status",
            "通用状态",
            &[
                ("active", "启用", Some("1")),
                ("inactive", "禁用", Some("0")),
                ("draft", "草稿", Some("2")),
                ("archived", "归档", Some("3")),
            ],
        ),
        // 是/否
        (
            "boolean",
            "是/否",
            &[("yes", "是", Some("true")), ("no", "否", Some("false"))],
        ),
        // 性别
        (
            "gender",
            "性别",
            &[
                ("male", "男", Some("M")),
                ("female", "女", Some("F")),
                ("unknown", "未知", Some("U")),
            ],
        ),
        // 用户类型
        (
            "user_type",
            "用户类型",
            &[
                ("admin", "系统管理员", Some("1")),
                ("manager", "管理者", Some("2")),
                ("employee", "普通员工", Some("3")),
                ("external", "外部用户", Some("4")),
            ],
        ),
        // 审批状态
        (
            "approval_status",
            "审批状态",
            &[
                ("pending", "待审批", Some("0")),
                ("approved", "已通过", Some("1")),
                ("rejected", "已驳回", Some("2")),
                ("cancelled", "已撤回", Some("3")),
                ("processing", "审批中", Some("4")),
            ],
        ),
        // 优先级
        (
            "priority",
            "优先级",
            &[
                ("urgent", "紧急", Some("4")),
                ("high", "高", Some("3")),
                ("medium", "中", Some("2")),
                ("low", "低", Some("1")),
            ],
        ),
        // 货币
        (
            "currency",
            "货币",
            &[
                ("CNY", "人民币", Some("¥")),
                ("USD", "美元", Some("$")),
                ("EUR", "欧元", Some("€")),
                ("GBP", "英镑", Some("£")),
                ("JPY", "日元", Some("¥")),
            ],
        ),
        // 计量单位
        (
            "unit_of_measure",
            "计量单位",
            &[
                ("piece", "个", Some("PCS")),
                ("kg", "千克", Some("KG")),
                ("ton", "吨", Some("T")),
                ("meter", "米", Some("M")),
                ("box", "箱", Some("BOX")),
                ("roll", "卷", Some("ROLL")),
            ],
        ),
        // 采购订单状态
        (
            "purchase_order_status",
            "采购订单状态",
            &[
                ("draft", "草稿", Some("0")),
                ("pending", "待审批", Some("1")),
                ("approved", "已审批", Some("2")),
                ("ordered", "已下单", Some("3")),
                ("received", "已收货", Some("4")),
                ("closed", "已关闭", Some("5")),
                ("cancelled", "已取消", Some("6")),
            ],
        ),
        // 销售订单状态
        (
            "sales_order_status",
            "销售订单状态",
            &[
                ("draft", "草稿", Some("0")),
                ("pending", "待审批", Some("1")),
                ("approved", "已审批", Some("2")),
                ("shipped", "已发货", Some("3")),
                ("delivered", "已送达", Some("4")),
                ("closed", "已关闭", Some("5")),
                ("cancelled", "已取消", Some("6")),
            ],
        ),
        // 库存操作类型
        (
            "inventory_operation",
            "库存操作类型",
            &[
                ("inbound", "入库", Some("IN")),
                ("outbound", "出库", Some("OUT")),
                ("transfer", "调拨", Some("TR")),
                ("adjust", "调整", Some("AD")),
                ("check", "盘点", Some("CK")),
            ],
        ),
        // 客户等级
        (
            "customer_level",
            "客户等级",
            &[
                ("vip", "VIP客户", Some("1")),
                ("key", "重点客户", Some("2")),
                ("normal", "普通客户", Some("3")),
                ("potential", "潜在客户", Some("4")),
            ],
        ),
        // 商机阶段
        (
            "opportunity_stage",
            "商机阶段",
            &[
                ("lead", "线索", Some("1")),
                ("qualified", "已验证", Some("2")),
                ("proposal", "方案报价", Some("3")),
                ("negotiation", "谈判中", Some("4")),
                ("won", "已成交", Some("5")),
                ("lost", "已流失", Some("6")),
            ],
        ),
        // 员工状态
        (
            "employee_status",
            "员工状态",
            &[
                ("active", "在职", Some("1")),
                ("probation", "试用期", Some("2")),
                ("leave", "休假", Some("3")),
                ("resigned", "离职", Some("4")),
                ("retired", "退休", Some("5")),
            ],
        ),
        // 合同类型
        (
            "contract_type",
            "合同类型",
            &[
                ("fixed_term", "固定期限", Some("1")),
                ("open_ended", "无固定期限", Some("2")),
                ("task_based", "任务期限", Some("3")),
                ("internship", "实习", Some("4")),
            ],
        ),
        // 通知类型
        (
            "notification_type",
            "通知类型",
            &[
                ("system", "系统通知", Some("1")),
                ("approval", "审批通知", Some("2")),
                ("task", "任务通知", Some("3")),
                ("message", "消息通知", Some("4")),
                ("alert", "预警通知", Some("5")),
            ],
        ),
        // 插件状态
        (
            "plugin_status",
            "插件状态",
            &[
                ("enabled", "已启用", Some("enabled")),
                ("disabled", "已禁用", Some("disabled")),
                ("installed", "已安装", Some("installed")),
                ("uninstalled", "已卸载", Some("uninstalled")),
                ("upgrading", "升级中", Some("upgrading")),
                ("error", "异常", Some("error")),
            ],
        ),
        // 插件类型
        (
            "plugin_type",
            "插件类型",
            &[
                ("system", "系统插件", Some("system")),
                ("business", "业务插件", Some("business")),
                ("integration", "集成插件", Some("integration")),
                ("custom", "自定义插件", Some("custom")),
            ],
        ),
        // 数据权限级别
        (
            "data_scope",
            "数据权限",
            &[
                ("all", "全部数据", Some("all")),
                ("department", "本部门", Some("department")),
                ("self", "仅本人", Some("self")),
                ("custom", "自定义", Some("custom")),
            ],
        ),
        // 操作权限类型
        (
            "permission_type",
            "权限类型",
            &[
                ("menu", "菜单权限", Some("menu")),
                ("action", "操作权限", Some("action")),
                ("data", "数据权限", Some("data")),
                ("api", "API权限", Some("api")),
            ],
        ),
        // 日志级别
        (
            "log_level",
            "日志级别",
            &[
                ("debug", "调试", Some("debug")),
                ("info", "信息", Some("info")),
                ("warn", "警告", Some("warn")),
                ("error", "错误", Some("error")),
                ("fatal", "致命", Some("fatal")),
            ],
        ),
        // 语言类型
        (
            "language",
            "语言",
            &[
                ("zh_CN", "简体中文", Some("zh_CN")),
                ("zh_TW", "繁体中文", Some("zh_TW")),
                ("en_US", "英文", Some("en_US")),
                ("ja_JP", "日文", Some("ja_JP")),
                ("ko_KR", "韩文", Some("ko_KR")),
            ],
        ),
        // 时区
        (
            "timezone",
            "时区",
            &[
                ("Asia/Shanghai", "中国标准时间", Some("Asia/Shanghai")),
                ("UTC", "UTC时间", Some("UTC")),
                ("America/New_York", "美国东部时间", Some("America/New_York")),
                ("Europe/London", "英国伦敦时间", Some("Europe/London")),
                ("Asia/Tokyo", "日本东京时间", Some("Asia/Tokyo")),
            ],
        ),
        // 日期格式
        (
            "date_format",
            "日期格式",
            &[
                ("YYYY-MM-DD", "YYYY-MM-DD", Some("YYYY-MM-DD")),
                ("DD/MM/YYYY", "DD/MM/YYYY", Some("DD/MM/YYYY")),
                ("MM/DD/YYYY", "MM/DD/YYYY", Some("MM/DD/YYYY")),
                ("YYYY/MM/DD", "YYYY/MM/DD", Some("YYYY/MM/DD")),
            ],
        ),
        // 时间格式
        (
            "time_format",
            "时间格式",
            &[
                ("HH:mm:ss", "24小时制（含秒）", Some("HH:mm:ss")),
                ("HH:mm", "24小时制（不含秒）", Some("HH:mm")),
                ("h:mm:ss a", "12小时制（含秒）", Some("h:mm:ss a")),
                ("h:mm a", "12小时制（不含秒）", Some("h:mm a")),
            ],
        ),
        // 数字格式
        (
            "number_format",
            "数字格式",
            &[
                ("standard", "标准格式", Some("#,##0.00")),
                ("currency", "货币格式", Some("#,##0.00")),
                ("percent", "百分比", Some("0.00%")),
                ("integer", "整数", Some("#,##0")),
            ],
        ),
        // 文件类型
        (
            "file_type",
            "文件类型",
            &[
                ("image", "图片", Some("image")),
                ("document", "文档", Some("document")),
                ("video", "视频", Some("video")),
                ("audio", "音频", Some("audio")),
                ("archive", "压缩包", Some("archive")),
                ("other", "其他", Some("other")),
            ],
        ),
        // 操作类型
        (
            "operation_type",
            "操作类型",
            &[
                ("create", "新增", Some("create")),
                ("update", "修改", Some("update")),
                ("delete", "删除", Some("delete")),
                ("query", "查询", Some("query")),
                ("export", "导出", Some("export")),
                ("import", "导入", Some("import")),
                ("approve", "审批", Some("approve")),
                ("reject", "驳回", Some("reject")),
            ],
        ),
        // 订单类型
        (
            "order_type",
            "订单类型",
            &[
                ("sales", "销售订单", Some("sales")),
                ("purchase", "采购订单", Some("purchase")),
                ("transfer", "调拨订单", Some("transfer")),
                ("return", "退货订单", Some("return")),
                ("refund", "退款订单", Some("refund")),
            ],
        ),
        // 支付方式
        (
            "payment_method",
            "支付方式",
            &[
                ("cash", "现金", Some("cash")),
                ("bank_transfer", "银行转账", Some("bank_transfer")),
                ("wechat", "微信支付", Some("wechat")),
                ("alipay", "支付宝", Some("alipay")),
                ("credit", "信用支付", Some("credit")),
                ("other", "其他", Some("other")),
            ],
        ),
        // 发票类型
        (
            "invoice_type",
            "发票类型",
            &[
                ("vat_special", "增值税专用发票", Some("vat_special")),
                ("vat_general", "增值税普通发票", Some("vat_general")),
                ("electronic", "电子发票", Some("electronic")),
                ("receipt", "收据", Some("receipt")),
                ("other", "其他", Some("other")),
            ],
        ),
        // 资产类型
        (
            "asset_type",
            "资产类型",
            &[
                ("fixed", "固定资产", Some("fixed")),
                ("current", "流动资产", Some("current")),
                ("intangible", "无形资产", Some("intangible")),
                ("investment", "投资资产", Some("investment")),
            ],
        ),
        // 成本类型
        (
            "cost_type",
            "成本类型",
            &[
                ("direct_material", "直接材料", Some("direct_material")),
                ("direct_labor", "直接人工", Some("direct_labor")),
                (
                    "manufacturing_overhead",
                    "制造费用",
                    Some("manufacturing_overhead"),
                ),
                ("administrative", "管理费用", Some("administrative")),
                ("sales", "销售费用", Some("sales")),
                ("research", "研发费用", Some("research")),
            ],
        ),
        // 财务期间
        (
            "fiscal_period",
            "财务期间",
            &[
                ("monthly", "月度", Some("monthly")),
                ("quarterly", "季度", Some("quarterly")),
                ("yearly", "年度", Some("yearly")),
                ("custom", "自定义", Some("custom")),
            ],
        ),
        // 报表类型
        (
            "report_type",
            "报表类型",
            &[
                ("balance_sheet", "资产负债表", Some("balance_sheet")),
                ("income_statement", "利润表", Some("income_statement")),
                ("cash_flow", "现金流量表", Some("cash_flow")),
                ("management", "管理报表", Some("management")),
                ("custom", "自定义报表", Some("custom")),
            ],
        ),
        // 项目状态
        (
            "project_status",
            "项目状态",
            &[
                ("planning", "规划中", Some("planning")),
                ("active", "进行中", Some("active")),
                ("on_hold", "暂停", Some("on_hold")),
                ("completed", "已完成", Some("completed")),
                ("cancelled", "已取消", Some("cancelled")),
            ],
        ),
        // 任务状态
        (
            "task_status",
            "任务状态",
            &[
                ("pending", "待处理", Some("pending")),
                ("in_progress", "进行中", Some("in_progress")),
                ("review", "审核中", Some("review")),
                ("completed", "已完成", Some("completed")),
                ("cancelled", "已取消", Some("cancelled")),
                ("blocked", "已阻塞", Some("blocked")),
            ],
        ),
        // 文档类型
        (
            "document_type",
            "文档类型",
            &[
                ("contract", "合同", Some("contract")),
                ("agreement", "协议", Some("agreement")),
                ("policy", "政策", Some("policy")),
                ("procedure", "流程", Some("procedure")),
                ("manual", "手册", Some("manual")),
                ("report", "报告", Some("report")),
                ("template", "模板", Some("template")),
                ("other", "其他", Some("other")),
            ],
        ),
    ]
}
