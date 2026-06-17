import type { ApiResponse } from "./client";
export interface Company {
    id: string;
    organization_id: string;
    name: string;
    short_name?: string;
    registration_number?: string;
    tax_number?: string;
    address?: string;
    contact_phone?: string;
    email?: string;
    website?: string;
    description?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface Department {
    id: string;
    name: string;
    code?: string;
    parent_id?: string;
    company_id?: string;
    description?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface Employee {
    id: string;
    employee_no: string;
    name: string;
    gender?: string;
    birth_date?: string;
    hire_date?: string;
    department_id?: string;
    position?: string;
    email?: string;
    phone?: string;
    address?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    status: string;
    user_id?: string;
    company_id?: string;
    position_id?: string;
    created_at: string;
    updated_at: string;
}
export interface Role {
    id: string;
    name: string;
    code?: string;
    description?: string;
    permissions?: string[];
    status: string;
    created_at: string;
    updated_at: string;
}
export interface LeaveRequest {
    id: string;
    employee_id: string;
    employee_name?: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days: number;
    reason?: string;
    status: string;
    approver_id?: string;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
}
export interface AttendanceRecord {
    id: string;
    employee_id: string;
    employee_name?: string;
    date: string;
    check_in?: string;
    check_out?: string;
    check_in_time?: string;
    check_out_time?: string;
    status: string;
    attendance_status?: string;
    work_hours?: number;
    created_at: string;
    updated_at: string;
}
export interface Position {
    id: string;
    name: string;
    code?: string;
    department_id?: string;
    level?: string;
    min_salary?: number;
    max_salary?: number;
    description?: string;
    requirements?: string;
    status: string;
    created_at: string;
    updated_at: string;
    employee_count?: number;
}
export interface JobOpening {
    id: string;
    title: string;
    code?: string;
    department_id?: string;
    position_id?: string;
    employment_type?: string;
    location?: string;
    description?: string;
    requirements?: string;
    salary_min?: number;
    salary_max?: number;
    status: string;
    publish_date?: string;
    close_date?: string;
    created_at: string;
    updated_at: string;
}
export interface Candidate {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    position_id?: string;
    job_opening_id?: string;
    resume_path?: string;
    source?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface Interview {
    id: string;
    candidate_id: string;
    interviewer_id?: string;
    round: number;
    scheduled_at?: string;
    actual_at?: string;
    duration_minutes: number;
    status: string;
    result?: string;
    notes?: string;
    score?: number;
    created_at: string;
    updated_at: string;
}
export interface PayrollRun {
    id: string;
    pay_period: string;
    status: string;
    total_amount: number;
    employee_count: number;
    paid_at?: string;
    created_at: string;
    updated_at: string;
}
export interface PayrollItem {
    id: string;
    payroll_run_id: string;
    employee_id: string;
    gross_amount: number;
    net_amount: number;
    deductions: number;
    taxes: number;
    status: string;
    bank_account?: string;
    paid_at?: string;
    created_at: string;
    updated_at: string;
}
export interface PerformanceReview {
    id: string;
    employee_id: string;
    review_period: string;
    reviewer_id?: string;
    status: string;
    overall_rating?: number;
    self_rating?: number;
    manager_rating?: number;
    final_rating?: number;
    comments?: string;
    created_at: string;
    updated_at: string;
}
export interface PerformanceGoal {
    id: string;
    employee_id: string;
    title: string;
    description?: string;
    target?: string;
    weight: number;
    achieved?: number;
    status: string;
    due_date?: string;
    created_at: string;
    updated_at: string;
}
export interface Contract {
    id: string;
    employee_id: string;
    contract_no?: string;
    contract_type: string;
    party_a_name?: string;
    party_a_contact?: string;
    party_b_name?: string;
    party_b_contact?: string;
    start_date: string;
    end_date?: string;
    salary?: number;
    probation_period_days?: number;
    contract_file_path?: string;
    reminder_days?: number;
    status: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}
export interface ContractRenewal {
    id: string;
    contract_id: string;
    previous_contract_id?: string;
    renewal_type: string;
    renewal_reason?: string;
    new_start_date: string;
    new_end_date?: string;
    new_salary?: number;
    status: string;
    approver_id?: string;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
}
export interface TrainingPlan {
    id: string;
    name: string;
    code?: string;
    description?: string;
    start_date: string;
    end_date: string;
    status: string;
    budget?: number;
    created_at: string;
    updated_at: string;
}
export interface TrainingCourse {
    id: string;
    plan_id: string;
    name: string;
    code?: string;
    category: string;
    level: string;
    description?: string;
    duration_hours?: number;
    instructor_id?: string;
    instructor_name?: string;
    location?: string;
    max_participants?: number;
    enrolled_count?: number;
    start_date?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface TrainingRecord {
    id: string;
    course_id: string;
    employee_id: string;
    enrollment_date: string;
    attendance_status: string;
    completion_status: string;
    score?: number;
    certificate_no?: string;
    completed_at?: string;
    feedback?: string;
    created_at: string;
    updated_at: string;
}
export interface PaginationParams {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    employee_id?: string;
    department_id?: string;
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
}
export interface ListParams {
    page?: number;
    page_size?: number;
    [key: string]: string | number | undefined;
}
interface CrudOperations<T> {
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<T>>>;
    get: (id: string) => Promise<ApiResponse<T>>;
    create: (data: Partial<T>) => Promise<ApiResponse<T>>;
    update: (id: string, data: Partial<T>) => Promise<ApiResponse<T>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
}
export declare const companyApi: CrudOperations<Company>;
export declare const departmentApi: CrudOperations<Department>;
export declare const employeeApi: CrudOperations<Employee>;
export declare const roleApi: CrudOperations<Role>;
export declare const positionApi: CrudOperations<Position>;
export declare const candidateApi: CrudOperations<Candidate>;
export declare const leaveApi: {
    approve(id: string, approver_id: string): Promise<ApiResponse<LeaveRequest>>;
    reject(id: string, approver_id: string, reason: string): Promise<ApiResponse<LeaveRequest>>;
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<LeaveRequest>>>;
    get: (id: string) => Promise<ApiResponse<LeaveRequest>>;
    create: (data: Partial<LeaveRequest>) => Promise<ApiResponse<LeaveRequest>>;
    update: (id: string, data: Partial<LeaveRequest>) => Promise<ApiResponse<LeaveRequest>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const attendanceApi: {
    list(params?: ListParams): Promise<ApiResponse<PaginatedResult<AttendanceRecord>>>;
    checkIn(employee_id: string): Promise<ApiResponse<AttendanceRecord>>;
    checkOut(employee_id: string): Promise<ApiResponse<AttendanceRecord>>;
    get: (id: string) => Promise<ApiResponse<AttendanceRecord>>;
    create: (data: Partial<AttendanceRecord>) => Promise<ApiResponse<AttendanceRecord>>;
    update: (id: string, data: Partial<AttendanceRecord>) => Promise<ApiResponse<AttendanceRecord>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const jobOpeningApi: {
    list(params?: ListParams): Promise<ApiResponse<PaginatedResult<JobOpening>>>;
    publish(id: string): Promise<ApiResponse<JobOpening>>;
    close(id: string): Promise<ApiResponse<JobOpening>>;
    get: (id: string) => Promise<ApiResponse<JobOpening>>;
    create: (data: Partial<JobOpening>) => Promise<ApiResponse<JobOpening>>;
    update: (id: string, data: Partial<JobOpening>) => Promise<ApiResponse<JobOpening>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const interviewApi: {
    list(params?: ListParams): Promise<ApiResponse<PaginatedResult<Interview>>>;
    complete(id: string, data: Partial<Interview>): Promise<ApiResponse<Interview>>;
    get: (id: string) => Promise<ApiResponse<Interview>>;
    create: (data: Partial<Interview>) => Promise<ApiResponse<Interview>>;
    update: (id: string, data: Partial<Interview>) => Promise<ApiResponse<Interview>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const payrollApi: {
    list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PayrollRun>>>;
    get(id: string): Promise<ApiResponse<{
        run: PayrollRun;
        items: PayrollItem[];
    }>>;
    create(data: {
        pay_period: string;
    }): Promise<ApiResponse<PayrollRun>>;
    delete(id: string): Promise<ApiResponse<string>>;
    calculate(id: string): Promise<ApiResponse<PayrollRun>>;
    pay(id: string): Promise<ApiResponse<PayrollRun>>;
};
export declare const payrollItemApi: {
    list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PayrollItem>>>;
    get(id: string): Promise<ApiResponse<{
        item: PayrollItem;
        details: any[];
    }>>;
};
export declare const performanceReviewApi: {
    list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PerformanceReview>>>;
    submit(id: string): Promise<ApiResponse<PerformanceReview>>;
    approve(id: string): Promise<ApiResponse<PerformanceReview>>;
    get: (id: string) => Promise<ApiResponse<PerformanceReview>>;
    create: (data: Partial<PerformanceReview>) => Promise<ApiResponse<PerformanceReview>>;
    update: (id: string, data: Partial<PerformanceReview>) => Promise<ApiResponse<PerformanceReview>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const performanceGoalApi: CrudOperations<PerformanceGoal>;
export declare const employeePerformanceApi: {
    getReviews(employee_id: string): Promise<ApiResponse<{
        items: PerformanceReview[];
        total: number;
    }>>;
    getGoals(employee_id: string): Promise<ApiResponse<{
        items: PerformanceGoal[];
        total: number;
    }>>;
};
export interface SalaryAdjustment {
    id: string;
    employee_id: string;
    employee_name?: string;
    department?: string;
    adjustment_type: "promotion" | "demotion" | "bonus" | "deduction";
    old_salary: number;
    new_salary: number;
    adjustment_amount: number;
    reason?: string;
    effective_date?: string;
    status: "pending" | "approved" | "rejected";
    approver_id?: string;
    approved_at?: string;
    rejection_reason?: string;
    created_at?: string;
    updated_at?: string;
}
export declare const salaryAdjustmentApi: {
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<SalaryAdjustment>>>;
    get: (id: string) => Promise<ApiResponse<SalaryAdjustment>>;
    create: (data: Partial<SalaryAdjustment>) => Promise<ApiResponse<SalaryAdjustment>>;
    update: (id: string, data: Partial<SalaryAdjustment>) => Promise<ApiResponse<SalaryAdjustment>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
    approve: (id: string, approverId: string) => Promise<ApiResponse<SalaryAdjustment>>;
    reject: (id: string, approverId: string, reason: string) => Promise<ApiResponse<SalaryAdjustment>>;
};
export declare const contractApi: {
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Contract>>>;
    get: (id: string) => Promise<ApiResponse<{
        contract: Contract;
        renewals: ContractRenewal[];
    }>>;
    create: (data: Partial<Contract>) => Promise<ApiResponse<Contract>>;
    update: (id: string, data: Partial<Contract>) => Promise<ApiResponse<Contract>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
    getExpiring: (params?: {
        days?: number;
        page?: number;
        page_size?: number;
    }) => Promise<ApiResponse<PaginatedResult<Contract>>>;
    renew: (contract_id: string, data: Partial<ContractRenewal>) => Promise<ApiResponse<ContractRenewal>>;
};
export declare const contractRenewalApi: {
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<ContractRenewal>>>;
    get: (id: string) => Promise<ApiResponse<ContractRenewal>>;
    update: (id: string, data: Partial<ContractRenewal>) => Promise<ApiResponse<ContractRenewal>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
    approve: (id: string) => Promise<ApiResponse<ContractRenewal>>;
    reject: (id: string, reason: string) => Promise<ApiResponse<ContractRenewal>>;
    execute: (id: string) => Promise<ApiResponse<any>>;
};
export declare const trainingPlanApi: {
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<TrainingPlan>>>;
    get: (id: string) => Promise<ApiResponse<TrainingPlan>>;
    create: (data: Partial<TrainingPlan>) => Promise<ApiResponse<TrainingPlan>>;
    update: (id: string, data: Partial<TrainingPlan>) => Promise<ApiResponse<TrainingPlan>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
    activate: (id: string) => Promise<ApiResponse<TrainingPlan>>;
    deactivate: (id: string) => Promise<ApiResponse<TrainingPlan>>;
};
export declare const trainingCourseApi: {
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<TrainingCourse>>>;
    get: (id: string) => Promise<ApiResponse<TrainingCourse>>;
    create: (data: Partial<TrainingCourse>) => Promise<ApiResponse<TrainingCourse>>;
    update: (id: string, data: Partial<TrainingCourse>) => Promise<ApiResponse<TrainingCourse>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const trainingRecordApi: {
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<TrainingRecord>>>;
    get: (id: string) => Promise<ApiResponse<TrainingRecord>>;
    create: (data: Partial<TrainingRecord>) => Promise<ApiResponse<TrainingRecord>>;
    update: (id: string, data: Partial<TrainingRecord>) => Promise<ApiResponse<TrainingRecord>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
    enroll: (course_id: string, employee_id: string) => Promise<ApiResponse<TrainingRecord>>;
    complete: (id: string, data: Partial<TrainingRecord>) => Promise<ApiResponse<TrainingRecord>>;
};
export declare const hrmApi: {
    companies: CrudOperations<Company>;
    departments: CrudOperations<Department>;
    employees: CrudOperations<Employee>;
    positions: CrudOperations<Position>;
    leave: {
        approve(id: string, approver_id: string): Promise<ApiResponse<LeaveRequest>>;
        reject(id: string, approver_id: string, reason: string): Promise<ApiResponse<LeaveRequest>>;
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<LeaveRequest>>>;
        get: (id: string) => Promise<ApiResponse<LeaveRequest>>;
        create: (data: Partial<LeaveRequest>) => Promise<ApiResponse<LeaveRequest>>;
        update: (id: string, data: Partial<LeaveRequest>) => Promise<ApiResponse<LeaveRequest>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    attendance: {
        list(params?: ListParams): Promise<ApiResponse<PaginatedResult<AttendanceRecord>>>;
        checkIn(employee_id: string): Promise<ApiResponse<AttendanceRecord>>;
        checkOut(employee_id: string): Promise<ApiResponse<AttendanceRecord>>;
        get: (id: string) => Promise<ApiResponse<AttendanceRecord>>;
        create: (data: Partial<AttendanceRecord>) => Promise<ApiResponse<AttendanceRecord>>;
        update: (id: string, data: Partial<AttendanceRecord>) => Promise<ApiResponse<AttendanceRecord>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    jobOpenings: {
        list(params?: ListParams): Promise<ApiResponse<PaginatedResult<JobOpening>>>;
        publish(id: string): Promise<ApiResponse<JobOpening>>;
        close(id: string): Promise<ApiResponse<JobOpening>>;
        get: (id: string) => Promise<ApiResponse<JobOpening>>;
        create: (data: Partial<JobOpening>) => Promise<ApiResponse<JobOpening>>;
        update: (id: string, data: Partial<JobOpening>) => Promise<ApiResponse<JobOpening>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    candidates: CrudOperations<Candidate>;
    interviews: {
        list(params?: ListParams): Promise<ApiResponse<PaginatedResult<Interview>>>;
        complete(id: string, data: Partial<Interview>): Promise<ApiResponse<Interview>>;
        get: (id: string) => Promise<ApiResponse<Interview>>;
        create: (data: Partial<Interview>) => Promise<ApiResponse<Interview>>;
        update: (id: string, data: Partial<Interview>) => Promise<ApiResponse<Interview>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    payroll: {
        list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PayrollRun>>>;
        get(id: string): Promise<ApiResponse<{
            run: PayrollRun;
            items: PayrollItem[];
        }>>;
        create(data: {
            pay_period: string;
        }): Promise<ApiResponse<PayrollRun>>;
        delete(id: string): Promise<ApiResponse<string>>;
        calculate(id: string): Promise<ApiResponse<PayrollRun>>;
        pay(id: string): Promise<ApiResponse<PayrollRun>>;
    };
    salaryAdjustments: {
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<SalaryAdjustment>>>;
        get: (id: string) => Promise<ApiResponse<SalaryAdjustment>>;
        create: (data: Partial<SalaryAdjustment>) => Promise<ApiResponse<SalaryAdjustment>>;
        update: (id: string, data: Partial<SalaryAdjustment>) => Promise<ApiResponse<SalaryAdjustment>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
        approve: (id: string, approverId: string) => Promise<ApiResponse<SalaryAdjustment>>;
        reject: (id: string, approverId: string, reason: string) => Promise<ApiResponse<SalaryAdjustment>>;
    };
    performanceReviews: {
        list(params?: ListParams): Promise<ApiResponse<PaginatedResult<PerformanceReview>>>;
        submit(id: string): Promise<ApiResponse<PerformanceReview>>;
        approve(id: string): Promise<ApiResponse<PerformanceReview>>;
        get: (id: string) => Promise<ApiResponse<PerformanceReview>>;
        create: (data: Partial<PerformanceReview>) => Promise<ApiResponse<PerformanceReview>>;
        update: (id: string, data: Partial<PerformanceReview>) => Promise<ApiResponse<PerformanceReview>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    performanceGoals: CrudOperations<PerformanceGoal>;
    contracts: {
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Contract>>>;
        get: (id: string) => Promise<ApiResponse<{
            contract: Contract;
            renewals: ContractRenewal[];
        }>>;
        create: (data: Partial<Contract>) => Promise<ApiResponse<Contract>>;
        update: (id: string, data: Partial<Contract>) => Promise<ApiResponse<Contract>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
        getExpiring: (params?: {
            days?: number;
            page?: number;
            page_size?: number;
        }) => Promise<ApiResponse<PaginatedResult<Contract>>>;
        renew: (contract_id: string, data: Partial<ContractRenewal>) => Promise<ApiResponse<ContractRenewal>>;
    };
    contractRenewals: {
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<ContractRenewal>>>;
        get: (id: string) => Promise<ApiResponse<ContractRenewal>>;
        update: (id: string, data: Partial<ContractRenewal>) => Promise<ApiResponse<ContractRenewal>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
        approve: (id: string) => Promise<ApiResponse<ContractRenewal>>;
        reject: (id: string, reason: string) => Promise<ApiResponse<ContractRenewal>>;
        execute: (id: string) => Promise<ApiResponse<any>>;
    };
    trainingPlans: {
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<TrainingPlan>>>;
        get: (id: string) => Promise<ApiResponse<TrainingPlan>>;
        create: (data: Partial<TrainingPlan>) => Promise<ApiResponse<TrainingPlan>>;
        update: (id: string, data: Partial<TrainingPlan>) => Promise<ApiResponse<TrainingPlan>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
        activate: (id: string) => Promise<ApiResponse<TrainingPlan>>;
        deactivate: (id: string) => Promise<ApiResponse<TrainingPlan>>;
    };
    trainingCourses: {
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<TrainingCourse>>>;
        get: (id: string) => Promise<ApiResponse<TrainingCourse>>;
        create: (data: Partial<TrainingCourse>) => Promise<ApiResponse<TrainingCourse>>;
        update: (id: string, data: Partial<TrainingCourse>) => Promise<ApiResponse<TrainingCourse>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    trainingRecords: {
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<TrainingRecord>>>;
        get: (id: string) => Promise<ApiResponse<TrainingRecord>>;
        create: (data: Partial<TrainingRecord>) => Promise<ApiResponse<TrainingRecord>>;
        update: (id: string, data: Partial<TrainingRecord>) => Promise<ApiResponse<TrainingRecord>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
        enroll: (course_id: string, employee_id: string) => Promise<ApiResponse<TrainingRecord>>;
        complete: (id: string, data: Partial<TrainingRecord>) => Promise<ApiResponse<TrainingRecord>>;
    };
    health: () => Promise<ApiResponse<string>>;
};
export {};
