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
import i18n from '@/i18n';
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
    { type: i18n.t('rd.rs_doc_page.k0'), count: stats.total_projects || 0 },
    { type: i18n.t('rd.rs_doc_page.k1'), count: stats.total_experiments || 0 },
    { type: i18n.t('rd.rs_doc_page.k2'), count: stats.total_formulas || 0 },
    { type: i18n.t('rd.rs_doc_page.k3'), count: stats.total_tasks || 0 },
  ];
  return docTypes.flatMap((dt, index) =>
    Array.from({ length: Math.min(dt.count, 3) }, (_, i) => ({
      id: `${index}-${i}`,
      doc_name: `${dt.type}${i18n.t('pages.rs_doc_page.k0')}${i + 1}`,
      doc_type: dt.type,
      version: `v${index + 1}.${i}.0`,
      author: i18n.t('rd.rs_doc_page.k4'),
      update_time: new Date().toISOString(),
      status: i % 2 === 0 ? 'published' : 'draft',
    }))
  );
};
const docApiAdapter: CrudApiAdapter<Doc> = {
  list: async (params) => {
    const response = await rdApi.getStatistics();
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_doc_page.k5'));
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
const getVersionHistory = () => [
  {
    version: 'v2.1.0',
    date: '2024-06-15',
    author: i18n.t('rd.rs_doc_page.k7'),
    note: i18n.t('rd.rs_doc_page.k6'),
  },
  {
    version: 'v2.0.0',
    date: '2024-05-20',
    author: i18n.t('rd.rs_doc_page.k9'),
    note: i18n.t('rd.rs_doc_page.k8'),
  },
  {
    version: 'v1.0.0',
    date: '2024-04-01',
    author: i18n.t('rd.rs_doc_page.k11'),
    note: i18n.t('rd.rs_doc_page.k10'),
  },
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
      label: i18n.t('rd.rs_doc_page.k12'),
      icon: <History size={16} />,
      onClick: handleViewVersion,
    },
    {
      key: 'permission',
      label: i18n.t('rd.rs_doc_page.k13'),
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
        breadcrumbs={[
          { label: i18n.t('rd.rs_doc_page.k15'), href: '/rd' },
          { label: i18n.t('rd.rs_doc_page.k14') },
        ]}
      />
      <Dialog
        open={versionDialogOpen}
        onClose={() => setVersionDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{i18n.t('rd.rs_doc_page.k16')}</DialogTitle>
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
                {getVersionHistory().map((v, i) => (
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
          <Button onClick={() => setVersionDialogOpen(false)}>
            {i18n.t('rd.rs_doc_page.k17')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default RsDocPage;
