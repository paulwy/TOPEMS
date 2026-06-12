import React from "react";
import { Upload } from "lucide-react";

export interface ImportButtonProps {
  onImport: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const ImportButton: React.FC<ImportButtonProps> = ({
  onImport,
  label = "导入",
  disabled = false,
  className = "",
}) => {
  return (
    <button
      onClick={onImport}
      disabled={disabled}
      className={`inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Upload className="w-4 h-4 mr-2" />
      {label}
    </button>
  );
};

export default ImportButton;
