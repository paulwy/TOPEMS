import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TablePagination,
  IconButton,
  Tooltip,
  Typography,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { RefreshCw, Eye, Pencil } from 'lucide-react';
import type { ModelField, DataModel } from '../../api/lowcode/types';
import { getDataPreview } from '../../api/lowcode/dataModel';

interface ModelPreviewProps {
  modelId: string;
  model?: DataModel;
}

export const ModelPreview: React.FC<ModelPreviewProps> = ({ modelId, model }) => {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [showSystemFields, setShowSystemFields] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getDataPreview({ modelId, page: page + 1, pageSize });
      if (result.success && result.data) {
        setData(result.data.rows);
        setTotal(result.data.total);
      }
    } catch (error) {
      console.error('Failed to load data preview:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [modelId, page, pageSize]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(+event.target.value);
    setPage(0);
  };

  const displayFields = (model?.fields || []).filter((f) =>
    showSystemFields ? true : !f.isSystem
  );

  const renderValue = (field: ModelField, value: unknown) => {
    if (value === null || value === undefined) {
      return <span style={{ color: 'text.secondary', opacity: 0.5 }}>-</span>;
    }

    switch (field.type) {
      case 'boolean':
        return (
          <Chip
            label={value ? '是' : '否'}
            color={value ? 'success' : 'default'}
            size="small"
            variant="outlined"
          />
        );
      case 'select':
        const option = field.options?.find((o) => o.value === value);
        return <Chip label={option?.label || String(value)} size="small" variant="outlined" />;
      case 'multiSelect':
        const values = Array.isArray(value) ? value : [];
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {values.map((v, i) => {
              const opt = field.options?.find((o) => o.value === v);
              return <Chip key={i} label={opt?.label || String(v)} size="small" variant="outlined" />;
            })}
          </Box>
        );
      case 'datetime':
      case 'createdAt':
      case 'updatedAt':
        return new Date(String(value)).toLocaleString('zh-CN');
      case 'date':
        return new Date(String(value)).toLocaleDateString('zh-CN');
      case 'currency':
        return `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
      case 'percent':
        return `${Number(value) * 100}%`;
      case 'image':
        return '[图片]';
      case 'file':
        return '[文件]';
      case 'relation':
        return value ? String(value).slice(0, 20) + '...' : '-';
      case 'multiRelation':
        const rels = Array.isArray(value) ? value : [];
        return <Chip label={`${rels.length} 条关联`} size="small" variant="outlined" />;
      default:
        return String(value).length > 50 ? String(value).slice(0, 50) + '...' : String(value);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1">数据预览</Typography>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showSystemFields}
                onChange={(e) => setShowSystemFields(e.target.checked)}
              />
            }
            label="显示系统字段"
          />
        </Box>
        <Tooltip title="刷新">
          <IconButton onClick={loadData} size="small">
            <RefreshCw style={{ width: 18, height: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {displayFields.map((field) => (
                <TableCell key={field.id} sx={{ fontWeight: 600, bgcolor: 'action.hover' }}>
                  {field.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, rowIdx) => (
              <TableRow key={rowIdx} hover>
                {displayFields.map((field) => (
                  <TableCell key={field.id}>
                    {renderValue(field, row[field.name])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={displayFields.length} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={total}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="每页"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      />
    </Box>
  );
};

export default ModelPreview;
