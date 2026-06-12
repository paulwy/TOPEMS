import { useState } from "react";
import { Image, Download, FileImage, Copy, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface ChartExportProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
}

const exportFormats = [
  { id: "png", label: "PNG", mimeType: "image/png" },
  { id: "jpeg", label: "JPEG", mimeType: "image/jpeg" },
  { id: "svg", label: "SVG", mimeType: "image/svg+xml" },
];

export const ChartExport = ({
  chartRef,
  filename = "chart",
}: ChartExportProps) => {
  const [copied, setCopied] = useState(false);

  const handleExport = async (format: string, mimeType: string) => {
    try {
      if (!chartRef.current) return;

      const canvas = chartRef.current.querySelector("canvas");

      if (canvas) {
        const link = document.createElement("a");
        link.download = `${filename}.${format}`;
        link.href = canvas.toDataURL(mimeType);
        link.click();
      } else {
        const svgElement = chartRef.current.querySelector("svg");
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const blob = new Blob([svgData], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `${filename}.${format}`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error("Failed to export chart:", error);
      alert("导出失败，请重试");
    }
  };

  const handleCopy = async () => {
    try {
      if (!chartRef.current) return;

      const canvas = chartRef.current.querySelector("canvas");

      if (canvas) {
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (error) {
      console.error("Failed to copy chart:", error);
      alert("复制失败，请重试");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="gap-1" title="导出图表">
          <Image className="w-4 h-4" />
          <Download className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs text-gray-500 font-medium">
            导出格式
          </div>
          {exportFormats.map((format) => (
            <button
              key={format.id}
              onClick={() => handleExport(format.id, format.mimeType)}
              className="w-full px-3 py-2 text-sm text-left hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <FileImage className="w-4 h-4" />
              导出为 {format.label}
            </button>
          ))}
          <div className="border-t my-2" />
          <button
            onClick={handleCopy}
            className="w-full px-3 py-2 text-sm text-left hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制到剪贴板
              </>
            )}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
