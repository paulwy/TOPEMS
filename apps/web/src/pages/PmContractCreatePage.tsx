import React, { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../api/pm";
import { pmApi } from "../api/pm";
import {
  AICodeGenerator,
  AITextOptimizer,
  AIDataCompleter,
  AIFormValidator,
} from "../components/ai";
import type {
  CompleteRequest,
  ValidateRequest,
  CompletionItem,
} from "../types/ai";

const CONTRACT_TYPES = [
  { value: "construction", label: "工程合同" },
  { value: "service", label: "服务合同" },
  { value: "purchase", label: "采购合同" },
  { value: "sales", label: "销售合同" },
];

const CONTRACT_CATEGORIES = [
  { value: "main", label: "主合同" },
  { value: "supplement", label: "补充协议" },
  { value: "service_level", label: "服务协议" },
];

const PmContractCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  const [showTextOptimizer, setShowTextOptimizer] = useState(false);
  const [showDataCompleter, setShowDataCompleter] = useState(false);
  const [showValidator, setShowValidator] = useState(false);

  const [formData, setFormData] = useState({
    project_id: "",
    contract_code: "",
    contract_name: "",
    contract_type: "construction",
    contract_category: "main",
    party_a_name: "",
    party_b_name: "",
    amount: 0,
    currency: "CNY",
    tax_rate: 13,
    signing_date: "",
    effective_date: "",
    end_date: "",
    description: "",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await pmApi.projects.list();
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error("Failed to load projects", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await pmApi.contracts.create(formData);
      if (response.success) {
        navigate("/pm/contracts");
      }
    } catch (error) {
      console.error("Failed to create contract", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSelected = (code: string) => {
    setFormData((prev) => ({ ...prev, contract_code: code }));
  };

  const handleTextOptimized = (text: string) => {
    setFormData((prev) => ({ ...prev, description: text }));
    setShowTextOptimizer(false);
  };

  const handleApplyCompletion = (
    completions: Record<string, CompletionItem>,
  ) => {
    const dataToUpdate: Record<string, any> = {};
    Object.entries(completions).forEach(([key, item]) => {
      dataToUpdate[key] = item.value;
    });
    setFormData((prev) => ({ ...prev, ...dataToUpdate }));
    setShowDataCompleter(false);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/pm/contracts")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">创建合同</h1>
            <p className="text-gray-500">填写合同基本信息</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  基本信息
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    关联项目
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        project_id: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择项目</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      合同编号
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCodeGenerator(true)}
                      className="text-blue-600 text-sm hover:text-blue-800"
                    >
                      AI 生成
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.contract_code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contract_code: e.target.value,
                      }))
                    }
                    placeholder="请输入合同编号"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    合同名称
                  </label>
                  <input
                    type="text"
                    value={formData.contract_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contract_name: e.target.value,
                      }))
                    }
                    placeholder="请输入合同名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    合同类型
                  </label>
                  <select
                    value={formData.contract_type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contract_type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CONTRACT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  合同类别
                </label>
                <select
                  value={formData.contract_category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contract_category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CONTRACT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  合同双方
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    甲方
                  </label>
                  <input
                    type="text"
                    value={formData.party_a_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        party_a_name: e.target.value,
                      }))
                    }
                    placeholder="请输入甲方名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    乙方
                  </label>
                  <input
                    type="text"
                    value={formData.party_b_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        party_b_name: e.target.value,
                      }))
                    }
                    placeholder="请输入乙方名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  金额与时间
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    合同金额
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: Number(e.target.value),
                      }))
                    }
                    placeholder="请输入合同金额"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    税率 (%)
                  </label>
                  <input
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tax_rate: Number(e.target.value),
                      }))
                    }
                    placeholder="请输入税率"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    货币
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        currency: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CNY">人民币</option>
                    <option value="USD">美元</option>
                    <option value="EUR">欧元</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    签约日期
                  </label>
                  <input
                    type="date"
                    value={formData.signing_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        signing_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生效日期
                  </label>
                  <input
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        effective_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    结束日期
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        end_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  合同描述
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTextOptimizer(true)}
                    className="text-blue-600 text-sm hover:text-blue-800"
                  >
                    AI 优化
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDataCompleter(true)}
                    className="text-blue-600 text-sm hover:text-blue-800"
                  >
                    AI 补全
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowValidator(true)}
                    className="text-blue-600 text-sm hover:text-blue-800"
                  >
                    AI 校验
                  </button>
                </div>
              </div>

              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请输入合同描述..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? "创建中..." : "创建合同"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/pm/contracts")}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>

      {showCodeGenerator && (
        <AICodeGenerator
          isOpen={showCodeGenerator}
          onClose={() => setShowCodeGenerator(false)}
          context={{ entityType: "contract", name: formData.contract_name }}
          onSelect={handleCodeSelected}
        />
      )}

      {showTextOptimizer && (
        <AITextOptimizer
          isOpen={showTextOptimizer}
          onClose={() => setShowTextOptimizer(false)}
          context={{ textType: "clause", name: formData.contract_name }}
          originalText={formData.description}
          onOptimized={handleTextOptimized}
        />
      )}

      {showDataCompleter && (
        <AIDataCompleter
          isOpen={showDataCompleter}
          onClose={() => setShowDataCompleter(false)}
          completeRequest={{
            partialData: formData,
            context: {
              module: "pm",
              entityType: "contract",
            },
          }}
          onApplyCompletion={handleApplyCompletion}
        />
      )}

      {showValidator && (
        <AIFormValidator
          isOpen={showValidator}
          onClose={() => setShowValidator(false)}
          validateRequest={{
            data: formData,
            context: {
              module: "pm",
              entityType: "contract",
            },
          }}
        />
      )}
    </div>
  );
};

export default PmContractCreatePage;
