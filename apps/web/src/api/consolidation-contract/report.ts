/**
 * 合并报表 API 契约
 */

export const consolidationReportApiContract = {
  /**
   * 获取合并报表列表
   * GET /api/consolidation/reports
   */
  list: {
    method: 'GET',
    path: '/api/consolidation/reports',
    queryParams: {
      scope_id: 'uuid? 合并范围ID',
      report_type: 'string? 报表类型',
      period_from: 'string? 期间起(YYYY-MM)',
      period_to: 'string? 期间止(YYYY-MM)',
      status: 'string? 状态',
      approval_status: 'string? 审批状态',
      page: 'number? 页码',
      page_size: 'number? 每页条数',
    },
    response: {
      code: 200,
      data: {
        items: [
          {
            id: 'uuid',
            report_no: 'string',
            report_type: 'ConsolidationReportType',
            scope_id: 'uuid',
            scope_name: 'string',
            period: 'string',
            status: 'draft | calculating | completed | published',
            company_count: 'number',
            eliminated_company_count: 'number',
            total_assets: 'number?',
            total_liabilities: 'number?',
            total_equity: 'number?',
            net_profit: 'number?',
            approval_status: 'pending | approved | rejected',
            generated_at: 'ISO8601?',
            created_at: 'ISO8601',
          },
        ],
        total: 'number',
      },
    },
  },

  /**
   * 获取合并报表详情
   * GET /api/consolidation/reports/:reportId
   */
  get: {
    method: 'GET',
    path: '/api/consolidation/reports/:reportId',
    pathParams: {
      reportId: 'uuid 报表ID',
    },
    response: {
      code: 200,
      data: {
        id: 'uuid',
        report_no: 'string',
        report_type: 'string',
        scope_id: 'uuid',
        scope_name: 'string',
        period: 'string',
        year: 'number',
        quarter: 'number?',
        month: 'number?',
        status: 'string',
        company_count: 'number',
        eliminated_company_count: 'number',
        total_assets: 'number?',
        total_liabilities: 'number?',
        total_equity: 'number?',
        total_revenue: 'number?',
        total_profit: 'number?',
        net_profit: 'number?',
        minority_interest: 'number?',
        parent_net_profit: 'number?',
        approval_status: 'string',
        approved_by: 'uuid?',
        approved_at: 'ISO8601?',
        published_by: 'uuid?',
        published_at: 'ISO8601?',
        generated_by: 'uuid?',
        generated_at: 'ISO8601?',
        created_at: 'ISO8601',
        updated_at: 'ISO8601',
      },
    },
  },

  /**
   * 生成合并报表
   * POST /api/consolidation/reports/generate
   */
  generate: {
    method: 'POST',
    path: '/api/consolidation/reports/generate',
    body: {
      scope_id: 'uuid 合并范围ID(必填)',
      report_type: 'string 报表类型(必填)',
      period: 'string 报表期间(必填,YYYY-MM)',
      include_prior_period: 'boolean 是否包含上期数据(默认true)',
      auto_eliminate: 'boolean 是否自动抵消(默认true)',
    },
    response: {
      code: 201,
      data: {
        report_id: 'uuid',
        report_no: 'string',
        status: 'calculating | completed',
        elimination_results: [
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
        generated_at: 'ISO8601',
        warnings: 'string[]?',
      },
    },
  },

  /**
   * 获取合并报表行项目
   * GET /api/consolidation/reports/:reportId/lines
   */
  getLines: {
    method: 'GET',
    path: '/api/consolidation/reports/:reportId/lines',
    pathParams: {
      reportId: 'uuid 报表ID',
    },
    response: {
      code: 200,
      data: [
        {
          id: 'uuid',
          report_id: 'uuid',
          line_no: 'number',
          item_code: 'string?',
          item_name: 'string',
          item_level: 'number',
          current_period: 'number',
          prior_period: 'number?',
          company_breakdown: 'Array?',
          elimination_breakdown: 'Array?',
          formula: 'string?',
          notes: 'string?',
        },
      ],
    },
  },

  /**
   * 审批合并报表
   * POST /api/consolidation/reports/:reportId/approve
   */
  approve: {
    method: 'POST',
    path: '/api/consolidation/reports/:reportId/approve',
    pathParams: {
      reportId: 'uuid 报表ID',
    },
    response: {
      code: 200,
      data: {
        id: 'uuid',
        approval_status: 'approved',
        approved_by: 'uuid',
        approved_at: 'ISO8601',
      },
    },
  },

  /**
   * 发布合并报表
   * POST /api/consolidation/reports/:reportId/publish
   */
  publish: {
    method: 'POST',
    path: '/api/consolidation/reports/:reportId/publish',
    pathParams: {
      reportId: 'uuid 报表ID',
    },
    response: {
      code: 200,
      data: {
        id: 'uuid',
        status: 'published',
        published_by: 'uuid',
        published_at: 'ISO8601',
      },
    },
  },

  /**
   * 删除合并报表
   * DELETE /api/consolidation/reports/:reportId
   */
  delete: {
    method: 'DELETE',
    path: '/api/consolidation/reports/:reportId',
    pathParams: {
      reportId: 'uuid 报表ID',
    },
    response: {
      code: 204,
    },
  },

  /**
   * 导出合并报表
   * GET /api/consolidation/reports/:reportId/export
   */
  export: {
    method: 'GET',
    path: '/api/consolidation/reports/:reportId/export',
    pathParams: {
      reportId: 'uuid 报表ID',
    },
    queryParams: {
      format: 'excel | pdf (默认excel)',
    },
    response: {
      code: 200,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  },
};
