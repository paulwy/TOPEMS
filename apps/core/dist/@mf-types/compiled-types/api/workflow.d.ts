import type { WorkflowDefinition, WorkflowInstance, WorkflowTask, PaginatedResponse } from '@topems/shared-types';
export declare const workflowApi: {
    getDefinitions: (params?: {
        page?: number;
        pageSize?: number;
    }) => Promise<PaginatedResponse<WorkflowDefinition>>;
    getDefinition: (id: string) => Promise<WorkflowDefinition>;
    createDefinition: (data: Partial<WorkflowDefinition>) => Promise<WorkflowDefinition>;
    updateDefinition: (id: string, data: Partial<WorkflowDefinition>) => Promise<WorkflowDefinition>;
    deleteDefinition: (id: string) => Promise<void>;
    getInstances: (params?: {
        page?: number;
        pageSize?: number;
        status?: string;
    }) => Promise<PaginatedResponse<WorkflowInstance>>;
    getInstance: (id: string) => Promise<WorkflowInstance>;
    startInstance: (definitionId: string, variables?: Record<string, any>) => Promise<WorkflowInstance>;
    getTasks: (params?: {
        page?: number;
        pageSize?: number;
        status?: string;
    }) => Promise<PaginatedResponse<WorkflowTask>>;
    completeTask: (taskId: string, action: string, comment?: string) => Promise<void>;
    rejectTask: (taskId: string, comment?: string) => Promise<void>;
};
