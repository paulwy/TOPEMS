import { Package, Users, DollarSign, FileText } from 'lucide-react';
import i18n from '@/i18n';

export interface ApprovalItem {
  id: string;
  title: string;
  type: 'purchase' | 'leave' | 'expense' | 'contract' | 'other';
  applicant: string;
  department: string;
  submitTime: string;
  amount?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  description: string;
  steps: {
    name: string;
    status: 'completed' | 'current' | 'pending';
    time?: string;
  }[];
}
export interface ApiApproval {
  id?: string;
  task_id?: string;
  title?: string;
  task_name?: string;
  type?: string;
  applicant_name?: string;
  assignee_name?: string;
  applicant?: string;
  department?: string;
  department_name?: string;
  created_at?: string;
  amount?: string | number;
  priority?: string;
  status?: string;
  description?: string;
  remarks?: string;
  steps?: Array<{
    name: string;
    status: 'completed' | 'current' | 'pending';
    time?: string;
  }>;
}
export const getTypeIcon = (type: ApprovalItem['type']) => {
  switch (type) {
    case 'purchase':
      return <Package style={{ width: 20, height: 20 }} />;
    case 'leave':
      return <Users style={{ width: 20, height: 20 }} />;
    case 'expense':
      return <DollarSign style={{ width: 20, height: 20 }} />;
    case 'contract':
      return <FileText style={{ width: 20, height: 20 }} />;
    default:
      return <FileText style={{ width: 20, height: 20 }} />;
  }
};
export const getTypeColor = (type: ApprovalItem['type']) => {
  switch (type) {
    case 'purchase':
      return 'primary';
    case 'leave':
      return 'success';
    case 'expense':
      return 'warning';
    case 'contract':
      return 'info';
    default:
      return 'default';
  }
};
export const getPriorityColor = (priority: ApprovalItem['priority']) => {
  switch (priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
  }
};
export const getPriorityLabel = (
  priority: ApprovalItem['priority'],
  _t: (key: string) => string
) => {
  switch (priority) {
    case 'high':
      return i18n.t('mobile.approval.priority.urgent');
    case 'medium':
      return i18n.t('mobile.approval.priority.normal');
    case 'low':
      return i18n.t('mobile.approval.priority.low');
  }
};
