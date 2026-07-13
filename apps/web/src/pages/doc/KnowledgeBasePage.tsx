import { Box, Typography, Chip, Stack, useTheme } from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import { BookOpen, FolderOpen, FileText, Eye, User, Calendar, BarChart3 } from 'lucide-react';

import { useNotificationStore } from '@/store';
import {
  TreePageTemplate,
  type TreeNode,
  ListPageTemplate,
  type ColumnDef,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface KnowledgeDoc {
  id: string;
  title: string;
  author: string;
  updatedAt: string;
  views: number;
  status: 'published' | 'draft' | 'archived';
  categoryId: string;
}

interface KnowledgeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

const CATEGORIES: KnowledgeCategory[] = [
  {
    id: 'product-manual',
    name: '产品手册',
    icon: 'book',
    color: 'primary.main',
    description: '产品功能介绍和使用指南',
  },
  {
    id: 'tech-doc',
    name: '技术文档',
    icon: 'code',
    color: 'success.main',
    description: '技术架构、API文档和开发指南',
  },
  {
    id: 'training',
    name: '培训资料',
    icon: 'graduation',
    color: 'warning.main',
    description: '新员工培训和技能提升资料',
  },
  {
    id: 'rules',
    name: '规章制度',
    icon: 'scale',
    color: 'error.main',
    description: '公司制度和管理规范',
  },
  {
    id: 'faq',
    name: '常见问题',
    icon: 'help',
    color: 'secondary.main',
    description: '常见问题解答和故障排除',
  },
];

const MOCK_DOCS: KnowledgeDoc[] = [
  {
    id: '1',
    title: '产品快速入门指南',
    author: '张三',
    updatedAt: '2024-12-15',
    views: 1256,
    status: 'published',
    categoryId: 'product-manual',
  },
  {
    id: '2',
    title: '核心功能详解',
    author: '李四',
    updatedAt: '2024-12-14',
    views: 892,
    status: 'published',
    categoryId: 'product-manual',
  },
  {
    id: '3',
    title: '系统架构设计文档',
    author: '王五',
    updatedAt: '2024-12-13',
    views: 678,
    status: 'published',
    categoryId: 'tech-doc',
  },
  {
    id: '4',
    title: 'API接口文档 v2.0',
    author: '赵六',
    updatedAt: '2024-12-12',
    views: 1534,
    status: 'published',
    categoryId: 'tech-doc',
  },
  {
    id: '5',
    title: '新员工入职培训手册',
    author: '钱七',
    updatedAt: '2024-12-11',
    views: 456,
    status: 'published',
    categoryId: 'training',
  },
  {
    id: '6',
    title: '员工行为规范',
    author: '孙八',
    updatedAt: '2024-12-10',
    views: 2034,
    status: 'published',
    categoryId: 'rules',
  },
  {
    id: '7',
    title: '考勤管理制度',
    author: '周九',
    updatedAt: '2024-12-09',
    views: 1876,
    status: 'published',
    categoryId: 'rules',
  },
  {
    id: '8',
    title: '常见问题FAQ',
    author: '吴十',
    updatedAt: '2024-12-08',
    views: 3421,
    status: 'published',
    categoryId: 'faq',
  },
  {
    id: '9',
    title: '产品高级功能使用技巧',
    author: '张三',
    updatedAt: '2024-12-07',
    views: 567,
    status: 'draft',
    categoryId: 'product-manual',
  },
  {
    id: '10',
    title: '数据库设计规范',
    author: '王五',
    updatedAt: '2024-12-06',
    views: 345,
    status: 'archived',
    categoryId: 'tech-doc',
  },
  {
    id: '11',
    title: '销售技巧培训',
    author: '郑十一',
    updatedAt: '2024-12-05',
    views: 234,
    status: 'published',
    categoryId: 'training',
  },
  {
    id: '12',
    title: '登录问题排查指南',
    author: '吴十',
    updatedAt: '2024-12-04',
    views: 2156,
    status: 'published',
    categoryId: 'faq',
  },
];

const STATUS_LABELS: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  archived: '已归档',
};

const STATUS_COLORS: Record<string, string> = {
  published: 'success',
  draft: 'warning',
  archived: 'default',
};

export const DocumentKnowledgeBasePage: React.FC = () => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | null>(null);

  const treeData = useMemo((): TreeNode[] => {
    return CATEGORIES.map((category) => {
      const categoryDocs = MOCK_DOCS.filter((d) => d.categoryId === category.id);
      return {
        id: category.id,
        name: category.name,
        type: 'folder' as const,
        accentColor: category.color,
        description: category.description,
        icon: (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${category.color}20`,
            }}
          >
            <FolderOpen sx={{ width: 16, height: 16, color: category.color }} />
          </Box>
        ),
        children: categoryDocs.map((doc) => ({
          id: doc.id,
          name: doc.title,
          type: 'item' as const,
          data: doc,
          accentColor: category.color,
          icon: (
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
              }}
            >
              <FileText
                size={14}
                style={{ color: ct.grey[500] }}
              />
            </Box>
          ),
        })),
      };
    });
  }, []);

  const filteredTreeData = useMemo((): TreeNode[] => {
    if (!searchQuery.trim()) return treeData;

    const search = searchQuery.toLowerCase();
    return treeData
      .map((node) => {
        const categoryDocs = MOCK_DOCS.filter(
          (d) => d.categoryId === node.id && d.title.toLowerCase().includes(search)
        );
        if (node.name.toLowerCase().includes(search) || categoryDocs.length > 0) {
          return node;
        }
        return null;
      })
      .filter((n): n is TreeNode => n !== null);
  }, [treeData, searchQuery]);

  const handleSelectNode = useCallback(
    (node: TreeNode | null) => {
      setSelectedNode(node);
      if (node) {
        if (node.type === 'folder') {
          const category = CATEGORIES.find((c) => c.id === node.id);
          setSelectedCategory(category || null);
        } else if (node.type === 'item' && node.data) {
          const doc = node.data as KnowledgeDoc;
          const category = CATEGORIES.find((c) => c.id === doc.categoryId);
          setSelectedCategory(category || null);
          addNotification({
            title: '打开文档',
            message: `正在打开"${doc.title}"...`,
            type: 'info',
          });
        }
      } else {
        setSelectedCategory(null);
      }
    },
    [addNotification]
  );

  const categoryDocs = useMemo(() => {
    if (!selectedCategory) return [];
    return MOCK_DOCS.filter((d) => d.categoryId === selectedCategory.id);
  }, [selectedCategory]);

  const columns: ColumnDef<KnowledgeDoc>[] = useMemo(
    () => [
      {
        id: 'title',
        label: '标题',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.50',
              }}
            >
              <FileText
                size={16}
                style={{ color: ct.primary.main }}
              />
            </Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.title}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'author',
        label: '作者',
        width: 120,
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <User
              size={14}
              style={{ color: ct.grey[500] }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.author}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'updatedAt',
        label: '更新时间',
        width: 140,
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <Calendar
              size={14}
              style={{ color: ct.grey[500] }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.updatedAt}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'views',
        label: '阅读量',
        width: 100,
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <BarChart3
              size={14}
              style={{ color: ct.grey[500] }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.views.toLocaleString()}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            label={STATUS_LABELS[row.status]}
            color={STATUS_COLORS[row.status] as any}
            variant='outlined'
            sx={{ fontWeight: 500 }}
          />
        ),
      },
    ],
    []
  );

  const detailPanel = useCallback(
    (node: TreeNode | null) => {
      if (!node || !selectedCategory) {
        return (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <BookOpen
              size={48}
              style={{ color: theme.palette.text.disabled, margin: '0 auto 16px' }}
            />
            <Typography color='text.secondary'>选择一个分类查看知识库文档</Typography>
          </Box>
        );
      }

      return (
        <Box>
          <Box sx={{ mb: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center', mb: 1 }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${selectedCategory.color}20`,
                }}
              >
                <FolderOpen sx={{ width: 20, height: 20, color: selectedCategory.color }} />
              </Box>
              <Box>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {selectedCategory.name}
                </Typography>
                {selectedCategory.description && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {selectedCategory.description}
                  </Typography>
                )}
              </Box>
            </Stack>
            <Stack
              direction='row'
              spacing={2}
              sx={{ mt: 2 }}
            >
              <Chip
                size='small'
                label={`文档总数: ${categoryDocs.length}`}
                sx={{ bgcolor: 'primary.50', color: 'primary.main' }}
              />
              <Chip
                size='small'
                label={`已发布: ${categoryDocs.filter((d) => d.status === 'published').length}`}
                sx={{ bgcolor: 'success.50', color: 'success.main' }}
              />
              <Chip
                size='small'
                label={`总阅读量: ${categoryDocs.reduce((sum, d) => sum + d.views, 0).toLocaleString()}`}
                sx={{ bgcolor: 'info.50', color: 'info.main' }}
              />
            </Stack>
          </Box>

          <ListPageTemplate
            title=''
            subtitle=''
            columns={columns}
            data={categoryDocs}
            loading={loading}
            searchable
            searchPlaceholder='搜索文档标题...'
            onRowClick={(doc) => {
              addNotification({
                title: '打开文档',
                message: `正在打开"${doc.title}"...`,
                type: 'info',
              });
            }}
            onRefresh={() => {
              addNotification({
                title: '成功',
                message: '刷新成功',
                type: 'success',
              });
            }}
            emptyMessage='暂无文档'
          />
        </Box>
      );
    },
    [selectedCategory, categoryDocs, columns, loading, addNotification]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <BookOpen size={20} />,
        backButton: {
          href: '/document/dashboard',
        },
      }}
    >
      <TreePageTemplate
        title=''
        subtitle=''
        data={filteredTreeData}
        loading={loading}
        searchPlaceholder='搜索知识库分类、文档...'
        onSearch={setSearchQuery}
        onSelect={handleSelectNode}
        selectedId={selectedNode?.id}
        detailPanel={detailPanel}
        detailPanelTitle={selectedCategory ? '文档列表' : undefined}
        onRefresh={() => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            addNotification({
              title: '成功',
              message: '刷新成功',
              type: 'success',
            });
          }, 500);
        }}
        showRefresh={true}
        emptyState={{
          emoji: '📚',
          title: '暂无知识库分类',
          description: '知识库分类还在建设中',
        }}
      />
    </PageContainer>
  );
};

export default DocumentKnowledgeBasePage;
