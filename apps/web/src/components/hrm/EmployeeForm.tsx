import React from "react";
import { useAppStore } from "../../store";
import { type Employee, type Department } from "../../api/hrm";
import {
  AIHelperButton,
  AICodeGenerator,
  AIDataCompleter,
  AIFormValidator,
} from "../ai";
import type { CompletionItem } from "../../types/ai";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmployeeFormProps {
  formData: Partial<Employee>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Employee>>>;
  departments: Department[];
  mode: "create" | "edit";
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  formData,
  setFormData,
  departments,
  mode,
  onSubmit,
  onCancel,
}) => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [showAICodeGenerator, setShowAICodeGenerator] = React.useState(false);
  const [showAIDataCompleter, setShowAIDataCompleter] = React.useState(false);
  const [showAIFormValidator, setShowAIFormValidator] = React.useState(false);
  const [existingCodes] = React.useState<string[]>([]);

  const handleInputChange = (
    field: string,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectAICode = (code: string) => {
    setFormData((prev) => ({ ...prev, employee_number: code }));
  };

  const handleApplyCompletion = (
    completions: Record<string, CompletionItem>,
  ) => {
    const updates: Record<string, any> = {};
    Object.entries(completions).forEach(([field, item]) => {
      updates[field] = item.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIDataCompleter(false);
  };

  const handleApplyValidationSuggestions = (suggestions: any[]) => {
    const updates: Record<string, any> = {};
    suggestions.forEach((s) => {
      updates[s.field] = s.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIFormValidator(false);
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-name`}>员工姓名 *</Label>
            <Input
              id={`${mode}-name`}
              type="text"
              required
              value={(formData as Employee)?.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="请输入员工姓名"
              aria-required={true}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-number`}>工号</Label>
            <Input
              id={`${mode}-number`}
              type="text"
              value={(formData as Employee)?.employee_number || ""}
              onChange={(e) =>
                handleInputChange("employee_number", e.target.value)
              }
              placeholder="请输入工号"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-email`}>邮箱</Label>
            <Input
              id={`${mode}-email`}
              type="email"
              value={(formData as Employee)?.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="请输入邮箱"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-phone`}>电话</Label>
            <Input
              id={`${mode}-phone`}
              type="text"
              value={(formData as Employee)?.phone || ""}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="请输入电话"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-department`}>所属部门</Label>
          <Select
            value={(formData as Employee)?.department_id || "none"}
            onValueChange={(value) =>
              handleInputChange(
                "department_id",
                value === "none" ? undefined : value,
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择部门" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">无</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-position`}>职位</Label>
          <Input
            id={`${mode}-position`}
            type="text"
            value={(formData as Employee)?.position || ""}
            onChange={(e) => handleInputChange("position", e.target.value)}
            placeholder="请输入职位"
          />
        </div>
        {mode === "create" && (
          <div className="space-y-2">
            <Label htmlFor={`${mode}-hire-date`}>入职日期</Label>
            <Input
              id={`${mode}-hire-date`}
              type="date"
              value={(formData as Employee)?.hire_date || ""}
              onChange={(e) => handleInputChange("hire_date", e.target.value)}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor={`${mode}-status`}>状态</Label>
          <Select
            value={(formData as Employee)?.status || "active"}
            onValueChange={(value) => handleInputChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">在职</SelectItem>
              <SelectItem value="inactive">离职</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Button type="button" variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <div className="flex items-center gap-2">
            <AIHelperButton
              type="generate"
              onClick={() => setShowAICodeGenerator(true)}
              size="sm"
              variant="secondary"
              label="生成工号"
            />
            <AIHelperButton
              type="complete"
              onClick={() => setShowAIDataCompleter(true)}
              size="sm"
              variant="secondary"
              label="智能补全"
            />
            <AIHelperButton
              type="validate"
              onClick={() => setShowAIFormValidator(true)}
              size="sm"
              variant="secondary"
              label="AI 校验"
            />
            <Button type="submit">{mode === "create" ? "创建" : "保存"}</Button>
          </div>
        </div>
      </form>

      <AICodeGenerator
        isOpen={showAICodeGenerator}
        onClose={() => setShowAICodeGenerator(false)}
        context={{
          entityType: "employee",
          name: (formData as Employee)?.name,
        }}
        onSelect={handleSelectAICode}
        existingCodes={existingCodes}
      />

      <AIDataCompleter
        isOpen={showAIDataCompleter}
        onClose={() => setShowAIDataCompleter(false)}
        completeRequest={{
          partialData: formData,
          context: {
            module: "hrm",
            entityType: "employee",
          },
        }}
        onApplyCompletion={handleApplyCompletion}
      />

      <AIFormValidator
        isOpen={showAIFormValidator}
        onClose={() => setShowAIFormValidator(false)}
        validateRequest={{
          data: formData,
          context: {
            module: "hrm",
            entityType: "employee",
          },
        }}
        onApplySuggestions={handleApplyValidationSuggestions}
        onFixIssue={() => {}}
      />
    </>
  );
};
