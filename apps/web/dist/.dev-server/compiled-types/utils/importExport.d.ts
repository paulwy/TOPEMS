export declare const parseFileExtension: (filename: string) => string;
export declare const getImportModeLabel: (mode: string) => string;
export declare const readFileAsBase64: (file: File) => Promise<string>;
export declare const downloadBase64File: (base64Data: string, filename: string) => void;
export interface ExportColumn<T> {
    key: keyof T;
    label: string;
    format?: (value: any) => string;
}
export declare const exportToExcel: <T>(data: T[], columns: ExportColumn<T>[], fileName?: string) => void;
export interface ImportResult<T> {
    success: boolean;
    data: T[];
    errors: {
        row: number;
        message: string;
    }[];
}
export declare const importFromExcel: <T>(file: File, columns: ExportColumn<T>[], transform?: (raw: Record<string, any>) => T) => Promise<ImportResult<T>>;
export declare const exportToCSV: <T>(data: T[], columns: ExportColumn<T>[], fileName?: string) => void;
export declare const downloadTemplate: <T>(columns: ExportColumn<T>[], fileName?: string) => void;
