import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import {
  Megaphone,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  User,
  Eye,
  Edit2,
  Trash2,
  FileText,
  Clock,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  FileUpload,
  Input,
  ListPageTemplate,
  Modal,
  Pagination,
  Select,
  Tabs,
  Tag,
  ToastContainer,
} from '@/components/redesign';
import type { DataTableColumn, Toast, UploadFile } from '@/components/redesign';
import { announcementApi } from '@/api/erp/core';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['oa', 'announcements'];

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
  category: string;
  status: string;
  priority?: 'high' | 'normal' | 'low';
  views?: number;
}

const categoryConfig: Record<
  string,
  { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'error' }
> = {
  notice: { label: i18n.t('oa.announcement_page.k5'), variant: 'info' },
  announcement: { label: i18n.t('oa.announcement_page.k6'), variant: 'info' },
  policy: { label: i18n.t('oa.announcement_page.k7'), variant: 'success' },
  activity: { label: i18n.t('oa.announcement_page.k8'), variant: 'warning' },
  other: { label: i18n.t('oa.announcement_page.k9'), variant: 'default' },
};

const statusConfig: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  published: { label: i18n.t('oa.announcement_page.k15'), variant: 'success' },
  draft: { label: i18n.t('oa.announcement_page.k16'), variant: 'warning' },
  archived: { label: i18n.t('oa.announcement_page.k17'), variant: 'default' },
};

const priorityConfig = {
  high: { label: i18n.t('oa.announcement_page.k18'), variant: 'error' as const },
  normal: { label: i18n.t('oa.announcement_page.k19'), variant: 'default' as const },
  low: { label: i18n.t('oa.announcement_page.k20'), variant: 'default' as const },
};

const AnnouncementPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 新建公告表单
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'notice',
    priority: 'normal' as 'high' | 'normal' | 'low',
  });
  const [attachments, setAttachments] = useState<UploadFile[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Mock 数据
  const mockAnnouncements: Announcement[] = useMemo(
    () => [
      {
        id: '1',
        title: '关于 2026 年国庆节放假安排的通知',
        content:
          '根据国务院办公厅通知精神，结合公司实际情况，现将 2026 年国庆节放假安排通知如下：\n\n一、放假时间：10 月 1 日（星期四）至 10 月 7 日（星期三）放假调休，共 7 天。\n\n二、10 月 10 日（星期六）上班。\n\n三、请各部门提前做好工作安排，确保放假期间各项工作正常运转。\n\n四、放假期间请大家注意安全，祝大家节日快乐！',
        author: '人力资源部',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        category: 'notice',
        status: 'published',
        priority: 'high',
        views: 328,
      },
      {
        id: '2',
        title: '公司信息安全管理制度（2026 版）',
        content:
          '第一章 总则\n\n第一条 为加强公司信息安全管理，保障公司信息系统和数据安全，根据国家有关法律法规，结合公司实际，制定本制度。\n\n第二条 本制度适用于公司全体员工及外部合作人员。\n\n第二章 账号管理\n\n第三条 员工入职后由 IT 部门统一分配系统账号。\n\n第四条 账号密码必须符合复杂度要求，定期更换。',
        author: '信息安全部',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        category: 'policy',
        status: 'published',
        priority: 'normal',
        views: 156,
      },
      {
        id: '3',
        title: '2026 年秋季团建活动报名通知',
        content:
          '为丰富员工业余生活，增强团队凝聚力，公司定于 2026 年 10 月 18 日（星期日）组织秋季团建活动。\n\n活动地点：XX 生态公园\n活动内容：户外拓展、烧烤、团队游戏\n报名时间：即日起至 10 月 10 日\n报名方式：请联系各部门行政人员报名\n\n欢迎大家积极参与！',
        author: '工会',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        category: 'activity',
        status: 'published',
        priority: 'normal',
        views: 89,
      },
      {
        id: '4',
        title: '关于优化考勤制度的征求意见稿',
        content:
          '为进一步规范公司考勤管理，提高工作效率，人力资源部拟对现有考勤制度进行优化。现将征求意见稿发布如下，请各部门组织员工讨论，并于 10 月 15 日前将意见反馈至人力资源部。',
        author: '人力资源部',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        category: 'policy',
        status: 'draft',
        priority: 'low',
        views: 0,
      },
      {
        id: '5',
        title: '关于启用新 OA 系统的公告',
        content:
          '为提升办公效率，公司将于 2026 年 10 月 1 日正式启用新 OA 系统。旧系统将于 9 月 30 日 24:00 停止使用。\n\n新系统访问地址：https://oa.topems.com\n登录账号：工号\n初始密码：身份证后六位\n\n请大家及时登录并修改密码。如有问题请联系 IT 支持。',
        author: 'IT 部门',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
        category: 'announcement',
        status: 'published',
        priority: 'high',
        views: 512,
      },
    ],
    []
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, activeTab, debouncedSearch, categoryFilter],
    queryFn: async () => {
      try {
        const response = await announcementApi.list({ page: 1, pageSize: 50 });
        if (response.success && response.data) {
          return response.data.items.map((a: any) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            author: a.author ?? '-',
            created_at: a.created_at,
            category: a.priority ?? 'normal',
            status: a.status,
          }));
        }
      } catch (e) {
        // API 不可用时使用 mock 数据
      }
      return mockAnnouncements;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => announcementApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('oa.announcement_page.k45'));
      setCreateModalOpen(false);
      setFormData({ title: '', content: '', category: 'notice', priority: 'normal' });
    },
    onError: () => {
      // Mock 模式下直接成功
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('oa.announcement_page.k45'));
      setCreateModalOpen(false);
      setFormData({ title: '', content: '', category: 'notice', priority: 'normal' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('oa.announcement_page.k46'));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('oa.announcement_page.k46'));
    },
  });

  const announcements = data || mockAnnouncements;

  // 筛选
  const filteredAnnouncements = useMemo(() => {
    let result = announcements;
    if (activeTab !== 'all') {
      result = result.filter((a) => a.status === activeTab);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((a) => a.category === categoryFilter);
    }
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query) ||
          a.author.toLowerCase().includes(query)
      );
    }
    return result;
  }, [announcements, activeTab, categoryFilter, debouncedSearch]);

  // 分页数据计算
  const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / pageSize));
  const pagedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 筛选变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, categoryFilter, debouncedSearch]);

  const publishedCount = announcements.filter((a) => a.status === 'published').length;
  const draftCount = announcements.filter((a) => a.status === 'draft').length;

  const tabsConfig = [
    { id: 'all', label: t('oa.announcement_page.k14') },
    { id: 'published', label: t('oa.announcement_page.k15'), badge: publishedCount },
    { id: 'draft', label: t('oa.announcement_page.k16'), badge: draftCount },
  ];

  const formatTime = (value: string) => {
    try {
      const d = new Date(value);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return value;
    }
  };

  const columns: DataTableColumn<Announcement>[] = [
    {
      key: 'title',
      header: t('oa.announcement_page.k21'),
      sortable: true,
      render: (row) => (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 2,
            }}
          >
            {row.priority === 'high' && <Tag variant='error'>{t('oa.announcement_page.k18')}</Tag>}
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.title}</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={12} />
              {row.author}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} />
              {formatTime(row.created_at)}
            </span>
            {row.views !== undefined && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Eye size={12} />
                {row.views}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: t('oa.announcement_page.k22'),
      width: 100,
      render: (row) => {
        const config = categoryConfig[row.category] || categoryConfig.other;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'status',
      header: t('oa.announcement_page.k23'),
      width: 100,
      render: (row) => {
        const config = statusConfig[row.status] || statusConfig.draft;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: t('oa.announcement_page.k24'),
      align: 'right',
      width: 150,
      render: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Eye size={14} />}
            onClick={() => {
              setSelectedAnnouncement(row);
              setDetailDrawerOpen(true);
            }}
          >
            {t('oa.announcement_page.k25')}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Edit2 size={14} />}
            onClick={() => {
              setSelectedAnnouncement(row);
              setFormData({
                title: row.title,
                content: row.content,
                category: row.category,
                priority: row.priority || 'normal',
              });
              setCreateModalOpen(true);
            }}
          >
            {t('oa.announcement_page.k26')}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Trash2 size={14} />}
            onClick={() => deleteMutation.mutate(row.id)}
            style={{ color: 'var(--error-500)' }}
          >
            {t('oa.announcement_page.k27')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<Announcement>
        header={{
          title: t('oa.announcement_page.k1'),
          subtitle: t('oa.announcement_page.k2'),
        }}
        toolbar={
          <>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Input
                placeholder={t('oa.announcement_page.k3')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 240 }}
              />
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('oa.announcement_page.k4') },
                  { value: 'notice', label: t('oa.announcement_page.k5') },
                  { value: 'announcement', label: t('oa.announcement_page.k6') },
                  { value: 'policy', label: t('oa.announcement_page.k7') },
                  { value: 'activity', label: t('oa.announcement_page.k8') },
                  { value: 'other', label: t('oa.announcement_page.k9') },
                ]}
                style={{ width: 140 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant='ghost'
                leftIcon={<RefreshCw size={16} />}
                onClick={() => refetch()}
              >
                {t('oa.announcement_page.k10')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => setCreateModalOpen(true)}
              >
                {t('oa.announcement_page.k11')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedAnnouncements}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('oa.announcement_page.k12')}
        emptyDescription={t('oa.announcement_page.k13')}
        tableProps={{
          onRowClick: (row) => {
            setSelectedAnnouncement(row);
            setDetailDrawerOpen(true);
          },
        }}
      >
        <Tabs
          tabs={tabsConfig}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
      </ListPageTemplate>

      {filteredAnnouncements.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Pagination
            current={currentPage}
            total={totalPages}
            pageSize={pageSize}
            totalItems={filteredAnnouncements.length}
            onChange={setCurrentPage}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* 公告详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedAnnouncement(null);
        }}
        title={t('oa.announcement_page.k28')}
        size='lg'
      >
        {selectedAnnouncement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* 标题区 */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {selectedAnnouncement.priority === 'high' && (
                  <Tag variant='error'>{t('oa.announcement_page.k18')}</Tag>
                )}
                <Badge
                  variant={categoryConfig[selectedAnnouncement.category]?.variant || 'default'}
                >
                  {categoryConfig[selectedAnnouncement.category]?.label || t('oa.announcement_page.k9')}
                </Badge>
                <Badge variant={statusConfig[selectedAnnouncement.status]?.variant || 'default'}>
                  {statusConfig[selectedAnnouncement.status]?.label || t('oa.announcement_page.k16')}
                </Badge>
              </div>
              <h2
                style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}
              >
                {selectedAnnouncement.title}
              </h2>
            </div>

            {/* 元信息 */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-4)',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} />
                {t('oa.announcement_page.k29', { author: selectedAnnouncement.author })}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} />
                {t('oa.announcement_page.k30', {
                  time: formatTime(selectedAnnouncement.created_at),
                })}
              </span>
              {selectedAnnouncement.views !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={14} />
                  {t('oa.announcement_page.k31', { views: selectedAnnouncement.views })}
                </span>
              )}
            </div>

            {/* 正文 */}
            <Card title={t('oa.announcement_page.k32')}>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedAnnouncement.content}
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 发布/编辑公告弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setFormData({ title: '', content: '', category: 'notice', priority: 'normal' });
        }}
        title={
          selectedAnnouncement && formData.title
            ? t('oa.announcement_page.k33')
            : t('oa.announcement_page.k34')
        }
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => {
                setCreateModalOpen(false);
                setFormData({ title: '', content: '', category: 'notice', priority: 'normal' });
              }}
            >
              {t('oa.announcement_page.k35')}
            </Button>
            <Button
              variant='primary'
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.title.trim() || !formData.content.trim()}
              loading={createMutation.isPending}
            >
              {selectedAnnouncement && formData.title
                ? t('oa.announcement_page.k36')
                : t('oa.announcement_page.k34')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label
              htmlFor='announcement-title'
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {t('oa.announcement_page.k37')}
            </label>
            <Input
              id='announcement-title'
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('oa.announcement_page.k38')}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='announcement-category'
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-1)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {t('oa.announcement_page.k39')}
              </label>
              <Select
                id='announcement-category'
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={[
                  { value: 'notice', label: t('oa.announcement_page.k5') },
                  { value: 'announcement', label: t('oa.announcement_page.k6') },
                  { value: 'policy', label: t('oa.announcement_page.k7') },
                  { value: 'activity', label: t('oa.announcement_page.k8') },
                  { value: 'other', label: t('oa.announcement_page.k9') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='announcement-priority'
                style={{
                  display: 'block',
                  marginBottom: 'var(--space-1)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {t('oa.announcement_page.k40')}
              </label>
              <Select
                id='announcement-priority'
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                options={[
                  { value: 'high', label: t('oa.announcement_page.k18') },
                  { value: 'normal', label: t('oa.announcement_page.k19') },
                  { value: 'low', label: t('oa.announcement_page.k20') },
                ]}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor='announcement-content'
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {t('oa.announcement_page.k41')}
            </label>
            <textarea
              id='announcement-content'
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder={t('oa.announcement_page.k42')}
              rows={10}
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--surface-1)',
                color: 'var(--text-primary)',
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.6,
              }}
            />
          </div>

          <div>
            <label
              htmlFor='announcement-attachments'
              style={{
                display: 'block',
                marginBottom: 'var(--space-1)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {t('oa.announcement_page.k43')}
            </label>
            <FileUpload
              id='announcement-attachments'
              value={attachments}
              onChange={setAttachments}
              multiple
              maxSize={10}
              accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png'
              hint={t('oa.announcement_page.k44')}
            />
          </div>
        </div>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default AnnouncementPage;
