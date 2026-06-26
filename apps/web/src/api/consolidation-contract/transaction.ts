/**
 * 内部交易 API 契约
 */

export const internalTransactionApiContract = {
  /**
   * 获取内部交易列表
   * GET /api/consolidation/internal-transactions
   */
  list: {
    method: 'GET',
    path: '/api/consolidation/internal-transactions',
    queryParams: {
      scope_id: 'uuid? 合并范围ID',
      from_company_id: 'uuid? 交易方公司ID',
      to_company_id: 'uuid? 交易对方公司ID',
      transaction_type: 'string? 交易类型',
      elimination_status: 'string? 抵消状态',
      period_from: 'string? 期间起(YYYY-MM)',
      period_to: 'string? 期间止(YYYY-MM)',
      page: 'number? 页码',
      page_size: 'number? 每页条数',
    },
    response: {
      code: 200,
      data: {
        items: [
          {
            id: 'uuid',
            transaction_no: 'string',
            transaction_date: 'date',
            period: 'string',
            from_company_id: 'uuid',
            from_company_name: 'string',
            to_company_id: 'uuid',
            to_company_name: 'string',
            transaction_type: 'string',
            description: 'string?',
            amount: 'number',
            currency: 'string',
            elimination_status: 'pending | eliminated | partial | not_applicable',
            eliminated_amount: 'number',
            remaining_amount: 'number',
            voucher_id: 'uuid?',
            elimination_voucher_id: 'uuid?',
            created_at: 'ISO8601',
          },
        ],
        total: 'number',
      },
    },
  },

  /**
   * 执行内部交易抵消
   * POST /api/consolidation/execute-elimination
   */
  executeElimination: {
    method: 'POST',
    path: '/api/consolidation/execute-elimination',
    body: {
      scope_id: 'uuid 合并范围ID(必填)',
      period: 'string 会计期间(必填,YYYY-MM)',
      rule_ids: 'uuid[]? 指定规则ID(不传则执行所有规则)',
    },
    response: {
      code: 200,
      data: {
        eliminated_count: 'number 抵消笔数',
        total_eliminated: 'number 总抵消金额',
        results: [
          {
            rule_id: 'uuid',
            rule_name: 'string',
            rule_type: 'string',
            transaction_count: 'number',
            total_eliminated: 'number',
            success: 'boolean',
            error_message: 'string?',
          },
        ],
      },
    },
  },
};
