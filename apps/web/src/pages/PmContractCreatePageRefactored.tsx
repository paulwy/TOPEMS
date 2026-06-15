/**
 * PmContractCreatePage 重构
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 MUI 组件重构表单布局
 * 3. 保持 AI 组件集成
 * 4. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme,
} from "@mui/material";
import { ArrowLeft, Save } from "lucide-react";
import type { Project } from "../api/pm";
import { pmApi } from "../api/pm";
import {
  AICodeGenerator,
  AITextOptimizer,
  AIDataCompleter,
  AIFormValidator,
} from "../components/ai";
import type { CompletionItem } from "../types/ai";
import { PageHeader } from "../components/layout";

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

const CURRENCY_OPTIONS = [
  { value: "CNY", label: "人民币" },
  { value: "USD", label: "美元" },
  { value: "EUR", label: "欧元" },
];

const PmContractCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
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
        setProjects(response.data.projects || []);
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

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCodeSelected = (code: string) => {
    setFormData((prev) => ({ ...prev, contract_code: code }));
  };

  const handleTextOptimized = (text: string) => {
    setFormData((prev) => ({ ...prev, description: text }));
    setShowTextOptimizer(false);
  };

  const handleApplyCompletion = (completions: Record<string, CompletionItem>) => {
    const dataToUpdate: Record<string, any> = {};
    Object.entries(completions).forEach(([key, item]) => {
      dataToUpdate[key] = item.value;
    });
    setFormData((prev) => ({ ...prev, ...dataToUpdate }));
    setShowDataCompleter(false);
  };

  return (
    <>
      <PageHeader
        title="创建合同"
        subtitle="填写合同基本信息"
        showBack
        onBack={() => navigate("/pm/contracts")}
      />

      <Box sx={{ p: 3, maxWidth: 960, mx: "auto" }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              {/* 基本信息 */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                基本信息
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>关联项目</InputLabel>
                  <Select
                    value={formData.project_id}
                    label="关联项目"
                    onChange={(e) => handleChange("project_id", e.target.value)}
                  >
                    <MenuItem value="">请选择项目</MenuItem>
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      合同编号
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setShowCodeGenerator(true)}
                      sx={{ color: "#3b82f6" }}
                    >
                      AI 生成
                    </Button>
                  </Box>
                  <TextField
                    fullWidth
                    value={formData.contract_code}
                    onChange={(e) => handleChange("contract_code", e.target.value)}
                    placeholder="请输入合同编号"
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    合同名称
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.contract_name}
                    onChange={(e) => handleChange("contract_name", e.target.value)}
                    placeholder="请输入合同名称"
                  />
                </Box>

                <FormControl fullWidth>
                  <InputLabel>合同类型</InputLabel>
                  <Select
                    value={formData.contract_type}
                    label="合同类型"
                    onChange={(e) => handleChange("contract_type", e.target.value)}
                  >
                    {CONTRACT_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>合同类别</InputLabel>
                  <Select
                    value={formData.contract_category}
                    label="合同类别"
                    onChange={(e) => handleChange("contract_category", e.target.value)}
                  >
                    {CONTRACT_CATEGORIES.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* 合同双方 */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 4 }}>
                合同双方
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 3 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    甲方
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.party_a_name}
                    onChange={(e) => handleChange("party_a_name", e.target.value)}
                    placeholder="请输入甲方名称"
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    乙方
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.party_b_name}
                    onChange={(e) => handleChange("party_b_name", e.target.value)}
                    placeholder="请输入乙方名称"
                  />
                </Box>
              </Box>

              {/* 金额与时间 */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 4 }}>
                金额与时间
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 3, mb: 3 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    合同金额
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleChange("amount", Number(e.target.value))}
                    placeholder="请输入合同金额"
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    税率 (%)
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => handleChange("tax_rate", Number(e.target.value))}
                    placeholder="请输入税率"
                  />
                </Box>

                <FormControl fullWidth>
                  <InputLabel>货币</InputLabel>
                  <Select
                    value={formData.currency}
                    label="货币"
                    onChange={(e) => handleChange("currency", e.target.value)}
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <MenuItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 3, mb: 3 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    签约日期
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={formData.signing_date}
                    onChange={(e) => handleChange("signing_date", e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    生效日期
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => handleChange("effective_date", e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    结束日期
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                  />
                </Box>
              </Box>

              {/* 合同描述 */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 4 }}>
                合同描述
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, mb: 1 }}>
                  <Button size="small" onClick={() => setShowTextOptimizer(true)} sx={{ color: "#3b82f6" }}>
                    AI 优化
                  </Button>
                  <Button size="small" onClick={() => setShowDataCompleter(true)} sx={{ color: "#3b82f6" }}>
                    AI 补全
                  </Button>
                  <Button size="small" onClick={() => setShowValidator(true)} sx={{ color: "#3b82f6" }}>
                    AI 校验
                  </Button>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="请输入合同描述..."
                />
              </Box>

              {/* 操作按钮 */}
              <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={<Save style={{ width: 16, height: 16 }} />}
                >
                  {loading ? "创建中..." : "创建合同"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/pm/contracts")}
                >
                  取消
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Box>

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
    </>
  );
};

export default PmContractCreatePage;
