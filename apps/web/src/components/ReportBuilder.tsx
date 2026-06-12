import React, { useState } from "react";
import {
  X,
  FileText,
  Columns,
  Calendar,
  Filter,
  Loader2,
  CheckCircle,
} from "lucide-react";
import type {
  ReportType,
  ReportTypeInfo,
  CreateReportRequest,
} from "../api/report";
import { reportApi } from "../api/report";

interface ReportBuilderProps {
  onClose: () => void;
  reportTypes: ReportTypeInfo[];
  onSuccess: () => void;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  onClose,
  reportTypes,
  onSuccess,
}) => {
  const [reportType, setReportType] = useState<ReportType | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);

  const defaultColumns: Record<string, string[]> = {
    rs_project_progress: [
      "项目编号",
      "项目名称",
      "负责人",
      "开始日期",
      "完成进度",
      "状态",
    ],
    rs_experiment_record: [
      "试验编号",
      "试验标题",
      "试验类型",
      "试验日期",
      "试验员",
      "结果",
    ],
    lims_inspection_stats: [
      "检验编号",
      "检验项目",
      "样品数量",
      "合格数量",
      "合格率",
      "检验日期",
    ],
    lims_sample_summary: [
      "样品编号",
      "样品名称",
      "批次号",
      "接收日期",
      "检验状态",
      "备注",
    ],
    qms_quality_analysis: [
      "分析编号",
      "产品名称",
      "批次号",
      "合格率",
      "不良率",
      "分析日期",
    ],
    qms_defect_stats: [
      "不良编号",
      "不良类型",
      "数量",
      "占比",
      "原因分析",
      "处理措施",
    ],
    ehs_safety_check: [
      "检查编号",
      "检查项目",
      "检查区域",
      "检查日期",
      "检查人",
      "检查结果",
    ],
    ehs_risk_assessment: [
      "评估编号",
      "风险点",
      "风险等级",
      "可能性",
      "严重性",
      "控制措施",
    ],
    srm_supplier_eval: [
      "供应商编号",
      "供应商名称",
      "评估项目",
      "综合评分",
      "合作等级",
      "评估日期",
    ],
    srm_purchase_stats: [
      "采购单号",
      "供应商",
      "物料名称",
      "采购数量",
      "采购金额",
      "采购日期",
    ],
    pdm_production_stats: [
      "生产单号",
      "产品名称",
      "计划数量",
      "完成数量",
      "完成率",
      "生产日期",
    ],
    pdm_process_summary: [
      "工序编号",
      "工序名称",
      "负责人",
      "加工数量",
      "合格数量",
      "合格率",
    ],
  };

  const handleReportTypeChange = (type: ReportType) => {
    setReportType(type);
    setSelectedColumns(defaultColumns[type] || []);
    const reportTypeInfo = reportTypes.find((t) => t.type === type);
    if (reportTypeInfo) {
      setTitle(
        `${reportTypeInfo.name}_${new Date().toLocaleDateString("zh-CN")}`,
      );
    }
    setStep(2);
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
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
      alert("请选择报表类型和至少一列");
      return;
    }

    try {
      setCreating(true);

      const request: CreateReportRequest = {
        config: {
          report_type: reportType,
          format: "excel",
          title:
            title || `${reportTypes.find((t) => t.type === reportType)?.name}`,
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
        alert(response.message || "创建报表失败");
      }
    } catch (err) {
      console.error("创建报表失败:", err);
      alert("创建报表失败，请重试");
    } finally {
      setCreating(false);
    }
  };

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      RS: "bg-orange-500",
      LIMS: "bg-blue-500",
      QMS: "bg-green-500",
      EHS: "bg-red-500",
      SRM: "bg-purple-500",
      PDM: "bg-indigo-500",
    };
    return colors[module] || "bg-gray-500";
  };

  const groupedTypes = reportTypes.reduce(
    (acc, type) => {
      const module = type.module;
      if (!acc[module]) acc[module] = [];
      acc[module].push(type);
      return acc;
    },
    {} as Record<string, ReportTypeInfo[]>,
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">报表生成器</h3>
            <p className="text-sm text-slate-600 mt-1">创建自定义报表</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center ${step >= 1 ? "text-blue-600" : "text-slate-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? "bg-blue-600 text-white" : "bg-slate-300"
                }`}
              >
                {step > 1 ? <CheckCircle className="w-5 h-5" /> : "1"}
              </div>
              <span className="ml-2 font-medium">选择类型</span>
            </div>
            <div className="flex-1 h-0.5 bg-slate-300">
              <div
                className={`h-full bg-blue-600 transition-all ${step >= 2 ? "w-full" : "w-0"}`}
              />
            </div>
            <div
              className={`flex items-center ${step >= 2 ? "text-blue-600" : "text-slate-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? "bg-blue-600 text-white" : "bg-slate-300"
                }`}
              >
                {step > 2 ? <CheckCircle className="w-5 h-5" /> : "2"}
              </div>
              <span className="ml-2 font-medium">配置选项</span>
            </div>
            <div className="flex-1 h-0.5 bg-slate-300">
              <div
                className={`h-full bg-blue-600 transition-all ${step >= 3 ? "w-full" : "w-0"}`}
              />
            </div>
            <div
              className={`flex items-center ${step >= 3 ? "text-blue-600" : "text-slate-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3 ? "bg-blue-600 text-white" : "bg-slate-300"
                }`}
              >
                3
              </div>
              <span className="ml-2 font-medium">生成报表</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">
                  选择报表类型
                </h4>
                <div className="space-y-4">
                  {Object.entries(groupedTypes).map(([module, types]) => (
                    <div key={module}>
                      <h5
                        className={`text-sm font-semibold mb-3 ${getModuleColor(module).replace("bg-", "text-").replace("-500", "-700")}`}
                      >
                        {module} 模块
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        {types.map((type) => (
                          <button
                            key={type.type}
                            onClick={() => handleReportTypeChange(type.type)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              reportType === type.type
                                ? "border-blue-600 bg-blue-50"
                                : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div
                                className={`w-10 h-10 rounded-lg ${getModuleColor(module)} flex items-center justify-center`}
                              >
                                <FileText className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {type.name}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">
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
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">
                  配置报表选项
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      报表标题
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="输入报表标题"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      报表描述（可选）
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="输入报表描述"
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        开始日期
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        结束日期
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-slate-700">
                        选择列（{selectedColumns.length} 已选择）
                      </label>
                      <div className="space-x-2">
                        <button
                          onClick={handleSelectAll}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          全选
                        </button>
                        <button
                          onClick={handleDeselectAll}
                          className="text-sm text-slate-600 hover:text-slate-700"
                        >
                          取消全选
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3">
                      {reportType &&
                        defaultColumns[reportType]?.map((column) => (
                          <label
                            key={column}
                            className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedColumns.includes(column)}
                              onChange={() => handleColumnToggle(column)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-slate-700">
                              {column}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-slate-900">
                确认报表配置
              </h4>

              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-600">报表类型</p>
                  <p className="font-medium text-slate-900">
                    {reportTypes.find((t) => t.type === reportType)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">报表标题</p>
                  <p className="font-medium text-slate-900">{title}</p>
                </div>
                {description && (
                  <div>
                    <p className="text-sm text-slate-600">报表描述</p>
                    <p className="font-medium text-slate-900">{description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-600">选择的列</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedColumns.map((col) => (
                      <span
                        key={col}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                {startDate && endDate && (
                  <div>
                    <p className="text-sm text-slate-600">日期范围</p>
                    <p className="font-medium text-slate-900">
                      {startDate} 至 {endDate}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-between">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            {step === 1 ? "取消" : "上一步"}
          </button>
          <button
            onClick={step === 3 ? handleCreate : () => setStep(step + 1)}
            disabled={creating || (step === 2 && selectedColumns.length === 0)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                生成中...
              </>
            ) : step === 3 ? (
              "生成报表"
            ) : (
              "下一步"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
