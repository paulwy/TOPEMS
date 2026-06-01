import React, { useState, useEffect } from 'react';
import { Mail, Send, FileText, Trash2, Eye, RefreshCw, Plus, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  getEmailLogs,
  deleteEmailLog,
  sendEmail,
  sendEmailWithTemplate,
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  type EmailLog,
  type EmailTemplate,
  type SendEmailRequest,
  type SendEmailWithTemplateRequest,
} from '../api/email';
import { useAppStore } from '@/store';

type TabType = 'logs' | 'compose' | 'templates';

const EmailManagementPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState<TabType>('logs');
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingLog, setViewingLog] = useState<EmailLog | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  const [composeForm, setComposeForm] = useState({
    toEmail: '',
    ccEmail: '',
    bccEmail: '',
    subject: '',
    body: '',
    useTemplate: false,
    selectedTemplate: '',
    variables: {} as Record<string, string>,
  });

  const [templateForm, setTemplateForm] = useState({
    templateName: '',
    subject: '',
    body: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await getEmailLogs();
      if (response.success && response.data) {
        setEmailLogs(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
      addNotification({ title: '错误', message: '获取邮件日志失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await getEmailTemplates();
      if (response.success && response.data) {
        setTemplates(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      addNotification({ title: '错误', message: '获取邮件模板失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const response = await deleteEmailLog(id);
      if (response.success) {
        setEmailLogs(prev => prev.filter(log => log.id !== id));
        addNotification({ title: '成功', message: '删除成功', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to delete email log:', error);
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
    }
  };

  const handleSendEmail = async () => {
    if (!composeForm.toEmail || !composeForm.subject || !composeForm.body) {
      addNotification({ title: '错误', message: '请填写必填字段', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      let response;
      if (composeForm.useTemplate && composeForm.selectedTemplate) {
        const request: SendEmailWithTemplateRequest = {
          toEmail: composeForm.toEmail,
          ccEmail: composeForm.ccEmail || undefined,
          bccEmail: composeForm.bccEmail || undefined,
          templateId: composeForm.selectedTemplate,
          variables: Object.keys(composeForm.variables).length > 0 ? composeForm.variables : undefined,
        };
        response = await sendEmailWithTemplate(request);
      } else {
        const request: SendEmailRequest = {
          toEmail: composeForm.toEmail,
          ccEmail: composeForm.ccEmail || undefined,
          bccEmail: composeForm.bccEmail || undefined,
          subject: composeForm.subject,
          body: composeForm.body,
        };
        response = await sendEmail(request);
      }

      if (response.success) {
        addNotification({ title: '成功', message: '邮件发送成功', type: 'success' });
        setComposeForm({
          toEmail: '',
          ccEmail: '',
          bccEmail: '',
          subject: '',
          body: '',
          useTemplate: false,
          selectedTemplate: '',
          variables: {},
        });
        setActiveTab('logs');
      }
    } catch (error: any) {
      console.error('Failed to send email:', error);
      addNotification({ title: '错误', message: error.response?.data?.message || '发送邮件失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setComposeForm(prev => ({ ...prev, selectedTemplate: templateId }));
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposeForm(prev => ({
        ...prev,
        subject: template.subject,
        body: template.body,
      }));
      const variables: Record<string, string> = {};
      const regex = /\{\{(\w+)\}\}/g;
      let match;
      while ((match = regex.exec(template.body)) !== null) {
        variables[match[1]] = '';
      }
      setComposeForm(prev => ({ ...prev, variables }));
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.templateName || !templateForm.subject || !templateForm.body) {
      addNotification({ title: '错误', message: '请填写必填字段', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      let response;
      if (editingTemplate) {
        response = await updateEmailTemplate(editingTemplate.id, templateForm);
      } else {
        response = await createEmailTemplate(templateForm);
      }

      if (response.success) {
        addNotification({ title: '成功', message: editingTemplate ? '更新成功' : '创建成功', type: 'success' });
        setShowTemplateForm(false);
        setEditingTemplate(null);
        setTemplateForm({ templateName: '', subject: '', body: '', status: 'active' });
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      addNotification({ title: '错误', message: '保存失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const response = await deleteEmailTemplate(id);
      if (response.success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        addNotification({ title: '成功', message: '删除成功', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">已发送</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">待发送</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">发送失败</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">启用</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">禁用</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const tabs = [
    { id: 'logs' as TabType, label: '邮件日志', icon: Mail },
    { id: 'compose' as TabType, label: '发送邮件', icon: Send },
    { id: 'templates' as TabType, label: '邮件模板', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">邮件管理</h1>
          <p className="text-gray-500 mt-1">管理邮件发送记录和邮件模板</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    共 {emailLogs.length} 条记录
                  </div>
                  <Button onClick={fetchLogs} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    刷新
                  </Button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : emailLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Mail className="w-16 h-16 mb-4 text-gray-300" />
                    <p>暂无邮件日志</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>收件人</TableHead>
                          <TableHead>主题</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>发送时间</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailLogs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell className="max-w-xs truncate" title={log.toEmail}>
                              {log.toEmail}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={log.subject}>
                              {log.subject}
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell>{log.sentAt ? formatDate(log.sentAt) : '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" onClick={() => setViewingLog(log)}>
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>查看详情</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteLog(log.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>删除</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'compose' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="收件人"
                    value={composeForm.toEmail}
                    onChange={e => setComposeForm(prev => ({ ...prev, toEmail: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setComposeForm(prev => ({ ...prev, useTemplate: !prev.useTemplate }))}
                    className={composeForm.useTemplate ? 'bg-blue-50 text-blue-600' : ''}
                  >
                    {composeForm.useTemplate ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    使用模板
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    placeholder="抄送（可选）"
                    value={composeForm.ccEmail}
                    onChange={e => setComposeForm(prev => ({ ...prev, ccEmail: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    placeholder="密送（可选）"
                    value={composeForm.bccEmail}
                    onChange={e => setComposeForm(prev => ({ ...prev, bccEmail: e.target.value }))}
                    className="flex-1"
                  />
                </div>

                {composeForm.useTemplate && (
                  <Select value={composeForm.selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.templateName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {composeForm.useTemplate && Object.keys(composeForm.variables).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">模板变量：</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(composeForm.variables).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Label className="w-20">{key}:</Label>
                          <Input
                            value={value}
                            onChange={e => setComposeForm(prev => ({
                              ...prev,
                              variables: { ...prev.variables, [key]: e.target.value }
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Input
                  placeholder="主题"
                  value={composeForm.subject}
                  onChange={e => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                />

                <Textarea
                  placeholder="邮件内容"
                  value={composeForm.body}
                  onChange={e => setComposeForm(prev => ({ ...prev, body: e.target.value }))}
                  className="min-h-[200px]"
                />

                <div className="flex justify-end">
                  <Button onClick={handleSendEmail} disabled={loading} className="gap-2">
                    <Send className="w-4 h-4" />
                    {loading ? '发送中...' : '发送邮件'}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    共 {templates.length} 个模板
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={fetchTemplates} variant="outline" className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      刷新
                    </Button>
                    <Button onClick={() => {
                      setEditingTemplate(null);
                      setTemplateForm({ templateName: '', subject: '', body: '', status: 'active' });
                      setShowTemplateForm(true);
                    }} className="gap-2">
                      <Plus className="w-4 h-4" />
                      新建模板
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <FileText className="w-16 h-16 mb-4 text-gray-300" />
                    <p>暂无邮件模板</p>
                    <Button onClick={() => setShowTemplateForm(true)} className="mt-4 gap-2">
                      <Plus className="w-4 h-4" />
                      创建模板
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {templates.map(template => (
                      <div key={template.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{template.templateName}</h3>
                              {getStatusBadge(template.status)}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{template.subject}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setEditingTemplate(template);
                              setTemplateForm({
                                templateName: template.templateName,
                                subject: template.subject,
                                body: template.body,
                                status: template.status as 'active' | 'inactive',
                              });
                              setShowTemplateForm(true);
                            }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteTemplate(template.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{template.body}</p>
                        <p className="text-xs text-gray-400 mt-2">创建于 {formatDate(template.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!viewingLog} onOpenChange={() => setViewingLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>邮件详情</DialogTitle>
            </DialogHeader>
            {viewingLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">发件人</Label>
                    <p className="mt-1">{viewingLog.fromEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">收件人</Label>
                    <p className="mt-1">{viewingLog.toEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">抄送</Label>
                    <p className="mt-1">{viewingLog.ccEmail || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">密送</Label>
                    <p className="mt-1">{viewingLog.bccEmail || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">状态</Label>
                    <p className="mt-1">{getStatusBadge(viewingLog.status)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">发送时间</Label>
                    <p className="mt-1">{viewingLog.sentAt ? formatDate(viewingLog.sentAt) : '-'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">主题</Label>
                  <p className="mt-1 font-medium">{viewingLog.subject}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">内容</Label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {viewingLog.body}
                  </div>
                </div>
                {viewingLog.errorMessage && (
                  <div>
                    <Label className="text-sm text-gray-500">错误信息</Label>
                    <p className="mt-1 text-red-600">{viewingLog.errorMessage}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showTemplateForm} onOpenChange={() => {
          setShowTemplateForm(false);
          setEditingTemplate(null);
          setTemplateForm({ templateName: '', subject: '', body: '', status: 'active' });
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? '编辑模板' : '新建邮件模板'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>模板名称</Label>
                <Input
                  value={templateForm.templateName}
                  onChange={e => setTemplateForm(prev => ({ ...prev, templateName: e.target.value }))}
                  placeholder="请输入模板名称"
                />
              </div>
              <div>
                <Label>主题</Label>
                <Input
                  value={templateForm.subject}
                  onChange={e => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="请输入邮件主题"
                />
              </div>
              <div>
                <Label>状态</Label>
                <Select value={templateForm.status} onValueChange={value => setTemplateForm(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>内容（支持变量 {'{{变量名}}'}）</Label>
                <Textarea
                  value={templateForm.body}
                  onChange={e => setTemplateForm(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="请输入邮件内容，使用 {{变量名}} 定义变量"
                  className="min-h-[200px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTemplateForm(false)}>
                  取消
                </Button>
                <Button onClick={handleSaveTemplate} disabled={loading}>
                  {loading ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EmailManagementPage;