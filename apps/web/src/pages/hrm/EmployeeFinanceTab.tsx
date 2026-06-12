/**
 * 员工财务信息Tab组件
 * 显示员工的银行账户、薪资、社保公积金等财务信息
 */

import React, { useState } from "react";
import {
  useEmployeeFinanceInfo,
  useUpdateEmployeeFinanceInfo,
} from "@/hooks/useHrmFinance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      console.error("Failed to save:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <p>加载失败: {error.message}</p>
            <Button variant="outline" onClick={handleEdit} className="mt-4">
              初始化财务信息
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasFinanceInfo = !!financeInfo;

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">财务信息</h3>
          {hasFinanceInfo && (
            <Badge
              variant={
                financeInfo.status === "active" ? "default" : "secondary"
              }
            >
              {financeInfo.status === "active" ? "正常" : "未激活"}
            </Badge>
          )}
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateFinanceInfo.isPending}
            >
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit2 className="w-4 h-4 mr-1" />
            {hasFinanceInfo ? "编辑" : "初始化"}
          </Button>
        )}
      </div>

      {/* 银行账户信息 */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Banknote className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-base">银行账户信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-gray-500">开户银行</Label>
              {isEditing ? (
                <Input
                  value={editData.bank_name || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, bank_name: e.target.value })
                  }
                  className="mt-1"
                  placeholder="如：中国工商银行"
                />
              ) : (
                <p className="mt-1 font-medium">
                  {financeInfo?.bank_name || "-"}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-500">银行卡号</Label>
              {isEditing ? (
                <Input
                  value={editData.bank_card_number || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      bank_card_number: e.target.value,
                    })
                  }
                  className="mt-1"
                  placeholder="请输入银行卡号"
                />
              ) : (
                <p className="mt-1 font-mono">
                  {financeInfo?.bank_card_number || "-"}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-500">支行名称</Label>
              {isEditing ? (
                <Input
                  value={editData.bank_branch || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, bank_branch: e.target.value })
                  }
                  className="mt-1"
                  placeholder="如：北京分行中关村支行"
                />
              ) : (
                <p className="mt-1 font-medium">
                  {financeInfo?.bank_branch || "-"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 薪资信息 */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <CardTitle className="text-base">薪资设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-gray-500">基本工资</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.base_salary || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      base_salary: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 font-mono font-medium">
                  ¥{(financeInfo?.base_salary || 0).toLocaleString("zh-CN")}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-500">岗位工资</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.position_salary || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      position_salary: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 font-mono font-medium">
                  ¥{(financeInfo?.position_salary || 0).toLocaleString("zh-CN")}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-500">技能工资</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.skill_salary || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      skill_salary: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 font-mono font-medium">
                  ¥{(financeInfo?.skill_salary || 0).toLocaleString("zh-CN")}
                </p>
              )}
            </div>
          </div>

          {hasFinanceInfo && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">月薪合计</span>
                <span className="text-lg font-bold text-green-600">
                  ¥
                  {(
                    (financeInfo?.base_salary || 0) +
                    (financeInfo?.position_salary || 0) +
                    (financeInfo?.skill_salary || 0)
                  ).toLocaleString("zh-CN")}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 社保公积金 */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Shield className="w-5 h-5 text-orange-600" />
          <CardTitle className="text-base">社保公积金</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500">社保基数</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.social_security_base || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      social_security_base: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 font-mono">
                  ¥
                  {(financeInfo?.social_security_base || 0).toLocaleString(
                    "zh-CN",
                  )}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-500">社保比例</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.001"
                  value={editData.social_security_ratio || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      social_security_ratio: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                  placeholder="如: 0.105"
                />
              ) : (
                <p className="mt-1 font-mono">
                  {((financeInfo?.social_security_ratio || 0) * 100).toFixed(1)}
                  %
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-500">公积金基数</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.housing_fund_base || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      housing_fund_base: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 font-mono">
                  ¥
                  {(financeInfo?.housing_fund_base || 0).toLocaleString(
                    "zh-CN",
                  )}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-500">公积金比例</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.001"
                  value={editData.housing_fund_ratio || 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      housing_fund_ratio: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                  placeholder="如: 0.12"
                />
              ) : (
                <p className="mt-1 font-mono">
                  {((financeInfo?.housing_fund_ratio || 0) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          {hasFinanceInfo && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">个人社保扣款(估算)</span>
                <span className="font-mono">
                  ¥
                  {(
                    (financeInfo?.social_security_base || 0) *
                    (financeInfo?.social_security_ratio || 0)
                  ).toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">个人公积金扣款(估算)</span>
                <span className="font-mono">
                  ¥
                  {(
                    (financeInfo?.housing_fund_base || 0) *
                    (financeInfo?.housing_fund_ratio || 0)
                  ).toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 费用归属 */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <DollarSign className="w-5 h-5 text-purple-600" />
          <CardTitle className="text-base">费用归属</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500">成本中心</Label>
              {isEditing ? (
                <Input
                  value={editData.cost_center_id || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, cost_center_id: e.target.value })
                  }
                  className="mt-1"
                  placeholder="请输入成本中心编码"
                />
              ) : (
                <p className="mt-1 font-mono">
                  {financeInfo?.cost_center_id || "-"}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-500">费用科目</Label>
              {isEditing ? (
                <Input
                  value={editData.expense_account_id || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      expense_account_id: e.target.value,
                    })
                  }
                  className="mt-1"
                  placeholder="请输入费用科目编码"
                />
              ) : (
                <p className="mt-1 font-mono">
                  {financeInfo?.expense_account_id || "-"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 税务信息 */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" />
          <CardTitle className="text-base">税务信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500">纳税人识别号</Label>
              {isEditing ? (
                <Input
                  value={editData.tax_id || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, tax_id: e.target.value })
                  }
                  className="mt-1"
                  placeholder="请输入纳税人识别号"
                />
              ) : (
                <p className="mt-1 font-mono">{financeInfo?.tax_id || "-"}</p>
              )}
            </div>
            <div>
              <Label className="text-sm text-gray-500">专项附加扣除</Label>
              {isEditing ? (
                <Select
                  value={editData.tax_level?.toString() || "0"}
                  onValueChange={(value) =>
                    setEditData({ ...editData, tax_level: parseInt(value) })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">无扣除</SelectItem>
                    <SelectItem value="1">一孩扣除</SelectItem>
                    <SelectItem value="2">两孩扣除</SelectItem>
                    <SelectItem value="3">三孩扣除</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 font-medium">
                  {financeInfo?.tax_level
                    ? `${financeInfo.tax_level}孩扣除`
                    : "无扣除"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeFinanceTab;
