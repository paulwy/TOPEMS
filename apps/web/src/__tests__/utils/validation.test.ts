import { describe, it, expect } from "vitest";
import {
  validators,
  patterns,
  validationRules,
  FormValidator,
  validateForm,
} from "../../utils/validation";

describe("validation utils", () => {
  describe("validators", () => {
    describe("validate required fields", () => {
      it("should return error for empty required string", () => {
        const result = validators.validate("", { required: true }, "用户名");
        expect(result).toBe("用户名不能为空");
      });

      it("should return error for whitespace-only required string", () => {
        const result = validators.validate("   ", { required: true }, "用户名");
        expect(result).toBe("用户名不能为空");
      });

      it("should return null for valid required string", () => {
        const result = validators.validate("john", { required: true }, "用户名");
        expect(result).toBeNull();
      });

      it("should return error for null required value", () => {
        const result = validators.validate(null, { required: true }, "邮箱");
        expect(result).toBe("邮箱不能为空");
      });

      it("should return error for undefined required value", () => {
        const result = validators.validate(undefined, { required: true }, "邮箱");
        expect(result).toBe("邮箱不能为空");
      });
    });

    describe("validate minLength", () => {
      it("should return error for string shorter than minLength", () => {
        const result = validators.validate("ab", { minLength: 3 }, "密码");
        expect(result).toBe("密码至少需要3个字符");
      });

      it("should return null for string meeting minLength", () => {
        const result = validators.validate("abc", { minLength: 3 }, "密码");
        expect(result).toBeNull();
      });

      it("should return null when value is null (required check should come first)", () => {
        const result = validators.validate(null, { required: false, minLength: 3 }, "密码");
        expect(result).toBeNull();
      });
    });

    describe("validate maxLength", () => {
      it("should return error for string longer than maxLength", () => {
        const result = validators.validate("abcdefgh", { maxLength: 5 }, "用户名");
        expect(result).toBe("用户名不能超过5个字符");
      });

      it("should return null for string within maxLength", () => {
        const result = validators.validate("abcde", { maxLength: 5 }, "用户名");
        expect(result).toBeNull();
      });
    });

    describe("validate pattern", () => {
      it("should return error for string not matching pattern", () => {
        const result = validators.validate("abc@", { pattern: /^[a-zA-Z0-9]+$/ }, "用户名");
        expect(result).toBe("用户名格式不正确");
      });

      it("should return null for string matching pattern", () => {
        const result = validators.validate("abc123", { pattern: /^[a-zA-Z0-9]+$/ }, "用户名");
        expect(result).toBeNull();
      });

      it("should validate email pattern correctly", () => {
        expect(patterns.email.test("test@example.com")).toBe(true);
        expect(patterns.email.test("invalid-email")).toBe(false);
        expect(patterns.email.test("user.name@domain.co.uk")).toBe(true);
      });
    });

    describe("validate number min/max", () => {
      it("should return error for number below min", () => {
        const result = validators.validate(5, { min: 10 }, "年龄");
        expect(result).toBe("年龄不能小于10");
      });

      it("should return error for number above max", () => {
        const result = validators.validate(150, { max: 100 }, "百分比");
        expect(result).toBe("百分比不能大于100");
      });

      it("should return null for number within range", () => {
        const result = validators.validate(50, { min: 0, max: 100 }, "百分比");
        expect(result).toBeNull();
      });
    });

    describe("validate custom rule", () => {
      it("should use custom validation function returning boolean", () => {
        const result = validators.validate("password", {
          custom: (value) => value.length >= 8,
        }, "密码");
        expect(result).toBeNull();
      });

      it("should use custom validation function returning error string", () => {
        const result = validators.validate("weak", {
          custom: (value) => value.length >= 8 || "密码太短",
        }, "密码");
        expect(result).toBe("密码太短");
      });

      it("should handle custom validation that passes", () => {
        const result = validators.validate("strongpass", {
          custom: (value) => value.length >= 8,
        }, "密码");
        expect(result).toBeNull();
      });
    });
  });

  describe("patterns", () => {
    it("should validate username pattern", () => {
      expect(patterns.username.test("user123")).toBe(true);
      expect(patterns.username.test("user name")).toBe(false);
      expect(patterns.username.test("user@name")).toBe(false);
    });

    it("should validate phone pattern", () => {
      expect(patterns.phone.test("13812345678")).toBe(true);
      expect(patterns.phone.test("12345678901")).toBe(false);
      expect(patterns.phone.test("138123456789")).toBe(false);
    });

    it("should validate code pattern", () => {
      expect(patterns.code.test("ABC123")).toBe(true);
      expect(patterns.code.test("AB")).toBe(false);
      expect(patterns.code.test("abc@123")).toBe(false);
    });

    it("should validate amount pattern", () => {
      expect(patterns.amount.test("100")).toBe(true);
      expect(patterns.amount.test("100.5")).toBe(true);
      expect(patterns.amount.test("100.55")).toBe(true);
      expect(patterns.amount.test("100.555")).toBe(false);
      expect(patterns.amount.test("-100")).toBe(false);
    });

    it("should validate date pattern", () => {
      expect(patterns.date.test("2024-01-15")).toBe(true);
      expect(patterns.date.test("2024-1-5")).toBe(false);
      expect(patterns.date.test("01-15-2024")).toBe(false);
    });
  });

  describe("validationRules", () => {
    it("should validate username rule", () => {
      const rule = validationRules.username;
      // Empty string fails required
      expect(validators.validate("", rule, "用户名")).toBe("用户名不能为空");
      // "ab" passes required, maxLength, and pattern checks
      expect(validators.validate("ab", rule, "用户名")).toBeNull();
      expect(validators.validate("user123", rule, "用户名")).toBeNull();
      // Strings with spaces fail the pattern
      expect(validators.validate("user 123", rule, "用户名")).toBe("用户名格式不正确");
    });

    it("should validate email rule", () => {
      const rule = validationRules.email;
      expect(validators.validate("", rule, "邮箱")).toBeTruthy();
      expect(validators.validate("invalid", rule, "邮箱")).toBeTruthy();
      expect(validators.validate("test@example.com", rule, "邮箱")).toBeNull();
    });

    it("should validate password rule with complexity", () => {
      const rule = validationRules.password;
      // "weak" is only 4 chars, so it fails minLength first
      expect(validators.validate("weak", rule, "密码")).toBe("密码至少需要8个字符");
      // "password1" has 9 chars but no uppercase, so it fails custom validation
      expect(validators.validate("password1", rule, "密码")).toBe("密码必须包含大小写字母和数字");
      // "PASSWORD1" has 9 chars but no lowercase, so it fails custom validation
      expect(validators.validate("PASSWORD1", rule, "密码")).toBe("密码必须包含大小写字母和数字");
      // "Password1" meets all requirements
      expect(validators.validate("Password1", rule, "密码")).toBeNull();
    });

    it("should validate amount rule", () => {
      const rule = validationRules.amount;
      expect(validators.validate(-100, rule, "金额")).toBe("金额必须是正数");
      expect(validators.validate("abc", rule, "金额")).toBe("金额必须是正数");
      expect(validators.validate(100.555, rule, "金额")).toBe("金额最多保留2位小数");
      expect(validators.validate(100.5, rule, "金额")).toBeNull();
    });

    it("should validate phone rule", () => {
      const rule = validationRules.phone;
      expect(validators.validate("12345", rule, "电话")).toBeTruthy();
      expect(validators.validate("13812345678", rule, "电话")).toBeNull();
    });
  });

  describe("FormValidator class", () => {
    it("should validate form with multiple fields", () => {
      const validator = new FormValidator({
        username: validationRules.username,
        email: validationRules.email,
      });

      const invalidData = {
        username: "",
        email: "invalid",
      };

      expect(validator.validate(invalidData)).toBe(false);
      const errors = validator.getErrors();
      expect(errors.username).toBeTruthy();
      expect(errors.email).toBeTruthy();
    });

    it("should return no errors for valid data", () => {
      const validator = new FormValidator({
        username: validationRules.username,
        email: validationRules.email,
      });

      const validData = {
        username: "user123",
        email: "test@example.com",
      };

      expect(validator.validate(validData)).toBe(true);
      expect(validator.getErrors()).toEqual({});
    });

    it("should check hasError correctly", () => {
      const validator = new FormValidator({
        username: { required: true },
      });

      validator.validate({ username: "" });
      expect(validator.hasError("username")).toBe(true);
      expect(validator.hasError("email")).toBe(false);
    });

    it("should get single field error", () => {
      const validator = new FormValidator({
        username: { required: true },
      });

      validator.validate({ username: "" });
      expect(validator.getError("username")).toBeTruthy();
      expect(validator.getError("nonexistent")).toBeUndefined();
    });

    it("should clear errors on each validate call", () => {
      const validator = new FormValidator({
        username: { required: true },
      });

      validator.validate({ username: "" });
      expect(validator.hasError("username")).toBe(true);

      validator.validate({ username: "valid" });
      expect(validator.hasError("username")).toBe(false);
    });

    it("should handle fields with no validation rules", () => {
      const validator = new FormValidator({
        name: { required: false },
      });

      const data = { name: "Test User", extra: "field" };
      expect(validator.validate(data)).toBe(true);
    });
  });

  describe("validateForm function", () => {
    it("should return errors as object", () => {
      const errors = validateForm(
        {
          username: "",
          email: "invalid",
        },
        {
          username: validationRules.username,
          email: validationRules.email,
        },
      );

      expect(errors.username).toBeTruthy();
      expect(errors.email).toBeTruthy();
    });

    it("should return empty object for valid data", () => {
      const errors = validateForm(
        {
          username: "user123",
          email: "test@example.com",
        },
        {
          username: validationRules.username,
          email: validationRules.email,
        },
      );

      expect(Object.keys(errors)).toHaveLength(0);
    });
  });
});
