import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  FileText,
  Calendar,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Clock,
  FileTextIcon,
} from "lucide-react";
import type { Contract, ContractRenewal, Employee } from "../api/hrm";
import { contractApi, contractRenewalApi, employeeApi } from "../api/hrm";
import type { PaginatedResult } from "../api/hrm";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const contractTypes = [
  { value: "labor", label: "劳动合同" },
  { value: "probation", label: "试用期合同" },
  { value: "part-time", label: "兼职合同" },
  { value: "project", label: "项目合同" },
  { value: "consulting", label: "咨询合同" },
];

const statusMap: Record<string, { text: string; color: string }> = {
  active: { text: "生效中", color: "bg-green-100 text-green-800" },
  expired: { text: "已到期", color: "bg-red-100 text-red-800" },
  terminated: { text: "已终止", color: "bg-gray-100 text-gray-600" },
  pending: { text: "待审批", color: "bg-orange-100 text-orange-800" },
};

const renewalStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待审批", color: "bg-orange-100 text-orange-800" },
  approved: { text: "已批准", color: "bg-green-100 text-green-800" },
  rejected: { text: "已拒绝", color: "bg-red-100 text-red-800" },
  executed: { text: "已执行", color: "bg-blue-100 text-blue-800" },
};

const renewalTypes = [
  { value: "regular", label: "常规续签" },
  { value: "promotion", label: "升职续签" },
  { value: "demotion", label: "降职续签" },
  { value: "transfer", label: "调岗续签" },
];

interface FormState {
  employee_id: string;
  contract_no: string;
  contract_type: string;
  party_a_name: string;
  party_a_contact: string;
  party_b_name: string;
  party_b_contact: string;
  start_date: string;
  end_date: string;
  salary: string;
  probation_period_days: string;
  reminder_days: string;
  contract_file_path: string;
  notes: string;
}

interface RenewFormState {
  renewal_type: string;
  new_start_date: string;
  new_end_date: string;
  new_salary: string;
  renewal_reason: string;
}

export default function ContractManagementPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Contract>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit" | "view">(
    "create",
  );
  const [currentContract, setCurrentContract] = useState<Contract | null>(null);
  const [formState, setFormState] = useState<FormState>({
    employee_id: "",
    contract_no: "",
    contract_type: "",
    party_a_name: "",
    party_a_contact: "",
    party_b_name: "",
    party_b_contact: "",
    start_date: "",
    end_date: "",
    salary: "",
    probation_period_days: "",
    reminder_days: "30",
    contract_file_path: "",
    notes: "",
  });

  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewFormState, setRenewFormState] = useState<RenewFormState>({
    renewal_type: "regular",
    new_start_date: "",
    new_end_date: "",
    new_salary: "",
    renewal_reason: "",
  });
  const [renewContractId, setRenewContractId] = useState("");

  const [renewals, setRenewals] = useState<ContractRenewal[]>([]);
  const [showRenewals, setShowRenewals] = useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    onConfirm: () => void;
  } | null>(null);

  const showNotification = useCallback(
    (type: "success" | "error", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 3000);
    },
    [],
  );

  const showConfirm = useCallback((title: string, onConfirm: () => void) => {
    setConfirmDialog({ title, onConfirm });
  }, []);

  useEffect(() => {
    loadData();
    loadEmployees();
  }, [currentPage, statusFilter, showExpiringOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        page_size: 20,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (showExpiringOnly) {
        const result = await contractApi.getExpiring({
          days: 30,
          page: currentPage,
          page_size: 20,
        });
        if (result.code === 0 && result.data) {
          setData(result.data);
        } else {
          showNotification("error", result.message || "获取即将到期合同失败");
        }
      } else {
        const result = await contractApi.list(params);
        if (result.code === 0 && result.data) {
          setData(result.data);
        } else {
          showNotification("error", result.message || "获取合同列表失败");
        }
      }
    } catch (error) {
      showNotification("error", "获取合同列表失败");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const result = await employeeApi.list({ page: 1, page_size: 100 });
      if (result.code === 0 && result.data) {
        setEmployees(result.data.items);
      }
    } catch (error) {
      showNotification("error", "获取员工列表失败");
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadData();
  };

  const handleCreate = () => {
    setModalType("create");
    setCurrentContract(null);
    setFormState({
      employee_id: "",
      contract_no: "",
      contract_type: "",
      party_a_name: "",
      party_a_contact: "",
      party_b_name: "",
      party_b_contact: "",
      start_date: "",
      end_date: "",
      salary: "",
      probation_period_days: "",
      reminder_days: "30",
      contract_file_path: "",
      notes: "",
    });
    setModalVisible(true);
  };

  const handleEdit = (contract: Contract) => {
    setModalType("edit");
    setCurrentContract(contract);
    setFormState({
      employee_id: contract.employee_id || "",
      contract_no: contract.contract_no || "",
      contract_type: contract.contract_type || "",
      party_a_name: contract.party_a_name || "",
      party_a_contact: contract.party_a_contact || "",
      party_b_name: contract.party_b_name || "",
      party_b_contact: contract.party_b_contact || "",
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      salary: contract.salary?.toString() || "",
      probation_period_days: contract.probation_period_days?.toString() || "",
      reminder_days: contract.reminder_days?.toString() || "30",
      contract_file_path: contract.contract_file_path || "",
      notes: contract.notes || "",
    });
    setModalVisible(true);
  };

  const handleView = async (contract: Contract) => {
    setModalType("view");
    setCurrentContract(contract);
    const result = await contractRenewalApi.list({ contract_id: contract.id });
    if (result.code === 0 && result.data) {
      setRenewals(result.data.items);
    }
    setShowRenewals(false);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await contractApi.delete(id);
      if (result.code === 0) {
        showNotification("success", "删除成功");
        loadData();
      } else {
        showNotification("error", result.message || "删除失败");
      }
    } catch (error) {
      showNotification("error", "删除失败");
    }
  };

  const handleSave = async () => {
    if (!formState.employee_id) {
      showNotification("error", "请选择员工");
      return;
    }
    if (!formState.contract_type) {
      showNotification("error", "请选择合同类型");
      return;
    }
    if (!formState.start_date) {
      showNotification("error", "请选择开始日期");
      return;
    }

    const values = {
      ...formState,
      salary: formState.salary ? parseInt(formState.salary) : undefined,
      probation_period_days: formState.probation_period_days
        ? parseInt(formState.probation_period_days)
        : undefined,
      reminder_days: formState.reminder_days
        ? parseInt(formState.reminder_days)
        : undefined,
    };

    try {
      if (modalType === "create") {
        const result = await contractApi.create(values);
        if (result.code === 0) {
          showNotification("success", "创建成功");
          setModalVisible(false);
          loadData();
        } else {
          showNotification("error", result.message || "创建失败");
        }
      } else if (currentContract) {
        const result = await contractApi.update(currentContract.id, values);
        if (result.code === 0) {
          showNotification("success", "更新成功");
          setModalVisible(false);
          loadData();
        } else {
          showNotification("error", result.message || "更新失败");
        }
      }
    } catch (error) {
      showNotification("error", "保存失败");
    }
  };

  const handleRenew = (contract: Contract) => {
    setRenewContractId(contract.id);
    setRenewFormState({
      renewal_type: "regular",
      new_start_date:
        contract.end_date || new Date().toISOString().split("T")[0],
      new_end_date: "",
      new_salary: "",
      renewal_reason: "",
    });
    setRenewModalVisible(true);
  };

  const handleSubmitRenew = async () => {
    if (!renewFormState.new_start_date) {
      showNotification("error", "请选择新合同开始日期");
      return;
    }

    const values = {
      ...renewFormState,
      new_salary: renewFormState.new_salary
        ? parseInt(renewFormState.new_salary)
        : undefined,
    };

    try {
      const result = await contractApi.renew(renewContractId, values);
      if (result.code === 0) {
        showNotification("success", "续签申请提交成功");
        setRenewModalVisible(false);
      } else {
        showNotification("error", result.message || "提交失败");
      }
    } catch (error) {
      showNotification("error", "提交失败");
    }
  };

  const handleApproveRenewal = async (id: string) => {
    try {
      const result = await contractRenewalApi.approve(id);
      if (result.code === 0) {
        showNotification("success", "续签申请已批准");
        loadData();
      } else {
        showNotification("error", result.message || "操作失败");
      }
    } catch (error) {
      showNotification("error", "操作失败");
    }
  };

  const handleRejectRenewal = async (id: string) => {
    const reason = prompt("请输入拒绝理由：");
    if (!reason) return;
    try {
      const result = await contractRenewalApi.reject(id, reason);
      if (result.code === 0) {
        showNotification("success", "续签申请已拒绝");
        loadData();
      } else {
        showNotification("error", result.message || "操作失败");
      }
    } catch (error) {
      showNotification("error", "操作失败");
    }
  };

  const handleExecuteRenewal = async (id: string) => {
    try {
      const result = await contractRenewalApi.execute(id);
      if (result.code === 0) {
        showNotification("success", "合同续签已执行");
        loadData();
      } else {
        showNotification("error", result.message || "操作失败");
      }
    } catch (error) {
      showNotification("error", "操作失败");
    }
  };

  const getEmployeeName = (id?: string) => {
    if (!id) return "-";
    return employees.find((e) => e.id === id)?.name || "-";
  };

  const getDaysUntilExpiry = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  };

  const hasExpiringSoon = (endDate?: string) => {
    const days = getDaysUntilExpiry(endDate);
    return days !== null && days > 0 && days <= 30;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      {confirmDialog && (
        <Dialog
          open={!!confirmDialog}
          onOpenChange={() => setConfirmDialog(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmDialog.title}</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setConfirmDialog(null)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
              >
                确定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">合同管理</h1>
              <p className="text-sm text-gray-500 mt-1">
                管理员工合同信息，包括合同创建、到期提醒和续签流程
              </p>
            </div>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus size={18} />
              新建合同
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <Input
                    type="text"
                    placeholder="搜索合同编号或员工姓名"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">生效中</SelectItem>
                    <SelectItem value="expired">已到期</SelectItem>
                    <SelectItem value="terminated">已终止</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={showExpiringOnly}
                    onCheckedChange={(e) => {
                      setShowExpiringOnly(Boolean(e));
                      setCurrentPage(1);
                    }}
                  />
                  <span className="text-sm text-gray-600">
                    仅显示即将到期(30天内)
                  </span>
                </label>
              </div>
              <Button
                variant="outline"
                onClick={loadData}
                className="flex items-center gap-2"
              >
                <RefreshCw size={16} />
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">合同编号</TableHead>
                    <TableHead>员工</TableHead>
                    <TableHead>合同类型</TableHead>
                    <TableHead className="w-24">薪资</TableHead>
                    <TableHead className="w-48">有效期</TableHead>
                    <TableHead className="w-20">状态</TableHead>
                    <TableHead className="w-40">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ) : data.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-gray-500"
                      >
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.items.map((item) => {
                      const days = getDaysUntilExpiry(item.end_date);
                      const isExpiringSoon = hasExpiringSoon(item.end_date);

                      return (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileTextIcon className="w-4 h-4 text-blue-500" />
                              <span className="font-medium text-gray-900">
                                {item.contract_no || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getEmployeeName(item.employee_id)}
                          </TableCell>
                          <TableCell>
                            {contractTypes.find(
                              (t) => t.value === item.contract_type,
                            )?.label || item.contract_type}
                          </TableCell>
                          <TableCell>
                            {item.salary
                              ? `${item.salary.toLocaleString()}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span
                                className={`text-sm ${isExpiringSoon ? "text-orange-600 font-medium" : "text-gray-600"}`}
                              >
                                {new Date(item.start_date).toLocaleDateString(
                                  "zh-CN",
                                )}{" "}
                                ~{" "}
                                {item.end_date
                                  ? new Date(item.end_date).toLocaleDateString(
                                      "zh-CN",
                                    )
                                  : "无固定期限"}
                              </span>
                            </div>
                            {isExpiringSoon && days !== null && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-orange-600">
                                <AlertCircle className="w-3 h-3" />
                                <span>剩余{days}天到期</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                statusMap[item.status]?.color ||
                                "bg-gray-100 text-gray-600"
                              }
                            >
                              {statusMap[item.status]?.text || item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleView(item)}
                                title="查看"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(item)}
                                title="编辑"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {item.status === "active" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRenew(item)}
                                  title="续签"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  showConfirm("确定删除该合同吗?", () =>
                                    handleDelete(item.id),
                                  )
                                }
                                title="删除"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-gray-500">
                共 {data.total} 条记录
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-4 py-2"
                >
                  上一页
                </Button>
                <span className="text-sm text-gray-600 px-2">
                  第 {currentPage} 页
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage * data.page_size >= data.total}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-4 py-2"
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {modalType === "create"
                ? "新建合同"
                : modalType === "edit"
                  ? "编辑合同"
                  : "合同详情"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 py-4">
            {modalType !== "view" ? (
              <div className="space-y-4 px-4">
                <div>
                  <Label htmlFor="employee_id">员工 *</Label>
                  <Select
                    value={formState.employee_id}
                    onValueChange={(value) =>
                      setFormState((s) => ({ ...s, employee_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择员工" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">请选择员工</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="contract_no">合同编号</Label>
                  <Input
                    id="contract_no"
                    type="text"
                    value={formState.contract_no}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        contract_no: e.target.value,
                      }))
                    }
                    disabled={modalType === "create"}
                    placeholder={modalType === "create" ? "自动生成" : ""}
                  />
                </div>

                <div>
                  <Label htmlFor="contract_type">合同类型 *</Label>
                  <Select
                    value={formState.contract_type}
                    onValueChange={(value) =>
                      setFormState((s) => ({ ...s, contract_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择合同类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">请选择合同类型</SelectItem>
                      {contractTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="party_a_name">甲方名称</Label>
                    <Input
                      id="party_a_name"
                      type="text"
                      value={formState.party_a_name}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          party_a_name: e.target.value,
                        }))
                      }
                      placeholder="公司名称"
                    />
                  </div>
                  <div>
                    <Label htmlFor="party_a_contact">甲方联系人</Label>
                    <Input
                      id="party_a_contact"
                      type="text"
                      value={formState.party_a_contact}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          party_a_contact: e.target.value,
                        }))
                      }
                      placeholder="联系人姓名"
                    />
                  </div>
                  <div>
                    <Label htmlFor="party_b_name">乙方名称</Label>
                    <Input
                      id="party_b_name"
                      type="text"
                      value={formState.party_b_name}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          party_b_name: e.target.value,
                        }))
                      }
                      placeholder="员工姓名"
                    />
                  </div>
                  <div>
                    <Label htmlFor="party_b_contact">乙方联系人</Label>
                    <Input
                      id="party_b_contact"
                      type="text"
                      value={formState.party_b_contact}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          party_b_contact: e.target.value,
                        }))
                      }
                      placeholder="员工联系方式"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">开始日期 *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formState.start_date}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          start_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">结束日期</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formState.end_date}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          end_date: e.target.value,
                        }))
                      }
                      placeholder="无固定期限"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="salary">薪资</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={formState.salary}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, salary: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="probation_period_days">试用期(天)</Label>
                    <Input
                      id="probation_period_days"
                      type="number"
                      value={formState.probation_period_days}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          probation_period_days: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reminder_days">提前提醒天数</Label>
                    <Input
                      id="reminder_days"
                      type="number"
                      value={formState.reminder_days}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          reminder_days: e.target.value,
                        }))
                      }
                      placeholder="30"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contract_file_path">合同文件路径</Label>
                  <Input
                    id="contract_file_path"
                    type="text"
                    value={formState.contract_file_path}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        contract_file_path: e.target.value,
                      }))
                    }
                    placeholder="上传文件路径"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">备注</Label>
                  <textarea
                    id="notes"
                    value={formState.notes}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, notes: e.target.value }))
                    }
                    rows={3}
                    placeholder="备注信息"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ) : (
              <div className="px-4">
                {currentContract && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-gray-50 border-none">
                        <CardContent className="p-3">
                          <p className="text-sm text-gray-500">合同编号</p>
                          <p className="font-medium">
                            {currentContract.contract_no || "-"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-50 border-none">
                        <CardContent className="p-3">
                          <p className="text-sm text-gray-500">员工</p>
                          <p className="font-medium">
                            {getEmployeeName(currentContract.employee_id)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-50 border-none">
                        <CardContent className="p-3">
                          <p className="text-sm text-gray-500">合同类型</p>
                          <p className="font-medium">
                            {contractTypes.find(
                              (t) => t.value === currentContract.contract_type,
                            )?.label || currentContract.contract_type}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-50 border-none">
                        <CardContent className="p-3">
                          <p className="text-sm text-gray-500">状态</p>
                          <Badge
                            className={
                              statusMap[currentContract.status]?.color ||
                              "bg-gray-100 text-gray-600"
                            }
                          >
                            {statusMap[currentContract.status]?.text ||
                              currentContract.status}
                          </Badge>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-50 border-none">
                        <CardContent className="p-3">
                          <p className="text-sm text-gray-500">薪资</p>
                          <p className="font-medium">
                            {currentContract.salary?.toLocaleString() || "-"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-50 border-none">
                        <CardContent className="p-3">
                          <p className="text-sm text-gray-500">试用期</p>
                          <p className="font-medium">
                            {currentContract.probation_period_days || 0} 天
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <Card className="bg-gray-50 border-none">
                      <CardContent className="p-3">
                        <p className="text-sm text-gray-500">有效期</p>
                        <p className="font-medium">
                          {new Date(
                            currentContract.start_date,
                          ).toLocaleDateString("zh-CN")}
                          ~{" "}
                          {currentContract.end_date
                            ? new Date(
                                currentContract.end_date,
                              ).toLocaleDateString("zh-CN")
                            : "无固定期限"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50 border-none">
                      <CardContent className="p-3">
                        <p className="text-sm text-gray-500">甲方信息</p>
                        <p className="font-medium">
                          {currentContract.party_a_name || "-"}
                        </p>
                        <p className="text-sm">
                          {currentContract.party_a_contact || "-"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50 border-none">
                      <CardContent className="p-3">
                        <p className="text-sm text-gray-500">乙方信息</p>
                        <p className="font-medium">
                          {currentContract.party_b_name || "-"}
                        </p>
                        <p className="text-sm">
                          {currentContract.party_b_contact || "-"}
                        </p>
                      </CardContent>
                    </Card>
                    {currentContract.notes && (
                      <Card className="bg-gray-50 border-none">
                        <CardContent className="p-3">
                          <p className="text-sm text-gray-500">备注</p>
                          <p className="font-medium">{currentContract.notes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {showRenewals && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium mb-3">续签记录</h3>
                    {renewals.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        暂无续签记录
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {renewals.map((renewal) => (
                          <Card key={renewal.id} className="border">
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="font-medium">
                                    {renewalTypes.find(
                                      (t) => t.value === renewal.renewal_type,
                                    )?.label || renewal.renewal_type}
                                  </span>
                                  <span className="ml-2 text-sm text-gray-500">
                                    {new Date(
                                      renewal.created_at,
                                    ).toLocaleString("zh-CN")}
                                  </span>
                                </div>
                                <Badge
                                  className={
                                    renewalStatusMap[renewal.status]?.color ||
                                    "bg-gray-100 text-gray-600"
                                  }
                                >
                                  {renewalStatusMap[renewal.status]?.text ||
                                    renewal.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                新合同期限:{" "}
                                {new Date(
                                  renewal.new_start_date,
                                ).toLocaleDateString("zh-CN")}{" "}
                                ~{" "}
                                {renewal.new_end_date
                                  ? new Date(
                                      renewal.new_end_date,
                                    ).toLocaleDateString("zh-CN")
                                  : "无固定期限"}
                              </div>
                              {renewal.new_salary && (
                                <div className="text-sm text-gray-600 mb-2">
                                  新薪资: {renewal.new_salary.toLocaleString()}
                                </div>
                              )}
                              {renewal.renewal_reason && (
                                <div className="text-sm text-gray-600 mb-2">
                                  续签原因: {renewal.renewal_reason}
                                </div>
                              )}
                              {renewal.rejection_reason && (
                                <div className="text-sm text-red-600">
                                  拒绝理由: {renewal.rejection_reason}
                                </div>
                              )}
                              <div className="flex gap-2 mt-3">
                                {renewal.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleApproveRenewal(renewal.id)
                                      }
                                      className="flex items-center gap-1"
                                    >
                                      <Check className="w-3 h-3" />
                                      批准
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        handleRejectRenewal(renewal.id)
                                      }
                                      className="flex items-center gap-1"
                                    >
                                      <X className="w-3 h-3" />
                                      拒绝
                                    </Button>
                                  </>
                                )}
                                {renewal.status === "approved" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleExecuteRenewal(renewal.id)
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    执行续签
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            {modalType !== "view" ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setModalVisible(false)}
                >
                  取消
                </Button>
                <Button onClick={handleSave}>
                  {modalType === "create" ? "创建" : "保存"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowRenewals(!showRenewals)}
                >
                  {showRenewals ? "隐藏续签记录" : "查看续签记录"}
                </Button>
                <Button onClick={() => setModalVisible(false)}>关闭</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renewModalVisible} onOpenChange={setRenewModalVisible}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>合同续签申请</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="renewal_type">续签类型 *</Label>
              <Select
                value={renewFormState.renewal_type}
                onValueChange={(value) =>
                  setRenewFormState((s) => ({ ...s, renewal_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择续签类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">请选择续签类型</SelectItem>
                  {renewalTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new_start_date">新合同开始日期 *</Label>
                <Input
                  id="new_start_date"
                  type="date"
                  value={renewFormState.new_start_date}
                  onChange={(e) =>
                    setRenewFormState((s) => ({
                      ...s,
                      new_start_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="new_end_date">新合同结束日期</Label>
                <Input
                  id="new_end_date"
                  type="date"
                  value={renewFormState.new_end_date}
                  onChange={(e) =>
                    setRenewFormState((s) => ({
                      ...s,
                      new_end_date: e.target.value,
                    }))
                  }
                  placeholder="无固定期限"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="new_salary">新薪资</Label>
              <Input
                id="new_salary"
                type="number"
                value={renewFormState.new_salary}
                onChange={(e) =>
                  setRenewFormState((s) => ({
                    ...s,
                    new_salary: e.target.value,
                  }))
                }
                placeholder="不修改请留空"
              />
            </div>

            <div>
              <Label htmlFor="renewal_reason">续签原因</Label>
              <textarea
                id="renewal_reason"
                value={renewFormState.renewal_reason}
                onChange={(e) =>
                  setRenewFormState((s) => ({
                    ...s,
                    renewal_reason: e.target.value,
                  }))
                }
                rows={3}
                placeholder="请说明续签原因"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setRenewModalVisible(false)}
            >
              取消
            </Button>
            <Button onClick={handleSubmitRenew}>提交申请</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
