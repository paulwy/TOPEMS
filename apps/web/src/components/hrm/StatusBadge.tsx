import React from "react";
import { Chip } from "@mui/material";
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

const variantToColor = (variant: string): "default" | "primary" | "secondary" | "error" | "success" | "warning" | "info" => {
  switch (variant) {
    case "default":
      return "primary";
    case "secondary":
      return "secondary";
    case "destructive":
      return "error";
    case "outline":
    default:
      return "default";
  }
};

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
          icon: <CheckCircle size={12} />,
        },
        inactive: {
          label: "离职",
          variant: "secondary",
          icon: <XCircle size={12} />,
        },
        pending: {
          label: "待入职",
          variant: "secondary",
          icon: <Clock size={12} />,
        },
        probation: {
          label: "试用期",
          variant: "secondary",
          icon: <Clock size={12} />,
        },
      },
      attendance: {
        normal: {
          label: "正常",
          variant: "default",
          icon: <CheckCircle size={12} />,
        },
        late: {
          label: "迟到",
          variant: "secondary",
          icon: <AlertCircle size={12} />,
        },
        early_leave: {
          label: "早退",
          variant: "secondary",
          icon: <AlertCircle size={12} />,
        },
        absent: {
          label: "缺勤",
          variant: "destructive",
          icon: <XCircle size={12} />,
        },
        leave: {
          label: "请假",
          variant: "outline",
          icon: <Clock size={12} />,
        },
      },
      leave: {
        pending: {
          label: "待审批",
          variant: "secondary",
          icon: <Clock size={12} />,
        },
        approved: {
          label: "已批准",
          variant: "default",
          icon: <CheckCircle size={12} />,
        },
        rejected: {
          label: "已拒绝",
          variant: "destructive",
          icon: <XCircle size={12} />,
        },
        cancelled: {
          label: "已取消",
          variant: "outline",
          icon: <XCircle size={12} />,
        },
      },
      payroll: {
        draft: {
          label: "待计算",
          variant: "secondary",
          icon: <Clock size={12} />,
        },
        calculated: {
          label: "已计算",
          variant: "secondary",
          icon: <CheckCircle size={12} />,
        },
        paid: {
          label: "已发放",
          variant: "default",
          icon: <CheckCircle size={12} />,
        },
        processing: {
          label: "处理中",
          variant: "secondary",
          icon: <Clock size={12} />,
        },
      },
      performance: {
        pending: {
          label: "待开始",
          variant: "secondary",
          icon: <Clock size={12} />,
        },
        self_review: {
          label: "自评中",
          variant: "secondary",
          icon: <Building2 size={12} />,
        },
        manager_review: {
          label: "待上级评价",
          variant: "secondary",
          icon: <TrendingUp size={12} />,
        },
        completed: {
          label: "已完成",
          variant: "default",
          icon: <CheckCircle size={12} />,
        },
        not_started: {
          label: "未开始",
          variant: "outline",
          icon: <Clock size={12} />,
        },
        in_progress: {
          label: "进行中",
          variant: "secondary",
          icon: <Clock size={12} />,
        },
        cancelled: {
          label: "已取消",
          variant: "destructive",
          icon: <XCircle size={12} />,
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
    <Chip
      color={variantToColor(variant || config.variant)}
      size="small"
      icon={showIcon && config.icon ? <>{config.icon}</> : undefined}
      label={config.label}
      variant={variant === "outline" ? "outlined" : "filled"}
    />
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
