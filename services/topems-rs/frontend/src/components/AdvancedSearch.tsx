import React, { useState, useEffect } from 'react';

export interface FilterOption {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'checkbox';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface SearchProps {
  filters: FilterOption[];
  onSearch: (filters: Record<string, string | boolean>) => void;
  onReset: () => void;
  initialValues?: Record<string, string | boolean>;
}

const AdvancedSearch: React.FC<SearchProps> = ({ filters, onSearch, onReset, initialValues }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    if (initialValues) {
      setFilterValues(initialValues);
    }
  }, [initialValues]);

  const handleFilterChange = (id: string, value: string | boolean) => {
    setFilterValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    const filters: Record<string, string | boolean> = {};
    if (searchTerm) {
      filters['q'] = searchTerm;
    }
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value !== '' && value !== false && value !== undefined) {
        filters[key] = value;
      }
    });
    onSearch(filters);
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilterValues({});
    onReset();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="快速搜索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            showAdvanced
              ? 'bg-primary-100 border-primary-300 text-primary-700'
              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          高级搜索
        </button>
        
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          搜索
        </button>
        
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          重置
        </button>
      </div>

      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                {filter.type === 'select' && (
                  <select
                    value={(filterValues[filter.id] as string) || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">全部</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                {filter.type === 'text' && (
                  <input
                    type="text"
                    placeholder={filter.placeholder}
                    value={(filterValues[filter.id] as string) || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                )}
                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={(filterValues[filter.id] as string) || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                )}
                {filter.type === 'checkbox' && (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterValues[filter.id] as boolean || false}
                      onChange={(e) => handleFilterChange(filter.id, e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">是</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
