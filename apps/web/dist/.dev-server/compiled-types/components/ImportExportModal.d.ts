import React from "react";
import type { ExportColumn } from "@/utils/importExport";
interface ImportExportModalProps<T> {
    open: boolean;
    onOpenChange: (_open: boolean) => void;
    data: T[];
    columns: ExportColumn<T>[];
    fileName: string;
    onImportSuccess?: (_data: T[]) => void;
    transform?: (_raw: Record<string, any>) => T;
}
export declare const ImportExportModal: <T extends Record<string, any>>({ open, onOpenChange, data, columns, fileName, onImportSuccess, transform, }: ImportExportModalProps<T>) => React.JSX.Element;
export default ImportExportModal;
