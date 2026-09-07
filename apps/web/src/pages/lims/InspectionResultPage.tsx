import { useCallback, useEffect, useMemo, useState } from 'react';
import { Typography } from '@mui/material';
import { Calendar, User, FileCheck, AlertCircle } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { useTranslation } from 'react-i18next';
import { recordApi } from '@/api/lims';

type InspectionResult = {
  id: string;
  sample_no: string;
  item_name: string;
  result: string;
  status: string;
  inspector: string;
  inspection_date: string;
};

export default function InspectionResultPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<InspectionResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await recordApi.list({ page: page + 1, pageSize });
      if (r.success && r.data) {
        setData(
          r.data.items.map((rec) => ({
            id: rec.id,
            sample_no: rec.task_id,
            item_name: rec.step_name,
            result: rec.result,
            status: rec.conclusion,
            inspector: rec.inspector,
            inspection_date: rec.recorded_at,
          }))
        );
        setTotal(r.data.total);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnDef<InspectionResult>[] = useMemo(
    () => [
      {
        id: 'sample_no',
        label: t('lims.inspection_result_page.col_sample_no'),
        render: (row) => <Typography sx={{ fontWeight: 500 }}>{row.sample_no}</Typography>,
      },
      {
        id: 'item_name',
        label: t('lims.inspection_result_page.col_item_name'),
        render: (row) => <span>{row.item_name}</span>,
      },
      {
        id: 'result',
        label: t('lims.inspection_result_page.col_result'),
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileCheck size={14} />
            {row.result}
          </span>
        ),
      },
      {
        id: 'status',
        label: t('lims.inspection_result_page.col_status'),
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} />
            {row.status}
          </span>
        ),
      },
      {
        id: 'inspector',
        label: t('lims.inspection_result_page.col_inspector'),
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} />
            {row.inspector}
          </span>
        ),
      },
      {
        id: 'inspection_date',
        label: t('lims.inspection_result_page.col_inspection_date'),
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} />
            {row.inspection_date}
          </span>
        ),
      },
    ],
    [t]
  );

  return (
    <ListPageTemplate<InspectionResult>
      title={t('lims.inspection_result_page.k0')}
      columns={columns}
      data={data}
      loading={isLoading}
      pagination={{
        page,
        pageSize,
        total,
        onPageChange: setPage,
        onPageSizeChange: setPageSize,
      }}
      emptyMessage={t('pages.inspection_result_page.k0')}
    />
  );
}
