import React, { useState } from 'react';
import { X, FileText, Loader2, CheckCircle } from 'lucide-react';
import type { ReportType, ReportTypeInfo, CreateReportRequest } from '@/api/report';
import { reportApi } from '@/api/report';
import { logger } from '@/utils/logger';

interface ReportBuilderProps {
  onClose: () => void;
  reportTypes: ReportTypeInfo[];
  onSuccess: () => void;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ onClose, reportTypes, onSuccess }) => {
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);

  const defaultColumns: Record<string, string[]> = {
    rs_project_progress: ['项目编号', '项目名称', '负责人', '开始日期', '完成进度', '状态'],
    rs_experiment_record: ['试验编号', '试验标题', '试验类型', '试验日期', '试验员', '结果'],
    lims_inspection_stats: ['检验编号', '检验项目', '样品数量', '合格数量', '合格率', '检验日期'],
    lims_sample_summary: ['样品编号', '样品名称', '批次号', '接收日期', '检验状态', '备注'],
    qms_quality_analysis: ['分析编号', '产品名称', '批次号', '合格率', '不良率', '分析日期'],
    qms_defect_stats: ['不良编号', '不良类型', '数量', '占比', '原因分析', '处理措施'],
    ehs_safety_check: ['检查编号', '检查项目', '检查区域', '检查日期', '检查人', '检查结果'],
    ehs_risk_assessment: ['评估编号', '风险点', '风险等级', '可能性', '严重性', '控制措施'],
    srm_supplier_eval: ['供应商编号', '供应商名称', '评估项目', '综合评分', '合作等级', '评估日期'],
    srm_purchase_stats: ['采购单号', '供应商', '物料名称', '采购数量', '采购金额', '采购日期'],
    pdm_production_stats: ['生产单号', '产品名称', '计划数量', '完成数量', '完成率', '生产日期'],
    pdm_process_summary: ['工序编号', '工序名称', '负责人', '加工数量', '合格数量', '合格率'],
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
      alert('请选择报表类型和至少一列');
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
        alert(response.message || '创建报表失败');
      }
    } catch (err: unknown) {
      logger.error('创建报表失败:', err);
      alert('创建报表失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      RS: '#f97316',
      LIMS: 'primary.main',
      QMS: 'success.dark',
      EHS: 'error.main',
      SRM: '#a855f7',
      PDM: 'primary.light',
    };
    return colors[module] || 'text.secondary';
  };

  const getModuleTextColor = (module: string) => {
    const colors: Record<string, string> = {
      RS: '#c2410c',
      LIMS: 'primary.dark',
      QMS: '#15803d',
      EHS: 'error.darker',
      SRM: '#7e22ce',
      PDM: '#4338ca',
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'grey.900' }}>报表生成器</h3>
            <p style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>创建自定义报表</p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 8,
              color: 'grey.600',
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
            backgroundColor: 'grey.50',
            borderBottom: '1px solid border.default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: step >= 1 ? 'primary.dark' : '#94a3b8',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: step >= 1 ? 'primary.dark' : 'grey.400',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {step > 1 ? <CheckCircle style={{ width: 20, height: 20 }} /> : '1'}
              </div>
              <span style={{ marginLeft: 8, fontWeight: 500 }}>选择类型</span>
            </div>
            <div style={{ flex: 1, height: 2, backgroundColor: 'grey.400' }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: 'primary.dark',
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
                color: step >= 2 ? 'primary.dark' : '#94a3b8',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: step >= 2 ? 'primary.dark' : 'grey.400',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {step > 2 ? <CheckCircle style={{ width: 20, height: 20 }} /> : '2'}
              </div>
              <span style={{ marginLeft: 8, fontWeight: 500 }}>配置选项</span>
            </div>
            <div style={{ flex: 1, height: 2, backgroundColor: 'grey.400' }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: 'primary.dark',
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
                color: step >= 3 ? 'primary.dark' : '#94a3b8',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: step >= 3 ? 'primary.dark' : 'grey.400',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                3
              </div>
              <span style={{ marginLeft: 8, fontWeight: 500 }}>生成报表</span>
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
                    color: 'grey.900',
                    marginBottom: 16,
                  }}
                >
                  选择报表类型
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
                              border: `2px solid ${reportType === type.type ? 'primary.dark' : 'border.default'}`,
                              backgroundColor:
                                reportType === type.type ? 'primary.light' : 'transparent',
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
                                    color: 'white',
                                  }}
                                />
                              </div>
                              <div>
                                <p style={{ fontWeight: 500, color: 'grey.900' }}>{type.name}</p>
                                <p
                                  style={{
                                    fontSize: 14,
                                    color: 'grey.600',
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
                    color: 'grey.900',
                    marginBottom: 16,
                  }}
                >
                  配置报表选项
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#334155',
                        marginBottom: 8,
                      }}
                    >
                      报表标题
                    </label>
                    <input
                      type='text'
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder='输入报表标题'
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
                      style={{
                        display: 'block',
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#334155',
                        marginBottom: 8,
                      }}
                    >
                      报表描述（可选）
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder='输入报表描述'
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
                        style={{
                          display: 'block',
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#334155',
                          marginBottom: 8,
                        }}
                      >
                        开始日期
                      </label>
                      <input
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
                        style={{
                          display: 'block',
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#334155',
                          marginBottom: 8,
                        }}
                      >
                        结束日期
                      </label>
                      <input
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
                          color: '#334155',
                        }}
                      >
                        选择列（{selectedColumns.length} 已选择）
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={handleSelectAll}
                          style={{
                            fontSize: 14,
                            color: 'primary.dark',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          全选
                        </button>
                        <button
                          onClick={handleDeselectAll}
                          style={{
                            fontSize: 14,
                            color: '#475569',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          取消全选
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
                                color: 'primary.dark',
                                borderRadius: 4,
                              }}
                            />
                            <span style={{ fontSize: 14, color: '#334155' }}>{column}</span>
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
              <h4 style={{ fontSize: 18, fontWeight: 600, color: 'grey.900' }}>确认报表配置</h4>

              <div
                style={{
                  backgroundColor: 'grey.50',
                  borderRadius: 8,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div>
                  <p style={{ fontSize: 14, color: 'grey.600' }}>报表类型</p>
                  <p style={{ fontWeight: 500, color: 'grey.900' }}>
                    {reportTypes.find((t) => t.type === reportType)?.name}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: 'grey.600' }}>报表标题</p>
                  <p style={{ fontWeight: 500, color: 'grey.900' }}>{title}</p>
                </div>
                {description && (
                  <div>
                    <p style={{ fontSize: 14, color: 'grey.600' }}>报表描述</p>
                    <p style={{ fontWeight: 500, color: 'grey.900' }}>{description}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 14, color: 'grey.600' }}>选择的列</p>
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
                          backgroundColor: '#dbeafe',
                          color: 'primary.dark',
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
                    <p style={{ fontSize: 14, color: 'grey.600' }}>日期范围</p>
                    <p style={{ fontWeight: 500, color: 'grey.900' }}>
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
              color: '#334155',
              backgroundColor: 'grey.100',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {step === 1 ? '取消' : '上一步'}
          </button>
          <button
            onClick={step === 3 ? handleCreate : () => setStep(step + 1)}
            disabled={creating || (step === 2 && selectedColumns.length === 0)}
            style={{
              padding: '8px 24px',
              backgroundColor: 'primary.dark',
              color: 'white',
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
                生成中...
              </>
            ) : step === 3 ? (
              '生成报表'
            ) : (
              '下一步'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
