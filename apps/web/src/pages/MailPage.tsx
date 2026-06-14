import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tabs,
  Tab,
  Box,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  FileText,
  Eye,
  SendIcon,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Trash,
  BarChart3,
  Play,
  Pause,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import {
  emailApi,
  templateApi,
  type Email,
  type EmailTemplate,
  type EmailStats,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  TEMPLATE_CATEGORIES,
} from "../api/mail";


const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateEmailList = (
  emails: string,
): { valid: boolean; invalidEmails: string[] } => {
  if (!emails.trim()) {
    return { valid: true, invalidEmails: [] };
  }
  const emailList = emails
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const invalidEmails = emailList.filter((email) => !validateEmail(email));
  return { valid: invalidEmails.length === 0, invalidEmails };
};

const validateJson = (jsonString: string): boolean => {
  if (!jsonString.trim()) return true;
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

const MailPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState("emails");
  const [emails, setEmails] = useState<Email[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [showSendModal, setShowSendModal] = useState(false);
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [selectedTemplateForSend, setSelectedTemplateForSend] = useState<
    string | null
  >(null);

  const [sendForm, setSendForm] = useState({
    subject: "",
    to_addresses: "",
    cc_addresses: "",
    bcc_addresses: "",
    body: "",
    priority: "normal",
    template_code: "",
    useTemplate: false,
    templateData: "",
  });

  const [templateForm, setTemplateForm] = useState({
    code: "",
    name: "",
    description: "",
    subject_template: "",
    body_template: "",
    body_html_template: "",
    category: "general",
    tags: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalEmails, setTotalEmails] = useState(0);
  const [totalTemplates, setTotalTemplates] = useState(0);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [showEyeModal, setShowEyeModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "emails") {
      loadEmails();
      loadStats();
    } else {
      loadTemplates();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "emails") {
      loadEmails();
    } else {
      loadTemplates();
    }
  }, [currentPage, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await emailApi.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      addNotification({
        title: "加载失败",
        message: err.message || "加载统计数据失败",
        type: "error",
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const loadEmails = async () => {
    setLoading(true);
    try {
      const res = await emailApi.list({
        page: currentPage,
        page_size: pageSize,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });
      if (res.success && res.data) {
        setEmails(res.data.items || []);
        setTotalEmails(res.data.total || 0);
      }
    } catch (err: any) {
      addNotification({
        title: "加载失败",
        message: err.message || "加载邮件列表失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await templateApi.list({
        page: currentPage,
        page_size: pageSize,
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
      });
      if (res.success && res.data) {
        setTemplates(res.data.items || []);
        setTotalTemplates(res.data.total || 0);
      }
    } catch (err: any) {
      addNotification({
        title: "加载失败",
        message: err.message || "加载模板列表失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!sendForm.subject.trim()) {
      errors.subject = "请输入邮件主题";
    }

    if (!sendForm.to_addresses.trim()) {
      errors.to_addresses = "请输入收件人邮箱";
    } else {
      const { valid, invalidEmails } = validateEmailList(sendForm.to_addresses);
      if (!valid) {
        errors.to_addresses = `无效的邮箱地址: ${invalidEmails.join(", ")}`;
      }
    }

    if (
      sendForm.cc_addresses &&
      !validateEmailList(sendForm.cc_addresses).valid
    ) {
      const { invalidEmails } = validateEmailList(sendForm.cc_addresses);
      errors.cc_addresses = `无效的抄送邮箱: ${invalidEmails.join(", ")}`;
    }

    if (
      sendForm.bcc_addresses &&
      !validateEmailList(sendForm.bcc_addresses).valid
    ) {
      const { invalidEmails } = validateEmailList(sendForm.bcc_addresses);
      errors.bcc_addresses = `无效的密送邮箱: ${invalidEmails.join(", ")}`;
    }

    if (!sendForm.body.trim()) {
      errors.body = "请输入邮件内容";
    }

    if (sendForm.useTemplate && sendForm.template_code) {
      if (sendForm.templateData && !validateJson(sendForm.templateData)) {
        errors.templateData = "无效的JSON格式";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setLoading(true);

    try {
      const toAddresses = sendForm.to_addresses
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const ccAddresses = sendForm.cc_addresses
        ? sendForm.cc_addresses
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      const bccAddresses = sendForm.bcc_addresses
        ? sendForm.bcc_addresses
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      if (sendForm.useTemplate && sendForm.template_code) {
        let templateData: Record<string, any> = {};
        try {
          templateData = JSON.parse(sendForm.templateData || "{}");
        } catch {
          templateData = {};
        }

        const res = await emailApi.sendWithTemplate({
          template_code: sendForm.template_code,
          to_addresses: toAddresses,
          cc_addresses: ccAddresses,
          bcc_addresses: bccAddresses,
          template_data: templateData,
          priority: sendForm.priority,
        });

        if (res.success) {
          addNotification({
            title: "成功",
            message: "邮件发送成功",
            type: "success",
          });
          setShowSendModal(false);
          resetSendForm();
          loadEmails();
        } else {
          addNotification({
            title: "失败",
            message: res.message || "发送邮件失败",
            type: "error",
          });
        }
      } else {
        const res = await emailApi.send({
          subject: sendForm.subject,
          to_addresses: toAddresses,
          cc_addresses: ccAddresses,
          bcc_addresses: bccAddresses,
          body: sendForm.body,
          priority: sendForm.priority,
        });

        if (res.success) {
          addNotification({
            title: "成功",
            message: "邮件发送成功",
            type: "success",
          });
          setShowSendModal(false);
          resetSendForm();
          loadEmails();
        } else {
          addNotification({
            title: "失败",
            message: res.message || "发送邮件失败",
            type: "error",
          });
        }
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "发送邮件失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetSendForm = () => {
    setSendForm({
      subject: "",
      to_addresses: "",
      cc_addresses: "",
      bcc_addresses: "",
      body: "",
      priority: "normal",
      template_code: "",
      useTemplate: false,
      templateData: "",
    });
    setSelectedTemplateForSend(null);
  };

  const handleDeleteEmail = async (emailId: string) => {
    if (!confirm("确定要删除这个邮件记录吗？")) return;
    try {
      const res = await emailApi.delete(emailId);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "邮件记录删除成功",
          type: "success",
        });
        setSelectedEmails((prev) => prev.filter((id) => id !== emailId));
        loadEmails();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除失败",
        type: "error",
      });
    }
  };

  const handleResendEmail = async (emailId: string) => {
    if (!confirm("确定要重新发送这封邮件吗？")) return;
    try {
      const res = await emailApi.get(emailId);
      if (res.success && res.data) {
        const email = res.data;
        const toAddresses = Array.isArray(email.to_addresses)
          ? email.to_addresses
          : [email.to_addresses];
        const ccAddresses = email.cc_addresses
          ? Array.isArray(email.cc_addresses)
            ? email.cc_addresses
            : [email.cc_addresses]
          : undefined;
        const bccAddresses = email.bcc_addresses
          ? Array.isArray(email.bcc_addresses)
            ? email.bcc_addresses
            : [email.bcc_addresses]
          : undefined;

        const sendRes = await emailApi.send({
          subject: email.subject,
          to_addresses: toAddresses,
          cc_addresses: ccAddresses,
          bcc_addresses: bccAddresses,
          body: email.body,
          priority: email.priority,
        });

        if (sendRes.success) {
          addNotification({
            title: "成功",
            message: "邮件重新发送成功",
            type: "success",
          });
          loadEmails();
        } else {
          addNotification({
            title: "失败",
            message: sendRes.message || "重发邮件失败",
            type: "error",
          });
        }
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "重发邮件失败",
        type: "error",
      });
    }
  };

  const handleBatchDeleteEmails = async () => {
    if (selectedEmails.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedEmails.length} 条邮件记录吗？`))
      return;

    let successCount = 0;
    for (const emailId of selectedEmails) {
      try {
        const res = await emailApi.delete(emailId);
        if (res.success) successCount++;
      } catch {
        // ignore individual failures
      }
    }

    addNotification({
      title: "完成",
      message: `成功删除 ${successCount}/${selectedEmails.length} 条记录`,
      type: successCount === selectedEmails.length ? "success" : "warning",
    });
    setSelectedEmails([]);
    loadEmails();
  };

  const handleBatchResendEmails = async () => {
    if (selectedEmails.length === 0) return;
    if (!confirm(`确定要重新发送选中的 ${selectedEmails.length} 条邮件吗？`))
      return;

    try {
      const res = await emailApi.resend(selectedEmails);
      if (res.success && res.data) {
        const result = res.data;
        addNotification({
          title: "完成",
          message: `成功重发 ${result.success}/${result.total} 条邮件`,
          type: result.success === result.total ? "success" : "warning",
        });
      } else {
        addNotification({
          title: "失败",
          message: res.message || "批量重发失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "批量重发失败",
        type: "error",
      });
    }
    setSelectedEmails([]);
    loadEmails();
    loadStats();
  };

  const handleToggleTemplateStatus = async (template: EmailTemplate) => {
    const newStatus = template.status === "active" ? "inactive" : "active";
    try {
      const res = await templateApi.updateStatus(template.id, newStatus);
      if (res.success) {
        addNotification({
          title: "成功",
          message: `模板已${newStatus === "active" ? "启用" : "禁用"}`,
          type: "success",
        });
        loadTemplates();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新状态失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新状态失败",
        type: "error",
      });
    }
  };

  const handleEyeTemplate = async (template: EmailTemplate) => {
    try {
      const sampleData: Record<string, string> = {
        user_name: "张三",
        username: "zhangsan",
        process_name: "报销申请",
        approval_status: "已通过",
        approver_name: "李四",
        approval_time: "2024-01-15 10:30",
        approval_comment: "同意报销",
        alert_type: "系统告警",
        alert_level: "紧急",
        alert_time: "2024-01-15 10:30",
        alert_message: "磁盘空间不足",
        contract_name: "服务合同",
        contract_no: "CT-2024-001",
        contract_action: "已签署",
        action_time: "2024-01-15 10:30",
        register_time: "2024-01-15 10:30",
        reset_link: "https://example.com/reset-password",
        expire_time: "24小时",
        title: "测试标题",
        content: "测试内容",
      };

      const res = await templateApi.render(template.code, sampleData);
      if (res.success && res.data) {
        setPreviewContent({
          subject: res.data.subject,
          body: res.data.body,
        });
        setShowEyeModal(true);
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "预览模板失败",
        type: "error",
      });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tags = templateForm.tags
        ? templateForm.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const res = await templateApi.create({
        code: templateForm.code,
        name: templateForm.name,
        description: templateForm.description || undefined,
        subject_template: templateForm.subject_template,
        body_template: templateForm.body_template,
        body_html_template: templateForm.body_html_template || undefined,
        category: templateForm.category,
        tags,
      });

      if (res.success) {
        addNotification({
          title: "成功",
          message: "模板创建成功",
          type: "success",
        });
        setShowTemplateModal(false);
        resetTemplateForm();
        loadTemplates();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建模板失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建模板失败",
        type: "error",
      });
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      code: "",
      name: "",
      description: "",
      subject_template: "",
      body_template: "",
      body_html_template: "",
      category: "general",
      tags: "",
    });
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    try {
      const tags = templateForm.tags
        ? templateForm.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const res = await templateApi.update(selectedTemplate.id, {
        name: templateForm.name || undefined,
        description: templateForm.description || undefined,
        subject_template: templateForm.subject_template || undefined,
        body_template: templateForm.body_template || undefined,
        body_html_template: templateForm.body_html_template || undefined,
        category: templateForm.category || undefined,
        tags,
      });

      if (res.success) {
        addNotification({
          title: "成功",
          message: "模板更新成功",
          type: "success",
        });
        setShowEditTemplateModal(false);
        setSelectedTemplate(null);
        resetTemplateForm();
        loadTemplates();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新模板失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新模板失败",
        type: "error",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("确定要删除这个模板吗？")) return;
    try {
      const res = await templateApi.delete(templateId);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "模板删除成功",
          type: "success",
        });
        loadTemplates();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除失败",
        type: "error",
      });
    }
  };

  const openEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      code: template.code,
      name: template.name,
      description: template.description || "",
      subject_template: template.subject_template,
      body_template: template.body_template,
      body_html_template: template.body_html_template || "",
      category: template.category,
      tags: template.tags?.join(", ") || "",
    });
    setShowEditTemplateModal(true);
  };

  const openEmailDetail = (email: Email) => {
    setSelectedEmail(email);
    setShowEmailDetail(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "destructive" | "outline" | "secondary";
      }
    > = {
      pending: { label: "待发送", variant: "secondary" },
      sent: { label: "已发送", variant: "default" },
      failed: { label: "发送失败", variant: "destructive" },
    };
    const s = statusMap[status] || { label: status, variant: "outline" };
    return <Chip size="small" variant={s.variant === "outline" ? "outlined" : "filled"} label={s.label} />;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<
      string,
      {
        label: string;
        variant: "default" | "destructive" | "outline" | "secondary";
      }
    > = {
      low: { label: "低", variant: "outline" },
      normal: { label: "普通", variant: "secondary" },
      high: { label: "高", variant: "default" },
      urgent: { label: "紧急", variant: "destructive" },
    };
    const p = priorityMap[priority] || { label: priority, variant: "outline" };
    return <Chip size="small" variant={p.variant === "outline" ? "outlined" : "filled"} label={p.label} />;
  };

  const getCategoryLabel = (category: string) => {
    const cat = TEMPLATE_CATEGORIES.find((c) => c.value === category);
    return cat?.label || category;
  };

  const handleTemplateChange = async (code: string) => {
    if (!code) return;
    const template = templates.find((t) => t.code === code);
    if (template) {
      setSendForm((prev) => ({
        ...prev,
        subject: template.subject_template,
        body: template.body_template,
        template_code: code,
      }));
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages =
      activeTab === "emails"
        ? Math.ceil(totalEmails / pageSize)
        : Math.ceil(totalTemplates / pageSize);
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <Mail className="w-7 h-7 mr-3 text-blue-600" />
                  邮件管理
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  管理邮件发送和邮件模板
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {activeTab === "emails" && (
                <Button onClick={() => setShowSendModal(true)}>
                  <Send className="w-5 h-5 mr-2" />
                  发送邮件
                </Button>
              )}
              {activeTab === "templates" && (
                <Button onClick={() => setShowTemplateModal(true)}>
                  <Plus className="w-5 h-5 mr-2" />
                  创建模板
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ width: '100%' }}>
          <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
            <Tab value="emails" icon={<Mail size={16} />} iconPosition="start" sx={{ textTransform: 'none', minHeight: 48 }} label="邮件记录" />
            <Tab value="templates" icon={<FileText size={16} />} iconPosition="start" sx={{ textTransform: 'none', minHeight: 48 }} label="邮件模板" />
          </Box>

          {activeTab === 'emails' && (
            <Box sx={{ mt: 0 }}>
            <div className="mb-6 flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <TextField
                  type="text"
                  placeholder="搜索邮件主题、发件人..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  size="small"
                  sx={{ pl: 5, width: '100%' }}
                />
              </div>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>状态</InputLabel>
                <Select
                  value={statusFilter || "all"}
                  label="状态"
                  onChange={(e) => {
                    setStatusFilter(e.target.value === "all" ? "" : e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <MenuItem value="all">全部</MenuItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>优先级</InputLabel>
                <Select
                  value={priorityFilter || "all"}
                  label="优先级"
                  onChange={(e) => {
                    setPriorityFilter(e.target.value === "all" ? "" : e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <MenuItem value="all">全部</MenuItem>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">邮件总数</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {statsLoading ? "..." : stats?.total || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 border-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">已发送</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {statsLoading ? "..." : stats?.sent_count || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 border-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm">待发送</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {statsLoading ? "..." : stats?.pending_count || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-500 to-red-600 border-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm">发送失败</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {statsLoading ? "..." : stats?.failed_count || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                {selectedEmails.length > 0 && (
                  <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      已选择 {selectedEmails.length} 条记录
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleBatchResendEmails}
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        批量重发
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleBatchDeleteEmails}
                        className="gap-2"
                      >
                        <Trash className="w-4 h-4" />
                        批量删除
                      </Button>
                    </div>
                  </div>
                )}
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      加载中...
                    </p>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="p-8 text-center">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      暂无邮件记录
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left px-3 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 w-12">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmails(emails.map((e) => e.id));
                                } else {
                                  setSelectedEmails([]);
                                }
                              }}
                              checked={selectedEmails.length === emails.length}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            主题
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            收件人
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            发件人
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            状态
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            优先级
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            创建时间
                          </th>
                          <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {emails.map((email) => (
                          <tr
                            key={email.id}
                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <td className="px-3 py-4">
                              <input
                                type="checkbox"
                                checked={selectedEmails.includes(email.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEmails((prev) => [
                                      ...prev,
                                      email.id,
                                    ]);
                                  } else {
                                    setSelectedEmails((prev) =>
                                      prev.filter((id) => id !== email.id),
                                    );
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                                {email.subject}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                              {Array.isArray(email.to_addresses)
                                ? email.to_addresses.join(", ")
                                : email.to_addresses}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                              {email.from_address}
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(email.status)}
                            </td>
                            <td className="px-6 py-4">
                              {getPriorityBadge(email.priority)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                              {new Date(email.created_at).toLocaleString(
                                "zh-CN",
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end space-x-1">
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() =>
                                    copyToClipboard(
                                      email.id,
                                      `email-${email.id}`,
                                    )
                                  }
                                  title="复制ID"
                                >
                                  {copiedId === `email-${email.id}` ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() => openEmailDetail(email)}
                                  title="查看详情"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {email.status === "failed" && (
                                  <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => handleResendEmail(email.id)}
                                    className="text-green-600 hover:text-green-700"
                                    title="重新发送"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="text"
                                  size="small"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteEmail(email.id)}
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              {!loading && emails.length > 0 && (
                <CardContent className="flex items-center justify-between border-t">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    共 {totalEmails} 条记录
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="text"
                      size="small"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {currentPage} / {Math.ceil(totalEmails / pageSize)}
                    </span>
                    <Button
                      variant="text"
                      size="small"
                      onClick={handleNextPage}
                      disabled={
                        currentPage >= Math.ceil(totalEmails / pageSize)
                      }
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
            </Box>)}

          {activeTab === 'templates' && (
            <Box sx={{ mt: 0 }}>
            <div className="mb-6 flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <TextField
                  type="text"
                  placeholder="搜索模板名称、编码..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  size="small"
                  sx={{ pl: 5, width: '100%' }}
                />
              </div>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>分类</InputLabel>
                <Select
                  value={categoryFilter || "all"}
                  label="分类"
                  onChange={(e) => {
                    setCategoryFilter(e.target.value === "all" ? "" : e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <MenuItem value="all">全部</MenuItem>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      加载中...
                    </p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      暂无邮件模板
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            名称
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            编码
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            分类
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            主题模板
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            状态
                          </th>
                          <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            创建时间
                          </th>
                          <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {templates.map((template) => (
                          <tr
                            key={template.id}
                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {template.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                              {template.code}
                            </td>
                            <td className="px-6 py-4">
                              <Chip size="small" variant="outlined" label={getCategoryLabel(template.category)} />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 truncate max-w-sm">
                              {template.subject_template}
                            </td>
                            <td className="px-6 py-4">
                              <Chip size="small"
                                variant={template.status === "active" ? "filled" : "outlined"}
                                label={template.status === "active" ? "启用" : "禁用"} />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                              {new Date(template.created_at).toLocaleString(
                                "zh-CN",
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end space-x-1">
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() => handleEyeTemplate(template)}
                                  title="预览模板"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() => openEditTemplate(template)}
                                  title="编辑"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() =>
                                    handleToggleTemplateStatus(template)
                                  }
                                  title={
                                    template.status === "active"
                                      ? "禁用模板"
                                      : "启用模板"
                                  }
                                  className={
                                    template.status === "active"
                                      ? "text-yellow-600 hover:text-yellow-700"
                                      : "text-green-600 hover:text-green-700"
                                  }
                                >
                                  {template.status === "active" ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="text"
                                  size="small"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() =>
                                    handleDeleteTemplate(template.id)
                                  }
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              {!loading && templates.length > 0 && (
                <CardContent className="flex items-center justify-between border-t">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    共 {totalTemplates} 条记录
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="text"
                      size="small"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {currentPage} / {Math.ceil(totalTemplates / pageSize)}
                    </span>
                    <Button
                      variant="text"
                      size="small"
                      onClick={handleNextPage}
                      disabled={
                        currentPage >= Math.ceil(totalTemplates / pageSize)
                      }
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
            </Box>)}
        </Tabs>
      </div>

      <Dialog open={showSendModal} onClose={() => setShowSendModal(false)}>
        <DialogContent sx={{ maxWidth: 720 }}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SendIcon size={20} />
            发送邮件
          </DialogTitle>
          <form onSubmit={handleSendEmail}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <InputLabel sx={{ fontSize: '1rem', fontWeight: 500 }}>使用模板</InputLabel>
                <Button
                  variant="text"
                  size="small"
                  onClick={() =>
                    setSendForm((prev) => ({
                      ...prev,
                      useTemplate: !prev.useTemplate,
                    }))
                  }
                  sx={sendForm.useTemplate ? { color: 'primary.main' } : {}}
                >
                  {sendForm.useTemplate ? "取消使用模板" : "使用模板"}
                </Button>
              </Box>

              {sendForm.useTemplate && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <InputLabel htmlFor="template-select">选择模板</InputLabel>
                  <FormControl fullWidth size="small">
                    <Select
                      value={sendForm.template_code}
                      onChange={(e) => {
                        setSendForm((prev) => ({ ...prev, template_code: e.target.value }));
                        handleTemplateChange(e.target.value);
                      }}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>选择邮件模板</MenuItem>
                      {templates.map((t) => (
                        <MenuItem key={t.code} value={t.code}>
                          {t.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor="template-data">模板数据（JSON格式）</InputLabel>
                    <TextField
                      id="template-data"
                      placeholder={`{"user_name": "张三", "process_name": "报销申请"}`}
                      value={sendForm.templateData}
                      onChange={(e) =>
                        setSendForm((prev) => ({
                          ...prev,
                          templateData: e.target.value,
                        }))
                      }
                      multiline
                      minRows={3}
                      error={!!formErrors.templateData}
                      helperText={formErrors.templateData}
                      sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                    />
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="send-subject">主题 *</InputLabel>
                <TextField
                  id="send-subject"
                  value={sendForm.subject}
                  onChange={(e) =>
                    setSendForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  placeholder="输入邮件主题"
                  error={!!formErrors.subject}
                  helperText={formErrors.subject}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="send-to">收件人 *</InputLabel>
                <TextField
                  id="send-to"
                  value={sendForm.to_addresses}
                  onChange={(e) =>
                    setSendForm((prev) => ({
                      ...prev,
                      to_addresses: e.target.value,
                    }))
                  }
                  placeholder="多个邮箱用逗号分隔"
                  error={!!formErrors.to_addresses}
                  helperText={formErrors.to_addresses}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="send-cc">抄送</InputLabel>
                <TextField
                  id="send-cc"
                  value={sendForm.cc_addresses}
                  onChange={(e) =>
                    setSendForm((prev) => ({
                      ...prev,
                      cc_addresses: e.target.value,
                    }))
                  }
                  placeholder="多个邮箱用逗号分隔"
                  error={!!formErrors.cc_addresses}
                  helperText={formErrors.cc_addresses}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="send-bcc">密送</InputLabel>
                <TextField
                  id="send-bcc"
                  value={sendForm.bcc_addresses}
                  onChange={(e) =>
                    setSendForm((prev) => ({
                      ...prev,
                      bcc_addresses: e.target.value,
                    }))
                  }
                  placeholder="多个邮箱用逗号分隔"
                  error={!!formErrors.bcc_addresses}
                  helperText={formErrors.bcc_addresses}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <InputLabel htmlFor="send-body">邮件内容 *</InputLabel>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                      value={sendForm.priority}
                      onChange={(e) =>
                        setSendForm((prev) => ({ ...prev, priority: e.target.value }))
                      }
                    >
                      {PRIORITY_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <TextField
                  id="send-body"
                  value={sendForm.body}
                  onChange={(e) =>
                    setSendForm((prev) => ({ ...prev, body: e.target.value }))
                  }
                  placeholder="输入邮件内容"
                  multiline
                  minRows={4}
                  error={!!formErrors.body}
                  helperText={formErrors.body}
                />
              </Box>
            </Box>
            <DialogActions sx={{ mt: 3 }}>
              <Button
                type="button"
                variant="contained"
                onClick={() => {
                  setShowSendModal(false);
                  resetSendForm();
                }}
              >
                取消
              </Button>
              <Button type="submit">发送邮件</Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailDetail} onClose={() => setShowEmailDetail(false)}>
        <DialogContent sx={{ maxWidth: 600 }}>
          <DialogTitle>{selectedEmail?.subject}</DialogTitle>
          {selectedEmail && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    发件人
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {selectedEmail.from_address}
                  </Typography>
                </Box>
                {getStatusBadge(selectedEmail.status)}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  收件人
                </Typography>
                <Typography>
                  {Array.isArray(selectedEmail.to_addresses)
                    ? selectedEmail.to_addresses.join(", ")
                    : selectedEmail.to_addresses}
                </Typography>
              </Box>
              {selectedEmail.cc_addresses && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    抄送
                  </Typography>
                  <Typography>
                    {Array.isArray(selectedEmail.cc_addresses)
                      ? selectedEmail.cc_addresses.join(", ")
                      : selectedEmail.cc_addresses}
                  </Typography>
                </Box>
              )}
              {selectedEmail.bcc_addresses && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    密送
                  </Typography>
                  <Typography>
                    {Array.isArray(selectedEmail.bcc_addresses)
                      ? selectedEmail.bcc_addresses.join(", ")
                      : selectedEmail.bcc_addresses}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="body2" color="text.secondary">
                  优先级
                </Typography>
                {getPriorityBadge(selectedEmail.priority)}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  创建时间
                </Typography>
                <Typography>
                  {new Date(selectedEmail.created_at).toLocaleString("zh-CN")}
                </Typography>
              </Box>
              {selectedEmail.sent_at && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    发送时间
                  </Typography>
                  <Typography>
                    {new Date(selectedEmail.sent_at).toLocaleString("zh-CN")}
                  </Typography>
                </Box>
              )}
              {selectedEmail.error_message && (
                <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1, border: 1, borderColor: 'error.main' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.dark' }}>
                    <AlertCircle size={16} />
                    发送失败
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1, color: 'error.dark' }}>
                    {selectedEmail.error_message}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="body2" color="text.secondary">
                  邮件内容
                </Typography>
                <Box component="pre" sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.875rem', whiteSpace: 'pre-wrap', maxHeight: 256, overflow: 'auto' }}>
                  {selectedEmail.body}
                </Box>
              </Box>
            </Box>
          )}
          <DialogActions>
            <Button
              variant="contained"
              onClick={() => setShowEmailDetail(false)}
            >
              关闭
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <Dialog open={showTemplateModal} onClose={() => setShowTemplateModal(false)}>
        <DialogContent sx={{ maxWidth: 600 }}>
          <DialogTitle>创建邮件模板</DialogTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            创建新的邮件模板，支持变量替换
          </Typography>
          <form onSubmit={handleCreateTemplate}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="template-code">模板编码 *</InputLabel>
                <TextField
                  id="template-code"
                  value={templateForm.code}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      code: e.target.value,
                    }))
                  }
                  placeholder="如: workflow_approval"
                  required
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="template-name">模板名称 *</InputLabel>
                <TextField
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="如: 流程审批通知"
                  required
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="template-description">描述</InputLabel>
                <TextField
                  id="template-description"
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="简要描述此模板的用途"
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="template-category">分类</InputLabel>
                <FormControl fullWidth size="small">
                  <Select
                    value={templateForm.category}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    displayEmpty
                  >
                    <MenuItem value="" disabled>选择分类</MenuItem>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="template-tags">标签</InputLabel>
                <TextField
                  id="template-tags"
                  value={templateForm.tags}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      tags: e.target.value,
                    }))
                  }
                  placeholder="多个标签用逗号分隔"
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="template-subject">主题模板 *</InputLabel>
                <TextField
                  id="template-subject"
                  value={templateForm.subject_template}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      subject_template: e.target.value,
                    }))
                  }
                  placeholder="支持变量替换，如: 【TOPEMS】{{title}}"
                  required
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="template-body">正文模板 *</InputLabel>
                <TextField
                  id="template-body"
                  value={templateForm.body_template}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      body_template: e.target.value,
                    }))
                  }
                  placeholder="支持变量替换，如: 尊敬的{{user_name}}"
                  multiline
                  minRows={4}
                  required
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor="template-body-html">HTML正文模板</InputLabel>
                <TextField
                  id="template-body-html"
                  value={templateForm.body_html_template}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      body_html_template: e.target.value,
                    }))
                  }
                  placeholder="HTML格式的邮件内容"
                  multiline
                  minRows={3}
                  sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </Box>
              <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, border: 1, borderColor: 'info.main' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'info.dark', mb: 1 }}>
                  变量使用说明
                </Typography>
                <Typography variant="body2" color="info.dark">
                  在模板中使用{" "}
                  <Box component="code" sx={{ bgcolor: 'background.paper', px: 0.5, py: 0.25, borderRadius: 0.5 }}>
                    {"{{变量名}}"}
                  </Box>{" "}
                  格式的变量，发送邮件时传入数据即可替换。
                </Typography>
              </Box>
            </Box>
            <DialogActions sx={{ mt: 3 }}>
              <Button
                type="button"
                variant="contained"
                onClick={() => {
                  setShowTemplateModal(false);
                  resetTemplateForm();
                }}
              >
                取消
              </Button>
              <Button type="submit">创建模板</Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditTemplateModal}
        onClose={() => setShowEditTemplateModal(false)}
      >
        <DialogContent sx={{ maxWidth: 600 }}>
          <DialogTitle>编辑邮件模板</DialogTitle>
          {selectedTemplate && (
            <form onSubmit={handleUpdateTemplate}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor="edit-template-code">模板编码</InputLabel>
                  <TextField
                    id="edit-template-code"
                    value={templateForm.code}
                    disabled
                    size="small"
                    sx={{ bgcolor: 'grey.100' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor="edit-template-name">模板名称</InputLabel>
                  <TextField
                    id="edit-template-name"
                    value={templateForm.name}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="如: 流程审批通知"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor="edit-template-description">描述</InputLabel>
                  <TextField
                    id="edit-template-description"
                    value={templateForm.description}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="简要描述此模板的用途"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor="edit-template-category">分类</InputLabel>
                  <FormControl fullWidth size="small">
                    <Select
                      value={templateForm.category}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({ ...prev, category: e.target.value }))
                      }
                      displayEmpty
                    >
                      <MenuItem value="" disabled>选择分类</MenuItem>
                      {TEMPLATE_CATEGORIES.map((cat) => (
                        <MenuItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor="edit-template-tags">标签</InputLabel>
                  <TextField
                    id="edit-template-tags"
                    value={templateForm.tags}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        tags: e.target.value,
                      }))
                    }
                    placeholder="多个标签用逗号分隔"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor="edit-template-subject">主题模板</InputLabel>
                  <TextField
                    id="edit-template-subject"
                    value={templateForm.subject_template}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        subject_template: e.target.value,
                      }))
                    }
                    placeholder="支持变量替换"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor="edit-template-body">正文模板</InputLabel>
                  <TextField
                    id="edit-template-body"
                    value={templateForm.body_template}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        body_template: e.target.value,
                      }))
                    }
                    multiline
                    minRows={4}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor="edit-template-body-html">HTML正文模板</InputLabel>
                  <TextField
                    id="edit-template-body-html"
                    value={templateForm.body_html_template}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        body_html_template: e.target.value,
                      }))
                    }
                    multiline
                    minRows={3}
                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </Box>
              </Box>
              <DialogActions sx={{ mt: 3 }}>
                <Button
                  type="button"
                  variant="contained"
                  onClick={() => {
                    setShowEditTemplateModal(false);
                    setSelectedTemplate(null);
                    resetTemplateForm();
                  }}
                >
                  取消
                </Button>
                <Button type="submit">保存修改</Button>
              </DialogActions>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEyeModal} onClose={() => setShowEyeModal(false)}>
        <DialogContent sx={{ maxWidth: 600 }}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Eye size={20} />
            模板预览
          </DialogTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            以下是模板渲染后的预览效果
          </Typography>
          {previewContent && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  主题
                </Typography>
                <Typography variant="h6">
                  {previewContent.subject}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  正文内容
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
                  <Box component="pre" sx={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', maxHeight: 320, overflow: 'auto' }}>
                    {previewContent.body}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
          <DialogActions>
            <Button variant="outlined" onClick={() => setShowEyeModal(false)}>
              关闭
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MailPage;
