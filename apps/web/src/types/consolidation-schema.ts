/**
 * 合并报表数据库Schema定义
 * 为后端数据库表结构设计提供参考
 */

export const consolidationSchemas = {
  // ============================================
  // 一、合并范围表 (consolidation_scopes)
  // ============================================
  consolidation_scopes: {
    tableName: "consolidation_scopes",
    description: "合并范围主表",
    columns: {
      id: {
        type: "uuid",
        primaryKey: true,
        default: "gen_random_uuid()",
        comment: "主键ID",
      },
      code: {
        type: "varchar(50)",
        unique: true,
        notNull: true,
        comment: "合并范围编码",
      },
      name: {
        type: "varchar(200)",
        notNull: true,
        comment: "合并范围名称",
      },
      description: {
        type: "text",
        comment: "说明",
      },
      consolidation_method: {
        type: "varchar(20)",
        notNull: true,
        default: "'full'",
        comment:
          "合并方法: full=完全合并, equity=权益法, proportional=比例合并",
      },
      status: {
        type: "varchar(20)",
        notNull: true,
        default: "'draft'",
        comment: "状态: draft=草稿, active=启用, inactive=停用",
      },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: "now()",
        comment: "创建时间",
      },
      updated_at: {
        type: "timestamp",
        notNull: true,
        default: "now()",
        comment: "更新时间",
      },
      created_by: {
        type: "uuid",
        comment: "创建人",
      },
    },
    indexes: [
      {
        name: "idx_consolidation_scopes_code",
        columns: ["code"],
        unique: true,
      },
      { name: "idx_consolidation_scopes_status", columns: ["status"] },
    ],
  },

  // ============================================
  // 二、合并范围公司表 (consolidation_scope_companies)
  // ============================================
  consolidation_scope_companies: {
    tableName: "consolidation_scope_companies",
    description: "合并范围内的公司成员",
    columns: {
      id: {
        type: "uuid",
        primaryKey: true,
        default: "gen_random_uuid()",
        comment: "主键ID",
      },
      scope_id: {
        type: "uuid",
        notNull: true,
        foreignKey: {
          table: "consolidation_scopes",
          column: "id",
          onDelete: "CASCADE",
        },
        comment: "合并范围ID",
      },
      company_id: {
        type: "uuid",
        notNull: true,
        foreignKey: {
          table: "companies",
          column: "id",
          onDelete: "CASCADE",
        },
        comment: "公司ID",
      },
      is_parent: {
        type: "boolean",
        notNull: true,
        default: false,
        comment: "是否为母公司",
      },
      control_type: {
        type: "varchar(20)",
        notNull: true,
        default: "'full_control'",
        comment:
          "控制类型: full_control=全资子公司, joint_venture=合资公司, associate=联营公司",
      },
      ownership_percentage: {
        type: "decimal(10,4)",
        notNull: true,
        default: 0,
        comment: "持股比例",
      },
      consolidation_percentage: {
        type: "decimal(10,4)",
        notNull: true,
        default: 100,
        comment: "合并比例",
      },
      minority_interest: {
        type: "decimal(20,2)",
        notNull: true,
        default: 0,
        comment: "少数股东权益",
      },
      effective_date: {
        type: "date",
        comment: "生效日期",
      },
      expiry_date: {
        type: "date",
        comment: "失效日期",
      },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: "now()",
        comment: "创建时间",
      },
    },
    indexes: [
      { name: "idx_scope_companies_scope_id", columns: ["scope_id"] },
      { name: "idx_scope_companies_company_id", columns: ["company_id"] },
      {
        name: "uk_scope_company",
        columns: ["scope_id", "company_id"],
        unique: true,
      },
    ],
  },

  // ============================================
  // 三、抵消规则表 (elimination_rules)
  // ============================================
  elimination_rules: {
    tableName: "elimination_rules",
    description: "内部交易抵消规则",
    columns: {
      id: {
        type: "uuid",
        primaryKey: true,
        default: "gen_random_uuid()",
        comment: "主键ID",
      },
      scope_id: {
        type: "uuid",
        notNull: true,
        foreignKey: {
          table: "consolidation_scopes",
          column: "id",
          onDelete: "CASCADE",
        },
        comment: "合并范围ID",
      },
      code: {
        type: "varchar(50)",
        unique: true,
        notNull: true,
        comment: "规则编码",
      },
      name: {
        type: "varchar(200)",
        notNull: true,
        comment: "规则名称",
      },
      type: {
        type: "varchar(50)",
        notNull: true,
        comment:
          "规则类型: investment_in_subsidiary=投资抵消, intra_receivable_payable=内部往来, intra_sales_purchase=内部购销, intra_profit_loss=未实现利润, intra_dividend=股利分配, intra_loan=内部借款",
      },
      description: {
        type: "text",
        comment: "说明",
      },
      status: {
        type: "varchar(20)",
        notNull: true,
        default: "'active'",
        comment: "状态: draft=草稿, active=启用, inactive=停用",
      },
      direction: {
        type: "varchar(20)",
        notNull: true,
        default: "'both'",
        comment: "抵消方向: debit=借方, credit=贷方, both=双方",
      },
      debit_account_codes: {
        type: "text",
        comment: "借方科目编码(JSON数组)",
      },
      credit_account_codes: {
        type: "text",
        comment: "贷方科目编码(JSON数组)",
      },
      company_pairs: {
        type: "text",
        comment: "关联公司组(JSON数组)",
      },
      auto_elimination: {
        type: "boolean",
        notNull: true,
        default: true,
        comment: "是否自动抵消",
      },
      priority: {
        type: "integer",
        notNull: true,
        default: 100,
        comment: "执行优先级(数字越小越优先)",
      },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: "now()",
        comment: "创建时间",
      },
      updated_at: {
        type: "timestamp",
        notNull: true,
        default: "now()",
        comment: "更新时间",
      },
    },
    indexes: [
      { name: "idx_elimination_rules_scope_id", columns: ["scope_id"] },
      { name: "idx_elimination_rules_type", columns: ["type"] },
      { name: "idx_elimination_rules_status", columns: ["status"] },
      { name: "idx_elimination_rules_code", columns: ["code"], unique: true },
    ],
  },

  // ============================================
  // 四、内部交易表 (internal_transactions)
  // ============================================
  internal_transactions: {
    tableName: "internal_transactions",
    description: "内部交易记录",
    columns: {
      id: {
        type: "uuid",
        primaryKey: true,
        default: "gen_random_uuid()",
        comment: "主键ID",
      },
      transaction_no: {
        type: "varchar(50)",
        unique: true,
        notNull: true,
        comment: "交易编号",
      },
      transaction_date: {
        type: "date",
        notNull: true,
        comment: "交易日期",
      },
      period: {
        type: "varchar(7)",
        notNull: true,
        comment: "会计期间(YYYY-MM)",
      },
      from_company_id: {
        type: "uuid",
        notNull: true,
        foreignKey: {
          table: "companies",
          column: "id",
        },
        comment: "交易方公司ID",
      },
      to_company_id: {
        type: "uuid",
        notNull: true,
        foreignKey: {
          table: "companies",
          column: "id",
        },
        comment: "交易对方公司ID",
      },
      transaction_type: {
        type: "varchar(50)",
        notNull: true,
        comment: "交易类型",
      },
      description: {
        type: "text",
        comment: "交易描述",
      },
      amount: {
        type: "decimal(20,2)",
        notNull: true,
        default: 0,
        comment: "交易金额",
      },
      currency: {
        type: "varchar(10)",
        notNull: true,
        default: "'CNY'",
        comment: "币种",
      },
      elimination_status: {
        type: "varchar(20)",
        notNull: true,
        default: "'pending'",
        comment:
          "抵消状态: pending=待抵消, eliminated=已抵消, partial=部分抵消, not_applicable=不适用",
      },
      eliminated_amount: {
        type: "decimal(20,2)",
        notNull: true,
        default: 0,
        comment: "已抵消金额",
      },
      remaining_amount: {
        type: "decimal(20,2)",
        notNull: true,
        default: 0,
        comment: "剩余未抵消金额",
      },
      voucher_id: {
        type: "uuid",
        comment: "原始凭证ID",
      },
      elimination_voucher_id: {
        type: "uuid",
        comment: "抵消凭证ID",
      },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: "now()",
        comment: "创建时间",
      },
    },
    indexes: [
      { name: "idx_internal_transactions_period", columns: ["period"] },
      {
        name: "idx_internal_transactions_from_company",
        columns: ["from_company_id"],
      },
      {
        name: "idx_internal_transactions_to_company",
        columns: ["to_company_id"],
      },
      {
        name: "idx_internal_transactions_elimination_status",
        columns: ["elimination_status"],
      },
      {
        name: "idx_internal_transactions_no",
        columns: ["transaction_no"],
        unique: true,
      },
    ],
  },

  // ============================================
  // 五、合并报表表 (consolidation_reports)
  // ============================================
  consolidation_reports: {
    tableName: "consolidation_reports",
    description: "合并报表主表",
    columns: {
      id: {
        type: "uuid",
        primaryKey: true,
        default: "gen_random_uuid()",
        comment: "主键ID",
      },
      report_no: {
        type: "varchar(50)",
        unique: true,
        notNull: true,
        comment: "报表编号",
      },
      report_type: {
        type: "varchar(50)",
        notNull: true,
        comment:
          "报表类型: consolidated_balance_sheet, consolidated_income_statement, consolidated_cash_flow, consolidated_statement_changes, elimination_work_sheet",
      },
      scope_id: {
        type: "uuid",
        notNull: true,
        foreignKey: {
          table: "consolidation_scopes",
          column: "id",
        },
        comment: "合并范围ID",
      },
      period: {
        type: "varchar(7)",
        notNull: true,
        comment: "报表期间(YYYY-MM)",
      },
      year: {
        type: "integer",
        notNull: true,
        comment: "年份",
      },
      quarter: {
        type: "integer",
        comment: "季度(1-4)",
      },
      month: {
        type: "integer",
        comment: "月份(1-12)",
      },
      status: {
        type: "varchar(20)",
        notNull: true,
        default: "'draft'",
        comment:
          "状态: draft=草稿, calculating=计算中, completed=已完成, published=已发布",
      },
      company_count: {
        type: "integer",
        notNull: true,
        default: 0,
        comment: "包含公司数",
      },
      eliminated_company_count: {
        type: "integer",
        notNull: true,
        default: 0,
        comment: "已抵消公司数",
      },
      // 汇总数据
      total_assets: {
        type: "decimal(20,2)",
        comment: "资产总计",
      },
      total_liabilities: {
        type: "decimal(20,2)",
        comment: "负债合计",
      },
      total_equity: {
        type: "decimal(20,2)",
        comment: "所有者权益合计",
      },
      total_revenue: {
        type: "decimal(20,2)",
        comment: "营业收入",
      },
      total_profit: {
        type: "decimal(20,2)",
        comment: "利润总额",
      },
      net_profit: {
        type: "decimal(20,2)",
        comment: "净利润",
      },
      minority_interest: {
        type: "decimal(20,2)",
        comment: "少数股东权益",
      },
      parent_net_profit: {
        type: "decimal(20,2)",
        comment: "归属于母公司净利润",
      },
      // 工作流
      approval_status: {
        type: "varchar(20)",
        notNull: true,
        default: "'pending'",
        comment: "审批状态: pending=待审批, approved=已审批, rejected=已驳回",
      },
      approved_by: {
        type: "uuid",
        comment: "审批人",
      },
      approved_at: {
        type: "timestamp",
        comment: "审批时间",
      },
      published_by: {
        type: "uuid",
        comment: "发布人",
      },
      published_at: {
        type: "timestamp",
        comment: "发布时间",
      },
      generated_by: {
        type: "uuid",
        comment: "生成人",
      },
      generated_at: {
        type: "timestamp",
        comment: "生成时间",
      },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: "now()",
        comment: "创建时间",
      },
      updated_at: {
        type: "timestamp",
        notNull: true,
        default: "now()",
        comment: "更新时间",
      },
    },
    indexes: [
      { name: "idx_consolidation_reports_scope_id", columns: ["scope_id"] },
      { name: "idx_consolidation_reports_period", columns: ["period"] },
      { name: "idx_consolidation_reports_type", columns: ["report_type"] },
      { name: "idx_consolidation_reports_status", columns: ["status"] },
      {
        name: "idx_consolidation_reports_no",
        columns: ["report_no"],
        unique: true,
      },
    ],
  },

  // ============================================
  // 六、合并报表行项目表 (consolidation_report_lines)
  // ============================================
  consolidation_report_lines: {
    tableName: "consolidation_report_lines",
    description: "合并报表行项目",
    columns: {
      id: {
        type: "uuid",
        primaryKey: true,
        default: "gen_random_uuid()",
        comment: "主键ID",
      },
      report_id: {
        type: "uuid",
        notNull: true,
        foreignKey: {
          table: "consolidation_reports",
          column: "id",
          onDelete: "CASCADE",
        },
        comment: "报表ID",
      },
      line_no: {
        type: "integer",
        notNull: true,
        comment: "行号",
      },
      item_code: {
        type: "varchar(50)",
        comment: "项目编码",
      },
      item_name: {
        type: "varchar(200)",
        notNull: true,
        comment: "项目名称",
      },
      item_level: {
        type: "integer",
        notNull: true,
        default: 1,
        comment: "层级(用于分组显示)",
      },
      current_period: {
        type: "decimal(20,2)",
        notNull: true,
        default: 0,
        comment: "本期金额",
      },
      prior_period: {
        type: "decimal(20,2)",
        comment: "上期金额",
      },
      company_breakdown: {
        type: "text",
        comment: "公司分解(JSON数组)",
      },
      elimination_breakdown: {
        type: "text",
        comment: "抵消分解(JSON数组)",
      },
      formula: {
        type: "text",
        comment: "计算公式",
      },
      notes: {
        type: "text",
        comment: "备注",
      },
    },
    indexes: [
      { name: "idx_report_lines_report_id", columns: ["report_id"] },
      { name: "idx_report_lines_line_no", columns: ["report_id", "line_no"] },
    ],
  },

  // ============================================
  // 七、公司关系表 (company_relations)
  // ============================================
  company_relations: {
    tableName: "company_relations",
    description: "公司之间的关系(母子、联营等)",
    columns: {
      id: {
        type: "uuid",
        primaryKey: true,
        default: "gen_random_uuid()",
        comment: "主键ID",
      },
      parent_company_id: {
        type: "uuid",
        notNull: true,
        foreignKey: {
          table: "companies",
          column: "id",
        },
        comment: "母公司ID",
      },
      child_company_id: {
        type: "uuid",
        notNull: true,
        foreignKey: {
          table: "companies",
          column: "id",
        },
        comment: "子公司ID",
      },
      relation_type: {
        type: "varchar(20)",
        notNull: true,
        comment:
          "关系类型: parent=母公司, subsidiary=子公司, associate=联营公司, joint_venture=合营公司, branch=分公司",
      },
      ownership_percentage: {
        type: "decimal(10,4)",
        notNull: true,
        default: 0,
        comment: "持股比例",
      },
      control_percentage: {
        type: "decimal(10,4)",
        notNull: true,
        default: 0,
        comment: "控制比例",
      },
      effective_date: {
        type: "date",
        notNull: true,
        comment: "生效日期",
      },
      expiry_date: {
        type: "date",
        comment: "失效日期",
      },
      status: {
        type: "varchar(20)",
        notNull: true,
        default: "'active'",
        comment: "状态: active=生效, inactive=失效",
      },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: "now()",
        comment: "创建时间",
      },
      updated_at: {
        type: "timestamp",
        notNull: true,
        default: "now()",
        comment: "更新时间",
      },
    },
    indexes: [
      { name: "idx_company_relations_parent", columns: ["parent_company_id"] },
      { name: "idx_company_relations_child", columns: ["child_company_id"] },
      { name: "idx_company_relations_type", columns: ["relation_type"] },
      {
        name: "uk_parent_child",
        columns: ["parent_company_id", "child_company_id"],
        unique: true,
      },
    ],
  },
};

// ============================================
// SQL建表语句生成
// ============================================

/**
 * 生成创建表的SQL语句
 */
export function generateCreateTableSQL(schema: any): string {
  const columns = Object.entries(schema.columns)
    .map(([name, col]: [string, any]) => {
      let sql = `  ${name} ${col.type}`;
      if (col.notNull) sql += " NOT NULL";
      if (col.default) sql += ` DEFAULT ${col.default}`;
      if (col.comment) sql += ` COMMENT '${col.comment}'`;
      return sql;
    })
    .join(",\n");

  let sql = `CREATE TABLE ${schema.tableName} (\n${columns}\n)`;

  if (schema.indexes && schema.indexes.length > 0) {
    const indexSQL = schema.indexes
      .map((idx: any) => {
        const unique = idx.unique ? " UNIQUE" : "";
        return `CREATE${unique} INDEX ${idx.name} ON ${schema.tableName} (${idx.columns.join(", ")});`;
      })
      .join("\n");
    sql += ";\n\n" + indexSQL;
  }

  return sql;
}

/**
 * 生成所有建表SQL
 */
export function generateAllCreateTableSQL(): string {
  return Object.values(consolidationSchemas)
    .map((schema) => {
      let sql = `-- ${schema.description}\n`;
      sql += `DROP TABLE IF EXISTS ${schema.tableName} CASCADE;\n\n`;
      sql += generateCreateTableSQL(schema);
      return sql;
    })
    .join("\n\n");
}
