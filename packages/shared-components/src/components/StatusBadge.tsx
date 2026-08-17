/**
 * 统一的StatusBadge组件
 * 整合了common、dashboard、hrm三个版本的StatusBadge组件
 * 支持动态颜色映射、图标集成、多种尺寸和变体、点击事件
 */
import React from 'react';
import i18n from 'i18next';
import { Chip, Box, Typography } from '@mui/material';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Minus,
  Building2,
  FileText,
  User,
  Calendar,
  DollarSign,
  Star,
  Zap,
  Lock,
  Eye,
  Heart,
  ThumbsUp,
  Info,
  AlertTriangle,
  Ban,
} from 'lucide-react';

// ============ 类型定义 ============

/**
 * 状态颜色类型
 */
export type StatusColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

/**
 * 状态变体类型
 */
export type StatusVariant = 'filled' | 'outlined' | 'soft';

/**
 * 状态尺寸类型
 */
export type StatusSize = 'sm' | 'md' | 'lg';

export type EmployeeStatus =
  | 'employee_active'
  | 'employee_inactive'
  | 'employee_probation'
  | 'employee_pending';
export type AttendanceStatus =
  | 'attendance_normal'
  | 'attendance_late'
  | 'attendance_early_leave'
  | 'attendance_absent'
  | 'attendance_leave';
export type LeaveStatus = 'leave_pending' | 'leave_approved' | 'leave_rejected' | 'leave_cancelled';
export type PayrollStatus =
  | 'payroll_draft'
  | 'payroll_calculated'
  | 'payroll_paid'
  | 'payroll_processing';
export type PerformanceStatus =
  | 'performance_pending'
  | 'performance_self_review'
  | 'performance_manager_review'
  | 'performance_completed'
  | 'performance_not_started'
  | 'performance_in_progress';
export type CustomerStatus =
  | 'customer_active'
  | 'customer_inactive'
  | 'customer_blocked'
  | 'customer_potential';
export type OpportunityStatus =
  | 'opportunity_new'
  | 'opportunity_qualifying'
  | 'opportunity_proposal'
  | 'opportunity_negotiation'
  | 'opportunity_won'
  | 'opportunity_lost';
export type ProjectStatus =
  | 'project_planning'
  | 'project_active'
  | 'project_on_hold'
  | 'project_completed'
  | 'project_cancelled';
export type WorkflowStatus =
  | 'workflow_draft'
  | 'workflow_pending'
  | 'workflow_approved'
  | 'workflow_rejected'
  | 'workflow_processing';
export type FinanceStatus =
  | 'finance_draft'
  | 'finance_pending'
  | 'finance_approved'
  | 'finance_posted'
  | 'finance_imported';
export type ModuleStatusValue = 'online' | 'beta' | 'plan' | 'new';
export type ModuleStatus = ModuleStatusValue;
export type CommonStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'draft'
  | 'published'
  | 'archived'
  | 'deleted'
  | 'completed'
  | 'cancelled'
  | 'processing'
  | 'failed'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

/**
 * 状态配置接口
 */
export interface StatusConfig {
  /** 显示标签 */
  label: string;
  /** 状态颜色 */
  color?: StatusColor;
  /** 状态图标 */
  icon?: React.ReactNode;
  /** 自定义背景色 */
  bgColor?: string;
  /** 自定义文字色 */
  textColor?: string;
}

/**
 * 状态映射配置接口
 */
export interface StatusMapConfig {
  /** 状态值 */
  [status: string]: StatusConfig;
}

/**
 * StatusBadge组件属性
 */
export interface StatusBadgeProps {
  /** 状态值 */
  status: string;

  /** 状态映射配置 */
  statusMap?: StatusMapConfig;

  /** 显示标签，为空时使用statusMap中的label */
  label?: string;

  /** 状态颜色，为空时使用statusMap中的color */
  color?: StatusColor;

  /** 状态图标，为空时使用statusMap中的icon */
  icon?: React.ReactNode;

  /** 是否显示图标 */
  showIcon?: boolean;

  /** 尺寸 */
  size?: StatusSize;

  /** 变体 */
  variant?: StatusVariant;

  /** 是否可点击 */
  clickable?: boolean;

  /** 点击事件 */
  onClick?: () => void;

  /** 是否禁用 */
  disabled?: boolean;

  /** 自定义样式 */
  sx?: any;

  /** 使用Chip组件渲染（默认true） */
  useChip?: boolean;

  /** 自定义渲染函数 */
  render?: (config: StatusConfig) => React.ReactNode;
}

// ============ 预设状态配置 ============

/**
 * 默认状态映射配置
 * 提供常用的状态预设
 */
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_STATUS_MAP: StatusMapConfig = {
  // 通用状态
  active: {
    label: i18n.t('shared.status_badge.active'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  inactive: {
    label: i18n.t('shared.status_badge.inactive'),
    color: 'default',
    icon: <Minus size={14} />,
  },
  pending: {
    label: i18n.t('shared.status_badge.pending'),
    color: 'warning',
    icon: <Clock size={14} />,
  },
  approved: {
    label: i18n.t('shared.status_badge.approved'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  rejected: {
    label: i18n.t('shared.status_badge.rejected'),
    color: 'error',
    icon: <XCircle size={14} />,
  },
  draft: {
    label: i18n.t('shared.status_badge.draft'),
    color: 'default',
    icon: <FileText size={14} />,
  },
  published: {
    label: i18n.t('shared.status_badge.published'),
    color: 'primary',
    icon: <Eye size={14} />,
  },
  archived: {
    label: i18n.t('shared.status_badge.archived'),
    color: 'default',
    icon: <Lock size={14} />,
  },
  deleted: {
    label: i18n.t('shared.status_badge.deleted'),
    color: 'error',
    icon: <XCircle size={14} />,
  },
  completed: {
    label: i18n.t('shared.status_badge.completed'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  cancelled: {
    label: i18n.t('shared.status_badge.cancelled'),
    color: 'default',
    icon: <Ban size={14} />,
  },
  processing: {
    label: i18n.t('shared.status_badge.processing'),
    color: 'info',
    icon: <Zap size={14} />,
  },
  failed: {
    label: i18n.t('shared.status_badge.failed'),
    color: 'error',
    icon: <AlertCircle size={14} />,
  },
  success: {
    label: i18n.t('shared.status_badge.success'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  warning: {
    label: i18n.t('shared.status_badge.warning'),
    color: 'warning',
    icon: <AlertTriangle size={14} />,
  },
  error: {
    label: i18n.t('shared.status_badge.error'),
    color: 'error',
    icon: <AlertCircle size={14} />,
  },
  info: {
    label: i18n.t('shared.status_badge.info'),
    color: 'info',
    icon: <Info size={14} />,
  },

  // HRM状态
  employee_active: {
    label: i18n.t('shared.status_badge.employee_active'),
    color: 'success',
    icon: <User size={14} />,
  },
  employee_inactive: {
    label: i18n.t('shared.status_badge.employee_inactive'),
    color: 'default',
    icon: <XCircle size={14} />,
  },
  employee_probation: {
    label: i18n.t('shared.status_badge.employee_probation'),
    color: 'info',
    icon: <Clock size={14} />,
  },
  employee_pending: {
    label: i18n.t('shared.status_badge.employee_pending'),
    color: 'warning',
    icon: <Clock size={14} />,
  },

  // 部门状态
  department_active: {
    label: i18n.t('shared.status_badge.department_active'),
    color: 'success',
    icon: <Building2 size={14} />,
  },
  department_inactive: {
    label: i18n.t('shared.status_badge.department_inactive'),
    color: 'default',
    icon: <Minus size={14} />,
  },

  // 考勤状态
  attendance_normal: {
    label: i18n.t('shared.status_badge.attendance_normal'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  attendance_late: {
    label: i18n.t('shared.status_badge.attendance_late'),
    color: 'warning',
    icon: <AlertCircle size={14} />,
  },
  attendance_early_leave: {
    label: i18n.t('shared.status_badge.attendance_early_leave'),
    color: 'warning',
    icon: <AlertCircle size={14} />,
  },
  attendance_absent: {
    label: i18n.t('shared.status_badge.attendance_absent'),
    color: 'error',
    icon: <XCircle size={14} />,
  },
  attendance_leave: {
    label: i18n.t('shared.status_badge.attendance_leave'),
    color: 'info',
    icon: <Calendar size={14} />,
  },

  // 请假状态
  leave_pending: {
    label: i18n.t('shared.status_badge.leave_pending'),
    color: 'warning',
    icon: <Clock size={14} />,
  },
  leave_approved: {
    label: i18n.t('shared.status_badge.leave_approved'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  leave_rejected: {
    label: i18n.t('shared.status_badge.leave_rejected'),
    color: 'error',
    icon: <XCircle size={14} />,
  },
  leave_cancelled: {
    label: i18n.t('shared.status_badge.leave_cancelled'),
    color: 'default',
    icon: <Ban size={14} />,
  },

  // 薪酬状态
  payroll_draft: {
    label: i18n.t('shared.status_badge.payroll_draft'),
    color: 'default',
    icon: <FileText size={14} />,
  },
  payroll_calculated: {
    label: i18n.t('shared.status_badge.payroll_calculated'),
    color: 'info',
    icon: <DollarSign size={14} />,
  },
  payroll_paid: {
    label: i18n.t('shared.status_badge.payroll_paid'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  payroll_processing: {
    label: i18n.t('shared.status_badge.payroll_processing'),
    color: 'info',
    icon: <Zap size={14} />,
  },

  // 绩效状态
  performance_pending: {
    label: i18n.t('shared.status_badge.performance_pending'),
    color: 'default',
    icon: <Clock size={14} />,
  },
  performance_self_review: {
    label: i18n.t('shared.status_badge.performance_self_review'),
    color: 'info',
    icon: <User size={14} />,
  },
  performance_manager_review: {
    label: i18n.t('shared.status_badge.performance_manager_review'),
    color: 'warning',
    icon: <Building2 size={14} />,
  },
  performance_completed: {
    label: i18n.t('shared.status_badge.performance_completed'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  performance_not_started: {
    label: i18n.t('shared.status_badge.performance_not_started'),
    color: 'default',
    icon: <Minus size={14} />,
  },
  performance_in_progress: {
    label: i18n.t('shared.status_badge.performance_in_progress'),
    color: 'info',
    icon: <Zap size={14} />,
  },

  // CRM状态
  customer_active: {
    label: i18n.t('shared.status_badge.customer_active'),
    color: 'success',
    icon: <Heart size={14} />,
  },
  customer_inactive: {
    label: i18n.t('shared.status_badge.customer_inactive'),
    color: 'default',
    icon: <Minus size={14} />,
  },
  customer_blocked: {
    label: i18n.t('shared.status_badge.customer_blocked'),
    color: 'error',
    icon: <Lock size={14} />,
  },
  customer_potential: {
    label: i18n.t('shared.status_badge.customer_potential'),
    color: 'info',
    icon: <Star size={14} />,
  },

  // 商机状态
  opportunity_new: {
    label: i18n.t('shared.status_badge.opportunity_new'),
    color: 'info',
    icon: <Zap size={14} />,
  },
  opportunity_qualifying: {
    label: i18n.t('shared.status_badge.opportunity_qualifying'),
    color: 'warning',
    icon: <Clock size={14} />,
  },
  opportunity_proposal: {
    label: i18n.t('shared.status_badge.opportunity_proposal'),
    color: 'info',
    icon: <FileText size={14} />,
  },
  opportunity_negotiation: {
    label: i18n.t('shared.status_badge.opportunity_negotiation'),
    color: 'warning',
    icon: <ThumbsUp size={14} />,
  },
  opportunity_won: {
    label: i18n.t('shared.status_badge.opportunity_won'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  opportunity_lost: {
    label: i18n.t('shared.status_badge.opportunity_lost'),
    color: 'error',
    icon: <XCircle size={14} />,
  },

  // 项目状态
  project_planning: {
    label: i18n.t('shared.status_badge.project_planning'),
    color: 'default',
    icon: <FileText size={14} />,
  },
  project_active: {
    label: i18n.t('shared.status_badge.project_active'),
    color: 'success',
    icon: <Zap size={14} />,
  },
  project_on_hold: {
    label: i18n.t('shared.status_badge.project_on_hold'),
    color: 'warning',
    icon: <Clock size={14} />,
  },
  project_completed: {
    label: i18n.t('shared.status_badge.project_completed'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  project_cancelled: {
    label: i18n.t('shared.status_badge.project_cancelled'),
    color: 'error',
    icon: <XCircle size={14} />,
  },

  // 工作流状态
  workflow_draft: {
    label: i18n.t('shared.status_badge.workflow_draft'),
    color: 'default',
    icon: <FileText size={14} />,
  },
  workflow_pending: {
    label: i18n.t('shared.status_badge.workflow_pending'),
    color: 'warning',
    icon: <Clock size={14} />,
  },
  workflow_approved: {
    label: i18n.t('shared.status_badge.workflow_approved'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  workflow_rejected: {
    label: i18n.t('shared.status_badge.workflow_rejected'),
    color: 'error',
    icon: <XCircle size={14} />,
  },
  workflow_processing: {
    label: i18n.t('shared.status_badge.workflow_processing'),
    color: 'info',
    icon: <Zap size={14} />,
  },

  // 财务状态
  finance_draft: {
    label: i18n.t('shared.status_badge.finance_draft'),
    color: 'default',
    icon: <FileText size={14} />,
  },
  finance_pending: {
    label: i18n.t('shared.status_badge.finance_pending'),
    color: 'warning',
    icon: <Clock size={14} />,
  },
  finance_approved: {
    label: i18n.t('shared.status_badge.finance_approved'),
    color: 'info',
    icon: <CheckCircle size={14} />,
  },
  finance_posted: {
    label: i18n.t('shared.status_badge.finance_posted'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  finance_imported: {
    label: i18n.t('shared.status_badge.finance_imported'),
    color: 'secondary',
    icon: <FileText size={14} />,
  },

  // Dashboard模块状态
  online: {
    label: i18n.t('shared.status_badge.online'),
    color: 'success',
    icon: <CheckCircle size={14} />,
  },
  beta: {
    label: i18n.t('shared.status_badge.beta'),
    color: 'warning',
    icon: <Zap size={14} />,
  },
  plan: {
    label: i18n.t('shared.status_badge.plan'),
    color: 'default',
    icon: <FileText size={14} />,
  },
  new: {
    label: i18n.t('shared.status_badge.new'),
    color: 'info',
    icon: <Star size={14} />,
  },
};

// ============ 尺寸配置映射 ============

const SIZE_CONFIG: Record<StatusSize, 'small' | 'medium'> = {
  sm: 'small',
  md: 'medium',
  lg: 'medium', // MUI Chip max size is medium; icon sizing handled below
};

const SIZE_STYLES: Record<StatusSize, any> = {
  sm: {
    height: 24,
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  md: {
    height: 32,
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  lg: {
    height: 40,
    fontSize: '1rem',
    fontWeight: 600,
  },
};

// ============ 变体样式映射 ============

const VARIANT_STYLES: Record<StatusVariant, any> = {
  filled: (color: StatusColor) => ({
    sx: {
      bgcolor: color === 'default' ? 'grey.400' : `${color}.main`,
      color: color === 'default' ? 'var(--color-primary-foreground, var(--color-primary-foreground, #ffffff))' : 'var(--color-primary-foreground, var(--color-primary-foreground, #ffffff))',
    },
  }),
  outlined: {
    variant: 'outlined',
  },
  soft: (color: StatusColor) => ({
    sx: {
      bgcolor: `${color}.light`,
      color: `${color}.dark`,
      border: 'none',
    },
  }),
};

// ============ 颜色映射辅助函数 ============

/**
 * 将自定义颜色转换为MUI颜色
 */
const mapColorToMui = (color?: StatusColor | string): StatusColor => {
  const validColors: StatusColor[] = [
    'default',
    'primary',
    'secondary',
    'success',
    'warning',
    'error',
    'info',
  ];
  return validColors.includes(color as StatusColor) ? (color as StatusColor) : 'default';
};

// ============ StatusBadge组件 ============

/**
 * 统一的StatusBadge组件
 * 支持动态颜色映射、图标集成、多种尺寸和变体、点击事件
 *
 * @example
 * ```tsx
 * // 使用预设状态
 * <StatusBadge status="active" />
 *
 * // 使用自定义状态映射
 * <StatusBadge
 *   status="custom"
 *   statusMap={{
 *     custom: { label: "自定义", color: "success", icon: <Star /> }
 *   }}
 * />
 *
 * // 显示图标
 * <StatusBadge status="approved" showIcon />
 *
 * // 可点击
 * <StatusBadge status="pending" clickable onClick={handleClick} />
 *
 * // 自定义尺寸和变体
 * <StatusBadge status="active" size="lg" variant="soft" />
 * ```
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  statusMap = DEFAULT_STATUS_MAP,
  label,
  color,
  icon,
  showIcon = false,
  size = 'sm',
  variant = 'filled',
  clickable = false,
  onClick,
  disabled = false,
  sx,
  useChip = true,
  render,
}) => {
  // 获取状态配置
  const config: StatusConfig = statusMap[status] || {
    label: label || status,
    color: color || 'default',
    icon,
  };

  // 如果提供了自定义渲染函数，使用它
  if (render) {
    return render(config);
  }

  // 如果不使用Chip，直接渲染文本
  if (!useChip) {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          ...sx,
        }}
      >
        {showIcon && config.icon && <Box sx={{ mr: 0.5 }}>{config.icon}</Box>}
        <Typography variant='body2'>{label || config.label}</Typography>
      </Box>
    );
  }

  // 准备Chip的属性
  const chipColor = mapColorToMui(color || config.color);
  const chipSize = SIZE_CONFIG[size];
  const chipSx = {
    ...SIZE_STYLES[size],
    ...(variant === 'soft' ? VARIANT_STYLES.soft(chipColor) : {}),
    ...(clickable ? { cursor: 'pointer' } : {}),
    ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
    ...sx,
  };

  // 渲染Chip
  return (
    <Chip
      label={label || config.label}
      color={chipColor}
      size={chipSize}
      icon={
        showIcon && (icon || config.icon) ? (
          <Box
            sx={{
              display: 'flex',
              '& svg': {
                width: size === 'lg' ? 20 : size === 'md' ? 16 : 14,
                height: size === 'lg' ? 20 : size === 'md' ? 16 : 14,
              },
            }}
          >
            {icon || config.icon}
          </Box>
        ) : undefined
      }
      variant={variant === 'outlined' ? 'outlined' : 'filled'}
      onClick={clickable && !disabled ? onClick : undefined}
      disabled={disabled}
      sx={chipSx}
    />
  );
};

// ============ 便捷组件导出 ============

interface TypedStatusBadgeProps<T extends string> extends Omit<StatusBadgeProps, 'status'> {
  status: T;
}

/**
 * HRM员工状态徽章
 */
export const EmployeeStatusBadge: React.FC<TypedStatusBadgeProps<EmployeeStatus>> = (props) => (
  <StatusBadge {...props} />
);

/**
 * HRM考勤状态徽章
 */
export const AttendanceStatusBadge: React.FC<TypedStatusBadgeProps<AttendanceStatus>> = (props) => (
  <StatusBadge {...props} />
);

/**
 * HRM请假状态徽章
 */
export const LeaveStatusBadge: React.FC<TypedStatusBadgeProps<LeaveStatus>> = (props) => (
  <StatusBadge {...props} />
);

/**
 * HRM薪酬状态徽章
 */
export const PayrollStatusBadge: React.FC<TypedStatusBadgeProps<PayrollStatus>> = (props) => (
  <StatusBadge {...props} />
);

/**
 * HRM绩效状态徽章
 */
export const PerformanceStatusBadge: React.FC<TypedStatusBadgeProps<PerformanceStatus>> = (
  props
) => <StatusBadge {...props} />;

/**
 * CRM客户状态徽章
 */
export const CustomerStatusBadge: React.FC<TypedStatusBadgeProps<CustomerStatus>> = (props) => (
  <StatusBadge {...props} />
);

/**
 * CRM商机状态徽章
 */
export const OpportunityStatusBadge: React.FC<TypedStatusBadgeProps<OpportunityStatus>> = (
  props
) => <StatusBadge {...props} />;

/**
 * 项目状态徽章
 */
export const ProjectStatusBadge: React.FC<TypedStatusBadgeProps<ProjectStatus>> = (props) => (
  <StatusBadge {...props} />
);

/**
 * 工作流状态徽章
 */
export const WorkflowStatusBadge: React.FC<TypedStatusBadgeProps<WorkflowStatus>> = (props) => (
  <StatusBadge {...props} />
);

/**
 * 财务状态徽章
 */
export const FinanceStatusBadge: React.FC<TypedStatusBadgeProps<FinanceStatus>> = (props) => (
  <StatusBadge {...props} />
);

/**
 * Dashboard模块状态徽章
 */
export const ModuleStatusBadge: React.FC<TypedStatusBadgeProps<ModuleStatusValue>> = (props) => (
  <StatusBadge {...props} />
);

// ============ 默认导出 ============

export default StatusBadge;
