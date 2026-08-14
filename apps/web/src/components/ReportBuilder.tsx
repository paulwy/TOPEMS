import React, { useState } from 'react';
import { useTheme } from '@mui/material';
import { X, FileText, Loader2, CheckCircle } from 'lucide-react';
import type { ReportType, ReportTypeInfo, CreateReportRequest } from '@/api/report';
import { reportApi } from '@/api/report';
import { logger } from '@/utils/logger';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface ReportBuilderProps {
  onClose: () => void;
  reportTypes: ReportTypeInfo[];
  onSuccess: () => void;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ onClose, reportTypes, onSuccess }) => {
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);

  const defaultColumns: Record<string, string[]> = {
    rs_project_progress: [i18n.t('components.report_builder.k5'), i18n.t('components.report_builder.k4'), i18n.t('components.report_builder.k3'), i18n.t('components.report_builder.k2'), i18n.t('components.report_builder.k1'), i18n.t('components.report_builder.k0')],
    rs_experiment_record: [i18n.t('components.report_builder.k11'), i18n.t('components.report_builder.k10'), i18n.t('components.report_builder.k9'), i18n.t('components.report_builder.k8'), i18n.t('components.report_builder.k7'), i18n.t('components.report_builder.k6')],
    lims_inspection_stats: [i18n.t('components.report_builder.k17'), i18n.t('components.report_builder.k16'), i18n.t('components.report_builder.k15'), i18n.t('components.report_builder.k14'), i18n.t('components.report_builder.k13'), i18n.t('components.report_builder.k12')],
    lims_sample_summary: [i18n.t('components.report_builder.k23'), i18n.t('components.report_builder.k22'), i18n.t('components.report_builder.k21'), i18n.t('components.report_builder.k20'), i18n.t('components.report_builder.k19'), i18n.t('components.report_builder.k18')],
    qms_quality_analysis: [i18n.t('components.report_builder.k29'), i18n.t('components.report_builder.k28'), i18n.t('components.report_builder.k27'), i18n.t('components.report_builder.k26'), i18n.t('components.report_builder.k25'), i18n.t('components.report_builder.k24')],
    qms_defect_stats: [i18n.t('components.report_builder.k35'), i18n.t('components.report_builder.k34'), i18n.t('components.report_builder.k33'), i18n.t('components.report_builder.k32'), i18n.t('components.report_builder.k31'), i18n.t('components.report_builder.k30')],
    ehs_safety_check: [i18n.t('components.report_builder.k41'), i18n.t('components.report_builder.k40'), i18n.t('components.report_builder.k39'), i18n.t('components.report_builder.k38'), i18n.t('components.report_builder.k37'), i18n.t('components.report_builder.k36')],
    ehs_risk_assessment: [i18n.t('components.report_builder.k47'), i18n.t('components.report_builder.k46'), i18n.t('components.report_builder.k45'), i18n.t('components.report_builder.k44'), i18n.t('components.report_builder.k43'), i18n.t('components.report_builder.k42')],
    srm_supplier_eval: [i18n.t('components.report_builder.k53'), i18n.t('components.report_builder.k52'), i18n.t('components.report_builder.k51'), i18n.t('components.report_builder.k50'), i18n.t('components.report_builder.k49'), i18n.t('components.report_builder.k48')],
    srm_purchase_stats: [i18n.t('components.report_builder.k59'), i18n.t('components.report_builder.k58'), i18n.t('components.report_builder.k57'), i18n.t('components.report_builder.k56'), i18n.t('components.report_builder.k55'), i18n.t('components.report_builder.k54')],
    pdm_production_stats: [i18n.t('components.report_builder.k65'), i18n.t('components.report_builder.k64'), i18n.t('components.report_builder.k63'), i18n.t('components.report_builder.k62'), i18n.t('components.report_builder.k61'), i18n.t('components.report_builder.k60')],
    pdm_process_summary: [i18n.t('components.report_builder.k71'), i18n.t('components.report_builder.k70'), i18n.t('components.report_builder.k69'), i18n.t('components.report_builder.k68'), i18n.t('components.report_builder.k67'), i18n.t('components.report_builder.k66')],
  };

  const handleReportTypeChange = (type: ReportType) => {
    setReportType(type);
    setSelectedColumns(defaultColumns[type] || []);
    const reportTypeInfo = reportTypes.find((t) => t.type === type);
    if (reportTypeInfo) {
      setTitle(`${reportTypeInfo.name}_${new Date().toLocaleDateString('zh-CN')}`);
    }
    setStep(2);
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    );
  };

  const handleSelectAll = () => {
    if (reportType && defaultColumns[reportType]) {
      setSelectedColumns([...defaultColumns[reportType]]);
    }
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handleCreate = async () => {
    if (!reportType || selectedColumns.length === 0) {
      alert(i18n.t('components.report_builder.k72'));
      return;
    }

    try {
      setCreating(true);

      const request: CreateReportRequest = {
        config: {
          report_type: reportType,
          format: 'excel',
          title: title || `${reportTypes.find((t) => t.type === reportType)?.name}`,
          description,
          columns: selectedColumns,
          date_range:
            startDate && endDate
              ? {
                  start_date: startDate,
                  end_date: endDate,
                }
              : undefined,
        },
      };

      const response = await reportApi.createReport(request);

      if (response.success) {
        onSuccess();
      } else {
        alert(response.message || i18n.t('components.report_builder.k73'));
      }
    } catch (err: unknown) {
      logger.error(i18n.t('components.report_builder.k0'), err);
      alert(i18n.t('components.report_builder.k74'));
    } finally {
      setCreating(false);
    }
  };

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      RS: 'colors.orange.500',
      LIMS: 'primary.main',
      QMS: 'success.dark',
      EHS: 'error.main',
      SRM: 'colors.purple.500',
      PDM: 'primary.light',
    };
    return colors[module] || 'text.secondary';
  };

  const getModuleTextColor = (module: string) => {
    const colors: Record<string, string> = {
      RS: '#c2410c',
      LIMS: 'primary.dark',
      QMS: 'success.700',
      EHS: 'error.darker',
      SRM: '#7e22ce',
      PDM: 'secondary.700',
    };
    return colors[module] || 'grey.700';
  };

  const groupedTypes = reportTypes.reduce(
    (acc, type) => {
      const module = type.module;
      if (!acc[module]) acc[module] = [];
      acc[module].push(type);
      return acc;
    },
    {} as Record<string, ReportTypeInfo[]>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'action.active',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: 'common.white',
          borderRadius: 12,
          boxShadow: designTokens.shadows['2xl'],
          width: '100%',
          maxWidth: 1024,
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 24,
            borderBottom: '1px solid border.default',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(to right, primary.light, #e0e7ff)',
          }}
        >
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--mui-palette-text-primary)' }}>
              {i18n.t('components.report_builder.k1')}
            </h3>
            <p style={{ fontSize: 14, color: 'grey.600', marginTop: 4 }}>{i18n.t('components.report_builder.k75')}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 8,
              color: 'var(--mui-palette-text-secondary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div
          style={{
            padding: 16,
            backgroundColor: theme.palette.grey[50],
            borderBottom: '1px solid border.default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: step >= 1 ? theme.palette.primary.dark : theme.palette.grey[400],
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'full',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: step >= 1 ? theme.palette.primary.dark : theme.palette.grey[400],
                  color: 'common.white',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {step > 1 ? <CheckCircle style={{ width: 20, height: 20 }} /> : '1'}
              </div>
              <span style={{ marginLeft: 8, fontWeight: 500 }}>{i18n.t('components.report_builder.k76')}</span>
            </div>
            <div style={{ flex: 1, height: 2, backgroundColor: 'var(--mui-palette-divider)' }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: theme.palette.primary.dark,
                  transition: 'all 0.3s',
                  width: step >= 2 ? '100%' : '0%',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: step >= 2 ? theme.palette.primary.dark : theme.palette.grey[400],
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'full',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: step >= 2 ? theme.palette.primary.dark : theme.palette.grey[400],
                  color: 'common.white',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {step > 2 ? <CheckCircle style={{ width: 20, height: 20 }} /> : '2'}
              </div>
              <span style={{ marginLeft: 8, fontWeight: 500 }}>{i18n.t('components.report_builder.k77')}</span>
            </div>
            <div style={{ flex: 1, height: 2, backgroundColor: 'var(--mui-palette-divider)' }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: theme.palette.primary.dark,
                  transition: 'all 0.3s',
                  width: step >= 3 ? '100%' : '0%',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: step >= 3 ? theme.palette.primary.dark : theme.palette.grey[400],
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'full',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: step >= 3 ? theme.palette.primary.dark : theme.palette.grey[400],
                  color: 'common.white',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                3
              </div>
              <span style={{ marginLeft: 8, fontWeight: 500 }}>{i18n.t('components.report_builder.k78')}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 24,
            overflowY: 'auto',
            maxHeight: 'calc(90vh - 200px)',
          }}
        >
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h4
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--mui-palette-text-primary)',
                    marginBottom: 16,
                  }}
                >
                  {i18n.t('components.report_builder.k2')}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {Object.entries(groupedTypes).map(([module, types]) => (
                    <div key={module}>
                      <h5
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          marginBottom: 12,
                          color: getModuleTextColor(module),
                        }}
                      >
                        {module} 模块
                      </h5>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: 12,
                        }}
                      >
                        {types.map((type) => (
                          <button
                            key={type.type}
                            onClick={() => handleReportTypeChange(type.type)}
                            style={{
                              padding: 16,
                              borderRadius: 8,
                              border: `2px solid ${reportType === type.type ? theme.palette.primary.dark : 'border.default'}`,
                              backgroundColor:
                                reportType === type.type
                                  ? theme.palette.primary.light
                                  : 'transparent',
                              transition: 'all 0.2s',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 12,
                              }}
                            >
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 8,
                                  backgroundColor: getModuleColor(module),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <FileText
                                  style={{
                                    width: 20,
                                    height: 20,
                                    color: 'common.white',
                                  }}
                                />
                              </div>
                              <div>
                                <p
                                  style={{
                                    fontWeight: 500,
                                    color: 'var(--mui-palette-text-primary)',
                                  }}
                                >
                                  {type.name}
                                </p>
                                <p
                                  style={{
                                    fontSize: 14,
                                    color: 'var(--mui-palette-text-secondary)',
                                    marginTop: 4,
                                  }}
                                >
                                  {type.module} 报表
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h4
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--mui-palette-text-primary)',
                    marginBottom: 16,
                  }}
                >
                  {i18n.t('components.report_builder.k3')}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label
                      htmlFor='report-title'
                      style={{
                        display: 'block',
                        fontSize: 14,
                        fontWeight: 500,
                        color: theme.palette.grey[700],
                        marginBottom: 8,
                      }}
                    >
                      {i18n.t('components.report_builder.k4')}
                    </label>
                    <input
                      id='report-title'
                      type='text'
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={i18n.t('components.report_builder.k79')}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid border.default',
                        borderRadius: 8,
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='report-description'
                      style={{
                        display: 'block',
                        fontSize: 14,
                        fontWeight: 500,
                        color: theme.palette.grey[700],
                        marginBottom: 8,
                      }}
                    >
                      {i18n.t('components.report_builder.k5')}
                    </label>
                    <textarea
                      id='report-description'
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={i18n.t('components.report_builder.k80')}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid border.default',
                        borderRadius: 8,
                        fontSize: 14,
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 16,
                    }}
                  >
                    <div>
                      <label
                        htmlFor='report-start-date'
                        style={{
                          display: 'block',
                          fontSize: 14,
                          fontWeight: 500,
                          color: theme.palette.grey[700],
                          marginBottom: 8,
                        }}
                      >
                        {i18n.t('components.report_builder.k6')}
                      </label>
                      <input
                        id='report-start-date'
                        type='date'
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid border.default',
                          borderRadius: 8,
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor='report-end-date'
                        style={{
                          display: 'block',
                          fontSize: 14,
                          fontWeight: 500,
                          color: theme.palette.grey[700],
                          marginBottom: 8,
                        }}
                      >
                        {i18n.t('components.report_builder.k7')}
                      </label>
                      <input
                        id='report-end-date'
                        type='date'
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid border.default',
                          borderRadius: 8,
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <label
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: theme.palette.grey[700],
                        }}
                      >
                        选择列（{selectedColumns.length} 已选择）
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={handleSelectAll}
                          style={{
                            fontSize: 14,
                            color: theme.palette.primary.dark,
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {i18n.t('components.report_builder.k8')}
                        </button>
                        <button
                          onClick={handleDeselectAll}
                          style={{
                            fontSize: 14,
                            color: theme.palette.grey[600],
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {i18n.t('components.report_builder.k9')}
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8,
                        maxHeight: 240,
                        overflowY: 'auto',
                        border: '1px solid border.default',
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      {reportType &&
                        defaultColumns[reportType]?.map((column) => (
                          <label
                            key={column}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: 8,
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type='checkbox'
                              checked={selectedColumns.includes(column)}
                              onChange={() => handleColumnToggle(column)}
                              style={{
                                width: 16,
                                height: 16,
                                color: theme.palette.primary.dark,
                                borderRadius: 4,
                              }}
                            />
                            <span style={{ fontSize: 14, color: 'grey.700' }}>{column}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <h4
                style={{ fontSize: 18, fontWeight: 600, color: 'var(--mui-palette-text-primary)' }}
              >
                {i18n.t('components.report_builder.k10')}
              </h4>

              <div
                style={{
                  backgroundColor: theme.palette.grey[50],
                  borderRadius: 8,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div>
                  <p style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
                    {i18n.t('components.report_builder.k11')}
                  </p>
                  <p style={{ fontWeight: 500, color: 'var(--mui-palette-text-primary)' }}>
                    {reportTypes.find((t) => t.type === reportType)?.name}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
                    {i18n.t('components.report_builder.k12')}
                  </p>
                  <p style={{ fontWeight: 500, color: 'var(--mui-palette-text-primary)' }}>
                    {title}
                  </p>
                </div>
                {description && (
                  <div>
                    <p style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
                      {i18n.t('components.report_builder.k13')}
                    </p>
                    <p style={{ fontWeight: 500, color: 'var(--mui-palette-text-primary)' }}>
                      {description}
                    </p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
                    {i18n.t('components.report_builder.k14')}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {selectedColumns.map((col) => (
                      <span
                        key={col}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'primary.100',
                          color: theme.palette.primary.dark,
                          borderRadius: 4,
                          fontSize: 14,
                        }}
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                {startDate && endDate && (
                  <div>
                    <p style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
                      {i18n.t('components.report_builder.k15')}
                    </p>
                    <p style={{ fontWeight: 500, color: 'var(--mui-palette-text-primary)' }}>
                      {startDate} 至 {endDate}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: 24,
            borderTop: '1px solid border.default',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            style={{
              padding: '8px 16px',
              color: theme.palette.grey[700],
              backgroundColor: theme.palette.grey[100],
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {step === 1 ? i18n.t('components.report_builder.k82') : i18n.t('components.report_builder.k81')}
          </button>
          <button
            onClick={step === 3 ? handleCreate : () => setStep(step + 1)}
            disabled={creating || (step === 2 && selectedColumns.length === 0)}
            style={{
              padding: '8px 24px',
              backgroundColor: theme.palette.primary.dark,
              color: 'common.white',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              opacity: creating || (step === 2 && selectedColumns.length === 0) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {creating ? (
              <>
                <Loader2
                  style={{
                    width: 16,
                    height: 16,
                    marginRight: 8,
                    animation: 'spin 1s linear infinite',
                  }}
                />
                {i18n.t('components.report_builder.k16')}
              </>
            ) : step === 3 ? (
              i18n.t('components.report_builder.k83')
            ) : (
              i18n.t('components.report_builder.k84')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
