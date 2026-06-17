import { useState, useCallback, useRef, useEffect } from "react";
import {
  companyApi,
  departmentApi,
  employeeApi,
  type Company,
  type Department,
  type Employee,
} from "@/api/hrm";

export interface OrganizationData {
  companies: Company[];
  departments: Department[];
  employees: Employee[];
}

export interface UseOrganizationReturn {
  companies: Company[];
  departments: Department[];
  employees: Employee[];
  loading: boolean;
  loadCompanies: () => Promise<void>;
  loadDepartments: (companyId?: string) => Promise<void>;
  loadEmployees: (departmentId?: string) => Promise<void>;
  clearData: () => void;
}

export const useOrganization = (): UseOrganizationReturn => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // 使用 ref 来存储 AbortController，以便在组件卸载或新请求时取消旧请求
  const abortControllerRef = useRef<AbortController | null>(null);

  // 组件卸载时取消所有未完成的请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadCompanies = useCallback(async () => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const response = await companyApi.list();
      if (response.code === 200 && response.data) {
        setCompanies(response.data.items || []);
      }
    } catch (error: any) {
      // 忽略请求被取消的错误
      if (error?.name === "AbortError" || error?.code === "ERR_CANCELED") {
        return;
      }
      console.error("Failed to load companies:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async (companyId?: string) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const params = companyId ? { company_id: companyId } : undefined;
      const response = await departmentApi.list(params);
      if (response.code === 200 && response.data) {
        setDepartments(response.data.items || []);
      }
    } catch (error: any) {
      // 忽略请求被取消的错误
      if (error?.name === "AbortError" || error?.code === "ERR_CANCELED") {
        return;
      }
      console.error("Failed to load departments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async (departmentId?: string) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const params = departmentId ? { department_id: departmentId } : undefined;
      const response = await employeeApi.list(params);
      if (response.code === 200 && response.data) {
        setEmployees(response.data.items || []);
      }
    } catch (error: any) {
      // 忽略请求被取消的错误
      if (error?.name === "AbortError" || error?.code === "ERR_CANCELED") {
        return;
      }
      console.error("Failed to load employees:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setCompanies([]);
    setDepartments([]);
    setEmployees([]);
  }, []);

  return {
    companies,
    departments,
    employees,
    loading,
    loadCompanies,
    loadDepartments,
    loadEmployees,
    clearData,
  };
};

export default useOrganization;
