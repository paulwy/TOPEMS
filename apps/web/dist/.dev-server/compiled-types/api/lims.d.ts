import type { ApiResponse } from "./client";
export interface Sample {
    id: string;
    sample_no?: string;
    name: string;
    description: string;
    status: string;
    project_id?: string;
    location?: string;
    responsible_person?: string;
    received_date: string;
    created_at: string;
    updated_at: string;
}
export interface CreateSampleRequest {
    name: string;
    description: string;
    status: string;
    project_id?: string;
    received_date?: string;
}
export interface InspectionStep {
    id: string;
    name: string;
    description: string;
    order: number;
    required: boolean;
}
export interface InspectionProcess {
    id: string;
    name: string;
    description: string;
    steps: InspectionStep[];
    status: string;
    created_at: string;
    updated_at: string;
}
export interface InspectionTask {
    id: string;
    task_no?: string;
    sample_id: string;
    sample_name?: string;
    process_id: string;
    current_step: number;
    status: string;
    inspector: string;
    started_at: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateInspectionTaskRequest {
    sample_id: string;
    process_id: string;
    inspector: string;
}
export interface InspectionRecord {
    id: string;
    task_id: string;
    step_id: string;
    step_name: string;
    result: string;
    conclusion: string;
    inspector: string;
    recorded_at: string;
    created_at: string;
}
export interface CreateInspectionRecordRequest {
    task_id: string;
    step_id: string;
    step_name: string;
    result: string;
    conclusion: string;
    inspector: string;
}
export interface BatchCreateSamplesRequest {
    samples: CreateSampleRequest[];
}
export interface BatchDeleteSamplesRequest {
    ids: string[];
}
export interface BatchOperationResult {
    total: number;
    success: number;
    failed: number;
    errors: string[];
}
export interface ListParams {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    project_id?: string;
    [key: string]: string | number | undefined;
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
}
export interface Instrument {
    id: string;
    name: string;
    code: string;
    type: string;
    category?: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    location?: string;
    status: string;
    purchase_date?: string;
    calibration_date?: string;
    next_calibration_date?: string;
    responsible_person?: string;
    description?: string;
    maintenance_records?: MaintenanceRecord[];
    created_at: string;
    updated_at: string;
}
export interface CreateInstrumentRequest {
    name: string;
    code: string;
    type: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    location?: string;
    status?: string;
    purchase_date?: string;
    calibration_date?: string;
    next_calibration_date?: string;
    responsible_person?: string;
    description?: string;
}
export interface MaintenanceRecord {
    id: string;
    instrument_id: string;
    maintenance_type: string;
    description: string;
    performed_by: string;
    performed_at: string;
    next_maintenance_date?: string;
    cost?: number;
    notes?: string;
    created_at: string;
}
export interface CreateMaintenanceRecordRequest {
    instrument_id: string;
    maintenance_type: string;
    description: string;
    performed_by: string;
    performed_at: string;
    next_maintenance_date?: string;
    cost?: number;
    notes?: string;
}
export declare const instrumentApi: {
    listInstruments: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Instrument>>>;
    getInstrument: (id: string) => Promise<ApiResponse<Instrument>>;
    createInstrument: (data: CreateInstrumentRequest) => Promise<ApiResponse<Instrument>>;
    updateInstrument: (id: string, data: CreateInstrumentRequest) => Promise<ApiResponse<Instrument>>;
    deleteInstrument: (id: string) => Promise<ApiResponse<string>>;
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Instrument>>>;
    get: (id: string) => Promise<ApiResponse<Instrument>>;
    create: (data: Partial<Instrument>) => Promise<ApiResponse<Instrument>>;
    update: (id: string, data: Partial<Instrument>) => Promise<ApiResponse<Instrument>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const maintenanceApi: {
    listByInstrument: (instrumentId: string) => Promise<ApiResponse<MaintenanceRecord[]>>;
    create: (data: CreateMaintenanceRecordRequest) => Promise<ApiResponse<MaintenanceRecord>>;
    update: (id: string, data: Partial<CreateMaintenanceRecordRequest>) => Promise<ApiResponse<MaintenanceRecord>>;
    delete: (id: string) => Promise<ApiResponse<boolean>>;
};
export declare const sampleApi: {
    listSamples: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Sample>>>;
    getSample: (id: string) => Promise<ApiResponse<Sample>>;
    createSample: (data: CreateSampleRequest) => Promise<ApiResponse<Sample>>;
    updateSample: (id: string, data: CreateSampleRequest) => Promise<ApiResponse<Sample>>;
    deleteSample: (id: string) => Promise<ApiResponse<string>>;
    batchCreateSamples: (data: BatchCreateSamplesRequest) => Promise<ApiResponse<BatchOperationResult>>;
    batchDeleteSamples: (data: BatchDeleteSamplesRequest) => Promise<ApiResponse<BatchOperationResult>>;
    exportSamples: () => Promise<Blob>;
    importSamples: (file: File) => Promise<ApiResponse<BatchOperationResult>>;
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Sample>>>;
    get: (id: string) => Promise<ApiResponse<Sample>>;
    create: (data: Partial<Sample>) => Promise<ApiResponse<Sample>>;
    update: (id: string, data: Partial<Sample>) => Promise<ApiResponse<Sample>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const processApi: {
    listProcesses: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionProcess>>>;
    getProcess: (id: string) => Promise<ApiResponse<InspectionProcess>>;
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionProcess>>>;
    get: (id: string) => Promise<ApiResponse<InspectionProcess>>;
    create: (data: Partial<InspectionProcess>) => Promise<ApiResponse<InspectionProcess>>;
    update: (id: string, data: Partial<InspectionProcess>) => Promise<ApiResponse<InspectionProcess>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const taskApi: {
    listTasks: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionTask>>>;
    createTask: (data: CreateInspectionTaskRequest) => Promise<ApiResponse<InspectionTask>>;
    getTask: (id: string) => Promise<ApiResponse<InspectionTask>>;
    updateTask: (id: string, data: CreateInspectionTaskRequest) => Promise<ApiResponse<InspectionTask>>;
    listTasksBySample: (sampleId: string) => Promise<ApiResponse<InspectionTask[]>>;
    completeStep: (id: string, data: Omit<CreateInspectionRecordRequest, "task_id">) => Promise<ApiResponse<InspectionTask>>;
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionTask>>>;
    get: (id: string) => Promise<ApiResponse<InspectionTask>>;
    create: (data: Partial<InspectionTask>) => Promise<ApiResponse<InspectionTask>>;
    update: (id: string, data: Partial<InspectionTask>) => Promise<ApiResponse<InspectionTask>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export declare const recordApi: {
    listRecords: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionRecord>>>;
    createRecord: (data: CreateInspectionRecordRequest) => Promise<ApiResponse<InspectionRecord>>;
    listRecordsByTask: (taskId: string) => Promise<ApiResponse<InspectionRecord[]>>;
    list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionRecord>>>;
    get: (id: string) => Promise<ApiResponse<InspectionRecord>>;
    create: (data: Partial<InspectionRecord>) => Promise<ApiResponse<InspectionRecord>>;
    update: (id: string, data: Partial<InspectionRecord>) => Promise<ApiResponse<InspectionRecord>>;
    delete: (id: string) => Promise<ApiResponse<string>>;
};
export interface LimsStatistics {
    total_samples: number;
    pending_samples: number;
    testing_samples: number;
    completed_samples: number;
    cancelled_samples: number;
    total_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    completed_tasks: number;
    total_processes: number;
    total_instruments: number;
    normal_instruments: number;
    calibration_instruments: number;
    maintenance_instruments: number;
    disabled_instruments: number;
}
export interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    entity_ids?: string[] | null;
    user_id?: string;
    user_name?: string;
    request_details?: any;
    response_details?: any;
    status: "success" | "partial" | "error";
    error_message?: string;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}
export interface AuditLogQueryParams {
    action?: string;
    entity_type?: string;
    user_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
}
export declare const auditLimsApi: {
    listAuditLogs: (params?: AuditLogQueryParams) => Promise<ApiResponse<{
        audit_logs: AuditLog[];
        total: number;
    }>>;
    getAuditLog: (id: string) => Promise<ApiResponse<AuditLog>>;
};
export declare const limsApi: {
    samples: {
        listSamples: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Sample>>>;
        getSample: (id: string) => Promise<ApiResponse<Sample>>;
        createSample: (data: CreateSampleRequest) => Promise<ApiResponse<Sample>>;
        updateSample: (id: string, data: CreateSampleRequest) => Promise<ApiResponse<Sample>>;
        deleteSample: (id: string) => Promise<ApiResponse<string>>;
        batchCreateSamples: (data: BatchCreateSamplesRequest) => Promise<ApiResponse<BatchOperationResult>>;
        batchDeleteSamples: (data: BatchDeleteSamplesRequest) => Promise<ApiResponse<BatchOperationResult>>;
        exportSamples: () => Promise<Blob>;
        importSamples: (file: File) => Promise<ApiResponse<BatchOperationResult>>;
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Sample>>>;
        get: (id: string) => Promise<ApiResponse<Sample>>;
        create: (data: Partial<Sample>) => Promise<ApiResponse<Sample>>;
        update: (id: string, data: Partial<Sample>) => Promise<ApiResponse<Sample>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    processes: {
        listProcesses: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionProcess>>>;
        getProcess: (id: string) => Promise<ApiResponse<InspectionProcess>>;
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionProcess>>>;
        get: (id: string) => Promise<ApiResponse<InspectionProcess>>;
        create: (data: Partial<InspectionProcess>) => Promise<ApiResponse<InspectionProcess>>;
        update: (id: string, data: Partial<InspectionProcess>) => Promise<ApiResponse<InspectionProcess>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    tasks: {
        listTasks: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionTask>>>;
        createTask: (data: CreateInspectionTaskRequest) => Promise<ApiResponse<InspectionTask>>;
        getTask: (id: string) => Promise<ApiResponse<InspectionTask>>;
        updateTask: (id: string, data: CreateInspectionTaskRequest) => Promise<ApiResponse<InspectionTask>>;
        listTasksBySample: (sampleId: string) => Promise<ApiResponse<InspectionTask[]>>;
        completeStep: (id: string, data: Omit<CreateInspectionRecordRequest, "task_id">) => Promise<ApiResponse<InspectionTask>>;
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionTask>>>;
        get: (id: string) => Promise<ApiResponse<InspectionTask>>;
        create: (data: Partial<InspectionTask>) => Promise<ApiResponse<InspectionTask>>;
        update: (id: string, data: Partial<InspectionTask>) => Promise<ApiResponse<InspectionTask>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    records: {
        listRecords: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionRecord>>>;
        createRecord: (data: CreateInspectionRecordRequest) => Promise<ApiResponse<InspectionRecord>>;
        listRecordsByTask: (taskId: string) => Promise<ApiResponse<InspectionRecord[]>>;
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionRecord>>>;
        get: (id: string) => Promise<ApiResponse<InspectionRecord>>;
        create: (data: Partial<InspectionRecord>) => Promise<ApiResponse<InspectionRecord>>;
        update: (id: string, data: Partial<InspectionRecord>) => Promise<ApiResponse<InspectionRecord>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    instruments: {
        listInstruments: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Instrument>>>;
        getInstrument: (id: string) => Promise<ApiResponse<Instrument>>;
        createInstrument: (data: CreateInstrumentRequest) => Promise<ApiResponse<Instrument>>;
        updateInstrument: (id: string, data: CreateInstrumentRequest) => Promise<ApiResponse<Instrument>>;
        deleteInstrument: (id: string) => Promise<ApiResponse<string>>;
        list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Instrument>>>;
        get: (id: string) => Promise<ApiResponse<Instrument>>;
        create: (data: Partial<Instrument>) => Promise<ApiResponse<Instrument>>;
        update: (id: string, data: Partial<Instrument>) => Promise<ApiResponse<Instrument>>;
        delete: (id: string) => Promise<ApiResponse<string>>;
    };
    maintenance: {
        listByInstrument: (instrumentId: string) => Promise<ApiResponse<MaintenanceRecord[]>>;
        create: (data: CreateMaintenanceRecordRequest) => Promise<ApiResponse<MaintenanceRecord>>;
        update: (id: string, data: Partial<CreateMaintenanceRecordRequest>) => Promise<ApiResponse<MaintenanceRecord>>;
        delete: (id: string) => Promise<ApiResponse<boolean>>;
    };
    audit: {
        listAuditLogs: (params?: AuditLogQueryParams) => Promise<ApiResponse<{
            audit_logs: AuditLog[];
            total: number;
        }>>;
        getAuditLog: (id: string) => Promise<ApiResponse<AuditLog>>;
    };
    listSamples: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Sample>>>;
    getSample: (id: string) => Promise<ApiResponse<Sample>>;
    createSample: (data: CreateSampleRequest) => Promise<ApiResponse<Sample>>;
    updateSample: (id: string, data: CreateSampleRequest) => Promise<ApiResponse<Sample>>;
    deleteSample: (id: string) => Promise<ApiResponse<string>>;
    batchCreateSamples: (data: BatchCreateSamplesRequest) => Promise<ApiResponse<BatchOperationResult>>;
    batchDeleteSamples: (data: BatchDeleteSamplesRequest) => Promise<ApiResponse<BatchOperationResult>>;
    exportSamples: () => Promise<Blob>;
    importSamples: (file: File) => Promise<ApiResponse<BatchOperationResult>>;
    listProcesses: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionProcess>>>;
    getProcess: (id: string) => Promise<ApiResponse<InspectionProcess>>;
    listTasks: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionTask>>>;
    createTask: (data: CreateInspectionTaskRequest) => Promise<ApiResponse<InspectionTask>>;
    getTask: (id: string) => Promise<ApiResponse<InspectionTask>>;
    updateTask: (id: string, data: CreateInspectionTaskRequest) => Promise<ApiResponse<InspectionTask>>;
    completeStep: (id: string, data: Omit<CreateInspectionRecordRequest, "task_id">) => Promise<ApiResponse<InspectionTask>>;
    listTasksBySample: (sampleId: string) => Promise<ApiResponse<InspectionTask[]>>;
    listRecords: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<InspectionRecord>>>;
    createRecord: (data: CreateInspectionRecordRequest) => Promise<ApiResponse<InspectionRecord>>;
    listRecordsByTask: (taskId: string) => Promise<ApiResponse<InspectionRecord[]>>;
    listInstruments: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<Instrument>>>;
    getInstrument: (id: string) => Promise<ApiResponse<Instrument>>;
    createInstrument: (data: CreateInstrumentRequest) => Promise<ApiResponse<Instrument>>;
    updateInstrument: (id: string, data: CreateInstrumentRequest) => Promise<ApiResponse<Instrument>>;
    deleteInstrument: (id: string) => Promise<ApiResponse<string>>;
    listMaintenanceByInstrument: (instrumentId: string) => Promise<ApiResponse<MaintenanceRecord[]>>;
    createMaintenance: (data: CreateMaintenanceRecordRequest) => Promise<ApiResponse<MaintenanceRecord>>;
    updateMaintenance: (id: string, data: Partial<CreateMaintenanceRecordRequest>) => Promise<ApiResponse<MaintenanceRecord>>;
    deleteMaintenance: (id: string) => Promise<ApiResponse<boolean>>;
    getStatistics: () => Promise<ApiResponse<LimsStatistics>>;
    health: () => Promise<ApiResponse<string>>;
};
export default limsApi;
