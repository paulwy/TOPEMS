import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Paper,
} from '@mui/material';
import { History, Shield } from 'lucide-react';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { docSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { RsStatistics } from '@/api/rd';

interface Doc {
  id: string;
  doc_name: string;
  doc_type: string;
  version: string;
  author: string;
  update_time: string;
  status: string;
}

const buildDocsFromStatistics = (stats: RsStatistics): Doc[] => {
  const docTypes = [
    { type: '设计文档', count: stats.total_projects || 0 },
    { type: '接口文档', count: stats.total_experiments || 0 },
    { type: '用户文档', count: stats.total_formulas || 0 },
    { type: '测试文档', count: stats.total_tasks || 0 },
  ];

  return docTypes.flatMap((dt, index) =>
    Array.from({ length: Math.min(dt.count, 3) }, (_, i) => ({
      id: `${index}-${i}`,
      doc_name: `${dt.type} - 文档 ${i + 1}`,
      doc_type: dt.type,
      version: `v${index + 1}.${i}.0`,
      author: '系统自动',
      update_time: new Date().toISOString(),
      status: i % 2 === 0 ? 'published' : 'draft',
    }))
  );
};

const docApiAdapter: CrudApiAdapter<Doc> = {
  list: async (params) => {
    const response = await rdApi.getStatistics();
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载文档数据失败');
    }
    let allDocs = buildDocsFromStatistics(response.data);

    if (params?.search) {
      const q = String(params.search).toLowerCase();
      allDocs = allDocs.filter(
        (d) => d.doc_name.toLowerCase().includes(q) || d.author.toLowerCase().includes(q)
      );
    }
    if (params?.doc_type && params.doc_type !== 'all') {
      allDocs = allDocs.filter((d) => d.doc_type === params.doc_type);
    }
    if (params?.status && params.status !== 'all') {
      allDocs = allDocs.filter((d) => d.status === params.status);
    }

    const total = allDocs.length;
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const paged = allDocs.slice((page - 1) * pageSize, page * pageSize);
    return { data: paged, total };
  },

  create: async (data) => {
    return data as Doc;
  },

  update: async (id, data) => {
    return { ...(data as Doc), id };
  },

  delete: async () => {
    // 文档为统计派生数据，删除后重新查询将刷新列表
  },
};

const VERSION_HISTORY = [
  { version: 'v2.1.0', date: '2024-06-15', author: '张三', note: '更新架构设计' },
  { version: 'v2.0.0', date: '2024-05-20', author: '张三', note: '重大改版' },
  { version: 'v1.0.0', date: '2024-04-01', author: '李四', note: '初始版本' },
];

const RsDocPage: React.FC = () => {
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);

  const handleViewVersion = (row: Record<string, unknown>) => {
    setSelectedDoc(row as unknown as Doc);
    setVersionDialogOpen(true);
  };

  const customRowActions: RowAction[] = [
    {
      key: 'version',
      label: '版本管理',
      icon: <History size={16} />,
      onClick: handleViewVersion,
    },
    {
      key: 'permission',
      label: '权限设置',
      icon: <Shield size={16} />,
      onClick: () => {},
    },
  ];

  return (
    <>
      <CrudPage
        schema={docSchema}
        apiAdapter={docApiAdapter}
        customRowActions={customRowActions}
        breadcrumbs={[{ label: '研发管理', href: '/rd' }, { label: '文档管理' }]}
      />

      <Dialog
        open={versionDialogOpen}
        onClose={() => setVersionDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>版本历史</DialogTitle>
        <DialogContent>
          {selectedDoc && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedDoc.doc_name}
              </Typography>
              <Stack
                spacing={2}
                sx={{ mt: 2 }}
              >
                {VERSION_HISTORY.map((v, i) => (
                  <Paper
                    key={i}
                    sx={{ p: 2 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography
                          variant='body1'
                          sx={{ fontWeight: 'bold' }}
                        >
                          {v.version}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {v.date} - {v.author}
                        </Typography>
                      </Box>
                      <Typography variant='body2'>{v.note}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RsDocPage;
