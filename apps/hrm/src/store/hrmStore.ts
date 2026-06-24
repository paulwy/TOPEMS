import { create } from 'zustand';
import type {
  Department,
  Employee,
  AttendanceRecord,
  PayrollRun,
} from '../api/hrm';

interface HrmStore {
  // 员工列表
  employees: Employee[];
  employeesTotal: number;
  employeesPage: number;
  employeesPageSize: number;

  // 考勤列表
  attendanceRecords: AttendanceRecord[];
  attendanceTotal: number;
  attendancePage: number;
  attendancePageSize: number;

  // 薪资列表
  payrollRuns: PayrollRun[];
  payrollTotal: number;
  payrollPage: number;
  payrollPageSize: number;

  // 部门树
  departments: Department[];
  departmentTree: Department[];

  // 状态
  loading: boolean;
  error: string | null;

  // 员工操作
  setEmployees: (employees: Employee[], total: number) => void;
  setEmployeesPage: (page: number, pageSize: number) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (id: string) => void;

  // 考勤操作
  setAttendanceRecords: (records: AttendanceRecord[], total: number) => void;
  setAttendancePage: (page: number, pageSize: number) => void;
  addAttendanceRecord: (record: AttendanceRecord) => void;
  updateAttendanceRecord: (record: AttendanceRecord) => void;
  deleteAttendanceRecord: (id: string) => void;

  // 薪资操作
  setPayrollRuns: (runs: PayrollRun[], total: number) => void;
  setPayrollPage: (page: number, pageSize: number) => void;
  addPayrollRun: (run: PayrollRun) => void;
  updatePayrollRun: (run: PayrollRun) => void;
  deletePayrollRun: (id: string) => void;

  // 部门操作
  setDepartments: (departments: Department[]) => void;
  setDepartmentTree: (tree: Department[]) => void;
  addDepartment: (department: Department) => void;
  updateDepartment: (department: Department) => void;
  deleteDepartment: (id: string) => void;

  // 状态操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  employees: [],
  employeesTotal: 0,
  employeesPage: 1,
  employeesPageSize: 10,
  attendanceRecords: [],
  attendanceTotal: 0,
  attendancePage: 1,
  attendancePageSize: 10,
  payrollRuns: [],
  payrollTotal: 0,
  payrollPage: 1,
  payrollPageSize: 10,
  departments: [],
  departmentTree: [],
  loading: false,
  error: null,
};

export const useHrmStore = create<HrmStore>((set) => ({
  ...initialState,

  setEmployees: (employees, total) => set({ employees, employeesTotal: total }),
  setEmployeesPage: (page, pageSize) => set({ employeesPage: page, employeesPageSize: pageSize }),
  addEmployee: (employee) =>
    set((state) => ({
      employees: [employee, ...state.employees],
      employeesTotal: state.employeesTotal + 1,
    })),
  updateEmployee: (employee) =>
    set((state) => ({
      employees: state.employees.map((e) => (e.id === employee.id ? employee : e)),
    })),
  deleteEmployee: (id) =>
    set((state) => ({
      employees: state.employees.filter((e) => e.id !== id),
      employeesTotal: Math.max(0, state.employeesTotal - 1),
    })),

  setAttendanceRecords: (records, total) => set({ attendanceRecords: records, attendanceTotal: total }),
  setAttendancePage: (page, pageSize) => set({ attendancePage: page, attendancePageSize: pageSize }),
  addAttendanceRecord: (record) =>
    set((state) => ({
      attendanceRecords: [record, ...state.attendanceRecords],
      attendanceTotal: state.attendanceTotal + 1,
    })),
  updateAttendanceRecord: (record) =>
    set((state) => ({
      attendanceRecords: state.attendanceRecords.map((r) =>
        r.id === record.id ? record : r
      ),
    })),
  deleteAttendanceRecord: (id) =>
    set((state) => ({
      attendanceRecords: state.attendanceRecords.filter((r) => r.id !== id),
      attendanceTotal: Math.max(0, state.attendanceTotal - 1),
    })),

  setPayrollRuns: (runs, total) => set({ payrollRuns: runs, payrollTotal: total }),
  setPayrollPage: (page, pageSize) => set({ payrollPage: page, payrollPageSize: pageSize }),
  addPayrollRun: (run) =>
    set((state) => ({
      payrollRuns: [run, ...state.payrollRuns],
      payrollTotal: state.payrollTotal + 1,
    })),
  updatePayrollRun: (run) =>
    set((state) => ({
      payrollRuns: state.payrollRuns.map((r) => (r.id === run.id ? run : r)),
    })),
  deletePayrollRun: (id) =>
    set((state) => ({
      payrollRuns: state.payrollRuns.filter((r) => r.id !== id),
      payrollTotal: Math.max(0, state.payrollTotal - 1),
    })),

  setDepartments: (departments) => set({ departments }),
  setDepartmentTree: (tree) => set({ departmentTree: tree }),
  addDepartment: (department) =>
    set((state) => ({
      departments: [...state.departments, department],
    })),
  updateDepartment: (department) =>
    set((state) => ({
      departments: state.departments.map((d) => (d.id === department.id ? department : d)),
    })),
  deleteDepartment: (id) =>
    set((state) => ({
      departments: state.departments.filter((d) => d.id !== id),
    })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
