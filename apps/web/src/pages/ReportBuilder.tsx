import React, { useState } from "react";
import {
  FileText,
  Calendar,
  Columns,
  FileSpreadsheet,
  File,
  FileJson,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type {
  ReportTypeInfo,
  ReportType,
  ExportFormat,
  CreateReportRequest,
} from "../api/report";

interface ReportBuilderProps {
  onClose: () => void;
  reportTypes: ReportTypeInfo[];
  onSuccess: () => void;
}

const REPORT_COLUMNS: Record<ReportType, string[]> = {
  rs_project_progress: [
    "项目名称",
    "负责人",
    "开始时间",
    "结束时间",
    "进度",
    "状态",
  ],
  rs_experiment_record: [
    "实验编号",
    "实验名称",
    "实验类型",
    "负责人",
    "开始时间",
    "结果",
    "状态",
  ],
  lims_inspection_stats: [
    "样本编号",
    "样本名称",
    "检测项目",
    "检测结果",
    "检测时间",
    "检测人",
  ],
  lims_sample_summary: [
    "样本编号",
    "样本类型",
    "接收时间",
    "检测数量",
    "合格数量",
    "合格率",
  ],
  qms_quality_analysis: [
    "问题编号",
    "问题类型",
    "严重程度",
    "发生时间",
    "责任人",
    "状态",
  ],
  qms_defect_stats: [
    "产品名称",
    "缺陷类型",
    "缺陷数量",
    "合格率",
    "检测批次",
    "负责人",
  ],
  ehs_safety_check: [
    "检查项",
    "检查日期",
    "检查人",
    "检查结果",
    "整改要求",
    "完成状态",
  ],
  ehs_risk_assessment: [
    "风险点",
    "风险等级",
    "风险类型",
    "管控措施",
    "责任人",
    "评估日期",
  ],
  srm_supplier_eval: [
    "供应商名称",
    "评估项目",
    "评估分数",
    "评估日期",
    "评估人",
    "等级",
  ],
  srm_purchase_stats: [
    "订单编号",
    "供应商",
    "采购物品",
    "采购数量",
    "订单金额",
    "订单状态",
  ],
  pdm_production_stats: [
    "产品名称",
    "批次号",
    "生产数量",
    "合格数量",
    "生产日期",
    "生产人",
  ],
  pdm_process_summary: [
    "工序名称",
    "工序编号",
    "标准时间",
    "实际时间",
    "效率",
    "负责人",
  ],
};

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  onClose,
  reportTypes,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reportType: "" as ReportType | "",
    format: "excel" as ExportFormat,
    startDate: "",
    endDate: "",
    selectedColumns: [] as string[],
  });
  const [_filters, _setFilters] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleReportTypeChange = (type: ReportType) => {
    const defaultColumns = REPORT_COLUMNS[type] || [];
    setFormData((prev) => ({
      ...prev,
      reportType: type,
      selectedColumns: defaultColumns,
    }));
    setErrors((prev) => ({ ...prev, reportType: "" }));
  };

  const handleColumnToggle = (column: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedColumns: prev.selectedColumns.includes(column)
        ? prev.selectedColumns.filter((c) => c !== column)
        : [...prev.selectedColumns, column],
    }));
  };

  const handleSelectAllColumns = () => {
    if (formData.reportType) {
      const allColumns =
        REPORT_COLUMNS[formData.reportType as ReportType] || [];
      setFormData((prev) => ({ ...prev, selectedColumns: allColumns }));
    }
  };

  const handleDeselectAllColumns = () => {
    setFormData((prev) => ({ ...prev, selectedColumns: [] }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "请输入报表标题";
    }

    if (!formData.reportType) {
      newErrors.reportType = "请选择报表类型";
    }

    if (formData.selectedColumns.length === 0) {
      newErrors.selectedColumns = "请至少选择一列";
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate > formData.endDate
    ) {
      newErrors.dateRange = "开始日期不能晚于结束日期";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const request: CreateReportRequest = {
        config: {
          report_type: formData.reportType as ReportType,
          format: formData.format,
          title: formData.title,
          description: formData.description,
          columns: formData.selectedColumns,
          date_range:
            formData.startDate && formData.endDate
              ? { start_date: formData.startDate, end_date: formData.endDate }
              : undefined,
          filters: Object.keys(_filters).length > 0 ? _filters : undefined,
        },
      };

      console.log("生成报表:", request);
      onSuccess();
    } catch (err) {
      console.error("生成报表失败:", err);
      setErrors({ submit: "生成报表失败，请重试" });
    } finally {
      setSubmitting(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "excel":
        return <FileSpreadsheet className="w-5 h-5" />;
      case "pdf":
        return <File className="w-5 h-5" />;
      case "csv":
        return <FileJson className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const availableColumns = formData.reportType
    ? REPORT_COLUMNS[formData.reportType as ReportType] || []
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6" />
              <h2 className="text-2xl font-bold">报表构建器</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-2">
            创建自定义报表，灵活配置字段和时间范围
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              基本信息
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报表标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, title: e.target.value }));
                  setErrors((prev) => ({ ...prev, title: "" }));
                }}
                placeholder="例如：2024年Q1项目进度报表"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                报表描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="可选的报表描述信息"
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Report Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Columns className="w-5 h-5 mr-2 text-purple-600" />
              报表类型 <span className="text-red-500">*</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {reportTypes.map((type) => (
                <button
                  key={type.type}
                  onClick={() => handleReportTypeChange(type.type)}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    formData.reportType === type.type
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="font-medium text-gray-900">{type.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {type.module}
                  </div>
                </button>
              ))}
            </div>
            {errors.reportType && (
              <p className="text-red-500 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.reportType}
              </p>
            )}
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-green-600" />
              时间范围
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开始日期
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  结束日期
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            {errors.dateRange && (
              <p className="text-red-500 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.dateRange}
              </p>
            )}
          </div>

          {/* Column Selection */}
          {availableColumns.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Columns className="w-5 h-5 mr-2 text-orange-600" />
                  选择列 <span className="text-red-500">*</span>
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSelectAllColumns}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    全选
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={handleDeselectAllColumns}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    取消全选
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableColumns.map((column) => (
                  <label
                    key={column}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedColumns.includes(column)}
                      onChange={() => handleColumnToggle(column)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{column}</span>
                  </label>
                ))}
              </div>
              {errors.selectedColumns && (
                <p className="text-red-500 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.selectedColumns}
                </p>
              )}
              <p className="text-sm text-gray-500">
                已选择 {formData.selectedColumns.length} 列
              </p>
            </div>
          )}

          {/* Export Format */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              导出格式
            </h3>

            <div className="grid grid-cols-3 gap-4">
              {(["excel", "pdf", "csv"] as ExportFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => setFormData((prev) => ({ ...prev, format }))}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.format === format
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`mb-2 ${formData.format === format ? "text-blue-600" : "text-gray-500"}`}
                    >
                      {getFormatIcon(format)}
                    </div>
                    <div className="font-medium text-gray-900 capitalize">
                      {format}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {format === "excel" && ".xlsx 文件"}
                      {format === "pdf" && ".pdf 文件"}
                      {format === "csv" && ".csv 文件"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {formData.selectedColumns.length > 0 && (
                <span className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  已配置 {formData.selectedColumns.length} 列
                  {formData.reportType && (
                    <span className="ml-2 text-gray-400">
                      (
                      {
                        REPORT_COLUMNS[formData.reportType as ReportType]
                          ?.length
                      }{" "}
                      可选)
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    生成报表
                  </>
                )}
              </button>
            </div>
          </div>
          {errors.submit && (
            <div className="mt-3 text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.submit}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
