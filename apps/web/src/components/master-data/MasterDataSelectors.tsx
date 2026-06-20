/**
 * 基础档案选择器组件
 * 包含往来单位选择器、项目选择器、组织架构选择器、会计科目选择器等
 */

import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Search, X, Check } from "lucide-react";

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
    <Dialog open={open} onClose={onOpenChange} maxWidth="lg" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent
        sx={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 256,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            children
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Button variant="outlined" onClick={onCancel}>
            取消
          </Button>
        </Box>
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
        variant="outlined"
        role="combobox"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        sx={{
          width: "100%",
          justifyContent: "space-between",
          ...(className && { className }),
        }}
      >
        {selectedEntity ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={
                (selectedEntity as any).code ||
                (selectedEntity as any).supplier_no ||
                ""
              }
              size="small"
              variant="outlined"
            />
            <span>{selectedEntity.name}</span>
          </Box>
        ) : (
          <Box sx={{ color: "text.secondary" }}>{placeholder}</Box>
        )}
        {value && !disabled && (
          <X
            style={{ marginLeft: 8, opacity: 0.5, cursor: "pointer" }}
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
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v as any)}
          sx={{ width: "100%" }}
        >
          <Tab
            label={`客户 (${customers.length})`}
            value="customer"
            sx={{ flex: 1 }}
          />
          <Tab
            label={`供应商 (${suppliers.length})`}
            value="supplier"
            sx={{ flex: 1 }}
          />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          <Box sx={{ position: "relative" }}>
            <Search
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                color: "rgba(0,0,0,0.25)",
              }}
            />
            <TextField
              size="small"
              placeholder="搜索编码或名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: "100%", pl: 4 }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 2, overflow: "auto", height: 400 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {list.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
                未找到匹配的往来单位
              </Box>
            ) : (
              list.map((entity: any) => (
                <Box
                  key={entity.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    bgcolor:
                      value === entity.id ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => handleSelect(entity)}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={entity.code || entity.supplier_no || ""}
                        size="small"
                        variant="outlined"
                      />
                      <span style={{ fontWeight: 500 }}>{entity.name}</span>
                    </Box>
                    <Box
                      sx={{
                        fontSize: "0.875rem",
                        color: "text.secondary",
                        mt: 0.5,
                      }}
                    >
                      {(entity.contact_person || entity.contact_name) && (
                        <span>
                          联系人: {entity.contact_person || entity.contact_name}
                        </span>
                      )}
                      {(entity.phone || entity.contact_phone) && (
                        <span style={{ marginLeft: 8 }}>
                          电话: {entity.phone || entity.contact_phone}
                        </span>
                      )}
                    </Box>
                  </Box>
                  {value === entity.id && (
                    <Check
                      style={{ width: 16, height: 16, color: "primary.main" }}
                    />
                  )}
                </Box>
              ))
            )}
          </Box>
        </Box>
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        variant="outlined"
        role="combobox"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        sx={{
          width: "100%",
          justifyContent: "space-between",
          ...(className && { className }),
        }}
      >
        {selectedProject ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={selectedProject.code}
              size="small"
              variant="outlined"
            />
            <span>{selectedProject.name}</span>
          </Box>
        ) : (
          <Box sx={{ color: "text.secondary" }}>{placeholder}</Box>
        )}
        {value && !disabled && (
          <X
            style={{ marginLeft: 8, opacity: 0.5, cursor: "pointer" }}
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
        <Box sx={{ position: "relative", mb: 2 }}>
          <Search
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              color: "rgba(0,0,0,0.25)",
            }}
          />
          <TextField
            size="small"
            placeholder="搜索项目编码或名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: "100%", pl: 4 }}
          />
        </Box>

        <Box sx={{ overflow: "auto", height: 400 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {projects.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
                未找到匹配的项目
              </Box>
            ) : (
              projects.map((project: Project) => (
                <Box
                  key={project.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    bgcolor:
                      value === project.id ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => handleSelect(project)}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={project.code}
                        size="small"
                        variant="outlined"
                      />
                      <span style={{ fontWeight: 500 }}>{project.name}</span>
                      <Chip
                        label={
                          project.status === "active"
                            ? "进行中"
                            : project.status
                        }
                        size="small"
                        color={
                          project.status === "active" ? "primary" : "default"
                        }
                      />
                    </Box>
                    {project.budget && (
                      <Box
                        sx={{
                          fontSize: "0.875rem",
                          color: "text.secondary",
                          mt: 0.5,
                        }}
                      >
                        预算: ¥{project.budget.toLocaleString()}
                      </Box>
                    )}
                  </Box>
                  {value === project.id && (
                    <Check
                      style={{ width: 16, height: 16, color: "primary.main" }}
                    />
                  )}
                </Box>
              ))
            )}
          </Box>
        </Box>
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <Box key={dept.id}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            borderRadius: 1,
            cursor: "pointer",
            pl: `${level * 20 + 8}px`,
            bgcolor: value === dept.id ? "action.selected" : "transparent",
            "&:hover": { bgcolor: "action.hover" },
          }}
          onClick={() => {
            onChange(dept.id, dept);
            setOpen(false);
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {hasChildren && (
              <Button
                variant="text"
                size="small"
                sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(dept.id);
                }}
              >
                {isExpanded ? "−" : "+"}
              </Button>
            )}
            {!hasChildren && <Box sx={{ width: 24 }} />}
            {showCode && dept.code && (
              <Chip
                label={dept.code}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.75rem" }}
              />
            )}
            <span>{dept.name}</span>
          </Box>
          {value === dept.id && (
            <Check style={{ width: 16, height: 16, color: "primary.main" }} />
          )}
        </Box>
        {hasChildren && isExpanded && (
          <Box>
            {dept.children!.map((child) => renderDepartment(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <>
      <Button
        variant="outlined"
        role="combobox"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        sx={{
          width: "100%",
          justifyContent: "space-between",
          ...(className && { className }),
        }}
      >
        {selectedDepartment ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {showCode && selectedDepartment.code && (
              <Chip label={selectedDepartment.code} size="small" />
            )}
            <span>{selectedDepartment.name}</span>
          </Box>
        ) : (
          <Box sx={{ color: "text.secondary" }}>{placeholder}</Box>
        )}
        {value && !disabled && (
          <X
            style={{ marginLeft: 8, opacity: 0.5, cursor: "pointer" }}
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
        <Box sx={{ overflow: "auto", height: 400 }}>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {departments.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
                暂无部门数据
              </Box>
            ) : (
              departments.map((dept) => renderDepartment(dept))
            )}
          </Box>
        </Box>
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <Box key={account.id}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            borderRadius: 1,
            cursor: hasChildren ? "default" : "pointer",
            pl: `${level * 16 + 8}px`,
            bgcolor: value === account.id ? "action.selected" : "transparent",
            "&:hover": {
              bgcolor: hasChildren ? "transparent" : "action.hover",
            },
          }}
          onClick={() => {
            if (!hasChildren) {
              onChange(account.id, account);
              setOpen(false);
            }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "0.875rem",
                fontWeight: hasChildren ? 500 : 400,
              }}
            >
              {account.code}
            </span>
            <span>{account.name}</span>
            {account.balance_direction === "debit" ? (
              <Chip
                label="借"
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.75rem" }}
              />
            ) : (
              <Chip label="贷" size="small" sx={{ fontSize: "0.75rem" }} />
            )}
          </Box>
          {value === account.id && !hasChildren && (
            <Check style={{ width: 16, height: 16, color: "primary.main" }} />
          )}
        </Box>
        {hasChildren && (
          <Box>
            {account.children!.map((child) => renderAccount(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <>
      <Button
        variant="outlined"
        role="combobox"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        sx={{
          width: "100%",
          justifyContent: "space-between",
          ...(className && { className }),
        }}
      >
        {selectedAccount ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
              {selectedAccount.code}
            </span>
            <span>{selectedAccount.name}</span>
          </Box>
        ) : (
          <Box sx={{ color: "text.secondary" }}>{placeholder}</Box>
        )}
        {value && !disabled && (
          <X
            style={{ marginLeft: 8, opacity: 0.5, cursor: "pointer" }}
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Box sx={{ position: "relative", flex: 1 }}>
              <Search
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  color: "rgba(0,0,0,0.25)",
                }}
              />
              <TextField
                size="small"
                placeholder="搜索科目编码或名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: "100%", pl: 4 }}
              />
            </Box>
            <FormControl size="small" sx={{ width: 140 }}>
              <InputLabel>科目类别</InputLabel>
              <Select
                value={selectedCategory}
                label="科目类别"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="asset">资产</MenuItem>
                <MenuItem value="liability">负债</MenuItem>
                <MenuItem value="equity">权益</MenuItem>
                <MenuItem value="cost">成本</MenuItem>
                <MenuItem value="expense">费用</MenuItem>
                <MenuItem value="income">收入</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ overflow: "auto", height: 350 }}>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {filteredAccounts.length === 0 ? (
                <Box
                  sx={{ textAlign: "center", py: 8, color: "text.secondary" }}
                >
                  未找到匹配的科目
                </Box>
              ) : (
                filteredAccounts.map((account) => renderAccount(account))
              )}
            </Box>
          </Box>
        </Box>
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        variant="outlined"
        role="combobox"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        sx={{
          width: "100%",
          justifyContent: "space-between",
          ...(className && { className }),
        }}
      >
        {selectedEmployee ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip label={selectedEmployee.employee_no} size="small" />
            <span>{selectedEmployee.name}</span>
          </Box>
        ) : (
          <Box sx={{ color: "text.secondary" }}>{placeholder}</Box>
        )}
        {value && !disabled && (
          <X
            style={{ marginLeft: 8, opacity: 0.5, cursor: "pointer" }}
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
        <Box sx={{ position: "relative", mb: 2 }}>
          <Search
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              color: "rgba(0,0,0,0.25)",
            }}
          />
          <TextField
            size="small"
            placeholder="搜索员工编号或姓名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: "100%", pl: 4 }}
          />
        </Box>

        <Box sx={{ overflow: "auto", height: 400 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {employees.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
                未找到匹配的员工
              </Box>
            ) : (
              employees.map((employee) => (
                <Box
                  key={employee.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    bgcolor:
                      value === employee.id ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => handleSelect(employee)}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={employee.employee_no}
                        size="small"
                        variant="outlined"
                      />
                      <span style={{ fontWeight: 500 }}>{employee.name}</span>
                    </Box>
                    <Box
                      sx={{
                        fontSize: "0.875rem",
                        color: "text.secondary",
                        mt: 0.5,
                      }}
                    >
                      {employee.department_id && (
                        <span>{employee.department_id}</span>
                      )}
                      {employee.position && (
                        <span style={{ marginLeft: 8 }}>
                          {employee.position}
                        </span>
                      )}
                    </Box>
                  </Box>
                  {value === employee.id && (
                    <Check
                      style={{ width: 16, height: 16, color: "primary.main" }}
                    />
                  )}
                </Box>
              ))
            )}
          </Box>
        </Box>
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
