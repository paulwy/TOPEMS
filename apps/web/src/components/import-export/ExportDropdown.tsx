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
    <div style={{ position: "relative", display: "inline-block" }} className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        style={{ display: "inline-flex", alignItems: "center", padding: "8px 16px", backgroundColor: "#2563eb", color: "white", borderRadius: 8 }}
        sx={{ "&:hover": { backgroundColor: "#1d4ed8" }, "&:disabled": { opacity: 0.5, cursor: "not-allowed" }, transition: "colors 0.2s" }}
      >
        <Download style={{ width: 16, height: 16, marginRight: 8 }} />
        导出
      </button>

      {isOpen && (
        <>
          <div style={{ position: "fixed", inset: 0 }} onClick={() => setIsOpen(false)} />
          <div style={{ position: "absolute", right: 0, marginTop: 8, width: 192, backgroundColor: "white", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", padding: 4, zIndex: 10 }}>
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onExport(option.value);
                  setIsOpen(false);
                }}
                style={{ width: "100%", padding: "8px 16px", textAlign: "left", fontSize: 14, color: "#334155" }}
                sx={{ "&:hover": { backgroundColor: "#f1f5f9" }, transition: "colors 0.2s" }}
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
