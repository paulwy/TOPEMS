import { useMemo } from "react";
import { useLocation } from "react-router-dom";

export interface AIRecommendation {
  id: string;
  label: string;
  description: string;
  action: string;
  icon?: string;
}

export interface AIContextState {
  currentPage: string;
  module: string | null;
  recommendations: AIRecommendation[];
  quickCommands: QuickCommand[];
}

export interface QuickCommand {
  command: string;
  label: string;
  description: string;
  action: string;
}

const moduleRecommendations: Record<string, AIRecommendation[]> = {
  hrm: [
    {
      id: "employee-completion",
      label: "员工信息补全",
      description: "AI智能补全员工档案信息",
      action: "/hrm/employees",
      icon: "user-plus",
    },
    {
      id: "contract-generate",
      label: "合同生成",
      description: "根据信息自动生成合同文档",
      action: "/hrm/contracts",
      icon: "file-text",
    },
    {
      id: "attendance-analysis",
      label: "考勤分析",
      description: "智能分析考勤异常情况",
      action: "/hrm/attendance",
      icon: "calendar-check",
    },
    {
      id: "performance-summary",
      label: "绩效总结",
      description: "AI生成员工绩效评估总结",
      action: "/hrm/performance",
      icon: "trending-up",
    },
  ],
  crm: [
    {
      id: "customer-scoring",
      label: "客户评分",
      description: "分析客户价值评分",
      action: "/crm/scoring",
      icon: "star",
    },
    {
      id: "followup-summary",
      label: "跟进摘要",
      description: "自动生成客户跟进记录摘要",
      action: "/crm/interactions",
      icon: "message-square",
    },
    {
      id: "forecast-analysis",
      label: "销售预测",
      description: "AI预测销售趋势",
      action: "/crm/forecast",
      icon: "bar-chart",
    },
    {
      id: "lead-qualification",
      label: "商机评估",
      description: "智能评估商机质量",
      action: "/crm/opportunities",
      icon: "target",
    },
  ],
  pm: [
    {
      id: "project-summary",
      label: "项目摘要",
      description: "AI生成项目进度摘要",
      action: "/pm/projects",
      icon: "briefcase",
    },
    {
      id: "risk-analysis",
      label: "风险分析",
      description: "智能识别项目风险",
      action: "/pm/reports",
      icon: "alert-triangle",
    },
    {
      id: "contract-review",
      label: "合同审查",
      description: "AI辅助合同条款审查",
      action: "/pm/contracts",
      icon: "file-check",
    },
  ],
  bi: [
    {
      id: "report-interpretation",
      label: "报表解读",
      description: "AI解读财务数据报表",
      action: "/bi/reports",
      icon: "bar-chart-2",
    },
    {
      id: "anomaly-detection",
      label: "异常检测",
      description: "智能检测数据异常",
      action: "/bi/dashboard",
      icon: "alert-circle",
    },
    {
      id: "data-summary",
      label: "数据摘要",
      description: "自动生成数据分析摘要",
      action: "/bi/analytics",
      icon: "file-text",
    },
  ],
  finance: [
    {
      id: "expense-analysis",
      label: "费用分析",
      description: "AI分析费用支出情况",
      action: "/finance",
      icon: "wallet",
    },
    {
      id: "budget-forecast",
      label: "预算预测",
      description: "智能预测预算执行情况",
      action: "/finance/budget",
      icon: "trending-up",
    },
    {
      id: "report-analysis",
      label: "财务分析",
      description: "AI分析财务报表数据",
      action: "/finance/reports",
      icon: "pie-chart",
    },
  ],
  ai: [
    {
      id: "document-generate",
      label: "文档生成",
      description: "基于模板生成报告、邮件、合同",
      action: "/ai/documents",
      icon: "file-edit",
    },
    {
      id: "text-analysis",
      label: "文本分析",
      description: "情感分析、分类、实体提取",
      action: "/ai/analysis",
      icon: "search",
    },
    {
      id: "code-generate",
      label: "编码生成",
      description: "智能生成编码",
      action: "/ai/code",
      icon: "code",
    },
    {
      id: "text-summary",
      label: "文本摘要",
      description: "生成简短/标准/详细摘要",
      action: "/ai/summary",
      icon: "file-text",
    },
  ],
};

const defaultRecommendations: AIRecommendation[] = [
  {
    id: "ai-chat",
    label: "AI聊天",
    description: "与AI助手对话",
    action: "/ai",
    icon: "message-circle",
  },
  {
    id: "document-generate",
    label: "文档生成",
    description: "基于模板生成文档",
    action: "/ai/documents",
    icon: "file-edit",
  },
  {
    id: "text-analysis",
    label: "文本分析",
    description: "分析和处理文本数据",
    action: "/ai/analysis",
    icon: "search",
  },
];

const quickCommands: QuickCommand[] = [
  {
    command: "/审批",
    label: "查看审批",
    description: "查看待我审批的事项",
    action: "/flow/approvals",
  },
  {
    command: "/考勤",
    label: "查考勤",
    description: "查看本月考勤情况",
    action: "/hrm/attendance",
  },
  {
    command: "/客户",
    label: "找客户",
    description: "查找最近未联系的客户",
    action: "/crm/customers",
  },
  {
    command: "/报表",
    label: "生成报表",
    description: "生成本月销售汇总",
    action: "/bi/reports",
  },
  {
    command: "/帮助",
    label: "使用帮助",
    description: "AI助手使用帮助",
    action: "/help",
  },
];

function getModuleFromPath(path: string): string | null {
  const pathSegments = path.split("/").filter(Boolean);
  if (pathSegments.length === 0) return null;

  const moduleMap: Record<string, string> = {
    hrm: "hrm",
    crm: "crm",
    pm: "pm",
    bi: "bi",
    finance: "finance",
    ai: "ai",
    flow: "workflow",
    im: "collaboration",
    assets: "erp",
    equipment: "erp",
  };

  const firstSegment = pathSegments[0];
  return moduleMap[firstSegment] || null;
}

export function useAIContext(): AIContextState {
  const location = useLocation();

  const module = useMemo(
    () => getModuleFromPath(location.pathname),
    [location.pathname],
  );

  const recommendations = useMemo(() => {
    if (module && moduleRecommendations[module]) {
      return moduleRecommendations[module];
    }
    return defaultRecommendations;
  }, [module]);

  return {
    currentPage: location.pathname,
    module,
    recommendations,
    quickCommands,
  };
}

export default useAIContext;
