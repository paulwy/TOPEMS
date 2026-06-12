import { Search, Download } from "lucide-react";

interface AddressbookHeaderProps {
  searchQuery: string;
  onSearchChange: (_query: string) => void;
  onExport: () => void;
}

export const AddressbookHeader: React.FC<AddressbookHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onExport,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索联系人、部门或公司..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center space-x-3 ml-4">
          <button
            onClick={onExport}
            className="flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>导出</span>
          </button>
        </div>
      </div>
    </div>
  );
};
