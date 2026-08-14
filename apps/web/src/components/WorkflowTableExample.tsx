import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Chip, Menu, MenuItem, Divider, Button } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';

import { DataTable } from '@/components/common/DataTable';
import { workflowApi, type Workflow } from '@/api/workflow';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

export function WorkflowTableExample() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Workflow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [_selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await workflowApi.workflows.list();
      if (response.success && response.data) {
        setData(response.data.items || []);
      } else {
        setError(response.message || i18n.t('components.workflow_table_example.k0'));
      }
    } catch (err: unknown) {
      logger.error(i18n.t('components.workflow_table_example.k0'), err);
      const error = err as { message?: string };
      setError(`${i18n.t('components.workflow_table_example.k1')} ${error.message || i18n.t('components.workflow_table_example.k1')}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, workflow: Workflow) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorkflow(workflow);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkflow(null);
  };

  const columns = useMemo<ColumnDef<Workflow>[]>(
    () => [
      {
        accessorKey: 'id',
        header: () => <Box sx={{ textAlign: 'left' }}>ID</Box>,
        cell: ({ row }) => (
          <Box sx={{ textAlign: 'left', fontWeight: 500 }}>{row.getValue('id')}</Box>
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant='text'
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              sx={{ p: 0, height: 'auto', color: 'text.primary' }}
            >
              {i18n.t('components.workflow_table_example.k2')}
              <ArrowUpDown style={{ width: 14, height: 14, marginLeft: 8 }} />
            </Button>
          );
        },
        cell: ({ row }) => <Box sx={{ textAlign: 'left' }}>{row.getValue('name')}</Box>,
      },
      {
        accessorKey: 'description',
        header: () => <Box sx={{ textAlign: 'left' }}>{i18n.t('components.workflow_table_example.k2')}</Box>,
        cell: ({ row }) => <Box sx={{ textAlign: 'left' }}>{row.getValue('description')}</Box>,
      },
      {
        accessorKey: 'isactive',
        header: () => <Box sx={{ textAlign: 'left' }}>{i18n.t('components.workflow_table_example.k3')}</Box>,
        cell: ({ row }) => {
          const isActive = row.getValue('isactive') as boolean;
          return (
            <Box sx={{ textAlign: 'left' }}>
              <Chip
                size='small'
                label={isActive ? i18n.t('components.workflow_table_example.k5') : i18n.t('components.workflow_table_example.k4')}
                sx={{
                  backgroundColor: isActive ? 'success.light' : 'grey.100',
                  color: isActive ? 'success.dark' : 'grey.600',
                }}
              />
            </Box>
          );
        },
      },
      {
        accessorKey: 'created_by',
        header: () => <Box sx={{ textAlign: 'left' }}>{i18n.t('components.workflow_table_example.k6')}</Box>,
        cell: ({ row }) => (
          <Box sx={{ textAlign: 'left' }}>{row.getValue('created_by') || '-'}</Box>
        ),
      },
      {
        accessorKey: 'created_at',
        header: () => <Box sx={{ textAlign: 'left' }}>{i18n.t('components.workflow_table_example.k7')}</Box>,
        cell: ({ row }) => <Box sx={{ textAlign: 'left' }}>{row.getValue('created_at')}</Box>,
      },
      {
        accessorKey: 'updated_at',
        header: () => <Box sx={{ textAlign: 'left' }}>{i18n.t('components.workflow_table_example.k8')}</Box>,
        cell: ({ row }) => <Box sx={{ textAlign: 'left' }}>{row.getValue('updated_at')}</Box>,
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const workflow = row.original;

          return (
            <Box sx={{ textAlign: 'right' }}>
              <Button
                variant='text'
                size='small'
                onClick={(e) => handleMenuOpen(e, workflow)}
                sx={{ minWidth: 32, width: 32, height: 32, p: 0 }}
              >
                <MoreHorizontal style={{ width: 18, height: 18 }} />
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem
                  disabled
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('components.workflow_table_example.k3')}
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    logger.info(i18n.t('components.workflow_table_example.k4'), workflow.id);
                    handleMenuClose();
                  }}
                >
                  {i18n.t('components.workflow_table_example.k5')}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    logger.info(i18n.t('components.workflow_table_example.k6'), workflow.id);
                    handleMenuClose();
                  }}
                >
                  {i18n.t('components.workflow_table_example.k7')}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    logger.info(i18n.t('components.workflow_table_example.k8'), workflow.id);
                    handleMenuClose();
                  }}
                >
                  {i18n.t('components.workflow_table_example.k9')}
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    logger.info(i18n.t('components.workflow_table_example.k10'), workflow.id);
                    handleMenuClose();
                  }}
                  sx={{ color: 'error.main' }}
                >
                  {i18n.t('components.workflow_table_example.k11')}
                </MenuItem>
              </Menu>
            </Box>
          );
        },
      },
    ],
    [anchorEl]
  );

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 600, mb: 3 }}
        >
          {i18n.t('components.workflow_table_example.k12')}
        </Typography>
        <Box
          sx={{
            backgroundColor: 'error.light',
            border: '1px solid error.light',
            borderRadius: 1,
            p: 2,
            color: 'error.dark',
          }}
        >
          {error}
          <Button
            variant='outlined'
            onClick={loadWorkflows}
            sx={{ ml: 2 }}
          >
            {i18n.t('components.workflow_table_example.k13')}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant='h5'
        sx={{ fontWeight: 600, mb: 3 }}
      >
        {i18n.t('components.workflow_table_example.k14')}
      </Typography>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKey='name'
        searchPlaceholder={i18n.t('components.workflow_table_example.k15')}
        onRowClick={(workflow) => {
          logger.info(i18n.t('components.workflow_table_example.k16'), workflow);
        }}
      />
    </Box>
  );
}
