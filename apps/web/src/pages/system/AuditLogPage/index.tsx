/**
 * @refactor-split V79 Phase 2 completed - This file is now under 600 lines
 * Split structure:
 *   1. hooks/useAuditLog.ts - State and API logic (224 lines)
 *   2. components/AuditLogFilters.tsx - Search bar and filters (230 lines)
 *   3. components/AuditLogTable.tsx - Table and pagination (214 lines)
 *   4. components/AuditLogDetailDialog.tsx - Detail dialog (330 lines)
 *   5. index.tsx - Layout and composition (current file)
 */
import React, { useState } from 'react';
import { FileText, Download, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Box, Typography, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/common';
import type { AuditLog } from '@/api/system';
import { useAuditLog } from './hooks/useAuditLog';
import AuditLogFilters from './components/AuditLogFilters';
import AuditLogTable from './components/AuditLogTable';
import AuditLogDetailDialog from './components/AuditLogDetailDialog';

const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();

  // Custom hook for state and API
  const {
    filteredLogs,
    totalCount,
    isLoading,
    filters,
    updateFilter,
    clearFilters,
    uniqueUsers,
    uniqueActions,
    uniqueEntityTypes,
    pagination,
    setPagination,
    stats,
    refetch,
    handleExport,
  } = useAuditLog();

  // Detail dialog state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentLog, setCurrentLog] = useState<AuditLog | null>(null);

  // Helper functions
  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      {
        color: 'success' | 'error' | 'warning' | 'default';
        label: string;
        icon: React.ReactElement;
      }
    > = {
      success: {
        color: 'success',
        label: t('system.status.success'),
        icon: <CheckCircle size={14} />,
      },
      failed: { color: 'error', label: t('system.status.failed'), icon: <XCircle size={14} /> },
      error: { color: 'error', label: t('system.status.failed'), icon: <XCircle size={14} /> },
      warning: {
        color: 'warning',
        label: t('system.status.warning'),
        icon: <AlertCircle size={14} />,
      },
      partial: {
        color: 'warning',
        label: t('system.status.partial_success'),
        icon: <AlertCircle size={14} />,
      },
    };
    const config = badges[status] || {
      color: 'default',
      label: status,
      icon: <FileText size={14} />,
    };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
        icon={config.icon}
      />
    );
  };

  const formatAction = (action: string) => {
    const map: Record<string, string> = {
      create: t('system.action_type.create'),
      update: t('system.action_type.update'),
      delete: t('system.action_type.delete'),
      read: t('system.action_type.read'),
      batch_create: t('system.action_type.batch_create'),
      batch_delete: t('system.action_type.batch_delete'),
      export: t('system.action_type.export'),
      import: t('system.action_type.import'),
      login: t('system.action_type.login'),
      logout: t('system.action_type.logout'),
      approve: t('system.action_type.approve'),
      reject: t('system.action_type.reject'),
    };
    return map[action] || action;
  };

  const handleViewDetail = (log: AuditLog) => {
    setCurrentLog(log);
    setShowDetailModal(true);
  };

  return (
    <PageContainer
      title={t('system.page.audit_log')}
      subtitle={t('system.auditPage.subtitle')}
      maxWidth='xl'
      headerProps={{
        actions: [
          {
            label: t('system.auditPage.export_logs'),
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'contained',
          },
          {
            label: t('system.action.refresh'),
            icon: <RefreshCw size={16} />,
            onClick: refetch,
            variant: 'outlined',
          },
        ],
      }}
    >
      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 2, md: 4 },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            label: t('system.auditPage.total_operations'),
            value: stats.total,
            icon: <FileText size={20} />,
            color: 'primary',
            bg: 'primary.100',
          },
          {
            label: t('system.status.success'),
            value: stats.success,
            icon: <CheckCircle size={20} />,
            color: 'success',
            bg: 'success.100',
          },
          {
            label: t('system.status.failed'),
            value: stats.failed,
            icon: <XCircle size={20} />,
            color: 'error',
            bg: 'error.100',
          },
          {
            label: t('system.status.warning'),
            value: stats.warning,
            icon: <AlertCircle size={20} />,
            color: 'warning',
            bg: 'warning.100',
          },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 2.5,
              bgcolor: 'background.paper',
              borderRadius: 3,
              boxShadow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: stat.bg,
                color: `${stat.color}.main`,
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <AuditLogFilters
          filters={filters}
          updateFilter={updateFilter}
          clearFilters={clearFilters}
          uniqueUsers={uniqueUsers}
          uniqueActions={uniqueActions}
          uniqueEntityTypes={uniqueEntityTypes}
          formatAction={formatAction}
        />
      </Box>

      {/* Table */}
      <AuditLogTable
        logs={filteredLogs}
        totalCount={totalCount}
        isLoading={isLoading}
        pagination={pagination}
        setPagination={setPagination}
        onViewDetail={handleViewDetail}
        getStatusBadge={getStatusBadge}
        formatAction={formatAction}
      />

      {/* Detail Dialog */}
      <AuditLogDetailDialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        currentLog={currentLog}
        getStatusBadge={getStatusBadge}
        formatAction={formatAction}
      />
    </PageContainer>
  );
};

export default AuditLogPage;
