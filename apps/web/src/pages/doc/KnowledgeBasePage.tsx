import { Box, Typography, Chip, Stack, useTheme } from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, FolderOpen, FileText } from 'lucide-react';

import { useNotificationStore } from '@/store';
import { TreePageTemplate, type TreeNode } from '@/components/templates';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { PageContainer } from '@/components/common';
import { documentSchema } from '@/schemas/doc';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';
import { docApi } from '@/api/doc';

const ct= designTokens.colors;

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
    name: i18n.t('pages.knowledge_base_page.k0'),
    icon: 'book',
    color: 'primary.main',
    description: i18n.t('pages.knowledge_base_page.k1'),
  },
  {
    id: 'tech-doc',
    name: i18n.t('pages.knowledge_base_page.k2'),
    icon: 'code',
    color: 'success.main',
    description: i18n.t('pages.knowledge_base_page.api_3'),
  },
  {
    id: 'training',
    name: i18n.t('pages.knowledge_base_page.k4'),
    icon: 'graduation',
    color: 'warning.main',
    description: i18n.t('pages.knowledge_base_page.k5'),
  },
  {
    id: 'rules',
    name: i18n.t('pages.knowledge_base_page.k6'),
    icon: 'scale',
    color: 'error.main',
    description: i18n.t('pages.knowledge_base_page.k7'),
  },
  {
    id: 'faq',
    name: i18n.t('pages.knowledge_base_page.k8'),
    icon: 'help',
    color: 'secondary.main',
    description: i18n.t('pages.knowledge_base_page.k9'),
  },
];

const MOCK_DOCS: KnowledgeDoc[] = [
  {
    id: '1',
    title: i18n.t('pages.knowledge_base_page.k10'),
    author: i18n.t('pages.knowledge_base_page.k11'),
    updatedAt: '2024-12-15',
    views: 1256,
    status: 'published',
    categoryId: 'product-manual',
  },
  {
    id: '2',
    title: i18n.t('pages.knowledge_base_page.k12'),
    author: i18n.t('pages.knowledge_base_page.k13'),
    updatedAt: '2024-12-14',
    views: 892,
    status: 'published',
    categoryId: 'product-manual',
  },
  {
    id: '3',
    title: i18n.t('pages.knowledge_base_page.k14'),
    author: i18n.t('pages.knowledge_base_page.k15'),
    updatedAt: '2024-12-13',
    views: 678,
    status: 'published',
    categoryId: 'tech-doc',
  },
  {
    id: '4',
    title: i18n.t('pages.knowledge_base_page.apiv20_0'),
    author: i18n.t('pages.knowledge_base_page.k16'),
    updatedAt: '2024-12-12',
    views: 1534,
    status: 'published',
    categoryId: 'tech-doc',
  },
  {
    id: '5',
    title: i18n.t('pages.knowledge_base_page.k17'),
    author: i18n.t('pages.knowledge_base_page.k18'),
    updatedAt: '2024-12-11',
    views: 456,
    status: 'published',
    categoryId: 'training',
  },
  {
    id: '6',
    title: i18n.t('pages.knowledge_base_page.k19'),
    author: i18n.t('pages.knowledge_base_page.k20'),
    updatedAt: '2024-12-10',
    views: 2034,
    status: 'published',
    categoryId: 'rules',
  },
  {
    id: '7',
    title: i18n.t('pages.knowledge_base_page.k21'),
    author: i18n.t('pages.knowledge_base_page.k22'),
    updatedAt: '2024-12-09',
    views: 1876,
    status: 'published',
    categoryId: 'rules',
  },
  {
    id: '8',
    title: i18n.t('pages.knowledge_base_page.faq_23'),
    author: i18n.t('pages.knowledge_base_page.k24'),
    updatedAt: '2024-12-08',
    views: 3421,
    status: 'published',
    categoryId: 'faq',
  },
  {
    id: '9',
    title: i18n.t('pages.knowledge_base_page.k25'),
    author: i18n.t('pages.knowledge_base_page.k26'),
    updatedAt: '2024-12-07',
    views: 567,
    status: 'draft',
    categoryId: 'product-manual',
  },
  {
    id: '10',
    title: i18n.t('pages.knowledge_base_page.k27'),
    author: i18n.t('pages.knowledge_base_page.k28'),
    updatedAt: '2024-12-06',
    views: 345,
    status: 'archived',
    categoryId: 'tech-doc',
  },
  {
    id: '11',
    title: i18n.t('pages.knowledge_base_page.k29'),
    author: i18n.t('pages.knowledge_base_page.k30'),
    updatedAt: '2024-12-05',
    views: 234,
    status: 'published',
    categoryId: 'training',
  },
  {
    id: '12',
    title: i18n.t('pages.knowledge_base_page.k31'),
    author: i18n.t('pages.knowledge_base_page.k32'),
    updatedAt: '2024-12-04',
    views: 2156,
    status: 'published',
    categoryId: 'faq',
  },
];

const STATUS_LABELS: Record<string, string> = {
  published: i18n.t('pages.knowledge_base_page.k33'),
  draft: i18n.t('pages.knowledge_base_page.k34'),
  archived: i18n.t('pages.knowledge_base_page.k35'),
};

const STATUS_COLORS: Record<string, string> = {
  published: 'success',
  draft: 'warning',
  archived: 'default',
};

export const DocumentKnowledgeBasePage: React.FC = () => {
  const { data: backendData } = useQuery({
    queryKey: ['doc', 'knowledgeBase'],
    queryFn: async () => {
      try {
        return await docApi.workspaces.listWorkspaces();
      } catch {
        return {};
      }
    },
  });
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);

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
            title: i18n.t('pages.knowledge_base_page.k36'),
            message: `${i18n.t('pages.knowledge_base_page.k1')}${doc.title}"...`,
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

  const mockDocAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        let filtered = categoryDocs.map((doc) => ({
          id: doc.id,
          name: doc.title,
          author: doc.author,
          updated_at: doc.updatedAt,
          views: doc.views,
          status: doc.status,
          category_id: doc.categoryId,
          content_type: 'application/pdf',
          size: 1024 * 1024,
          folder_id: doc.categoryId,
          created_at: doc.updatedAt,
        }));

        if (params?.search) {
          const search = params.search.toLowerCase();
          filtered = filtered.filter((d) => d.name.toLowerCase().includes(search));
        }

        const page = params?.page || 1;
        const pageSize = params?.pageSize || 10;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;

        return {
          data: filtered.slice(start, end),
          total: filtered.length,
        };
      },
      create: async (data) => {
        return { id: Date.now().toString(), ...data };
      },
      update: async (id, data) => {
        return { id, ...data };
      },
      delete: async () => {},
    }),
    [categoryDocs]
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
            <Typography color='text.secondary'>{i18n.t('pages.knowledge_base_page.k37')}</Typography>
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
                label={`${i18n.t('pages.knowledge_base_page.k2')} ${categoryDocs.length}`}
                sx={{ bgcolor: 'primary.50', color: 'primary.main' }}
              />
              <Chip
                size='small'
                label={`${i18n.t('pages.knowledge_base_page.k3')} ${categoryDocs.filter((d) => d.status === 'published').length}`}
                sx={{ bgcolor: 'success.50', color: 'success.main' }}
              />
              <Chip
                size='small'
                label={`${i18n.t('pages.knowledge_base_page.k4')} ${categoryDocs.reduce((sum, d) => sum + d.views, 0).toLocaleString()}`}
                sx={{ bgcolor: 'info.50', color: 'info.main' }}
              />
            </Stack>
          </Box>

          <CrudPage
            schema={documentSchema}
            apiAdapter={mockDocAdapter}
            breadcrumbs={[]}
          />
        </Box>
      );
    },
    [selectedCategory, categoryDocs, theme.palette.text.disabled, mockDocAdapter]
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
        loading={false}
        searchPlaceholder={i18n.t('pages.knowledge_base_page.k5')}
        onSearch={setSearchQuery}
        onSelect={handleSelectNode}
        selectedId={selectedNode?.id}
        detailPanel={detailPanel}
        detailPanelTitle={selectedCategory ? i18n.t('pages.knowledge_base_page.k38') : undefined}
        onRefresh={() => {
          addNotification({
            title: i18n.t('pages.knowledge_base_page.k39'),
            message: i18n.t('pages.knowledge_base_page.k40'),
            type: 'success',
          });
        }}
        showRefresh={true}
        emptyState={{
          emoji: '📚',
          title: i18n.t('pages.knowledge_base_page.k41'),
          description: i18n.t('pages.knowledge_base_page.k42'),
        }}
      />
    </PageContainer>
  );
};

export default DocumentKnowledgeBasePage;
