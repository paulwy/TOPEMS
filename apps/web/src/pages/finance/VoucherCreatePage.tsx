import {
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Box,
  Stack,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  Chip,
  Alert,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  X,
  Calculator,
  AlertCircle,
  FileText,
  Info,
} from "lucide-react";
import { FormPageTemplate } from "@/components/templates";
import {
  voucherApi,
  accountingSubjectApi,
  type AccountingSubject,
  type VoucherItemRequest,
} from "@/api/erp";
import { useAppStore } from "@/store";
import { apiLogger } from "@/utils/logger";

interface FormSection {
  id: string;
  title: string;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "number" | "date" | "select" | "autocomplete";
    required?: boolean;
    span?: number;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
  }>;
  collapsible?: boolean;
}

const VoucherCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [subjects, setSubjects] = useState<AccountingSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    voucher_number: "",
    voucher_date: "",
    period: "",
    attachment_count: 0,
    summary: "",
  });

  const [voucherItems, setVoucherItems] = useState<VoucherItemRequest[]>([]);

  useEffect(() => {
    loadSubjects();
    initializeForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const result = await accountingSubjectApi.list();
      if (result.success && result.data) {
        setSubjects(result.data.items || []);
      }
    } catch (err) {
      apiLogger.error("加载会计科目失败:", err);
      addNotification({
        title: "错误",
        message: "加载会计科目失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = () => {
    const today = new Date();
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    setFormData((prev) => ({
      ...prev,
      period,
    }));

    // 添加两行空白的凭证明细
    addVoucherItem();
    addVoucherItem();
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addVoucherItem = () => {
    const newItem: VoucherItemRequest = {
      line_number: voucherItems.length + 1,
      subject_code: "",
      subject_name: "",
      summary: "",
      debit_amount: 0,
      credit_amount: 0,
    };
    setVoucherItems((prev) => [...prev, newItem]);
  };

  const updateVoucherItem = (
    index: number,
    field: keyof VoucherItemRequest,
    value: any,
  ) => {
    const items = [...voucherItems];

    if (field === "subject_code") {
      const subject = subjects.find((s) => s.code === value);
      items[index] = {
        ...items[index],
        subject_code: value,
        subject_name: subject?.name || "",
      };
    } else {
      items[index] = { ...items[index], [field]: value };
    }

    setVoucherItems(items);
  };

  const removeVoucherItem = (index: number) => {
    const items = voucherItems.filter((_, i) => i !== index);
    setVoucherItems(items.map((item, i) => ({ ...item, line_number: i + 1 })));
  };

  const validateForm = (): boolean => {
    if (!formData.voucher_number) {
      addNotification({
        title: "验证错误",
        message: "请输入凭证编号",
        type: "warning",
      });
      return false;
    }

    if (!formData.voucher_date) {
      addNotification({
        title: "验证错误",
        message: "请输入凭证日期",
        type: "warning",
      });
      return false;
    }

    if (!formData.period) {
      addNotification({
        title: "验证错误",
        message: "请输入会计期间",
        type: "warning",
      });
      return false;
    }

    if (voucherItems.length < 2) {
      addNotification({
        title: "验证错误",
        message: "请至少添加两条凭证明细",
        type: "warning",
      });
      return false;
    }

    const totalDebit = voucherItems.reduce(
      (sum, item) => sum + (item.debit_amount || 0),
      0,
    );
    const totalCredit = voucherItems.reduce(
      (sum, item) => sum + (item.credit_amount || 0),
      0,
    );

    if (totalDebit !== totalCredit || totalDebit === 0) {
      addNotification({
        title: "验证错误",
        message: "借贷不平衡或金额为零",
        type: "error",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const result = await voucherApi.create({
        ...formData,
        items: voucherItems.filter(
          (item) =>
            item.subject_code &&
            (item.debit_amount > 0 || item.credit_amount > 0),
        ),
      });

      if (result.success) {
        addNotification({
          title: "成功",
          message: "凭证创建成功",
          type: "success",
        });
        navigate("/finance/vouchers");
      } else {
        addNotification({
          title: "失败",
          message: result.message || "创建失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "错误",
        message: err.message || "创建失败",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/finance/vouchers");
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const totalDebit = voucherItems.reduce(
    (sum, item) => sum + (item.debit_amount || 0),
    0,
  );
  const totalCredit = voucherItems.reduce(
    (sum, item) => sum + (item.credit_amount || 0),
    0,
  );
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const basicInfoSection = (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          基本信息
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          <TextField
            label="凭证编号 *"
            value={formData.voucher_number}
            onChange={(e) =>
              handleFieldChange("voucher_number", e.target.value)
            }
            placeholder="例如: 记-2024-001"
            required
            fullWidth
            size="small"
          />
          <TextField
            label="凭证日期 *"
            type="date"
            value={formData.voucher_date}
            onChange={(e) => handleFieldChange("voucher_date", e.target.value)}
            required
            fullWidth
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="会计期间 *"
            value={formData.period}
            onChange={(e) => handleFieldChange("period", e.target.value)}
            placeholder="例如: 2024-01"
            required
            fullWidth
            size="small"
            helperText="格式: YYYY-MM"
          />
          <TextField
            label="附件数量"
            type="number"
            value={formData.attachment_count}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 0) {
                handleFieldChange("attachment_count", val);
              } else if (e.target.value === "") {
                handleFieldChange("attachment_count", 0);
              }
            }}
            fullWidth
            size="small"
          />
          <Box sx={{ gridColumn: "span 2" }}>
            <TextField
              label="凭证摘要"
              value={formData.summary}
              onChange={(e) => handleFieldChange("summary", e.target.value)}
              placeholder="输入凭证摘要"
              fullWidth
              size="small"
              multiline
              rows={1}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const voucherItemsSection = (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              凭证明细
            </Typography>
            {!isBalanced && totalDebit > 0 && (
              <Chip
                size="small"
                icon={<AlertCircle size={14} />}
                label="借贷不平衡"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={addVoucherItem}
          >
            添加分录
          </Button>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell sx={{ fontWeight: 600, width: 80 }}>行号</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>会计科目</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>摘要</TableCell>
                <TableCell
                  sx={{ fontWeight: 600, width: 180, textAlign: "right" }}
                >
                  借方金额
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 600, width: 180, textAlign: "right" }}
                >
                  贷方金额
                </TableCell>
                <TableCell sx={{ fontWeight: 600, width: 80 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voucherItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography
                      sx={{ fontWeight: 600, color: "text.secondary" }}
                    >
                      {item.line_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={subjects}
                      getOptionLabel={(option) =>
                        `${option.code} - ${option.name}`
                      }
                      value={
                        subjects.find((s) => s.code === item.subject_code) ||
                        null
                      }
                      onChange={(_, newValue) => {
                        updateVoucherItem(
                          index,
                          "subject_code",
                          newValue?.code || "",
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="选择或搜索科目"
                          size="small"
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="分录摘要"
                      value={item.summary}
                      onChange={(e) =>
                        updateVoucherItem(index, "summary", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="0.00"
                      value={item.debit_amount || ""}
                      onChange={(e) =>
                        updateVoucherItem(
                          index,
                          "debit_amount",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      sx={{
                        "& input": {
                          textAlign: "right",
                          color: "error.main",
                          fontWeight: 500,
                        },
                      }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Typography
                              sx={{
                                color: "error.main",
                                mr: 0.5,
                                fontSize: "0.875rem",
                              }}
                            >
                              ¥
                            </Typography>
                          ),
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="0.00"
                      value={item.credit_amount || ""}
                      onChange={(e) =>
                        updateVoucherItem(
                          index,
                          "credit_amount",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      sx={{
                        "& input": {
                          textAlign: "right",
                          color: "success.main",
                          fontWeight: 500,
                        },
                      }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Typography
                              sx={{
                                color: "success.main",
                                mr: 0.5,
                                fontSize: "0.875rem",
                              }}
                            >
                              ¥
                            </Typography>
                          ),
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeVoucherItem(index)}
                      disabled={voucherItems.length <= 1}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 4,
            mt: 3,
            pt: 2,
            borderTop: 2,
            borderColor: "divider",
          }}
        >
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary">
              借方合计
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: isBalanced ? "error.main" : "error.main",
              }}
            >
              {formatCurrency(totalDebit)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary">
              贷方合计
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: isBalanced ? "success.main" : "error.main",
              }}
            >
              {formatCurrency(totalCredit)}
            </Typography>
          </Box>
        </Box>

        {!isBalanced && totalDebit > 0 && (
          <Alert
            severity="warning"
            icon={<Calculator size={20} />}
            sx={{ mt: 2 }}
          >
            <Typography variant="body2">
              <strong>借贷不平衡:</strong> 借方合计 {formatCurrency(totalDebit)}{" "}
              ≠ 贷方合计 {formatCurrency(totalCredit)},差额{" "}
              {formatCurrency(Math.abs(totalDebit - totalCredit))}
            </Typography>
          </Alert>
        )}

        {isBalanced && (
          <Alert
            severity="success"
            icon={<Calculator size={20} />}
            sx={{ mt: 2 }}
          >
            <Typography variant="body2">
              <strong>借贷平衡</strong> - 借方合计 = 贷方合计 ={" "}
              {formatCurrency(totalDebit)}
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const sections = [
    {
      id: "basic",
      title: "基本信息",
      content: basicInfoSection,
      collapsible: false,
      fields: [],
    },
    {
      id: "items",
      title: "凭证明细",
      content: voucherItemsSection,
      collapsible: false,
      fields: [],
    },
  ];

  return (
    <FormPageTemplate
      title="新建凭证"
      breadcrumbs={[
        { label: "首页", href: "/dashboard" },
        { label: "财务", href: "/finance" },
        { label: "凭证管理", href: "/finance/vouchers" },
        { label: "新建凭证" },
      ]}
      sections={sections}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="保存凭证"
      submitting={submitting}
    />
  );
};

export default VoucherCreatePage;
