import React from "react";
import { Download } from "lucide-react";

export interface ExportDropdownProps {
  onExport: (format: string, columns?: string[]) => void;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  className?: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  onExport,
  options = [
    { value: "csv", label: "导出为 CSV" },
    { value: "xlsx", label: "导出为 Excel" },
  ],
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4 mr-2" />
        导出
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onExport(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ExportDropdown;
