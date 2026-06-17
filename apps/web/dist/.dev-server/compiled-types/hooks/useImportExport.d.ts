export interface UseImportExportOptions {
    apiEndpoint: string;
}
export declare const useImportExport: ({ apiEndpoint }: UseImportExportOptions) => {
    importData: (file: File, entityType: string, importMode: string, skipErrors?: boolean) => Promise<any>;
    exportData: (entityType: string, fileFormat: string, columns?: string[], filters?: Record<string, string>) => Promise<any>;
    getImportTemplates: () => Promise<any>;
    getImportStatus: (importId: string) => Promise<any>;
    isImporting: boolean;
    isExporting: boolean;
    error: string | null;
};
