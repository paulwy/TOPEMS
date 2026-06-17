export interface MigrationService {
    name: string;
    schema: string;
    port: number;
    description: string;
    tables: number;
}
export interface AppliedMigration {
    version: string;
    name: string;
    applied_at: string;
    duration_ms?: number;
}
export interface MigrationStatus {
    pending: string[];
    applied: AppliedMigration[];
}
export interface MigrationApplyResult {
    files: string[];
    reports: any[];
}
export interface RollbackResult {
    record: any;
}
export declare const migrationApi: {
    listServices(): Promise<MigrationService[]>;
    applyMigration(serviceName: string, type?: "schema" | "index" | "audit"): Promise<MigrationApplyResult>;
    rollbackMigration(serviceName: string, version?: string): Promise<RollbackResult>;
    getMigrationStatus(serviceName: string): Promise<MigrationStatus>;
};
export default migrationApi;
