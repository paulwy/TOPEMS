import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Building2,
  TrendingUp,
} from "lucide-react";

export type StatusCategory =
  | "employee"
  | "attendance"
  | "leave"
  | "payroll"
  | "performance";

interface StatusBadgeProps {
  status: string;
  category?: StatusCategory;
  variant?: "default" | "secondary" | "destructive" | "outline";
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  category = "employee",
  variant,
  showIcon = false,
}) => {
  const getStatusConfig = () => {
    const configs: Record<
      string,
      Record<
        string,
        {
          label: string;
          variant: "default" | "secondary" | "destructive" | "outline";
          icon?: React.ReactNode;
        }
      >
    > = {
      employee: {
        active: {
          label: "在职",
          variant: "default",
          icon: <CheckCircle className="w-3 h-3" />,
        },
        inactive: {
          label: "离职",
          variant: "secondary",
          icon: <XCircle className="w-3 h-3" />,
        },
        pending: {
          label: "待入职",
          variant: "secondary",
          icon: <Clock className="w-3 h-3" />,
        },
        probation: {
          label: "试用期",
          variant: "secondary",
          icon: <Clock className="w-3 h-3" />,
        },
      },
      attendance: {
        normal: {
          label: "正常",
          variant: "default",
          icon: <CheckCircle className="w-3 h-3" />,
        },
        late: {
          label: "迟到",
          variant: "secondary",
          icon: <AlertCircle className="w-3 h-3" />,
        },
        early_leave: {
          label: "早退",
          variant: "secondary",
          icon: <AlertCircle className="w-3 h-3" />,
        },
        absent: {
          label: "缺勤",
          variant: "destructive",
          icon: <XCircle className="w-3 h-3" />,
        },
        leave: {
          label: "请假",
          variant: "outline",
          icon: <Clock className="w-3 h-3" />,
        },
      },
      leave: {
        pending: {
          label: "待审批",
          variant: "secondary",
          icon: <Clock className="w-3 h-3" />,
        },
        approved: {
          label: "已批准",
          variant: "default",
          icon: <CheckCircle className="w-3 h-3" />,
        },
        rejected: {
          label: "已拒绝",
          variant: "destructive",
          icon: <XCircle className="w-3 h-3" />,
        },
        cancelled: {
          label: "已取消",
          variant: "outline",
          icon: <XCircle className="w-3 h-3" />,
        },
      },
      payroll: {
        draft: {
          label: "待计算",
          variant: "secondary",
          icon: <Clock className="w-3 h-3" />,
        },
        calculated: {
          label: "已计算",
          variant: "secondary",
          icon: <CheckCircle className="w-3 h-3" />,
        },
        paid: {
          label: "已发放",
          variant: "default",
          icon: <CheckCircle className="w-3 h-3" />,
        },
        processing: {
          label: "处理中",
          variant: "secondary",
          icon: <Clock className="w-3 h-3" />,
        },
      },
      performance: {
        pending: {
          label: "待开始",
          variant: "secondary",
          icon: <Clock className="w-3 h-3" />,
        },
        self_review: {
          label: "自评中",
          variant: "secondary",
          icon: <Building2 className="w-3 h-3" />,
        },
        manager_review: {
          label: "待上级评价",
          variant: "secondary",
          icon: <TrendingUp className="w-3 h-3" />,
        },
        completed: {
          label: "已完成",
          variant: "default",
          icon: <CheckCircle className="w-3 h-3" />,
        },
        not_started: {
          label: "未开始",
          variant: "outline",
          icon: <Clock className="w-3 h-3" />,
        },
        in_progress: {
          label: "进行中",
          variant: "secondary",
          icon: <Clock className="w-3 h-3" />,
        },
        cancelled: {
          label: "已取消",
          variant: "destructive",
          icon: <XCircle className="w-3 h-3" />,
        },
      },
    };

    const categoryConfig = configs[category] || configs.employee;
    return (
      categoryConfig[status] || { label: status, variant: "outline" as const }
    );
  };

  const config = getStatusConfig();

  return (
    <Badge variant={variant || config.variant} className="gap-1">
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
};

export { StatusBadge as default };

// Convenience components for specific categories
export const AttendanceStatusBadge: React.FC<
  Omit<StatusBadgeProps, "category">
> = (props) => <StatusBadge {...props} category="attendance" />;

export const LeaveStatusBadge: React.FC<Omit<StatusBadgeProps, "category">> = (
  props,
) => <StatusBadge {...props} category="leave" />;
