import type { Email } from '@/api/mail';

export interface SendForm {
  subject: string;
  to_addresses: string;
  cc_addresses: string;
  bcc_addresses: string;
  body: string;
  priority: string;
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
