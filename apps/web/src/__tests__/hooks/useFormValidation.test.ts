import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormValidation, getInputClassName } from "../../hooks/useFormValidation";

describe("useFormValidation hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with empty errors and touched", () => {
      const { result } = renderHook(() => useFormValidation());
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
    });
  });

  describe("validateField", () => {
    it("should return null for valid field without rules", () => {
      const { result } = renderHook(() => useFormValidation());
      expect(result.current.validateField("name", "test")).toBeNull();
    });

    it("should validate required field", () => {
      const { result } = renderHook(() => useFormValidation());
      
      expect(result.current.validateField("name", "", { required: true })).toBe("name不能为空");
      expect(result.current.validateField("name", "  ", { required: true })).toBe("name不能为空");
      expect(result.current.validateField("name", "test", { required: true })).toBeNull();
    });

    it("should validate minLength", () => {
      const { result } = renderHook(() => useFormValidation());
      
      expect(result.current.validateField("password", "ab", { minLength: 3 })).toBe("password至少需要3个字符");
      expect(result.current.validateField("password", "abc", { minLength: 3 })).toBeNull();
    });

    it("should validate maxLength", () => {
      const { result } = renderHook(() => useFormValidation());
      
      expect(result.current.validateField("username", "abcdefgh", { maxLength: 5 })).toBe("username不能超过5个字符");
      expect(result.current.validateField("username", "abc", { maxLength: 5 })).toBeNull();
    });

    it("should validate pattern", () => {
      const { result } = renderHook(() => useFormValidation());
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      
      expect(result.current.validateField("email", "invalid", { pattern: emailPattern })).toBe("email格式不正确");
      expect(result.current.validateField("email", "test@example.com", { pattern: emailPattern })).toBeNull();
    });

    it("should validate custom rule with boolean", () => {
      const { result } = renderHook(() => useFormValidation());
      const customRule = { custom: (value: string) => value.length >= 8 };
      
      expect(result.current.validateField("password", "short", customRule)).toBe("password验证失败");
      expect(result.current.validateField("password", "long enough", customRule)).toBeNull();
    });

    it("should validate custom rule with string error", () => {
      const { result } = renderHook(() => useFormValidation());
      const customRule = { custom: (value: string) => value.length >= 8 || "密码太短" };
      
      expect(result.current.validateField("password", "short", customRule)).toBe("密码太短");
      expect(result.current.validateField("password", "long enough", customRule)).toBeNull();
    });
  });

  describe("handleFieldChange", () => {
    it("should not validate if field is not touched", () => {
      const { result } = renderHook(() => useFormValidation());
      
      act(() => {
        result.current.handleFieldChange("name", "", { required: true });
      });
      
      expect(result.current.errors.name).toBeUndefined();
    });

    it("should validate if field is touched", () => {
      const { result } = renderHook(() => useFormValidation());
      
      // Touch the field first
      act(() => {
        result.current.handleFieldBlur("name", "", { required: true });
      });
      
      expect(result.current.errors.name).toBe("name不能为空");
      
      // Change value to valid
      act(() => {
        result.current.handleFieldChange("name", "valid", { required: true });
      });
      
      expect(result.current.errors.name).toBeUndefined();
    });
  });

  describe("handleFieldBlur", () => {
    it("should mark field as touched", () => {
      const { result } = renderHook(() => useFormValidation());
      
      act(() => {
        result.current.handleFieldBlur("name", "test", {});
      });
      
      expect(result.current.touched.name).toBe(true);
    });

    it("should set error on blur for invalid field", () => {
      const { result } = renderHook(() => useFormValidation());
      
      act(() => {
        result.current.handleFieldBlur("name", "", { required: true });
      });
      
      expect(result.current.errors.name).toBe("name不能为空");
    });

    it("should clear error on blur for valid field", () => {
      const { result } = renderHook(() => useFormValidation());
      
      // Set error first
      act(() => {
        result.current.handleFieldBlur("name", "", { required: true });
      });
      expect(result.current.errors.name).toBe("name不能为空");
      
      // Clear error with valid value
      act(() => {
        result.current.handleFieldBlur("name", "valid", { required: true });
      });
      
      expect(result.current.errors.name).toBeUndefined();
    });
  });

  describe("validateForm", () => {
    it("should validate all fields and return true for valid data", () => {
      const { result } = renderHook(() => useFormValidation());
      
      const data = {
        username: "testuser",
        email: "test@example.com",
      };
      
      const rules = {
        username: { required: true, minLength: 3 },
        email: { required: true },
      };
      
      let isValid: boolean = false;
      act(() => {
        isValid = result.current.validateForm(data, rules);
      });
      
      expect(isValid).toBe(true);
    });

    it("should validate all fields and return false for invalid data", () => {
      const { result } = renderHook(() => useFormValidation());
      
      const data = {
        username: "",
        email: "",
      };
      
      const rules = {
        username: { required: true },
        email: { required: true },
      };
      
      let isValid: boolean = true;
      act(() => {
        isValid = result.current.validateForm(data, rules);
      });
      
      expect(isValid).toBe(false);
      expect(result.current.errors.username).toBe("username不能为空");
      expect(result.current.errors.email).toBe("email不能为空");
    });

    it("should mark all fields as touched after validateForm", () => {
      const { result } = renderHook(() => useFormValidation());
      
      const data = { name: "" };
      const rules = { name: { required: true } };
      
      act(() => {
        result.current.validateForm(data, rules);
      });
      
      expect(result.current.touched.name).toBe(true);
    });
  });

  describe("clearErrors", () => {
    it("should clear all errors and touched", () => {
      const { result } = renderHook(() => useFormValidation());
      
      // Create some errors
      act(() => {
        result.current.handleFieldBlur("name", "", { required: true });
      });
      expect(result.current.errors.name).toBe("name不能为空");
      expect(result.current.touched.name).toBe(true);
      
      // Clear errors
      act(() => {
        result.current.clearErrors();
      });
      
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
    });
  });

  describe("getFieldError", () => {
    it("should return undefined for untouched field", () => {
      const { result } = renderHook(() => useFormValidation());
      
      expect(result.current.getFieldError("name")).toBeUndefined();
    });

    it("should return error for touched field", () => {
      const { result } = renderHook(() => useFormValidation());
      
      act(() => {
        result.current.handleFieldBlur("name", "", { required: true });
      });
      
      expect(result.current.getFieldError("name")).toBe("name不能为空");
    });
  });

  describe("hasFieldError", () => {
    it("should return false for untouched field", () => {
      const { result } = renderHook(() => useFormValidation());
      
      expect(result.current.hasFieldError("name")).toBe(false);
    });

    it("should return true for touched field with error", () => {
      const { result } = renderHook(() => useFormValidation());
      
      act(() => {
        result.current.handleFieldBlur("name", "", { required: true });
      });
      
      expect(result.current.hasFieldError("name")).toBe(true);
    });

    it("should return false for touched field without error", () => {
      const { result } = renderHook(() => useFormValidation());
      
      act(() => {
        result.current.handleFieldBlur("name", "valid", { required: true });
      });
      
      expect(result.current.hasFieldError("name")).toBe(false);
    });
  });
});

describe("getInputClassName", () => {
  it("should return error class when hasError is true", () => {
    const result = getInputClassName(true);
    expect(result).toContain("border-red-500");
    expect(result).not.toContain("border-slate-200");
  });

  it("should return base class when hasError is false", () => {
    const result = getInputClassName(false);
    expect(result).toContain("border-slate-200");
    expect(result).not.toContain("border-red-500");
  });

  it("should use custom baseClass", () => {
    const result = getInputClassName(true, "custom-base");
    expect(result).toContain("custom-base");
    expect(result).toContain("border-red-500");
  });
});
