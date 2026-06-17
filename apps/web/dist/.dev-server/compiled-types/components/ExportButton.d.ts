import React from "react";
import type { ExportFormat } from "@/api/report";
interface ExportButtonProps {
    data: any[];
    columns: string[];
    filename: string;
    format?: ExportFormat;
    buttonText?: string;
    buttonClassName?: string;
    disabled?: boolean;
    onExportStart?: () => void;
    onExportComplete?: () => void;
    onExportError?: (_error: Error) => void;
}
declare const ExportButton: React.FC<ExportButtonProps>;
export default ExportButton;
