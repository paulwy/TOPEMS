import React, { useState, useCallback } from 'react';

interface Filter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface SearchBarProps {
  onSearch: (keyword: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  filters?: Filter[];
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onFilterChange,
  filters = [],
  placeholder = '搜索...',
}) => {
  const [keyword, setKeyword] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});

  const handleKeywordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    onSearch(value);
  }, [onSearch]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    const newFilters = { ...selectedFilters, [key]: value };
    setSelectedFilters(newFilters);
    onFilterChange?.(newFilters);
  }, [selectedFilters, onFilterChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
      <div className="flex-1">
        <input
          type="text"
          value={keyword}
          onChange={handleKeywordChange}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      {filters.map((filter) => (
        <div key={filter.key} className="w-full sm:w-48">
          <select
            value={selectedFilters[filter.key] || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{filter.label}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};
