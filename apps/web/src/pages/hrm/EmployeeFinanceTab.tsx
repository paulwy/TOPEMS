/**
 * 员工财务信息Tab组件
 * 显示员工的银行账户、薪资、社保公积金等财务信息
 */

import React, { useState, useMemo } from "react";
import { logger } from "@/utils/logger";
import {
  useEmployeeFinanceInfo,
  useUpdateEmployeeFinanceInfo,
} from "@/hooks/useHrmFinance";
import { TextField, FormLabel, Chip, Card, CardContent, CardHeader, FormControl, InputLabel, Select, MenuItem, Box, Typography,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { Banknote, DollarSign, Shield, Save, Edit2, X } from "lucide-react";

interface EmployeeFinanceTabProps {
  employeeId: string;
  employeeName: string;
}

export const EmployeeFinanceTab: React.FC<EmployeeFinanceTabProps> = ({
  employeeId,
  employeeName,
}) => {
  const { data, isLoading, error } = useEmployeeFinanceInfo(employeeId);
  const updateFinanceInfo = useUpdateEmployeeFinanceInfo();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const financeInfo = data;

  const handleEdit = () => {
    if (financeInfo) {
      setEditData({ ...financeInfo });
    } else {
      setEditData({
        employee_id: employeeId,
        bank_card_number: "",
        bank_name: "",
        bank_branch: "",
        base_salary: 0,
        position_salary: 0,
        skill_salary: 0,
        social_security_base: 0,
        social_security_ratio: 0,
        housing_fund_base: 0,
        housing_fund_ratio: 0,
        cost_center_id: "",
        expense_account_id: "",
        status: "active",
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleSave = async () => {
    try {
      await updateFinanceInfo.mutateAsync({
        employeeId,
        data: editData,
      });
      setIsEditing(false);
    } catch (err) {
      logger.error("Failed to save:", err);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid #e5e7eb",
            borderTopColor: "#2563eb",
            animation: "spin 1s linear infinite",
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" },
            },
          }}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent sx={{ py: 4 }}>
          <Box sx={{ textAlign: "center", color: "text.secondary" }}>
            <Typography>加载失败: {error.message}</Typography>
            <Button variant="outlined" onClick={handleEdit} sx={{ mt: 2 }}>
              初始化财务信息
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const hasFinanceInfo = !!financeInfo;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* 操作栏 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6">财务信息</Typography>
          {hasFinanceInfo && (
            <Chip
              label={financeInfo.status === "active" ? "正常" : "未激活"}
              color={financeInfo.status === "active" ? "primary" : "default"}
              size="small"
            />
          )}
        </Box>
        {isEditing ? (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" onClick={handleCancel}>
              <X style={{ width: 16, height: 16, marginRight: 4 }} />
              取消
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleSave}
              disabled={updateFinanceInfo.isPending}
              startIcon={
                <Save style={{ width: 16, height: 16, marginRight: 4 }} />
              }
            >
              保存
            </Button>
          </Box>
        ) : (
          <Button variant="outlined" size="small" onClick={handleEdit}>
            <Edit2 style={{ width: 16, height: 16, marginRight: 4 }} />
            {hasFinanceInfo ? "编辑" : "初始化"}
          </Button>
        )}
      </Box>

      {/* 银行账户信息 */}
      <Card>
        <CardHeader
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1,
          }}
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Banknote style={{ width: 20, height: 20, color: "#2563eb" }} />
              <Typography variant="subtitle1">银行账户信息</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
            }}
          >
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                开户银行
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.bank_name || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, bank_name: e.target.value })
                  }
                  size="small"
                  fullWidth
                  placeholder="如：中国工商银行"
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                  {financeInfo?.bank_name || "-"}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                银行卡号
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.bank_card_number || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      bank_card_number: e.target.value,
                    })
                  }
                  size="small"
                  fullWidth
                  placeholder="请输入银行卡号"
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: "monospace" }}>
                  {financeInfo?.bank_card_number || "-"}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                支行名称
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.bank_branch || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, bank_branch: e.target.value })
                  }
                  size="small"
                  fullWidth
                  placeholder="如：北京分行中关村支行"
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                  {financeInfo?.bank_branch || "-"}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 薪资信息 */}
      <Card>
        <CardHeader
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1,
          }}
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DollarSign style={{ width: 20, height: 20, color: "#16a34a" }} />
              <Typography variant="subtitle1">薪资设置</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
            }}
          >
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                基本工资
              </FormLabel>
              {isEditing ? (
                <TextField
                  type="number"
                  value={editData.base_salary || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      base_salary: parseFloat(e.target.value) || 0,
                    })
                  }
                  size="small"
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography
                  sx={{ mt: 0.5, fontFamily: "monospace", fontWeight: 500 }}
                >
                  ¥{(financeInfo?.base_salary || 0).toLocaleString("zh-CN")}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                岗位工资
              </FormLabel>
              {isEditing ? (
                <TextField
                  type="number"
                  value={editData.position_salary || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      position_salary: parseFloat(e.target.value) || 0,
                    })
                  }
                  size="small"
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography
                  sx={{ mt: 0.5, fontFamily: "monospace", fontWeight: 500 }}
                >
                  ¥{(financeInfo?.position_salary || 0).toLocaleString("zh-CN")}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                技能工资
              </FormLabel>
              {isEditing ? (
                <TextField
                  type="number"
                  value={editData.skill_salary || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      skill_salary: parseFloat(e.target.value) || 0,
                    })
                  }
                  size="small"
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography
                  sx={{ mt: 0.5, fontFamily: "monospace", fontWeight: 500 }}
                >
                  ¥{(financeInfo?.skill_salary || 0).toLocaleString("zh-CN")}
                </Typography>
              )}
            </Box>
          </Box>

          {hasFinanceInfo && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  月薪合计
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", color: "success.main" }}
                >
                  ¥
                  {(
                    (financeInfo?.base_salary || 0) +
                    (financeInfo?.position_salary || 0) +
                    (financeInfo?.skill_salary || 0)
                  ).toLocaleString("zh-CN")}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 社保公积金 */}
      <Card>
        <CardHeader
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1,
          }}
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Shield style={{ width: 20, height: 20, color: "#ea580c" }} />
              <Typography variant="subtitle1">社保公积金</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 2,
            }}
          >
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                社保基数
              </FormLabel>
              {isEditing ? (
                <TextField
                  type="number"
                  value={editData.social_security_base || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      social_security_base: parseFloat(e.target.value) || 0,
                    })
                  }
                  size="small"
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: "monospace" }}>
                  ¥
                  {(financeInfo?.social_security_base || 0).toLocaleString(
                    "zh-CN",
                  )}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                社保比例
              </FormLabel>
              {isEditing ? (
                <TextField
                  type="number"
                  value={editData.social_security_ratio || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      social_security_ratio:
                        parseFloat((e.target as HTMLInputElement).value) || 0,
                    })
                  }
                  size="small"
                  fullWidth
                  placeholder="如: 0.105"
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: "monospace" }}>
                  {((financeInfo?.social_security_ratio || 0) * 100).toFixed(1)}
                  %
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                公积金基数
              </FormLabel>
              {isEditing ? (
                <TextField
                  type="number"
                  value={editData.housing_fund_base || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      housing_fund_base: parseFloat(e.target.value) || 0,
                    })
                  }
                  size="small"
                  fullWidth
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: "monospace" }}>
                  ¥
                  {(financeInfo?.housing_fund_base || 0).toLocaleString(
                    "zh-CN",
                  )}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                公积金比例
              </FormLabel>
              {isEditing ? (
                <TextField
                  type="number"
                  value={editData.housing_fund_ratio || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      housing_fund_ratio:
                        parseFloat((e.target as HTMLInputElement).value) || 0,
                    })
                  }
                  size="small"
                  fullWidth
                  placeholder="如: 0.12"
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: "monospace" }}>
                  {((financeInfo?.housing_fund_ratio || 0) * 100).toFixed(1)}%
                </Typography>
              )}
            </Box>
          </Box>

          {hasFinanceInfo && (
            <Box
              sx={{
                mt: 2,
                pt: 2,
                borderTop: 1,
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  个人社保扣款(估算)
                </Typography>
                <Typography sx={{ fontFamily: "monospace" }}>
                  ¥
                  {(
                    (financeInfo?.social_security_base || 0) *
                    (financeInfo?.social_security_ratio || 0)
                  ).toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  个人公积金扣款(估算)
                </Typography>
                <Typography sx={{ fontFamily: "monospace" }}>
                  ¥
                  {(
                    (financeInfo?.housing_fund_base || 0) *
                    (financeInfo?.housing_fund_ratio || 0)
                  ).toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 费用归属 */}
      <Card>
        <CardHeader
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1,
          }}
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DollarSign style={{ width: 20, height: 20, color: "#7c3aed" }} />
              <Typography variant="subtitle1">费用归属</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 2,
            }}
          >
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                成本中心
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.cost_center_id || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, cost_center_id: e.target.value })
                  }
                  size="small"
                  fullWidth
                  placeholder="请输入成本中心编码"
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: "monospace" }}>
                  {financeInfo?.cost_center_id || "-"}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                费用科目
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.expense_account_id || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      expense_account_id: e.target.value,
                    })
                  }
                  size="small"
                  fullWidth
                  placeholder="请输入费用科目编码"
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: "monospace" }}>
                  {financeInfo?.expense_account_id || "-"}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 税务信息 */}
      <Card>
        <CardHeader
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1,
          }}
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Shield style={{ width: 20, height: 20, color: "#dc2626" }} />
              <Typography variant="subtitle1">税务信息</Typography>
            </Box>
          }
        />
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 2,
            }}
          >
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                纳税人识别号
              </FormLabel>
              {isEditing ? (
                <TextField
                  value={editData.tax_id || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, tax_id: e.target.value })
                  }
                  size="small"
                  fullWidth
                  placeholder="请输入纳税人识别号"
                  sx={{ mt: 0.5 }}
                />
              ) : (
                <Typography sx={{ mt: 0.5, fontFamily: "monospace" }}>
                  {financeInfo?.tax_id || "-"}
                </Typography>
              )}
            </Box>
            <Box>
              <FormLabel sx={{ fontSize: 14, color: "text.secondary" }}>
                专项附加扣除
              </FormLabel>
              {isEditing ? (
                <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
                  <Select
                    value={editData.tax_level?.toString() || "0"}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        tax_level: parseInt(e.target.value),
                      })
                    }
                  >
                    <MenuItem value="0">无扣除</MenuItem>
                    <MenuItem value="1">一孩扣除</MenuItem>
                    <MenuItem value="2">两孩扣除</MenuItem>
                    <MenuItem value="3">三孩扣除</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                  {financeInfo?.tax_level
                    ? `${financeInfo.tax_level}孩扣除`
                    : "无扣除"}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmployeeFinanceTab;
