import React, { useState, type Key } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, X, Plus, ChevronDown } from "lucide-react";
import dayjs from "dayjs";

export interface FilterCondition {
  field: string;
  operator: string;
  value: string | number | Date | null;
}

export interface AdvancedFilterProps<T> {
  fields: {
    key: keyof T;
    label: string;
    type: "text" | "number" | "date" | "select";
  }[];
  selectOptions?: Record<string, { label: string; value: string }[]>;
  onFilterChange: (conditions: FilterCondition[]) => void;
  initialConditions?: FilterCondition[];
}

export const AdvancedFilter = <T extends Record<string, any>>({
  fields,
  selectOptions,
  onFilterChange,
  initialConditions = [],
}: AdvancedFilterProps<T>) => {
  const [conditions, setConditions] =
    useState<FilterCondition[]>(initialConditions);
  const [showDropdown, setShowDropdown] = useState(false);

  const operators: Record<string, { label: string; value: string }[]> = {
    text: [
      { label: "包含", value: "contains" },
      { label: "不包含", value: "not_contains" },
      { label: "等于", value: "equals" },
      { label: "不等于", value: "not_equals" },
      { label: "为空", value: "is_empty" },
    ],
    number: [
      { label: "等于", value: "equals" },
      { label: "不等于", value: "not_equals" },
      { label: "大于", value: "greater_than" },
      { label: "小于", value: "less_than" },
      { label: "大于等于", value: "greater_or_equal" },
      { label: "小于等于", value: "less_or_equal" },
    ],
    date: [
      { label: "等于", value: "equals" },
      { label: "不等于", value: "not_equals" },
      { label: "在之前", value: "before" },
      { label: "在之后", value: "after" },
      { label: "在期间", value: "between" },
    ],
    select: [
      { label: "等于", value: "equals" },
      { label: "不等于", value: "not_equals" },
      { label: "在列表中", value: "in" },
    ],
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: fields[0]?.key as string, operator: "equals", value: null },
    ]);
  };

  const updateCondition = (
    index: number,
    updates: Partial<FilterCondition>,
  ) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const getFieldType = (field: string) => {
    const found = fields.find((f) => f.key === field);
    return found?.type || "text";
  };

  const applyFilters = () => {
    onFilterChange(conditions);
    setShowDropdown(false);
  };

  const resetFilters = () => {
    setConditions([]);
    onFilterChange([]);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <Popover open={showDropdown} onOpenChange={setShowDropdown}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            高级筛选
            <ChevronDown className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[480px] p-4" align="start">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">高级筛选</h4>
            {conditions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="w-4 h-4" />
                重置
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {conditions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>暂无筛选条件</p>
                <p className="text-sm">点击下方按钮添加筛选条件</p>
              </div>
            ) : (
              conditions.map((condition, index) => {
                const fieldType = getFieldType(condition.field);
                const options = selectOptions?.[condition.field];

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                  >
                    <Select
                      value={condition.field}
                      onValueChange={(value) =>
                        updateCondition(index, { field: value })
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="字段" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((field) => (
                          <SelectItem
                            key={String(field.key) as Key}
                            value={String(field.key)}
                          >
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(value) =>
                        updateCondition(index, { operator: value })
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="操作" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators[fieldType]?.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {condition.operator !== "is_empty" && (
                      <div className="flex-1">
                        {fieldType === "select" && options ? (
                          <Select
                            value={String(condition.value || "")}
                            onValueChange={(value) =>
                              updateCondition(index, { value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择值" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : fieldType === "date" ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start"
                              >
                                {condition.value
                                  ? dayjs(condition.value).format("YYYY-MM-DD")
                                  : "选择日期"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={condition.value as Date | undefined}
                                onSelect={(date) =>
                                  updateCondition(index, {
                                    value:
                                      (Array.isArray(date) ? date[0] : date) ||
                                      null,
                                  })
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        ) : fieldType === "number" ? (
                          <Input
                            type="number"
                            placeholder="输入数值"
                            value={condition.value as number | undefined}
                            onChange={(e) =>
                              updateCondition(index, {
                                value: Number(e.target.value),
                              })
                            }
                          />
                        ) : (
                          <Input
                            placeholder="输入值"
                            value={condition.value as string | undefined}
                            onChange={(e) =>
                              updateCondition(index, { value: e.target.value })
                            }
                          />
                        )}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={addCondition}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              添加条件
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDropdown(false)}
              >
                取消
              </Button>
              <Button size="sm" onClick={applyFilters}>
                应用筛选
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {conditions.length > 0 && !showDropdown && (
        <div className="mt-2 flex flex-wrap gap-2">
          {conditions.map((condition, index) => {
            const field = fields.find((f) => f.key === condition.field);
            const fieldLabel = field?.label || condition.field;
            const operator = operators[getFieldType(condition.field)]?.find(
              (op) => op.value === condition.operator,
            );
            return (
              <Badge key={index} variant="secondary" className="gap-1">
                {fieldLabel} {operator?.label}
                {condition.value && ` "${condition.value}"`}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 -ml-1"
                  onClick={() => {
                    const newConditions = conditions.filter(
                      (_, i) => i !== index,
                    );
                    setConditions(newConditions);
                    onFilterChange(newConditions);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;
