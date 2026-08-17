import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import i18n from '@/i18n';
import { Table, LayoutGrid, Eye, Save, Download } from 'lucide-react';
import {
  DataSourcePanel,
  FieldSelector,
  FilterPanel,
  GroupPanel,
  LayoutPanel,
  PreviewContent,
} from './components';
import { MOCK_FIELDS, MOCK_DATA } from './mockData';

import type {
  DataSourceType,
  DataSourceField,
  SelectedField,
  FilterCondition,
  GroupByConfig,
  LayoutType,
  ReportDesignerTemplateProps,
  ReportDesignerState,
} from './types';

export * from './types';

export const ReportDesignerTemplate: React.FC<ReportDesignerTemplateProps> = ({
  title = i18n.t('templates.index.k0'),
  subtitle = i18n.t('templates.index.k1'),
  initialDataSource,
  onSave,
  onExport,
  onPreview,
  loading = false,
  availableTables = [
    { name: 'orders', label: i18n.t('templates.index.k2') },
    { name: 'users', label: i18n.t('templates.index.k3') },
    { name: 'projects', label: i18n.t('templates.index.k4') },
  ],
  availableApis = [
    { name: 'sales_report', label: i18n.t('templates.index.api_5'), url: '/api/reports/sales' },
    {
      name: 'inventory_report',
      label: i18n.t('templates.index.api_6'),
      url: '/api/reports/inventory',
    },
    {
      name: 'performance_report',
      label: i18n.t('templates.index.api_7'),
      url: '/api/reports/performance',
    },
  ],
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showDataSourcePanel, setShowDataSourcePanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showGroupPanel, setShowGroupPanel] = useState(false);

  const [state, setState] = useState<ReportDesignerState>({
    dataSource: initialDataSource || {
      type: 'database',
      name: '',
      tableName: '',
      fields: [],
    },
    selectedFields: [],
    filters: [],
    groupBy: [],
    sortBy: [],
    layout: {
      type: 'table',
      columns: 1,
      showHeader: true,
      showFooter: true,
      pagination: true,
      pageSize: 10,
      chart: {
        type: 'bar',
        xAxisField: '',
        yAxisFields: [],
        showLegend: true,
        showGrid: true,
        animated: true,
      },
    },
    title: '',
    description: '',
  });

  const availableFields = useMemo(() => {
    if (state.dataSource.type === 'database' && state.dataSource.tableName) {
      return MOCK_FIELDS[state.dataSource.tableName] || [];
    }
    return state.dataSource.fields;
  }, [state.dataSource]);

  const unselectedFields = useMemo(() => {
    const selectedIds = new Set(state.selectedFields.map((f) => f.fieldId));
    return availableFields.filter((f) => !selectedIds.has(f.id));
  }, [availableFields, state.selectedFields]);

  const previewData = useMemo(() => {
    const sourceName = state.dataSource.tableName || 'orders';
    const rawData = MOCK_DATA[sourceName] || [];
    const visibleFields = state.selectedFields.filter((f) => f.visible);

    if (visibleFields.length === 0) return rawData;

    return rawData.map((row) => {
      const newRow: Record<string, unknown> = {};
      visibleFields.forEach((field) => {
        newRow[field.fieldName] = row[field.fieldName];
      });
      return newRow;
    });
  }, [state.dataSource.tableName, state.selectedFields]);

  const handleDataSourceTypeChange = useCallback((type: DataSourceType) => {
    setState((prev) => ({
      ...prev,
      dataSource: {
        ...prev.dataSource,
        type,
        tableName: type === 'database' ? prev.dataSource.tableName : undefined,
        apiUrl: type === 'api' ? prev.dataSource.apiUrl : undefined,
        file: type === 'excel' ? prev.dataSource.file : undefined,
        fields: [],
      },
      selectedFields: [],
    }));
  }, []);

  const handleTableSelect = useCallback(
    (tableName: string) => {
      const fields = MOCK_FIELDS[tableName] || [];
      setState((prev) => ({
        ...prev,
        dataSource: {
          ...prev.dataSource,
          tableName,
          name: availableTables.find((t) => t.name === tableName)?.label || tableName,
          fields,
        },
        selectedFields: fields.map((f) => ({
          fieldId: f.id,
          fieldName: f.name,
          label: f.label,
          type: f.type,
          width: 150,
          visible: true,
          sortable: true,
        })),
      }));
    },
    [availableTables]
  );

  const handleApiSelect = useCallback(
    (apiName: string) => {
      const api = availableApis.find((a) => a.name === apiName);
      if (api) {
        const fields = MOCK_FIELDS['orders'] || [];
        setState((prev) => ({
          ...prev,
          dataSource: {
            ...prev.dataSource,
            apiUrl: api.url,
            name: api.label,
            apiMethod: 'GET',
            fields,
          },
          selectedFields: fields.map((f) => ({
            fieldId: f.id,
            fieldName: f.name,
            label: f.label,
            type: f.type,
            width: 150,
            visible: true,
            sortable: true,
          })),
        }));
      }
    },
    [availableApis]
  );

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fields = MOCK_FIELDS['orders'] || [];
      setState((prev) => ({
        ...prev,
        dataSource: {
          ...prev.dataSource,
          file,
          name: file.name,
          fields,
        },
        selectedFields: fields.map((f) => ({
          fieldId: f.id,
          fieldName: f.name,
          label: f.label,
          type: f.type,
          width: 150,
          visible: true,
          sortable: true,
        })),
      }));
    }
  }, []);

  const handleAddField = useCallback((field: DataSourceField) => {
    setState((prev) => ({
      ...prev,
      selectedFields: [
        ...prev.selectedFields,
        {
          fieldId: field.id,
          fieldName: field.name,
          label: field.label,
          type: field.type,
          width: 150,
          visible: true,
          sortable: true,
        },
      ],
    }));
  }, []);

  const handleRemoveField = useCallback((fieldId: string) => {
    setState((prev) => ({
      ...prev,
      selectedFields: prev.selectedFields.filter((f) => f.fieldId !== fieldId),
    }));
  }, []);

  const handleReorderFields = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newFields = [...prev.selectedFields];
      const [removed] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, removed);
      return { ...prev, selectedFields: newFields };
    });
  }, []);

  const handleFieldUpdate = useCallback((fieldId: string, updates: Partial<SelectedField>) => {
    setState((prev) => ({
      ...prev,
      selectedFields: prev.selectedFields.map((f) =>
        f.fieldId === fieldId ? { ...f, ...updates } : f
      ),
    }));
  }, []);

  const handleAddFilter = useCallback(() => {
    const newFilter: FilterCondition = {
      id: `filter-${Date.now()}`,
      fieldId: availableFields[0]?.id || '',
      fieldName: availableFields[0]?.name || '',
      operator: 'equals',
      value: null,
    };
    setState((prev) => ({ ...prev, filters: [...prev.filters, newFilter] }));
  }, [availableFields]);

  const handleUpdateFilter = useCallback((filterId: string, updates: Partial<FilterCondition>) => {
    setState((prev) => ({
      ...prev,
      filters: prev.filters.map((f) => (f.id === filterId ? { ...f, ...updates } : f)),
    }));
  }, []);

  const handleRemoveFilter = useCallback((filterId: string) => {
    setState((prev) => ({ ...prev, filters: prev.filters.filter((f) => f.id !== filterId) }));
  }, []);

  const handleAddGroupBy = useCallback(() => {
    const numericFields = availableFields.filter((f) => f.type === 'number');
    const newGroup: GroupByConfig = {
      fieldId: availableFields[0]?.id || '',
      fieldName: availableFields[0]?.name || '',
      aggregate: numericFields.length > 0 ? 'sum' : undefined,
    };
    setState((prev) => ({ ...prev, groupBy: [...prev.groupBy, newGroup] }));
  }, [availableFields]);

  const handleUpdateGroupBy = useCallback((index: number, updates: Partial<GroupByConfig>) => {
    setState((prev) => {
      const newGroupBy = [...prev.groupBy];
      newGroupBy[index] = { ...newGroupBy[index], ...updates };
      return { ...prev, groupBy: newGroupBy };
    });
  }, []);

  const handleRemoveGroupBy = useCallback((index: number) => {
    setState((prev) => {
      const newGroupBy = [...prev.groupBy];
      newGroupBy.splice(index, 1);
      return { ...prev, groupBy: newGroupBy };
    });
  }, []);

  const handleLayoutChange = useCallback((type: LayoutType) => {
    setState((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        type,
        columns: type === 'card' ? 3 : type === 'chart' ? 1 : 1,
      },
    }));
  }, []);

  const handleSave = useCallback(() => {
    onSave?.(state);
  }, [state, onSave]);

  const handleExport = useCallback(
    (format: 'excel' | 'pdf' | 'csv') => {
      onExport?.(format);
    },
    [onExport]
  );

  const handlePreview = useCallback(() => {
    onPreview?.(state);
    setPreviewOpen(true);
  }, [state, onPreview]);

  const tabs = [
    { label: i18n.t('templates.index.k8'), icon: <Table sx={{ width: 16, height: 16 }} /> },
    { label: i18n.t('templates.index.k9'), icon: <LayoutGrid sx={{ width: 16, height: 16 }} /> },
    { label: i18n.t('templates.index.k10'), icon: <Eye sx={{ width: 16, height: 16 }} /> },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 600, mb: 0.5 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <TextField
          fullWidth
          label={i18n.t('templates.index.k11')}
          value={state.title}
          onChange={(e) => setState((prev) => ({ ...prev, title: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label={i18n.t('templates.index.k12')}
          multiline
          rows={2}
          value={state.description}
          onChange={(e) => setState((prev) => ({ ...prev, description: e.target.value }))}
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <DataSourcePanel
          dataSource={state.dataSource}
          showDataSourcePanel={showDataSourcePanel}
          setShowDataSourcePanel={setShowDataSourcePanel}
          handleDataSourceTypeChange={handleDataSourceTypeChange}
          handleTableSelect={handleTableSelect}
          handleApiSelect={handleApiSelect}
          handleFileUpload={handleFileUpload}
          availableTables={availableTables}
          availableApis={availableApis}
        />
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          {tabs.map((tab, idx) => (
            <Tab
              key={idx}
              label={tab.label}
              icon={tab.icon}
              iconPosition='start'
            />
          ))}
        </Tabs>

        <Divider sx={{ mb: 3 }} />

        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FieldSelector
              unselectedFields={unselectedFields}
              selectedFields={state.selectedFields}
              handleAddField={handleAddField}
              handleRemoveField={handleRemoveField}
              handleReorderFields={handleReorderFields}
              handleFieldUpdate={handleFieldUpdate}
            />
            <Divider />
            <FilterPanel
              filters={state.filters}
              availableFields={availableFields}
              showFilterPanel={showFilterPanel}
              setShowFilterPanel={setShowFilterPanel}
              handleAddFilter={handleAddFilter}
              handleUpdateFilter={handleUpdateFilter}
              handleRemoveFilter={handleRemoveFilter}
            />
            <GroupPanel
              groupBy={state.groupBy}
              availableFields={availableFields}
              showGroupPanel={showGroupPanel}
              setShowGroupPanel={setShowGroupPanel}
              handleAddGroupBy={handleAddGroupBy}
              handleUpdateGroupBy={handleUpdateGroupBy}
              handleRemoveGroupBy={handleRemoveGroupBy}
            />
          </Box>
        )}

        {activeTab === 1 && (
          <LayoutPanel
            layout={state.layout}
            selectedFields={state.selectedFields}
            handleLayoutChange={handleLayoutChange}
            setState={setState}
          />
        )}

        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, color: 'grey.600' }}
            >
              {i18n.t('components.index.k0')}
            </Typography>
            <PreviewContent
              layout={state.layout}
              selectedFields={state.selectedFields}
              previewData={previewData}
            />
          </Box>
        )}
      </Paper>

      <Box sx={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', gap: 2, zIndex: 100 }}>
        <Button
          variant='outlined'
          startIcon={<Eye sx={{ width: 16, height: 16 }} />}
          onClick={handlePreview}
          sx={{ borderRadius: 1 }}
        >
          {i18n.t('components.index.k1')}
        </Button>
        <Button
          variant='outlined'
          startIcon={<Download sx={{ width: 16, height: 16 }} />}
          onClick={() => handleExport('excel')}
          sx={{ borderRadius: 1 }}
        >
          {i18n.t('components.index.k2')}
        </Button>
        <Button
          variant='contained'
          startIcon={<Save sx={{ width: 16, height: 16 }} />}
          onClick={handleSave}
          sx={{ borderRadius: 1 }}
        >
          {i18n.t('components.index.k3')}
        </Button>
      </Box>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant='h6'>{i18n.t('templates.index.k13')}</Typography>
          <Typography
            variant='subtitle1'
            sx={{ color: 'grey.500' }}
          >
            {state.title || i18n.t('templates.index.k14')}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <PreviewContent
            layout={state.layout}
            selectedFields={state.selectedFields}
            previewData={previewData}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>{i18n.t('templates.index.k15')}</Button>
          <Button onClick={() => handleExport('excel')}>
            {i18n.t('templates.index.excel_16')}
          </Button>
          <Button onClick={() => handleExport('pdf')}>{i18n.t('templates.index.pdf_17')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportDesignerTemplate;
