import type { Email, EmailTemplate } from '@/api/mail';

export interface SendForm {
  subject: string;
  to_addresses: string;
  cc_addresses: string;
  bcc_addresses: string;
  body: string;
  priority: string;
  template_code: string;
  useTemplate: boolean;
  templateData: string;
}

export interface TemplateForm {
  code: string;
  name: string;
  description: string;
  subject_template: string;
  body_template: string;
  body_html_template: string;
  category: string;
  tags: string;
}

export interface PreviewContent {
  subject: string;
  body: string;
}

export interface EmailListProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  setCurrentPage: (page: number) => void;
  emails: Email[];
  totalEmails: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  selectedEmails: string[];
  setSelectedEmails: React.Dispatch<React.SetStateAction<string[]>>;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  openEmailDetail: (email: Email) => void;
  openResendEmailDialog: (emailId: string) => void;
  openDeleteEmailDialog: (emailId: string) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  setBatchResendDialogOpen: (open: boolean) => void;
  setBatchDeleteDialogOpen: (open: boolean) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getPriorityBadge: (priority: string) => React.ReactNode;
}

export interface TemplateListProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  setCurrentPage: (page: number) => void;
  templates: EmailTemplate[];
  totalTemplates: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  handleEyeTemplate: (template: EmailTemplate) => void;
  openEditTemplate: (template: EmailTemplate) => void;
  handleToggleTemplateStatus: (template: EmailTemplate) => void;
  openDeleteTemplateDialog: (templateId: string) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  getCategoryLabel: (category: string) => string;
}
