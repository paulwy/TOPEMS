/**
 * 基础档案选择器组件
 * 包含往来单位选择器、项目选择器、组织架构选择器、会计科目选择器等
 */

import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, X, Check, Loader2 } from "lucide-react";
import { crmApi } from "@/api/crm";
import { srmApi } from "@/api/srm";
import { hrmApi } from "@/api/hrm";
import { pmApi } from "@/api/pm";
import { financeApi } from "@/api/finance";

// ============================================
// 一、类型定义
// ============================================

/**
 * 往来单位类型
 */
type CounterpartyType = "customer" | "supplier" | "both";

/**
 * 往来单位接口 - 兼容 Customer 和 Supplier
 */
interface Counterparty {
  id: string;
  code?: string;
  supplier_no?: string;
  name: string;
  short_name?: string;
  contact_person?: string;
  contact_name?: string;
  phone?: string;
  contact_phone?: string;
  type?: CounterpartyType;
  status: string;
}

/**
 * 项目接口
 */
interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
}

/**
 * 部门接口
 */
interface Department {
  id: string;
  code?: string;
  name: string;
  parent_id?: string;
  children?: Department[];
}

/**
 * 科目接口
 */
interface Account {
  id: string;
  code: string;
  name: string;
  category: string;
  balance_direction: string;
  level: number;
  children?: Account[];
}

/**
 * 员工接口
 */
interface Employee {
  id: string;
  employee_number?: string;
  name: string;
  department_id?: string;
  position?: string;
  phone?: string;
}

/**
 * 选择器通用Props
 */
interface EntitySelectorProps<T> {
  value?: string;
  onChange: (value: string, entity?: T) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 弹窗选择器Props
 */
interface PopupSelectorProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (entity: T) => void;
  onCancel: () => void;
  loading?: boolean;
  title: string;
  children: React.ReactNode;
}

// ============================================
// 二、通用弹窗选择器
// ============================================

function PopupSelector<T>({
  open,
  onOpenChange,
  onSelect: _,
  onCancel,
  loading,
  title,
  children,
}: PopupSelectorProps<T>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            children
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// 三、往来单位选择器
// ============================================

interface CounterpartySelectorProps extends EntitySelectorProps<Counterparty> {
  types?: CounterpartyType[];
  status?: string[];
}

export function CounterpartySelector({
  value,
  onChange,
  multiple: _,
  placeholder = "选择往来单位",
  disabled,
  className,
  types: __,
  status,
}: CounterpartySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"customer" | "supplier">(
    "customer",
  );

  // 获取客户列表
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["counterparties", "customer", search, status],
    queryFn: () => crmApi.customers.list(),
    enabled: open && activeTab === "customer",
  });

  // 获取供应商列表
  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ["counterparties", "supplier", search, status],
    queryFn: () => srmApi.listSuppliers(),
    enabled: open && activeTab === "supplier",
  });

  const customers = (customersData?.data?.items || []) as Counterparty[];
  const suppliers = (suppliersData?.data || []) as Counterparty[];
  const list = activeTab === "customer" ? customers : suppliers;
  const loading =
    activeTab === "customer" ? customersLoading : suppliersLoading;

  const selectedEntity = useMemo(() => {
    if (!value) return null;
    return list.find((item) => item.id === value);
  }, [value, list]);

  const handleSelect = useCallback(
    (entity: Counterparty) => {
      onChange(entity.id, entity);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  return (
    <>
      <Button
        variant="outline"
        role="combobox"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`w-full justify-between ${className || ""}`}
      >
        {selectedEntity ? (
          <span className="flex items-center gap-2">
            <Badge variant="secondary">
              {(selectedEntity as any).code ||
                (selectedEntity as any).supplier_no ||
                ""}
            </Badge>
            <span>{selectedEntity.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {value && !disabled && (
          <X
            className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          />
        )}
      </Button>

      <PopupSelector
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect as any}
        onCancel={() => {
          setOpen(false);
          setSearch("");
        }}
        loading={loading}
        title="选择往来单位"
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="customer" className="flex-1">
              客户 ({customers.length})
            </TabsTrigger>
            <TabsTrigger value="supplier" className="flex-1">
              供应商 ({suppliers.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索编码或名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-[400px] mt-4">
            <div className="space-y-1">
              {list.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  未找到匹配的往来单位
                </div>
              ) : (
                list.map((entity: any) => (
                  <div
                    key={entity.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent ${
                      value === entity.id ? "bg-accent" : ""
                    }`}
                    onClick={() => handleSelect(entity)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {entity.code || entity.supplier_no || ""}
                        </Badge>
                        <span className="font-medium">{entity.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {(entity.contact_person || entity.contact_name) && (
                          <span>
                            联系人:{" "}
                            {entity.contact_person || entity.contact_name}
                          </span>
                        )}
                        {(entity.phone || entity.contact_phone) && (
                          <span className="ml-2">
                            电话: {entity.phone || entity.contact_phone}
                          </span>
                        )}
                      </div>
                    </div>
                    {value === entity.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </PopupSelector>
    </>
  );
}

// ============================================
// 四、项目选择器
// ============================================

interface ProjectSelectorProps extends EntitySelectorProps<Project> {
  status?: string[];
  organization_id?: string;
}

export function ProjectSelector({
  value,
  onChange,
  placeholder = "选择项目",
  disabled,
  className,
  status,
  organization_id,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["projects", search, status, organization_id],
    queryFn: () =>
      pmApi.projects.list({
        status: status?.join(","),
      }),
    enabled: open,
  });

  const projects = (data?.data?.items || []) as Project[];

  const selectedProject = useMemo(() => {
    if (!value) return null;
    return projects.find((p: Project) => p.id === value);
  }, [value, projects]);

  const handleSelect = useCallback(
    (project: Project) => {
      onChange(project.id, project);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  return (
    <>
      <Button
        variant="outline"
        role="combobox"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`w-full justify-between ${className || ""}`}
      >
        {selectedProject ? (
          <span className="flex items-center gap-2">
            <Badge variant="secondary">{selectedProject.code}</Badge>
            <span>{selectedProject.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {value && !disabled && (
          <X
            className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          />
        )}
      </Button>

      <PopupSelector
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect}
        onCancel={() => {
          setOpen(false);
          setSearch("");
        }}
        loading={isLoading}
        title="选择项目"
      >
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索项目编码或名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                未找到匹配的项目
              </div>
            ) : (
              projects.map((project: Project) => (
                <div
                  key={project.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent ${
                    value === project.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handleSelect(project)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{project.code}</Badge>
                      <span className="font-medium">{project.name}</span>
                      <Badge
                        variant={
                          project.status === "active" ? "default" : "secondary"
                        }
                      >
                        {project.status === "active"
                          ? "进行中"
                          : project.status}
                      </Badge>
                    </div>
                    {project.budget && (
                      <div className="text-sm text-muted-foreground mt-1">
                        预算: ¥{project.budget.toLocaleString()}
                      </div>
                    )}
                  </div>
                  {value === project.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopupSelector>
    </>
  );
}

// ============================================
// 五、组织架构选择器（部门树）
// ============================================

interface DepartmentSelectorProps extends EntitySelectorProps<Department> {
  organizationId?: string;
  showCode?: boolean;
}

export function DepartmentSelector({
  value,
  onChange,
  placeholder = "选择部门",
  disabled,
  className,
  organizationId,
  showCode = true,
}: DepartmentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["departments-tree", organizationId],
    queryFn: () => hrmApi.departments.list({ organization_id: organizationId }),
    enabled: open,
  });

  const departments = data?.data?.items || [];

  const selectedDepartment = useMemo(() => {
    if (!value) return null;
    const findDept = (list: Department[]): Department | null => {
      for (const dept of list) {
        if (dept.id === value) return dept;
        if (dept.children) {
          const found = findDept(dept.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findDept(departments);
  }, [value, departments]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const renderDepartment = (dept: Department, level = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedIds.includes(dept.id);

    return (
      <div key={dept.id}>
        <div
          className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent ${
            value === dept.id ? "bg-accent" : ""
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => {
            onChange(dept.id, dept);
            setOpen(false);
          }}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(dept.id);
                }}
              >
                {isExpanded ? "−" : "+"}
              </Button>
            )}
            {!hasChildren && <span className="w-6" />}
            {showCode && dept.code && (
              <Badge variant="outline" className="text-xs">
                {dept.code}
              </Badge>
            )}
            <span>{dept.name}</span>
          </div>
          {value === dept.id && <Check className="h-4 w-4 text-primary" />}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {dept.children!.map((child) => renderDepartment(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        role="combobox"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`w-full justify-between ${className || ""}`}
      >
        {selectedDepartment ? (
          <span className="flex items-center gap-2">
            {showCode && selectedDepartment.code && (
              <Badge variant="secondary">{selectedDepartment.code}</Badge>
            )}
            <span>{selectedDepartment.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {value && !disabled && (
          <X
            className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          />
        )}
      </Button>

      <PopupSelector
        open={open}
        onOpenChange={setOpen}
        onSelect={() => {}}
        onCancel={() => setOpen(false)}
        loading={isLoading}
        title="选择部门"
      >
        <ScrollArea className="h-[400px]">
          <div className="space-y-0">
            {departments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无部门数据
              </div>
            ) : (
              departments.map((dept) => renderDepartment(dept))
            )}
          </div>
        </ScrollArea>
      </PopupSelector>
    </>
  );
}

// ============================================
// 六、会计科目选择器
// ============================================

interface AccountSelectorProps extends EntitySelectorProps<Account> {
  category?: string;
  level?: number;
  balanceDirection?: "debit" | "credit";
}

export function AccountSelector({
  value,
  onChange,
  placeholder = "选择会计科目",
  disabled,
  className,
  category: _,
  level,
  balanceDirection,
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["accounts-tree", selectedCategory, level, balanceDirection],
    queryFn: () =>
      financeApi.account.getTree({
        category: selectedCategory || undefined,
        status: "active",
      }),
    enabled: open,
  });

  const accounts = data?.data || [];

  // 过滤搜索结果
  const filteredAccounts = useMemo(() => {
    if (!search) return accounts;
    const searchLower = search.toLowerCase();
    const filterAccounts = (list: Account[]): Account[] => {
      const result: Account[] = [];
      for (const account of list) {
        const match =
          account.code.toLowerCase().includes(searchLower) ||
          account.name.toLowerCase().includes(searchLower);
        if (match) {
          result.push(account);
        } else if (account.children) {
          const filteredChildren = filterAccounts(account.children);
          if (filteredChildren.length > 0) {
            result.push(...filteredChildren);
          }
        }
      }
      return result;
    };
    return filterAccounts(accounts);
  }, [accounts, search]);

  const selectedAccount = useMemo(() => {
    if (!value) return null;
    const findAccount = (list: Account[]): Account | null => {
      for (const account of list) {
        if (account.id === value) return account;
        if (account.children) {
          const found = findAccount(account.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findAccount(accounts);
  }, [value, accounts]);

  const renderAccount = (account: Account, level = 0) => {
    const hasChildren = account.children && account.children.length > 0;

    return (
      <div key={account.id}>
        <div
          className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent ${
            value === account.id ? "bg-accent" : ""
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (!hasChildren) {
              onChange(account.id, account);
              setOpen(false);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-sm ${hasChildren ? "font-medium" : ""}`}
            >
              {account.code}
            </span>
            <span>{account.name}</span>
            {account.balance_direction === "debit" ? (
              <Badge variant="outline" className="text-xs">
                借
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                贷
              </Badge>
            )}
          </div>
          {value === account.id && !hasChildren && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </div>
        {hasChildren && (
          <div>
            {account.children!.map((child) => renderAccount(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        role="combobox"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`w-full justify-between ${className || ""}`}
      >
        {selectedAccount ? (
          <span className="flex items-center gap-2">
            <span className="font-mono text-sm">{selectedAccount.code}</span>
            <span>{selectedAccount.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {value && !disabled && (
          <X
            className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          />
        )}
      </Button>

      <PopupSelector
        open={open}
        onOpenChange={setOpen}
        onSelect={() => {}}
        onCancel={() => setOpen(false)}
        loading={isLoading}
        title="选择会计科目"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索科目编码或名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="科目类别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部</SelectItem>
                <SelectItem value="asset">资产</SelectItem>
                <SelectItem value="liability">负债</SelectItem>
                <SelectItem value="equity">权益</SelectItem>
                <SelectItem value="cost">成本</SelectItem>
                <SelectItem value="expense">费用</SelectItem>
                <SelectItem value="income">收入</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[350px]">
            <div className="space-y-0">
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  未找到匹配的科目
                </div>
              ) : (
                filteredAccounts.map((account) => renderAccount(account))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopupSelector>
    </>
  );
}

// ============================================
// 七、员工选择器
// ============================================

interface EmployeeSelectorProps extends EntitySelectorProps<Employee> {
  departmentId?: string;
  status?: string[];
}

export function EmployeeSelector({
  value,
  onChange,
  placeholder = "选择员工",
  disabled,
  className,
  departmentId,
  status,
}: EmployeeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search, departmentId, status],
    queryFn: () =>
      hrmApi.employees.list({
        keyword: search,
        department_id: departmentId,
        status: status?.join(",") || "active",
      }),
    enabled: open,
  });

  const employees = data?.data?.items || [];

  const selectedEmployee = useMemo(() => {
    if (!value) return null;
    return employees.find((e) => e.id === value);
  }, [value, employees]);

  const handleSelect = useCallback(
    (employee: Employee) => {
      onChange(employee.id, employee);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  return (
    <>
      <Button
        variant="outline"
        role="combobox"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`w-full justify-between ${className || ""}`}
      >
        {selectedEmployee ? (
          <span className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedEmployee.employee_number}
            </Badge>
            <span>{selectedEmployee.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {value && !disabled && (
          <X
            className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          />
        )}
      </Button>

      <PopupSelector
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect}
        onCancel={() => {
          setOpen(false);
          setSearch("");
        }}
        loading={isLoading}
        title="选择员工"
      >
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索员工编号或姓名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                未找到匹配的员工
              </div>
            ) : (
              employees.map((employee) => (
                <div
                  key={employee.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent ${
                    value === employee.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handleSelect(employee)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {employee.employee_number}
                      </Badge>
                      <span className="font-medium">{employee.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {employee.department_id && (
                        <span>{employee.department_id}</span>
                      )}
                      {employee.position && (
                        <span className="ml-2">{employee.position}</span>
                      )}
                    </div>
                  </div>
                  {value === employee.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopupSelector>
    </>
  );
}

// ============================================
// 八、导出
// ============================================

export type {
  Counterparty,
  Project,
  Department,
  Account,
  Employee,
  CounterpartyType,
};
