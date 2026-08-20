import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Rating,
  TextField,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Bug,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  ArrowUpCircle,
  Lightbulb,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/common/DataTable';

import { feedbackApi } from '@/api/feedback';
import type {
  Feedback,
  FeedbackType,
  FeedbackStatus,
  FeedbackQueryParams,
} from '@/api/feedback/types';
import { FEEDBACK_TYPE_LABELS, FEEDBACK_STATUS_LABELS } from '@/api/feedback/types';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

interface FeedbackListProps {
  onAddFeedback?: () => void;
}

const getTypeIcon = (type: FeedbackType) => {
  switch (type) {
    case 'bug':
      return <Bug size={16} />;
    case 'feature':
      return <Lightbulb size={16} />;
    case 'improvement':
      return <ArrowUpCircle size={16} />;
    case 'question':
      return <HelpCircle size={16} />;
    default:
      return <MessageSquare size={16} />;
  }
};

const getTypeColor = (type: FeedbackType) => {
  switch (type) {
    case 'bug':
      return 'error' as const;
    case 'feature':
      return 'success' as const;
    case 'improvement':
      return 'info' as const;
    case 'question':
      return 'warning' as const;
    default:
      return 'default' as const;
  }
};

const getStatusColor = (status: FeedbackStatus) => {
  switch (status) {
    case 'pending':
      return 'warning' as const;
    case 'processing':
      return 'info' as const;
    case 'resolved':
      return 'success' as const;
    case 'closed':
      return 'default' as const;
    default:
      return 'default' as const;
  }
};

const FeedbackList: React.FC<FeedbackListProps> = ({ onAddFeedback }) => {
  const [filters, setFilters] = useState<FeedbackQueryParams>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.FEEDBACKS_BASE, filters],
    queryFn: () => feedbackApi.listFeedbacks(filters),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => feedbackApi.deleteFeedback(id),
    onSuccess: () => {
      toast.success(i18n.t('components.feedback_list.k0'));
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.FEEDBACKS_BASE,
        exact: false,
        refetchType: 'active',
      });
      setAnchorEl(null);
    },
    onError: () => {
      toast.error(i18n.t('components.feedback_list.k1'));
      setAnchorEl(null);
    },
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: 'type' | 'status', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value ? (value as FeedbackType | FeedbackStatus) : undefined,
    }));
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedId(null);
  };

  const columns: ColumnDef<Feedback>[] = [
    {
      accessorKey: 'type',
      header: i18n.t('components.feedback_list.k2'),
      cell: ({ row }) => {
        const type = row.getValue<FeedbackType>('type');
        return (
          <Chip
            icon={getTypeIcon(type)}
            label={FEEDBACK_TYPE_LABELS[type]}
            color={getTypeColor(type)}
            size='small'
          />
        );
      },
    },
    {
      accessorKey: 'title',
      header: i18n.t('components.feedback_list.k3'),
      cell: ({ row }) => (
        <Typography
          variant='body1'
          sx={{ fontWeight: 500 }}
        >
          {row.getValue('title')}
        </Typography>
      ),
    },
    {
      accessorKey: 'description',
      header: i18n.t('components.feedback_list.k4'),
      cell: ({ row }) => (
        <Typography
          variant='body2'
          color='text.secondary'
          noWrap
        >
          {row.getValue('description')}
        </Typography>
      ),
    },
    {
      accessorKey: 'satisfaction',
      header: i18n.t('components.feedback_list.k5'),
      cell: ({ row }) => (
        <Rating
          value={row.getValue('satisfaction')}
          readOnly
          precision={1}
          size='small'
        />
      ),
    },
    {
      accessorKey: 'status',
      header: i18n.t('components.feedback_list.k6'),
      cell: ({ row }) => {
        const status = row.getValue<FeedbackStatus>('status');
        return (
          <Chip
            label={FEEDBACK_STATUS_LABELS[status]}
            color={getStatusColor(status)}
            size='small'
          />
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: i18n.t('components.feedback_list.k7'),
      cell: ({ row }) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {dayjs(row.getValue('created_at')).format('YYYY-MM-DD HH:mm')}
        </Typography>
      ),
    },
    {
      id: 'actions',
      header: i18n.t('components.feedback_list.k8'),
      cell: ({ row }) => (
        <IconButton
          onClick={(e) => handleMenuOpen(e, row.id)}
          sx={{ p: 1 }}
          aria-label={i18n.t('components.feedback_list.k9')}
        >
          <MoreVertical size={20} />
        </IconButton>
      ),
    },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Box sx={{ width: { xs: '100%', md: 'calc(33.333% - 8px)' } }}>
          <TextField
            fullWidth
            label={i18n.t('components.feedback_list.k10')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <Search
                    size={20}
                    sx={{ mr: 1, color: 'text.secondary' }}
                  />
                ),
              },
            }}
          />
        </Box>
        <Box sx={{ width: { xs: 'calc(50% - 4px)', md: 'calc(25% - 8px)' } }}>
          <TextField
            select
            fullWidth
            label={i18n.t('components.feedback_list.k11')}
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <MenuItem value=''>{i18n.t('components.feedback_list.k12')}</MenuItem>
            {(Object.keys(FEEDBACK_TYPE_LABELS) as FeedbackType[]).map((type) => (
              <MenuItem
                key={type}
                value={type}
              >
                {FEEDBACK_TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ width: { xs: 'calc(50% - 4px)', md: 'calc(25% - 8px)' } }}>
          <TextField
            select
            fullWidth
            label={i18n.t('components.feedback_list.k13')}
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <MenuItem value=''>{i18n.t('components.feedback_list.k14')}</MenuItem>
            {(Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]).map((status) => (
              <MenuItem
                key={status}
                value={status}
              >
                {FEEDBACK_STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ width: { xs: '100%', md: 'calc(16.666% - 8px)' } }}>
          <Button
            fullWidth
            variant='contained'
            startIcon={<Plus />}
            onClick={onAddFeedback}
          >
            {i18n.t('components.feedback_list.k0')}
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.data?.items || []}
            loading={isPending}
            totalItems={data?.data?.total || 0}
            currentPage={filters.page || 1}
            pageSize={filters.pageSize || 10}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize }))}
          />
        </CardContent>
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedId && handleDelete(selectedId)}>
          <Trash2
            size={16}
            sx={{ mr: 2 }}
          />
          {i18n.t('components.feedback_list.k1')}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default FeedbackList;
