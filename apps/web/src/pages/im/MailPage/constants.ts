export interface BadgeConfig {
  label: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
}

export const STATUS_MAP: Record<string, BadgeConfig> = {
  pending: { label: '待发送', variant: 'secondary' },
  sent: { label: '已发送', variant: 'default' },
  failed: { label: '发送失败', variant: 'destructive' },
};

export const PRIORITY_MAP: Record<string, BadgeConfig> = {
  low: { label: '低', variant: 'outline' },
  normal: { label: '普通', variant: 'secondary' },
  high: { label: '高', variant: 'default' },
  urgent: { label: '紧急', variant: 'destructive' },
};

export const PREVIEW_SAMPLE_DATA: Record<string, string> = {
  user_name: '张三',
  username: 'zhangsan',
  process_name: '报销申请',
  approval_status: '已通过',
  approver_name: '李四',
  approval_time: '2024-01-15 10:30',
  approval_comment: '同意报销',
  alert_type: '系统告警',
  alertlevel: '紧急',
  alert_time: '2024-01-15 10:30',
  alert_message: '磁盘空间不足',
  contract_name: '服务合同',
  contractNo: 'CT-2024-001',
  contract_action: '已签署',
  action_time: '2024-01-15 10:30',
  register_time: '2024-01-15 10:30',
  reset_link: 'https://example.com/reset-password',
  expire_time: '24小时',
  title: '测试标题',
  content: '测试内容',
};
