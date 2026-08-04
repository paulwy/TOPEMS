import { pool } from './pool';
import {
  getMockFinanceDashboard,
  getMockEhsDashboard,
  getMockLimsDashboard,
  getMockCrmDashboard,
  getMockWmsDashboard,
  getMockHrmDashboard,
  getMockPdmDashboard,
  getMockQmsDashboard,
  getMockMesDashboard,
  getMockPmDashboard,
} from '../mock/dashboard';

async function getLatestSnapshot(tableName: string, tenantId?: string) {
  const tenantClause = tenantId ? `AND tenant_id = $1` : '';
  const params = tenantId ? [tenantId] : [];

  const query = `
    SELECT * FROM ${tableName}
    WHERE snapshot_date = CURRENT_DATE
    ${tenantClause}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

async function safeSnapshotQuery(tableName: string, tenantId?: string) {
  try {
    return await getLatestSnapshot(tableName, tenantId);
  } catch {
    return null;
  }
}

export async function getFinanceDashboard(tenantId?: string) {
  const snapshot = await safeSnapshotQuery('finance_daily_snapshot', tenantId);
  if (snapshot) {
    return {
      total_vouchers: snapshot.total_vouchers ?? 0,
      draft_vouchers: snapshot.draft_vouchers ?? 0,
      submitted_vouchers: snapshot.submitted_vouchers ?? 0,
      approved_vouchers: snapshot.approved_vouchers ?? 0,
      posted_vouchers: snapshot.posted_vouchers ?? 0,
      total_payments: snapshot.total_payments ?? 0,
      pending_payments: snapshot.pending_payments ?? 0,
      total_receivables: snapshot.total_receivables ?? 0,
      overdue_receivables: snapshot.overdue_receivables ?? 0,
      total_payables: snapshot.total_payables ?? 0,
      overdue_payables: snapshot.overdue_payables ?? 0,
      pending_approvals: snapshot.pending_approvals ?? 0,
    };
  }

  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_vouchers,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_vouchers,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted_vouchers,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_vouchers,
        COUNT(*) FILTER (WHERE status = 'posted') as posted_vouchers,
        (SELECT COUNT(*) FROM payments) as total_payments,
        (SELECT COUNT(*) FROM payments WHERE status = 'pending') as pending_payments,
        (SELECT SUM(amount) FROM receivables) as total_receivables,
        (SELECT SUM(amount) FROM receivables WHERE status = 'overdue') as overdue_receivables,
        (SELECT SUM(amount) FROM payables) as total_payables,
        (SELECT SUM(amount) FROM payables WHERE status = 'overdue') as overdue_payables,
        (SELECT COUNT(*) FROM vouchers WHERE status = 'pending_approval') as pending_approvals
      FROM vouchers
    `);
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  } catch { /* ignore */ }

  return getMockFinanceDashboard();
}

export async function getEhsDashboard(tenantId?: string) {
  const snapshot = await safeSnapshotQuery('ehs_daily_snapshot', tenantId);
  if (snapshot) {
    return {
      total_accidents: snapshot.total_accidents ?? 0,
      pending_hazards: snapshot.pending_hazards ?? 0,
      training_rate: snapshot.training_rate ?? 0,
      drill_count: snapshot.drill_count ?? 0,
      accident_trend: snapshot.accident_trend || [],
      hazard_types: snapshot.hazard_types || [],
      training_trend: snapshot.training_trend || [],
    };
  }

  try {
    const accResult = await pool.query(`SELECT COUNT(*) as count FROM accidents`);
    if (accResult.rows.length > 0) {
      const hazardResult = await pool.query(`
        SELECT type as name, COUNT(*) as value
        FROM hazards GROUP BY type ORDER BY value DESC
      `);
      const trainingResult = await pool.query(`
        SELECT name, value FROM (
          SELECT '安全培训' as name, COUNT(*) as value FROM training_records WHERE type = 'safety'
          UNION ALL
          SELECT '应急演练', COUNT(*) FROM training_records WHERE type = 'drill'
          UNION ALL
          SELECT '设备操作', COUNT(*) FROM training_records WHERE type = 'equipment'
          UNION ALL
          SELECT '消防知识', COUNT(*) FROM training_records WHERE type = 'fire'
        ) t
      `);
      return {
        total_accidents: parseInt(accResult.rows[0].count),
        pending_hazards: 0,
        training_rate: 0,
        drill_count: 0,
        accident_trend: [],
        hazard_types: hazardResult.rows,
        training_trend: trainingResult.rows,
      };
    }
  } catch { /* ignore */ }

  return getMockEhsDashboard();
}

export async function getLimsDashboard(tenantId?: string) {
  const snapshot = await safeSnapshotQuery('lims_daily_snapshot', tenantId);
  if (snapshot) {
    return {
      pending_samples: snapshot.pending_samples ?? 0,
      in_progress_tasks: snapshot.in_progress_tasks ?? 0,
      instrument_usage: snapshot.instrument_usage ?? 0,
      pass_rate: snapshot.pass_rate ?? 0,
      test_items: snapshot.test_items || [],
      task_completion: snapshot.task_completion || [],
      instrument_status: snapshot.instrument_status || [],
    };
  }

  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM samples WHERE status = 'pending') as pending_samples,
        (SELECT COUNT(*) FROM test_tasks WHERE status = 'in_progress') as in_progress_tasks
    `);
    if (result.rows.length > 0) {
      const itemResult = await pool.query(`
        SELECT test_type as name, COUNT(*) as value
        FROM test_tasks GROUP BY test_type ORDER BY value DESC
      `);
      const instResult = await pool.query(`
        SELECT name, usage_rate as value FROM instruments WHERE status = 'active'
      `);
      return {
        pending_samples: result.rows[0].pending_samples,
        in_progress_tasks: result.rows[0].in_progress_tasks,
        instrument_usage: 0,
        pass_rate: 0,
        test_items: itemResult.rows,
        task_completion: [],
        instrument_status: instResult.rows,
      };
    }
  } catch { /* ignore */ }

  return getMockLimsDashboard();
}

export async function getCrmDashboard(tenantId?: string) {
  const snapshot = await safeSnapshotQuery('crm_daily_snapshot', tenantId);
  if (snapshot) {
    return {
      total_opportunities: snapshot.total_opportunities ?? 0,
      won_amount: snapshot.won_amount ?? 0,
      conversion_rate: snapshot.conversion_rate ?? 0,
      average_cycle: snapshot.average_cycle ?? 0,
      opportunity_stages: snapshot.opportunity_stages || [],
      monthly_performance: snapshot.monthly_performance || [],
      industries: snapshot.industries || [],
    };
  }

  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_opportunities,
        SUM(amount) FILTER (WHERE stage = 'won') as won_amount,
        AVG(cycle_days) as average_cycle
      FROM opportunities
    `);
    if (result.rows.length > 0) {
      const stageResult = await pool.query(`
        SELECT stage as name, COUNT(*) as value
        FROM opportunities GROUP BY stage
      `);
      return {
        total_opportunities: parseInt(result.rows[0].total_opportunities),
        won_amount: result.rows[0].won_amount || 0,
        conversion_rate: 0,
        average_cycle: result.rows[0].average_cycle || 0,
        opportunity_stages: stageResult.rows,
        monthly_performance: [],
        industries: [],
      };
    }
  } catch { /* ignore */ }

  return getMockCrmDashboard();
}

export async function getWmsDashboard(tenantId?: string) {
  const snapshot = await safeSnapshotQuery('wms_daily_snapshot', tenantId);
  if (snapshot) {
    return {
      total_inventory: snapshot.total_inventory ?? 0,
      pending_inbound: snapshot.pending_inbound ?? 0,
      pending_outbound: snapshot.pending_outbound ?? 0,
      location_utilization: snapshot.location_utilization ?? 0,
      inbound_trend: snapshot.inbound_trend || [],
      inventory_categories: snapshot.inventory_categories || [],
      outbound_trend: snapshot.outbound_trend || [],
    };
  }

  try {
    const result = await pool.query(`
      SELECT
        (SELECT SUM(quantity) FROM inventory) as total_inventory,
        (SELECT COUNT(*) FROM inbound_orders WHERE status = 'pending') as pending_inbound,
        (SELECT COUNT(*) FROM outbound_orders WHERE status = 'pending') as pending_outbound
    `);
    if (result.rows.length > 0) {
      const catResult = await pool.query(`
        SELECT category as name, SUM(quantity) as value
        FROM inventory GROUP BY category ORDER BY value DESC
      `);
      return {
        total_inventory: result.rows[0].total_inventory || 0,
        pending_inbound: result.rows[0].pending_inbound || 0,
        pending_outbound: result.rows[0].pending_outbound || 0,
        location_utilization: 0,
        inbound_trend: [],
        inventory_categories: catResult.rows,
        outbound_trend: [],
      };
    }
  } catch { /* ignore */ }

  return getMockWmsDashboard();
}

export async function getHrmDashboard(tenantId?: string) {
  const snapshot = await safeSnapshotQuery('hrm_daily_snapshot', tenantId);
  if (snapshot) {
    return {
      total_employees: snapshot.total_employees ?? 0,
      new_hires: snapshot.new_hires ?? 0,
      on_leave: snapshot.on_leave ?? 0,
      avg_salary: snapshot.avg_salary ?? 0,
      department_distribution: snapshot.department_distribution || [],
      hire_trend: snapshot.hire_trend || [],
      education_distribution: snapshot.education_distribution || [],
    };
  }

  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_employees,
        (SELECT COUNT(*) FROM employees WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days') as new_hires,
        (SELECT COUNT(*) FROM leave_requests WHERE status = 'approved' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE) as on_leave,
        (SELECT AVG(salary) FROM employees WHERE status = 'active') as avg_salary
      FROM employees WHERE status = 'active'
    `);
    if (result.rows.length > 0) {
      const deptResult = await pool.query(`
        SELECT department as name, COUNT(*) as value
        FROM employees WHERE status = 'active' GROUP BY department ORDER BY value DESC
      `);
      return {
        total_employees: parseInt(result.rows[0].total_employees),
        new_hires: result.rows[0].new_hires || 0,
        on_leave: result.rows[0].on_leave || 0,
        avg_salary: Math.round(result.rows[0].avg_salary || 0),
        department_distribution: deptResult.rows,
        hire_trend: [],
        education_distribution: [],
      };
    }
  } catch { /* ignore */ }

  return getMockHrmDashboard();
}

export async function getPdmDashboard(tenantId?: string) {
  const snapshot = await safeSnapshotQuery('pdm_daily_snapshot', tenantId);
  if (snapshot) {
    return {
      ongoing_projects: snapshot.ongoing_projects ?? 0,
      pending_reviews: snapshot.pending_reviews ?? 0,
      bom_changes: snapshot.bom_changes ?? 0,
      completion_rate: snapshot.completion_rate ?? 0,
      project_distribution: snapshot.project_distribution || [],
      document_types: snapshot.document_types || [],
      change_trend: snapshot.change_trend || [],
    };
  }

  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'ongoing') as ongoing_projects,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending_reviews,
        (SELECT COUNT(*) FROM bom_changes) as bom_changes
      FROM projects
    `);
    if (result.rows.length > 0) {
      const typeResult = await pool.query(`
        SELECT doc_type as name, COUNT(*) as value
        FROM documents GROUP BY doc_type ORDER BY value DESC
      `);
      return {
        ongoing_projects: result.rows[0].ongoing_projects || 0,
        pending_reviews: result.rows[0].pending_reviews || 0,
        bom_changes: result.rows[0].bom_changes || 0,
        completion_rate: 0,
        project_distribution: [],
        document_types: typeResult.rows,
        change_trend: [],
      };
    }
  } catch { /* ignore */ }

  return getMockPdmDashboard();
}

export async function getQmsDashboard(tenantId?: string) {
  const snapshot = await safeSnapshotQuery('qms_daily_snapshot', tenantId);
  if (snapshot) {
    return {
      total_standards: snapshot.total_standards ?? 0,
      total_inspections: snapshot.total_inspections ?? 0,
      total_issues: snapshot.total_issues ?? 0,
      total_actions: snapshot.total_actions ?? 0,
      pass_rate: snapshot.pass_rate ?? 0,
      defect_rate: snapshot.defect_rate ?? 0,
      on_time_delivery_rate: snapshot.on_time_delivery_rate ?? 0,
      customer_complaint_count: snapshot.customer_complaint_count ?? 0,
      quality_cost_total: snapshot.quality_cost_total ?? 0,
      quality_cost_ratio: snapshot.quality_cost_ratio ?? 0,
      spc_chart_count: snapshot.spc_chart_count ?? 0,
      fmea_count: snapshot.fmea_count ?? 0,
      eightd_count: snapshot.eightd_count ?? 0,
      audit_plan_count: snapshot.audit_plan_count ?? 0,
      trend_data: snapshot.trend_data || [],
      top_issues: snapshot.top_issues || [],
      department_performance: snapshot.department_performance || [],
    };
  }

  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM standards) as total_standards,
        (SELECT COUNT(*) FROM inspections) as total_inspections,
        (SELECT COUNT(*) FROM issues) as total_issues,
        (SELECT COUNT(*) FROM actions) as total_actions
    `);
    if (result.rows.length > 0) {
      return {
        total_standards: result.rows[0].total_standards || 0,
        total_inspections: result.rows[0].total_inspections || 0,
        total_issues: result.rows[0].total_issues || 0,
        total_actions: result.rows[0].total_actions || 0,
        pass_rate: 0,
        defect_rate: 0,
        on_time_delivery_rate: 0,
        customer_complaint_count: 0,
        quality_cost_total: 0,
        quality_cost_ratio: 0,
        spc_chart_count: 0,
        fmea_count: 0,
        eightd_count: 0,
        audit_plan_count: 0,
        trend_data: [],
        top_issues: [],
        department_performance: [],
      };
    }
  } catch { /* ignore */ }

  return getMockQmsDashboard();
}

export async function getMesDashboard(tenantId?: string) {
  const snapshot = await safeSnapshotQuery('mes_daily_snapshot', tenantId);
  if (snapshot) {
    return {
      total_orders: snapshot.total_orders ?? 0,
      in_progress_orders: snapshot.in_progress_orders ?? 0,
      completed_orders: snapshot.completed_orders ?? 0,
      today_output: snapshot.today_output ?? 0,
      pass_rate: snapshot.pass_rate ?? 0,
      oee: snapshot.oee ?? 0,
      order_progress: snapshot.order_progress || [],
      workstation_status: snapshot.workstation_status || [],
      quality_trend: snapshot.quality_trend || [],
      equipment_status: snapshot.equipment_status || [],
    };
  }

  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_orders,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_orders
      FROM work_orders
    `);
    if (result.rows.length > 0) {
      const outputResult = await pool.query(`
        SELECT COALESCE(SUM(quantity), 0) as today_output
        FROM production_logs
        WHERE log_date = CURRENT_DATE
      `);
      return {
        total_orders: parseInt(result.rows[0].total_orders),
        in_progress_orders: result.rows[0].in_progress_orders || 0,
        completed_orders: result.rows[0].completed_orders || 0,
        today_output: outputResult.rows[0].today_output || 0,
        pass_rate: 0,
        oee: 0,
        order_progress: [],
        workstation_status: [],
        quality_trend: [],
        equipment_status: [],
      };
    }
  } catch { /* ignore */ }

  return getMockMesDashboard();
}

export async function getPmDashboard(tenantId?: string) {
  const snapshot = await safeSnapshotQuery('pm_daily_snapshot', tenantId);
  if (snapshot) {
    return {
      total_projects: snapshot.total_projects ?? 0,
      draft_projects: snapshot.draft_projects ?? 0,
      pending_projects: snapshot.pending_projects ?? 0,
      active_projects: snapshot.active_projects ?? 0,
      completed_projects: snapshot.completed_projects ?? 0,
      cancelled_projects: snapshot.cancelled_projects ?? 0,
      total_contracts: snapshot.total_contracts ?? 0,
      pending_contracts: snapshot.pending_contracts ?? 0,
      active_contracts: snapshot.active_contracts ?? 0,
      completed_contracts: snapshot.completed_contracts ?? 0,
      total_budget: snapshot.total_budget ?? 0,
      spent_budget: snapshot.spent_budget ?? 0,
      budget_usage_rate: snapshot.budget_usage_rate ?? 0,
      on_time_projects: snapshot.on_time_projects ?? 0,
      delayed_projects: snapshot.delayed_projects ?? 0,
      average_progress: snapshot.average_progress ?? 0,
      high_risk_projects: snapshot.high_risk_projects ?? 0,
      medium_risk_projects: snapshot.medium_risk_projects ?? 0,
      low_risk_projects: snapshot.low_risk_projects ?? 0,
    };
  }

  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_projects,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_projects,
        COUNT(*) FILTER (WHERE status = 'active') as active_projects,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_projects,
        (SELECT COUNT(*) FROM contracts) as total_contracts,
        (SELECT SUM(budget) FROM projects) as total_budget,
        (SELECT SUM(spent) FROM projects) as spent_budget,
        (SELECT AVG(progress) FROM projects WHERE status = 'active') as average_progress
      FROM projects
    `);
    if (result.rows.length > 0) {
      return {
        total_projects: parseInt(result.rows[0].total_projects),
        draft_projects: result.rows[0].draft_projects || 0,
        pending_projects: result.rows[0].pending_projects || 0,
        active_projects: result.rows[0].active_projects || 0,
        completed_projects: result.rows[0].completed_projects || 0,
        cancelled_projects: result.rows[0].cancelled_projects || 0,
        total_contracts: result.rows[0].total_contracts || 0,
        pending_contracts: 0,
        active_contracts: 0,
        completed_contracts: 0,
        total_budget: result.rows[0].total_budget || 0,
        spent_budget: result.rows[0].spent_budget || 0,
        budget_usage_rate: 0,
        on_time_projects: 0,
        delayed_projects: 0,
        average_progress: result.rows[0].average_progress || 0,
        high_risk_projects: 0,
        medium_risk_projects: 0,
        low_risk_projects: 0,
      };
    }
  } catch { /* ignore */ }

  return getMockPmDashboard();
}