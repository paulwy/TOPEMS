import React, { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Box, Typography } from "@mui/material";
import { FileUpload } from "@/components/common";
import type { Project } from "@/api/pm";
import { pmApi } from "@/api/pm";
import {
  AICodeGenerator,
  AITextOptimizer,
  AIDataCompleter,
  AIFormValidator,
} from "@/components/ai";
import type {
  CompleteRequest,
  ValidateRequest,
  CompletionItem,
} from "@/types/ai";

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
  const [contractAttachments, setContractAttachments] = useState<string[]>([]);

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
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <div
        style={{ maxWidth: "56rem", marginLeft: "auto", marginRight: "auto" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <Button
            onClick={() => navigate("/pm/contracts")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#4b5563",
              "&:hover": { color: "#111827" },
              transition: "color 0.15s",
            }}
          >
            <ArrowLeft sx={{ width: "1.25rem", height: "1.25rem" }} />
          </Button>
          <div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#111827",
              }}
            >
              创建合同
            </h1>
            <p style={{ color: "#6b7280" }}>填写合同基本信息</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.5rem",
              boxShadow:
                "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
              padding: "1.5rem",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  基本信息
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      合同编号
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCodeGenerator(true)}
                      style={{
                        color: "#2563eb",
                        fontSize: "0.875rem",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
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
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "0.25rem",
                  }}
                >
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
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.5rem",
                    outline: "none",
                    boxShadow: "0 0 0 2px #3b82f6",
                  }}
                >
                  {CONTRACT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: "1rem",
                marginTop: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  合同双方
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: "1rem",
                marginTop: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  金额与时间
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
                  >
                    <option value="CNY">人民币</option>
                    <option value="USD">美元</option>
                    <option value="EUR">欧元</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
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
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxShadow: "0 0 0 2px #3b82f6",
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: "1rem",
                marginTop: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  合同描述
                </h2>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowTextOptimizer(true)}
                    style={{
                      color: "#2563eb",
                      fontSize: "0.875rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    AI 优化
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDataCompleter(true)}
                    style={{
                      color: "#2563eb",
                      fontSize: "0.875rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    AI 补全
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowValidator(true)}
                    style={{
                      color: "#2563eb",
                      fontSize: "0.875rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
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
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  outline: "none",
                  boxShadow: "0 0 0 2px #3b82f6",
                }}
              />
            </div>

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: "1rem",
                marginTop: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  合同附件
                </h2>
              </div>

              <Box sx={{ mb: 2 }}>
                <FileUpload
                  value={contractAttachments}
                  onChange={setContractAttachments}
                  accept={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.xls', '.xlsx']}
                  maxCount={10}
                  maxSize={50}
                  maxTotalSize={200}
                  uploadText="上传合同附件"
                />
              </Box>
            </div>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                opacity: loading ? 0.5 : 1,
                transition: "background-color 0.15s",
              }}
            >
              <Save style={{ width: "1rem", height: "1rem" }} />
              {loading ? "创建中..." : "创建合同"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/pm/contracts")}
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid #d1d5db",
                color: "#374151",
                borderRadius: "0.5rem",
                backgroundColor: "transparent",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
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
